#!/usr/bin/env bash
# Prove dedicated lenr-ci goal end-state (not share interim).
# Exit 0 only when ALL checks pass.
#
# Env:
#   HOSTINGER_API_TOKEN   required
#   SHARE_SSH_HOST        default root@185.211.4.66
#   SHARE_VM_ID           default 1280333
#   REPO                  default ConsciousEnergy/lenr_sim_app
#   SKIP_SMOKE            set to 1 to skip workflow_dispatch wait
#   OUT                   default /opt/cursor/artifacts/lenr-ci-dedicated-proof.log
set -euo pipefail

SHARE_VM_ID="${SHARE_VM_ID:-1280333}"
SHARE_IP="185.211.4.66"
SHARE_SSH_HOST="${SHARE_SSH_HOST:-root@${SHARE_IP}}"
REPO="${REPO:-ConsciousEnergy/lenr_sim_app}"
OUT="${OUT:-/opt/cursor/artifacts/lenr-ci-dedicated-proof.log}"
API="https://developers.hostinger.com/api/vps/v1/virtual-machines"
mkdir -p "$(dirname "$OUT")"

if [[ -z "${HOSTINGER_API_TOKEN:-}" ]]; then
  echo "HOSTINGER_API_TOKEN required" >&2
  exit 1
fi

fail=0
exec > >(tee "$OUT") 2>&1

echo "=== dedicated lenr-ci proof $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

echo "== 1) dedicated VM ≠ ${SHARE_VM_ID} =="
found="$(curl -fsS -H "Authorization: Bearer ${HOSTINGER_API_TOKEN}" \
  -H "Accept: application/json" -H "User-Agent: lenr-ci-prove" \
  "$API" | SHARE_VM_ID="$SHARE_VM_ID" SHARE_IP="$SHARE_IP" python3 -c '
import json, os, sys
share=int(os.environ["SHARE_VM_ID"]); share_ip=os.environ["SHARE_IP"]
data=json.load(sys.stdin)
vms=data if isinstance(data,list) else data.get("data",[])
for vm in vms:
    if int(vm.get("id",0))==share: continue
    ip=(vm.get("ipv4") or [{}])[0].get("address","")
    if ip==share_ip: continue
    print("%s|%s|%s|%s" % (vm.get("id"), vm.get("hostname"), ip, vm.get("state")))
    break
')"
if [[ -z "$found" ]]; then
  echo "FAIL: no dedicated VM"
  fail=1
else
  echo "PASS: $found"
fi

echo "== 2) share has no .runner =="
SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new)
[[ -f "${HOME}/.ssh/id_ed25519" ]] && SSH_OPTS+=(-i "${HOME}/.ssh/id_ed25519")
share_state="$(
  ssh "${SSH_OPTS[@]}" "$SHARE_SSH_HOST" \
    'test -f /opt/actions-runner/.runner && echo HAS_RUNNER || echo NO_RUNNER' 2>/dev/null || echo SSH_FAIL
)"
if [[ "$share_state" == "NO_RUNNER" ]]; then
  echo "PASS: share clean"
else
  echo "FAIL: share state=$share_state (want NO_RUNNER)"
  fail=1
fi

echo "== 3) beta 0.3.7-beta healthy =="
if curl -fsS --max-time 15 https://lenr-sim-beta.conscious.energy/api/health \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d["status"]=="healthy" and d["version"]=="0.3.7-beta"; print("PASS:", d["status"], d["version"])'; then
  :
else
  echo "FAIL: beta health"
  fail=1
fi

echo "== 4) deploy.yml not on lenr-ci =="
if grep -nE 'runs-on:.*lenr-ci' /workspace/.github/workflows/deploy.yml 2>/dev/null; then
  echo "FAIL: deploy.yml includes lenr-ci"
  fail=1
else
  echo "PASS: deploy.yml off lenr-ci"
fi

if [[ "${SKIP_SMOKE:-0}" != "1" ]]; then
  echo "== 5) dispatch lenr-ci-smoke =="
  if gh workflow run lenr-ci-smoke.yml --ref "$(git -C /workspace rev-parse --abbrev-ref HEAD)" 2>/tmp/lenr-ci-smoke-dispatch.err; then
    echo "dispatched; waiting up to 10m..."
    ok_smoke=0
    for _ in $(seq 1 60); do
      sleep 10
      row="$(gh run list --workflow=lenr-ci-smoke.yml --limit 1 --json databaseId,conclusion,status,url \
        --jq '.[0] | "\(.status)|\(.conclusion)|\(.databaseId)|\(.url)"' 2>/dev/null || true)"
      echo "  smoke: $row"
      status="${row%%|*}"; rest="${row#*|}"
      conclusion="${rest%%|*}"; rest2="${rest#*|}"
      rid="${rest2%%|*}"; url="${rest2#*|}"
      if [[ "$status" == "completed" ]]; then
        if [[ "$conclusion" == "success" ]]; then
          jobs="$(gh run view "$rid" --json jobs --jq '.jobs[].name' 2>/dev/null || true)"
          echo "  jobs: $jobs"
          echo "PASS: smoke green $url"
          ok_smoke=1
        else
          echo "FAIL: smoke conclusion=$conclusion $url"
        fi
        break
      fi
    done
    if [[ "$ok_smoke" != "1" ]]; then
      echo "FAIL: smoke not green in time"
      fail=1
    fi
  else
    echo "WARN: could not dispatch smoke: $(tr -d '\n' </tmp/lenr-ci-smoke-dispatch.err | head -c 200)"
    echo "FAIL: smoke dispatch"
    fail=1
  fi
else
  echo "== 5) smoke skipped (SKIP_SMOKE=1) =="
fi

echo
if [[ "$fail" -eq 0 ]]; then
  echo "VERDICT: PASS — dedicated lenr-ci goal evidence collected"
else
  echo "VERDICT: FAIL — dedicated lenr-ci goal not met"
fi

echo "Wrote $OUT"
exit "$fail"
