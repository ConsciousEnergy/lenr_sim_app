#!/usr/bin/env bash
# When Hostinger gains a non-card payment method (e.g. PayPal), attempt ONE
# dedicated VPS purchase via provision-dedicated-lenr-ci.sh.
# Never registers on share. Never loops purchases.
#
# Env:
#   HOSTINGER_API_TOKEN           required
#   CONFIRM_PURCHASE_LENR_CI      must be I_BUY_DEDICATED_CI
#   POLL_SECONDS                  default 60
#   MARKER                        default /tmp/lenr-ci-drop-artifacts/paypal_provision_attempted
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
API="https://developers.hostinger.com/api/billing/v1/payment-methods"
POLL_SECONDS="${POLL_SECONDS:-60}"
MARKER="${MARKER:-/tmp/lenr-ci-drop-artifacts/paypal_provision_attempted}"
LOG="${LOG:-/opt/cursor/artifacts/paypal-provision-watch.log}"
SHARE_VM_ID="${SHARE_VM_ID:-1280333}"
mkdir -p "$(dirname "$LOG")" "$(dirname "$MARKER")"

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" | tee -a "$LOG"; }

if [[ -z "${HOSTINGER_API_TOKEN:-}" ]]; then
  echo "HOSTINGER_API_TOKEN required" >&2
  exit 1
fi
if [[ "${CONFIRM_PURCHASE_LENR_CI:-}" != "I_BUY_DEDICATED_CI" ]]; then
  echo "CONFIRM_PURCHASE_LENR_CI=I_BUY_DEDICATED_CI required" >&2
  exit 2
fi

log "paypal-provision watch start"

while true; do
  # Already have dedicated?
  if curl -fsS -H "Authorization: Bearer ${HOSTINGER_API_TOKEN}" \
      -H "Accept: application/json" -H "User-Agent: lenr-ci-paypal-watch" \
      "https://developers.hostinger.com/api/vps/v1/virtual-machines" \
      | SHARE_VM_ID="$SHARE_VM_ID" python3 -c '
import json,os,sys
share=int(os.environ["SHARE_VM_ID"])
data=json.load(sys.stdin)
vms=data if isinstance(data,list) else data.get("data",[])
for vm in vms:
  if int(vm.get("id",0))!=share:
    print(vm.get("id")); break
' | grep -q .; then
    log "dedicated VM already present — watcher idle exit"
    exit 0
  fi

  if [[ -f "$MARKER" ]]; then
    log "provision already attempted ($(cat "$MARKER")) — waiting for dedicated / human"
    sleep "$POLL_SECONDS"
    continue
  fi

  pay_id="$(
    curl -fsS -H "Authorization: Bearer ${HOSTINGER_API_TOKEN}" \
      -H "Accept: application/json" -H "User-Agent: lenr-ci-paypal-watch" \
      "$API" | python3 -c '
import json,sys
data=json.load(sys.stdin)
items=data if isinstance(data,list) else data.get("data",[])
for i in items:
  method=(i.get("payment_method") or "").lower()
  if method in ("card","credit_card",""):
    continue
  if i.get("is_expired") or i.get("is_suspended"):
    continue
  print(i.get("id"))
  break
'
  )"

  if [[ -z "$pay_id" ]]; then
    log "wait: no non-card payment method yet (add PayPal in hPanel)"
    sleep "$POLL_SECONDS"
    continue
  fi

  log "non-card payment method id=$pay_id — attempting ONE dedicated provision"
  echo "$pay_id $(date -u +%Y-%m-%dT%H:%M:%SZ)" >"$MARKER"
  export PAYMENT_METHOD_ID="$pay_id"
  export ITEM_ID="${ITEM_ID:-hostingercom-vps-kvm1-usd-1m}"
  export CONFIRM_PURCHASE_LENR_CI=I_BUY_DEDICATED_CI
  unset ALLOW_SHARE_RUNNER || true
  set +e
  "$ROOT/LENR_SIM_APP_v2/infrastructure/scripts/provision-dedicated-lenr-ci.sh" 2>&1 | tee -a "$LOG"
  ec=${PIPESTATUS[0]}
  set -e
  log "provision exit=$ec (marker kept — no automatic retry)"
  sleep "$POLL_SECONDS"
done
