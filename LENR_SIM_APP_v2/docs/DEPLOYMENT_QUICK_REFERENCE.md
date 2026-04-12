# LENR Simulation App - Deployment Quick Reference

**Version:** 0.3.6-beta  
**Last Updated:** March 2026

---

## One-Command Deployment

```bash
cd LENR_SIM_APP_v2/infrastructure/scripts
./deploy.sh production
```

---

## Local Development Routing

```bash
# Frontend (local dev server)
http://localhost:3000

# Backend API (docker compose host mapping)
http://localhost:8010/api/health
http://localhost:8010/api/docs
```

- Frontend is local in development (`npm start`), not served from Hostinger.
- Hostinger/Cloudflare is for production static frontend + public API.

---

## Step-by-Step Commands

### 1. Prerequisites Setup

```bash
# Install tools
brew install terraform ansible  # macOS
# OR
choco install terraform ansible  # Windows

# Generate SSH key
ssh-keygen -t ed25519 -C "lenr-sim-deploy" -f ~/.ssh/lenr-sim-deploy
# Note: You will be prompted for a passphrase. Choose a strong passphrase to protect your private key.
# To create a key without a passphrase (less secure, not recommended), use: ssh-keygen -t ed25519 -C "lenr-sim-deploy" -f ~/.ssh/lenr-sim-deploy -N ""
```

### 2. Configure Variables

```bash
cd LENR_SIM_APP_v2/infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your credentials

cd ../ansible
cp inventory.yml.example inventory.yml
# Will be updated automatically by deploy.sh
```

### 3. Provision & Deploy

```bash
cd ../scripts
./deploy.sh production
```

---

## Manual Deployment (Step-by-Step)

### Step 1: Terraform Provisioning

```bash
cd infrastructure/terraform
terraform init
terraform plan -out=tfplan
terraform apply tfplan

# Note VPS IP
terraform output vps_ip
```

### Step 2: Ansible Configuration

```bash
cd ../ansible

# Update inventory with VPS IP
# Edit inventory.yml: ansible_host: <VPS_IP>

# Test connection
ansible all -i inventory.yml -m ping

# Setup Docker
ansible-playbook -i inventory.yml playbooks/setup-docker.yml
```

### Step 3: Deploy Stack

```bash
# Generate password and export (required for playbook)
export POSTGRES_PASSWORD=$(openssl rand -hex 32)
# Note: PostgreSQL accepts 64-character hex passwords (openssl rand -hex 32)

# Optional: Create backup file for password recovery (add to .gitignore!)
# This is a backup only - the playbook reads from environment, not this file
echo "POSTGRES_PASSWORD='$POSTGRES_PASSWORD'" > .secrets.env
chmod 600 .secrets.env
# ⚠️ IMPORTANT: 
# - Save this password to a password manager or secure vault
# - Move .secrets.env to a secure location outside the repo after deployment
# - Delete .secrets.env from the repo directory after securely storing the password
# - Add .secrets.env to .gitignore to prevent accidental commits
# - Losing this value prevents future database access and recovery

# Deploy using environment variable (not visible in process list)
ansible-playbook -i inventory.yml playbooks/deploy-stack.yml
# The playbook reads POSTGRES_PASSWORD from environment variable
```

### Step 4: Verify

```bash
# Wait 2-5 minutes for SSL
curl https://api.conscious.energy/api/health
```

---

## Common Operations

### View Service Status

```bash
ssh -i ~/.ssh/lenr-sim-deploy root@VPS_IP
docker stack services lenr-sim
```

### View Logs

```bash
docker service logs lenr-sim_backend -f
docker service logs lenr-sim_traefik -f
```

### Scale Services

```bash
docker service scale lenr-sim_backend=4
```

### Rollback

```bash
docker service rollback lenr-sim_backend
```

### Database Backup

```bash
cd infrastructure/scripts
./backup-db.sh production
```

---

## Troubleshooting Quick Fixes

| Issue | Solution |
|-------|----------|
| Services not starting | Check logs: `docker service logs lenr-sim_backend` |
| SSL certificate not issued | Wait 5 minutes, check Traefik logs |
| API not responding | Verify health: `curl https://api.conscious.energy/api/health` |
| Can't SSH to server | Check firewall, verify IP in inventory.yml |
| Terraform apply fails | Check API tokens, verify variables |

---

## File Locations

| File | Path |
|------|------|
| Terraform config | `infrastructure/terraform/terraform.tfvars` |
| Ansible inventory | `infrastructure/ansible/inventory.yml` |
| Docker stack | `infrastructure/ansible/templates/docker-stack.yml.j2` |
| Deployment scripts | `infrastructure/scripts/` |
| Backups | `infrastructure/backups/` |

---

## Support

For deployment issues: diadon@conscious.energy

---

**Quick Reference maintained by:** LENR Simulation Platform Development Team
