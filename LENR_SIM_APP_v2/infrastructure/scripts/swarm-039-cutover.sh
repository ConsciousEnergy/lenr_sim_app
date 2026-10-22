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
KVM1_KEY="${KVM1_SSH_KEY:-$HOME/.ssh/lenr-sim-staging}"
IMAGE_TAG="${BACKEND_IMAGE_TAG:-0.3.9-beta}"
BACKEND_IMG="ghcr.io/consciousenergy/lenr-sim-backend:${IMAGE_TAG}"
FRONTEND_IMG="ghcr.io/consciousenergy/lenr-sim-frontend:${IMAGE_TAG}"

red() { printf '\033[0;31m%s\033[0m\n' "$*"; }
yel() { printf '\033[0;33m%s\033[0m\n' "$*"; }
grn() { printf '\033[0;32m%s\033[0m\n' "$*"; }

echo "=== v0.3.9 Swarm public cutover ==="
echo "EXECUTE=${EXECUTE}  CONFIRM_SWARM_0_3_9=${CONFIRM:+set}  LOCAL_IMAGES=${LOCAL_IMAGES}"

export LOCAL_IMAGES \
  ALLOW_STAGING_DNS_GAP="${ALLOW_STAGING_DNS_GAP:-0}" \
  ALLOW_API_DNS_GAP="${ALLOW_API_DNS_GAP:-0}"
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
  1. WordPress.com DNS: A api → ${SHARE_IP} (preferred); Traefik also serves
       lenr-sim-beta via traefik_extra_api_hosts until api DNS flips
  2. Version markers at 0.3.9-beta (release-quality-gate) — separate PR if still 0.3.8
  3. Optional LOCAL_IMAGES=1: build/load images WHILE Compose still serves
       (SKIP_IMAGE_BUILD=1 reuses tags; prefer swarm-039-prestage-images.sh)
  4. On KVM1: leave staging Swarm (CONFIRM_LEAVE_STAGING=I_LEAVE_STAGING)
  5. On share: drain Compose (CONFIRM_DRAIN_COMPOSE=I_DRAIN_COMPOSE_FOR_SWARM);
       assert :80/:443 free for Traefik
  6. setup-docker.yml (swarm init on share); verify manager + :2377 from KVM1;
       import Compose .env → Swarm secrets
       (LENR_DB_PASSWORD / LENR_SECRET_KEY — required for external postgres volume)
  7. join-workers.yml + deploy-stack.yml (--resolve-image never; SPA + PathPrefix /api)
  8. Verify ${SHARE_URL}/api/health (+ SPA /) and/or api.conscious.energy
  9. Keep Compose volumes for rollback ≥ one release

EOF
}

plan

if [[ "$CONFIRM" != "I_CUTOVER_0_3_9" ]]; then
  yel "CONFIRM_SWARM_0_3_9 unset — refusing live apply (expected)."
  yel "Arm with: CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9 EXECUTE=1 LOCAL_IMAGES=1 ALLOW_API_DNS_GAP=1 SKIP_IMAGE_BUILD=1 $0"
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

# Build/load images before drain so public Compose stays up during the long step.
if [[ "$LOCAL_IMAGES" == "1" ]]; then
  yel "Step 3: backend + frontend images on share (LOCAL_IMAGES=1, Compose still up)"
  [[ -f "$SHARE_KEY" ]] || { red "missing SHARE_SSH_KEY ${SHARE_KEY}"; exit 1; }
  have_backend=0
  have_frontend=0
  if ssh -i "$SHARE_KEY" -o BatchMode=yes -o IdentitiesOnly=yes "root@${SHARE_IP}" \
       "docker image inspect ${BACKEND_IMG}" >/dev/null 2>&1; then
    have_backend=1
  fi
  if ssh -i "$SHARE_KEY" -o BatchMode=yes -o IdentitiesOnly=yes "root@${SHARE_IP}" \
       "docker image inspect ${FRONTEND_IMG}" >/dev/null 2>&1; then
    have_frontend=1
  fi
  if [[ "${SKIP_IMAGE_BUILD:-0}" == "1" && "$have_backend" -eq 1 && "$have_frontend" -eq 1 ]]; then
    grn "SKIP_IMAGE_BUILD=1 — reusing backend+frontend :${IMAGE_TAG} on share"
  else
    rsync -az --delete \
      --exclude '.git' --exclude 'frontend/node_modules' --exclude '**/__pycache__' \
      --exclude 'backend/.venv' --exclude 'frontend/dist' \
      -e "ssh -i ${SHARE_KEY} -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new" \
      "${ROOT}/LENR_SIM_APP_v2/" "root@${SHARE_IP}:/opt/lenr-sim/src/LENR_SIM_APP_v2/"
    if [[ "$have_backend" -ne 1 || "${SKIP_IMAGE_BUILD:-0}" != "1" ]]; then
      ssh -i "$SHARE_KEY" -o BatchMode=yes -o IdentitiesOnly=yes "root@${SHARE_IP}" \
        "cd /opt/lenr-sim/src/LENR_SIM_APP_v2 && docker build -f infrastructure/docker/Dockerfile.backend \
          -t ${BACKEND_IMG} --build-arg BUILD_VERSION=${IMAGE_TAG} ."
    else
      grn "reusing existing backend :${IMAGE_TAG}"
    fi
    if [[ "$have_frontend" -ne 1 || "${SKIP_IMAGE_BUILD:-0}" != "1" ]]; then
      ssh -i "$SHARE_KEY" -o BatchMode=yes -o IdentitiesOnly=yes "root@${SHARE_IP}" \
        "cd /opt/lenr-sim/src/LENR_SIM_APP_v2 && docker build -f infrastructure/docker/Dockerfile.frontend \
          -t ${FRONTEND_IMG} \
          --build-arg VITE_API_URL=same-origin --build-arg REACT_APP_API_URL=same-origin ."
    else
      grn "reusing existing frontend :${IMAGE_TAG}"
    fi
  fi

  # Workers cannot pull without GHCR — pipe images share → KVM1 (before leave).
  yel "Step 3b: distribute local images share → KVM1 (${KVM1_IP})"
  [[ -f "$KVM1_KEY" ]] || { red "missing KVM1_SSH_KEY ${KVM1_KEY}"; exit 1; }
  ssh -i "$SHARE_KEY" -o BatchMode=yes -o IdentitiesOnly=yes "root@${SHARE_IP}" \
    "docker save ${BACKEND_IMG} ${FRONTEND_IMG}" \
    | ssh -i "$KVM1_KEY" -o BatchMode=yes -o IdentitiesOnly=yes "root@${KVM1_IP}" \
      "docker load"
  grn "KVM1 loaded ${BACKEND_IMG} + ${FRONTEND_IMG}"
  # Compose must still be healthy after the prestage window.
  share_health2="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 10 "${SHARE_URL}/api/health" || echo 000)"
  [[ "$share_health2" == "200" ]] || { red "share health ${share_health2} after image prep — abort before drain"; exit 1; }
  grn "Compose still healthy after image prep — starting downtime window"
fi

yel "Step 4: leave staging Swarm on KVM1"
ansible-playbook -i "$STAGING_INV" playbooks/leave-staging-swarm.yml \
  -e CONFIRM_LEAVE_STAGING=I_LEAVE_STAGING

yel "Step 5: drain Compose on share"
# Compose project lenr-sim + volume postgres_data → lenr-sim_postgres_data.
# Swarm stack lenr-sim + volume postgres_data reuses the same named volume when
# compose down keeps volumes (drain playbook does not pass -v).
if [[ -f "$SHARE_KEY" ]]; then
  vol_ok="$(ssh -i "$SHARE_KEY" -o BatchMode=yes -o IdentitiesOnly=yes "root@${SHARE_IP}" \
    "docker volume inspect lenr-sim_postgres_data >/dev/null 2>&1 && echo yes || echo no")"
  [[ "$vol_ok" == "yes" ]] || { red "missing volume lenr-sim_postgres_data — abort before drain"; exit 1; }
  grn "Postgres volume lenr-sim_postgres_data present (will be reused by Swarm stack)"
fi
ansible-playbook -i "$PROD_INV" playbooks/drain-compose-share.yml \
  --limit swarm_managers \
  -e CONFIRM_DRAIN_COMPOSE=I_DRAIN_COMPOSE_FOR_SWARM

yel "Step 5b: assert host :80/:443 free for Traefik (publish mode: host)"
[[ -f "$SHARE_KEY" ]] || { red "missing SHARE_SSH_KEY ${SHARE_KEY}"; exit 1; }
ports_busy="$(ssh -i "$SHARE_KEY" -o BatchMode=yes -o IdentitiesOnly=yes "root@${SHARE_IP}" \
  'ss -lnt | grep -E ":80 |:443 " || true')"
if [[ -n "$ports_busy" ]]; then
  red "host :80/:443 still bound after Compose drain — Traefik would fail:"
  echo "$ports_busy"
  exit 1
fi
grn "host :80/:443 free after drain"

yel "Step 6–7: Swarm init + join + stack deploy"
ansible-playbook -i "$PROD_INV" playbooks/setup-docker.yml

yel "Step 6a: verify share is Swarm manager listening before worker join"
[[ -f "$SHARE_KEY" ]] || { red "missing SHARE_SSH_KEY ${SHARE_KEY}"; exit 1; }
mgr_info="$(ssh -i "$SHARE_KEY" -o BatchMode=yes -o IdentitiesOnly=yes "root@${SHARE_IP}" \
  'docker info --format "{{.Swarm.LocalNodeState}} {{.Swarm.ControlAvailable}}"')"
echo "share swarm: ${mgr_info}"
[[ "$mgr_info" == "active true" ]] || { red "share not active manager after setup-docker (${mgr_info})"; exit 1; }
ssh -i "$SHARE_KEY" -o BatchMode=yes -o IdentitiesOnly=yes "root@${SHARE_IP}" \
  'ss -lnt | grep -q ":2377 "' \
  || { red "share not listening on 2377/tcp after swarm init"; exit 1; }
if [[ -f "$KVM1_KEY" ]]; then
  ssh -i "$KVM1_KEY" -o BatchMode=yes -o IdentitiesOnly=yes "root@${KVM1_IP}" \
    "timeout 5 nc -zw3 ${SHARE_IP} 2377" >/dev/null 2>&1 \
    || { red "KVM1 cannot reach share:2377 after swarm init — abort before join"; exit 1; }
  grn "KVM1→share:2377 reachable (manager ready for join-workers)"
else
  yel "KVM1_SSH_KEY missing — skip post-init 2377 path check"
fi

yel "Step 6b: import Compose .env into Swarm secrets (reuse DB password for external volume)"
[[ -f "$SHARE_KEY" ]] || { red "missing SHARE_SSH_KEY ${SHARE_KEY}"; exit 1; }
# Secrets must exist before deploy-stack; do not let Ansible mint a new random
# postgres_password against lenr-sim_postgres_data.
ssh -i "$SHARE_KEY" -o BatchMode=yes -o IdentitiesOnly=yes "root@${SHARE_IP}" bash -s <<'EOS'
set -euo pipefail
ENV_FILE=/opt/lenr-sim/.env
[[ -f "$ENV_FILE" ]] || { echo "missing $ENV_FILE"; exit 1; }
get_env() {
  local key="$1" line val
  line="$(grep -E "^${key}=" "$ENV_FILE" | tail -1 || true)"
  [[ -n "$line" ]] || { echo "missing ${key} in $ENV_FILE"; exit 1; }
  val="${line#*=}"
  val="${val%\"}"
  val="${val#\"}"
  val="${val%\'}"
  val="${val#\'}"
  printf '%s' "$val"
}
db_pass="$(get_env LENR_DB_PASSWORD)"
api_key="$(get_env LENR_SECRET_KEY)"
[[ -n "$db_pass" && -n "$api_key" ]] || { echo "empty LENR_DB_PASSWORD or LENR_SECRET_KEY"; exit 1; }
if ! docker secret inspect postgres_password >/dev/null 2>&1; then
  printf '%s' "$db_pass" | docker secret create postgres_password -
  echo "created secret postgres_password from Compose .env"
else
  echo "secret postgres_password already exists — leaving unchanged"
fi
if ! docker secret inspect api_secret_key >/dev/null 2>&1; then
  printf '%s' "$api_key" | docker secret create api_secret_key -
  echo "created secret api_secret_key from Compose .env"
else
  echo "secret api_secret_key already exists — leaving unchanged"
fi
EOS
grn "Swarm secrets ready (Compose DB password preserved)"

ansible-playbook -i "$PROD_INV" playbooks/join-workers.yml

deploy_extra=(-e "require_app_label=true" -e "require_observability_label=true")
if [[ "$have_ghcr" -eq 1 ]]; then
  export GHCR_USER GHCR_TOKEN
else
  deploy_extra+=(-e "skip_ghcr_login=true")
fi
ansible-playbook -i "$PROD_INV" playbooks/deploy-stack.yml "${deploy_extra[@]}"

yel "Step 8: post-cutover verify (topology + labels + health)"
# Full evidence: 2-node Swarm, postgres on share, SPA+/api 200, CI outside.
export ALLOW_API_DNS_GAP="${ALLOW_API_DNS_GAP:-0}"
export SHARE_IP KVM1_IP CI_IP SHARE_URL SHARE_SSH_KEY="$SHARE_KEY" KVM1_SSH_KEY="$KVM1_KEY"
bash "${SCRIPT_DIR}/swarm-039-post-cutover-verify.sh"

echo "Document rollback tag + keep Compose artifacts. Do not close EQ-OPEN-*."
echo "If cutover fails mid-window, restore Compose with:"
echo "  CONFIRM_RESTORE_COMPOSE=I_RESTORE_COMPOSE_AFTER_SWARM \\"
echo "    CONFIRM_LEAVE_SWARM=I_LEAVE_SWARM_FOR_COMPOSE \\"
echo "    ${SCRIPT_DIR}/swarm-039-restore-compose.sh"
