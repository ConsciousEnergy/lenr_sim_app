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
# Required secrets/env for live apply:
#   GHCR_USER, GHCR_TOKEN
#   SHARE_SSH_KEY (private key for 185.211.4.66) — or ansible_ssh_private_key_file in inventory.yml
#   Staging key for KVM1 (inventory.staging.yml / ~/.ssh/lenr-sim-staging)
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

red() { printf '\033[0;31m%s\033[0m\n' "$*"; }
yel() { printf '\033[0;33m%s\033[0m\n' "$*"; }
grn() { printf '\033[0;32m%s\033[0m\n' "$*"; }

echo "=== v0.3.9 Swarm public cutover ==="
echo "EXECUTE=${EXECUTE}  CONFIRM_SWARM_0_3_9=${CONFIRM:+set}"

# ---------------------------------------------------------------------------
# Always: prep checks
# ---------------------------------------------------------------------------
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
  1. WordPress.com DNS: A api → ${SHARE_IP} (cutover window; keep lenr-sim-beta for rollback)
  2. Version markers already at 0.3.9-beta (release-quality-gate) — separate PR if still 0.3.8
  3. On KVM1: leave staging Swarm
       ansible-playbook -i inventory.staging.yml playbooks/leave-staging-swarm.yml \\
         -e CONFIRM_LEAVE_STAGING=I_LEAVE_STAGING
  4. On share: Swarm init (setup-docker.yml managers only) — Compose stack drained/stopped first
  5. join-workers.yml — KVM1 joins; labels app=true / observability=true
  6. deploy-stack.yml with GHCR auth, require_app_label=true, api_subdomain=api
  7. Verify https://api.conscious.energy/api/health + share SPA path
  8. Keep Compose rollback artifacts ≥ one release

EOF
}

plan

if [[ "$CONFIRM" != "I_CUTOVER_0_3_9" ]]; then
  yel "CONFIRM_SWARM_0_3_9 unset — refusing live apply (expected)."
  yel "Arm with: CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9 EXECUTE=1 $0"
  exit 0
fi

if [[ "$EXECUTE" != "1" ]]; then
  yel "CONFIRM set but EXECUTE!=1 — dry-run only. Re-run with EXECUTE=1 for live apply."
  exit 0
fi

# ---------------------------------------------------------------------------
# Live apply
# ---------------------------------------------------------------------------
red "LIVE CUTOVER ARMED — share ${SHARE_IP} + kvm1 ${KVM1_IP}"

[[ -f "$PROD_INV" ]] || { red "missing $PROD_INV"; exit 1; }
[[ -f "$STAGING_INV" ]] || { red "missing $STAGING_INV"; exit 1; }
[[ -n "${GHCR_USER:-}" && -n "${GHCR_TOKEN:-}" ]] || { red "GHCR_USER/GHCR_TOKEN required"; exit 1; }

# Refuse if prod inventory targets CI
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

yel "Step 4–6: deploy.sh production --app-only (Terraform/DNS separate)"
# Export GHCR for group_vars lookup
export GHCR_USER GHCR_TOKEN
CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9 \
  "${SCRIPT_DIR}/deploy.sh" production --app-only

yel "Step 7: health probes"
api_code="$(curl -sk -o /dev/null -w '%{http_code}' --connect-timeout 15 https://api.conscious.energy/api/health || echo 000)"
share_after="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 10 "${SHARE_URL}/api/health" || echo 000)"
echo "api.conscious.energy → ${api_code}"
echo "share after → ${share_after}"

if [[ "$api_code" != "200" ]]; then
  red "API health not 200 — investigate Traefik/DNS; Compose rollback may still be on ${SHARE_URL}"
  exit 1
fi

grn "Cutover health probe green (api=${api_code})"
echo "Document rollback tag + keep Compose artifacts. Do not close EQ-OPEN-*."
