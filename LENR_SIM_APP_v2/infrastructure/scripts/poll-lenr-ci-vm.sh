#!/usr/bin/env bash
# Poll Hostinger for a dedicated CI VM (not the Compose share), then print
# register instructions. Safe on the agent host; does not SSH by default.
#
# Env:
#   HOSTINGER_API_TOKEN   required
#   SHARE_VM_ID           default 1280333
#   POLL_SECONDS          default 30
#   MAX_POLLS             default 40 (~20 min)
set -euo pipefail

SHARE_VM_ID="${SHARE_VM_ID:-1280333}"
POLL_SECONDS="${POLL_SECONDS:-30}"
MAX_POLLS="${MAX_POLLS:-40}"
API="https://developers.hostinger.com/api/vps/v1/virtual-machines"
OUT="${TMPDIR:-/tmp}/lenr-ci-vms.json"

if [[ -z "${HOSTINGER_API_TOKEN:-}" ]]; then
  echo "HOSTINGER_API_TOKEN required" >&2
  exit 1
fi

echo "Polling for CI VM != ${SHARE_VM_ID} (max ${MAX_POLLS} x ${POLL_SECONDS}s)..."
for ((i=1; i<=MAX_POLLS; i++)); do
  curl -fsS -H "Authorization: Bearer ${HOSTINGER_API_TOKEN}" \
    -H "User-Agent: lenr-ci-poller" -H "Accept: application/json" \
    "$API" >"$OUT"
  found="$(OUT="$OUT" SHARE_VM_ID="$SHARE_VM_ID" python3 - <<'PY'
import json, os
share = int(os.environ["SHARE_VM_ID"])
with open(os.environ["OUT"]) as f:
    data = json.load(f)
vms = data if isinstance(data, list) else data.get("data", [])
for vm in vms:
    if int(vm.get("id", 0)) == share:
        continue
    ipv4 = ""
    if vm.get("ipv4"):
        ipv4 = vm["ipv4"][0].get("address", "")
    print(f"{vm.get('id')}|{vm.get('hostname')}|{vm.get('state')}|{ipv4}")
    break
PY
)"
  if [[ -n "$found" ]]; then
    IFS='|' read -r vm_id hostname state ip <<<"$found"
    echo "FOUND id=${vm_id} hostname=${hostname} state=${state} ip=${ip}"
    if [[ "$ip" == "185.211.4.66" ]]; then
      echo "ERROR: matched share IP — refusing" >&2
      exit 2
    fi
    cat <<'EOF'
Next on the CI VM (as root), after bootstrap finishes:
  export GH_RUNNER_REGISTRATION_TOKEN=...
  ./LENR_SIM_APP_v2/infrastructure/scripts/register-lenr-ci-runner.sh
Then set repo variable LENR_CI_RUNS_ON=["self-hosted","linux","x64","lenr-ci"]
EOF
    exit 0
  fi
  echo "  poll ${i}/${MAX_POLLS}: only share VM present"
  sleep "$POLL_SECONDS"
done
echo "Timed out waiting for CI VM (orders may still be payment_initiated)." >&2
exit 3
