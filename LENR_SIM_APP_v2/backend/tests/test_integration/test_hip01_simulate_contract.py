"""API contract: HIP-01 coupled heat/He bridge on /api/unified/simulate."""

from __future__ import annotations

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
        "time_steps": 20,
        "total_time": 1.0,
    }
    payload.update(overrides)
    return payload


def test_simulate_bridges_model_output_heat_he() -> None:
    resp = _client().post("/api/unified/simulate", json=_miles_payload())
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["contract_version"].endswith("-science-gate-1")
    obs = data["observables"]
    assert float(obs["excess_heat_watts"]) > 0.0
    assert float(obs["helium4_rate"]) > 0.0
    bridge = data["observables_bridge"]
    assert bridge["excess_heat"]["honesty_class"] == "model_output"
    assert bridge["excess_heat"]["is_model_output"] is True
    assert bridge["excess_heat"]["not_discovery_claim"] is True
    assert bridge["excess_heat"]["lenr_proved"] is False
    assert bridge["coupled_heat_he"]["bridged"] is True
    assert data["validation"]["coupled_heat_he_bridged"] is True
    assert data["validation"]["heat_he_honesty_class"] == "model_output"
    assert data["analytics_transparency"]["is_model_output"] is True
    assert data["analytics_transparency"]["lenr_proved"] is False


def test_simulate_letts_gated_off_by_default() -> None:
    resp = _client().post("/api/unified/simulate", json=_miles_payload())
    assert resp.status_code == 200
    data = resp.json()
    assert data["observables_bridge"]["coupled_heat_he"]["letts_gated_off_non_laser"] is True
    assert data["validation"]["heating_mode"] == "joule"


def test_simulate_photonic_stimulation_arms_letts_path() -> None:
    gated = _client().post("/api/unified/simulate", json=_miles_payload()).json()
    armed = _client().post(
        "/api/unified/simulate",
        json=_miles_payload(
            stimulation={"letts_laser": True, "heating_mode": "photonic"}
        ),
    ).json()
    assert armed["validation"]["heating_mode"] == "photonic"
    assert armed["observables_bridge"]["coupled_heat_he"]["letts_gated_off_non_laser"] is False
    assert float(armed["observables"]["excess_heat_watts"]) > float(
        gated["observables"]["excess_heat_watts"]
    )


def test_simulate_radiant_kasagi_not_letts_dominated() -> None:
    resp = _client().post(
        "/api/unified/simulate",
        json={
            "material": {"host_material": "nickel", "reactant": "hydrogen"},
            "environmental": {
                "temperature": 1100.0,
                "pressure": 101325.0,
                "electric_field": 1e6,
            },
            "lattice": {
                "loading_ratio": 0.4,
                "defect_density": 1e16,
                "grain_size": 1e-6,
                "surface_roughness": 1e-8,
                "radiant_calorimetry": True,
                "h2_absorb_pressure_pa": 250.0,
                "multilayer_stack": "6x(Cu 3.8 nm / Ni 20 nm)",
            },
            "stimulation": {"heating_mode": "radiant"},
            "use_theory_pipeline": True,
            "time_steps": 20,
            "total_time": 1.0,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert float(data["observables"]["excess_heat_watts"]) > 0.0
    assert float(data["observables"]["excess_heat_watts"]) < 5.0
    assert data["validation"]["heating_mode"] == "radiant"
    assert data["observables_bridge"]["coupled_heat_he"]["letts_gated_off_non_laser"] is True
    assert data["observables_bridge"]["excess_heat"]["honesty_class"] == "model_output"


def test_simulate_celani_constantan_host_model_output() -> None:
    resp = _client().post(
        "/api/unified/simulate",
        json={
            "material": {"host_material": "constantan", "reactant": "deuterium"},
            "environmental": {
                "temperature": 900.0,
                "pressure": 101325.0,
                "electric_field": 1e6,
            },
            "lattice": {
                "loading_ratio": 0.5,
                "defect_density": 1e16,
                "grain_size": 50e-9,
                "surface_roughness": 5e-9,
            },
            "stimulation": {"heating_mode": "resistive", "p_resistive_watts": 90.0},
            "use_theory_pipeline": True,
            "time_steps": 20,
            "total_time": 1.0,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["observables_bridge"]["excess_heat"]["honesty_class"] == "model_output"
    assert data["observables_bridge"]["excess_heat"]["lenr_proved"] is False
    assert data["analytics_transparency"]["lenr_proved"] is False
    assert data["validation"]["heating_mode"] == "resistive"
