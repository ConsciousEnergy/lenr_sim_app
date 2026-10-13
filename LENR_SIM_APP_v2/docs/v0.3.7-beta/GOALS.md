# GOALS — v0.3.7-beta

**Train status:** **COMPLETE** as the live Compose public-beta release line  
**Release:** tag / GitHub Release `v0.3.7-beta` (published)  
**Live share:** `https://lenr-sim-beta.conscious.energy` reports `0.3.7-beta`  
**Integration handoff:** new work defaults to long-lived `dev` (`0.3.8-beta`) — see
[`.github/BRANCHING.md`](../../../.github/BRANCHING.md) and
[`../v0.3.8-beta/VERSION_CONTROL.md`](../v0.3.8-beta/VERSION_CONTROL.md).

## Completed on this train

1. **Maturity ledger** — `PHYSICS_MATURITY_LEDGER.md` + `.json` / `.yaml`.
2. **Frontend Beta labels** — `EngineMaturityBadge` on Bubble Fusion, Quantum Tunneling, Unified Theory, Theory Methods, Open Questions.
3. **Multi-format proof matrix** — NL + Markdown + JSON + LaTeX + Lean crosswalk (`PROOF_MATRIX.md`); no `EQ-OPEN-*` closures.
3b. **Unified Theory Paper pack** — manuscript synced under [`paper/`](./paper/) with `PROVENANCE.md` + `simulation_evidence.json`.
4. **Bug + security triage docs** — `BUG_TRIAGE.md`, `SECURITY_RESIDUALS.md`.
5. **Critical-path worktree** — `WORKTREE_OOO.md`.
6. **Version markers** — four surfaces locked to `0.3.7-beta` on `main`.
7. **Phase A Bubble Fusion engine truth** — page-owned fetch + provenance UI.
8. **BF UI readability / honesty** — HUD parity; Lean ≠ lab-proof residuals.
9. **Phase B gated KM bridge + auto** — `dynamics_mode=auto` (Mach≥0.3 → KM).
10. **ICCF-27 science enrichment** — C/SiC/Zr hosts, campaign presets, companion literature (#231).
11. **Dedicated CI** — `lenr-ci-1` on KVM2 `2012566`; share stays runner-free.
12. **Release hygiene** — CHANGELOG `## [v0.3.7-beta]`, published GitHub Release, main+`dev` version trains documented.

## Deferred queue (not a 0.3.7 gap — by design)

| Goal | Priority | Doc |
|------|----------|-----|
| Keller–Miksis always-on default, real-gas EOS, FEM, Poisson–Schrödinger | P2+ | [DEFERRED_MULTIPHYSICS_FIDELITY.md](./DEFERRED_MULTIPHYSICS_FIDELITY.md) |
| Declaring any `EQ-OPEN-*` closed | Research only | Stay `OPEN` in MD/JSON/Lean/UI |
| Public analytics auto-persist | Product + security review | Default remains **off** |
| Claiming energetic / practical freedom outcomes | **Permanent non-goal** | Research-preview honesty |
| Swarm + Traefik + Cloudflare Pages public cutover | v0.3.8 staging → v0.3.9 | [`../v0.3.8-beta/VERSION_CONTROL.md`](../v0.3.8-beta/VERSION_CONTROL.md) |
| UI translations (FR/ES/IT/JA/ZH/RU) | Post-0.3.8 product | [`../v0.3.8-beta/I18N_FUTURE.md`](../v0.3.8-beta/I18N_FUTURE.md) |

## Hard invariants (still binding on `main`)

- `lenr_proved: false` — Lean non-closure ≠ nature proof.
- Public SQL writes stay token-gated; SPA must not embed write tokens.
- Schematic / local fallback must never look like validated engine output.
- Do **not** bump `main` markers to `0.3.8-beta` except via a controlled promote PR from `dev`.
