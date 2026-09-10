# Backend→API→Frontend Contract Lock (v0.3.7-beta)

## Contract Version
- `contract_version: "v0.3.7-beta-science-gate-1"`
- Derived as `f"v{settings.APP_VERSION}-science-gate-1"` in both
  `unified_simulation.py` and `theory_pipeline.py` (no hardcoded dual source).

## Theory Pipeline Required Fields
- `combined_enhancement`
- `combined_reaction_rate_modifier`
- `total_energy_watts`
- `per_theory[]` with claim-tier / provenance / uncertainty fields as in v0.3.6 lock
- `observables_bridge`
- `analytics_transparency`

## Honesty
- `lenr_proved` remains false
- `EQ-OPEN-*` remain OPEN
- Campaign invariant `INV-CONTRACT-VERSION` in
  `formalization/predictions/campaign_invariants.json` must match this token
