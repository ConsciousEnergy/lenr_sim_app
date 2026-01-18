# LENR Simulation App - Deployment Checklist

**Version:** 0.2.1-beta  
**Last Updated:** January 2026

---

## Pre-Deployment Checklist

### Phase 3: PR Preparation

- [ ] **3.1** Backend tests passing: `cd backend && pytest app/tests/ -v`
- [ ] **3.2** Frontend lint check: `cd frontend && npm run lint`
- [ ] **3.3** Production build successful: `cd frontend && npm ci && npm run build`
- [ ] **3.4** CHANGELOG.md updated with v0.2.1-beta section
- [ ] **3.5** PR_DESCRIPTION_v0.2.1-beta.md complete
- [ ] **3.6** KNOWN_ISSUES_v0.2-beta.md updated with resolved issues
- [ ] **3.7** All changes staged: `git add -A`
- [ ] **3.8** Commit message descriptive and complete
- [ ] **3.9** Branch pushed: `git push -u origin lenr_sim_app_v0.2.1-beta`
- [ ] **3.10** Pull Request created and reviewed

---

## Phase 4: Infrastructure Deployment

### 4.1 Prerequisites

- [ ] **4.1.1** Cloudflare account created and domain added
- [ ] **4.1.2** Cloudflare API token generated with required permissions
- [ ] **4.1.3** Cloudflare Account ID and Zone ID noted
- [ ] **4.1.4** Hostinger account created
- [ ] **4.1.5** Hostinger VPS plan purchased (KVM 2 recommended)
- [ ] **4.1.6** Hostinger API token generated
- [ ] **4.1.7** SSH key pair generated: `ssh-keygen -t ed25519`
- [ ] **4.1.8** SSH public key copied for Terraform
- [ ] **4.1.9** Terraform >= 1.5.0 installed
- [ ] **4.1.10** Ansible >= 2.15 installed
- [ ] **4.1.11** GitHub Personal Access Token with `write:packages` permission

### 4.2 Terraform Provisioning

- [ ] **4.2.1** `terraform.tfvars` created from example
- [ ] **4.2.2** All Terraform variables filled in with real values
- [ ] **4.2.3** `terraform init` completed successfully
- [ ] **4.2.4** `terraform plan` reviewed carefully
- [ ] **4.2.5** `terraform apply` executed
- [ ] **4.2.6** VPS IP address noted from output
- [ ] **4.2.7** Cloudflare Pages URL noted
- [ ] **4.2.8** SSH connection to VPS tested

### 4.3 Server Configuration

- [ ] **4.3.1** `inventory.yml` created from example
- [ ] **4.3.2** Inventory updated with VPS IP
- [ ] **4.3.3** Ansible connection tested: `ansible all -m ping`
- [ ] **4.3.4** Docker setup playbook executed
- [ ] **4.3.5** Docker version verified on server
- [ ] **4.3.6** Docker Swarm initialized and verified
- [ ] **4.3.7** Docker overlay network created

### 4.4 Application Deployment

- [ ] **4.4.1** Docker image built (GitHub Actions or manual)
- [ ] **4.4.2** Docker image pushed to GHCR
- [ ] **4.4.3** PostgreSQL password generated securely
- [ ] **4.4.4** PostgreSQL password saved securely (password manager)
- [ ] **4.4.5** Docker secrets created on server
- [ ] **4.4.6** Deploy stack playbook executed
- [ ] **4.4.7** All services running: `docker stack services lenr-sim`
- [ ] **4.4.8** Service logs checked for errors

### 4.5 Verification

- [ ] **4.5.1** SSL certificate obtained (wait 2-5 minutes)
- [ ] **4.5.2** SSL certificate verified: `curl -vI https://api.conscious.energy`
- [ ] **4.5.3** API health check: `curl https://api.conscious.energy/api/health`
- [ ] **4.5.4** Swagger docs accessible: `curl -I https://api.conscious.energy/api/docs`
- [ ] **4.5.5** Frontend loads correctly: `curl -I https://conscious.energy`
- [ ] **4.5.6** Frontend can connect to API
- [ ] **4.5.7** WordPress iframe embed added
- [ ] **4.5.8** WordPress integration tested
- [ ] **4.5.9** Database backup script tested
- [ ] **4.5.10** Daily backup cron job configured

---

## Post-Deployment

### Monitoring Setup

- [ ] Traefik dashboard accessible (with auth)
- [ ] Service health checks configured
- [ ] Log aggregation configured (if needed)
- [ ] Alerting configured (if needed)

### Documentation

- [ ] Deployment date recorded
- [ ] VPS IP and credentials stored securely
- [ ] Database password stored securely
- [ ] SSH key backed up securely
- [ ] Terraform state backed up (if using remote state)

### Security Verification

- [ ] UFW firewall enabled and configured
- [ ] Fail2ban active and protecting SSH
- [ ] Only required ports open (22, 80, 443)
- [ ] Docker secrets used (not environment variables)
- [ ] CORS properly configured
- [ ] Rate limiting active
- [ ] HTTPS enforced everywhere

---

## Rollback Plan

If deployment fails:

1. **Application Rollback:**
   ```bash
   docker service rollback lenr-sim_backend
   ```

2. **Infrastructure Rollback:**
   ```bash
   cd infrastructure/terraform
   terraform destroy  # CAREFUL: Destroys everything
   ```

3. **Contact:** diadon@conscious.energy for support

---

## Emergency Contacts

- **Technical Issues:** diadon@conscious.energy
- **Infrastructure:** Review Terraform/Ansible logs
- **Application:** Check Docker service logs

---

**Checklist maintained by:** LENR Simulation Platform Development Team
