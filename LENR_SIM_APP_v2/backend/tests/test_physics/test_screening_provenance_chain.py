"""Screening saturation provenance must match mechanism_provenance log10 raw."""

from fastapi.testclient import TestClient

from app.physics_engine.bubble_lattice_interaction import (
    BubbleLatticeInteraction,
    BubbleParameters,
    LatticeParameters,
)
from app.physics_engine.enhancement_saturation import build_saturation_report
from app.physics_engine.screening_kernel import compute_screening_enhancement


def _client() -> TestClient:
    from app.main import app

    return TestClient(app)


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


def test_saturation_screening_log10_matches_provenance() -> None:
    resp = _client().post("/api/unified/bubble-lattice", json=_bubble_payload())
    assert resp.status_code == 200
    data = resp.json()

    provenance_log10 = data["collapse_results"]["mechanism_provenance"]["screening"][
        "log10_enhancement_raw"
    ]
    saturation_log10 = (
        data["peak_conditions"]["enhancement_breakdown"]["saturation"]["mechanisms"][
            "screening"
        ]["log10_value_raw"]
    )
    assert saturation_log10 == provenance_log10
    assert saturation_log10 > 5.0


def test_build_saturation_report_accepts_screening_override() -> None:
    model = BubbleLatticeInteraction(BubbleParameters(), LatticeParameters.for_material("palladium"))
    breakdown = model._calculate_enhancement_breakdown(
        temperature=1.17e6,
        pressure=1.0e10,
        electric_field=1.0e14,
        compression=1000.0,
    )
    screening = compute_screening_enhancement(
        temperature_k=1.17e6,
        material="palladium",
        screening_potential_ev=model.lattice.screening_potential,
    )
    _, report = build_saturation_report(
        breakdown,
        mechanism_raw_log10={"screening": screening["log10_enhancement_raw"]},
    )
    assert report["mechanisms"]["screening"]["log10_value_raw"] == screening[
        "log10_enhancement_raw"
    ]
