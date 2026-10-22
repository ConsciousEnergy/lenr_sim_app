#!/usr/bin/env bash
# Pre-stage v0.3.9-beta backend+frontend images on share + KVM1 for cutover.
# Does NOT drain Compose, init Swarm, or set CONFIRM_SWARM_0_3_9.
#
# Usage:
#   ./swarm-039-prestage-images.sh           # plan only
#   EXECUTE=1 ./swarm-039-prestage-images.sh # rsync + build + load
#
# Env:
#   SKIP_IMAGE_BUILD=1  reuse existing tags on share (still load → KVM1)
#   BACKEND_IMAGE_TAG   default 0.3.9-beta
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SHARE_IP="${SHARE_IP:-185.211.4.66}"
KVM1_IP="${KVM1_IP:-31.220.55.113}"
CI_IP="${CI_IP:-45.93.100.251}"
EXECUTE="${EXECUTE:-0}"
IMAGE_TAG="${BACKEND_IMAGE_TAG:-0.3.9-beta}"
BACKEND_IMG="ghcr.io/consciousenergy/lenr-sim-backend:${IMAGE_TAG}"
FRONTEND_IMG="ghcr.io/consciousenergy/lenr-sim-frontend:${IMAGE_TAG}"
SHARE_KEY="${SHARE_SSH_KEY:-${VPS_SSH_IDENTITY_FILE:-$HOME/.ssh/lenr-sim-share}}"
KVM1_KEY="${KVM1_SSH_KEY:-$HOME/.ssh/lenr-sim-staging}"
OUT="${OUT:-/opt/cursor/artifacts/swarm-039-prestage-images.log}"

red() { printf '\033[0;31m%s\033[0m\n' "$*"; }
yel() { printf '\033[0;33m%s\033[0m\n' "$*"; }
grn() { printf '\033[0;32m%s\033[0m\n' "$*"; }

mkdir -p "$(dirname "$OUT")"
exec > >(tee "$OUT") 2>&1

echo "=== swarm-039 image prestage $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
echo "EXECUTE=${EXECUTE} tip=$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "images: ${BACKEND_IMG} + ${FRONTEND_IMG}"
echo "targets: share=${SHARE_IP} kvm1=${KVM1_IP} (CI ${CI_IP} never touched)"
echo

[[ -f "$SHARE_KEY" ]] || { red "missing SHARE_SSH_KEY ${SHARE_KEY}"; exit 1; }
[[ -f "$KVM1_KEY" ]] || { red "missing KVM1_SSH_KEY ${KVM1_KEY}"; exit 1; }

ssh_share() {
  ssh -i "$SHARE_KEY" -o BatchMode=yes -o IdentitiesOnly=yes -o ConnectTimeout=15 \
    -o StrictHostKeyChecking=accept-new "root@${SHARE_IP}" "$@"
}
ssh_kvm1() {
  ssh -i "$KVM1_KEY" -o BatchMode=yes -o IdentitiesOnly=yes -o ConnectTimeout=15 \
    -o StrictHostKeyChecking=accept-new "root@${KVM1_IP}" "$@"
}

# Refuse if CI somehow targeted.
[[ "$SHARE_IP" != "$CI_IP" && "$KVM1_IP" != "$CI_IP" ]] \
  || { red "CI IP in targets — abort"; exit 1; }

share_swarm="$(ssh_share 'docker info --format "{{.Swarm.LocalNodeState}}"' || echo unreachable)"
echo "share Swarm: ${share_swarm} (expected inactive until cutover)"
if [[ "$share_swarm" == "active" ]]; then
  yel "share already in Swarm — prestage will only refresh images (no stack deploy)"
fi

spa="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 10 \
  "${LIVE_COMPOSE_URL:-https://lenr-sim-beta.conscious.energy}/" || echo 000)"
[[ "$spa" == "200" ]] || { red "share SPA HTTP ${spa} — abort (Compose must stay healthy)"; exit 1; }
grn "Compose share SPA HTTP 200"

if [[ "$EXECUTE" != "1" ]]; then
  yel "EXECUTE!=1 — plan only. Re-run with EXECUTE=1 to rsync + build + load."
  cat <<EOF

Plan:
  1. rsync LENR_SIM_APP_v2 → root@${SHARE_IP}:/opt/lenr-sim/src/LENR_SIM_APP_v2/
  2. docker build backend+frontend :${IMAGE_TAG} on share (unless SKIP_IMAGE_BUILD=1)
  3. docker save | load onto KVM1 ${KVM1_IP}
  4. verify image IDs match; Compose remains up

EOF
  exit 0
fi

yel "Step 1: rsync tip source → share"
rsync -az --delete \
  --exclude '.git' --exclude 'frontend/node_modules' --exclude '**/__pycache__' \
  --exclude 'backend/.venv' --exclude 'frontend/dist' \
  -e "ssh -i ${SHARE_KEY} -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new" \
  "${ROOT}/LENR_SIM_APP_v2/" "root@${SHARE_IP}:/opt/lenr-sim/src/LENR_SIM_APP_v2/"
grn "rsync complete"

have_backend=0
have_frontend=0
ssh_share "docker image inspect ${BACKEND_IMG}" >/dev/null 2>&1 && have_backend=1 || true
ssh_share "docker image inspect ${FRONTEND_IMG}" >/dev/null 2>&1 && have_frontend=1 || true

if [[ "${SKIP_IMAGE_BUILD:-0}" == "1" && "$have_backend" -eq 1 && "$have_frontend" -eq 1 ]]; then
  grn "SKIP_IMAGE_BUILD=1 — reusing existing :${IMAGE_TAG} on share"
else
  yel "Step 2: docker build on share"
  if [[ "$have_backend" -ne 1 || "${SKIP_IMAGE_BUILD:-0}" != "1" ]]; then
    ssh_share "cd /opt/lenr-sim/src/LENR_SIM_APP_v2 && docker build -f infrastructure/docker/Dockerfile.backend \
      -t ${BACKEND_IMG} --build-arg BUILD_VERSION=${IMAGE_TAG} ."
  else
    grn "reusing backend :${IMAGE_TAG}"
  fi
  if [[ "$have_frontend" -ne 1 || "${SKIP_IMAGE_BUILD:-0}" != "1" ]]; then
    ssh_share "cd /opt/lenr-sim/src/LENR_SIM_APP_v2 && docker build -f infrastructure/docker/Dockerfile.frontend \
      -t ${FRONTEND_IMG} \
      --build-arg VITE_API_URL=same-origin --build-arg REACT_APP_API_URL=same-origin ."
  else
    grn "reusing frontend :${IMAGE_TAG}"
  fi
fi

yel "Step 3: distribute share → KVM1"
ssh_share "docker save ${BACKEND_IMG} ${FRONTEND_IMG}" \
  | ssh_kvm1 "docker load"
grn "KVM1 loaded ${BACKEND_IMG} + ${FRONTEND_IMG}"

share_ids="$(ssh_share "docker image inspect -f '{{.Id}}' ${BACKEND_IMG}; docker image inspect -f '{{.Id}}' ${FRONTEND_IMG}")"
kvm1_ids="$(ssh_kvm1 "docker image inspect -f '{{.Id}}' ${BACKEND_IMG}; docker image inspect -f '{{.Id}}' ${FRONTEND_IMG}")"
echo "share IDs:"$'\n'"$share_ids"
echo "kvm1 IDs:"$'\n'"$kvm1_ids"
[[ "$share_ids" == "$kvm1_ids" ]] || { red "image ID mismatch share vs KVM1"; exit 1; }
grn "image IDs match on share + KVM1"

spa2="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 10 \
  "${LIVE_COMPOSE_URL:-https://lenr-sim-beta.conscious.energy}/" || echo 000)"
[[ "$spa2" == "200" ]] || { red "Compose SPA broken after prestage (${spa2})"; exit 1; }
grn "Compose share still HTTP 200 — ready for SKIP_IMAGE_BUILD=1 cutover"

echo
echo "Next (human only):"
echo "  CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9 EXECUTE=1 LOCAL_IMAGES=1 \\"
echo "    ALLOW_STAGING_DNS_GAP=1 ALLOW_API_DNS_GAP=1 SKIP_IMAGE_BUILD=1 \\"
echo "    ${SCRIPT_DIR}/swarm-039-cutover.sh"
