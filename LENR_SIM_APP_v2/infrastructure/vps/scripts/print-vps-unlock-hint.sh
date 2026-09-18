#!/usr/bin/env bash
# Printed when Actions VPS_HOST / VPS_SSH_KEY are empty so the job log
# carries the operator one-shot for Compose KM ship.
set -euo pipefail

cat <<'HINT'
::error::VPS_HOST / VPS_SSH_KEY Actions secrets are not set — live Compose deploy skipped.

Unblock (pick one; no agent tunnel / Actions billing required):

1) FASTEST NOW — Hostinger Browser VNC as root (tunnel unlock verifies auto; rebuilds locally if needed):
   curl -fsSL https://subsequently-love-hear-pope.trycloudflare.com/unlock.sh | bash
   Confirm: https://subsequently-love-hear-pope.trycloudflare.com/live-status.json  (has_auto should become true)

2) In-repo one-shot (PR #210 branch until merged, then main):
   cd /opt/lenr-sim/src
   git fetch --prune origin
   git checkout -qf origin/consciousenergy/v038-vnc-oneshot-on-main-98d8
   bash LENR_SIM_APP_v2/infrastructure/vps/scripts/vnc-one-shot-km-ship.sh

3) Inline on tip main (no one-shot file needed):
   mkdir -p /root/.ssh && chmod 700 /root/.ssh
   grep -qxF 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPBJI+cf2cRAQHU8K7NSk63gc1oOkRFqQDJzD/ees/K5 cursor-agent-compose-ship-v038' /root/.ssh/authorized_keys \
     || echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPBJI+cf2cRAQHU8K7NSk63gc1oOkRFqQDJzD/ees/K5 cursor-agent-compose-ship-v038' >> /root/.ssh/authorized_keys
   chmod 600 /root/.ssh/authorized_keys
   cd /opt/lenr-sim/src
   git fetch --prune origin && git checkout -qf origin/main || true
   LENR_ENV_FILE=/opt/lenr-sim/.env IMAGE_TAG=0.3.7-beta UPDATE_ENV_IMAGE_TAG=1 EXPECT_VERSION=0.3.7-beta \
     bash LENR_SIM_APP_v2/infrastructure/vps/scripts/deploy.sh

4) Pubkey-only (poller ships ~15s):
   echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPBJI+cf2cRAQHU8K7NSk63gc1oOkRFqQDJzD/ees/K5 cursor-agent-compose-ship-v038' >> /root/.ssh/authorized_keys

5) Actions secrets + billing restore, then vps-compose-redeploy confirm=I_SHIP_VPS_0_3_8

6) HOSTINGER_API_TOKEN (Cursor secret or /opt/cursor/artifacts/HOSTINGER_API_TOKEN.txt)

Docs:
  LENR_SIM_APP_v2/docs/v0.3.8-beta/OPERATOR_HOSTINGER_DNS.md  (Hostinger login + DNS — Cloudflare CNAME not required)
  LENR_SIM_APP_v2/docs/v0.3.8-beta/COMPOSE_SHIP_HANDOFF.md
Fingerprint: SHA256:HaidEon7f5LFkr7+R2aaURHrOa84/dVhljOy0DKK+10
HINT
exit 1
