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
#   PAYMENT_METHOD_ID     default 38165666 (account default card)
#   PUBLIC_KEY_NAME/KEY   optional; defaults to ~/.ssh/id_ed25519.pub if present
#
# After payment clears (hPanel 3DS if payment_initiated) and the VM is running,
# use finish-lenr-ci.sh (without ALLOW_SHARE_RUNNER) + GH_RUNNER_REGISTRATION_TOKEN.
set -euo pipefail

SHARE_VM_ID=1280333
SHARE_IP=185.211.4.66
ITEM_ID="${ITEM_ID:-hostingercom-vps-kvm2-usd-1m}"
DATA_CENTER_ID="${DATA_CENTER_ID:-24}"
TEMPLATE_ID="${TEMPLATE_ID:-1077}"
POST_INSTALL_ID="${POST_INSTALL_ID:-5725}"
HOSTNAME="${HOSTNAME:-lenr-ci}"
PAYMENT_METHOD_ID="${PAYMENT_METHOD_ID:-38165666}"
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

if [[ -z "${PUBLIC_KEY:-}" && -f "${HOME}/.ssh/id_ed25519.pub" ]]; then
  PUBLIC_KEY="$(cat "${HOME}/.ssh/id_ed25519.pub")"
  PUBLIC_KEY_NAME="${PUBLIC_KEY_NAME:-cursor-cloud-lenr-ci}"
fi

echo "== Preflight =="
curl -fsS -H "Authorization: Bearer ${HOSTINGER_API_TOKEN}" -H "Accept: application/json" \
  -H "User-Agent: lenr-ci-provision" \
  "$API/vps/v1/virtual-machines" -o /tmp/lenr-ci-vms-before.json
python3 - <<'PY'
import json
vms=json.load(open("/tmp/lenr-ci-vms-before.json"))
vms=vms if isinstance(vms,list) else vms.get("data",[])
print("current_vms", [(v.get("id"), v.get("hostname"), (v.get("ipv4") or [{}])[0].get("address")) for v in vms])
PY

echo "== Purchase ${ITEM_ID} (single VPS purchase call; do not also POST /billing/orders) =="
export ITEM_ID DATA_CENTER_ID TEMPLATE_ID POST_INSTALL_ID HOSTNAME PAYMENT_METHOD_ID
export PUBLIC_KEY="${PUBLIC_KEY:-}" PUBLIC_KEY_NAME="${PUBLIC_KEY_NAME:-}"
python3 - <<'PY'
import json, os, urllib.request
token=os.environ["HOSTINGER_API_TOKEN"]
setup={
  "template_id": int(os.environ["TEMPLATE_ID"]),
  "data_center_id": int(os.environ["DATA_CENTER_ID"]),
  "post_install_script_id": int(os.environ["POST_INSTALL_ID"]),
  "hostname": os.environ["HOSTNAME"],
  "enable_backups": False,
  "install_monarx": False,
}
if os.environ.get("PUBLIC_KEY"):
  setup["public_key"]={"name": os.environ.get("PUBLIC_KEY_NAME") or "lenr-ci", "key": os.environ["PUBLIC_KEY"]}
body={
  "item_id": os.environ["ITEM_ID"],
  "payment_method_id": int(os.environ["PAYMENT_METHOD_ID"]),
  "setup": setup,
}
req=urllib.request.Request(
  "https://developers.hostinger.com/api/vps/v1/virtual-machines",
  data=json.dumps(body).encode(),
  headers={
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-Agent": "lenr-ci-provision",
  },
  method="POST",
)
with urllib.request.urlopen(req, timeout=90) as r:
    print("HTTP", r.status)
    print(r.read().decode())
PY

echo
echo "If status is payment_initiated: finish ONE 3DS in hPanel; cancel duplicate pending orders."
echo "Then: ./LENR_SIM_APP_v2/infrastructure/scripts/finish-lenr-ci.sh"
echo "Do NOT set ALLOW_SHARE_RUNNER. Do NOT register on ${SHARE_IP}."
