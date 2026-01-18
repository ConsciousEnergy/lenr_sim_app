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

```bash
# Generate PostgreSQL password (save securely!)
export POSTGRES_PASSWORD=$(openssl rand -base64 32)
echo "Save this password: $POSTGRES_PASSWORD"

# Deploy the stack
ansible-playbook -i inventory.yml playbooks/deploy-stack.yml \
  -e "postgres_password=$POSTGRES_PASSWORD"
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

Automatic daily backups are configured at 3 AM:

```bash
# Manual backup
/opt/lenr-sim/backup.sh

# View backups
ls -la /opt/lenr-sim/backups/
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
