# Infrastructure Setup Guide

**Quick Start:** See [README.md](README.md) for overview

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

### Automated (Recommended)

```bash
cd infrastructure/scripts
chmod +x *.sh
./deploy.sh production
```

### Manual

See [DEPLOYMENT.md](../docs/DEPLOYMENT.md) for step-by-step instructions.

---

## Troubleshooting

See [TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md) for common issues.

---

**Quick Reference:** [DEPLOYMENT_QUICK_REFERENCE.md](../docs/DEPLOYMENT_QUICK_REFERENCE.md)
