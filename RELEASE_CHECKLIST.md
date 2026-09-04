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

- [ ] Cloudflare / Hostinger credentials and Terraform apply
- [ ] Swarm secrets + GHCR pull on VPS
- [ ] Health checks: `https://api.conscious.energy/api/health`
- [ ] Frontend domain + TLS verified

Tracked as **manual PENDING** until operators complete the runbook in
`PUBLIC_DEPLOYMENT_TRACKER.md`.
