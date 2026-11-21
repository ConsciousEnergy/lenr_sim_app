"""API contract: HIP-04 Miles scale + success-odds margins on /simulate."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


def _client() -> TestClient:
    from app.main import app

    return TestClient(app)


def _miles_payload(**overrides) -> dict:
    payload = {
        "material": {"host_material": "palladium", "reactant": "deuterium"},
        "environmental": {
            "temperature": 300.0,
            "pressure": 101325.0,
            "electric_field": 1e6,
        },
        "lattice": {
            "loading_ratio": 0.95,
            "defect_density": 1e16,
            "grain_size": 50e-9,
            "surface_roughness": 5e-9,
        },
        "electrolyte": {"family": "li", "species": "lioh", "molarity_mol_l": 0.3},
        "use_theory_pipeline": True,
        "literature_id": "miles-1993",
        "theory_configs": {
            "miles_heat_helium": {"excess_heat_scale": "literature_peak"}
        },
        "time_steps": 20,
        "total_time": 1.0,
    }
    payload.update(overrides)
    return payload


def test_simulate_stamps_miles_literature_peak_scale() -> None:
    resp = _client().post("/api/unified/simulate", json=_miles_payload())
    assert resp.status_code == 200
    data = resp.json()
    scale = data["analytics_transparency"]["miles_heat_scale"]
    assert scale["excess_heat_scale"] == "literature_peak"
    assert scale["q_is_seed_scale"] is False
    assert float(scale["module_energy_output_watts"]) == pytest.approx(0.52)
    assert scale["lenr_proved"] is False
    assert scale["discovery_grade_eligible"] is False
    assert data["validation"]["miles_heat_scale"]["excess_heat_scale"] == "literature_peak"


def test_simulate_exposes_non_saturating_margins() -> None:
    resp = _client().post("/api/unified/simulate", json=_miles_payload())
    assert resp.status_code == 200
    data = resp.json()
    margins = data["analytics_transparency"]["success_odds_margins"]
    assert margins["schema"] == "lenr-success-odds-margins-v1"
    assert margins["is_model_output"] is True
    assert margins["lenr_proved"] is False
    assert margins["not_discovery_claim"] is True
    assert "rate_space" in margins
    assert "loading_sensitivity" in margins
    assert "oracle_separation" in margins
    assert "enhancement_residual" in margins
    assert float(margins["discrimination_score"]) >= 0.0
    assert margins["oracle_separation"]["sigma_q_is_literature_moe"] is False
