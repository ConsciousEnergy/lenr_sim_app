"""Phase B: Bubble Fusion dynamics_mode opt-in + Mach diagnostics."""

from __future__ import annotations

from fastapi.testclient import TestClient


def _client() -> TestClient:
    from app.main import app

    return TestClient(app)


def _payload(**overrides):
    body = {
        "initial_radius_um": 10.0,
        "acoustic_pressure_bar": 1.2,
        "frequency_khz": 20.0,
        "ambient_pressure_bar": 1.0,
        "ambient_temperature_k": 298.0,
        "fluid_type": "water",
        "gas_type": "deuterium",
        "gas_fraction": 0.8,
        "dynamics_mode": "legacy",
    }
    body.update(overrides)
    return body


def test_bubble_fusion_legacy_reports_peak_mach_without_auto_km() -> None:
    resp = _client().post("/api/physics/bubble-fusion", json=_payload())
    assert resp.status_code == 200
    data = resp.json()
    assert "collapse_results" in data
    assert "dynamics" in data
    assert data["dynamics"]["dynamics_mode_used"] == "legacy"
    assert data["dynamics"]["km_auto_selected"] is False
    assert isinstance(data["dynamics"]["peak_mach"], (int, float))
    assert data["collapse_results"]["peak_mach"] == data["dynamics"]["peak_mach"]


def test_bubble_fusion_rayleigh_plesset_opt_in_uses_shared_ode() -> None:
    resp = _client().post(
        "/api/physics/bubble-fusion",
        json=_payload(dynamics_mode="rayleigh_plesset"),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["dynamics"]["dynamics_mode_used"] == "rayleigh_plesset"
    assert data["dynamics"]["source"] == "bubble_lattice_interaction"
    assert data["dynamics"]["km_auto_selected"] is False
    assert data["collapse_results"]["max_temperature_k"] > 0


def test_bubble_fusion_keller_miksis_opt_in_not_default() -> None:
    resp = _client().post(
        "/api/physics/bubble-fusion",
        json=_payload(dynamics_mode="keller_miksis"),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["dynamics"]["dynamics_mode_used"] == "keller_miksis"
    assert data["dynamics"]["km_auto_selected"] is False


def test_bubble_fusion_defaults_list_dynamics_modes() -> None:
    resp = _client().get("/api/physics/bubble-fusion/defaults")
    assert resp.status_code == 200
    data = resp.json()
    assert data["defaults"]["dynamics_mode"] == "legacy"
    assert "keller_miksis" in data["options"]["dynamics_modes"]
    assert "rayleigh_plesset" in data["options"]["dynamics_modes"]
