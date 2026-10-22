#!/usr/bin/env bash
# Emergency restore: bring Compose+Caddy back on the share after a failed /
# aborted v0.3.9 Swarm cutover. Keeps named volumes (postgres_data).
#
# NEVER auto-runs. Requires:
#   CONFIRM_RESTORE_COMPOSE=I_RESTORE_COMPOSE_AFTER_SWARM
#
# If share is still a Swarm manager with the lenr-sim stack:
#   CONFIRM_LEAVE_SWARM=I_LEAVE_SWARM_FOR_COMPOSE  (stack rm + swarm leave --force)
#
# Usage:
#   CONFIRM_RESTORE_COMPOSE=I_RESTORE_COMPOSE_AFTER_SWARM \
#     ./swarm-039-restore-compose.sh
#
# Optional:
#   IMAGE_TAG=0.3.7-beta   (default: /opt/lenr-sim/.rollback-image-tag or .env)
#   BUILD_LOCALLY=1
#   SKIP_SWARM_LEAVE=1     (only compose up; refuse if Swarm still active)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHARE_IP="${SHARE_IP:-185.211.4.66}"
CI_IP="${CI_IP:-45.93.100.251}"
SHARE_URL="${LIVE_COMPOSE_URL:-https://lenr-sim-beta.conscious.energy}"
SHARE_KEY="${SHARE_SSH_KEY:-${VPS_SSH_IDENTITY_FILE:-$HOME/.ssh/lenr-sim-share}}"
CONFIRM="${CONFIRM_RESTORE_COMPOSE:-}"
LEAVE="${CONFIRM_LEAVE_SWARM:-}"
STACK="${STACK_NAME:-lenr-sim}"

red() { printf '\033[0;31m%s\033[0m\n' "$*"; }
grn() { printf '\033[0;32m%s\033[0m\n' "$*"; }
yel() { printf '\033[0;33m%s\033[0m\n' "$*"; }

echo "=== swarm-039 restore Compose on share ${SHARE_IP} ==="

if [[ "$CONFIRM" != "I_RESTORE_COMPOSE_AFTER_SWARM" ]]; then
  yel "CONFIRM_RESTORE_COMPOSE unset — refusing (expected until operator arms restore)."
  yel "Arm with: CONFIRM_RESTORE_COMPOSE=I_RESTORE_COMPOSE_AFTER_SWARM $0"
  yel "If Swarm is still active on share, also set CONFIRM_LEAVE_SWARM=I_LEAVE_SWARM_FOR_COMPOSE"
  exit 0
fi

[[ -f "$SHARE_KEY" ]] || { red "missing SHARE_SSH_KEY ${SHARE_KEY}"; exit 1; }
[[ "$SHARE_IP" != "$CI_IP" ]] || { red "refuse restore on CI IP"; exit 1; }

ssh_share() {
  ssh -i "$SHARE_KEY" -o BatchMode=yes -o ConnectTimeout=20 -o IdentitiesOnly=yes \
    -o StrictHostKeyChecking=accept-new "root@${SHARE_IP}" "$@"
}

swarm_state="$(ssh_share 'docker info --format "{{.Swarm.LocalNodeState}}"')"
echo "share Swarm=${swarm_state}"

if [[ "$swarm_state" == "active" ]]; then
  if [[ "${SKIP_SWARM_LEAVE:-0}" == "1" ]]; then
    red "Swarm still active and SKIP_SWARM_LEAVE=1 — abort (ports 80/443 clash)"
    exit 1
  fi
  if [[ "$LEAVE" != "I_LEAVE_SWARM_FOR_COMPOSE" ]]; then
    red "Swarm active on share — set CONFIRM_LEAVE_SWARM=I_LEAVE_SWARM_FOR_COMPOSE to stack rm + leave"
    exit 1
  fi
  yel "Removing Swarm stack ${STACK} and leaving Swarm on share"
  ssh_share bash -s <<EOS
set -euo pipefail
if docker stack ls --format '{{.Name}}' 2>/dev/null | grep -qx '${STACK}'; then
  docker stack rm '${STACK}'
  for i in \$(seq 1 40); do
    docker stack ls --format '{{.Name}}' 2>/dev/null | grep -qx '${STACK}' || break
    sleep 2
  done
fi
# Wait for published host ports to free
sleep 5
docker swarm leave --force
docker info --format 'Swarm={{.Swarm.LocalNodeState}}'
EOS
  grn "Share left Swarm"
elif [[ "$swarm_state" != "inactive" ]]; then
  yel "Unexpected Swarm state=${swarm_state} — continuing cautiously"
fi

# Refuse if Swarm tasks / Traefik still hold 80/443
busy="$(ssh_share 'ss -lntp | grep -E \":(80|443)\\b\" || true')"
if echo "$busy" | grep -qiE 'docker-proxy|traefik'; then
  red "Host ports still held after leave:"
  echo "$busy"
  exit 1
fi

IMAGE_TAG="${IMAGE_TAG:-}"
if [[ -z "$IMAGE_TAG" ]]; then
  IMAGE_TAG="$(ssh_share 'cat /opt/lenr-sim/.rollback-image-tag 2>/dev/null || true')"
fi
if [[ -z "$IMAGE_TAG" ]]; then
  IMAGE_TAG="$(ssh_share "grep -E '^IMAGE_TAG=' /opt/lenr-sim/.env | tail -1 | cut -d= -f2- | tr -d \"'\\\"\"" || true)"
fi
IMAGE_TAG="${IMAGE_TAG:-0.3.7-beta}"
yel "Restoring Compose with IMAGE_TAG=${IMAGE_TAG}"

ssh_share bash -s <<EOS
set -euo pipefail
export LENR_ENV_FILE=/opt/lenr-sim/.env
export IMAGE_TAG='${IMAGE_TAG}'
export BUILD_LOCALLY='${BUILD_LOCALLY:-0}'
APP=/opt/lenr-sim/src/LENR_SIM_APP_v2
[[ -x "\$APP/infrastructure/vps/scripts/deploy.sh" ]] || {
  echo "missing \$APP/infrastructure/vps/scripts/deploy.sh" >&2
  exit 1
}
cd "\$APP"
bash infrastructure/vps/scripts/deploy.sh
EOS

code="$(curl -sk -o /dev/null -w '%{http_code}' --connect-timeout 20 "${SHARE_URL}/api/health" || echo 000)"
spa="$(curl -sk -o /dev/null -w '%{http_code}' --connect-timeout 20 "${SHARE_URL}/" || echo 000)"
echo "share /api/health → ${code}"
echo "share SPA / → ${spa}"
if [[ "$code" == "200" && "$spa" == "200" ]]; then
  grn "Compose restore GREEN — ${SHARE_URL} api+spa → 200 (IMAGE_TAG=${IMAGE_TAG})"
  exit 0
fi
red "Compose restore health not green (api=${code} spa=${spa})"
exit 1
