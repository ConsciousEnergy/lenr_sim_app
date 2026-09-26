# PR and branch hygiene (2026-09-26)

**Purpose:** Disposition for open PRs and remote branches after dedicated
`lenr-ci` came online. Trunk-based rules in [`.github/BRANCHING.md`](../../../.github/BRANCHING.md)
still apply: short-lived heads, squash-merge, delete on merge.

**Operator rule:** Do not bulk-merge Dependabot or academic-claim PRs without
review. Prefer **rebase onto `main`** then re-run CI on `lenr-ci` (hosted
checks on older tips often look “failed” from spend-limit / share-refuse noise).
**Merges require an explicit operator ask** — agents prepare and verify only.

## Open PRs — disposition

| PR | Draft | CI on tip | Disposition |
|----|-------|-----------|-------------|
| [#218](https://github.com/ConsciousEnergy/lenr_sim_app/pull/218) `self-hosted-ci-docs-98d8` | yes → **ready** | **CLEAN** (full suite green on `lenr-ci-1`) | **Merge first** — lands dedicated CI docs + smoke gate + Chrome-on-Ubuntu-26 e2e |
| [#220](https://github.com/ConsciousEnergy/lenr_sim_app/pull/220) `release-hygiene-swarm-readiness-98d8` | yes | Rebased onto #218; CI on `lenr-ci-1` | **Merge second** — hygiene inventory + dual-KVM2 Swarm honesty (no cutover) |
| [#209](https://github.com/ConsciousEnergy/lenr_sim_app/pull/209) `v038-handoff-github-sso-98d8` | no | UNSTABLE (stale tip) | **Keep** — still carries `vnc-one-shot-km-ship.sh` missing from `main`; rebase after #218 (overlaps handoff docs already updated via #207/#208) |
| [#210](https://github.com/ConsciousEnergy/lenr_sim_app/pull/210) `v038-vnc-oneshot-on-main-98d8` | yes | UNSTABLE | **Keep** — unlock portal + VNC one-shot still missing from `main`; rebase after #218; prefer over duplicating #209 scripts |
| [#211](https://github.com/ConsciousEnergy/lenr_sim_app/pull/211) `dense-prs-agents-98d8` | closed | — | **CLOSED 2026-09-26** — superseded by #218/#220; remote head deleted |
| [#212](https://github.com/ConsciousEnergy/lenr_sim_app/pull/212) `viz-error-instrument-26dd` | yes | UNSTABLE | **Keep separate** (frontend R3F pin) — rebase, do not mix with CI/infra |
| [#217](https://github.com/ConsciousEnergy/lenr_sim_app/pull/217) `unified-paper-v037-962f` | yes | UNSTABLE | **Academic train** — keep split; rebase only after infra merges |
| [#219](https://github.com/ConsciousEnergy/lenr_sim_app/pull/219) `readme-scope-docs-962f` | yes | UNSTABLE | Public README polish — rebase after #218; good candidate for next docs merge |
| [#213](https://github.com/ConsciousEnergy/lenr_sim_app/pull/213)–[#216](https://github.com/ConsciousEnergy/lenr_sim_app/pull/216) Dependabot | no | UNSTABLE | Batch-rebase after #218; merge only with green `lenr-ci` + dependency-review |

## Remote branches without an open PR

**Deleted 2026-09-26** (heads of already-MERGED PRs / tip fully on `main`):

- `consciousenergy/vps-public-beta-rebase-98d8` (PR #178 MERGED; tip ⊆ `main`)
- `consciousenergy/v038-compose-ship-dispatch-98d8` (#199)
- `consciousenergy/v038-compose-ship-secrets-handoff-98d8` (#200)
- `consciousenergy/v038-ssh-ship-helper-98d8` (#201)
- `consciousenergy/v038-km-tip-proof-docs-98d8` (#202)
- `consciousenergy/v038-ship-host-default-98d8` (#204)
- `consciousenergy/v038-fidelity-honesty-ara-98d8` (#206)
- `consciousenergy/v038-km-auto-bf-98d8` (#196)
- `consciousenergy/v038-infra-prep-98d8` (#197)
- `consciousenergy/v038-fidelity-p0-98d8` (#198)

Keep deleting merged heads promptly (`delete branch on merge` in GitHub settings)
so the open-PR list stays the only remote `consciousenergy/*` noise.

## Merge order (safe)

1. **#218** (dedicated CI) — unblocks truthful green CI for everyone else.
2. **#220** (hygiene + Swarm readiness docs) — after #218 lands on `main` (or squash with #218 if preferred).
3. Rebase **#210** (VNC/unlock) then close or rebase **#209** / **#211**.
4. **#219** (public README) then **#212** (frontend) then **#217** (academic).
5. Dependabot group last.

## Public vs team docs

| Audience | Home | Standard |
|----------|------|----------|
| Public / contributors | root `README.md`, `CONTRIBUTING.md`, `LENR_SIM_APP_v2/README.md` | Scope, how to run, what is **not** claimed; link maturity ledger |
| Team / operators | `docs/v0.3.7-beta/` (train), `docs/v0.3.8-beta/` (Compose ship + staging Swarm), `docs/v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md`, `.github/BRANCHING.md`, `AGENTS.md` | Gates, confirm strings, rollback, no secret material |
| Academic parallel | `PHYSICS_MATURITY_LEDGER.md`, `PROOF_MATRIX.md`, Theory Paper PRs | Stay on separate PRs; `EQ-OPEN-*` remain OPEN |

See also [`DUAL_KVM2_SWARM_READINESS.md`](DUAL_KVM2_SWARM_READINESS.md).
