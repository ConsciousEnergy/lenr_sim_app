# Theory Module Scaffold - Reference

Field reference and wiring touchpoints. Workflow is in [SKILL.md](SKILL.md).

## TheoryModule protocol (`physics_engine/theory_protocol.py`)

Required members (structural/duck-typed - no inheritance needed):
- Properties: `theory_id: str`, `theory_name: str`, `description: str`, `configurable_parameters: dict`
- Methods: `is_applicable(conditions) -> bool`, `calculate(conditions, config=None) -> TheoryContribution`, `get_metadata() -> TheoryMetadata`

## TheoryContribution fields

- Core: `theory_id`, `theory_name`, `enhancement_factor` (default 1.0), `reaction_rate_modifier` (1.0), `energy_output_watts` (0.0)
- `observables: dict[str, float]` - use consistent product keys where relevant: `product_He4`, `product_neutrons`, `product_gamma`
- `parameters_used: dict`, `is_applicable: bool`, `confidence: float` (0-1), `references: list[str]`
- Governance (default conservative): `confidence_breakdown`, `uncertainty_interval`, `falsification_conditions`, `evidence_class="exploratory"`, `reproducibility_tier="exploratory"`, `claim_tier="speculative_exploratory"`, `provenance`

## Wiring touchpoints (do all of them)

1. `theories/<theory_id>.py` - the module.
2. `theory_pipeline.py` - guarded `try/except` registration block; gate legacy/experimental behind a `settings.ENABLE_<FLAG>`.
3. `theory_relationships/defaults.py` - declare synergies/conflicts/overlaps with existing theories so scoring's cross-theory term is correct.
4. `frontend/src/config/theoryVisualizationMap.js` - add an entry tagged with the claim tier (e.g. `speculative_exploratory`, `cross_regime_extrapolation`) so the viz map stays a complete source of truth.
5. Bibliography + `frontend/src/pages/theory-paper/ReferencesSection.jsx` - every new citation key must resolve in both directions (see scientific-citations rule).
6. `tests/test_theory_modules.py` - protocol + calculation test using `assert_theory_protocol` and `assert_valid_contribution`.

## Scoring (`theory_scoring.py`)

Scoring runs over `pipeline.registered_ids`. Cross-theory weight `W_CROSS_THEORY = 0.15`;
confidence composition uses grouped max (no double counting) and respects the
`MAX_ENHANCEMENT_FACTOR = 1e5` cap. A new theory automatically participates once
registered and given relationships.

## Categories & claim tiers

- `category` in metadata: e.g. `primary`, `general`.
- Start `claim_tier="speculative_exploratory"`; only promote (toward `validated_lenr_mechanism`, multiplier 1.0) with cited experimental support. Tiers are mirrored in `frontend/src/utils/theoryGovernance.ts`.

## Standard test conditions (from test_theory_modules.py)

```python
STANDARD_CONDITIONS = {"temperature": 300.0, "loading_ratio": 0.9,
                       "pressure": 101325.0, "electron_density": 6.8e28}
```
