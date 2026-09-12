# Physics maturity ledger — v0.3.7-beta

**Narrative source of truth.** Machine twin: [`physics_maturity_ledger.json`](./physics_maturity_ledger.json).  
**Hard line:** Lean / algebra proving non-closure or bounds ≠ proving LENR in nature (`lenr_proved: false`).

| id | module path | UI surface | claim_tier | proof_status | artifacts | beta_label | R&D_next | priority |
|----|-------------|------------|------------|--------------|-----------|------------|----------|----------|
| EQ-OPEN-MEV-01 | `backend/app/physics_engine/open_questions.py` | Open Questions / WH lab | speculative_exploratory | OPEN — Lean proves partition/non-closure only | md,json,lean,tex | Speculative | Analytical phonon→nuclear channel | P0 |
| EQ-OPEN-RAD-01 | `open_questions.py`, `many_body/wh_bounds.py` | Open Questions | speculative_exploratory | OPEN — Lean harmonic/FC bounds ≠ closure | md,json,lean,tex | Speculative | Analytical Γ_ph/Γ_γ | P0 |
| EQ-OPEN-RATE-01 | `open_questions.py`, `unified_lenr_model/reaction_rate_engine.py` | Open Questions / Unified | speculative_exploratory | OPEN — Lean two-body log₁₀N non-closure | md,json,lean,tex | Speculative | Lattice rate under engine caps | P0 |
| EQ-OPEN-EC-01 | `open_question_details.py`, `theories/widom_larsen.py` | Open Questions / Theory | speculative_exploratory | OPEN — Lean deficit identity only | md,json,lean,tex | Speculative | Condensed-matter ≥0.782 MeV path | P0 |
| EQ-OPEN-YIELD-01 | `open_question_details.py` | Open Questions | empirical_lenr_correlation | OPEN — EMP band DEF, not discharge | md,json,lean,tex | Beta | Duty-cycle vs Miles band | P0 |
| WH-ENP-01 | `working_hypothesis.py`, `many_body/wh_bounds*.py` | Open Questions WH | speculative_exploratory | Does not close OPEN | md,json,lean | Speculative | Keep exploratory; no UI closure | P0 |
| ENG-BUBBLE-FUSION-01 | `backend/app/physics/bubble_fusion.py` + Bubble Fusion UI | `/bubble-fusion` | approximate | Opt-in RP/KM ODE bridge + handoff/verification shipped; KM auto-default and schematic-on-fail honesty still apply | md,json,tex | Approximate / Beta | Next: KM auto-default when Mach warrants (deferred); keep EQ-OPEN-* open | P1 |
| ENG-RP-KM-01 | `physics_engine/bubble_solver.py`, `bubble_lattice_interaction.py` | Unified `/unified-theory` | approximate | RP default; KM opt-in / auto Mach≥0.3 | md,json,lean,tex | Approximate | Make KM default when Mach warrants | P1 |
| ENG-WKB-01 | `physics/wkb_tunneling.py`, Quantum Tunneling UI | `/quantum-tunneling` | established_reference (base) | WKB/Gamow verified algebraically; screening domain-limited | md,json,lean | Beta | Domain badges for screening | P1 |
| ENG-THEORY-PIPELINE-01 | `theory_protocol.py` + theories/* | Theory Methods / Unified | speculative_exploratory (default) | Per-theory Lean/analytics sparse | md,json | Speculative | Per-theory claim_tier chips | P1 |
| ENG-SCREEN-CASIMIR-01 | screening / Casimir / CR² composition | Unified / Theory | approximate | Domain validity gaps (§9C) | md,json | Approximate | Domain gates in UI | P2 |
| ENG-STUB-EM-MHD-01 | EM PML, MHD two-fluid TODO, heat grid, n/γ | Advanced / internal | stub | Incomplete solvers | md,json | Beta | Finish or hide from public beta | P2 |
| ENG-ASPIRATIONAL-FEM-01 | FEM / Poisson–Schrödinger / COMSOL-class | Theory Methods | aspirational | Not on VPS | md,json | Speculative | Keep Methods honesty alert | P3 |

## Seed sources

- `LENR_SIM_APP_v2/backend/app/physics_engine/open_questions.py`
- `docs/FORMALIZATION/FORMAL_PROOF_STATUS.md`
- `LENR_SIM_APP_v2/docs/PHYSICS_EQUATION_VERIFICATION.md`
- Theory Methods honesty alert on `TheoryPage.jsx`
