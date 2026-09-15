"""Bubble Fusion dynamics_mode: auto KM policy + explicit overrides + Mach diagnostics."""

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
    assert data["dynamics"]["dynamics_mode_requested"] == "legacy"
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
    assert data["dynamics"]["dynamics_mode_requested"] == "rayleigh_plesset"
    assert data["dynamics"]["dynamics_mode_used"] == "rayleigh_plesset"
    assert data["dynamics"]["source"] == "bubble_lattice_interaction"
    assert data["dynamics"]["km_auto_selected"] is False
    assert data["collapse_results"]["max_temperature_k"] > 0


def test_bubble_fusion_keller_miksis_explicit_not_auto() -> None:
    resp = _client().post(
        "/api/physics/bubble-fusion",
        json=_payload(dynamics_mode="keller_miksis"),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["dynamics"]["dynamics_mode_requested"] == "keller_miksis"
    assert data["dynamics"]["dynamics_mode_used"] == "keller_miksis"
    assert data["dynamics"]["km_auto_selected"] is False


def test_bubble_fusion_defaults_list_dynamics_modes() -> None:
    resp = _client().get("/api/physics/bubble-fusion/defaults")
    assert resp.status_code == 200
    data = resp.json()
    assert data["defaults"]["dynamics_mode"] == "auto"
    assert "auto" in data["options"]["dynamics_modes"]
    assert "keller_miksis" in data["options"]["dynamics_modes"]
    assert "rayleigh_plesset" in data["options"]["dynamics_modes"]
    assert "legacy" in data["options"]["dynamics_modes"]


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
    """Explicit KM ODE drive: finite peaks, no false auto flag, verification on."""
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


def test_bubble_fusion_auto_selects_km_when_mach_high() -> None:
    """High-drive auto policy mirrors Unified: RP probe Mach≥0.3 → KM auto-selected."""
    resp = _client().post(
        "/api/physics/bubble-fusion",
        json=_payload(dynamics_mode="auto", acoustic_pressure_bar=4.0),
    )
    assert resp.status_code == 200
    data = resp.json()
    dyn = data["dynamics"]
    assert dyn["dynamics_mode_requested"] == "auto"
    assert dyn["dynamics_mode_used"] == "keller_miksis"
    assert dyn["km_auto_selected"] is True
    assert dyn["km_recommended"] is True
    assert dyn["source"] == "bubble_lattice_interaction"
    assert float(dyn["peak_mach"]) >= 0.0
    assert data["verification"]["passed"] is True
    assert data["tunneling_handoff"]["empirical_claim_tiers_raised"] is False


def test_bubble_fusion_auto_keeps_rp_at_default_drive() -> None:
    """Default BF drive stays under Mach 0.3 on the RP probe → no KM auto-select."""
    resp = _client().post(
        "/api/physics/bubble-fusion",
        json=_payload(dynamics_mode="auto"),
    )
    assert resp.status_code == 200
    data = resp.json()
    dyn = data["dynamics"]
    assert dyn["dynamics_mode_requested"] == "auto"
    assert float(dyn["peak_mach"]) < 0.3
    assert dyn["dynamics_mode_used"] == "rayleigh_plesset"
    assert dyn["km_auto_selected"] is False
    assert data["verification"]["passed"] is True


def test_bubble_fusion_auto_keeps_rp_when_mach_low() -> None:
    """Mild drive under auto stays on Rayleigh–Plesset (no KM auto-select)."""
    resp = _client().post(
        "/api/physics/bubble-fusion",
        json=_payload(dynamics_mode="auto", acoustic_pressure_bar=0.3),
    )
    assert resp.status_code == 200
    data = resp.json()
    dyn = data["dynamics"]
    assert dyn["dynamics_mode_requested"] == "auto"
    assert float(dyn["peak_mach"]) < 0.3
    assert dyn["dynamics_mode_used"] == "rayleigh_plesset"
    assert dyn["km_auto_selected"] is False
    assert data["verification"]["passed"] is True


def test_bubble_fusion_omitted_mode_defaults_to_auto_policy() -> None:
    """Omitting dynamics_mode engages the auto default (additive contract)."""
    body = _payload()
    del body["dynamics_mode"]
    resp = _client().post("/api/physics/bubble-fusion", json=body)
    assert resp.status_code == 200
    data = resp.json()
    assert data["dynamics"]["dynamics_mode_requested"] == "auto"
    assert data["dynamics"]["dynamics_mode_used"] in {
        "rayleigh_plesset",
        "keller_miksis",
    }
