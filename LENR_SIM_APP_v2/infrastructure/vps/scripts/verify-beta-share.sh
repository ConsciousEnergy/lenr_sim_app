#!/usr/bin/env bash
# Verify the shareable public-beta surface (DNS + TLS + /api/health).
#
# Usage:
#   ./infrastructure/vps/scripts/verify-beta-share.sh
#   BETA_SHARE_URL=https://lenr-sim-beta.conscious.energy ./infrastructure/vps/scripts/verify-beta-share.sh
#   EXPECT_VERSION=0.3.7-beta ./infrastructure/vps/scripts/verify-beta-share.sh
#
# Exit 0 only when the preferred share host is healthy. Warns (does not fail)
# when the intended public name still points at WordPress.
set -euo pipefail

SHARE_URL="${BETA_SHARE_URL:-https://lenr-sim-beta.conscious.energy}"
INTENDED_URL="${BETA_INTENDED_URL:-https://lenr-simp-app.conscious.energy}"
EXPECT_VERSION="${EXPECT_VERSION:-}"
TIMEOUT="${CURL_TIMEOUT:-20}"

probe() {
  local url="$1"
  curl -fsS --max-time "$TIMEOUT" "${url%/}/api/health"
}

echo "==> Prefer share host: $SHARE_URL"
body="$(probe "$SHARE_URL")"
echo "$body" | head -c 400
echo

if ! echo "$body" | grep -q '"status"[[:space:]]*:[[:space:]]*"healthy"'; then
  echo "ERROR: $SHARE_URL /api/health is not healthy" >&2
  exit 1
fi

if [[ -n "$EXPECT_VERSION" ]]; then
  if ! echo "$body" | grep -q "\"version\"[[:space:]]*:[[:space:]]*\"${EXPECT_VERSION}\""; then
    echo "ERROR: expected version ${EXPECT_VERSION} in health payload" >&2
    exit 1
  fi
  echo "OK: version matches ${EXPECT_VERSION}"
fi

echo "OK: share host healthy"

echo "==> Intended public name (informational): $INTENDED_URL"
if intended_body="$(probe "$INTENDED_URL" 2>/dev/null)"; then
  echo "$intended_body" | head -c 200
  echo
  if echo "$intended_body" | grep -q '"status"[[:space:]]*:[[:space:]]*"healthy"'; then
    echo "OK: intended hostname also healthy"
  else
    echo "WARN: intended hostname responded but not healthy" >&2
  fi
else
  echo "WARN: intended hostname unreachable or not on VPS yet."
  echo "      If dig shows CNAME → conscious.energy (WordPress), replace with A → VPS."
  echo "      See docs/v0.3.7-beta/LIVE_SHARE_STATUS.md"
fi
