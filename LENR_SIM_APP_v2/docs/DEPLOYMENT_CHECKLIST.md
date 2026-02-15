# Deployment Checklist (v0.3.1-beta)

## Pre-Deployment

- [ ] All backend tests passing: `cd backend && python -m pytest tests/ app/tests/ -v -o addopts=""`
- [ ] Frontend builds without errors: `cd frontend && npm ci && npm run build`
- [ ] CHANGELOG.md updated with release notes
- [ ] PR description complete and reviewed

## Docker / GHCR

- [ ] Backend image builds: `docker build -f infrastructure/docker/Dockerfile.backend --build-arg BUILD_VERSION=0.3.0-beta .`
- [ ] Image pushed to GHCR: `docker push ghcr.io/ConsciousEnergy/lenr-sim-backend:latest`
- [ ] **VPS has GHCR credentials**: `docker login ghcr.io -u <user> --password-stdin` on the server

## Infrastructure

- [ ] Terraform variables filled in (`terraform.tfvars`)
- [ ] Terraform applied: `terraform apply`
- [ ] Ansible inventory updated with VPS IP
- [ ] Docker + Swarm setup: `ansible-playbook setup-docker.yml`
- [ ] Docker secrets created on server (postgres_password, api_secret_key)
- [ ] Stack deployed: `ansible-playbook deploy-stack.yml`

## Cloudflare

- [ ] Cloudflare Pages `production_branch` set to `main`
- [ ] DNS A record for `api.conscious.energy` points to VPS IP
- [ ] Cloudflare Pages builds frontend from `LENR_SIM_APP_v2/frontend`

## Post-Deployment Verification

- [ ] `curl https://api.conscious.energy/api/health` returns status
- [ ] `https://api.conscious.energy/api/docs` loads Swagger UI
- [ ] Frontend loads at `https://conscious.energy`
- [ ] CORS: frontend can call API without errors
- [ ] Rate limiting active (test with rapid requests)
- [ ] Debug endpoints return 404 (`/memory`, `/cache/stats`, `/api/diagnostics`)

## Monitoring

- [ ] UptimeRobot or Cloudflare health check configured for `https://api.conscious.energy/api/health`
- [ ] Prometheus metrics available at `/metrics` (internal only)
- [ ] JSON logging enabled in production (`LENR_LOG_JSON_FORMAT=true`)
