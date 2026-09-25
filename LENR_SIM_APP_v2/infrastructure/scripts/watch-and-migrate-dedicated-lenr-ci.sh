#!/usr/bin/env bash
# Long-poll for dedicated CI VM + usable registration token, then migrate.
# Never uses ALLOW_SHARE_RUNNER. Safe to run under tmux.
#
# Env:
#   HOSTINGER_API_TOKEN              required
#   GH_RUNNER_REGISTRATION_TOKEN     when usable (len>=40, not G1th*/placeholder)
#   CONFIRM_REMOVE_SHARE_RUNNER      default I_REMOVE_SHARE_RUNNER once dedicated found
#   POLL_SECONDS                     default 30
#   LOG                              default /opt/cursor/artifacts/lenr-ci-auto-migrate.log
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
SHARE_VM_ID="${SHARE_VM_ID:-1280333}"
SHARE_IP="185.211.4.66"
POLL_SECONDS="${POLL_SECONDS:-30}"
LOG="${LOG:-/opt/cursor/artifacts/lenr-ci-auto-migrate.log}"
API="https://developers.hostinger.com/api/vps/v1/virtual-machines"
mkdir -p "$(dirname "$LOG")"

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" | tee -a "$LOG"; }

# Re-load secrets each loop so Cursor-injected tokens are picked up without restart.
ENV_FILE="${ENV_FILE:-/tmp/lenr-ci-watch.env}"
reload_env() {
  if [[ -f "$ENV_FILE" ]]; then
    # shellcheck disable=SC1090
    set -a
    # Prefer file values for token fields; keep HOSTINGER_API_TOKEN if already set.
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
  fi
}

token_usable() {
  local t="${GH_RUNNER_REGISTRATION_TOKEN:-}"
  [[ -n "$t" && "$t" != G1th* && "$t" != placeholder* && "${#t}" -ge 40 ]]
}

find_dedicated() {
  curl -fsS -H "Authorization: Bearer ${HOSTINGER_API_TOKEN}" \
    -H "Accept: application/json" -H "User-Agent: lenr-ci-auto-migrate" \
    "$API" | SHARE_VM_ID="$SHARE_VM_ID" SHARE_IP="$SHARE_IP" python3 -c '
import json, os, sys
share=int(os.environ["SHARE_VM_ID"])
share_ip=os.environ["SHARE_IP"]
data=json.load(sys.stdin)
vms=data if isinstance(data,list) else data.get("data",[])
for vm in vms:
    if int(vm.get("id",0))==share: continue
    ip=(vm.get("ipv4") or [{}])[0].get("address","")
    if ip==share_ip: continue
    print(f"{vm.get('id')}|{vm.get('hostname')}|{ip}|{vm.get('state')}")
    break
'
}

if [[ -z "${HOSTINGER_API_TOKEN:-}" ]]; then
  echo "HOSTINGER_API_TOKEN required" >&2
  exit 1
fi

log "auto-migrate watch start (share_vm=${SHARE_VM_ID})"
while true; do
  reload_env
  found="$(find_dedicated || true)"
  if [[ -z "$found" ]]; then
    log "wait: no dedicated VM yet (complete 3DS for order 61660939 / 61662216 / 61663818", "61665445)"
  elif ! token_usable; then
    log "wait: dedicated FOUND ($found) but GH_RUNNER_REGISTRATION_TOKEN not usable (len=${#GH_RUNNER_REGISTRATION_TOKEN})"
  else
    log "ready: dedicated=$found — running migrate-to-dedicated-lenr-ci.sh"
    export CONFIRM_REMOVE_SHARE_RUNNER="${CONFIRM_REMOVE_SHARE_RUNNER:-I_REMOVE_SHARE_RUNNER}"
    unset ALLOW_SHARE_RUNNER
    if "$ROOT/LENR_SIM_APP_v2/infrastructure/scripts/migrate-to-dedicated-lenr-ci.sh" 2>&1 | tee -a "$LOG"; then
      log "migrate SUCCESS"
      exit 0
    else
      log "migrate FAILED — will retry"
    fi
  fi
  sleep "$POLL_SECONDS"
done
