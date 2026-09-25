# Agent and contributor current truth (v0.3.7-beta)

Short map for humans and Cursor agents. Prefer this over stale trackers.

## Version

Four markers must stay **`0.3.7-beta`** (do not bump to 0.3.8 in CI/docs PRs):

- `LENR_SIM_APP_v2/backend/app/core/config.py` → `APP_VERSION`
- `LENR_SIM_APP_v2/frontend/package.json` → `"version"`
- `LENR_SIM_APP_v2/frontend/src/config/version.js` → `APP_VERSION`
- `LENR_SIM_APP_v2/infrastructure/docker/Dockerfile.backend` → `BUILD_VERSION`

## Live share vs tip

| Surface | Meaning |
|---------|---------|
| `LIVE_COMPOSE_URL` / `https://lenr-sim-beta.conscious.energy` | Public Compose+Caddy share on Hostinger VM `1280333` (`185.211.4.66`). Deploy **target** only — never a GitHub Actions runner while the dedicated-CI goal is active. |
| Branch tip / `main` | Source of truth for code; may be ahead of live until an operator ships with `VPS_*` / SSH. |

Dedicated CI VM + labels `self-hosted,linux,x64,lenr-ci`:
[`LENR_SIM_APP_v2/docs/v0.3.7-beta/SELF_HOSTED_RUNNER.md`](LENR_SIM_APP_v2/docs/v0.3.7-beta/SELF_HOSTED_RUNNER.md).
Keep `deploy.yml` off `lenr-ci`. Never expose `VPS_*` to PR jobs.

Repo variable `LENR_CI_RUNS_ON` → `["self-hosted","linux","x64","lenr-ci"]` only after the runner is Idle; leave unset to keep `ubuntu-latest`.

## Cutover map (Compose now → Swarm later)

| Stage | When | Confirm env | Doc |
|-------|------|-------------|-----|
| Compose share (now) | v0.3.7-beta public | `VPS_*` / SSH ship — not Swarm | [`docs/v0.3.7-beta/LIVE_SHARE_STATUS.md`](LENR_SIM_APP_v2/docs/v0.3.7-beta/LIVE_SHARE_STATUS.md) |
| Staging Swarm | prep / dry-run | `CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8` | [`docs/v0.3.8-beta/STAGING_SWARM_DRY_RUN.md`](LENR_SIM_APP_v2/docs/v0.3.8-beta/STAGING_SWARM_DRY_RUN.md) |
| Public Swarm + Pages | later | `CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9` | [`docs/v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md`](LENR_SIM_APP_v2/docs/v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md) |

Do **not** apply public Swarm without the 0.3.9 confirm. Do **not** close any `EQ-OPEN-*`.

## Dense PRs

Trunk-based: short-lived branches → squash to `main`. Prefer **one topic per PR**.

- **CI / ops / onboarding** PRs: workflows, runner runbook, cutover docs — this track.
- **Academic review** PRs: ledger, proof matrix, CMNS/Theory Paper honesty, Lean — **separate** branches; do not rewrite claim text from CI/infra PRs.

See [`.github/BRANCHING.md`](.github/BRANCHING.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Science / academic review (parallel; source of truth)

Point here; do not duplicate claim rows in ops PRs:

- [`PHYSICS_MATURITY_LEDGER.md`](LENR_SIM_APP_v2/docs/v0.3.7-beta/PHYSICS_MATURITY_LEDGER.md)
- [`PROOF_MATRIX.md`](LENR_SIM_APP_v2/docs/v0.3.7-beta/PROOF_MATRIX.md)
- [`GOALS.md`](LENR_SIM_APP_v2/docs/v0.3.7-beta/GOALS.md) — `EQ-OPEN-*` stay OPEN

## Local gates (minimum before PR)

- Backend slice: `cd LENR_SIM_APP_v2/backend && python -m pytest …` for touched tests
- Frontend: `npm ci && npm run lint && npm test && npm run build` when UI changes
- Version consistency: all four markers identical
- Release skill: [`.cursor/skills/release-quality-gate/SKILL.md`](.cursor/skills/release-quality-gate/SKILL.md)

Docs/academic-only PRs intentionally skip frontend-e2e / full Python matrix once path filters land in `test.yml`.
