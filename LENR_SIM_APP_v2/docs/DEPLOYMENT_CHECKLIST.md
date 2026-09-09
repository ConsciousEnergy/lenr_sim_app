# Deployment Checklist (v0.3.6-beta)

## Environment Modes (Avoid Port/Hosting Confusion)

- **Local development UI (Vite):** run frontend with `cd frontend && npm run dev` (or `npm start`) and open `http://localhost:3000`
- **Local development API (Docker):** run backend with `docker compose up -d --build` and use `http://localhost:8010/api/health`
- **Production UI + API (Hostinger VPS):** `https://lenr-simp-app.conscious.energy` once its A record points here; until then `https://lenr-sim-beta.conscious.energy` (Caddy, same origin). See `infrastructure/vps/README.md`.
- **Production API (legacy Swarm design):** `https://api.conscious.energy` — not used for the 2026-09 public beta.
- **Best practice:** do not mix local development-server expectations with production static hosting assumptions

## Pre-Deployment

- [ ] All backend tests passing: `cd backend && python -m pytest tests/test_theory_modules.py tests/test_scientific_guardrails.py tests/test_integration/test_simulation_pipeline.py tests/test_integration/test_rate_engine_api.py -q`
- [ ] Frontend quality gates pass: `cd frontend && npm run lint && npm test -- src/pages/UnifiedTheoryPage.test.jsx && npm run build`
- [ ] CHANGELOG.md updated with release notes
- [ ] PR description complete and reviewed

## Docker / GHCR

- [ ] Backend image builds: `docker build -f infrastructure/docker/Dockerfile.backend --build-arg BUILD_VERSION=0.3.6-beta .`
- [ ] Image pushed to GHCR: `docker push ghcr.io/consciousenergy/lenr-sim-backend:0.3.6-beta`
- [ ] **VPS has GHCR credentials**: `docker login ghcr.io -u <user> --password-stdin` on the server

## Infrastructure (public beta VPS)

- [ ] Host hardened: `infrastructure/vps/scripts/bootstrap-host.sh`
- [ ] `/opt/lenr-sim/.env` filled; `deploy.sh` succeeded
- [ ] Optional: GHCR pull (`docker login ghcr.io`) or `BUILD_LOCALLY=1`
- [ ] `hydrate-demo.sh` once; `backup-db.sh` cron installed

The Terraform / Ansible / Swarm / Cloudflare Pages path below is the **alternative
multi-node design**. Skip it for `lenr-simp-app.conscious.energy` / `lenr-sim-beta.conscious.energy`.

## Infrastructure (alternative: Terraform + Swarm)

- [ ] Terraform variables filled in (`terraform.tfvars`)
- [ ] Terraform applied: `terraform apply`
- [ ] Ansible inventory updated with VPS IP
- [ ] Docker + Swarm setup: `ansible-playbook setup-docker.yml`
- [ ] Docker secrets created on server (postgres_password, api_secret_key)
- [ ] Stack deployed: `ansible-playbook deploy-stack.yml`

## Cloudflare

- [ ] Cloudflare Pages `production_branch` set to `lenr_sim_app_v0.3.6-beta` (not stale `main`)
- [ ] DNS A record for `api.conscious.energy` points to VPS IP
- [ ] Cloudflare Pages builds frontend from `LENR_SIM_APP_v2/frontend`
- [ ] Build-time env `VITE_API_URL=https://api.conscious.energy` set in the Pages project (production build). If unset, `src/config/api.js` falls back to `https://api.conscious.energy`, so this is a safety belt, not a hard requirement.

## Post-Deployment Verification

- [ ] `curl https://api.conscious.energy/api/health` returns status `"version": "0.3.6-beta"`
- [ ] `https://api.conscious.energy/api/docs` (no slug) returns **404** — OpenAPI/Swagger is hidden in production. That is the expected probe, not a failure.
- [ ] `https://api.conscious.energy/metrics` returns **404**
- [ ] Frontend loads at the **chosen Pages host** (do not CNAME apex to Pages while WordPress.com still owns the marketing site)
- [ ] CORS: frontend can call API without errors (a **single** `Access-Control-Allow-Origin`)
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
