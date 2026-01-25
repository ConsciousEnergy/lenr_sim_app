# LENR Simulation App - Deployment Guide

**Version:** 0.2.1-beta  
**Last Updated:** January 2026

---

## Overview

This guide covers deploying the LENR Simulation App using Infrastructure as Code (IaC) with:
- **Frontend**: Cloudflare Pages (static hosting) + R2 (asset storage)
- **Backend**: Hostinger VPS with Docker Swarm
- **Reverse Proxy**: Traefik with automatic SSL via Let's Encrypt
- **Database**: PostgreSQL 16

---

## 📖 Quick Navigation

- **📋 Detailed Step-by-Step Guide:** See [PHASE4_DOCKER_SWARM_DEPLOYMENT.md](PHASE4_DOCKER_SWARM_DEPLOYMENT.md) for comprehensive instructions
- **⚡ Quick Reference:** See [DEPLOYMENT_QUICK_REFERENCE.md](DEPLOYMENT_QUICK_REFERENCE.md) for one-command deployment
- **✅ Checklist:** See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for verification checklist
- **🏗️ Architecture:** See [ARCHITECTURE.md](ARCHITECTURE.md) for system architecture and future migration plans

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
┌──────────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   Cloudflare DNS     │  │ Cloudflare Pages │  │   Cloudflare R2  │
│   (conscious.energy) │  │   (Frontend)     │  │    (Assets)      │
└──────────────────────┘  └──────────────────┘  └──────────────────┘
            │
            │ api.conscious.energy
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HOSTINGER VPS (Ubuntu 24.04)                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                          Docker Swarm                                  │  │
│  │  ┌─────────────┐  ┌─────────────────┐  ┌─────────────────────────┐   │  │
│  │  │   Traefik   │  │    FastAPI      │  │     PostgreSQL 16       │   │  │
│  │  │   :80/:443  │─▶│   Backend (x2)  │─▶│    (Persistent Vol)     │   │  │
│  │  │  Auto-SSL   │  │    :8000        │  │        :5432            │   │  │
│  │  └─────────────┘  └─────────────────┘  └─────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Local Development Machine

1. **Terraform** >= 1.5.0
   ```bash
   # macOS
   brew install terraform
   
   # Windows (via Chocolatey)
   choco install terraform
   
   # Linux
   sudo apt-get install terraform
   ```

2. **Ansible** >= 2.15
   ```bash
   # macOS/Linux
   pip install ansible
   
   # Windows (WSL recommended)
   pip install ansible
   ```

3. **SSH Key** for server access
   ```bash
   ssh-keygen -t ed25519 -C "lenr-sim-deploy" -f ~/.ssh/lenr-sim-deploy
   ```

### Account Requirements

1. **Cloudflare Account** with:
   - Domain added (e.g., `conscious.energy`)
   - API Token with permissions: Zone:DNS, Zone:Page Rules, Account:R2
   - Account ID and Zone ID (from dashboard)

2. **Hostinger Account** with:
   - API Token from https://www.hostinger.com/my-account/api
   - VPS plan selected (recommended: KVM 2)

---

## Deployment Steps

### Step 1: Configure Terraform Variables

```bash
cd infrastructure/terraform

# Copy example variables file
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
nano terraform.tfvars
```

Required variables:
```hcl
# terraform.tfvars
environment           = "prod"
domain                = "conscious.energy"
cloudflare_api_token  = "your-token"
cloudflare_account_id = "your-account-id"
cloudflare_zone_id    = "your-zone-id"
hostinger_api_token   = "your-token"
ssh_public_key        = "ssh-ed25519 AAAA..."
vps_plan              = "hostingercom-vps-kvm2-usd-1m"
data_center_id        = 1  # North America
```

### Step 2: Provision Infrastructure with Terraform

```bash
# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Apply (creates Cloudflare resources and Hostinger VPS)
terraform apply

# Note the outputs
# - vps_ip: Your server IP address
# - frontend_url: Cloudflare Pages URL
```

### Step 3: Configure Ansible Inventory

```bash
cd ../ansible

# Copy example inventory
cp inventory.yml.example inventory.yml

# Update with your VPS IP from Terraform output
nano inventory.yml
```

### Step 4: Setup Docker with Ansible

```bash
# Test SSH connection
ssh -i ~/.ssh/lenr-sim-deploy root@YOUR_VPS_IP

# Run Docker setup playbook
ansible-playbook -i inventory.yml playbooks/setup-docker.yml
```

### Step 5: Deploy Application Stack

**IMPORTANT:** Never pass secrets via command-line arguments as they appear in process lists and shell history.

**Option A: Use Ansible Vault (Recommended for Production)**
```bash
# Create encrypted vault file
ansible-vault create group_vars/vault.yml

# Add postgres_password to vault file, then deploy:
ansible-playbook -i inventory.yml playbooks/deploy-stack.yml --ask-vault-pass
```

**Option B: Use Environment Variable**
```bash
# Generate and export password (not visible in process list)
export POSTGRES_PASSWORD=$(openssl rand -hex 32)
echo "Save this password securely: $POSTGRES_PASSWORD"

# Deploy (password read from environment, not command line)
ansible-playbook -i inventory.yml playbooks/deploy-stack.yml
```

**Option C: Use Secrets File**
```bash
# Create .secrets.yml (add to .gitignore!)
echo "postgres_password: $(openssl rand -hex 32)" > .secrets.yml
chmod 600 .secrets.yml

# Deploy using secrets file
ansible-playbook -i inventory.yml playbooks/deploy-stack.yml \
  --extra-vars "@.secrets.yml"
```

### Step 5.5: Initialize Database and Run Migrations

After deploying the stack, initialize the database:

```bash
# Connect to the deployed PostgreSQL container (interactive)
docker exec -it $(docker ps -q -f name=lenr-sim_postgres) psql -U lenr_app -d lenr_sim

# Or run migrations via backend service (non-interactive, for scripts/CI)
docker exec -i $(docker ps -q -f name=lenr-sim_backend) python -m alembic upgrade head

# Verify schema exists (non-interactive)
docker exec -i $(docker ps -q -f name=lenr-sim_postgres) psql -U lenr_app -d lenr_sim -c "\dt"

# Check backend connectivity
docker service logs lenr-sim_backend --tail 50

# Re-run health check
curl https://api.conscious.energy/api/health
```

### Step 6: Verify Deployment

```bash
# SSH to server
ssh -i ~/.ssh/lenr-sim-deploy root@YOUR_VPS_IP

# Check services
docker stack services lenr-sim

# View logs
docker service logs lenr-sim_backend -f

# Test API health
curl https://api.conscious.energy/api/health
```

---

## DNS Configuration

Terraform automatically creates these DNS records:

| Record | Type | Value | Purpose |
|--------|------|-------|---------|
| `@` | CNAME | `lenr-sim-prod.pages.dev` | Frontend |
| `api` | A | `<VPS_IP>` | Backend API |
| `www` | CNAME | `@` | WWW redirect |

---

## SSL Certificates

Traefik automatically obtains Let's Encrypt certificates for:
- `api.conscious.energy` (Backend)

Cloudflare handles SSL for:
- `conscious.energy` (Frontend)
- `www.conscious.energy` (Frontend)

---

## Monitoring & Maintenance

### View Logs

```bash
# Backend logs
docker service logs lenr-sim_backend -f

# Traefik logs
docker service logs lenr-sim_traefik -f

# PostgreSQL logs
docker service logs lenr-sim_postgres -f
```

### Database Backup

**Automatic Daily Backups**

Automatic daily backups are configured via cron job at 3 AM:

- **Schedule:** Cron job: `0 3 * * * /opt/lenr-sim/backup.sh >> /opt/lenr-sim/logs/backup.log 2>&1`
- **Location:** `/opt/lenr-sim/backups/`
- **Naming:** `lenr_sim_YYYYMMDD_HHMMSS.sql.gz`
- **Retention:** 7 days (older backups automatically deleted)
- **Permissions:** Backup files: `0600` (owner read/write only)
- **Backup Directory:** `0700` (owner access only)

**Manual Backup:**
```bash
# Run backup script
/opt/lenr-sim/backup.sh

# View recent backups
ls -lah /opt/lenr-sim/backups/ | tail -10

# Check backup log
tail -f /opt/lenr-sim/logs/backup.log
```

**Backup Script Details:**

The backup script (`/opt/lenr-sim/backup.sh`):
1. Creates backup directory if missing (`mkdir -p`)
2. Finds PostgreSQL container by exact name
3. Runs `pg_dump` with error checking (`set -euo pipefail`)
4. Compresses output with `gzip`
5. Writes to temporary file first, then moves to final location on success
6. Cleans up backups older than 7 days
7. Sets secure permissions (`0600`) on backup files

**Restore from Backup:**

```bash
# List available backups
ls -lah /opt/lenr-sim/backups/

# Restore a specific backup (replace TIMESTAMP with actual timestamp)
BACKUP_FILE="/opt/lenr-sim/backups/lenr_sim_20260118_030000.sql.gz"
CONTAINER=$(docker ps -q -f name=lenr-sim_postgres)

# Stop the backend service temporarily (optional, for safety)
docker service scale lenr-sim_backend=0

# Restore the backup
gunzip < "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U lenr_app -d lenr_sim

# Restart backend service
docker service scale lenr-sim_backend=2

# Verify restore
docker exec -it "$CONTAINER" psql -U lenr_app -d lenr_sim -c "\dt"
```

### Scaling

```bash
# Scale backend replicas
docker service scale lenr-sim_backend=4
```

### Update Deployment

```bash
# Pull latest code
cd /opt/lenr-sim

# Rebuild and redeploy
docker stack deploy -c docker-stack.yml lenr-sim
```

---

## Troubleshooting

### Common Issues

1. **SSL Certificate Issues**
   ```bash
   # Check Traefik logs
   docker service logs lenr-sim_traefik 2>&1 | grep -i acme
   
   # Ensure port 80 is open for HTTP challenge
   ufw status
   ```

2. **Database Connection Failed**
   ```bash
   # Check PostgreSQL is running
   docker service ps lenr-sim_postgres
   
   # Verify network
   docker network inspect lenr-sim-network
   ```

3. **API Not Responding**
   ```bash
   # Check backend health
   docker service ps lenr-sim_backend
   
   # View detailed logs
   docker service logs lenr-sim_backend --tail 100
   ```

### Rollback

```bash
# Rollback to previous version
docker service rollback lenr-sim_backend
```

---

## Cost Summary

| Service | Provider | Monthly Cost |
|---------|----------|--------------|
| Frontend Hosting | Cloudflare Pages | Free |
| R2 Storage | Cloudflare R2 | ~$0.50 |
| VPS (KVM 2) | Hostinger | $6.99 |
| Domain | Existing | - |
| SSL | Let's Encrypt | Free |
| **Total** | | **~$7.50/mo** |

---

## Security Checklist

- [ ] SSH key authentication only (password disabled)
- [ ] UFW firewall enabled (ports 22, 80, 443 only)
- [ ] Fail2ban configured for SSH protection
- [ ] PostgreSQL password stored as Docker secret
- [ ] Traefik rate limiting enabled
- [ ] CORS properly configured
- [ ] Regular backups scheduled
- [ ] HTTPS enforced everywhere

---

## WordPress Integration

See [WORDPRESS_INTEGRATION.md](WORDPRESS_INTEGRATION.md) for embedding the app in WordPress.

---

## Support

For deployment issues, contact: diadon@conscious.energy

---

**Document maintained by:** LENR Simulation Platform Development Team
