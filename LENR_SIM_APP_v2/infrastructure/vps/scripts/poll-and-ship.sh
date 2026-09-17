#!/usr/bin/env bash
# Poll VPS SSH / Hostinger token / Actions secrets until Compose KM ship can run.
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
#   ACTIONS_DISPATCH_EVERY   default 0 (Actions only when TRY_ACTIONS_SHIP touched;
#                            set e.g. 30 to retry on an interval once VPS_* secrets exist)
#   ACTIONS_EVENT_TYPE       default vps-compose-ship (use vps-compose-redeploy after
#                            that workflow type lands on main — cheaper, no rebuild)
#   STATUS_FILE              default /opt/cursor/artifacts/poll_and_ship_status.json
#
# Token drop (no agent restart): write token-only one line to either
#   /opt/cursor/artifacts/HOSTINGER_API_TOKEN.txt  or  /tmp/HOSTINGER_API_TOKEN
#
# Force one Actions attempt immediately (no restart): touch
#   /opt/cursor/artifacts/TRY_ACTIONS_SHIP
set -euo pipefail

CONFIRM_TOKEN="I_SHIP_VPS_0_3_8"
HOST="${VPS_HOST:-185.211.4.66}"
IDENT="${VPS_SSH_IDENTITY_FILE:-$HOME/.ssh/lenr_vps_agent_ed25519}"
INTERVAL="${POLL_INTERVAL_SEC:-60}"
MAX="${POLL_MAX_ATTEMPTS:-0}"
ACTIONS_EVERY="${ACTIONS_DISPATCH_EVERY:-15}"
# Prefer cheap redeploy (no image rebuild) once that type exists on main (#204);
# fall back to full vps-compose-ship. Override with ACTIONS_EVENT_TYPE.
ACTIONS_EVENT="${ACTIONS_EVENT_TYPE:-}"
STATUS_FILE="${STATUS_FILE:-/opt/cursor/artifacts/poll_and_ship_status.json}"
TRY_ACTIONS_FILE="${TRY_ACTIONS_SHIP_FILE:-/opt/cursor/artifacts/TRY_ACTIONS_SHIP}"
TOKEN_FILES=(
  "${HOSTINGER_API_TOKEN_FILE:-/opt/cursor/artifacts/HOSTINGER_API_TOKEN.txt}"
  "/tmp/HOSTINGER_API_TOKEN"
)
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
SHIP="$ROOT/LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh"
UNLOCK="$ROOT/LENR_SIM_APP_v2/infrastructure/vps/scripts/hostinger-compose-unlock.py"
REPO="${MERGE_TRAIN_REPO:-ConsciousEnergy/lenr_sim_app}"

actions_events() {
  if [[ -n "$ACTIONS_EVENT" ]]; then
    printf '%s\n' "$ACTIONS_EVENT"
    return 0
  fi
  # Try redeploy first (no-op / unused until workflow type is on default branch).
  printf '%s\n' "vps-compose-redeploy" "vps-compose-ship"
}

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

load_token_file() {
  local f
  for f in "${TOKEN_FILES[@]}"; do
    if [[ -f "$f" && -s "$f" ]]; then
      # shellcheck disable=SC2155
      export HOSTINGER_API_TOKEN="$(tr -d '\r\n' <"$f")"
      echo "loaded HOSTINGER_API_TOKEN from $f (len=${#HOSTINGER_API_TOKEN})"
      return 0
    fi
  done
  return 1
}

token_ok() {
  load_token_file || true
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

# Dispatch one Actions event; returns 0 if a run was found and watched successfully.
dispatch_and_watch() {
  local event="$1"
  local before_epoch run_id i
  before_epoch="$(date -u +%s)"
  echo "[actions] dispatching ${event}"
  if ! gh api --method POST "repos/${REPO}/dispatches" --input - <<EOF
{"event_type":"${event}","client_payload":{"confirm":"${CONFIRM_TOKEN}"}}
EOF
  then
    echo "[actions] dispatch HTTP failed for ${event}" >&2
    return 1
  fi
  run_id=""
  for i in $(seq 1 30); do
    run_id="$(
      gh run list --repo "$REPO" --workflow "Build and Deploy" --limit 12 \
        --json databaseId,createdAt,event,displayTitle \
        | python3 -c "
import json,sys,datetime
before=${before_epoch}-30
rows=json.load(sys.stdin)
for r in rows:
    ts=r.get('createdAt') or ''
    try:
        epoch=int(datetime.datetime.fromisoformat(ts.replace('Z','+00:00')).timestamp())
    except Exception:
        continue
    if epoch < before:
        continue
    if r.get('event') != 'repository_dispatch':
        continue
    print(r['databaseId'])
    break
"
    )"
    if [[ -n "$run_id" ]]; then
      break
    fi
    sleep 4
  done
  if [[ -z "$run_id" ]]; then
    echo "[actions] no run for ${event} (type missing on default branch?)" >&2
    return 1
  fi
  echo "[actions] watching run $run_id (${event})"
  if ! gh run watch "$run_id" --repo "$REPO" --exit-status; then
    echo "[actions] run $run_id failed" >&2
    write_status "actions_run_failed" "event=${event} run=$run_id"
    return 1
  fi
  if "$SHIP" probe-km; then
    write_status "done" "actions probe-km ok event=${event} run=$run_id"
    return 0
  fi
  write_status "actions_probe_failed" "event=${event} run=$run_id"
  return 1
}

# Try Actions deploy without preferring the (possibly unauthorized) local key.
# Returns 0 on probe-km success; non-zero on failure (caller continues polling).
try_actions_ship() {
  if [[ "${CONFIRM:-}" != "$CONFIRM_TOKEN" || "${EXECUTE:-0}" != "1" ]]; then
    write_status "actions_plan_only" "would dispatch actions events"
    echo "ACTIONS: plan-only (need CONFIRM=${CONFIRM_TOKEN} EXECUTE=1)"
    return 2
  fi
  if ! command -v gh >/dev/null 2>&1; then
    echo "ACTIONS: gh not available" >&2
    return 1
  fi
  write_status "actions_dispatch" "trying events"
  local ev
  while IFS= read -r ev; do
    [[ -z "$ev" ]] && continue
    if dispatch_and_watch "$ev"; then
      return 0
    fi
  done < <(actions_events)
  return 1
}

want_actions_now() {
  if [[ -f "$TRY_ACTIONS_FILE" ]]; then
    rm -f "$TRY_ACTIONS_FILE"
    return 0
  fi
  return 1
}

attempt=0
write_status "polling" "interval=${INTERVAL}s ident=$IDENT actions_every=${ACTIONS_EVERY}"
echo "==> poll-and-ship host=$HOST interval=${INTERVAL}s actions_every=${ACTIONS_EVERY}"
echo "    actions events: $(actions_events | tr '\n' ' ')"
echo "    CONFIRM=${CONFIRM:-unset} EXECUTE=${EXECUTE:-0}"

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
  if want_actions_now || { [[ "$ACTIONS_EVERY" != "0" ]] && (( attempt % ACTIONS_EVERY == 0 )); }; then
    echo "[$attempt] trying Actions dispatch path"
    if try_actions_ship; then
      exit 0
    fi
    echo "[$attempt] Actions path not ready — continue polling"
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
