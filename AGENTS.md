# Agent and contributor current truth (main = v0.3.8-beta Compose; cutover train = v0.3.9-beta)

Short map for humans and Cursor agents. Prefer this over stale trackers.

## Version trains

| Branch | Markers must be | Role |
|--------|-----------------|------|
| `main` | **`0.3.8-beta`** | Live Compose public beta; ship / hotfix only |
| `dev` / Swarm cutover PRs | **`0.3.9-beta`** | Public Swarm cutover train (Traefik SPA + API); not live until `CONFIRM_SWARM_0_3_9` |

Four markers (must match within a branch):

- `LENR_SIM_APP_v2/backend/app/core/config.py` → `APP_VERSION`
- `LENR_SIM_APP_v2/frontend/package.json` → `"version"`
- `LENR_SIM_APP_v2/frontend/src/config/version.js` → `APP_VERSION`
- `LENR_SIM_APP_v2/infrastructure/docker/Dockerfile.backend` → `BUILD_VERSION`

Do **not** bump `main` markers except via a controlled promote PR from `dev`.
Branching policy: [`.github/BRANCHING.md`](.github/BRANCHING.md).

## Live share vs tip

| Surface | Meaning |
|---------|---------|
| `LIVE_COMPOSE_URL` / `https://lenr-sim-beta.conscious.energy` | Public Compose+Caddy share on Hostinger VM `1280333` (`185.211.4.66`). Deploy target only — **not** a GitHub Actions runner. Version **0.3.8-beta** after Compose promote ship ([`LIVE_SHARE_STATUS.md`](LENR_SIM_APP_v2/docs/v0.3.7-beta/LIVE_SHARE_STATUS.md)). |
| `main` | Release line matching the share train; may be ahead of live until an operator ships with `VPS_*` / SSH. |
| `dev` | Cutover integration tip (`0.3.9-beta` markers); **never** auto-deployed by `deploy.yml`. |

Self-hosted CI **online:** dedicated Hostinger KVM2 `2012566` / `45.93.100.251`
(runner `lenr-ci-1`, labels `self-hosted,linux,x64,lenr-ci`). Share must keep
**no** `.runner`. `lenr-ci-smoke` **fails** on share unless repo var
`LENR_CI_ALLOW_SHARE=1`. Keep `deploy.yml` off `lenr-ci`. Never expose `VPS_*`
to PR jobs. Runbook:
[`LENR_SIM_APP_v2/docs/v0.3.7-beta/SELF_HOSTED_RUNNER.md`](LENR_SIM_APP_v2/docs/v0.3.7-beta/SELF_HOSTED_RUNNER.md).
Proof: `LENR_SIM_APP_v2/infrastructure/scripts/prove-dedicated-lenr-ci.sh`
(exit 0 only when dedicated exists, share clean, beta healthy, smoke on dedicated).
Dual KVM2 ≠ Swarm cutover — see
[`docs/v0.3.8-beta/FULL_STACK_BUILD_UNLOCK.md`](LENR_SIM_APP_v2/docs/v0.3.8-beta/FULL_STACK_BUILD_UNLOCK.md),
[`TWO_KVM2_SWARM_TOPOLOGY.md`](LENR_SIM_APP_v2/docs/v0.3.8-beta/TWO_KVM2_SWARM_TOPOLOGY.md),
[`SWARM_OPERATOR_LAB.md`](LENR_SIM_APP_v2/docs/v0.3.8-beta/SWARM_OPERATOR_LAB.md),
[`D4S_DFORCE_OPERATOR.md`](LENR_SIM_APP_v2/docs/v0.3.8-beta/D4S_DFORCE_OPERATOR.md)
(optional D-Force/`d4s` Swarm TUI), and
[`DUAL_KVM2_SWARM_READINESS.md`](LENR_SIM_APP_v2/docs/v0.3.8-beta/DUAL_KVM2_SWARM_READINESS.md).
UMLENR Goal 1 pack (portable hub PR):
[`docs/program/UMLENR_GOAL1_HUB_PACK/`](LENR_SIM_APP_v2/docs/program/UMLENR_GOAL1_HUB_PACK/README.md).
Docs map: [`docs/v0.3.8-beta/README.md`](LENR_SIM_APP_v2/docs/v0.3.8-beta/README.md).

Workflows default to `["self-hosted","linux","x64","lenr-ci"]` when
`LENR_CI_RUNS_ON` is unset. Set the variable to `["ubuntu-latest"]` only to force hosted.

## Cutover map (Compose now → Swarm later)

| Stage | When | Confirm env | Doc |
|-------|------|-------------|-----|
| Compose share (now) | v0.3.8-beta public on `main` | `VPS_*` / SSH ship — not Swarm | [`docs/v0.3.7-beta/LIVE_SHARE_STATUS.md`](LENR_SIM_APP_v2/docs/v0.3.7-beta/LIVE_SHARE_STATUS.md) |
| Staging Swarm | prep on `dev` / dry-run | `CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8` | [`docs/v0.3.8-beta/STAGING_SWARM_DRY_RUN.md`](LENR_SIM_APP_v2/docs/v0.3.8-beta/STAGING_SWARM_DRY_RUN.md) — uses `inventory.staging.yml` + `staging.tfvars` only |
| Public Swarm (+ optional Pages) | v0.3.9-beta cutover window | `CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9` | [`docs/v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md`](LENR_SIM_APP_v2/docs/v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md) — same-origin Traefik SPA on `lenr-sim-beta` unblocks without CF Pages first |

Topology diagrams (hardware ↔ Swarm, legends, storage) — diagram SOT:
[`docs/v0.3.8-beta/THREE_NODE_SWARM_TOPOLOGY.md`](LENR_SIM_APP_v2/docs/v0.3.8-beta/THREE_NODE_SWARM_TOPOLOGY.md).
Node labels: `app=true` / `observability=true` via
[`join-workers.yml`](LENR_SIM_APP_v2/infrastructure/ansible/playbooks/join-workers.yml).

Do **not** apply public Swarm without the 0.3.9 confirm. Do **not** close any `EQ-OPEN-*`.

## Dense PRs

Short-lived branches → squash to **`dev`** (default) or `main` (0.3.8 Compose hotfix).
Prefer **one topic per PR**.

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
- Version consistency: all four markers identical **on the PR’s base train**
- Release skill: [`.cursor/skills/release-quality-gate/SKILL.md`](.cursor/skills/release-quality-gate/SKILL.md)

Docs/academic-only PRs intentionally skip frontend-e2e / full Python matrix once path filters land in `test.yml`.
