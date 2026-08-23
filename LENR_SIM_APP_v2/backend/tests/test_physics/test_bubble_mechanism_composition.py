"""
Tests for bubble-lattice grouped composition and three-tier prediction reporting.
"""

import math

import pytest

from app.physics_engine.bubble_lattice_interaction import (
    BubbleLatticeInteraction,
    BubbleParameters,
    LatticeParameters,
)
from app.physics_engine.bubble_mechanism_composition import (
    BUBBLE_MECHANISM_GROUPS,
    COMPOSITION_RULE,
    MECHANISM_PHYSICS_BOUNDS,
    apply_physics_bounds,
    build_prediction_report,
    compose_governed_product,
)
from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR

SATURATING_BREAKDOWN = {
    "total": MAX_ENHANCEMENT_FACTOR,
    "screening": 9897.129058657573,
    "phonon": 55.10919378783,
    "qed": 1.0000000000000002e12,
    "casimir": 1e6,
    "rydberg": 5.000005e8,
    "compression": 1e6,
    "loading": 2.4621171572600098,
}


PEAK_TEMPERATURE_K = 1.16e6
PEAK_PRESSURE_PA = 1.0e10
PEAK_FIELD_V_M = 1.0e14
PEAK_COMPRESSION = 1000.0


def _model(material: str = "palladium") -> BubbleLatticeInteraction:
    bubble = BubbleParameters(
        initial_radius=10e-6,
        driving_pressure=1.5e5,
        frequency=20e3,
        ambient_temperature=298.0,
    )
    return BubbleLatticeInteraction(bubble, LatticeParameters.for_material(material))


class TestMechanismGroups:
    def test_all_mechanisms_assigned_to_exactly_one_group(self):
        assigned = {member for members in BUBBLE_MECHANISM_GROUPS.values() for member in members}
        assert assigned == set(MECHANISM_PHYSICS_BOUNDS.keys())

    def test_correlated_groups_have_multiple_members(self):
        assert len(BUBBLE_MECHANISM_GROUPS["collapse_geometry"]) == 2
        assert len(BUBBLE_MECHANISM_GROUPS["field_coupling"]) == 2


class TestPhysicsBounds:
    def test_rydberg_bounded_at_peak(self):
        model = _model()
        breakdown = model._calculate_enhancement_breakdown(
            PEAK_TEMPERATURE_K, PEAK_PRESSURE_PA, PEAK_FIELD_V_M, PEAK_COMPRESSION
        )
        bounded, meta = apply_physics_bounds(breakdown)
        assert bounded["rydberg"] <= MECHANISM_PHYSICS_BOUNDS["rydberg"]
        assert meta["rydberg"]["is_physics_exceeded"] is False

    def test_qed_negligible_at_peak(self):
        model = _model()
        breakdown = model._calculate_enhancement_breakdown(
            PEAK_TEMPERATURE_K, PEAK_PRESSURE_PA, PEAK_FIELD_V_M, PEAK_COMPRESSION
        )
        bounded, _ = apply_physics_bounds(breakdown)
        assert bounded["qed"] == pytest.approx(1.0, abs=1e-9)


class TestGroupedComposition:
    def test_governed_less_than_naive_at_peak(self):
        model = _model()
        raw = model._calculate_enhancement_breakdown(
            PEAK_TEMPERATURE_K, PEAK_PRESSURE_PA, PEAK_FIELD_V_M, PEAK_COMPRESSION
        )
        prediction = build_prediction_report(raw)
        assert (
            prediction["physics_governed"]["total_log10"]
            < prediction["sensitivity_model"]["total_log10"]
        )

    def test_collapse_geometry_selects_max_not_product(self):
        mechanisms = {
            "screening": 10.0,
            "phonon": 2.0,
            "qed": 1.0,
            "casimir": 100.0,
            "rydberg": 5.0,
            "compression": 50.0,
            "loading": 1.5,
            "electrolyte": 1.0,
        }
        bounded, _ = apply_physics_bounds(mechanisms)
        _, _, groups = compose_governed_product(bounded)
        collapse = next(g for g in groups if g["group"] == "collapse_geometry")
        assert collapse["selected"] == "casimir"
        assert collapse["value"] == pytest.approx(100.0)

    def test_field_coupling_selects_rydberg_over_qed(self):
        mechanisms = {
            "screening": 10.0,
            "phonon": 2.0,
            "qed": 1.01,
            "casimir": 2.0,
            "rydberg": 8.0,
            "compression": 3.0,
            "loading": 1.5,
            "electrolyte": 1.0,
        }
        bounded, _ = apply_physics_bounds(mechanisms)
        _, _, groups = compose_governed_product(bounded)
        field = next(g for g in groups if g["group"] == "field_coupling")
        assert field["selected"] == "rydberg"


class TestThreeTierPrediction:
    def test_prediction_block_shape(self):
        prediction = build_prediction_report(SATURATING_BREAKDOWN)
        assert prediction["composition_rule"] == COMPOSITION_RULE
        assert prediction["not_a_nature_theorem"] is True
        assert "sensitivity_model" in prediction
        assert "physics_governed" in prediction
        assert "claim_tier_display" in prediction

    def test_claim_tier_never_exceeds_ceiling(self):
        prediction = build_prediction_report(SATURATING_BREAKDOWN)
        assert prediction["claim_tier_display"]["total"] <= MAX_ENHANCEMENT_FACTOR

    def test_sensitivity_exceeds_governed_at_saturating_fixture(self):
        prediction = build_prediction_report(SATURATING_BREAKDOWN)
        assert (
            prediction["sensitivity_model"]["total_log10"]
            > prediction["physics_governed"]["total_log10"]
        )

    def test_governed_groups_reported(self):
        prediction = build_prediction_report(SATURATING_BREAKDOWN)
        groups = prediction["physics_governed"]["groups"]
        assert len(groups) == len(BUBBLE_MECHANISM_GROUPS)
        assert all("selected" in group for group in groups)

    def test_moderate_conditions_claim_tier_respects_ceiling(self):
        model = _model()
        raw = model._calculate_enhancement_breakdown(300.0, 1.0e6, 1.0e8, 10.0)
        prediction = build_prediction_report(raw)
        assert prediction["claim_tier_display"]["total"] <= MAX_ENHANCEMENT_FACTOR
        assert prediction["physics_governed"]["total_log10"] < prediction["sensitivity_model"]["total_log10"]

    def test_claim_tier_uses_governed_when_below_ceiling(self):
        model = _model()
        raw = model._calculate_enhancement_breakdown(300.0, 1.0e6, 1.0e8, 10.0)
        prediction = build_prediction_report(raw)
        governed = prediction["physics_governed"]["total"]
        if governed < MAX_ENHANCEMENT_FACTOR:
            assert prediction["claim_tier_display"]["total"] == pytest.approx(governed)

    def test_finite_log10_even_when_product_overflows(self):
        breakdown = {key: 1e60 for key in MECHANISM_PHYSICS_BOUNDS}
        breakdown["total"] = MAX_ENHANCEMENT_FACTOR
        prediction = build_prediction_report(breakdown)
        assert math.isfinite(prediction["sensitivity_model"]["total_log10"])
        assert math.isfinite(prediction["physics_governed"]["total_log10"])
