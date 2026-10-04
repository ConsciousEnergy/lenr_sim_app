# PR and branch hygiene (2026-10-04)

**Purpose:** Disposition for open PRs after the v0.3.7-beta merge queue landed.
Trunk-based rules in [`.github/BRANCHING.md`](../../../.github/BRANCHING.md)
still apply: short-lived heads, squash-merge, delete on merge.

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

## Remaining open PRs (2026-10-04T15:49Z)

| PR | Disposition |
|----|-------------|
| [#221](https://github.com/ConsciousEnergy/lenr_sim_app/pull/221) draft | **Close** — redundant after #218 |
| [#216](https://github.com/ConsciousEnergy/lenr_sim_app/pull/216) | **Hold** — `scipy 1.18.1` needs `numpy>=2` vs pin `numpy==1.26.4` |
| [#226](https://github.com/ConsciousEnergy/lenr_sim_app/pull/226) Actions deps | Rebase onto tip (needs audit-high-gate from #224) then review |
| [#227](https://github.com/ConsciousEnergy/lenr_sim_app/pull/227) react-three | **Hold / careful** — may fight #212 fiber 8 / drei 9 pin |
| [#228](https://github.com/ConsciousEnergy/lenr_sim_app/pull/228) npm-minor-patch | Rebase onto tip; review after #224 gate |

## Next plan track (ops)

See [`FULL_STACK_BUILD_UNLOCK.md`](FULL_STACK_BUILD_UNLOCK.md):

1. Operator credentials for remote staging dry-run (`backend.hcl`, `staging.tfvars`, `inventory.staging.yml`)
2. Staging Swarm node(s) ≠ CI `2012566` / ≠ blind promote of share `1280333`
3. Staging apply under `CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8`
4. Public cutover later under `CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9`

## Public vs team docs

| Audience | Home | Standard |
|----------|------|----------|
| Public / contributors | root `README.md`, `CONTRIBUTING.md`, `LENR_SIM_APP_v2/README.md` | Scope, how to run, what is **not** claimed; link maturity ledger |
| Team / operators | [`README.md`](README.md), [`FULL_STACK_BUILD_UNLOCK.md`](FULL_STACK_BUILD_UNLOCK.md), `docs/v0.3.7-beta/`, `docs/v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md`, `.github/BRANCHING.md`, `AGENTS.md` | Gates, confirm strings, rollback, no secret material |
| Academic parallel | `PHYSICS_MATURITY_LEDGER.md`, `PROOF_MATRIX.md`, Theory Paper | Stay on separate PRs; `EQ-OPEN-*` remain OPEN |

See also [`DUAL_KVM2_SWARM_READINESS.md`](DUAL_KVM2_SWARM_READINESS.md).
