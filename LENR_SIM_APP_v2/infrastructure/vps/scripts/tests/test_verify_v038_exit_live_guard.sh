#!/usr/bin/env bash
# Regression: tip/local BETA_SHARE_URL must not false-PASS km_auto_live_compose.
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
VERIFY="$ROOT/LENR_SIM_APP_v2/infrastructure/vps/scripts/verify-v038-exit.sh"
TMP_JSON="$(mktemp)"
TMP_MD="$(mktemp)"
cleanup() { rm -f "$TMP_JSON" "$TMP_MD"; }
trap cleanup EXIT

# 1) Explicit localhost LIVE_COMPOSE_URL must FAIL
set +e
LIVE_COMPOSE_URL=http://127.0.0.1:18080 \
  EXIT_AUDIT_JSON="$TMP_JSON" EXIT_AUDIT_MD="$TMP_MD" \
  bash "$VERIFY"
rc=$?
set -e
test "$rc" -ne 0
python3 - "$TMP_JSON" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
assert d["goal_complete"] is False
assert "km_auto_live_compose" in d["blocking"]
assert any("LIVE_COMPOSE_URL_not_public" in str(m) for m in d["live_modes"])
print("ok_localhost_rejected")
PY

# 2) BETA_SHARE_URL tip override must be ignored (still probes public share)
set +e
BETA_SHARE_URL=http://127.0.0.1:18080 \
  EXIT_AUDIT_JSON="$TMP_JSON" EXIT_AUDIT_MD="$TMP_MD" \
  bash "$VERIFY"
rc=$?
set -e
# May be 0 only if public live already has auto; otherwise non-zero.
python3 - "$TMP_JSON" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
assert d.get("live_compose_url") == "https://lenr-sim-beta.conscious.energy"
modes=d.get("live_modes") or []
# Must not be tip-only auto list without hitting public URL field
assert "live_compose_url" in d
if "auto" in modes:
    # If public truly has auto, goal may be complete — still must record public URL
    print("ok_public_has_auto", modes)
else:
    assert "km_auto_live_compose" in d["blocking"]
    print("ok_tip_override_ignored", modes)
PY
echo "PASS test_verify_v038_exit_live_guard"
