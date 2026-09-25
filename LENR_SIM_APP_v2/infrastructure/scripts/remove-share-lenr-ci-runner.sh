#!/usr/bin/env bash
# Remove the GitHub Actions runner from the Compose share KVM2.
# Call ONLY after a dedicated lenr-ci runner is Idle (goal: share never a runner).
#
# Env:
#   CONFIRM_REMOVE_SHARE_RUNNER=I_REMOVE_SHARE_RUNNER   required
#   SHARE_SSH_HOST   default root@185.211.4.66
#   REQUIRE_DEDICATED_IDLE=1  (default) — refuse unless a non-share VM exists
#   HOSTINGER_API_TOKEN       required when REQUIRE_DEDICATED_IDLE=1
#   GH_RUNNER_REMOVE_TOKEN    optional — from GitHub UI when removing a runner
set -euo pipefail

SHARE_IP="185.211.4.66"
SHARE_VM_ID="${SHARE_VM_ID:-1280333}"
SHARE_SSH_HOST="${SHARE_SSH_HOST:-root@${SHARE_IP}}"
RUNNER_DIR="${RUNNER_DIR:-/opt/actions-runner}"

if [[ "${CONFIRM_REMOVE_SHARE_RUNNER:-}" != "I_REMOVE_SHARE_RUNNER" ]]; then
  echo "Refusing: set CONFIRM_REMOVE_SHARE_RUNNER=I_REMOVE_SHARE_RUNNER" >&2
  exit 2
fi

if [[ "${REQUIRE_DEDICATED_IDLE:-1}" == "1" ]]; then
  if [[ -z "${HOSTINGER_API_TOKEN:-}" ]]; then
    echo "HOSTINGER_API_TOKEN required to verify dedicated VM exists" >&2
    exit 1
  fi
  other="$(curl -fsS -H "Authorization: Bearer ${HOSTINGER_API_TOKEN}" \
    -H "Accept: application/json" -H "User-Agent: lenr-ci-remove-share" \
    "https://developers.hostinger.com/api/vps/v1/virtual-machines" \
    | SHARE_VM_ID="$SHARE_VM_ID" python3 -c '
import json, os, sys
share=int(os.environ["SHARE_VM_ID"])
data=json.load(sys.stdin)
vms=data if isinstance(data,list) else data.get("data",[])
for vm in vms:
    if int(vm.get("id",0))==share: continue
    ip=(vm.get("ipv4") or [{}])[0].get("address","")
    print(f"{vm.get('id')}|{vm.get('hostname')}|{ip}|{vm.get('state')}")
    break
')"
  if [[ -z "$other" ]]; then
    echo "Refusing: no dedicated VM (id≠${SHARE_VM_ID}). Do not leave the repo without a runner." >&2
    exit 3
  fi
  echo "Dedicated present: $other"
fi

SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=15)
[[ -f "${HOME}/.ssh/id_ed25519" ]] && SSH_OPTS+=(-i "${HOME}/.ssh/id_ed25519")

# Upload a tiny remote script to avoid stdin/heredoc conflicts with ssh.
REMOTE_SCRIPT=$(mktemp)
cat >"$REMOTE_SCRIPT" <<'REMOTE'
#!/usr/bin/env bash
set -euo pipefail
RD="${1:-/opt/actions-runner}"
cd "$RD"
if [[ ! -f .runner ]]; then
  echo "No .runner on share — already clean."
  exit 0
fi
if [[ -x ./svc.sh ]]; then
  ./svc.sh stop || true
fi
if [[ -x ./config.sh ]]; then
  if [[ -n "${GH_RUNNER_REMOVE_TOKEN:-}" ]]; then
    ./config.sh remove --unattended --token "$GH_RUNNER_REMOVE_TOKEN" \
      || echo "config.sh remove with token failed"
  else
    ./config.sh remove --unattended 2>/dev/null \
      || echo "config.sh remove failed — disable unit; remove orphan in GitHub UI"
  fi
fi
systemctl disable --now "actions.runner.ConsciousEnergy-lenr_sim_app.lenr-ci-share-1.service" 2>/dev/null || true
rm -f .runner .credentials .credentials_rsaparams 2>/dev/null || true
echo "Share runner registration cleared under $RD"
REMOTE

scp "${SSH_OPTS[@]}" "$REMOTE_SCRIPT" "$SHARE_SSH_HOST:/tmp/remove-share-lenr-ci-runner-remote.sh"
rm -f "$REMOTE_SCRIPT"
ssh "${SSH_OPTS[@]}" "$SHARE_SSH_HOST" \
  "chmod +x /tmp/remove-share-lenr-ci-runner-remote.sh; export GH_RUNNER_REMOVE_TOKEN=$(printf %q "${GH_RUNNER_REMOVE_TOKEN:-}"); /tmp/remove-share-lenr-ci-runner-remote.sh $(printf %q "$RUNNER_DIR")"

echo "Done. Confirm GitHub → Settings → Actions → Runners has no lenr-ci-share-* on ${SHARE_IP}."
