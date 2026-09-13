# Infrastructure Setup Guide

**Quick Start:** See [README.md](README.md) for overview

> **v0.3.7-beta:** public beta uses **VPS Compose + Caddy** ([`vps/`](vps/)).  
> Terraform / Ansible / Swarm / Pages steps below are **v0.3.8-beta cutover prep only**.  
> Do **not** `terraform apply` or run Swarm `scripts/deploy.sh` against production in 0.3.7  
> (`deploy.sh` requires `CONFIRM_SWARM_0_3_8=I_CUTOVER_0_3_8`).  
> Prep checklist: [`../docs/v0.3.8-beta/SWARM_PAGES_CUTOVER_PREP.md`](../docs/v0.3.8-beta/SWARM_PAGES_CUTOVER_PREP.md).

---

## Initial Setup

### 1. Install Ansible Collections

```bash
cd infrastructure/ansible
ansible-galaxy collection install -r requirements.yml
```

This installs:
- `community.docker` - For Docker network and service management
- `ansible.posix` - For sysctl configuration

### 2. Configure Terraform

```bash
cd ../terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your credentials
```

**⚠️ SECURITY WARNING:** The `terraform.tfvars` file contains sensitive credentials (API tokens, SSH keys). 
- **NEVER commit this file to version control**
- **Verify** that `terraform.tfvars` is listed in `.gitignore`
- **Protect** this file with appropriate file permissions (`chmod 600 terraform.tfvars`)

### 3. Configure Ansible

```bash
cd ../ansible
cp inventory.yml.example inventory.yml
# Will be auto-updated by deploy.sh with VPS IP
```

---

## Deployment

### Automated (v0.3.8 Swarm/Pages only — gated)

```bash
cd infrastructure/scripts
chmod +x *.sh
# Hard-gated; do not run during v0.3.7 VPS beta without an explicit 0.3.8 cutover window:
CONFIRM_SWARM_0_3_8=I_CUTOVER_0_3_8 ./deploy.sh production
```

### Manual

See [DEPLOYMENT.md](../docs/DEPLOYMENT.md) for step-by-step instructions.

---

## Troubleshooting

See [TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md) for common issues.

---

**Quick Reference:** [DEPLOYMENT_QUICK_REFERENCE.md](../docs/DEPLOYMENT_QUICK_REFERENCE.md)
