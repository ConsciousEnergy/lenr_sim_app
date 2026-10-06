"""Additive ICCF-27 host and protocol fields must not break /simulate."""

from fastapi.testclient import TestClient


def _client() -> TestClient:
    from app.main import app

    return TestClient(app)


def test_graphite_simulate_is_additive_and_not_pd_fallback() -> None:
    client = _client()
    resp = client.post(
        "/api/unified/simulate",
        json={
            "material": {"host_material": "graphite", "reactant": "hydrogen"},
            "environmental": {"temperature": 1100.0, "pressure": 250.0},
            "lattice": {
                "loading_ratio": 0.4,
                "radiant_calorimetry": True,
                "h2_absorb_pressure_pa": 250.0,
            },
            "time_steps": 10,
            "total_time": 1.0,
            "include_uncertainty": True,
            "uncertainty_samples": 16,
            "random_seed": 13,
        },
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["contract_version"].endswith("-science-gate-1")
    assert data["open_questions"]["lenr_proved"] is False
    uq = (data.get("reaction_rate_engine") or {}).get("uncertainty") or {}
    ci = uq.get("credible_interval") or {}
    assert ci.get("p05") is not None
    assert ci["p05"] <= ci.get("p50", ci["p05"]) <= ci.get("p95", ci["p05"])


def test_zirconium_beam_cell_does_not_raise_claim_tier() -> None:
    client = _client()
    resp = client.post(
        "/api/unified/simulate",
        json={
            "material": {"host_material": "zirconium", "reactant": "deuterium"},
            "environmental": {"temperature": 300.0},
            "lattice": {
                "loading_ratio": 0.9,
                "beam_energy_kev": 2.0,
                "molecular_beam_species": "D1",
            },
            "use_theory_pipeline": True,
            "enabled_theories": ["czerski_thermal_spike", "electron_screening"],
            "time_steps": 10,
            "total_time": 1.0,
        },
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["open_questions"]["lenr_proved"] is False
    assert data["validation"]["route_mode"] == "theory_pipeline"
    breakdown = (data.get("enhancement") or {}).get("breakdown") or {}
    assert any("Czerski" in name or "Thermal Spike" in name for name in breakdown)
