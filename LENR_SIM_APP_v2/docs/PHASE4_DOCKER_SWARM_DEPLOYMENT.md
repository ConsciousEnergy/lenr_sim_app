# Phase 4: Docker Swarm Deployment Guide (v0.3.5-beta)

**Version:** 0.3.5-beta  
**Last Updated:** February 2026  
**Target:** Production deployment on Hostinger VPS with Docker Swarm

---

## Overview

This guide provides **detailed, step-by-step instructions** for deploying the LENR Simulation App to production using Infrastructure as Code (IaC). The deployment uses:

- **Terraform** - Provisions Cloudflare (Pages, R2, DNS) and Hostinger VPS
- **Ansible** - Configures server (Docker, Swarm) and deploys application stack
- **Docker Swarm** - Orchestrates containers (Traefik, FastAPI, PostgreSQL)

**Estimated Time:** 2-3 hours (first deployment)  
**Cost:** ~$7.50/month

---

## Prerequisites Checklist

Before starting, ensure you have completed all prerequisites:

### 1. Accounts and Credentials

- [ ] **Cloudflare Account**
  - Domain added (e.g., `conscious.energy`)
  - API Token created with permissions:
    - `Zone:DNS:Edit`
    - `Zone:Zone:Read`
    - `Account:Cloudflare Pages:Edit`
    - `Account:R2:Edit`
  - **Account ID** (found in Dashboard → Right sidebar on Account Home)
  - **Zone ID** (found in Dashboard → Select domain → Overview → Right sidebar)

- [ ] **Hostinger Account**
  - Account created at hostinger.com
  - VPS plan selected (recommended: **KVM 2** - $6.99/month)
  - API Token generated from https://www.hostinger.com/my-account/api
  - VPS API access enabled

### 2. Local Development Machine Setup

- [ ] **Terraform** >= 1.5.0 installed
  ```bash
  # macOS
  brew install terraform
  
  # Windows (PowerShell as Admin)
  choco install terraform
  
  # Linux (Ubuntu/Debian)
  sudo apt-get update && sudo apt-get install terraform
  
  # Verify
  terraform version
  ```

- [ ] **Ansible** >= 2.15 installed
  ```bash
  # macOS/Linux
  pip install ansible
  
  # Windows (WSL recommended)
  pip install ansible
  
  # Verify
  ansible --version
  ```

- [ ] **SSH Key Pair** generated
  ```bash
  # Generate deployment key
  ssh-keygen -t ed25519 -C "lenr-sim-deploy" -f ~/.ssh/lenr-sim-deploy
  
  # You will be prompted for a passphrase - choose a strong one!
  # To view public key (needed for Terraform):
  cat ~/.ssh/lenr-sim-deploy.pub
  ```

- [ ] **Git** installed and repository cloned
  ```bash
  git clone https://github.com/ConsciousEnergy/lenr_sim_app.git
  cd lenr_sim_app
  git checkout lenr_sim_app_v0.3.5-beta
  ```

### 3. Required Information

Before proceeding, gather:

- [ ] Cloudflare API Token
- [ ] Cloudflare Account ID
- [ ] Cloudflare Zone ID
- [ ] Hostinger API Token
- [ ] SSH Public Key (`~/.ssh/lenr-sim-deploy.pub`)
- [ ] Domain name (e.g., `conscious.energy`)
- [ ] Email for Let's Encrypt SSL (e.g., `admin@conscious.energy`)

---

## Step-by-Step Deployment

### Step 1: Configure Terraform Variables

**Location:** `LENR_SIM_APP_v2/infrastructure/terraform/`

```bash
cd LENR_SIM_APP_v2/infrastructure/terraform

# Copy example variables file
cp terraform.tfvars.example terraform.tfvars

# Edit with your actual values
# Use nano, vim, or your preferred editor
nano terraform.tfvars
```

**Required Variables in `terraform.tfvars`:**

```hcl
# Environment
environment = "prod"

# Domain
domain = "conscious.energy"  # Your actual domain

# Cloudflare Configuration
cloudflare_api_token  = "YOUR_CLOUDFLARE_API_TOKEN"
cloudflare_account_id = "YOUR_CLOUDFLARE_ACCOUNT_ID"
cloudflare_zone_id    = "YOUR_CLOUDFLARE_ZONE_ID"

# Hostinger Configuration
hostinger_api_token   = "YOUR_HOSTINGER_API_TOKEN"
ssh_public_key        = "ssh-ed25519 AAAA... your-public-key"  # From cat ~/.ssh/lenr-sim-deploy.pub
vps_plan              = "hostingercom-vps-kvm2-usd-1m"  # KVM 2 plan
data_center_id        = 1  # 1=North America, 2=Europe, 3=Asia

# Optional: GitHub for Cloudflare Pages
github_owner = "ConsciousEnergy"
github_repo  = "lenr_sim_app"
```

**⚠️ SECURITY WARNING:**
- `terraform.tfvars` contains sensitive credentials
- **NEVER commit this file to version control**
- Verify `terraform.tfvars` is in `.gitignore`
- Protect with `chmod 600 terraform.tfvars`

**Verify `.gitignore` includes:**
```bash
grep terraform.tfvars .gitignore
# Should show: terraform.tfvars
```

---

### Step 2: Initialize and Plan Terraform

```bash
# Still in infrastructure/terraform directory

# Initialize Terraform (downloads providers)
terraform init

# Preview what will be created (REVIEW CAREFULLY!)
terraform plan -out=tfplan

# Review the plan output:
# - Cloudflare Pages project
# - Cloudflare DNS records
# - Cloudflare R2 bucket (optional)
# - Hostinger VPS instance
```

**Expected Output:**
```
Plan: 5 to add, 0 to change, 0 to destroy.
```

**Review the plan for:**
- Correct domain name
- Correct VPS plan
- Correct data center location
- Cloudflare resources match your expectations

---

### Step 3: Apply Terraform Infrastructure

```bash
# Apply the plan (creates actual resources)
terraform apply tfplan

# This will:
# 1. Create Cloudflare Pages project
# 2. Create DNS records
# 3. Create R2 bucket (if configured)
# 4. Provision Hostinger VPS
# 5. Wait for VPS to be ready (2-5 minutes)
```

**⚠️ IMPORTANT:** This creates **real infrastructure** and may incur costs:
- Cloudflare Pages: Free
- Cloudflare R2: ~$0.50/month (if used)
- Hostinger VPS: $6.99/month (billed immediately)

**After apply completes, note the outputs:**
```bash
terraform output

# Expected outputs:
# vps_ip = "123.456.789.xxx"
# frontend_url = "https://lenr-sim-prod.pages.dev"
# api_url = "https://api.conscious.energy"
```

**Save the VPS IP** - you'll need it for Ansible configuration.

---

### Step 4: Test SSH Connection to VPS

```bash
# Test SSH connection (replace with your VPS IP)
ssh -i ~/.ssh/lenr-sim-deploy root@$(terraform output -raw vps_ip)

# If connection succeeds, you'll see:
# Welcome to Ubuntu 24.04 LTS...
# 
# Type 'exit' to disconnect
exit
```

**Troubleshooting SSH Issues:**
- If connection refused: Wait 2-3 minutes for VPS to finish booting
- If key denied: Verify SSH key was added correctly in Terraform
- If timeout: Check firewall rules, verify VPS is running

---

### Step 5: Configure Ansible Inventory

**Location:** `LENR_SIM_APP_v2/infrastructure/ansible/`

```bash
cd ../ansible

# Copy example inventory
cp inventory.yml.example inventory.yml

# Edit inventory with VPS IP from Terraform
nano inventory.yml
```

**Update `inventory.yml`:**

```yaml
all:
  hosts:
    lenr-sim-prod:
      ansible_host: 123.456.789.xxx  # Replace with terraform output vps_ip
      ansible_user: root
      ansible_ssh_private_key_file: ~/.ssh/lenr-sim-deploy
      ansible_ssh_common_args: '-o StrictHostKeyChecking=no'  # Only for first connection
```

**⚠️ SECURITY:** Remove `StrictHostKeyChecking=no` after first successful connection.

---

### Step 6: Test Ansible Connection

```bash
# Test Ansible can connect to server
ansible all -i inventory.yml -m ping

# Expected output:
# lenr-sim-prod | SUCCESS => {
#     "changed": false,
#     "ping": "pong"
# }
```

**If ping fails:**
- Verify SSH key path is correct
- Check VPS IP is correct
- Ensure VPS is running and accessible
- Try SSH manually first: `ssh -i ~/.ssh/lenr-sim-deploy root@VPS_IP`

---

### Step 7: Install Ansible Collections

```bash
# Install required Ansible collections
ansible-galaxy collection install -r requirements.yml

# This installs:
# - community.docker (for Docker network/service management)
# - ansible.posix (for sysctl configuration)
```

---

### Step 8: Setup Docker with Ansible

```bash
# Run Docker setup playbook
ansible-playbook -i inventory.yml playbooks/setup-docker.yml

# This playbook:
# 1. Waits for post-install script completion
# 2. Installs Docker CE and Docker Compose plugin
# 3. Initializes Docker Swarm mode
# 4. Configures Docker daemon settings
# 5. Creates application directories
# 6. Sets up Docker overlay network
```

**Expected Output:**
```
PLAY [Setup Docker and Docker Swarm] **********************

TASK [Wait for post-install script] **********************
ok: [lenr-sim-prod]

TASK [Install Docker] ***********************************
changed: [lenr-sim-prod]

TASK [Initialize Docker Swarm] **************************
changed: [lenr-sim-prod]

PLAY RECAP **********************************************
lenr-sim-prod : ok=10   changed=5    unreachable=0    failed=0
```

**Verify Docker Installation:**
```bash
# SSH to server
ssh -i ~/.ssh/lenr-sim-deploy root@$(terraform output -raw vps_ip)

# Check Docker version
docker --version
# Expected: Docker version 24.x.x or newer

# Check Docker Swarm
docker swarm join-token worker
# Should show join token (proves Swarm is active)

# Check Docker network
docker network ls
# Should show: lenr-sim-network

exit
```

---

### Step 9: Generate and Store Database Password

**⚠️ CRITICAL:** Save this password securely - losing it prevents database access!

```bash
# Generate secure 64-character hex password
export POSTGRES_PASSWORD=$(openssl rand -hex 32)

# Display password (save it securely!)
echo "PostgreSQL Password: $POSTGRES_PASSWORD"

# Save to password manager or secure file
# Option 1: Copy to password manager
# Option 2: Save to encrypted file (add to .gitignore!)
echo "POSTGRES_PASSWORD='$POSTGRES_PASSWORD'" > .secrets.env
chmod 600 .secrets.env

# Verify it's in .gitignore
grep .secrets.env .gitignore || echo ".secrets.env" >> .gitignore
```

**⚠️ IMPORTANT:**
- This password is **required** for database access
- Store it in a **password manager** (1Password, LastPass, etc.)
- The `.secrets.env` file is a **backup only** - keep it secure
- **Never commit** `.secrets.env` to version control

---

### Step 10: Build and Push Docker Image

**Option A: Use GitHub Actions (Recommended)**

The repository includes `.github/workflows/deploy.yml` which automatically builds and pushes Docker images to GitHub Container Registry (GHCR) when you push to the repository.

**Verify the workflow exists:**
```bash
cat .github/workflows/deploy.yml
```

**Trigger build:**
```bash
# Push to repository (triggers GitHub Actions)
git push origin lenr_sim_app_v0.3.5-beta

# Check GitHub Actions: https://github.com/ConsciousEnergy/lenr_sim_app/actions
# Wait for "Build and Push Docker Image" workflow to complete
```

**Option B: Manual Build (Alternative)**

```bash
cd LENR_SIM_APP_v2

# Build image
docker build -t ghcr.io/consciousenergy/lenr-sim-backend:latest \
  -f infrastructure/docker/Dockerfile.backend .

# Login to GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Push image
docker push ghcr.io/consciousenergy/lenr-sim-backend:latest
```

**Verify Image is Available:**
```bash
# Check GHCR (requires authentication)
# Visit: https://github.com/ConsciousEnergy/lenr_sim_app/pkgs/container/lenr-sim-backend
```

---

### Step 11: Deploy Application Stack

**Location:** `LENR_SIM_APP_v2/infrastructure/ansible/`

**⚠️ SECURITY:** Never pass secrets via command-line arguments!

**Option A: Use Environment Variable (Recommended)**

```bash
# Ensure POSTGRES_PASSWORD is exported (from Step 9)
echo $POSTGRES_PASSWORD
# Should show the password

# Deploy stack (password read from environment)
ansible-playbook -i inventory.yml playbooks/deploy-stack.yml
```

**Option B: Use Ansible Vault (More Secure for Production)**

```bash
# Create encrypted vault file
ansible-vault create group_vars/vault.yml

# Add to vault file:
# postgres_password: your-generated-password-here

# Deploy with vault
ansible-playbook -i inventory.yml playbooks/deploy-stack.yml \
  --ask-vault-pass
```

**Option C: Use Secrets File**

```bash
# Create secrets file (add to .gitignore!)
cat > .secrets.yml <<EOF
postgres_password: $(openssl rand -hex 32)
EOF
chmod 600 .secrets.yml

# Deploy using secrets file
ansible-playbook -i inventory.yml playbooks/deploy-stack.yml \
  --extra-vars "@.secrets.yml"
```

**Expected Output:**
```
PLAY [Deploy LENR Simulation App Stack] ****************

TASK [Create Docker secrets] **************************
changed: [lenr-sim-prod]

TASK [Deploy Docker stack] ****************************
changed: [lenr-sim-prod]

PLAY RECAP ********************************************
lenr-sim-prod : ok=8   changed=4    unreachable=0    failed=0
```

---

### Step 12: Verify Stack Deployment

```bash
# SSH to server
ssh -i ~/.ssh/lenr-sim-deploy root@$(terraform output -raw vps_ip)

# View all services
docker stack services lenr-sim

# Expected output:
# ID      NAME                MODE        REPLICAS   IMAGE
# xxx     lenr-sim_traefik    replicated  1/1        traefik:v3.0
# xxx     lenr-sim_backend    replicated  2/2        ghcr.io/.../lenr-sim-backend:latest
# xxx     lenr-sim_postgres   replicated  1/1        postgres:16-alpine

# Check service logs
docker service logs lenr-sim_backend --tail 50
docker service logs lenr-sim_traefik --tail 50

# Verify all replicas are running (should show 1/1 or 2/2)
docker service ps lenr-sim_backend
docker service ps lenr-sim_traefik
docker service ps lenr-sim_postgres

exit
```

**Troubleshooting:**
- If services show `0/1` or `0/2`: Check logs for errors
- If backend fails: Verify Docker image exists in GHCR
- If Traefik fails: Check port 80/443 are not blocked by firewall

---

### Step 13: Initialize Database and Run Migrations

```bash
# SSH to server
ssh -i ~/.ssh/lenr-sim-deploy root@$(terraform output -raw vps_ip)

# Run database migrations (non-interactive, for scripts/CI)
docker exec -i $(docker ps -q -f name=lenr-sim_backend) \
  python -m alembic upgrade head

# Verify schema exists
docker exec -i $(docker ps -q -f name=lenr-sim_postgres) \
  psql -U lenr_app -d lenr_sim -c "\dt"

# Expected output: List of tables (simulations, shared_simulations, etc.)

# Check backend connectivity
docker service logs lenr-sim_backend --tail 50 | grep -i "database\|connected\|error"

exit
```

---

### Step 14: Wait for SSL Certificate

**Let's Encrypt SSL certificates take 2-5 minutes to provision.**

```bash
# Wait 2-5 minutes, then check certificate
curl -vI https://api.conscious.energy 2>&1 | grep -A 5 "Server certificate"

# Expected output:
# Server certificate:
#   subject: CN=api.conscious.energy
#   issuer: C=US; O=Let's Encrypt; CN=R3
#   SSL certificate verify ok.
```

**If certificate not ready:**
- Wait another 2-3 minutes
- Check Traefik logs: `docker service logs lenr-sim_traefik --tail 100`
- Look for ACME challenge errors

---

### Step 15: Verify Deployment

**Health Check:**
```bash
# API health endpoint
curl https://api.conscious.energy/api/health

# Expected response:
# {"status": "healthy", "version": "0.2.1-beta"}
```

**Swagger Documentation:**
```bash
# Check Swagger docs are accessible
curl -I https://api.conscious.energy/api/docs

# Expected: HTTP/2 200
```

**Frontend:**
```bash
# Check frontend loads
curl -I https://conscious.energy

# Expected: HTTP/2 200
```

**Full Verification Checklist:**
- [ ] SSL certificate valid (HTTPS works)
- [ ] API health endpoint returns 200
- [ ] Swagger docs accessible
- [ ] Frontend loads correctly
- [ ] Frontend can connect to API
- [ ] Database migrations completed
- [ ] All services running (2/2 backend replicas)

---

### Step 16: Configure Daily Database Backups

**The deployment playbook creates a backup script, but you need to configure the cron job:**

```bash
# SSH to server
ssh -i ~/.ssh/lenr-sim-deploy root@$(terraform output -raw vps_ip)

# Verify backup script exists
ls -la /opt/lenr-sim/backup.sh

# Test backup script manually
/opt/lenr-sim/backup.sh

# Verify backup was created
ls -lh /opt/lenr-sim/backups/

# Configure daily backup at 2 AM
crontab -e

# Add this line:
# 0 2 * * * /opt/lenr-sim/backup.sh >> /opt/lenr-sim/logs/backup.log 2>&1

# Verify cron job
crontab -l

exit
```

**Backup Details:**
- **Location:** `/opt/lenr-sim/backups/`
- **Naming:** `lenr_sim_production_YYYYMMDD_HHMMSS.sql.gz`
- **Retention:** 7 days (old backups auto-deleted)
- **Schedule:** Daily at 2 AM (configurable)

---

## Post-Deployment Tasks

### 1. Update DNS Records (if needed)

If Cloudflare DNS wasn't automatically configured:

```bash
# Check DNS records
terraform output

# Manually add DNS records in Cloudflare Dashboard:
# - A record: api.conscious.energy -> VPS_IP
# - CNAME record: conscious.energy -> lenr-sim-prod.pages.dev
```

### 2. Configure WordPress Integration

See `docs/WORDPRESS_INTEGRATION.md` for detailed instructions.

**Quick Setup:**
```html
<!-- Add to WordPress page -->
<iframe 
  src="https://conscious.energy" 
  style="width:100%; height:900px; border:none;"
  title="LENR Simulation Platform"
  allowfullscreen>
</iframe>
```

### 3. Monitor Services

```bash
# View real-time logs
docker service logs -f lenr-sim_backend
docker service logs -f lenr-sim_traefik

# Check service status
docker stack services lenr-sim

# View resource usage
docker stats
```

### 4. Scale Services (if needed)

```bash
# Scale backend to 4 replicas
docker service scale lenr-sim_backend=4

# Verify scaling
docker service ps lenr-sim_backend
```

---

## Troubleshooting

### Common Issues

**1. Terraform Apply Fails**
- Verify API tokens are correct
- Check account/zone IDs match your Cloudflare account
- Ensure VPS plan is available in selected data center

**2. Ansible Connection Fails**
- Verify SSH key is correct: `cat ~/.ssh/lenr-sim-deploy.pub`
- Check VPS is running: `terraform output vps_ip`
- Test SSH manually: `ssh -i ~/.ssh/lenr-sim-deploy root@VPS_IP`

**3. Docker Swarm Init Fails**
- Check VPS has sufficient resources (2GB RAM minimum)
- Verify Docker installed: `docker --version`
- Check firewall allows Docker ports

**4. Services Not Starting**
- Check logs: `docker service logs lenr-sim_backend`
- Verify Docker image exists: `docker images`
- Check secrets created: `docker secret ls`

**5. SSL Certificate Not Issued**
- Wait 5-10 minutes for Let's Encrypt
- Check Traefik logs: `docker service logs lenr-sim_traefik`
- Verify DNS records point to VPS IP
- Check firewall allows port 80 (HTTP-01 challenge)

**6. Database Connection Errors**
- Verify password is correct
- Check PostgreSQL container is running: `docker ps | grep postgres`
- Verify secrets: `docker secret ls`
- Check backend logs for connection errors

### Getting Help

- **Documentation:** See `docs/TROUBLESHOOTING.md`
- **Logs:** Check service logs with `docker service logs`
- **Support:** Open issue on GitHub

---

## Rollback Procedures

### Rollback Application Version

```bash
# Rollback backend service to previous version
docker service rollback lenr-sim_backend

# Verify rollback
docker service ps lenr-sim_backend
```

### Rollback Infrastructure (⚠️ DESTRUCTIVE)

```bash
# ⚠️ WARNING: This destroys all infrastructure!
# Backup database and state first!

cd infrastructure/terraform

# Destroy infrastructure
terraform plan -destroy -out=destroy.tfplan
terraform apply destroy.tfplan
```

**Before destroying:**
1. Export database: `docker exec ... pg_dump ... > backup.sql`
2. Backup Terraform state: `cp terraform.tfstate terraform.tfstate.backup`
3. Document all configuration values

---

## Cost Summary

| Component | Provider | Monthly Cost |
|-----------|----------|--------------|
| Frontend Hosting | Cloudflare Pages | $0 |
| CDN | Cloudflare | $0 |
| R2 Storage | Cloudflare | ~$0.50 (if used) |
| VPS (KVM 2) | Hostinger | $6.99 |
| SSL Certificate | Let's Encrypt | $0 |
| **Total** | | **~$7.50/mo** |

---

## Next Steps

After successful deployment:

1. **Monitor** services for 24-48 hours
2. **Test** all API endpoints
3. **Verify** backups are working
4. **Document** any custom configurations
5. **Plan** for Phase 5 (Kubernetes migration) when ready

See `docs/ARCHITECTURE.md` for Hybrid migration strategy.

---

**Document maintained by:** LENR Simulation Platform Development Team  
**Contact:** diadon@conscious.energy
