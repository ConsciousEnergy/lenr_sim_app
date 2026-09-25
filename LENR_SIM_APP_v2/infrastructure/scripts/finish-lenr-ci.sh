#!/usr/bin/env bash
# One-shot finish path for dedicated lenr-ci runner (never the Compose share).
#
# Prerequisites (env):
#   HOSTINGER_API_TOKEN              — poll for new VM
#   GH_RUNNER_REGISTRATION_TOKEN    — register runner (or GH_ADMIN_PAT to mint one)
#   CI_VM_SSH_HOST / CI_VM_SSH_KEY  — optional; if set, SSH and run register remotely
#
# Steps:
#   1) Wait until Hostinger lists a VM other than SHARE_VM_ID (default 1280333)
#   2) Refuse share IP 185.211.4.66
#   3) If SSH available: run register-lenr-ci-runner.sh on the CI VM
#   4) Print next: Idle check + LENR_CI_RUNS_ON + workflow_dispatch lenr-ci-smoke
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
SHARE_VM_ID="${SHARE_VM_ID:-1280333}"
SHARE_IP="185.211.4.66"
POLL_SECONDS="${POLL_SECONDS:-20}"
MAX_POLLS="${MAX_POLLS:-90}"

if [[ -z "${HOSTINGER_API_TOKEN:-}" ]]; then
  echo "HOSTINGER_API_TOKEN required" >&2
  exit 1
fi

if [[ -z "${GH_RUNNER_REGISTRATION_TOKEN:-}" && -n "${GH_ADMIN_PAT:-}" ]]; then
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

echo "== 1) Wait for dedicated CI VM =="
MAX_POLLS="$MAX_POLLS" POLL_SECONDS="$POLL_SECONDS" SHARE_VM_ID="$SHARE_VM_ID" \
  "$ROOT/LENR_SIM_APP_v2/infrastructure/scripts/poll-lenr-ci-vm.sh" \
  | tee /tmp/lenr-ci-poll.out
# Re-resolve VM details
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
  exit 3
fi
echo "CI VM id=$VM_ID hostname=$VM_HOST state=$VM_STATE ip=$VM_IP"

echo "== 2) Register runner =="
if [[ -n "${CI_VM_SSH_HOST:-}" || -n "$VM_IP" ]]; then
  SSH_HOST="${CI_VM_SSH_HOST:-root@$VM_IP}"
  SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=15)
  if [[ -n "${CI_VM_SSH_KEY:-}" ]]; then
    KEYFILE=$(mktemp)
    printf '%s\n' "$CI_VM_SSH_KEY" >"$KEYFILE"
    chmod 600 "$KEYFILE"
    SSH_OPTS+=(-i "$KEYFILE")
  fi
  if ssh "${SSH_OPTS[@]}" "$SSH_HOST" 'echo ssh_ok' 2>/dev/null; then
    scp "${SSH_OPTS[@]}" \
      "$ROOT/LENR_SIM_APP_v2/infrastructure/scripts/register-lenr-ci-runner.sh" \
      "$SSH_HOST:/tmp/register-lenr-ci-runner.sh"
    ssh "${SSH_OPTS[@]}" "$SSH_HOST" \
      "export GH_RUNNER_REGISTRATION_TOKEN=$(printf %q "$GH_RUNNER_REGISTRATION_TOKEN"); bash /tmp/register-lenr-ci-runner.sh"
  else
    echo "SSH to $SSH_HOST failed — register manually on the CI VM:"
    echo "  export GH_RUNNER_REGISTRATION_TOKEN=..."
    echo "  bash register-lenr-ci-runner.sh"
  fi
  [[ -n "${KEYFILE:-}" ]] && rm -f "$KEYFILE"
else
  echo "No SSH — print manual register commands only."
fi

echo
echo "== 3) Next (human / admin) =="
cat <<EOF
1. GitHub → Settings → Actions → Runners → confirm Idle (labels self-hosted,linux,x64,lenr-ci)
2. Set repo variable LENR_CI_RUNS_ON=["self-hosted","linux","x64","lenr-ci"]
   (optional if you only need smoke: Actions → lenr-ci smoke → Run workflow)
3. Confirm share $SHARE_IP never appears as a runner
4. Do not apply CONFIRM_SWARM_0_3_9; leave EQ-OPEN-* OPEN
EOF
