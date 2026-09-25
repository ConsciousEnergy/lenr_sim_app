#!/usr/bin/env bash
# Finish path for lenr-ci runner registration.
#
# Modes:
#   Default (dedicated): wait for a Hostinger VM other than SHARE_VM_ID, refuse
#     share IP, then SSH-register.
#   Share override: ALLOW_SHARE_RUNNER=1 SHARE_SSH_HOST=root@185.211.4.66
#     skips dedicated-VM poll and registers on the Compose KVM2.
#
# Prerequisites (env):
#   GH_RUNNER_REGISTRATION_TOKEN    — register runner (or GH_ADMIN_PAT to mint one)
#   HOSTINGER_API_TOKEN             — required unless ALLOW_SHARE_RUNNER=1
#   CI_VM_SSH_HOST / CI_VM_SSH_KEY  — optional dedicated SSH
#   SHARE_SSH_HOST / SHARE_SSH_KEY  — optional share SSH (defaults root@185.211.4.66)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
SHARE_VM_ID="${SHARE_VM_ID:-1280333}"
SHARE_IP="185.211.4.66"
POLL_SECONDS="${POLL_SECONDS:-20}"
MAX_POLLS="${MAX_POLLS:-90}"

if [[ -z "${GH_RUNNER_REGISTRATION_TOKEN:-}" && -n "${GH_ADMIN_PAT:-}" ]]; then
  # Reject obvious placeholders before calling GitHub
  if [[ "${#GH_ADMIN_PAT}" -lt 40 || "$GH_ADMIN_PAT" == G1th* ]]; then
    echo "GH_ADMIN_PAT looks like a placeholder (len=${#GH_ADMIN_PAT}). Inject a real fine-grained PAT." >&2
    exit 1
  fi
  echo "Minting registration token via GH_ADMIN_PAT..."
  GH_RUNNER_REGISTRATION_TOKEN="$(
    GH_TOKEN="$GH_ADMIN_PAT" gh api -X POST \
      repos/ConsciousEnergy/lenr_sim_app/actions/runners/registration-token \
      --jq .token
  )"
  export GH_RUNNER_REGISTRATION_TOKEN
fi

if [[ -z "${GH_RUNNER_REGISTRATION_TOKEN:-}" ]]; then
  echo "Set GH_RUNNER_REGISTRATION_TOKEN (or GH_ADMIN_PAT) before finish." >&2
  exit 1
fi

# GitHub registration tokens vary in length; reject only obvious placeholders.
if [[ "$GH_RUNNER_REGISTRATION_TOKEN" == G1th* || "$GH_RUNNER_REGISTRATION_TOKEN" == placeholder* || "${#GH_RUNNER_REGISTRATION_TOKEN}" -lt 20 ]]; then
  echo "GH_RUNNER_REGISTRATION_TOKEN looks invalid/placeholder (len=${#GH_RUNNER_REGISTRATION_TOKEN})." >&2
  echo "Mint from GitHub → Settings → Actions → Runners → New self-hosted runner (copy --token only)." >&2
  exit 1
fi

# Share co-tenant is allowed when ALLOW_SHARE_RUNNER=1 (operator override).
# Dedicated VM remains preferred for isolation.

run_remote_register() {
  local SSH_HOST="$1"
  local SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=15)
  local KEYFILE=""
  if [[ -n "${2:-}" ]]; then
    KEYFILE=$(mktemp)
    printf '%s\n' "$2" >"$KEYFILE"
    chmod 600 "$KEYFILE"
    SSH_OPTS+=(-i "$KEYFILE")
  elif [[ -f "${HOME}/.ssh/id_ed25519" ]]; then
    SSH_OPTS+=(-i "${HOME}/.ssh/id_ed25519")
  fi
  if ! ssh "${SSH_OPTS[@]}" "$SSH_HOST" 'echo ssh_ok' 2>/dev/null; then
    echo "SSH to $SSH_HOST failed — register manually:" >&2
    echo "  export GH_RUNNER_REGISTRATION_TOKEN=... ALLOW_SHARE_RUNNER=${ALLOW_SHARE_RUNNER:-0}" >&2
    echo "  bash register-lenr-ci-runner.sh" >&2
    [[ -n "$KEYFILE" ]] && rm -f "$KEYFILE"
    return 1
  fi
  scp "${SSH_OPTS[@]}" \
    "$ROOT/LENR_SIM_APP_v2/infrastructure/scripts/register-lenr-ci-runner.sh" \
    "$SSH_HOST:/tmp/register-lenr-ci-runner.sh"
  if [[ "${ALLOW_SHARE_RUNNER:-}" == "1" ]]; then
    scp "${SSH_OPTS[@]}" \
      "$ROOT/LENR_SIM_APP_v2/infrastructure/scripts/bootstrap-share-lenr-ci.sh" \
      "$SSH_HOST:/tmp/bootstrap-share-lenr-ci.sh" || true
    ssh "${SSH_OPTS[@]}" "$SSH_HOST" \
      "export ALLOW_SHARE_RUNNER=1; bash /tmp/bootstrap-share-lenr-ci.sh || true"
  fi
  ssh "${SSH_OPTS[@]}" "$SSH_HOST" \
    "export GH_RUNNER_REGISTRATION_TOKEN=$(printf %q "$GH_RUNNER_REGISTRATION_TOKEN"); export ALLOW_SHARE_RUNNER=$(printf %q "${ALLOW_SHARE_RUNNER:-0}"); bash /tmp/register-lenr-ci-runner.sh"
  [[ -n "$KEYFILE" ]] && rm -f "$KEYFILE"
}

if [[ "${ALLOW_SHARE_RUNNER:-}" == "1" ]]; then
  echo "== Share override: register on ${SHARE_IP} =="
  SSH_HOST="${SHARE_SSH_HOST:-root@${SHARE_IP}}"
  run_remote_register "$SSH_HOST" "${SHARE_SSH_KEY:-${CI_VM_SSH_KEY:-}}"
  cat <<EOF

== Next ==
1. GitHub → Settings → Actions → Runners → confirm Idle (labels self-hosted,linux,x64,lenr-ci)
2. Set repo variable LENR_CI_RUNS_ON=["self-hosted","linux","x64","lenr-ci"]
3. Run workflow_dispatch: lenr-ci smoke (share IP check is informational under share mode)
4. Keep deploy.yml on ubuntu-latest; rotate any root password used for unlock
5. Abandon unpaid Hostinger KVM orders 61650992 / 61651905 in hPanel if still pending
6. Do not apply CONFIRM_SWARM_0_3_9; leave EQ-OPEN-* OPEN
EOF
  exit 0
fi

if [[ -z "${HOSTINGER_API_TOKEN:-}" ]]; then
  echo "HOSTINGER_API_TOKEN required (or set ALLOW_SHARE_RUNNER=1)" >&2
  exit 1
fi

echo "== 1) Wait for dedicated CI VM =="
MAX_POLLS="$MAX_POLLS" POLL_SECONDS="$POLL_SECONDS" SHARE_VM_ID="$SHARE_VM_ID" \
  "$ROOT/LENR_SIM_APP_v2/infrastructure/scripts/poll-lenr-ci-vm.sh" \
  | tee /tmp/lenr-ci-poll.out
OUT=/tmp/lenr-ci-vms.json
curl -fsS -H "Authorization: Bearer ${HOSTINGER_API_TOKEN}" \
  -H "User-Agent: lenr-ci-finish" -H "Accept: application/json" \
  "https://developers.hostinger.com/api/vps/v1/virtual-machines" >"$OUT"
mapfile -t FOUND < <(OUT="$OUT" SHARE_VM_ID="$SHARE_VM_ID" python3 - <<'PY'
import json, os
share=int(os.environ["SHARE_VM_ID"])
data=json.load(open(os.environ["OUT"]))
vms=data if isinstance(data,list) else data.get("data",[])
for vm in vms:
    if int(vm.get("id",0))==share: continue
    ip=(vm.get("ipv4") or [{}])[0].get("address","")
    print(vm.get("id")); print(vm.get("hostname") or ""); print(vm.get("state") or ""); print(ip)
    break
PY
)
VM_ID="${FOUND[0]:-}"
VM_HOST="${FOUND[1]:-}"
VM_STATE="${FOUND[2]:-}"
VM_IP="${FOUND[3]:-}"
if [[ -z "$VM_ID" || "$VM_IP" == "$SHARE_IP" ]]; then
  echo "No dedicated CI VM yet (or matched share). Abort." >&2
  echo "To use the Compose KVM2 instead: ALLOW_SHARE_RUNNER=1 $0" >&2
  exit 3
fi
echo "CI VM id=$VM_ID hostname=$VM_HOST state=$VM_STATE ip=$VM_IP"

echo "== 2) Register runner =="
if [[ -n "${CI_VM_SSH_HOST:-}" || -n "$VM_IP" ]]; then
  SSH_HOST="${CI_VM_SSH_HOST:-root@$VM_IP}"
  run_remote_register "$SSH_HOST" "${CI_VM_SSH_KEY:-}" || true
else
  echo "No SSH — print manual register commands only."
fi

echo
echo "== 3) Next (human / admin) =="
cat <<EOF
1. GitHub → Settings → Actions → Runners → confirm Idle (labels self-hosted,linux,x64,lenr-ci)
2. Set repo variable LENR_CI_RUNS_ON=["self-hosted","linux","x64","lenr-ci"]
   (optional if you only need smoke: Actions → lenr-ci smoke → Run workflow)
3. Confirm share $SHARE_IP is not a runner unless ALLOW_SHARE_RUNNER was intentional
4. Do not apply CONFIRM_SWARM_0_3_9; leave EQ-OPEN-* OPEN
EOF
