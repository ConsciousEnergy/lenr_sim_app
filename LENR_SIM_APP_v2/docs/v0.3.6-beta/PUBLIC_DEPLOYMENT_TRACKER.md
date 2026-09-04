# Public Deployment Tracker (Hostinger VPS) - v0.3.6-beta

This tracker maps the deployment plan (`public_deployment_guide_14b798a5.plan.md`) to the current repository state and manual execution status.

## Current Readiness Summary

- **Public cutover:** **NO-GO** for live DNS (WordPress.com still authoritative). **Code/infra templates** after Wave 3 (2026-08-31): Pages production branch, deploy version stamp, Traefik dashboard off, single CORS, datasets in the backend image, bubble-fusion `1e13` removed. See [PUBLIC_RELEASE_REVIEW_2026-08.md](PUBLIC_RELEASE_REVIEW_2026-08.md).
- **Code/infra artifacts:** templates updated 2026-08-31 (Wave 3). Still do **not** `terraform apply` until operator DNS is decided.
  - Pages Terraform `production_branch` defaults to `lenr_sim_app_v0.3.6-beta`.
  - `.github/workflows/deploy.yml` runs on that ship branch and stamps `BUILD_VERSION=0.3.6-beta`.
  - Swarm pulls `ghcr.io/consciousenergy/lenr-sim-backend:0.3.6-beta` (lowercase, version tag).
  - `Dockerfile.backend` copies `datasets/` for hydrate.
  - Traefik dashboard is off; dual Traefik CORS removed.
- **What already holds in code (do not regress):**
  - Cloudflare Pages `destination_dir` is Vite `LENR_SIM_APP_v2/frontend/dist` with `VITE_API_URL`.
  - Swarm backend sets `LENR_ENVIRONMENT=production` and `LENR_AUTO_PERSIST=0`.
  - Production API hides `/api/docs`, `/api/redoc`, `/api/openapi.json`, `/metrics` (404 is correct; checklists that expect Swagger 200 are wrong).
  - Analytics POST/PUT/DELETE require `X-LENR-Write-Token`; GET/stats stay public.
- **Release documentation:** operator probes updated 2026-08-31 (`/api/docs` expected 404).
- **Manual cloud execution:** PENDING and **blocked on live DNS**.
  - Authoritative NS are WordPress.com. Apex/`www`/`api`/`app` are Automattic. `api.conscious.energy` TLS SAN mismatch. `lenr-sim-prod.pages.dev` NXDOMAIN.
  - Do **not** `terraform apply` the documented apex CNAME while WordPress owns the marketing site.

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
- **Repo readiness:** health URL documented. OpenAPI/Swagger is **hidden** in production.
- **Manual tasks pending:** DNS propagation, SSL issuance validation, API **health** (not Swagger), frontend domain verification, WordPress embed of the **Pages SPA** (never the API, never today's WordPress apex), backup cron confirmation.

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
3. Validate (after DNS actually points at Traefik / Pages — today it does not):
   - `curl https://api.conscious.energy/api/health` → 200, `"version": "0.3.6-beta"`
   - `curl -I https://api.conscious.energy/api/docs` → **404** (OpenAPI off; this is not a failure)
   - `curl -I https://api.conscious.energy/metrics` → **404**
   - frontend reachable at the **chosen Pages host** (not WordPress.com apex unless WordPress has moved)
   - OPTIONS from that origin returns a **single** `Access-Control-Allow-Origin`
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

## Math-Accuracy Hardening Slice (2026-08-10)

- Physics math-accuracy pass landed on `cursor/math-accuracy-f130` (PR #71
  into `development`): CI-red bubble-collapse phase tests fixed, five
  order-of-magnitude backend math bugs corrected, frontend x3.33 radius
  rescale removed, docs Q-values/Gamow forms corrected, ~35 stale status
  documents archived. Evidence: `VERIFICATION_GATE_REPORT.md` (same date)
  and `RELEASE_EVIDENCE_PACK.md`.
- Operator follow-up (pre-existing, unchanged by this slice): pip-audit
  advisories for pinned starlette/vtk/ecdsa; upgrade alongside a FastAPI
  compatibility check before or shortly after go-live.
