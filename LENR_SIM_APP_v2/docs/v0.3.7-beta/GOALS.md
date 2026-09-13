# GOALS — v0.3.7-beta

**Train:** physics maturity audit and responsible R&D worktree  
**Branch tip:** `consciousenergy/v0.3.7-beta-98d8`  
**Cursor goal:** registered as “v0.3.7-beta physics maturity audit and responsible R&D worktree”

## Active goals (this train)

1. **Maturity ledger** — inventory incomplete / approximate engines lacking analytical, numerical, or Lean proof (`PHYSICS_MATURITY_LEDGER.md` + `.json`).
2. **Frontend Beta labels** — `EngineMaturityBadge` on Bubble Fusion, Quantum Tunneling, Unified Theory, Theory Methods, Open Questions.
3. **Multi-format proof matrix** — NL + Markdown + JSON + LaTeX + Lean crosswalk (`PROOF_MATRIX.md`); no `EQ-OPEN-*` closures.
4. **Bug + security triage docs** — `BUG_TRIAGE.md`, `SECURITY_RESIDUALS.md`.
5. **Critical-path worktree** — `WORKTREE_OOO.md` order of operations.
6. **Version markers** → `0.3.7-beta` on this branch so testers see the new train.

## In progress (post-governance)

7. **Phase A Bubble Fusion engine truth** — **done** on `consciousenergy/v037-bubble-engine-truth-98d8`: page-owned single fetch, provenance UI (`physics_engine` / `schematic_fallback`), healthy-backend browser evidence (unreachable banner absent). KM default still deferred.

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
