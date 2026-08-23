# LENR Simulation Research Rubric Governance (v1)

## Dimensions
- Scientific grounding
- Empirical anchoring
- Uncertainty and falsifiability
- Internal consistency
- Method transparency
- Research UX
- Reproducibility pipeline

## Execution Policy
- Every PR slice must include pre/post rubric estimate and residual risk note.
- No scientific-core slice is complete without uncertainty and falsification evidence.
- Contradiction cases (headline vs detailed observables mismatch) are release-blocking.

## Runtime Contract Mapping
- `confidence_breakdown` -> scientific grounding, empirical anchoring.
- `uncertainty_interval` + `falsification_conditions` -> uncertainty/falsifiability.
- `observables_bridge` -> method transparency and internal consistency.
- `provenance` / `evidence_class` / `claim_tier` -> transparency and research UX.

## Current v0.3.6 Implementation Delta
- Added backend-owned confidence decomposition and weighted scoring.
- Added uncertainty intervals and explicit falsification output fields.
- Added bridge payload for excess heat / helium proxy / radiation bounds.
- Added frontend contradiction flag warning for conflicting headline states.
- Added stellar-scaling MHD context line with strict applicability gate
  (astrophysical regime only) and claim-tier down-weighting in the
  scoring engine (`CLAIM_TIER_MULTIPLIER`).
- Added Dependabot configuration covering pip, npm, github-actions, and
  docker ecosystems; CI now includes a version-consistency gate that
  fails on mismatched runtime version markers.

## Evidence-Tier and Claim-Tier Semantics

These two orthogonal axes classify every theory contribution and must be
read together by operators and reviewers.

### Evidence class (axis 1: *empirical maturity of the theory itself*)
| value                          | meaning                                                         |
| ------------------------------ | --------------------------------------------------------------- |
| `empirical_lenr_correlation`   | replicated observation under LENR conditions                     |
| `speculative_exploratory`      | physically motivated hypothesis with limited replication         |
| `cross_regime_extrapolation`   | scaling imported from non-LENR regimes (e.g. stellar plasmas)    |

### Claim tier (axis 2: *what kind of claim is being asserted*)
| value                          | scoring multiplier | meaning                                                |
| ------------------------------ | ------------------ | ------------------------------------------------------ |
| `validated_lenr_mechanism`     | 1.00               | mechanism satisfies replication + uncertainty gates    |
| `empirical_lenr_correlation`   | 0.90               | correlation replicated, mechanism unsettled            |
| `speculative_exploratory`      | 0.30               | exploratory line visible but heavily down-weighted     |
| `cross_regime_extrapolation`   | 0.20               | included for comparison only, cannot dominate          |

### Why both are shown in the UI
A theory can be an `empirical_lenr_correlation` by evidence (e.g. Miles
heat-helium) while still carrying a conservative claim tier until
independent mechanism-level validation is complete. The UI surfaces both
chips in `TheoryTogglePanel` and the scoring engine applies
`claim_tier_multiplier` to the final score so speculative and
cross-regime lines are visible in the output without silently dominating
empirically-grounded tracks.


---

## Pre-Public Hardening Rubric Delta (2026-08-08)

Rubric impact of the physics-accuracy / reporting-honesty slice. The scoring axes
above are unchanged; what changed is whether reported numbers are *falsifiable*.

### Pre-state defects (all reduce falsifiability to zero for the affected quantity)

| Quantity | Defect | Why it was unfalsifiable |
|---|---|---|
| `enhancement_breakdown.{qed,casimir,rydberg,compression,total}` | each clamped to 1e5 independently | five mechanisms printed the same number, so no prediction could be checked against any one of them |
| `collapse_results.max_temperature_k` | ceiling 1e4 K | below the measured 4e3-1.5e4 K emission band, so the model could not even reproduce experiment |
| `enhancement_breakdown.casimir` | `= compression ** 2` | not an independent mechanism; testing it tested the density term |
| `proton_phases` | hardcoded 0.4 / 0.2 / floored nuclear | invariant across temperature, field and loading, so no condition could refute it |
| `enhancement_timeline` | envelope model, peak from ODE | the timeline and the headline number were not the same physical claim |

### Post-state

| Quantity | Now | Falsification handle |
|---|---|---|
| enhancement mechanisms | ceiling retained, `value_raw` + `log10_value_raw` + `is_saturated` reported | the uncapped magnitude is a checkable prediction; the ceiling is declared as a reporting limit |
| temperature ceiling | 2e6 K, anchored to doi:10.1121/1.416948 | comparable to published peak ion temperatures; measured emission band recorded separately in `REGIME_TEMPERATURE_PROVENANCE` |
| casimir | pressure-driven lattice strain, real `1/d^4` scaling | responds to pressure and to material bulk modulus, both independently measurable |
| proton phases | smooth cascade over `PhaseThresholds` | monotone in enhancement and loading; a measured distribution can contradict it |
| timeline | reads the integrated trajectory, reports `collapse_model` | one collapse claim, checkable against the reported peak |

### Claim-tier discipline

`MAX_ENHANCEMENT_FACTOR` stays at `1e5`. Raising it would have inflated headline
numbers and required governance sign-off; the defect was never the ceiling's value
but that saturation was silent. Reported values still never exceed the tier limit -
`test_physics_benchmark_gates.py` enforces this - but a clamped value is now labelled
as such in both the API and the UI, so no saturated number can be read as a
prediction.

### Governed prediction formalism (2026-08-23)

| Quantity | Now | Falsification handle |
|---|---|---|
| `enhancement_breakdown.prediction.sensitivity_model` | naive product retained for exploration | `total_log10` checkable against mechanism table |
| `enhancement_breakdown.prediction.physics_governed` | grouped max-within-collapse-groups (EQ-BBL-COMP-01) | group winners reported in `groups[]`; must be `< sensitivity_model` at peak |
| `enhancement_breakdown.prediction.claim_tier_display` | `min(physics_governed, 1e5)` | flat breakdown keys and headline `enhancement_factor` use this tier |

### Residual, tracked

- `ProtonPhaseModel.calculate_overlap_probability` returns a number density rather
  than a probability, so it always clips to its 0.1 ceiling. It is excluded from the
  cascade and logged under Known Limitations in
  `docs/PHYSICS_EQUATION_VERIFICATION.md`; it needs renormalising.
- `solve_keller_miksis` is validated but is not yet the default for the
  bubble-lattice route, which still uses the incompressible equation.

## Math-Accuracy Hardening Rubric Delta (2026-08-10)

| Dimension | Pre | Post | Falsification evidence |
|---|---|---|---|
| Numeric correctness | 2/5 (five order-of-magnitude errors live in legacy paths; one locked in by a test) | 4/5 | `tests/test_physics/test_absolute_numeric_gates.py` fails on the old code for E_G (~100 keV vs 986 keV), phonon barrier (0.48 eV vs 0.48 MeV), thermal speed (~1000x), `<sigma*v>` (~6e15), Casimir d-dependence |
| Single-source formulas | 2/5 (three Gamow derivations, one wrong; screening triple-counted in WKB) | 4/5 | Gamow delegated to `core_constants.gamow_energy`; dead `unified_lenr_model.py` monolith deleted; screening applied exactly once (gate: `test_screening_applied_exactly_once`) |
| UI honesty | 3/5 (silent x3.33 radius rescale; Math.random efficiency; unbadged fallbacks) | 4/5 | payload test asserts the slider value is sent unmodified; fallback results carry a visible warning; random metric removed |
| Docs-vs-code consistency | 2/5 (Q=2.45 MeV in tables; log's own TF/adiabatic errors) | 4/5 | corrected docs cross-referenced to code in `PHYSICS_EQUATION_VERIFICATION.md` section 10 |

Residual to 5/5: legacy `app/physics` modules still duplicate some barrier /
rate formalisms (each now individually correct and gated); trapped-state
rectangular-barrier model in `reaction_rate_engine` remains a documented
approximation pending a Coulomb-WKB integral treatment.
