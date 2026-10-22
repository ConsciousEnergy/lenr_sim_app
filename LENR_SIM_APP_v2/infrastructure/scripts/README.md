# LENR Simulation App - Deployment Scripts

**Version:** 0.3.8-beta (staging Swarm dry-run) / 0.3.9-beta (public cutover)  
**Last Updated:** September 2026

> **Stop — public share still uses Compose + Caddy** ([`../vps/`](../vps/)).  
> Staging dry-run (0.3.8): `CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8 ./deploy.sh staging`  
> Production Swarm/Pages cutover (0.3.9): `CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9 ./deploy.sh production`  
> Prep: [`../../docs/v0.3.8-beta/SWARM_PAGES_CUTOVER_PREP.md`](../../docs/v0.3.8-beta/SWARM_PAGES_CUTOVER_PREP.md).

---

## Overview

Helper scripts for the **v0.3.8-beta** Terraform + Ansible + Docker Swarm path.
They are retained for cutover prep; they are not the v0.3.7 public-beta ship path.

---

## Scripts

### swarm-039-* cutover scripts

v0.3.9 public cutover path. Prep/barcode/window-card are read-only; the executor
never sets `CONFIRM_SWARM_0_3_9` (human-armed).

| Script | Role |
|--------|------|
| `swarm-039-cutover-prep.sh` | Read-only prerequisites |
| `swarm-039-readiness-barcode.sh` | Prep + topology + version markers |
| `swarm-039-cutover-window-card.sh` | Operator card: evidence + arming commands |
| `swarm-039-cutover.sh` | Live cutover (confirm + `EXECUTE=1`) |
| `swarm-039-post-cutover-verify.sh` | Post-apply topology/health evidence |
| `swarm-039-restore-compose.sh` | Mid-window abort → Compose restore (+ KVM1 leave) |

See [`../../docs/v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md`](../../docs/v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md).

### unclog-lenr-ci.sh

Recover wedged dedicated runner `2012566` / `45.93.100.251` (Hostinger restart,
SSH key attach, verify `Listening for Jobs`). Never touches Compose share
`1280333`. See [`../../docs/v0.3.7-beta/SELF_HOSTED_RUNNER.md`](../../docs/v0.3.7-beta/SELF_HOSTED_RUNNER.md).

### deploy.sh

Full deployment script that orchestrates Terraform, Ansible, and Docker Swarm.

**Usage:**
```bash
./deploy.sh [production|staging] [--app-only]
```

**Examples:**
```bash
# Full deployment (provision + configure + deploy)
./deploy.sh production

# Update application only (skip Terraform)
./deploy.sh production --app-only
```

**What it does:**
1. Checks prerequisites (Terraform, Ansible installed)
2. Provisions infrastructure with Terraform
3. Configures server with Ansible (Docker setup)
4. Deploys application stack
5. Verifies deployment (health checks, SSL)

---

### rollback.sh

Rollback backend service to previous version.

**Usage:**
```bash
./rollback.sh [production|staging]
```

**What it does:**
1. Prompts for confirmation
2. Rolls back Docker service to previous version
3. Verifies rollback success

**Note:** Only rolls back the backend service. Infrastructure changes require Terraform rollback.

---

### backup-db.sh

Create database backup and clean up old backups.

**Usage:**
```bash
./backup-db.sh [production|staging]
```

**What it does:**
1. Creates compressed PostgreSQL backup
2. Saves to `infrastructure/backups/` directory
3. Removes backups older than 7 days
4. Lists recent backups

**Backup location:** `infrastructure/backups/lenr_sim_{environment}_{timestamp}.sql.gz`

---

## Prerequisites

All scripts require:
- Terraform >= 1.5.0 (for deploy.sh)
- Ansible >= 2.15 (for deploy.sh, rollback.sh, backup-db.sh)
- SSH access to VPS (configured in Ansible inventory)
- Properly configured `terraform.tfvars` and `inventory.yml`

---

## Making Scripts Executable

On Linux/macOS:
```bash
chmod +x infrastructure/scripts/*.sh
```

On Windows (Git Bash or WSL):
```bash
chmod +x infrastructure/scripts/*.sh
```

---

## Troubleshooting

### Script fails with "command not found"

Ensure scripts are executable:
```bash
chmod +x infrastructure/scripts/*.sh
```

### Ansible connection fails

1. Verify SSH key is correct: `ssh -i ~/.ssh/lenr-sim-deploy root@VPS_IP`
2. Check inventory.yml has correct VPS IP
3. Ensure VPS is accessible (firewall allows SSH)

### Terraform apply fails

1. Check API tokens are valid
2. Verify all variables in terraform.tfvars
3. Review Terraform plan output for errors

---

**Maintained by:** LENR Simulation Platform Development Team  
**Contact:** diadon@conscious.energy
