#!/usr/bin/env bash
# Bootstrap CI job dependencies on the dedicated lenr-ci VM (NOT the Compose share).
# Does not register the runner — use finish-lenr-ci.sh / register-lenr-ci-runner.sh.
#
# Run ON dedicated as root, or via SSH:
#   ssh root@45.93.100.251 'bash -s' < bootstrap-dedicated-lenr-ci.sh
#
# Refuses if this host is the Compose share (185.211.4.66 / srv1280333).
set -euo pipefail

SHARE_IP="185.211.4.66"
RUNNER_DIR="${RUNNER_DIR:-/opt/actions-runner}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

if ip -4 addr 2>/dev/null | grep -q "${SHARE_IP//./\\.}"; then
  echo "Refusing: this is the Compose share (${SHARE_IP}). Use bootstrap-share-lenr-ci.sh with ALLOW_SHARE_RUNNER=1 only for interim." >&2
  exit 2
fi
if [[ -f /etc/hostname ]]; then
  hn="$(tr -d '\n' </etc/hostname)"
  if [[ "$hn" == *lenr-sim-app* ]] || [[ "$hn" == srv1280333* ]]; then
    echo "Refusing: hostname looks like Compose share ($hn)." >&2
    exit 2
  fi
fi

export DEBIAN_FRONTEND=noninteractive
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi

apt-get update -qq
apt-get install -y -qq unzip ansible wget
npx --yes playwright install-deps chromium >/dev/null || true

# System Chrome — required on Ubuntu 26+ where Playwright bundled Chromium
# is unsupported (LENR_CI_SYSTEM_CHROME=1 in frontend-e2e).
if ! command -v google-chrome >/dev/null 2>&1; then
  wget -q -O /tmp/google-chrome-stable_current_amd64.deb \
    https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
  apt-get install -y -qq /tmp/google-chrome-stable_current_amd64.deb
  rm -f /tmp/google-chrome-stable_current_amd64.deb
fi
google-chrome --version

id github-runner >/dev/null 2>&1 || useradd -m -s /bin/bash github-runner
usermod -aG docker github-runner 2>/dev/null || true
mkdir -p /home/github-runner
chown -R github-runner:github-runner /home/github-runner

mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"
if [[ ! -x ./config.sh ]]; then
  VER="${RUNNER_VERSION:-2.337.0}"
  TGZ="actions-runner-linux-x64-${VER}.tar.gz"
  curl -fsSL -o "$TGZ" \
    "https://github.com/actions/runner/releases/download/v${VER}/${TGZ}"
  tar xzf "$TGZ"
  rm -f "$TGZ"
fi
chown -R github-runner:github-runner "$RUNNER_DIR"

cat >/etc/cron.d/lenr-ci-workdir-cleanup <<'CRON'
15 4 * * * github-runner find /opt/actions-runner/_work -mindepth 1 -maxdepth 1 -mtime +1 -exec rm -rf {} + 2>/dev/null || true
CRON
chmod 644 /etc/cron.d/lenr-ci-workdir-cleanup

echo "DEDICATED_CI_DEPS_OK $(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  >>/var/log/lenr-ci-bootstrap.log
echo "Bootstrap OK: $RUNNER_DIR on dedicated (register next — no ALLOW_SHARE_RUNNER)."
