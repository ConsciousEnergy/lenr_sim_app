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

