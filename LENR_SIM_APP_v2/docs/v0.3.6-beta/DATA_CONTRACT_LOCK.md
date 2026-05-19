# Backend->API->Frontend Contract Lock (v0.3.6-beta)

## Contract Version
- `contract_version: "v0.3.6-beta-science-gate-1"`

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
- `observables_bridge`
- `analytics_transparency`

## Unified Simulation Required Fields
- `confidence`
- `uncertainty_interval`
- `falsification_conditions`
- `observables_bridge`

## Frontend Ownership
- Frontend renders contract fields and does not compute scientific scores.
- Contradiction checks are UI guardrails only and do not replace backend scoring.

