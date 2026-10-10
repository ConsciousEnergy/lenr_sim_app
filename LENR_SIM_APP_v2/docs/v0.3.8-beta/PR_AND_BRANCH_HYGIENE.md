# PR and branch hygiene (2026-10-06)

**Purpose:** Disposition for open PRs after the v0.3.7-beta merge queue landed
and the 2026-10-06 audit-gate / hygiene pass. Trunk-based rules in
[`.github/BRANCHING.md`](../../../.github/BRANCHING.md) still apply: short-lived
heads, squash-merge, delete on merge.

**Operator rule:** Do not bulk-merge Dependabot or academic-claim PRs without
review. Prefer **rebase onto `main`** then re-run CI on `lenr-ci`.
**Merges require an explicit operator ask** — agents prepare and verify only.
Slack context alone is not merge authorization.

## Completed merge queue (2026-10-04)

| Order | PR | Merged | Notes |
|-------|-----|--------|-------|
| 1 | [#218](https://github.com/ConsciousEnergy/lenr_sim_app/pull/218) | 2026-09-27 | dedicated `lenr-ci-1` |
| 2 | [#220](https://github.com/ConsciousEnergy/lenr_sim_app/pull/220) | 2026-09-27 | hygiene + Swarm readiness docs |
| 3 | [#210](https://github.com/ConsciousEnergy/lenr_sim_app/pull/210) | 2026-10-04 | VNC / Compose unlock |
| 4 | [#219](https://github.com/ConsciousEnergy/lenr_sim_app/pull/219) | 2026-10-04 | public README + screenshots |
| 5 | [#212](https://github.com/ConsciousEnergy/lenr_sim_app/pull/212) | 2026-10-04 | R3F fiber 8 / drei 9 |
| 6 | [#217](https://github.com/ConsciousEnergy/lenr_sim_app/pull/217) | 2026-10-04 | Unified Theory Paper pack |
| 7 | [#215](https://github.com/ConsciousEnergy/lenr_sim_app/pull/215) | 2026-10-04 | dotenv 18 |
| 8 | [#224](https://github.com/ConsciousEnergy/lenr_sim_app/pull/224) | 2026-10-04 | `@types/three` 0.186 + braces GHSA gate |

`main` tip after queue: `695a882` (verify with `git rev-parse origin/main`).

## Open PRs — disposition (2026-10-06)

| PR | Disposition |
|----|-------------|
| [#232](https://github.com/ConsciousEnergy/lenr_sim_app/pull/232) audit gates | **Merge first (ask)** — `source-map-js` 1.2.2 + `CVE-2026-85394` ignore; aligns scheduled `security-scan.yml` |
| [#233](https://github.com/ConsciousEnergy/lenr_sim_app/pull/233) Actions deps | **Merge second (ask)** — topic rebuild of #226 on audit tip; keeps `audit-high-gate.js` |
| [#228](https://github.com/ConsciousEnergy/lenr_sim_app/pull/228) npm-minor-patch | **Merge after #232** (ask) — CLEAN on tip |
| [#229](https://github.com/ConsciousEnergy/lenr_sim_app/pull/229) `three` 0.186.1 | **Merge after #228** (ask) — CLEAN on tip |
| [#230](https://github.com/ConsciousEnergy/lenr_sim_app/pull/230) this PR (ops docs) | **Merge after deps** (ask) — Swarm lab + UMLENR Goal 1 pack pointers |
| [#231](https://github.com/ConsciousEnergy/lenr_sim_app/pull/231) ICCF-27 science | **Merge last of this ladder (ask)** — rebased onto #232 tip; `EQ-OPEN-*` stay OPEN |
| [#226](https://github.com/ConsciousEnergy/lenr_sim_app/pull/226) Actions Dependabot | **Superseded by #233** — close after #233 lands |
| [#221](https://github.com/ConsciousEnergy/lenr_sim_app/pull/221) | **Closed** (2026-10-06) — redundant after #218 |
| [#216](https://github.com/ConsciousEnergy/lenr_sim_app/pull/216) | **Hold** — `scipy 1.18.1` needs `numpy>=2` vs pin `numpy==1.26.4`; polluted file list |

## Suggested merge order (when operator asks)

1. **#232** (security baseline — unblocks main Scheduled Security Scan)
2. **#233** (Actions bumps)
3. **#228** then **#229**
4. **#230** (ops docs / learning / Goal 1 pack)
5. **#231** (science train)

## Progressive next steps (after this ladder)

See [`FULL_STACK_BUILD_UNLOCK.md`](FULL_STACK_BUILD_UNLOCK.md) and
[`SWARM_OPERATOR_LAB.md`](SWARM_OPERATOR_LAB.md):

1. **Operator (parallel):** copy
   [`../program/UMLENR_GOAL1_HUB_PACK/`](../program/UMLENR_GOAL1_HUB_PACK/README.md)
   into `ConsciousEnergy/UMLENR` and open Goal 1 docs PR (needs write access —
   agents on `lenr_sim_app` cannot push UMLENR).
2. **Operator:** untracked staging credentials (`backend.hcl`, `staging.tfvars`,
   `inventory.staging.yml`).
3. **Remote dry-run:** `CONFIRM=I_STAGING_0_3_8 EXECUTE=1 ./…/staging-swarm-dry-run.sh remote`
4. **Staging apply** under `CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8`
5. **Public cutover** later under `CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9`

Do **not** jump to Swarm while audit gates are red. Do **not** mix ops merges
with claim-tier / `EQ-OPEN-*` edits.

## Public vs team docs

| Audience | Home | Standard |
|----------|------|----------|
| Public / contributors | root `README.md`, `CONTRIBUTING.md`, `LENR_SIM_APP_v2/README.md` | Scope, how to run, what is **not** claimed; link maturity ledger |
| Team / operators | [`README.md`](README.md), [`FULL_STACK_BUILD_UNLOCK.md`](FULL_STACK_BUILD_UNLOCK.md), [`TWO_KVM2_SWARM_TOPOLOGY.md`](TWO_KVM2_SWARM_TOPOLOGY.md), [`SWARM_OPERATOR_LAB.md`](SWARM_OPERATOR_LAB.md), `docs/v0.3.7-beta/`, `docs/v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md`, `.github/BRANCHING.md`, `AGENTS.md` | Gates, confirm strings, rollback, no secret material |
| Academic parallel | `PHYSICS_MATURITY_LEDGER.md`, `PROOF_MATRIX.md`, Theory Paper, `#231` | Stay on separate PRs; `EQ-OPEN-*` remain OPEN |
| Program hub | [`../program/UMLENR_GOAL1_HUB_PACK/`](../program/UMLENR_GOAL1_HUB_PACK/README.md) | Portable pack for UMLENR Goal 1 PR |

See also [`DUAL_KVM2_SWARM_READINESS.md`](DUAL_KVM2_SWARM_READINESS.md).
