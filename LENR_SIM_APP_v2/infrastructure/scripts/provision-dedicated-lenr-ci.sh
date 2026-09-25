#!/usr/bin/env bash
# Purchase + setup a *dedicated* Hostinger CI VM for lenr-ci.
# Never targets the Compose share (VM 1280333 / 185.211.4.66).
#
# HARD GATE (required):
#   CONFIRM_PURCHASE_LENR_CI=I_BUY_DEDICATED_CI
#
# Env:
#   HOSTINGER_API_TOKEN   required
#   ITEM_ID               default hostingercom-vps-kvm2-usd-1m
#   DATA_CENTER_ID        default 24 (bos2)
#   TEMPLATE_ID           default 1077 (Ubuntu 24.04)
#   POST_INSTALL_ID       default 5725 (lenr-ci-runner-bootstrap)
#   HOSTNAME              default lenr-ci
#   PAYMENT_METHOD_ID     optional (account default otherwise)
#   PUBLIC_KEY_NAME/KEY   optional SSH public key to embed at setup
#
# After payment clears and the VM is running, use finish-lenr-ci.sh
# (without ALLOW_SHARE_RUNNER) + GH_RUNNER_REGISTRATION_TOKEN.
set -euo pipefail

SHARE_VM_ID=1280333
SHARE_IP=185.211.4.66
ITEM_ID="${ITEM_ID:-hostingercom-vps-kvm2-usd-1m}"
DATA_CENTER_ID="${DATA_CENTER_ID:-24}"
TEMPLATE_ID="${TEMPLATE_ID:-1077}"
POST_INSTALL_ID="${POST_INSTALL_ID:-5725}"
HOSTNAME="${HOSTNAME:-lenr-ci}"
API="https://developers.hostinger.com/api"

if [[ "${CONFIRM_PURCHASE_LENR_CI:-}" != "I_BUY_DEDICATED_CI" ]]; then
  echo "Refusing purchase: set CONFIRM_PURCHASE_LENR_CI=I_BUY_DEDICATED_CI" >&2
  echo "This spends money on a second Hostinger KVM for dedicated CI." >&2
  exit 2
fi

if [[ -z "${HOSTINGER_API_TOKEN:-}" ]]; then
  echo "HOSTINGER_API_TOKEN required" >&2
  exit 1
fi

auth=(-H "Authorization: Bearer ${HOSTINGER_API_TOKEN}" -H "Accept: application/json" -H "Content-Type: application/json" -H "User-Agent: lenr-ci-provision")

echo "== Preflight: ensure we are not touching the share =="
curl -fsS "${auth[@]}" "$API/vps/v1/virtual-machines" -o /tmp/lenr-ci-vms-before.json
python3 - <<'PY'
import json
vms=json.load(open("/tmp/lenr-ci-vms-before.json"))
vms=vms if isinstance(vms,list) else vms.get("data",[])
print("current_vms", [(v.get("id"), v.get("hostname"), (v.get("ipv4") or [{}])[0].get("address")) for v in vms])
ids={int(v.get("id")) for v in vms}
print("share_present", 1280333 in ids)
PY

echo "== Purchase ${ITEM_ID} =="
setup_json=$(python3 - <<PY
import json, os
setup={
  "template_id": int(os.environ.get("TEMPLATE_ID","1077")),
  "data_center_id": int(os.environ.get("DATA_CENTER_ID","24")),
  "post_install_script_id": int(os.environ.get("POST_INSTALL_ID","5725")),
  "hostname": os.environ.get("HOSTNAME","lenr-ci"),
  "enable_backups": False,
  "install_monarx": False,
}
if os.environ.get("PUBLIC_KEY") and os.environ.get("PUBLIC_KEY_NAME"):
  setup["public_key"]={"name": os.environ["PUBLIC_KEY_NAME"], "key": os.environ["PUBLIC_KEY"]}
body={"item_id": os.environ.get("ITEM_ID","hostingercom-vps-kvm2-usd-1m"), "setup": setup}
pm=os.environ.get("PAYMENT_METHOD_ID")
if pm:
  body["payment_method_id"]=int(pm)
print(json.dumps(body))
PY
)

# Hostinger purchase endpoint expects setup as nested object; pass via file
printf '%s\n' "$setup_json" >/tmp/lenr-ci-purchase.json
# Some API variants want setup as JSON string — try object form first via MCP-compatible shape.
RESP=$(curl -sS -w "\nHTTP:%{http_code}" "${auth[@]}" \
  -X POST "$API/vps/v1/virtual-machines" \
  --data-binary @/tmp/lenr-ci-purchase.json || true)
echo "$RESP" | tee /tmp/lenr-ci-purchase.out
HTTP=$(echo "$RESP" | sed -n 's/^HTTP://p' | tail -1)
if [[ "$HTTP" != "200" && "$HTTP" != "201" && "$HTTP" != "202" ]]; then
  echo "Purchase failed (HTTP $HTTP). If payment_initiated, finish 3DS in hPanel." >&2
  exit 3
fi

echo
echo "Next: poll until a VM id != ${SHARE_VM_ID} appears, then:"
echo "  ./LENR_SIM_APP_v2/infrastructure/scripts/finish-lenr-ci.sh"
echo "Do NOT set ALLOW_SHARE_RUNNER. Do NOT register on ${SHARE_IP}."
