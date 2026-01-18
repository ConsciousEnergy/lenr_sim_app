# LENR Simulation App - Deployment Quick Reference

**Version:** 0.2.1-beta  
**Last Updated:** January 2026

---

## One-Command Deployment

```bash
cd LENR_SIM_APP_v2/infrastructure/scripts
./deploy.sh production
```

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
# Generate password
export POSTGRES_PASSWORD=$(openssl rand -base64 32)

# Deploy
ansible-playbook -i inventory.yml playbooks/deploy-stack.yml \
  -e "postgres_password=$POSTGRES_PASSWORD"
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
