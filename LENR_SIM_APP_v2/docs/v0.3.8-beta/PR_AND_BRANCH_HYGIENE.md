# PR and branch hygiene (2026-09-26)

**Purpose:** Disposition for open PRs and remote branches after dedicated
`lenr-ci` came online. Trunk-based rules in [`.github/BRANCHING.md`](../../../.github/BRANCHING.md)
still apply: short-lived heads, squash-merge, delete on merge.

**Operator rule:** Do not bulk-merge Dependabot or academic-claim PRs without
review. Prefer **rebase onto `main`** then re-run CI on `lenr-ci` (hosted
checks on older tips often look “failed” from spend-limit / share-refuse noise).
**Merges require an explicit operator ask** — agents prepare and verify only.
Slack context alone is not merge authorization.

## Open PRs — disposition (live 2026-09-26T21:24Z)

| PR | Draft | CI on tip | Disposition |
|----|-------|-----------|-------------|
| [#218](https://github.com/ConsciousEnergy/lenr_sim_app/pull/218) `self-hosted-ci-docs-98d8` | **ready** | **CLEAN** on `lenr-ci-1` | **Merge first** |
| [#220](https://github.com/ConsciousEnergy/lenr_sim_app/pull/220) `release-hygiene-swarm-readiness-98d8` | **ready** | Proven green at `9a2bf70`; tip `8129187`+ docs re-queued on single runner | **Merge second** |
| [#210](https://github.com/ConsciousEnergy/lenr_sim_app/pull/210) `v038-vnc-oneshot-on-main-98d8` | **ready** | **CLEAN** (rebased) | **Merge third** |
| [#219](https://github.com/ConsciousEnergy/lenr_sim_app/pull/219) `readme-scope-docs-962f` | **ready** | **CLEAN** (rebased; public README + screenshots) | **Merge fourth** |
| [#212](https://github.com/ConsciousEnergy/lenr_sim_app/pull/212) `viz-error-instrument-26dd` | **ready** | Suite green / finishing on `lenr-ci` | **Merge fifth** — R3F fiber 8 / drei 9 |
| [#217](https://github.com/ConsciousEnergy/lenr_sim_app/pull/217) `unified-paper-v037-962f` | **ready** | Rebased; suite queued behind FIFO | **Academic train** — after infra |
| [#213](https://github.com/ConsciousEnergy/lenr_sim_app/pull/213)–[#216](https://github.com/ConsciousEnergy/lenr_sim_app/pull/216) Dependabot | **ready** | Rebased onto hygiene tip; FIFO queue | Merge last with green `lenr-ci` + dependency-review. **`#216` blocked:** `scipy 1.18.1` needs `numpy>=2.0` vs pin `numpy==1.26.4` (`ResolutionImpossible`) |
| [#209](https://github.com/ConsciousEnergy/lenr_sim_app/pull/209) / [#211](https://github.com/ConsciousEnergy/lenr_sim_app/pull/211) | closed | — | Closed superseded; remote heads deleted |

All listed heads report `mergeable=MERGEABLE` against `main` (agent check).

## Remote branches without an open PR

**None** for `consciousenergy/*` after 2026-09-26 cleanup (merged-PR orphans deleted).
Open remotes match the ten PR heads above (6 feature + 4 Dependabot).

Keep deleting merged heads promptly (`delete branch on merge` in GitHub settings).

## Merge order (safe)

1. **#218** (dedicated CI)
2. **#220** (hygiene + Swarm readiness)
3. **#210** (VNC/unlock)
4. **#219** (public README)
5. **#212** (frontend R3F) then **#217** (academic)
6. Dependabot **#213–#216** last

## Public vs team docs

| Audience | Home | Standard |
|----------|------|----------|
| Public / contributors | root `README.md`, `CONTRIBUTING.md`, `LENR_SIM_APP_v2/README.md` | Scope, how to run, what is **not** claimed; link maturity ledger |
| Team / operators | [`README.md`](README.md) (this folder’s map), [`FULL_STACK_BUILD_UNLOCK.md`](FULL_STACK_BUILD_UNLOCK.md), `docs/v0.3.7-beta/` (train), `docs/v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md`, `.github/BRANCHING.md`, `AGENTS.md` | Gates, confirm strings, rollback, no secret material |
| Academic parallel | `PHYSICS_MATURITY_LEDGER.md`, `PROOF_MATRIX.md`, Theory Paper PRs | Stay on separate PRs; `EQ-OPEN-*` remain OPEN |

See also [`DUAL_KVM2_SWARM_READINESS.md`](DUAL_KVM2_SWARM_READINESS.md) (component matrix: Compose / CI / Swarm / Ansible / Traefik / Cloudflare).
