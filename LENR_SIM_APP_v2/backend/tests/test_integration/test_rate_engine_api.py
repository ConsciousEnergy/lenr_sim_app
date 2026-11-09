"""API integration tests for the additive reaction-rate engine block (Phase 8)."""

import math

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


def test_default_response_includes_two_body_rate_block() -> None:
    client = _client()
    resp = client.post("/api/unified/simulate", json=_base_payload())
    assert resp.status_code == 200
    block = resp.json()["reaction_rate_engine"]
    assert block["rate"]["mode"] == "two_body"
    assert block["rate"]["claim_tier"] == "established_reference"
    # UQ is opt-in: absent by default.
    assert "uncertainty" not in block


def test_trapped_state_mode_with_uncertainty_is_speculative_and_seeded() -> None:
    client = _client()
    payload = {
        **_base_payload(),
        "rate_mode": "trapped_state",
        "include_uncertainty": True,
        "uncertainty_samples": 64,
        "random_seed": 11,
    }
    resp = client.post("/api/unified/simulate", json=payload)
    assert resp.status_code == 200
    block = resp.json()["reaction_rate_engine"]
    assert block["rate"]["mode"] == "trapped_state"
    assert block["rate"]["claim_tier"] == "speculative_exploratory"
    uq = block["uncertainty"]
    assert uq["seed"] == 11
    ci = uq["credible_interval"]
    assert ci["p05"] <= ci["p50"] <= ci["p95"]


def test_invalid_rate_mode_falls_back_to_two_body() -> None:
    client = _client()
    payload = {**_base_payload(), "rate_mode": "nonsense_mode"}
    resp = client.post("/api/unified/simulate", json=payload)
    assert resp.status_code == 200
    assert resp.json()["reaction_rate_engine"]["rate"]["mode"] == "two_body"


def test_export_endpoint_returns_reproducible_envelope() -> None:
    client = _client()
    payload = {
        **_base_payload(),
        "rate_mode": "trapped_state",
        "include_uncertainty": True,
        "uncertainty_samples": 32,
        "random_seed": 5,
    }
    resp = client.post("/api/unified/export", json=payload)
    assert resp.status_code == 200
    env = resp.json()
    assert env["schema_version"] == "lenr-run-export-v1"
    assert env["reproducibility"]["seed"] == 5
    assert env["reproducibility"]["deterministic"] is True
    assert isinstance(env["citations"], list)
    assert "speculative_exploratory" in env["claim_tiers_present"]


def test_shell_pairing_branching_present_when_products_match() -> None:
    client = _client()
    resp = client.post("/api/unified/simulate", json=_base_payload())
    assert resp.status_code == 200
    block = resp.json()["reaction_rate_engine"]
    if "shell_pairing_branching" in block:
        rows = block["shell_pairing_branching"]["matching_reactions"]
        assert all(0.0 <= r["shell_pairing_prior"] <= 1.0 for r in rows)
        assert block["shell_pairing_branching"]["claim_tier"] == "speculative_exploratory"


# ---------------------------------------------------------------------------
# Bubble-lattice endpoint: additive reaction-rate engine block (v0.3.6-beta E2E)
# ---------------------------------------------------------------------------


def _bubble_payload() -> dict:
    return {
        "bubble": {
            "initial_radius_um": 10.0,
            "driving_pressure_bar": 1.5,
            "frequency_khz": 20.0,
            "ambient_temperature_k": 298.0,
        },
        "material": {"host_material": "palladium", "reactant": "deuterium"},
        "lattice": {"loading_ratio": 0.9},
        "num_cycles": 2,
    }


def test_bubble_lattice_default_includes_rate_and_kgrp() -> None:
    client = _client()
    resp = client.post("/api/unified/bubble-lattice", json=_bubble_payload())
    assert resp.status_code == 200
    block = resp.json()["reaction_rate_engine"]
    # Block is populated by default (rate + KG-RP) but UQ stays opt-in.
    assert block["rate"]["mode"] == "two_body"
    assert block["rate"]["claim_tier"] == "established_reference"
    assert "kgrp" in block
    assert block["kgrp"]["claim_tier"] == "speculative_exploratory"
    assert "inputs" in block and block["inputs"]["evaluated_at"] == "collapse_peak"
    assert "uncertainty" not in block


def test_bubble_lattice_trapped_state_with_uncertainty() -> None:
    client = _client()
    payload = {
        **_bubble_payload(),
        "rate_mode": "trapped_state",
        "include_uncertainty": True,
        "uncertainty_samples": 64,
        "random_seed": 7,
    }
    resp = client.post("/api/unified/bubble-lattice", json=payload)
    assert resp.status_code == 200
    block = resp.json()["reaction_rate_engine"]
    assert block["rate"]["mode"] == "trapped_state"
    assert block["rate"]["claim_tier"] == "speculative_exploratory"
    uq = block["uncertainty"]
    assert uq["seed"] == 7
    ci = uq["credible_interval"]
    assert ci["p05"] <= ci["p50"] <= ci["p95"]


def test_bubble_lattice_response_is_backward_compatible() -> None:
    """Existing fields and contract version remain unchanged (additive only)."""
    client = _client()
    resp = client.post("/api/unified/bubble-lattice", json=_bubble_payload())
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["contract_version"].endswith("-science-gate-1")
    assert "collapse_results" in data
    assert "peak_conditions" in data
    assert "reaction_rate_engine" in data


def test_simulate_rate_uq_honesty_floors_and_eq_uq_bf_contract() -> None:
    """WS6 contract: two-body non-closure, 1e5 cap, BF algebra, no lenr_proved."""
    from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR

    client = _client()
    payload = {
        **_base_payload(),
        "include_uncertainty": True,
        "uncertainty_samples": 64,
        "random_seed": 17,
    }
    resp = client.post("/api/unified/simulate", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    rate_block = data["reaction_rate_engine"]
    assert rate_block["rate"]["mode"] == "two_body"
    assert rate_block["rate"]["claim_tier"] == "established_reference"
    uq = rate_block["uncertainty"]
    assert uq["seed"] == 17
    assert uq["interval_kind"] in {"predictive", "posterior_credible"}
    ci = uq["credible_interval"]
    assert ci["p05"] <= ci["p50"] <= ci["p95"]

    oq = data["open_questions"]
    assert oq["determination"]["status"] == "RATE_BUDGET_DOES_NOT_CLOSE"
    oracle_a = oq["determination"]["oracle_a"]
    assert oracle_a["two_body_budget_closes"] is False
    assert oracle_a["log10_n_events_two_body"] == -40.0

    oracle_b = oq["determination"]["oracle_b"]
    hyps = {row["id"]: row for row in oracle_b["hypotheses"]}
    bf = oracle_b["bayes_factor_two_body_vs_null"]
    expected = math.exp(
        hyps["two_body"]["log_evidence"] - hyps["chemical_null"]["log_evidence"]
    )
    assert math.isclose(bf, expected, rel_tol=1e-12)
    assert "LENR_PROVED" in oq["determination"]["forbidden"]
    assert oq["determination"]["status"] != "LENR_PROVED"

    # Composition / enhancement honesty floor remains the governance 1e5 ceiling.
    assert MAX_ENHANCEMENT_FACTOR == 1e5
    if "composition" in oq and oq["composition"].get("pipeline_combined_enhancement") is not None:
        assert oq["composition"]["pipeline_combined_enhancement"] <= MAX_ENHANCEMENT_FACTOR


def test_uq_opt_in_stays_opt_in_on_simulate() -> None:
    """UQ remains absent unless include_uncertainty is requested."""
    client = _client()
    block = client.post("/api/unified/simulate", json=_base_payload()).json()[
        "reaction_rate_engine"
    ]
    assert "uncertainty" not in block
    assert block["rate"]["mode"] == "two_body"
