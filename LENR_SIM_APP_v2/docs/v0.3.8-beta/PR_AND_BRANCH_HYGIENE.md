# PR and branch hygiene (2026-10-10)

**Purpose:** Disposition after the main+`dev` consolidation. Policy:
[`.github/BRANCHING.md`](../../../.github/BRANCHING.md).

**Operator rule:** Merges require an explicit ask. Agents prepare and verify.
Default new work targets **`dev`** (0.3.8-beta). Use **`main`** only for
0.3.8-beta Compose hotfixes / release-line docs.

## Version trains

| Branch | Markers | Role |
|--------|---------|------|
| `main` | `0.3.8-beta` | Live Compose share; tag `v0.3.8-beta` |
| `dev` | `0.3.8-beta` | Integration for Swarm staging prep / science / deps |

## Completed on `main` (0.3.7 line)

| Item | Notes |
|------|-------|
| Merge queue #218→#231 | Dedicated CI, hygiene, ICCF-27, audit gates, Actions deps |
| Draft→published `v0.3.7-beta` | Releases page matches live share |
| CHANGELOG `## [v0.3.7-beta]` | Promoted from Unreleased |

## Open / hold

| Item | Disposition |
|------|-------------|
| [#216](https://github.com/ConsciousEnergy/lenr_sim_app/pull/216) numpy/scipy | **Closed** — recreate against `dev` only with an intentional NumPy 2 migration |
| Squash-orphan `consciousenergy/*` remotes | **Deleted** after consolidation |
| Dependabot | Retargeted to `dev` via `target-branch: dev` |

## Progressive next steps (on `dev`)

See [`FULL_STACK_BUILD_UNLOCK.md`](FULL_STACK_BUILD_UNLOCK.md):

1. Learn topology: [`TWO_KVM2_SWARM_TOPOLOGY.md`](TWO_KVM2_SWARM_TOPOLOGY.md) + [`SWARM_OPERATOR_LAB.md`](SWARM_OPERATOR_LAB.md)
2. Operator: UMLENR Goal 1 pack → `ConsciousEnergy/UMLENR` (write access required)
3. Operator: staging credentials + remote dry-run (`CONFIRM_SWARM_0_3_8`)
4. Staging apply under confirm; public cutover later under `CONFIRM_SWARM_0_3_9`

## Public vs team docs

| Audience | Home |
|----------|------|
| Public | root `README.md`, `CONTRIBUTING.md` |
| Operators | this folder’s map, unlock docs, `AGENTS.md` |
| Academic | ledger / proof matrix / Theory Paper — separate PRs; `EQ-OPEN-*` OPEN |
