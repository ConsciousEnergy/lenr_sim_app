#!/bin/bash
# Idempotent host hardening for the LENR public-beta VPS (Ubuntu 24.04).
# Run as root. Safe to re-run. Does NOT rotate the root password (do that in hPanel).
set -euo pipefail

SWAP_MB="${SWAP_MB:-2048}"
SSH_PUBKEY="${SSH_PUBKEY:-}"

log() { printf '[bootstrap] %s\n' "$*"; }

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Must run as root" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ufw fail2ban curl ca-certificates unattended-upgrades

# --- SSH: install deploy key if provided, then disable password auth ---
install -d -m 700 /root/.ssh
touch /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
if [[ -n "$SSH_PUBKEY" ]]; then
  if ! grep -Fqx "$SSH_PUBKEY" /root/.ssh/authorized_keys; then
    printf '%s\n' "$SSH_PUBKEY" >> /root/.ssh/authorized_keys
    log "Installed deploy public key"
  fi
fi

# Cloud-init drop-in currently re-enables PasswordAuthentication. Override it.
cat > /etc/ssh/sshd_config.d/99-lenr-hardening.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
PermitRootLogin prohibit-password
PubkeyAuthentication yes
X11Forwarding no
AllowTcpForwarding no
EOF
# Neutralize the cloud-init drop-in that sets PasswordAuthentication yes.
if [[ -f /etc/ssh/sshd_config.d/50-cloud-init.conf ]]; then
  sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' \
    /etc/ssh/sshd_config.d/50-cloud-init.conf || true
fi

if [[ ! -s /root/.ssh/authorized_keys ]]; then
  log "WARNING: authorized_keys is empty; refusing to disable password auth."
  rm -f /etc/ssh/sshd_config.d/99-lenr-hardening.conf
else
  systemctl reload ssh || systemctl reload sshd
  log "sshd reloaded (password auth off, key-only root)"
fi

# --- firewall ---
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable
log "ufw enabled (22/80/443)"

# --- fail2ban ---
cat > /etc/fail2ban/jail.d/sshd.local <<'EOF'
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 5
bantime = 1h
findtime = 10m
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban
log "fail2ban sshd jail active"

# --- swap (2 GiB) ---
if ! swapon --show | grep -q .; then
  if [[ ! -f /swapfile ]]; then
    fallocate -l "${SWAP_MB}M" /swapfile || dd if=/dev/zero of=/swapfile bs=1M count="$SWAP_MB"
    chmod 600 /swapfile
    mkswap /swapfile
  fi
  swapon /swapfile || true
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  log "swap ${SWAP_MB}M enabled"
else
  log "swap already present"
fi

# --- docker log rotation ---
if command -v docker >/dev/null 2>&1; then
  mkdir -p /etc/docker
  if [[ ! -f /etc/docker/daemon.json ]]; then
    cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
    systemctl restart docker
    log "docker daemon.json log rotation applied"
  else
    log "docker daemon.json already exists; left unchanged"
  fi
fi

# --- app directories ---
install -d -m 755 /opt/lenr-sim/{logs/backend,logs/caddy,data,backups}
# Backend image runs as uid 1000 (appuser); bind-mounted logs/data must be writable.
chown -R 1000:1000 /opt/lenr-sim/logs/backend /opt/lenr-sim/data
log "created /opt/lenr-sim/{logs,data,backups}"

# --- nightly postgres dump (script path exists after the src tree is copied) ---
cat > /etc/cron.d/lenr-sim-backup <<'EOF'
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
0 3 * * * root LENR_ENV_FILE=/opt/lenr-sim/.env /opt/lenr-sim/src/LENR_SIM_APP_v2/infrastructure/vps/scripts/backup-db.sh >> /opt/lenr-sim/logs/backup.log 2>&1
EOF
chmod 644 /etc/cron.d/lenr-sim-backup
log "installed /etc/cron.d/lenr-sim-backup"

log "bootstrap complete"
