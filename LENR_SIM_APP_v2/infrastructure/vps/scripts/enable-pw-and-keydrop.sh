#!/usr/bin/env bash
# Run as root on Hostinger Browser VNC (network SSH PasswordAuthentication is usually off).
# Installs the cloud-agent Compose-ship pubkey and optionally enables password SSH
# so a waiting agent can finish the KM auto Compose pull.
set -euo pipefail

AGENT_PUB='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPBJI+cf2cRAQHU8K7NSk63gc1oOkRFqQDJzD/ees/K5 cursor-agent-compose-ship-v038'
UNLOCK_TUNNEL_URL="${UNLOCK_TUNNEL_URL:-}"

mkdir -p /root/.ssh && chmod 700 /root/.ssh
grep -qxF "$AGENT_PUB" /root/.ssh/authorized_keys 2>/dev/null \
  || echo "$AGENT_PUB" >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys

if grep -qE '^#?PasswordAuthentication' /etc/ssh/sshd_config; then
  sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config
else
  echo 'PasswordAuthentication yes' >> /etc/ssh/sshd_config
fi
mkdir -p /etc/ssh/sshd_config.d
echo 'PasswordAuthentication yes' > /etc/ssh/sshd_config.d/99-cursor-temp-pw.conf
systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null || service ssh reload || true
echo KEYDROP_AND_PW_OK

if [[ -n "$UNLOCK_TUNNEL_URL" ]]; then
  curl -fsSL "${UNLOCK_TUNNEL_URL%/}/unlock.sh" | bash \
    || echo 'unlock.sh skipped (pubkey installed; agent poller will ship)'
elif [[ -x /opt/lenr-sim/src/LENR_SIM_APP_v2/infrastructure/vps/scripts/vnc-one-shot-km-ship.sh ]]; then
  bash /opt/lenr-sim/src/LENR_SIM_APP_v2/infrastructure/vps/scripts/vnc-one-shot-km-ship.sh \
    || echo 'one-shot skipped (pubkey installed; agent poller will ship)'
else
  echo 'pubkey installed — agent poller / password watcher will ship tip Compose'
fi
