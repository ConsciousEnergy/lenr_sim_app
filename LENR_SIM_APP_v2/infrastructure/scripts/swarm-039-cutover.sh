#!/usr/bin/env bash
# v0.3.9 public Swarm cutover executor.
#
# NEVER sets CONFIRM_SWARM_0_3_9 — human must export it.
# Default is dry-run (prints the plan). Live apply requires EXECUTE=1.
#
# Usage:
#   ./swarm-039-cutover.sh                 # dry-run plan + prep checks
#   CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9 EXECUTE=1 \
#     ./swarm-039-cutover.sh               # live cutover (share manager + KVM1 worker)
#
# Image source (one of):
#   GHCR_USER + GHCR_TOKEN                 # pull from ghcr.io
#   LOCAL_IMAGES=1                         # docker build on share manager (no GHCR)
#
# SSH:
#   SHARE_SSH_KEY or inventory.yml ansible_ssh_private_key_file for 185.211.4.66
#   Staging key for KVM1 (inventory.staging.yml)
#
# Topology SOT: docs/v0.3.8-beta/THREE_NODE_SWARM_TOPOLOGY.md
# Gate doc:     docs/v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
INFRA="${ROOT}/LENR_SIM_APP_v2/infrastructure"
ANSIBLE="${INFRA}/ansible"
PROD_INV="${ANSIBLE}/inventory.yml"
STAGING_INV="${ANSIBLE}/inventory.staging.yml"
SHARE_IP="${SHARE_IP:-185.211.4.66}"
KVM1_IP="${KVM1_IP:-31.220.55.113}"
CI_IP="${CI_IP:-45.93.100.251}"
SHARE_URL="${LIVE_COMPOSE_URL:-https://lenr-sim-beta.conscious.energy}"
CONFIRM="${CONFIRM_SWARM_0_3_9:-}"
EXECUTE="${EXECUTE:-0}"
LOCAL_IMAGES="${LOCAL_IMAGES:-0}"
SHARE_KEY="${SHARE_SSH_KEY:-${VPS_SSH_IDENTITY_FILE:-$HOME/.ssh/lenr-sim-share}}"
IMAGE_TAG="${BACKEND_IMAGE_TAG:-0.3.8-beta}"

red() { printf '\033[0;31m%s\033[0m\n' "$*"; }
yel() { printf '\033[0;33m%s\033[0m\n' "$*"; }
grn() { printf '\033[0;32m%s\033[0m\n' "$*"; }

echo "=== v0.3.9 Swarm public cutover ==="
echo "EXECUTE=${EXECUTE}  CONFIRM_SWARM_0_3_9=${CONFIRM:+set}  LOCAL_IMAGES=${LOCAL_IMAGES}"

export LOCAL_IMAGES ALLOW_STAGING_DNS_GAP="${ALLOW_STAGING_DNS_GAP:-0}"
bash "${SCRIPT_DIR}/swarm-039-cutover-prep.sh" || {
  red "Prep incomplete — fix BAD lines before cutover."
  if [[ "$EXECUTE" != "1" ]]; then
    yel "Dry-run continues with plan only."
  else
    exit 1
  fi
}

plan() {
  cat <<EOF

Cutover plan (share=${SHARE_IP} manager, kvm1=${KVM1_IP} worker; CI ${CI_IP} never joins):

  0. Confirm share Compose health + rollback tag documented
  1. WordPress.com DNS: A api → ${SHARE_IP} (cutover window; keep lenr-sim-beta)
  2. Version markers at 0.3.9-beta (release-quality-gate) — separate PR if still 0.3.8
  3. On KVM1: leave staging Swarm (CONFIRM_LEAVE_STAGING=I_LEAVE_STAGING)
  4. On share: drain Compose (CONFIRM_DRAIN_COMPOSE=I_DRAIN_COMPOSE_FOR_SWARM)
  5. Optional LOCAL_IMAGES=1: docker build backend on share as
       ghcr.io/consciousenergy/lenr-sim-backend:${IMAGE_TAG}
  6. setup-docker.yml (swarm init on share) + join-workers.yml (KVM1 + labels)
  7. deploy-stack.yml (GHCR or skip_ghcr_login=true)
  8. Verify https://api.conscious.energy/api/health (+ share SPA)
  9. Keep Compose volumes for rollback ≥ one release

EOF
}

plan

if [[ "$CONFIRM" != "I_CUTOVER_0_3_9" ]]; then
  yel "CONFIRM_SWARM_0_3_9 unset — refusing live apply (expected)."
  yel "Arm with: CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9 EXECUTE=1 LOCAL_IMAGES=1 $0"
  exit 0
fi

if [[ "$EXECUTE" != "1" ]]; then
  yel "CONFIRM set but EXECUTE!=1 — dry-run only. Re-run with EXECUTE=1 for live apply."
  exit 0
fi

red "LIVE CUTOVER ARMED — share ${SHARE_IP} + kvm1 ${KVM1_IP}"

[[ -f "$PROD_INV" ]] || { red "missing $PROD_INV"; exit 1; }
[[ -f "$STAGING_INV" ]] || { red "missing $STAGING_INV"; exit 1; }

have_ghcr=0
if [[ -n "${GHCR_USER:-}" && -n "${GHCR_TOKEN:-}" ]]; then
  have_ghcr=1
fi
if [[ "$have_ghcr" -ne 1 && "$LOCAL_IMAGES" != "1" ]]; then
  red "Need GHCR_USER/GHCR_TOKEN or LOCAL_IMAGES=1"
  exit 1
fi

if grep -vE '^[[:space:]]*#' "$PROD_INV" | grep -Fq "$CI_IP"; then
  red "prod inventory lists CI node ${CI_IP} — abort"
  exit 1
fi

share_health="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 10 "${SHARE_URL}/api/health" || echo 000)"
[[ "$share_health" == "200" ]] || { red "share health ${share_health} — abort before cutover"; exit 1; }
grn "Share health 200 — proceeding"

cd "$ANSIBLE"

yel "Step 3: leave staging Swarm on KVM1"
ansible-playbook -i "$STAGING_INV" playbooks/leave-staging-swarm.yml \
  -e CONFIRM_LEAVE_STAGING=I_LEAVE_STAGING

yel "Step 4: drain Compose on share"
ansible-playbook -i "$PROD_INV" playbooks/drain-compose-share.yml \
  --limit swarm_managers \
  -e CONFIRM_DRAIN_COMPOSE=I_DRAIN_COMPOSE_FOR_SWARM

if [[ "$LOCAL_IMAGES" == "1" ]]; then
  yel "Step 5: build backend image on share (LOCAL_IMAGES=1)"
  [[ -f "$SHARE_KEY" ]] || { red "missing SHARE_SSH_KEY ${SHARE_KEY}"; exit 1; }
  rsync -az --delete \
    --exclude '.git' --exclude 'frontend/node_modules' --exclude '**/__pycache__' \
    --exclude 'backend/.venv' --exclude 'frontend/dist' \
    -e "ssh -i ${SHARE_KEY} -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new" \
    "${ROOT}/LENR_SIM_APP_v2/" "root@${SHARE_IP}:/opt/lenr-sim/src/LENR_SIM_APP_v2/"
  ssh -i "$SHARE_KEY" -o BatchMode=yes -o IdentitiesOnly=yes "root@${SHARE_IP}" \
    "cd /opt/lenr-sim/src/LENR_SIM_APP_v2 && docker build -f infrastructure/docker/Dockerfile.backend \
      -t ghcr.io/consciousenergy/lenr-sim-backend:${IMAGE_TAG} \
      --build-arg BUILD_VERSION=${IMAGE_TAG} ."
fi

yel "Step 6–7: Swarm init + join + stack deploy"
ansible-playbook -i "$PROD_INV" playbooks/setup-docker.yml
ansible-playbook -i "$PROD_INV" playbooks/join-workers.yml

deploy_extra=(-e "require_app_label=true" -e "require_observability_label=true")
if [[ "$have_ghcr" -eq 1 ]]; then
  export GHCR_USER GHCR_TOKEN
else
  deploy_extra+=(-e "skip_ghcr_login=true")
fi
ansible-playbook -i "$PROD_INV" playbooks/deploy-stack.yml "${deploy_extra[@]}"

yel "Step 8: health probes"
api_code="$(curl -sk -o /dev/null -w '%{http_code}' --connect-timeout 15 https://api.conscious.energy/api/health || echo 000)"
share_after="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 10 "${SHARE_URL}/api/health" || echo 000)"
echo "api.conscious.energy → ${api_code}"
echo "share/lenr-sim-beta after → ${share_after}"

if [[ "$api_code" != "200" ]]; then
  red "API health not 200 — check WordPress A api → ${SHARE_IP}; Compose volumes still on disk for rollback"
  exit 1
fi

grn "Cutover health probe green (api=${api_code})"
echo "Document rollback tag + keep Compose artifacts. Do not close EQ-OPEN-*."
