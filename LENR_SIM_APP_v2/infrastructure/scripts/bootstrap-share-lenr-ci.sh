#!/usr/bin/env bash
# Bootstrap (or refresh) the GitHub Actions runner tarball on the Compose share
# KVM2 when ALLOW_SHARE_RUNNER=1. Does not register — use
# register-lenr-ci-runner.sh with the same override after you have a token.
#
# Run ON the share as root, or via SSH from the agent:
#   ALLOW_SHARE_RUNNER=1 ./bootstrap-share-lenr-ci.sh
set -euo pipefail

SHARE_IP="185.211.4.66"
RUNNER_DIR="${RUNNER_DIR:-/opt/actions-runner}"

if [[ "${ALLOW_SHARE_RUNNER:-}" != "1" ]]; then
  echo "Refusing: set ALLOW_SHARE_RUNNER=1 to bootstrap on the Compose share." >&2
  exit 2
fi

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

if ! ip -4 addr 2>/dev/null | grep -q "${SHARE_IP//./\\.}"; then
  echo "Warning: host does not show ${SHARE_IP}; continuing (operator override)." >&2
fi

export DEBIAN_FRONTEND=noninteractive
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi

# CI job deps the github-runner user cannot sudo-install (no passwordless sudo).
apt-get update -qq
apt-get install -y -qq unzip ansible
npx --yes playwright install-deps chromium >/dev/null

id github-runner >/dev/null 2>&1 || useradd -m -s /bin/bash github-runner
usermod -aG docker github-runner 2>/dev/null || true

mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"
if [[ ! -x ./config.sh ]]; then
  VER="$(curl -fsS https://api.github.com/repos/actions/runner/releases/latest \
    | python3 -c 'import json,sys; print(json.load(sys.stdin)["tag_name"].lstrip("v"))')"
  TGZ="actions-runner-linux-x64-${VER}.tar.gz"
  curl -fsSL -o "$TGZ" \
    "https://github.com/actions/runner/releases/download/v${VER}/${TGZ}"
  tar xzf "$TGZ"
  rm -f "$TGZ"
fi
chown -R github-runner:github-runner "$RUNNER_DIR"

cat >/etc/cron.d/lenr-ci-workdir-cleanup <<'CRON'
# Wipe idle runner workdir residue nightly (share co-tenant)
15 4 * * * github-runner find /opt/actions-runner/_work -mindepth 1 -maxdepth 1 -mtime +1 -exec rm -rf {} + 2>/dev/null || true
CRON
chmod 644 /etc/cron.d/lenr-ci-workdir-cleanup

echo "ALLOW_SHARE_RUNNER=1 bootstrap $(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  >>/var/log/lenr-ci-bootstrap.log
echo "Bootstrap OK: $RUNNER_DIR (register next with ALLOW_SHARE_RUNNER=1)."
