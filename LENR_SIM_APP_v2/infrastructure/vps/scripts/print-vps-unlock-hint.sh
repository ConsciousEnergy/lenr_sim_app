#!/usr/bin/env bash
# Printed when Actions VPS_HOST / VPS_SSH_KEY are empty so the job log
# carries the operator one-shot for Compose KM ship.
set -euo pipefail

cat <<'EOF'
::error::VPS_HOST / VPS_SSH_KEY Actions secrets are not set — live Compose deploy skipped.

Unblock (pick one):
1) Hostinger VNC as root on 185.211.4.66 (password auth is off — publickey only):
   mkdir -p /root/.ssh && chmod 700 /root/.ssh
   echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPBJI+cf2cRAQHU8K7NSk63gc1oOkRFqQDJzD/ees/K5 cursor-agent-compose-ship-v038' >> /root/.ssh/authorized_keys
   chmod 600 /root/.ssh/authorized_keys
   # optional immediate ship:
   cd /opt/lenr-sim/src && git fetch --prune origin && git checkout -qf origin/main
   LENR_ENV_FILE=/opt/lenr-sim/.env IMAGE_TAG=0.3.7-beta UPDATE_ENV_IMAGE_TAG=1 EXPECT_VERSION=0.3.7-beta \
     LENR_SIM_APP_v2/infrastructure/vps/scripts/deploy.sh

2) Set repo Actions secrets VPS_HOST=185.211.4.66 + an authorized VPS_SSH_KEY, then
   repository_dispatch type vps-compose-redeploy with client_payload.confirm=I_SHIP_VPS_0_3_8

3) Drop HOSTINGER_API_TOKEN (Cursor secret or /opt/cursor/artifacts/HOSTINGER_API_TOKEN.txt)

Docs: LENR_SIM_APP_v2/docs/v0.3.8-beta/COMPOSE_SHIP_HANDOFF.md
Fingerprint: SHA256:HaidEon7f5LFkr7+R2aaURHrOa84/dVhljOy0DKK+10
EOF
exit 1
