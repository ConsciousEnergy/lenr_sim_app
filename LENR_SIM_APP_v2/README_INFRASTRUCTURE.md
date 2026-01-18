# LENR Simulation App - Infrastructure Quick Start

**Version:** 0.2.1-beta

---

## What's Included

This release includes **complete Infrastructure as Code (IaC)** for deploying the LENR Simulation App to production:

- ✅ **31 infrastructure files** ready for deployment
- ✅ **Terraform** modules for Cloudflare and Hostinger
- ✅ **Ansible** playbooks for server configuration
- ✅ **Docker Swarm** stack definition
- ✅ **Automated deployment scripts**
- ✅ **Comprehensive documentation**

---

## Quick Start

### 1. Prerequisites

```bash
# Install tools
brew install terraform ansible  # macOS
# OR
choco install terraform ansible  # Windows

# Generate SSH key
ssh-keygen -t ed25519 -C "lenr-sim-deploy" -f ~/.ssh/lenr-sim-deploy
```

### 2. Configure

```bash
cd LENR_SIM_APP_v2/infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your credentials
```

### 3. Deploy

```bash
cd ../scripts
./deploy.sh production
```

---

## Architecture

- **Frontend:** Cloudflare Pages (FREE)
- **Backend:** Hostinger VPS with Docker Swarm ($6.99/mo)
- **Total Cost:** ~$7.50/month

---

## Documentation

See `docs/` directory for:
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - Complete guide
- [DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md) - Step-by-step
- [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) - Common issues

---

**Ready for deployment!** 🚀
