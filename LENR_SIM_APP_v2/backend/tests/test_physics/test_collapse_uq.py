"""
Uncertainty quantification for collapse observables.

Only the reaction rate carried a real physics interval. Peak temperature, peak
pressure, minimum radius and the mechanism breakdown were bare point estimates,
despite depending on inputs with cited ranges spanning more than a decade (Pd
screening potential is 250-18000 eV).
"""

import numpy as np
import pytest

from app.physics_engine.bubble_lattice_interaction import (
    BubbleLatticeInteraction,
    BubbleParameters,
    LatticeParameters,
)
from app.physics_engine.collapse_uq import (
    COMPRESSION_RATIO_TOLERANCE,
    propagate_collapse_uncertainty,
)

_PERCENTILE_KEYS = ("p05", "p25", "p50", "p75", "p95")


@pytest.fixture
def model() -> BubbleLatticeInteraction:
    bubble = BubbleParameters(
        initial_radius=10e-6,
        driving_pressure=1.5e5,
        frequency=20e3,
        ambient_temperature=298.0,
    )
    return BubbleLatticeInteraction(bubble, LatticeParameters.for_material("palladium"))


def _run(model: BubbleLatticeInteraction, **overrides) -> dict:
    kwargs = {
        "model": model,
        "compression_ratio": 1000.0,
        "temperature_ceiling": 2.0e6,
        "pressure_ceiling": 1.0e10,
        "n_samples": 64,
        "seed": 7,
        "material": "palladium",
    }
    kwargs.update(overrides)
    return propagate_collapse_uncertainty(**kwargs)


class TestObservableIntervals:
    def test_every_observable_carries_an_interval(self, model):
        observables = _run(model)["observables"]
        for name in (
            "peak_temperature_k",
            "peak_pressure_pa",
            "min_radius_um",
            "peak_field_v_m",
        ):
            assert name in observables, f"missing observable: {name}"
            interval = observables[name]["credible_interval"]
            for key in _PERCENTILE_KEYS:
                assert key in interval

    def test_percentiles_are_ordered(self, model):
        observables = _run(model)["observables"]
        for summary in observables.values():
            interval = summary["credible_interval"]
            values = [interval[key] for key in _PERCENTILE_KEYS]
            assert values == sorted(values)

    def test_temperature_interval_has_real_width(self, model):
        interval = _run(model)["observables"]["peak_temperature_k"]["credible_interval"]
        assert interval["p95"] > interval["p05"]

    def test_intervals_respect_the_reporting_ceilings(self, model):
        result = _run(model, temperature_ceiling=1.0e5, pressure_ceiling=1.0e9)
        temperature = result["observables"]["peak_temperature_k"]["credible_interval"]
        pressure = result["observables"]["peak_pressure_pa"]["credible_interval"]
        assert temperature["p95"] <= 1.0e5 * (1 + 1e-9)
        assert pressure["p95"] <= 1.0e9 * (1 + 1e-9)

    def test_units_are_declared(self, model):
        observables = _run(model)["observables"]
        assert observables["peak_temperature_k"]["unit"] == "K"
        assert observables["peak_pressure_pa"]["unit"] == "Pa"
        assert observables["min_radius_um"]["unit"] == "um"


class TestDeterminism:
    def test_same_seed_reproduces_the_interval(self, model):
        first = _run(model, seed=99)["observables"]["peak_temperature_k"]
        second = _run(model, seed=99)["observables"]["peak_temperature_k"]
        assert first == second

    def test_different_seed_changes_the_sample(self, model):
        first = _run(model, seed=1)["observables"]["peak_temperature_k"]["median"]
        second = _run(model, seed=2)["observables"]["peak_temperature_k"]["median"]
        assert first != second

    def test_sample_count_is_bounded(self, model):
        assert _run(model, n_samples=1)["inputs"]["n_samples"] == 16
        assert _run(model, n_samples=100000)["inputs"]["n_samples"] == 4096


class TestMechanismIntervals:
    def test_each_mechanism_has_an_interval(self, model):
        mechanisms = _run(model)["mechanisms"]
        for name in ("screening", "phonon", "qed", "casimir", "rydberg", "compression"):
            assert name in mechanisms
            assert "credible_interval" in mechanisms[name]

    def test_saturated_total_still_reports_a_spread_in_log_space(self, model):
        """`total` is clamped at the display ceiling, so every sample equals 1e5
        and any interval on it is degenerate. The uncapped product is reported in
        log space so a spread survives."""
        result = _run(model)
        capped = result["mechanisms"]["total"]["credible_interval"]
        assert capped["p05"] == pytest.approx(capped["p95"])

        raw = result["log10_total_enhancement_raw"]["credible_interval"]
        assert raw["p95"] > raw["p05"]

    def test_log10_total_is_a_plausible_magnitude(self, model):
        raw = _run(model)["log10_total_enhancement_raw"]["median"]
        # After the mechanism bounds fix the raw product sits near 1e12, not 1e38.
        assert 5.0 < raw < 20.0


class TestSensitivity:
    def test_sensitivity_weights_sum_to_one(self, model):
        for block in _run(model)["sensitivity"].values():
            assert sum(block.values()) == pytest.approx(1.0, abs=1e-6)

    def test_sensitivity_is_not_all_zero(self, model):
        """A degenerate response gave every dimension zero weight, which told the
        reader nothing."""
        block = _run(model)["sensitivity"]["log10_total_enhancement_raw"]
        assert max(block.values()) > 0.0

    def test_compression_dominates_the_enhancement_spread(self, model):
        block = _run(model)["sensitivity"]["log10_total_enhancement_raw"]
        assert max(block, key=block.get) == "compression_ratio"

    def test_polytropic_index_dominates_the_temperature_spread(self, model):
        block = _run(model)["sensitivity"]["peak_temperature"]
        assert max(block, key=block.get) == "polytropic_index"


class TestProvenance:
    def test_sampled_dimensions_declare_their_provenance(self, model):
        dimensions = _run(model)["inputs"]["dimensions"]
        assert dimensions["screening_potential_ev"]["provenance"] == "cited_range"
        assert dimensions["screening_potential_ev"]["citations"]
        # Assumed spread must be distinguishable from measured spread.
        assert dimensions["compression_ratio"]["provenance"] == "model_assumption"
        assert dimensions["polytropic_index"]["provenance"] == "model_assumption"

    def test_compression_band_follows_the_declared_tolerance(self, model):
        dimensions = _run(model, compression_ratio=500.0)["inputs"]["dimensions"]
        band = dimensions["compression_ratio"]
        assert band["low"] == pytest.approx(500.0 * (1 - COMPRESSION_RATIO_TOLERANCE))
        assert band["high"] == pytest.approx(500.0 * (1 + COMPRESSION_RATIO_TOLERANCE))

    def test_compression_band_respects_the_hard_core_limit(self, model):
        dimensions = _run(model, compression_ratio=1000.0)["inputs"]["dimensions"]
        assert dimensions["compression_ratio"]["high"] <= model.MAX_COMPRESSION_RATIO

    def test_claim_tier_and_caveat_are_stated(self, model):
        provenance = _run(model)["provenance"]
        assert provenance["claim_tier"] == "speculative_exploratory"
        assert "model-form error" in provenance["note"]

    def test_sampler_is_recorded(self, model):
        assert "Sobol" in _run(model)["inputs"]["sampler"]


class TestNonInvasive:
    def test_lattice_screening_potential_is_restored(self, model):
        """The breakdown is re-evaluated per sample by mutating the lattice, so the
        original value must be put back or every later call is corrupted."""
        original = model.lattice.screening_potential
        _run(model)
        assert model.lattice.screening_potential == original

    def test_restores_even_when_the_breakdown_raises(self, model):
        original = model.lattice.screening_potential

        def _boom(*_args, **_kwargs):
            raise RuntimeError("breakdown failed")

        model._calculate_enhancement_breakdown = _boom
        with pytest.raises(RuntimeError):
            _run(model)
        assert model.lattice.screening_potential == original

    def test_all_values_are_finite(self, model):
        result = _run(model)
        for summary in result["observables"].values():
            assert np.isfinite(summary["median"])
            for value in summary["credible_interval"].values():
                assert np.isfinite(value)
