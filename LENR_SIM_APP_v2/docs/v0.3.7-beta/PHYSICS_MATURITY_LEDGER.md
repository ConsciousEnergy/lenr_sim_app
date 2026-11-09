# Physics maturity ledger — v0.3.7-beta (+ v0.3.8 fidelity axes)

**Narrative source of truth.** Machine twin: [`physics_maturity_ledger.json`](./physics_maturity_ledger.json).  
**Hard line:** Lean / algebra proving non-closure or bounds ≠ proving LENR in nature (`lenr_proved: false`).

**Closure runway (draft only):** what would later discharge or falsify each
`EQ-OPEN-*` — rows stay **OPEN** — see
[`../v0.3.9-beta/EQ_OPEN_CLOSURE_RUNWAY.md`](../v0.3.9-beta/EQ_OPEN_CLOSURE_RUNWAY.md).

## Independent maturity axes (do not collapse)

| Axis | Meaning | Where surfaced |
|------|---------|----------------|
| `model_fidelity` | How faithfully the module represents named author equations / phenomenology | Theory list/run `per_theory`, Theory Testbed chips |
| `empirical_support` | Evidence class for the *claim*, independent of simulator fidelity | Same; never fused with fidelity into one score |
| `claim_tier` | Existing governance scoring weight | Theory Testbed / analytics |
| Established-physics compatibility | Conventional baselines and nulls | `quantum_tunneling`, `null_recombination`, screening-as-shared |

Fidelity ≠ validity. `EQ-OPEN-*` remain OPEN.

| id | module path | UI surface | claim_tier | model_fidelity | empirical_support | proof_status | artifacts | beta_label | R&D_next | priority |
|----|-------------|------------|------------|----------------|-------------------|--------------|-----------|------------|----------|----------|
| EQ-OPEN-MEV-01 | `backend/app/physics_engine/open_questions.py` | Open Questions / WH lab | speculative_exploratory | n/a (open Q) | speculative | OPEN — Lean proves partition/non-closure only | md,json,lean,tex | Speculative | Analytical phonon→nuclear channel | P0 |
| EQ-OPEN-RAD-01 | `open_questions.py`, `many_body/wh_bounds.py` | Open Questions | speculative_exploratory | n/a | speculative | OPEN — Lean harmonic/FC bounds ≠ closure | md,json,lean,tex | Speculative | Analytical Γ_ph/Γ_γ | P0 |
| EQ-OPEN-RATE-01 | `open_questions.py`, `unified_lenr_model/reaction_rate_engine.py` | Open Questions / Unified | speculative_exploratory | n/a | speculative | OPEN — Lean two-body log₁₀N non-closure | md,json,lean,tex | Speculative | Lattice rate under engine caps | P0 |
| EQ-OPEN-EC-01 | `open_question_details.py`, `theories/widom_larsen.py`, `physics/weak_interaction.py` | Open Questions / Theory | speculative_exploratory | n/a | speculative | OPEN — Lean deficit + WeakInteraction \(G_F\)/σ/Boltzmann bounds only (≠ closure) | md,json,lean,tex | Speculative | Condensed-matter ≥0.782 MeV path | P0 |
| EQ-OPEN-YIELD-01 | `open_question_details.py` | Open Questions | empirical_lenr_correlation | n/a | empirical_band | OPEN — EMP band DEF, not discharge | md,json,lean,tex | Beta | Duty-cycle vs Miles band | P0 |
| WH-ENP-01 | `working_hypothesis.py`, `many_body/wh_bounds*.py` | Open Questions WH | speculative_exploratory | exploratory | speculative | Does not close OPEN | md,json,lean | Speculative | Keep exploratory; no UI closure | P0 |
| ENG-BUBBLE-FUSION-01 | `backend/app/physics/bubble_fusion.py` + Bubble Fusion UI | `/bubble-fusion` | approximate | approximate | contested | Clamp/UQ/CR-cap DEF Lean (`EQ-BBL-LIM/BOUND/UQ/CR-CAP-01`); dynamics still approximate — **not** nature proof | md,json,tex,lean | Approximate / Beta | Keep EQ-OPEN-* open; EOS/FEM still deferred | P1 |
| ENG-RP-KM-01 | `physics_engine/bubble_solver.py`, `bubble_lattice_interaction.py` | Unified `/unified-theory` + BF | approximate | approximate | established_hydro | **Approximate (live):** RP low-Mach; KM auto when Mach≥0.3 — domain lemmas `EQ-BBL-RP-DOM-01`; hydro ODE, **not** nuclear-rate proof | md,json,lean,tex | Approximate | Monitor domain limits; keep EQ-OPEN-* open; EOS/FEM still aspirational | P1 |
| ENG-WKB-01 | `physics/wkb_tunneling.py`, Quantum Tunneling UI | `/quantum-tunneling` | established_reference | high | established | **Beta (live):** WKB/Gamow algebraically verified (`EQ-GAMOW-01`); screening domain-limited | md,json,lean | Beta | Domain badges for screening | P1 |
| ENG-THEORY-PIPELINE-01 | `theory_protocol.py` + theories/* | Theory Methods / Unified | speculative_exploratory (default) | per-theory | per-theory | Per-theory Lean/analytics sparse; Holmlid≠Kim; null controls | md,json | Speculative | ARA P1 rebuilds (0.3.9); keep axes separate | P1 |
| ENG-SCREEN-CASIMIR-01 | screening / Casimir / CR² composition | Unified / Theory | approximate | approximate | domain_limited | Domain validity gaps (§9C) | md,json | Approximate | Domain gates in UI | P2 |
| ENG-STUB-EM-MHD-01 | EM PML, MHD two-fluid TODO, heat grid, n/γ | Advanced / internal | stub | incomplete | n/a | Incomplete solvers | md,json | Beta | Finish or hide from public beta | P2 |
| ENG-ASPIRATIONAL-FEM-01 | FEM / Poisson–Schrödinger / COMSOL-class | Theory Methods / paper §3.1 | aspirational | aspirational | n/a | **Aspirational (NOT live):** continuum DEF `EQ-PS-01` + residual/domain/tolerance/non-deploy Lean (`EQ-PS-*`); never public-beta numerics; does **not** close EQ-OPEN-* | md,json,lean | Aspirational | Keep Methods honesty alert; Phase C roadmap only | P3 |
| ENG-WEAK-01 | `physics/weak_interaction.py` Fermi \(G_F\) / σ / Boltzmann EC | Open Questions / paper §2.4 | established_reference (Fermi bookkeeping) | high (PDG/Fermi algebra) | n/a (not a LENR claim) | **PROVED identities only:** `EQ-EC-THRESH/GF/SIGMA/RATE-01` in `WeakInteraction.lean`; **does not** close `EQ-OPEN-EC-01`; `lenr_proved` false | md,json,lean | Reference bookkeeping | Keep Q4 OPEN; no Widom SPEC promotion | P1 |


## Seed sources

- `LENR_SIM_APP_v2/backend/app/physics_engine/open_questions.py`
- `docs/FORMALIZATION/FORMAL_PROOF_STATUS.md`
- `LENR_SIM_APP_v2/docs/PHYSICS_EQUATION_VERIFICATION.md`
- Theory Methods honesty alert on `TheoryPage.jsx`
- `docs/v0.3.8-beta/CMNS_MODEL_FIDELITY_RESPONSE.md`
