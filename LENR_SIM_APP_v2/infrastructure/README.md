# LENR Simulation App - Infrastructure as Code

**Version:** 0.3.7-beta
**Last Updated:** September 2026

---

## Public beta (use this) — v0.3.7-beta

Same-origin Docker Compose on the Hostinger VPS:

- **Docs:** [`vps/README.md`](vps/README.md)
- **Merge train to `main` before VPS rebase:** [`../docs/v0.3.7-beta/MERGE_TRAIN_VPS.md`](../docs/v0.3.7-beta/MERGE_TRAIN_VPS.md)
- **Stack:** Caddy (Let's Encrypt) → nginx SPA + FastAPI + Postgres 16
- **Host:** `https://lenr-simp-app.conscious.energy` (intended); live A record `https://lenr-sim-beta.conscious.energy`

```
infrastructure/vps/
├── docker-compose.prod.yml
├── Caddyfile
├── .env.production.example
└── scripts/{bootstrap-host,deploy,check-merge-train,verify-beta-share,rollback,backup-db,hydrate-demo}.sh
```

## Alternative: Terraform + Ansible + Swarm — **v0.3.8-beta**

The rest of this directory provisions Cloudflare Pages + a Docker Swarm API
(`api.conscious.energy`). That path is **not** what v0.3.7-beta ships.

- **Do not** `terraform apply` while WordPress.com owns `conscious.energy` / `www`.
- **Prep checklist (no apply):** [`../docs/v0.3.8-beta/SWARM_PAGES_CUTOVER_PREP.md`](../docs/v0.3.8-beta/SWARM_PAGES_CUTOVER_PREP.md)
- Earliest live cutover target: **v0.3.8-beta**, after the science stack and VPS tip are on `main`.


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

## Quick Start (v0.3.8-beta Swarm/Pages only)

> **v0.3.7-beta stop here.** Public beta runs on **VPS Compose + Caddy**
> (`vps/`). Do **not** run the Terraform/Ansible steps below against
> production during 0.3.7. Prep checklist (no apply):
> [`../docs/v0.3.8-beta/SWARM_PAGES_CUTOVER_PREP.md`](../docs/v0.3.8-beta/SWARM_PAGES_CUTOVER_PREP.md).

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

### 3. Provision Infrastructure (**0.3.8+ only — no apply in 0.3.7**)

```bash
terraform init
terraform plan -out=tfplan
# terraform apply tfplan   # intentionally commented for 0.3.7
```

### 4. Configure Server (**0.3.8+ only**)

```bash
cd ../ansible
cp inventory.yml.example inventory.yml
# Update inventory.yml with VPS IP from Terraform output

# ansible-playbook -i inventory.yml playbooks/setup-docker.yml  # no prod apply in 0.3.7
```

### 5. Deploy Application (**0.3.8+ only**)

```bash
# Generate PostgreSQL password and store securely
export POSTGRES_PASSWORD=$(openssl rand -hex 32)
echo "POSTGRES_PASSWORD='$POSTGRES_PASSWORD'" > .secrets.env
chmod 600 .secrets.env
# ⚠️ IMPORTANT: Save this password securely! Losing it prevents database access.

# ansible-playbook -i inventory.yml playbooks/deploy-stack.yml  # no prod apply in 0.3.7
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
