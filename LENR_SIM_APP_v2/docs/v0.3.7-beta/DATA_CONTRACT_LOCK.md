# Backend→API→Frontend Contract Lock (v0.3.7-beta)

## Contract Version
- `contract_version: "v0.3.7-beta-science-gate-1"`
- Derived as `f"v{settings.APP_VERSION}-science-gate-1"` in both
  `unified_simulation.py` and `theory_pipeline.py` (single source; no hardcoded dual).

## Theory Pipeline Required Fields
- `combined_enhancement`
- `combined_reaction_rate_modifier`
- `total_energy_watts`
- `per_theory[]` with:
  - `confidence`
  - `confidence_breakdown`
  - `uncertainty_interval`
  - `falsification_conditions`
  - `evidence_class`
  - `reproducibility_tier`
  - `claim_tier`
  - `provenance`
  - Additive (v0.3.8 fidelity P0; optional content, keys always present):
    - `primary_sources`
    - `theory_model_version`
    - `author_equations_vs_simulator_approximations`
    - `free_or_fitted_parameters`
    - `source_domain_limits`
    - `model_fidelity` (independent of empirical_support)
    - `empirical_support` (independent of model_fidelity)
- `observables_bridge`
- `analytics_transparency`
- `composition_provenance.multiplier_stack_warning` (may be empty string)

## Unified Simulation Required Fields
- `confidence`
- `uncertainty_interval`
- `falsification_conditions`
- `observables_bridge`

## Honesty
- `lenr_proved` remains false
- `EQ-OPEN-*` remain OPEN
- Campaign invariant `INV-CONTRACT-VERSION` in
  `formalization/predictions/campaign_invariants.json` must match this token

## Frontend Ownership
- Frontend renders contract fields and does not compute scientific scores.
- Contradiction checks are UI guardrails only and do not replace backend scoring.
