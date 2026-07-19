# Deployment Checklist (v0.3.6-beta)

## Environment Modes (Avoid Port/Hosting Confusion)

- **Local development UI (Vite):** run frontend with `cd frontend && npm run dev` (or `npm start`) and open `http://localhost:3000`
- **Local development API (Docker):** run backend with `docker compose up -d --build` and use `http://localhost:8010/api/health`
- **Production UI (Hostinger/Cloudflare):** serve frontend static build from hosting pipeline, not local Vite dev server
- **Production API:** public API endpoint is `https://api.conscious.energy` (behind reverse proxy/TLS)
- **Best practice:** do not mix local development-server expectations with production static hosting assumptions

## Pre-Deployment

- [ ] All backend tests passing: `cd backend && python -m pytest tests/test_theory_modules.py tests/test_scientific_guardrails.py tests/test_integration/test_simulation_pipeline.py tests/test_integration/test_rate_engine_api.py -q`
- [ ] Frontend quality gates pass: `cd frontend && npm run lint && npm test -- src/pages/UnifiedTheoryPage.test.jsx && npm run build`
- [ ] CHANGELOG.md updated with release notes
- [ ] PR description complete and reviewed

## Docker / GHCR

- [ ] Backend image builds: `docker build -f infrastructure/docker/Dockerfile.backend --build-arg BUILD_VERSION=0.3.6-beta .`
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
- [ ] Build-time env `VITE_API_URL=https://api.conscious.energy` set in the Pages project (production build). If unset, `src/config/api.js` falls back to `https://api.conscious.energy`, so this is a safety belt, not a hard requirement.

## Post-Deployment Verification

- [ ] `curl https://api.conscious.energy/api/health` returns status
- [ ] `https://api.conscious.energy/api/docs` loads Swagger UI
- [ ] Frontend loads at `https://conscious.energy`
- [ ] CORS: frontend can call API without errors
- [ ] Rate limiting active (test with rapid requests)
- [ ] Debug endpoints return 404 (`/memory`, `/cache/stats`, `/api/diagnostics`)

## v0.3.6-beta Reaction-Rate Engine Go-Live Matrix

The reaction-rate engine, UQ, and KG-RP diagnostics are **additive and backward-compatible**.
Verify the contract is honored in production:

| Item | Expected in production | Claim tier / intended-use limit |
|---|---|---|
| `POST /api/unified/bubble-lattice` (defaults) | Response includes a `reaction_rate_engine` block with a `two_body` rate and a KG-RP block; `contract_version` unchanged (`v0.3.6-beta-science-gate-1`) | Validated formalism; bounded proxy, not a transport solve |
| UQ opt-in | No credible interval unless `include_uncertainty=true`; default samples `256`, UI cap `1024`, backend hard cap `4096` | Keeps request time within reverse-proxy/Gunicorn timeout budget |
| `trapped_state` mode | Returned as **speculative** tier with credible interval when UQ on; seeded result reproducible via `random_seed` | Exploratory; not a calibrated prediction |
| Empty-block fallback | If the engine cannot be evaluated, block is `{}` and the legacy response is unaffected | Core response contract never blocked by the additive feature |
| Local-fallback labelling | When the backend is unreachable, the UI shows a "local calculations (limited accuracy)" notice and the panel renders a "no governed output" state (dev/offline only) | No fabricated rate numbers in offline mode |

## Monitoring

- [ ] UptimeRobot or Cloudflare health check configured for `https://api.conscious.energy/api/health`
- [ ] Prometheus metrics available at `/metrics` (internal only)
- [ ] JSON logging enabled in production (`LENR_LOG_JSON_FORMAT=true`)
