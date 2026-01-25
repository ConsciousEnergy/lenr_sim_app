# LENR Simulation App - Infrastructure as Code

**Version:** 0.2.1-beta  
**Last Updated:** January 2026

---

## Overview

This directory contains all Infrastructure as Code (IaC) configuration for deploying the LENR Simulation App to production. The infrastructure uses:

- **Terraform** - Provisions Cloudflare (Pages, R2, DNS) and Hostinger VPS
- **Ansible** - Configures server (Docker, Swarm) and deploys application stack
- **Docker Swarm** - Orchestrates containers (Traefik, FastAPI, PostgreSQL)

---

## Directory Structure

```
infrastructure/
├── terraform/              # Infrastructure provisioning
│   ├── main.tf            # Root module
│   ├── variables.tf       # Input variables
│   ├── outputs.tf         # Output values
│   ├── terraform.tfvars.example  # Example variables
│   └── modules/
│       ├── cloudflare/    # Cloudflare Pages, R2, DNS
│       └── hostinger/     # Hostinger VPS provisioning
│
├── ansible/               # Server configuration and deployment
│   ├── ansible.cfg        # Ansible configuration
│   ├── inventory.yml.example  # Server inventory
│   ├── group_vars/
│   │   └── all.yml        # Shared variables
│   ├── playbooks/
│   │   ├── site.yml       # Master playbook
│   │   ├── setup-docker.yml    # Docker installation
│   │   ├── deploy-stack.yml    # Application deployment
│   │   └── backup.yml     # Database backup
│   └── templates/
│       ├── docker-stack.yml.j2    # Docker Swarm stack
│       ├── traefik.yml.j2         # Traefik config
│       └── traefik-dynamic.yml.j2 # Traefik dynamic rules
│
├── docker/                # Docker configurations
│   └── Dockerfile.backend # Multi-stage FastAPI build
│
└── scripts/               # Deployment helper scripts
    ├── deploy.sh          # Full deployment script
    ├── rollback.sh        # Rollback script
    └── backup-db.sh       # Database backup script
```

---

## Quick Start

### 1. Prerequisites

Install required tools:
```bash
# Terraform
brew install terraform  # macOS
choco install terraform  # Windows

# Ansible
pip install ansible-core
```

### 2. Configure Variables

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your credentials
```

### 3. Provision Infrastructure

```bash
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

### 4. Configure Server

```bash
cd ../ansible
cp inventory.yml.example inventory.yml
# Update inventory.yml with VPS IP from Terraform output

ansible-playbook -i inventory.yml playbooks/setup-docker.yml
```

### 5. Deploy Application

```bash
# Generate PostgreSQL password and store securely
export POSTGRES_PASSWORD=$(openssl rand -hex 32)
echo "POSTGRES_PASSWORD='$POSTGRES_PASSWORD'" > .secrets.env
chmod 600 .secrets.env
# ⚠️ IMPORTANT: Save this password securely! Losing it prevents database access.

# Deploy stack (password read from environment, not command line)
ansible-playbook -i inventory.yml playbooks/deploy-stack.yml
```

---

## Detailed Documentation

- **[PHASE4_DOCKER_SWARM_DEPLOYMENT.md](../docs/PHASE4_DOCKER_SWARM_DEPLOYMENT.md)** - **📋 Comprehensive step-by-step deployment guide (START HERE)**
- [DEPLOYMENT.md](../docs/DEPLOYMENT.md) - Overview and reference guide
- [DEPLOYMENT_QUICK_REFERENCE.md](../docs/DEPLOYMENT_QUICK_REFERENCE.md) - Quick commands reference
- [DEPLOYMENT_CHECKLIST.md](../docs/DEPLOYMENT_CHECKLIST.md) - Step-by-step verification checklist
- [ARCHITECTURE.md](../docs/ARCHITECTURE.md) - System architecture and Hybrid Kubernetes migration plan
- [WORDPRESS_INTEGRATION.md](../docs/WORDPRESS_INTEGRATION.md) - WordPress integration guide

---

## Cost Summary

| Component | Monthly Cost |
|-----------|--------------|
| Cloudflare Pages | $0 |
| Cloudflare R2 | ~$0.50 |
| Hostinger VPS (KVM 2) | $6.99 |
| SSL (Let's Encrypt) | $0 |
| **Total** | **~$7.50/mo** |

---

**Maintained by:** LENR Simulation Platform Development Team  
**Contact:** diadon@conscious.energy
