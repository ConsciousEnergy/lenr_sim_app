---
name: api-contract-tester
description: >-
  Write and maintain FastAPI contract tests for LENR_SIM_APP that lock the
  response contract - contract_version, the lenr-run-export-v1 envelope,
  required theory-pipeline fields, claim tiers, and additive backward
  compatibility. Use when adding or changing any /api endpoint, response shape,
  export envelope, or before merging backend API changes.
---

# API Contract Tester

## Overview

Backend API stability here is enforced by integration tests (there is no Pact /
schemathesis layer). When you touch an endpoint, add or update contract tests
that assert the locked fields survive - especially `contract_version`,
`schema_version: lenr-run-export-v1`, claim tiers, and the science-gate required
fields. Changes must be additive: new optional request fields with
legacy-preserving defaults, new response blocks that never break the core body.

## When to Use

- Adding or modifying any `app/api/routes/` or `app/routers/` endpoint.
- Changing a response shape, the export envelope, or the theory-pipeline block.
- Before merging backend API changes (this is a quality gate).

## Process

```
- [ ] 1. Identify the contract surface (endpoint, fields, version tokens)
- [ ] 2. Add/extend a test in backend/tests/test_integration/
- [ ] 3. Assert: status, version tokens, required fields, claim tiers, additivity
- [ ] 4. Assert negatives: invalid input falls back safely, opt-in stays opt-in
- [ ] 5. Run the suite; keep it green and release-blocking
```

Run:

```bash
cd LENR_SIM_APP_v2/backend
pytest tests/test_integration -q
```

## Templates (mirror the existing style)

Use a lazy-imported `TestClient` (so `tests/conftest.py` env setup applies) and
payload builders:

```python
from fastapi.testclient import TestClient

def _client() -> TestClient:
    from app.main import app
    return TestClient(app)

def _base_payload() -> dict:
    return {
        "material": {"host_material": "palladium", "reactant": "deuterium"},
        "environmental": {"temperature": 320.0, "pressure": 101325.0},
        "lattice": {"loading_ratio": 0.9},
        "time_steps": 10,
        "total_time": 1.0,
    }
```

**Contract-version + required fields (theory pipeline):**

```python
def test_simulate_contract_is_locked() -> None:
    resp = _client().post("/api/unified/simulate", json=_base_payload())
    assert resp.status_code == 200
    data = resp.json()
    assert data["contract_version"].endswith("-science-gate-1")
    for field in ("confidence_breakdown", "uncertainty_interval",
                  "falsification_conditions", "provenance"):
        assert field in data, f"missing locked field: {field}"
```

**Reproducibility envelope (`lenr-run-export-v1`):**

```python
def test_export_envelope_is_reproducible() -> None:
    payload = {**_base_payload(), "include_uncertainty": True,
               "uncertainty_samples": 32, "random_seed": 5}
    env = _client().post("/api/unified/export", json=payload).json()
    assert env["schema_version"] == "lenr-run-export-v1"
    assert env["reproducibility"]["seed"] == 5
    assert env["reproducibility"]["deterministic"] is True
    assert isinstance(env["citations"], list)
```

**Claim tiers + opt-in stays opt-in:**

```python
def test_default_rate_is_validated_and_uq_absent() -> None:
    block = _client().post("/api/unified/simulate", json=_base_payload()).json()["reaction_rate_engine"]
    assert block["rate"]["mode"] == "two_body"
    assert block["rate"]["claim_tier"] == "validated_lenr_mechanism"
    assert "uncertainty" not in block          # UQ is opt-in
```

**Safe fallback (negative) + additive backward-compat:**

```python
def test_invalid_mode_falls_back_not_500() -> None:
    payload = {**_base_payload(), "rate_mode": "nonsense_mode"}
    block = _client().post("/api/unified/simulate", json=payload).json()["reaction_rate_engine"]
    assert block["rate"]["mode"] == "two_body"

def test_existing_fields_unchanged() -> None:
    data = _client().post("/api/unified/bubble-lattice", json=_bubble_payload()).json()
    assert data["success"] is True
    assert data["contract_version"].endswith("-science-gate-1")
    assert "collapse_results" in data and "peak_conditions" in data
```

## Rationalizations (excuses -> rebuttal)

- "Pydantic already validates the response." -> Pydantic validates types, not the *contract* (version tokens, tier values, additivity). Assert those explicitly.
- "It is an additive change, nothing breaks." -> Prove it: keep a backward-compat test asserting the old fields + version still exist.
- "I will add the test after merge." -> The science-gate step is release-blocking; an endpoint change without a contract test is not done.

## Red Flags

- A response drops or renames `contract_version`, `schema_version`, or a required science-gate field.
- Invalid input returns 500 instead of a safe fallback / structured 422.
- A previously opt-in feature (UQ ensembles) becomes on-by-default.
- New response block is built non-defensively (an internal error breaks the whole response).

## Verification

- New/updated tests live in `backend/tests/test_integration/` and pass.
- Assertions cover: status, version tokens, required fields, claim tiers, negative/fallback, backward-compat.
- Full integration + physics suites stay green (`pytest tests/test_integration tests/test_physics`).

See [reference.md](reference.md) for the endpoint/field inventory and optional OpenAPI-snapshot approach.
