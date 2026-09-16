#!/usr/bin/env bash
# Poll VPS SSH / Hostinger token until Compose KM ship can run, then ship + probe.
#
# Plan-only by default. Real ship requires CONFIRM=I_SHIP_VPS_0_3_8 EXECUTE=1.
#
# Usage (repo root):
#   ./LENR_SIM_APP_v2/infrastructure/vps/scripts/poll-and-ship.sh
#   CONFIRM=I_SHIP_VPS_0_3_8 EXECUTE=1 \
#     ./LENR_SIM_APP_v2/infrastructure/vps/scripts/poll-and-ship.sh
#
# Env:
#   VPS_HOST                 default 185.211.4.66
#   VPS_SSH_IDENTITY_FILE    default ~/.ssh/lenr_vps_agent_ed25519
#   POLL_INTERVAL_SEC        default 60
#   POLL_MAX_ATTEMPTS        default 0 (unlimited until success or kill)
#   STATUS_FILE              default /opt/cursor/artifacts/poll_and_ship_status.json
set -euo pipefail

CONFIRM_TOKEN="I_SHIP_VPS_0_3_8"
HOST="${VPS_HOST:-185.211.4.66}"
IDENT="${VPS_SSH_IDENTITY_FILE:-$HOME/.ssh/lenr_vps_agent_ed25519}"
INTERVAL="${POLL_INTERVAL_SEC:-60}"
MAX="${POLL_MAX_ATTEMPTS:-0}"
STATUS_FILE="${STATUS_FILE:-/opt/cursor/artifacts/poll_and_ship_status.json}"
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
SHIP="$ROOT/LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh"
UNLOCK="$ROOT/LENR_SIM_APP_v2/infrastructure/vps/scripts/hostinger-compose-unlock.py"

write_status() {
  local phase="$1" detail="${2:-}"
  mkdir -p "$(dirname "$STATUS_FILE")"
  python3 - "$STATUS_FILE" "$phase" "$detail" "$HOST" <<'PY'
import json,sys,datetime
path,phase,detail,host=sys.argv[1:5]
open(path,"w").write(json.dumps({
  "ts": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
  "phase": phase,
  "detail": detail,
  "host": host,
}, indent=2)+"\n")
PY
}

ssh_ok() {
  [[ -f "$IDENT" ]] || return 1
  timeout 8 ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new \
    -o ConnectTimeout=5 -i "$IDENT" "root@$HOST" 'echo OK' 2>/dev/null | grep -q '^OK'
}

token_ok() {
  [[ -n "${HOSTINGER_API_TOKEN:-}" ]]
}

do_ship() {
  if [[ "${CONFIRM:-}" != "$CONFIRM_TOKEN" || "${EXECUTE:-0}" != "1" ]]; then
    write_status "ready_but_plan_only" "SSH/token available; set CONFIRM=${CONFIRM_TOKEN} EXECUTE=1 to ship"
    echo "READY: auth available but plan-only (need CONFIRM=${CONFIRM_TOKEN} EXECUTE=1)"
    return 2
  fi
  write_status "shipping" "auth ok"
  if token_ok && [[ ! -f "$IDENT" || ! ssh_ok ]]; then
    CONFIRM="$CONFIRM_TOKEN" EXECUTE=1 python3 "$UNLOCK" unlock
  else
    VPS_SSH_IDENTITY_FILE="$IDENT" CONFIRM="$CONFIRM_TOKEN" EXECUTE=1 \
      "$SHIP" ssh-ship
  fi
  "$SHIP" probe-km
  write_status "done" "probe-km finished"
}

attempt=0
write_status "polling" "interval=${INTERVAL}s ident=$IDENT"
echo "==> poll-and-ship host=$HOST interval=${INTERVAL}s (CONFIRM=${CONFIRM:-unset} EXECUTE=${EXECUTE:-0})"

while true; do
  attempt=$((attempt + 1))
  if ssh_ok; then
    echo "[$attempt] SSH OK — shipping"
    do_ship
    exit $?
  fi
  if token_ok; then
    echo "[$attempt] HOSTINGER_API_TOKEN set — unlock path"
    do_ship
    exit $?
  fi
  write_status "waiting" "attempt=$attempt ssh=denied token=unset"
  echo "[$attempt] waiting (ssh denied, no Hostinger token)"
  if [[ "$MAX" != "0" && "$attempt" -ge "$MAX" ]]; then
    write_status "timeout" "attempts=$attempt"
    echo "ERROR: max attempts reached" >&2
    exit 1
  fi
  sleep "$INTERVAL"
done
