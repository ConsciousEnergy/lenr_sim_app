"""
Unit Tests for Enhancement Saturation Reporting
================================================

Guards the reporting contract that keeps the theory display ceiling from
flattening physically distinct mechanisms into one indistinguishable number.
"""

import math

import pytest

from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR
from app.physics_engine.enhancement_saturation import (
    MECHANISM_KEYS,
    build_saturation_report,
)


# Breakdown produced at the saturating peak conditions that made the UI print
# five identical 1.0000e+5 cells: T=1e4 K, P=1e10 Pa, E=1e14 V/m, CR=1000.
SATURATING_BREAKDOWN = {
    "total": MAX_ENHANCEMENT_FACTOR,  # already clamped upstream
    "screening": 9897.129058657573,
    "phonon": 55.10919378783,
    "qed": 1.0000000000000002e12,
    "casimir": 1e6,
    "rydberg": 5.000005e8,
    "compression": 1e6,
    "loading": 2.4621171572600098,
}


class TestSaturationFlagging:
    def test_saturated_mechanisms_are_flagged(self):
        _, report = build_saturation_report(SATURATING_BREAKDOWN)
        assert report["any_saturated"] is True
        # qed/casimir/rydberg/compression all overshoot the ceiling, as does total.
        assert set(report["saturated_mechanisms"]) == {
            "qed",
            "casimir",
            "rydberg",
            "compression",
            "total",
        }

    def test_unsaturated_mechanisms_are_not_flagged(self):
        _, report = build_saturation_report(SATURATING_BREAKDOWN)
        for key in ("screening", "phonon", "loading"):
            assert report["mechanisms"][key]["is_saturated"] is False

    def test_saturated_mechanisms_remain_distinguishable(self):
        """The whole point: identical display values must carry distinct raw values."""
        capped, report = build_saturation_report(SATURATING_BREAKDOWN)
        saturated = report["saturated_mechanisms"]
        # Displayed values are identical (that is the ceiling doing its job)...
        assert len({capped[k] for k in saturated}) == 1
        # ...but the raw magnitudes must not be, or the breakdown says nothing.
        log10s = {round(report["mechanisms"][k]["log10_value_raw"], 2) for k in saturated}
        assert len(log10s) > 1, "saturated mechanisms collapsed to one raw magnitude"

    def test_nothing_flagged_when_all_below_ceiling(self):
        breakdown = {"total": 100.0, "screening": 10.0, "phonon": 10.0}
        capped, report = build_saturation_report(breakdown)
        assert report["any_saturated"] is False
        assert report["saturated_mechanisms"] == []
        assert capped["screening"] == pytest.approx(10.0)


class TestDisplayCeiling:
    def test_no_reported_value_exceeds_ceiling(self):
        capped, report = build_saturation_report(SATURATING_BREAKDOWN)
        for key, value in capped.items():
            assert value <= MAX_ENHANCEMENT_FACTOR, f"{key} exceeds display ceiling"
        for key, mech in report["mechanisms"].items():
            assert mech["value"] <= MAX_ENHANCEMENT_FACTOR

    def test_below_ceiling_values_pass_through_unchanged(self):
        capped, _ = build_saturation_report(SATURATING_BREAKDOWN)
        assert capped["screening"] == pytest.approx(SATURATING_BREAKDOWN["screening"])
        assert capped["loading"] == pytest.approx(SATURATING_BREAKDOWN["loading"])

    def test_ceiling_is_reported(self):
        _, report = build_saturation_report(SATURATING_BREAKDOWN)
        assert report["ceiling"] == MAX_ENHANCEMENT_FACTOR
        for mech in report["mechanisms"].values():
            assert mech["ceiling"] == MAX_ENHANCEMENT_FACTOR


class TestBackwardCompatibility:
    def test_flat_shape_preserved(self):
        """Existing clients read enhancement_breakdown[key] as a float."""
        capped, _ = build_saturation_report(SATURATING_BREAKDOWN)
        assert set(capped.keys()) == set(SATURATING_BREAKDOWN.keys())
        for value in capped.values():
            assert isinstance(value, float)

    def test_non_numeric_entries_pass_through(self):
        breakdown = dict(SATURATING_BREAKDOWN, mode="peak")
        capped, _ = build_saturation_report(breakdown)
        assert capped["mode"] == "peak"


class TestRawTotal:
    def test_raw_total_is_mechanism_product(self):
        _, report = build_saturation_report(SATURATING_BREAKDOWN)
        # Absent optional keys (e.g. electrolyte) default to 1.0 in the product.
        expected_log10 = sum(
            math.log10(SATURATING_BREAKDOWN.get(k, 1.0)) for k in MECHANISM_KEYS
        )
        assert report["mechanisms"]["total"]["log10_value_raw"] == pytest.approx(
            expected_log10, rel=1e-9
        )

    def test_raw_total_recovered_despite_upstream_clamp(self):
        """total arrives pre-clamped at 1e5; the report must recover the real product."""
        _, report = build_saturation_report(SATURATING_BREAKDOWN)
        assert report["mechanisms"]["total"]["log10_value_raw"] > 30.0

    def test_log10_survives_product_overflow(self):
        """A product past float64 range must still report a finite log10."""
        breakdown = {k: 1e60 for k in MECHANISM_KEYS}
        breakdown["total"] = MAX_ENHANCEMENT_FACTOR
        _, report = build_saturation_report(breakdown)
        total = report["mechanisms"]["total"]
        assert total["value_raw"] is None  # linear product overflowed
        assert total["log10_value_raw"] == pytest.approx(60.0 * len(MECHANISM_KEYS))
        assert total["is_saturated"] is True


class TestNumericalEdgeCases:
    def test_non_finite_mechanism_is_saturated_not_crashing(self):
        breakdown = dict(SATURATING_BREAKDOWN, qed=float("inf"))
        capped, report = build_saturation_report(breakdown)
        assert report["mechanisms"]["qed"]["is_saturated"] is True
        assert report["mechanisms"]["qed"]["value_raw"] is None
        assert capped["qed"] == MAX_ENHANCEMENT_FACTOR

    def test_zero_mechanism_does_not_break_log10(self):
        breakdown = dict(SATURATING_BREAKDOWN, phonon=0.0)
        _, report = build_saturation_report(breakdown)
        assert report["mechanisms"]["phonon"]["log10_value_raw"] == 0.0

    def test_custom_ceiling_respected(self):
        capped, report = build_saturation_report(SATURATING_BREAKDOWN, ceiling=1e3)
        assert report["ceiling"] == 1e3
        assert "screening" in report["saturated_mechanisms"]
        assert capped["screening"] == 1e3
