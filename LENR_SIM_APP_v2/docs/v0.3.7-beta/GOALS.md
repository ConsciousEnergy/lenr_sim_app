# GOALS — v0.3.7-beta

**Train:** physics maturity audit and responsible R&D worktree  
**Branch tip:** `consciousenergy/v0.3.7-beta-98d8`  
**Cursor goal:** registered as “v0.3.7-beta physics maturity audit and responsible R&D worktree”

## Active goals (this train)

1. **Maturity ledger** — inventory incomplete / approximate engines lacking analytical, numerical, or Lean proof (`PHYSICS_MATURITY_LEDGER.md` + `.json`).
2. **Frontend Beta labels** — `EngineMaturityBadge` on Bubble Fusion, Quantum Tunneling, Unified Theory, Theory Methods, Open Questions.
3. **Multi-format proof matrix** — NL + Markdown + JSON + LaTeX + Lean crosswalk (`PROOF_MATRIX.md`); no `EQ-OPEN-*` closures.
3b. **Unified Theory Paper pack** — manuscript synced to v0.3.7-beta sim/math evidence in `.md` / `.txt` / `.tex` / `.lean` under [`paper/`](./paper/) with `PROVENANCE.md` + `simulation_evidence.json`.
4. **Bug + security triage docs** — `BUG_TRIAGE.md`, `SECURITY_RESIDUALS.md`.
5. **Critical-path worktree** — `WORKTREE_OOO.md` order of operations.
6. **Version markers** → `0.3.7-beta` on this branch so testers see the new train.

## Post-governance slices (shipped on tip stack)

7. **Phase A Bubble Fusion engine truth** — **done** on `consciousenergy/v037-bubble-engine-truth-98d8`: page-owned single fetch, provenance UI (`physics_engine` / `schematic_fallback`), healthy-backend browser evidence (unreachable banner absent).
8. **BF UI readability / honesty** — **done** on `consciousenergy/v037-bf-ui-honesty-98d8`: fixed top HUD parity with private-beta readability; analytics empty-state / Lean≠lab-proof residuals.
9. **Phase B gated KM bridge** — **done** on `consciousenergy/v037-bubble-km-bridge-98d8`: opt-in `dynamics_mode` (legacy|rayleigh_plesset|keller_miksis), Mach diagnostics, `tunneling_handoff` claim tiers, `verification` gates. **KM auto-default on BF** shipped on `consciousenergy/v038-km-auto-bf-98d8` (`dynamics_mode=auto`, Mach≥0.3 → KM).

## Deferred queue (in the plan, not implemented here)

| Goal | Priority | Doc |
|------|----------|-----|
| Keller–Miksis default, real-gas EOS, FEM, Poisson–Schrödinger | P2+ | [DEFERRED_MULTIPHYSICS_FIDELITY.md](./DEFERRED_MULTIPHYSICS_FIDELITY.md) |
| Declaring any `EQ-OPEN-*` closed | Research only | Stay `OPEN` in MD/JSON/Lean/UI |
| Public analytics auto-persist | Product + security review | Default remains **off** |
| Claiming energetic / practical freedom outcomes | **Permanent non-goal** | Research-preview honesty |

## Hard invariants

- `lenr_proved: false` — Lean non-closure ≠ nature proof.
- Public SQL writes stay token-gated; SPA must not embed write tokens.
- Schematic / local fallback must never look like validated engine output.
