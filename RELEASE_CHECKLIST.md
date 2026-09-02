# Public Release Checklist — v0.3.6-beta

Canonical definition of done: [`.cursor/skills/release-quality-gate/SKILL.md`](.cursor/skills/release-quality-gate/SKILL.md).

Operator cloud cutover steps: [`LENR_SIM_APP_v2/docs/DEPLOYMENT_CHECKLIST.md`](LENR_SIM_APP_v2/docs/DEPLOYMENT_CHECKLIST.md).

Evidence pack: [`LENR_SIM_APP_v2/docs/v0.3.6-beta/`](LENR_SIM_APP_v2/docs/v0.3.6-beta/).

> Historical note: an earlier checklist targeted v0.3.0. This file is the
> living checklist for the current public beta (`0.3.6-beta`).

## Version consistency

- [ ] `backend/app/core/config.py` → `APP_VERSION`
- [ ] `frontend/package.json` → `"version"`
- [ ] `frontend/src/config/version.js` → `APP_VERSION`
- [ ] `infrastructure/docker/Dockerfile.backend` → `BUILD_VERSION`
- [ ] All four equal (CI `version-consistency` job)

## Backend gates

- [ ] `pip-audit -r requirements.txt` (with documented ignore list from CI)
- [ ] `python -m pytest tests/ app/tests/`
- [ ] Experiment-anchored science gates (release-blocking; do not waive)
- [ ] Physics benchmark gates (`test_physics_benchmark_gates.py`)

## Frontend gates

- [ ] `npm audit --audit-level=high` (0 high/critical)
- [ ] `npm run lint` (0 errors; warnings may remain as documented residual)
- [ ] `npm test -- --watchAll=false`
- [ ] `CI=true npm run build`

## Docker

- [ ] `docker build -f infrastructure/docker/Dockerfile.backend ...` succeeds
- [ ] `docker build -f infrastructure/docker/Dockerfile.frontend ...` succeeds
  (Vite `dist/`, `.npmrc` copied before `npm ci`)

## Governance / docs

- [ ] `CHANGELOG.md` updated for the ship slice
- [ ] `docs/v0.3.6-beta/VERIFICATION_GATE_REPORT.md` section added
- [ ] `docs/v0.3.6-beta/RELEASE_EVIDENCE_PACK.md` updated
- [ ] `docs/v0.3.6-beta/PUBLIC_DEPLOYMENT_TRACKER.md` accurate (code vs cloud)
- [ ] Theoretical paper revision date synced if content changed
- [ ] `CONTRIBUTING.md` / `SECURITY.md` / `LICENSE` present at repo root

## Public deploy (operator)

Canonical path is the **same-origin VPS** (`https://beta.conscious.energy`), not Cloudflare Pages + Swarm.

- [ ] WordPress.com DNS: `A beta -> 185.211.4.66` (optional AAAA)
- [ ] `infrastructure/vps/scripts/bootstrap-host.sh` (SSH key-only, UFW, fail2ban, swap)
- [ ] `/opt/lenr-sim/.env` filled from `.env.production.example` (mode 0600)
- [ ] `deploy.sh` (alembic + compose up); `hydrate-demo.sh` once; backup cron
- [ ] Health: `https://beta.conscious.energy/api/health` → 200 `version: 0.3.6-beta`
- [ ] `GET /api/docs` and `GET /metrics` → **404**
- [ ] SPA deep link `/unified-theory` → 200; beta banner visible
- [ ] Root password rotated in hPanel; Actions secrets `VPS_HOST` / `VPS_SSH_KEY` / `GHCR_PULL_TOKEN`

Tracked as **manual PENDING** until operators complete the runbook in
`PUBLIC_DEPLOYMENT_TRACKER.md`. The Terraform/Swarm path is the alternative
multi-node design; do not apply it while WordPress owns the marketing site.
