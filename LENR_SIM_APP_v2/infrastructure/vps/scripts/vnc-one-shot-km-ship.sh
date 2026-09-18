#!/usr/bin/env bash
# One-shot Hostinger VNC / console helper for v0.3.8 Compose KM ship.
# Run as root on 185.211.4.66 (PasswordAuthentication is off — console only).
#
# Does:
#   1) Authorize the cloud-agent ed25519 pubkey (poller can re-ship later)
#   2) Best-effort checkout tip of origin/main under /opt/lenr-sim/src
#      (continues if git fetch fails — GHCR IMAGE_TAG pull is what lands KM auto)
#   3) Pull GHCR IMAGE_TAG and recreate compose
#
# Usage:
#   bash LENR_SIM_APP_v2/infrastructure/vps/scripts/vnc-one-shot-km-ship.sh
# Or paste after: cd /opt/lenr-sim/src && git fetch && git checkout -qf origin/main
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

echo "==> Done. Live probe (from laptop/agent):"
echo "  ./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh probe-km"
echo "Expect dynamics_mode=auto in bubble-fusion defaults."
