# Many-body FGR model (UMBF)

**Status:** Bookkeeping library shared by trapped_state rate, Takahashi TSC, and open-questions virtual lab.  
**Not a fourth rate_mode** — rival formalisms replace; they never multiply.

## Core identity (EQ-NBODY-FGR-01)

\[
R = n_{\text{sites}}\, P_{\text{occ}}\, \Gamma_{\text{tun}}\, \frac{|V_{\text{nuc}}|^2}{\hbar}\, C_{\text{lin}}
\]

In code, `fusion_probability` / `f_nuc` absorbs \(|V_{\text{nuc}}|^2\); per-cluster rate is \(\Gamma_{\text{tun}} f_{\text{nuc}} / \tau\).

## Module layout

| File | Role |
|------|------|
| `many_body/fgr_model.py` | Geometry rivals, P4 occupation, collective clamp, volumetric rate |
| `many_body/branching_model.py` | MeV partition sketch, detector γ UL, lattice Γ_ph/Γ_γ open target |
| `reaction_rate_engine.py` | `compute_trapped_state_rate` thin wrapper |
| `open_questions.py` | `when` / `how` blocks surface FGR parameters |

## Rival models (never multiplied)

| Symbol | Rival | IR / Lean |
|--------|-------|-----------|
| `P_occ` | `bernoulli_p4` vs `correlated_condensate` (user ingest) | EQ-TSC-OCC-01 (OPEN) |
| Geometry | `fcc_tetrahedral` (~137 pm) vs `trap_25pm` | EQ-TSC-GEOM-01, EQ-TRAP-SEP-01 |
| `C_lin` | `min(N, 10^6)` linear collective | EQ-COLL-LIN-01 |
| Dicke \(N^2\) | Documented rival only — not default | — |

## Parameter glossary

- `n_sites` — reactant site density from `SimulationConfig`
- `Gamma_tun` — WKB penetration at explicit separation
- `f_nuc` — open matrix element (defaults to 1.0 in trapped_state; MeV-gap unresolved)
- `cluster_lifetime_s` — collapse timescale \(\tau\) (default 1e-20 s)

## Virtual lab wiring

- `how.fgr_parameters` — active mode ledger
- `when.threshold_crossed` — \(R_{\text{mode}} \ge R_{\text{obs}}\) from `excess_power_W` at nominal 1 cm³ volume
- `q_radiation.detector_ul_log10` — from γ UL ingest

## Epistemic rules

- Occurrence EMP (Miles band) ≠ mechanism THM
- `EQ-OPEN-*` rows stay OPEN unless a new THM is added
- Forbidden statuses: `LENR_PROVED`, `LENR_DISPROVED_AS_THEOREM`
