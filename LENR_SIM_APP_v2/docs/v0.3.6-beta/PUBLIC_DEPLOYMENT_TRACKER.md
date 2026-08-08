# Public Deployment Tracker (Hostinger VPS) - v0.3.6-beta

This tracker maps the deployment plan (`public_deployment_guide_14b798a5.plan.md`) to the current repository state and manual execution status.

## Current Readiness Summary

- **Code/infra artifacts:** READY
  - Terraform modules for Cloudflare + Hostinger are present.
  - Ansible playbooks for Docker/Swarm setup and stack deployment are present.
  - Deployment scripts (`deploy.sh`, `backup-db.sh`, `rollback.sh`) are present.
  - Docker stack templates include Traefik TLS, backend replicas, and Postgres secret usage.
- **Release documentation:** READY
  - `DEPLOYMENT_CHECKLIST.md`, `DEPLOYMENT_QUICK_REFERENCE.md`, and release evidence docs updated for v0.3.6-beta + Vite workflow.
- **Manual cloud execution:** PENDING
  - Cloudflare/Hostinger account actions, token creation, terraform apply, and live DNS cutover must still be performed.

## Plan Mapping (Phase 4)

### 4.1 Prerequisites
- **Repo readiness:** complete templates and scripts exist.
- **Manual tasks pending:** Cloudflare account/token/zone IDs, Hostinger account/token, SSH key generation, local Terraform/Ansible install.

### 4.2 Terraform provisioning
- **Repo readiness:** `infrastructure/terraform/terraform.tfvars.example` and outputs are ready (`frontend_url`, `api_url`, `vps_ip`).
- **Manual tasks pending:** create `terraform.tfvars` with real credentials; run `terraform init/plan/apply`; capture `vps_ip`.

### 4.3 Server configuration
- **Repo readiness:** `setup-docker.yml` and inventory template exist; `deploy.sh` auto-updates inventory host IP after apply.
- **Manual tasks pending:** confirm SSH connectivity to VPS and run setup playbook against real host.

### 4.4 Application deployment
- **Repo readiness:** `deploy-stack.yml` and `docker-stack.yml.j2` include:
  - Docker Swarm deployment,
  - external Docker secrets (`postgres_password`, `api_secret_key`),
  - Traefik routing + TLS,
  - backend GHCR image reference.
- **Manual tasks pending:** GHCR login on VPS (or worker manager), secret creation/rotation, stack deployment on live server.

### 4.5 Verification and go-live
- **Repo readiness:** health/docs URLs and verification checklist documented.
- **Manual tasks pending:** DNS propagation, SSL issuance validation, API/Swagger checks, frontend domain verification, WordPress embed and integration test, backup cron confirmation.

## Blocking Inputs Required Before Live Apply

- Cloudflare:
  - `cloudflare_api_token`
  - `cloudflare_account_id`
  - `cloudflare_zone_id`
- Hostinger:
  - `hostinger_api_token`
  - selected VPS plan + datacenter
- Access:
  - deployment SSH keypair (`ed25519`) and public key registered in provisioning variables
- Registry:
  - GHCR credentials available on VPS for backend image pulls

## Recommended Execution Sequence (Operator Runbook)

1. Fill `infrastructure/terraform/terraform.tfvars` from example with real values.
2. Run `infrastructure/scripts/deploy.sh production` (preferred path).
3. Validate:
   - `curl https://api.conscious.energy/api/health`
   - `curl -I https://api.conscious.energy/api/docs`
   - frontend reachable at configured Cloudflare Pages/custom domain.
4. Record outputs and checks in:
   - `docs/v0.3.6-beta/VERIFICATION_GATE_REPORT.md`
   - `docs/v0.3.6-beta/RELEASE_EVIDENCE_PACK.md`

## Residual Risks to Track During Public Rollout

- Node runtime on operators should be updated beyond `20.12.0` to remove Vite CJS warning path.
- Frontend lint warnings are non-blocking but should be reduced after deployment freeze.
- Backend transitive dependency advisories (`pytest`, `starlette`, `pyasn1` lineage) remain documented residuals.

## Pre-Public Hardening Slice (2026-08-08)

Blockers cleared before public rollout:

- Frontend high-severity advisory (`js-yaml` GHSA-5p4m-2wfm-xmqj) cleared; the
  `npm audit --audit-level=high` CI gate passes again. Note the gate must be read via
  its direct exit code - piping it through `tail` reports the pipe's status and had
  been masking the failure.
- Advanced Physics Analysis no longer reports saturated clamps as if they were
  computed physics; the single-bubble temperature ceiling is anchored to published
  hydrodynamic values instead of sitting below the measured emission band.
- The Advanced Analysis <-> Theory Testbed navigation loop is fixed (theory results
  persist, empty states name the missing data source, and the testbed offers a route
  back). Covered by Playwright E2E.
- CI test matrix now includes Python 3.12, matching the shipped container runtime.

Still operator-owned:

- Re-trigger `Test and Benchmark` on PR #68 so CI reflects current HEAD (this agent's
  token cannot dispatch workflows).
- Hostinger/Cloudflare apply still needs `terraform.tfvars` plus Hostinger and
  Cloudflare API tokens; unchanged from the prior tracker entry.
- Confirm the Cloudflare Pages build output directory is `dist` (Vite), not `build`.
