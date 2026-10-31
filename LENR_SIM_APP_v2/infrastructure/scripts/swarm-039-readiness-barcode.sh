#!/usr/bin/env bash
# One-shot readiness barcode for v0.3.9 Swarm public cutover.
# Read-only. Never sets CONFIRM_SWARM_0_3_9. Exit 0 only when all checks pass.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
OUT="${OUT:-/opt/cursor/artifacts/swarm-039-readiness-barcode.log}"
SHARE_IP="${SHARE_IP:-185.211.4.66}"
KVM1_IP="${KVM1_IP:-31.220.55.113}"
CI_IP="${CI_IP:-45.93.100.251}"
SHARE_URL="${LIVE_COMPOSE_URL:-https://lenr-sim-beta.conscious.energy}"
IMAGE_TAG="${BACKEND_IMAGE_TAG:-0.3.9-beta}"
SHARE_KEY="${SHARE_SSH_KEY:-${VPS_SSH_IDENTITY_FILE:-$HOME/.ssh/lenr-sim-share}}"
KVM1_KEY="${KVM1_SSH_KEY:-$HOME/.ssh/lenr-sim-staging}"
mkdir -p "$(dirname "$OUT")"

exec > >(tee "$OUT") 2>&1

echo "=== swarm-039 readiness barcode $(date -u +%Y-%m-%dT%H:%MZ) ==="
echo "tip=$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "CONFIRM_SWARM_0_3_9=${CONFIRM_SWARM_0_3_9:-unset}"
echo

export ALLOW_API_DNS_GAP="${ALLOW_API_DNS_GAP:-1}"
export ALLOW_STAGING_DNS_GAP="${ALLOW_STAGING_DNS_GAP:-1}"
# Prefer GHCR or already-prestaged tags; do not force LOCAL_IMAGES=1 by default.
# Cutover-prep auto-OKs when share+kvm1 already have :IMAGE_TAG.
export SKIP_IMAGE_BUILD="${SKIP_IMAGE_BUILD:-1}"
export BACKEND_IMAGE_TAG="$IMAGE_TAG"
if [[ -z "${GHCR_USER:-}" || -z "${GHCR_TOKEN:-}" ]]; then
  if [[ -z "${LOCAL_IMAGES:-}" && -z "${PRESTAGED_IMAGES:-}" ]]; then
    # Probe once; if tags missing, leave unset so prep reports an honest BAD.
    if [[ -f "$SHARE_KEY" && -f "$KVM1_KEY" ]] \
      && ssh -i "$SHARE_KEY" -o BatchMode=yes -o ConnectTimeout=8 -o IdentitiesOnly=yes \
           "root@${SHARE_IP}" \
           "docker image inspect ghcr.io/consciousenergy/lenr-sim-backend:${IMAGE_TAG} >/dev/null \
            && docker image inspect ghcr.io/consciousenergy/lenr-sim-frontend:${IMAGE_TAG} >/dev/null" >/dev/null 2>&1 \
      && ssh -i "$KVM1_KEY" -o BatchMode=yes -o ConnectTimeout=8 -o IdentitiesOnly=yes \
           "root@${KVM1_IP}" \
           "docker image inspect ghcr.io/consciousenergy/lenr-sim-backend:${IMAGE_TAG} >/dev/null \
            && docker image inspect ghcr.io/consciousenergy/lenr-sim-frontend:${IMAGE_TAG} >/dev/null" >/dev/null 2>&1; then
      export PRESTAGED_IMAGES=1
      echo "image gate: prestaged :${IMAGE_TAG} detected (no LOCAL_IMAGES default)"
    else
      echo "image gate: no GHCR / no prestaged tags — set GHCR_* or run swarm-039-prestage-images.sh"
    fi
  fi
fi

fail=0
bash "${SCRIPT_DIR}/swarm-039-cutover-prep.sh" || fail=1

echo
echo "=== topology snapshot ==="
echo -n "share Swarm: "
ssh -i "$SHARE_KEY" -o BatchMode=yes -o ConnectTimeout=8 -o IdentitiesOnly=yes \
  "root@${SHARE_IP}" 'docker info --format "{{.Swarm.LocalNodeState}}"' 2>/dev/null || echo unreachable
echo -n "kvm1 Swarm: "
ssh -i "$KVM1_KEY" -o BatchMode=yes -o ConnectTimeout=8 -o IdentitiesOnly=yes \
  "root@${KVM1_IP}" 'docker info --format "{{.Swarm.LocalNodeState}}"; docker stack services lenr-sim --format "{{.Name}}={{.Replicas}}" 2>/dev/null | tr "\n" " "; echo' \
  2>/dev/null || echo unreachable

echo -n "CI node listed in prod inventory: "
if grep -vE '^[[:space:]]*#' "${ROOT}/LENR_SIM_APP_v2/infrastructure/ansible/inventory.yml" 2>/dev/null \
  | grep -Fq "$CI_IP"; then
  echo "YES (BAD)"; fail=1
else
  echo "no (OK)"
fi

echo
echo "=== version markers ==="
APP_ROOT="${ROOT}/LENR_SIM_APP_v2" IMAGE_TAG="$IMAGE_TAG" python3 - <<'PY' || fail=1
from pathlib import Path
import json, os, re
root = Path(os.environ["APP_ROOT"])
want = os.environ["IMAGE_TAG"]
vals = [
  re.search(r'APP_VERSION: str = "([^"]+)"', (root/"backend/app/core/config.py").read_text()).group(1),
  json.loads((root/"frontend/package.json").read_text())["version"],
  re.search(r"APP_VERSION = '([^']+)'", (root/"frontend/src/config/version.js").read_text()).group(1),
  re.search(r"ARG BUILD_VERSION=(\S+)", (root/"infrastructure/docker/Dockerfile.backend").read_text()).group(1),
]
print(" ".join(vals))
assert len(set(vals)) == 1 and vals[0] == want, (vals, want)
print("OK version consistency", vals[0])
PY

echo
echo "=== human arming (not executed here) ==="
cat <<EOF
# Prefer GHCR_USER/TOKEN or prestaged tags; LOCAL_IMAGES=1 only if building on share.
CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9 EXECUTE=1 \\
  ALLOW_STAGING_DNS_GAP=1 ALLOW_API_DNS_GAP=1 SKIP_IMAGE_BUILD=1 \\
  ${SCRIPT_DIR}/swarm-039-cutover.sh
# If images not prestaged and no GHCR: add LOCAL_IMAGES=1 (or run prestage first).
EOF

echo
if [[ "$fail" -eq 0 ]]; then
  echo "BARCODE GREEN — cutover path ready; await human CONFIRM_SWARM_0_3_9"
  exit 0
fi
echo "BARCODE RED — fix BAD lines above"
exit 1
