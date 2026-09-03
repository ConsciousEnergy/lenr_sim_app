# The MeV-Gap Down-Conversion Hypothesis (claim-tier gated)

**Claim tier:** `speculative_exploratory`. **Status:** hypothesis with
falsifiable predictions; NOT a validated result. Owning phase: 6.

## The problem (the "MeV gap")

LENR calorimetry (e.g. Miles, McKubre) reports ~24 MeV of heat per He-4 atom
produced, with **no commensurate flux** of MeV gamma rays or energetic neutrons.
Conventional D+D fusion releases its 23.8 MeV as a prompt gamma (the rare
He-4 branch) or as energetic particles. The open question: **how is a nuclear
(MeV) quantum partitioned into ~10^7 lattice/optical quanta (~eV) without lethal
prompt radiation?** This is the energy-partition / "MeV gap" problem.

## Two coupled, citable mechanisms in this codebase

1. **Phonon-nuclear down-conversion** (Hagelstein, key `hagelstein2025` +
   lossy spin-boson model). A relativistic phonon-nuclear coupling
   matrix element lets a highly-excited nuclear state transfer energy
   coherently to a large phonon occupation, spreading the MeV quantum across
   many low-energy modes. Implemented as a theory module (`hagelstein_phonon`).

2. **KG-RP harmonic locking** (Mulnix, key `mulnix2026`). During cavitation
   collapse the Rayleigh-Plesset bubble dynamics can phase-lock to a
   Klein-Gordon field mode, localising acoustic-drive energy into a narrow
   resonance. Implemented as diagnostics + a coupled-field hypothesis in
   `backend/app/physics_engine/cavitation_kgrp.py`.

The hypothesis under test: **harmonic locking provides a coherent, high-Q
channel that, combined with phonon-nuclear coupling, enables MeV->multi-eV
down-conversion** during the final collapse phase.

For electrolytic PdD, the coupled working hypothesis is **WH-ENP-01**
(Hagelstein cascade on Takahashi TSC geometry). KG-RP locking is an optional
cavitation overlay, not the PdD core. See Lean `LenrFormal.WorkingHypothesis`
and `open_questions.working_hypothesis`. EQ-OPEN-MEV-01 remains OPEN.

## Falsifiable predictions (encoded as gates / diagnostics)

| # | Prediction | Where checked | Falsifier |
|---|------------|---------------|-----------|
| P1 | Excess heat correlates with He-4 at 24 +/- 4 MeV/atom with no MeV gamma burst | `test_experiment_anchored_gates.py` | heat branch is non-aneutronic |
| P2 | Energy localisation requires harmonic locking: `resonant_gain` peaks when KG frequency ~ collapse harmonic; off-resonance gain ~1 | `cavitation_kgrp.integrate_coupled_kg_field` | gain stays ~1 at lock (no resonance) |
| P3 | Locking is a *necessary* (not sufficient) condition: `is_locked` must hold in regimes claiming excess down-conversion | `compute_kgrp_diagnostics` | excess heat reported with detuning > tolerance |
| P4 | The mechanism must not raise the *two-body* rate magnitude; it only opens a down-conversion channel | rate engine keeps `two_body` baseline unchanged | trapped/KG path silently replaces baseline |

## Guardrails

- Nothing in the KG-RP layer modifies RP dynamics or the reaction-rate
  magnitude; it is diagnostic + hypothesis only.
- All outputs carry `claim_tier = speculative_exploratory` and cite
  `mulnix2026` / `hagelstein2025`.
- The coupled-field energy is reported in **model units** (dimensionless gain),
  explicitly not as a physical down-conversion efficiency.

## Change log
- 2026-06-04: Hypothesis documented (Phase 6) with falsifiable predictions.
