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


def test_bubble_fusion_includes_tunneling_handoff_and_verification() -> None:
    resp = _client().post("/api/physics/bubble-fusion", json=_payload())
    assert resp.status_code == 200
    data = resp.json()
    handoff = data["tunneling_handoff"]
    assert handoff["collapse_claim_tier"] == "approximate_engine"
    assert handoff["empirical_claim_tiers_raised"] is False
    assert handoff["status"] in {"estimated_sketch", "not_coupled"}
    verification = data["verification"]
    assert verification["passed"] is True
    assert verification["not_silent_schematic"] is True
    assert verification["finite_collapse_fields"]["peak_mach"] is True


def test_bubble_fusion_ode_km_damps_under_mild_drive() -> None:
    """
    Acoustic radiation should not harden collapse vs RP under mild drive.

    At the default 1.2 bar / 2-cycle BF bridge, multi-cycle expansion can make a
    naive min-radius ordering flip even while peak Mach stays lower for KM.
    The authoritative KM→RP (c→∞) gate lives in test_bubble_dynamics_gates; here
    we only assert damping on a mild drive where the lattice ODE is comparable.
    """
    client = _client()
    mild = dict(acoustic_pressure_bar=0.5)
    rp = client.post(
        "/api/physics/bubble-fusion",
        json=_payload(dynamics_mode="rayleigh_plesset", **mild),
    ).json()
    km = client.post(
        "/api/physics/bubble-fusion",
        json=_payload(dynamics_mode="keller_miksis", **mild),
    ).json()
    r_rp = float(rp["collapse_results"]["min_radius_um"])
    r_km = float(km["collapse_results"]["min_radius_um"])
    assert r_km >= r_rp * 0.9
    assert float(km["dynamics"]["peak_mach"]) <= float(rp["dynamics"]["peak_mach"]) * 1.05
    assert km["dynamics"]["km_auto_selected"] is False
    assert km["tunneling_handoff"]["empirical_claim_tiers_raised"] is False
    assert km["verification"]["passed"] is True


def test_bubble_fusion_ode_strong_drive_stays_honest() -> None:
    """Default BF ODE drive: finite peaks, no KM auto-select, verification on."""
    client = _client()
    km = client.post(
        "/api/physics/bubble-fusion",
        json=_payload(dynamics_mode="keller_miksis"),
    ).json()
    assert km["dynamics"]["km_auto_selected"] is False
    assert km["dynamics"]["dynamics_mode_used"] == "keller_miksis"
    assert float(km["collapse_results"]["min_radius_um"]) > 0
    assert float(km["collapse_results"]["peak_mach"]) >= 0
    assert km["verification"]["passed"] is True
    assert km["tunneling_handoff"]["empirical_claim_tiers_raised"] is False
