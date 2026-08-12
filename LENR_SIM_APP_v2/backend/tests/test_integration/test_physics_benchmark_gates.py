"""Deterministic V&V benchmark gates for contradiction-sensitive behavior."""

import math

from fastapi.testclient import TestClient


def _get_client() -> TestClient:
    from app.main import app

    return TestClient(app)


def test_bubble_lattice_threshold_boundary_has_reason_code() -> None:
    """Boundary behavior must be explicit and machine-readable."""
    client = _get_client()
    response = client.post(
        "/api/unified/bubble-lattice",
        json={
            "bubble": {
                "initial_radius_um": 10.0,
                "driving_pressure_bar": 1.5,
                "frequency_khz": 20.0,
                "ambient_temperature_k": 300.0,
            },
            "material": {"host_material": "palladium", "reactant": "deuterium"},
            "lattice": {
                "loading_ratio": 0.9,
                "defect_density": 1e16,
                "surface_roughness": 5e-9,
                "grain_size": 50e-9,
                "electrolyte_family": "li",
                "electrolyte_species": "lioh",
                "electrolyte_molarity_mol_l": 0.3,
            },
            "num_cycles": 2,
        },
    )
    assert response.status_code == 200
    payload = response.json()
    validation = payload.get("validation", {})
    assert validation.get("contradiction_reason_code") in {
        "none",
        "threshold_boundary",
        "missing_phase_data",
        "inconsistent_mode",
    }
    peak = payload["peak_conditions"]
    assert peak["enhancement_factor"] <= 1e5
    if peak["enhancement_factor"] >= 1e5:
        assert payload["proton_phases"]["NUCLEAR"] > 0.0

    # The 1e5 ceiling is a claim-tier display limit, so a saturated value must be
    # declared as such rather than passed off as a computed result. Without this the
    # gate would accept a breakdown whose mechanisms had all been silently flattened
    # to the ceiling.
    saturation = peak["enhancement_breakdown"]["saturation"]
    assert saturation["ceiling"] == 1e5
    for mechanism, detail in saturation["mechanisms"].items():
        assert detail["value"] <= saturation["ceiling"], mechanism
        assert isinstance(detail["is_saturated"], bool), mechanism
        # A saturated mechanism must still expose its true magnitude.
        if detail["is_saturated"]:
            assert detail["log10_value_raw"] is not None, mechanism

    # Peak conditions must declare which physical ceilings bound them.
    limits = payload["collapse_results"]["limits"]
    for quantity in ("temperature_k", "pressure_pa", "compression_ratio"):
        assert quantity in limits, quantity
        assert limits[quantity]["value"] <= limits[quantity]["ceiling"] * (1 + 1e-9)

    # Proton phases are a normalised distribution, not an arbitrary set of weights.
    phases = payload["proton_phases"]
    assert math.isclose(sum(phases.values()), 1.0, abs_tol=1e-6)

    # Timeline and peak must come from one collapse model, not two.
    for point in payload["enhancement_timeline"]:
        assert point["collapse_model"] in {
            "rayleigh_plesset_trajectory",
            "analytic_envelope",
        }


def test_theory_pipeline_exposes_overlap_composition_provenance() -> None:
    """Overlapping theories must not stack blindly and must expose exclusions."""
    client = _get_client()
    response = client.post(
        "/api/physics/theories/run",
        json={
            "conditions": {
                "temperature": 300.0,
                "loading_ratio": 0.9,
                "pressure": 101325.0,
                "electron_density": 6.8e28,
            },
            "enabled_theories": [
                "electron_screening",
                "quantum_tunneling",
                "coherent_qed",
                "vysotskii_ccs",
            ],
        },
    )
    assert response.status_code == 200
    payload = response.json()
    provenance = payload.get("composition_provenance", {})
    assert provenance.get("combination_rule") == "grouped_max_confidence_product"
    assert isinstance(provenance.get("applied_groups"), list)
    assert isinstance(provenance.get("excluded_theories"), list)
    assert len(provenance.get("excluded_theories", [])) >= 1


def test_unified_simulation_mode_parity_gate() -> None:
    """Legacy and theory pipeline paths should remain within bounded parity drift."""
    client = _get_client()
    base_payload = {
        "material": {"host_material": "palladium", "reactant": "deuterium"},
        "environmental": {"temperature": 325.0, "pressure": 101325.0, "electric_field": 1e6},
        "lattice": {
            "loading_ratio": 0.9,
            "defect_density": 1e16,
            "grain_size": 50e-9,
            "surface_roughness": 5e-9,
            "electrolyte_family": "li",
            "electrolyte_species": "lioh",
            "electrolyte_molarity_mol_l": 0.3,
        },
        "electrolyte": {"family": "li", "species": "lioh", "molarity_mol_l": 0.3},
        "time_steps": 10,
        "total_time": 1.0,
    }

    legacy = client.post("/api/unified/simulate", json={**base_payload, "use_theory_pipeline": False})
    pipeline = client.post(
        "/api/unified/simulate",
        json={
            **base_payload,
            "use_theory_pipeline": True,
            "enabled_theories": ["electron_screening", "hagelstein_phonon"],
        },
    )

    assert legacy.status_code == 200
    assert pipeline.status_code == 200
    legacy_payload = legacy.json()
    pipeline_payload = pipeline.json()
    legacy_peak = float(legacy_payload["enhancement"]["total"])
    pipeline_peak = float(pipeline_payload["enhancement"]["total"])
    assert math.isfinite(legacy_peak)
    assert math.isfinite(pipeline_peak)
    ratio = pipeline_peak / max(legacy_peak, 1e-12)
    assert 1e-6 <= ratio <= 1e6
