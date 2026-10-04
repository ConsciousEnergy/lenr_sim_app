#!/usr/bin/env bash
# One-shot Hostinger VNC / console helper for v0.3.8 Compose KM ship.
# Run as root on 185.211.4.66 (PasswordAuthentication is off — console only).
#
# Does:
#   1) Authorize the cloud-agent ed25519 pubkey (poller can re-ship later)
#   2) Best-effort checkout tip of origin/main under /opt/lenr-sim/src
#      (continues if git fetch fails — GHCR IMAGE_TAG pull lands KM auto)
#   3) Pull GHCR IMAGE_TAG and recreate compose
#
# Usage:
#   cd /opt/lenr-sim/src && git fetch --prune origin && git checkout -qf origin/main
#   bash LENR_SIM_APP_v2/infrastructure/vps/scripts/vnc-one-shot-km-ship.sh
set -euo pipefail

AGENT_PUBKEY='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPBJI+cf2cRAQHU8K7NSk63gc1oOkRFqQDJzD/ees/K5 cursor-agent-compose-ship-v038'
SRC="${LENR_SRC:-/opt/lenr-sim/src}"
ENV_FILE="${LENR_ENV_FILE:-/opt/lenr-sim/.env}"
IMAGE_TAG="${IMAGE_TAG:-0.3.7-beta}"
DEPLOY_SH="$SRC/LENR_SIM_APP_v2/infrastructure/vps/scripts/deploy.sh"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "ERROR: run as root on the VPS console" >&2
  exit 2
fi

echo "==> Authorize cloud-agent pubkey"
mkdir -p /root/.ssh
chmod 700 /root/.ssh
touch /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
if grep -qxF "$AGENT_PUBKEY" /root/.ssh/authorized_keys; then
  echo "pubkey already present"
else
  printf '%s\n' "$AGENT_PUBKEY" >> /root/.ssh/authorized_keys
  echo "pubkey appended"
fi

if [[ ! -d "$SRC" ]]; then
  echo "ERROR: missing $SRC — clone the monorepo there first" >&2
  exit 3
fi

echo "==> Best-effort pin tip of origin/main at $SRC"
cd "$SRC"
if git fetch --prune origin && git checkout -qf origin/main; then
  echo "HEAD=$(git rev-parse --short HEAD)"
else
  echo "WARN: git fetch/checkout failed — continuing with existing tree" >&2
  echo "WARN: GHCR pull of IMAGE_TAG=$IMAGE_TAG still applies KM auto if tag is tip" >&2
  git rev-parse --short HEAD 2>/dev/null || true
fi

if [[ ! -f "$DEPLOY_SH" ]]; then
  echo "ERROR: missing $DEPLOY_SH" >&2
  exit 4
fi

echo "==> Deploy IMAGE_TAG=$IMAGE_TAG (GHCR pull; build locally if pull fails)"
LENR_ENV_FILE="$ENV_FILE" \
  IMAGE_TAG="$IMAGE_TAG" \
  UPDATE_ENV_IMAGE_TAG=1 \
  EXPECT_VERSION="$IMAGE_TAG" \
  bash "$DEPLOY_SH"

has_auto() {
  local url="$1"
  python3 - "$url" <<'PY'
import json, sys, urllib.request
url = sys.argv[1]
try:
    with urllib.request.urlopen(url, timeout=20) as resp:
        d = json.load(resp)
except Exception as exc:
    print(f"probe_error:{exc}", file=sys.stderr)
    raise SystemExit(1)
modes = ((d.get("options") or {}).get("dynamics_modes") or [])
print("modes=", modes)
raise SystemExit(0 if "auto" in modes else 1)
PY
}

DEFAULTS_LOCAL="http://127.0.0.1:8000/api/physics/bubble-fusion/defaults"
DEFAULTS_PUBLIC="${BETA_SHARE_URL:-https://lenr-sim-beta.conscious.energy}/api/physics/bubble-fusion/defaults"

echo "==> Verify dynamics_mode=auto after ship"
if has_auto "$DEFAULTS_LOCAL" || has_auto "$DEFAULTS_PUBLIC"; then
  echo "OK: auto present after GHCR/deploy path"
else
  echo "WARN: auto missing after pull — rebuilding locally from checked-out tree" >&2
  LENR_ENV_FILE="$ENV_FILE" \
    IMAGE_TAG="$IMAGE_TAG" \
    UPDATE_ENV_IMAGE_TAG=1 \
    EXPECT_VERSION="$IMAGE_TAG" \
    BUILD_LOCALLY=1 \
    bash "$DEPLOY_SH"
  if has_auto "$DEFAULTS_LOCAL" || has_auto "$DEFAULTS_PUBLIC"; then
    echo "OK: auto present after BUILD_LOCALLY=1"
  else
    echo "ERROR: dynamics_mode=auto still missing after local rebuild" >&2
    exit 5
  fi
fi

echo "==> Done. Agent probe:"
echo "  ./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh probe-km"
echo "Expect dynamics_mode=auto in bubble-fusion defaults."
