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

