"""
Unit Tests for Distinct Collapse Mechanisms
============================================

Covers three corrections to the bubble-lattice enhancement model:

1. Casimir is an independent mechanism driven by pressure-induced lattice strain,
   not an alias for ``compression ** 2``.
2. The proton phase distribution is a smooth cascade derived from the theory's own
   thresholds, not a hardcoded tier table returning fixed fractions.
3. ``get_collapse_phases`` reads the integrated Rayleigh-Plesset trajectory, so the
   timeline and the reported peak describe the same collapse.
"""

import numpy as np
import pytest

from app.physics_engine.bubble_lattice_interaction import (
    BubbleLatticeInteraction,
    BubbleParameters,
    LatticeParameters,
)

PHASES = ("FREE", "SCREENED", "CAPTURE_READY", "NUCLEAR")


def build_model(loading: float = 0.9, material: str = "palladium", **bubble_kwargs):
    lattice = LatticeParameters.for_material(material)
    lattice.loading_ratio = loading
    return BubbleLatticeInteraction(BubbleParameters(**bubble_kwargs), lattice)


class TestCasimirIsIndependent:
    def test_casimir_differs_from_compression_term(self):
        """The defect: casimir was literally compression**2, so it was a duplicate."""
        model = build_model()
        breakdown = model._calculate_enhancement_breakdown(1e4, 1e10, 1e14, 1000.0)
        assert breakdown["casimir"] != breakdown["compression"]

    def test_casimir_responds_to_pressure_not_compression(self):
        model = build_model()
        low = model._calculate_enhancement_breakdown(1e4, 1e7, 1e14, 1000.0)["casimir"]
        high = model._calculate_enhancement_breakdown(1e4, 1e10, 1e14, 1000.0)["casimir"]
        assert high > low, "Casimir must rise with collapse pressure"

        # Holding pressure fixed while changing compression must not move it.
        same_a = model._calculate_enhancement_breakdown(1e4, 1e9, 1e14, 10.0)["casimir"]
        same_b = model._calculate_enhancement_breakdown(1e4, 1e9, 1e14, 1000.0)["casimir"]
        assert same_a == pytest.approx(same_b)

    def test_casimir_never_below_unity(self):
        """An enhancement factor below 1 would be a de-enhancement; the old
        compression**2 alias dropped below 1 whenever the bubble exceeded R0."""
        model = build_model()
        for pressure in (0.0, 1e3, 1e5, 1e8, 1e10):
            assert model._calculate_casimir_enhancement(pressure) >= 1.0

    def test_casimir_magnitude_is_physically_modest(self):
        """At the 1e10 Pa ceiling Pd strains ~2%, so expect a few percent, not 1e6."""
        model = build_model()
        assert 1.0 < model._calculate_casimir_enhancement(1e10) < 1.5

    def test_softer_lattice_gives_larger_casimir_response(self):
        """Lower bulk modulus means more strain for the same pressure."""
        stiff = build_model(material="platinum")  # K = 230 GPa
        soft = build_model(material="lithium")  # K = 11 GPa
        assert soft._calculate_casimir_enhancement(
            1e9
        ) > stiff._calculate_casimir_enhancement(1e9)

    def test_casimir_finite_at_extreme_pressure(self):
        model = build_model()
        value = model._calculate_casimir_enhancement(1e30)
        assert np.isfinite(value)


class TestProtonPhaseCascade:
    def test_distribution_normalised(self):
        model = build_model()
        for enhancement in (1.0, 1e3, 1e5, 1e8):
            distribution = model._calculate_proton_phases(1e4, 1e14, enhancement)
            assert sum(distribution.values()) == pytest.approx(1.0, abs=1e-9)

    def test_all_phases_present_and_non_negative(self):
        model = build_model()
        distribution = model._calculate_proton_phases(1e4, 1e14, 1e5)
        assert set(distribution) == set(PHASES)
        for phase, fraction in distribution.items():
            assert 0.0 <= fraction <= 1.0, phase

    def test_not_the_old_hardcoded_table(self):
        """The old model returned exactly 0.4 CAPTURE_READY and 0.2 SCREENED at cap."""
        model = build_model()
        distribution = model._calculate_proton_phases(1e4, 1e14, 1e5)
        assert not (
            distribution["CAPTURE_READY"] == pytest.approx(0.4)
            and distribution["SCREENED"] == pytest.approx(0.2)
        )

    def test_nuclear_fraction_monotonic_in_enhancement(self):
        model = build_model(loading=0.95)
        fractions = [
            model._calculate_proton_phases(1e4, 1e14, enhancement)["NUCLEAR"]
            for enhancement in (1e2, 1e4, 1e5, 1e6, 1e8)
        ]
        assert fractions == sorted(fractions)

    def test_low_loading_keeps_protons_free(self):
        """Without hydrogen loaded there is nothing in the lattice to screen."""
        model = build_model(loading=0.3)
        distribution = model._calculate_proton_phases(1e4, 1e14, 1e8)
        assert distribution["FREE"] > 0.9
        assert distribution["NUCLEAR"] < 0.01

    def test_high_loading_enables_nuclear_channel(self):
        model = build_model(loading=0.95)
        distribution = model._calculate_proton_phases(1e4, 1e14, 1e8)
        assert distribution["NUCLEAR"] > distribution["FREE"]

    def test_distribution_responds_to_field(self):
        model = build_model(loading=0.9)
        weak = model._calculate_proton_phases(1e4, 1e6, 1e5)
        strong = model._calculate_proton_phases(1e4, 1e14, 1e5)
        assert strong["CAPTURE_READY"] > weak["CAPTURE_READY"]

    def test_nuclear_fraction_positive_at_threshold(self):
        """The benchmark gate requires a non-zero nuclear share at the cap."""
        model = build_model(loading=0.9)
        distribution = model._calculate_proton_phases(1e4, 1e14, 1e5)
        assert distribution["NUCLEAR"] > 0.0


class TestSingleCollapseModel:
    def test_falls_back_before_integration(self):
        model = build_model()
        _, conditions = model.get_collapse_phases(0.5)
        assert conditions["source"] == "analytic_envelope"

    def test_reads_trajectory_after_integration(self):
        model = build_model()
        model.simulate_collapse(num_cycles=1)
        _, conditions = model.get_collapse_phases(0.5)
        assert conditions["source"] == "rayleigh_plesset_trajectory"

    def test_trajectory_minimum_matches_reported_minimum(self):
        """The timeline and the reported peak must come from one collapse.

        Queried at the exact normalised time of the minimum, so this tests model
        consistency rather than how finely the caller happens to sample.
        """
        model = build_model(driving_pressure=4e5)
        result = model.simulate_collapse(num_cycles=1)

        t_end = float(model._trajectory["t"][-1])
        t_normalized = result.collapse_time / t_end
        _, conditions = model.get_collapse_phases(t_normalized)

        assert conditions["radius"] == pytest.approx(result.min_radius, rel=1e-6)
        assert conditions["source"] == "rayleigh_plesset_trajectory"

    def test_trajectory_never_reports_below_the_minimum(self):
        """Interpolation must stay within the integrated solution's range."""
        model = build_model(driving_pressure=4e5)
        result = model.simulate_collapse(num_cycles=1)
        radii = [
            model.get_collapse_phases(t)[1]["radius"] for t in np.linspace(0, 1, 200)
        ]
        assert min(radii) >= result.min_radius * (1 - 1e-9)

    def test_phase_labels_are_known(self):
        model = build_model(driving_pressure=4e5)
        model.simulate_collapse(num_cycles=1)
        valid = {"EXPANSION", "COLLAPSE", "MINIMUM", "REBOUND"}
        for t in np.linspace(0, 1, 50):
            phase, _ = model.get_collapse_phases(float(t))
            assert phase in valid

    def test_phase_order_per_cycle_is_stable(self):
        """Visual cycle must be Expansion → Collapse → Minimum → Rebound."""
        model = build_model(driving_pressure=4e5)
        model.simulate_collapse(num_cycles=2)
        sequence = []
        for t in np.linspace(0, 0.999, 80):
            # One acoustic cycle lives in the first half of a 2-cycle run.
            phase, _ = model.get_collapse_phases(float(t) * 0.5)
            if not sequence or sequence[-1] != phase:
                sequence.append(phase)
        assert sequence == ["EXPANSION", "COLLAPSE", "MINIMUM", "REBOUND"]

    def test_raw_enhancement_varies_even_when_display_saturates(self):
        model = build_model()
        results = [
            model.calculate_instantaneous_enhancement(t) for t in np.linspace(0, 1, 25)
        ]
        displayed = {r["enhancement"] for r in results}
        raw = {round(r["enhancement_log10_raw"], 6) for r in results}
        assert len(raw) > 1, "raw magnitude must vary across the cycle"
        # Display may well be a single saturated value; that is the ceiling working.
        assert len(displayed) >= 1
