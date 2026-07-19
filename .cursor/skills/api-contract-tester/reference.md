# API Contract Tester - Reference

Contract surface inventory and optional tooling. Workflow is in [SKILL.md](SKILL.md).

## Version tokens (the locks)

- `contract_version` - theory-pipeline responses; currently ends with `-science-gate-1` (`v0.3.6-beta-science-gate-1`). Assert with `.endswith("-science-gate-1")` so a version bump that keeps the gate does not break the test, but a dropped/renamed field does.
- `schema_version` - export envelope, exactly `"lenr-run-export-v1"`.

## Required theory-pipeline fields (science-gate)

Per `DATA_CONTRACT_LOCK.md`: `confidence_breakdown`, `uncertainty_interval`,
`falsification_conditions`, `provenance`. The frontend renders these; it does not
score. Do not drop or rename them; additive changes only.

## Key endpoints (from `app/api/routes/unified_simulation.py`)

- `POST /api/unified/simulate` - main pipeline; response includes `contract_version`, science-gate fields, and an additive `reaction_rate_engine` block.
- `POST /api/unified/export` - reproducibility envelope (`schema_version`, `reproducibility.seed/deterministic`, `citations`, `claim_tiers_present`).
- `POST /api/unified/bubble-lattice` - bubble+lattice run (`success`, `contract_version`, `collapse_results`, `peak_conditions`, `reaction_rate_engine` with `kgrp`).
- `POST /api/unified/compare`, `GET /api/unified/mechanisms|presets|equations`, `WEBSOCKET /api/unified/bubble-lattice/stream`.

Regenerate the current route list with the architecture-mapping seed script:
`python .cursor/skills/architecture-mapping/scripts/map_endpoints.py`.

## `reaction_rate_engine` block invariants

- Default `rate.mode == "two_body"`, `rate.claim_tier == "validated_lenr_mechanism"`.
- `trapped_state` mode -> `claim_tier == "speculative_exploratory"`.
- UQ is opt-in: `"uncertainty"` absent unless `include_uncertainty=True`; when present it is seeded (`uncertainty.seed`) and ordered (`credible_interval.p05 <= p50 <= p95`).
- Invalid `rate_mode` falls back to `two_body` (never 500).
- `kgrp` diagnostics (bubble-lattice) are `speculative_exploratory`.

## Claim-tier vocabulary

`validated_lenr_mechanism` (1.0) ... `speculative_exploratory` / `cross_regime_extrapolation` (down to 0.2). Mirrored in `frontend/src/utils/theoryGovernance.ts`.

## Optional: OpenAPI snapshot

For structural drift detection without new deps, snapshot the schema and diff:

```python
def test_openapi_snapshot_stable(tmp_path):
    schema = _client().get("/api/openapi.json").json()
    paths = sorted(schema["paths"].keys())
    # Compare `paths` (and operationIds) against a checked-in golden list;
    # fail on removals/renames, allow additions.
```

## Optional: property-based contract fuzzing

`schemathesis` can fuzz the live OpenAPI schema. It is NOT currently a dependency;
adding it is a separate, confirmed change. Prefer the explicit integration tests
above unless broad fuzzing is specifically requested.
