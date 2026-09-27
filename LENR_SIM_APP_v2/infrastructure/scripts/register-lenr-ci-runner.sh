#!/usr/bin/env bash
# Register (or reconfigure) the lenr-ci GitHub Actions runner.
#
# Default: dedicated CI VM only. Compose share (185.211.4.66 / VM 1280333)
# requires an explicit operator override:
#   ALLOW_SHARE_RUNNER=1
#
# Required env:
#   GH_RUNNER_REGISTRATION_TOKEN  — short-lived token from
#     Settings → Actions → Runners → New self-hosted runner
#
# Optional:
#   RUNNER_NAME   (default: lenr-ci-1)
#   RUNNER_DIR    (default: /opt/actions-runner)
#   REPO_URL      (default: https://github.com/ConsciousEnergy/lenr_sim_app)
#   ALLOW_SHARE_RUNNER=1  — permit registration on the Compose share KVM2
#
# After the runner shows Idle, set repo variable:
#   LENR_CI_RUNS_ON=["self-hosted","linux","x64","lenr-ci"]
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/ConsciousEnergy/lenr_sim_app}"
RUNNER_DIR="${RUNNER_DIR:-/opt/actions-runner}"
RUNNER_NAME="${RUNNER_NAME:-lenr-ci-1}"
LABELS="self-hosted,linux,x64,lenr-ci"
SHARE_IP="185.211.4.66"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root (needed for svc.sh)." >&2
  exit 1
fi

if [[ -z "${GH_RUNNER_REGISTRATION_TOKEN:-}" ]]; then
  echo "Set GH_RUNNER_REGISTRATION_TOKEN (short-lived; never commit)." >&2
  exit 1
fi

is_share=0
if [[ -f /etc/hostname ]]; then
  hn="$(tr -d '\n' </etc/hostname)"
  if [[ "$hn" == *lenr-sim-app* ]] || [[ "$hn" == srv1280333* ]]; then
    is_share=1
  fi
fi
if ip -4 addr 2>/dev/null | grep -q '185\.211\.4\.66'; then
  is_share=1
fi

if [[ "$is_share" -eq 1 && "${ALLOW_SHARE_RUNNER:-}" != "1" ]]; then
  echo "Refusing: Compose share host detected (${SHARE_IP})." >&2
  echo "Set ALLOW_SHARE_RUNNER=1 to override (PR code co-tenants live Compose)." >&2
  exit 2
fi

if [[ "$is_share" -eq 1 ]]; then
  echo "WARNING: registering lenr-ci on Compose share ${SHARE_IP} (ALLOW_SHARE_RUNNER=1)."
  # Default share name unless operator explicitly set RUNNER_NAME
  if [[ -z "${RUNNER_NAME_SET_BY_OPERATOR:-}" && "${RUNNER_NAME}" == "lenr-ci-1" ]]; then
    RUNNER_NAME="lenr-ci-share-1"
  fi
fi

if [[ ! -x "$RUNNER_DIR/config.sh" ]]; then
  echo "Missing $RUNNER_DIR/config.sh — run bootstrap-share-lenr-ci.sh (or dedicated bootstrap) first." >&2
  exit 1
fi

id github-runner >/dev/null 2>&1 || useradd -m -s /bin/bash github-runner
usermod -aG docker github-runner 2>/dev/null || true
chown -R github-runner:github-runner "$RUNNER_DIR"

cd "$RUNNER_DIR"
if [[ -f .runner ]]; then
  echo "Existing runner config found; removing before reconfigure..."
  sudo -u github-runner ./config.sh remove --token "$GH_RUNNER_REGISTRATION_TOKEN" || true
fi

sudo -u github-runner ./config.sh \
  --url "$REPO_URL" \
  --token "$GH_RUNNER_REGISTRATION_TOKEN" \
  --name "$RUNNER_NAME" \
  --labels "$LABELS" \
  --work _work \
  --unattended

./svc.sh install github-runner
./svc.sh start
./svc.sh status || true

echo
echo "Next: confirm Idle in GitHub → Settings → Actions → Runners,"
echo "then set LENR_CI_RUNS_ON=[\"self-hosted\",\"linux\",\"x64\",\"lenr-ci\"]."
if [[ "$is_share" -eq 1 ]]; then
  echo "Share mode: keep deploy.yml on ubuntu-latest; never give this runner VPS_* secrets."
fi
