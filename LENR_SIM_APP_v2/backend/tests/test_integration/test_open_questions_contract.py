"""Contract tests for additive open_questions on unified / pipeline routes."""
import pytest
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


def _assert_open_questions(data: dict, *, route_mode: str) -> None:
    oq = data["open_questions"]
    assert oq["schema"] == "lenr-open-questions-v1"
    assert oq["route_mode"] == route_mode
    assert oq["lenr_proved"] is False
    assert oq["determination"]["status"] not in ("LENR_PROVED", "LENR_DISPROVED_AS_THEOREM")
    assert oq["composition"]["not_combinable"] is True
    assert oq["q_mev_gap"]["status"] == "OPEN"
    assert oq["q_radiation"]["status"] == "OPEN"
    q_ec = oq["q_electron_capture"]
    q_yield = oq["q_integrated_yield"]
    assert q_ec["status"] == "OPEN"
    assert q_ec["dimmed"] is True
    assert q_ec["claim_tier"] == "speculative_exploratory"
    assert q_ec["electron_capture_threshold_mev"] == pytest.approx(0.782)
    assert q_ec["mass_renormalization_threshold_mstar_over_me"] == pytest.approx(
        2.53, rel=0.01
    )
    assert isinstance(q_ec["mass_renormalization_threshold_met"], bool)
    assert q_ec["unmet_reason"]
    assert q_ec["occurrence_claimed"] is False
    assert q_yield["status"] == "OPEN"
    assert q_yield["dimmed"] is True
    assert q_yield["claim_tier"] == "empirical_lenr_correlation"
    assert q_yield["observed_integrated_he4_yield_atoms"] is None
    assert q_yield["reported_integrated_yield_discrepancy"]["factor_band"] == [
        1e2,
        1e4,
    ]
    assert q_yield["occurrence_claimed"] is False
    assert all(
        path.get("diagram_spec")
        for path in oq["how"]["mechanism_paths"]
    )


def test_simulate_default_is_additive_and_does_not_close() -> None:
    client = _client()
    resp = client.post("/api/unified/simulate", json=_base_payload())
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["contract_version"] == "v0.3.6-beta-science-gate-1"
    assert data["validation"]["route_mode"] == "legacy_unified_model"
    assert "use_theory_pipeline" not in _base_payload()
    assert data["reaction_rate_engine"]["rate"]["mode"] == "two_body"
    _assert_open_questions(data, route_mode="legacy_unified_model")
    assert data["open_questions"]["determination"]["status"] == "RATE_BUDGET_DOES_NOT_CLOSE"
    assert data["open_questions"]["composition"]["legacy_geometric_mean"] is not None
    assert data["open_questions"]["composition"]["pipeline_combined_enhancement"] is None


def test_simulate_does_not_flip_pipeline_default() -> None:
    client = _client()
    resp = client.post("/api/unified/simulate", json=_base_payload())
    assert resp.json()["validation"]["route_mode"] == "legacy_unified_model"


def test_invalid_rate_mode_still_falls_back_to_two_body() -> None:
    client = _client()
    payload = {**_base_payload(), "rate_mode": "nonsense_mode"}
    resp = client.post("/api/unified/simulate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["reaction_rate_engine"]["rate"]["mode"] == "two_body"
    assert data["open_questions"]["rate_mode"] == "two_body"


def test_trapped_state_includes_two_body_reference() -> None:
    client = _client()
    payload = {**_base_payload(), "rate_mode": "trapped_state"}
    resp = client.post("/api/unified/simulate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["reaction_rate_engine"]["rate"]["mode"] == "trapped_state"
    ref = data["reaction_rate_engine"]["two_body_reference"]
    assert ref["mode"] == "two_body"
    assert data["open_questions"]["q_statistical"]["two_body_reference"]["mode"] == "two_body"
    assert data["open_questions"]["determination"]["status"] == "PRIOR_SENSITIVE_SPEC"


def test_p4_occupation_does_not_auto_flip_rate_mode() -> None:
    client = _client()
    payload = {**_base_payload(), "p_4_occupation": 0.2}
    resp = client.post("/api/unified/simulate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["reaction_rate_engine"]["rate"]["mode"] == "two_body"
    assert data["open_questions"]["rate_mode"] == "two_body"


def test_export_carries_open_questions_inside_results() -> None:
    client = _client()
    resp = client.post("/api/unified/export", json=_base_payload())
    assert resp.status_code == 200
    env = resp.json()
    assert env["schema_version"] == "lenr-run-export-v1"
    assert env["results"]["open_questions"]["schema"] == "lenr-open-questions-v1"
    assert env["results"]["contract_version"].endswith("-science-gate-1")
    assert "EQ-OPEN-MEV-01" in env["provenance"]["open_questions_ids"]


def test_bubble_lattice_open_questions_backward_compatible() -> None:
    client = _client()
    resp = client.post("/api/unified/bubble-lattice", json=_bubble_payload())
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["contract_version"].endswith("-science-gate-1")
    assert "collapse_results" in data
    assert "peak_conditions" in data
    _assert_open_questions(data, route_mode="bubble_lattice_legacy")
    assert data["open_questions"]["composition"]["bubble_peak_enhancement"] is not None
    assert data["open_questions"]["emp_chips"]


def test_pipeline_run_includes_open_questions_and_keeps_not_combinable() -> None:
    client = _client()
    resp = client.post(
        "/api/physics/theories/run",
        json={
            "conditions": {"temperature": 300.0, "loading_ratio": 0.9},
            "enabled_theories": ["electron_screening", "hagelstein_phonon"],
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["contract_version"] == "v0.3.6-beta-science-gate-1"
    assert "bubble_lattice.peak_conditions.enhancement_factor" in data[
        "composition_provenance"
    ]["not_combinable_with"]
    _assert_open_questions(data, route_mode="theory_pipeline")
    illegal = data["open_questions"]["composition"]["illegal_product"]
    assert illegal is None  # only one engine ran


def test_theories_list_does_not_register_oppenheimer_or_hydrino() -> None:
    client = _client()
    ids = [t["theory_id"] for t in client.get("/api/physics/theories").json()]
    assert "oppenheimer_phillips" not in ids
    assert "hydrino" not in ids
    assert "takahashi_tsc" in ids


def test_miles_ingest_does_not_close_two_body() -> None:
    client = _client()
    payload = {
        **_base_payload(),
        "excess_power_W": 1.0,
        "he4_atoms_per_s": 2.63e11,
        "sigma_Q_W": 0.1,
    }
    data = client.post("/api/unified/simulate", json=payload).json()
    assert data["open_questions"]["determination"]["status"] == "OCCURRENCE_ANCHORED_EMP"
    assert data["open_questions"]["occurrence"]["anchored"] is True
    emp = data["open_questions"]["determination"]["oracle_emp"]
    assert emp["miles_band_gate"] is True


def test_occurrence_anchored_has_oracle_b_panel_fields() -> None:
    client = _client()
    payload = {
        **_base_payload(),
        "excess_power_W": 1.0,
        "he4_atoms_per_s": 2.63e11,
    }
    oq = client.post("/api/unified/simulate", json=payload).json()["open_questions"]
    hyps = oq["determination"]["oracle_b"]["hypotheses"]
    assert len(hyps) == 5
    assert "phonon_cascade" in {h["id"] for h in hyps}
    assert oq["how"]["mechanism_paths"]


def test_geometry_mode_fcc_tetrahedral() -> None:
    client = _client()
    payload = {
        **_base_payload(),
        "rate_mode": "trapped_state",
        "geometry_mode": "fcc_tetrahedral",
    }
    data = client.post("/api/unified/simulate", json=payload).json()
    prov = data["reaction_rate_engine"]["rate"]["provenance"]
    assert prov["geometry_mode"] == "fcc_tetrahedral"
    assert data["open_questions"]["nbody"]["geometry_mode"] == "fcc_tetrahedral"


def test_when_block_duty_fraction() -> None:
    client = _client()
    payload = {**_base_payload(), "duty_fraction": 0.5, "total_time": 20.0}
    oq = client.post("/api/unified/simulate", json=payload).json()["open_questions"]
    when = oq["when"]
    assert when["duty_cycle_s"] == 10.0
    assert oq["q_electron_capture"]["status"] == "OPEN"
    assert oq["q_integrated_yield"]["status"] == "OPEN"
    assert oq["lenr_proved"] is False


def test_integrated_yield_uses_miles_conversion_and_duty_cycle() -> None:
    client = _client()
    payload = {
        **_base_payload(),
        "excess_power_W": 1.0,
        "duty_fraction": 0.5,
        "total_time": 20.0,
    }
    oq = client.post("/api/unified/simulate", json=payload).json()["open_questions"]
    q_yield = oq["q_integrated_yield"]
    assert q_yield["expected_he4_rate_per_s"] == pytest.approx(2.62e11, rel=0.01)
    assert q_yield["duty_adjusted_expected_he4_rate_per_s"] == pytest.approx(
        1.31e11, rel=0.01
    )
    assert q_yield["expected_integrated_he4_yield_atoms"] == pytest.approx(
        2.62e12, rel=0.01
    )
    assert q_yield["observed_integrated_he4_yield_atoms"] is None
    assert "time-resolved" in q_yield["retention_time_resolved_caveat"]
    assert q_yield["status"] == "OPEN"
    assert q_yield["occurrence_claimed"] is False
    assert oq["lenr_proved"] is False
