"""
Unit Tests for Collapse Reporting Ceilings
===========================================

The peak collapse temperature/pressure/compression are reported under explicit
ceilings. These tests assert the ceilings are literature-defensible and that a
saturated value is always reported as such, so a clamped number can never be
mistaken for a computed one.

Anchoring literature (see docs/PHYSICS_EQUATION_VERIFICATION.md section 9A):
  - measured emission 4.0e3 - 1.5e4 K, Flannigan & Suslick, Nature 434, 52 (2005)
  - self-consistent hydrodynamics ~1.08e5 K, doi:10.1103/physreve.57.4265
  - peak ion temperature ~2e6 K, Moss et al., doi:10.1121/1.416948
"""

import pytest

from app.physics.bubble_collapse import (
    REGIME_MAX_TEMPERATURE,
    REGIME_TEMPERATURE_PROVENANCE,
    calculate_collapse_temperature,
)
from app.physics_engine.bubble_lattice_interaction import (
    BubbleLatticeInteraction,
    BubbleParameters,
    LatticeParameters,
)

MEASURED_EMISSION_MAX_K = 1.5e4  # Flannigan & Suslick upper bound
HYDRO_PEAK_ION_K = 2.0e6  # Moss et al. peak ion temperature


class TestTemperatureCeilingIsDefensible:
    def test_single_bubble_ceiling_not_below_measured_emission(self):
        """A ceiling below measured emission temperatures truncates experiment.

        This is the specific defect being fixed: the old 1e4 K ceiling sat below
        the 1.5e4 K top of the spectroscopically measured band.
        """
        assert REGIME_MAX_TEMPERATURE["single_bubble"] >= MEASURED_EMISSION_MAX_K

    def test_single_bubble_ceiling_not_above_hydrodynamic_bound(self):
        """The ceiling must stay a bound, not an invitation to unphysical values."""
        assert REGIME_MAX_TEMPERATURE["single_bubble"] <= HYDRO_PEAK_ION_K

    def test_every_regime_has_provenance(self):
        for regime in REGIME_MAX_TEMPERATURE:
            assert regime in REGIME_TEMPERATURE_PROVENANCE, f"{regime} lacks provenance"
            provenance = REGIME_TEMPERATURE_PROVENANCE[regime]
            assert provenance["ceiling_k"] == REGIME_MAX_TEMPERATURE[regime]
            assert provenance["basis"]

    def test_single_bubble_provenance_cites_sources(self):
        provenance = REGIME_TEMPERATURE_PROVENANCE["single_bubble"]
        assert "nature03361" in provenance["measured_citation"]
        assert "10.1121/1.416948" in provenance["simulation_citation"]

    def test_regimes_ordered_by_physical_severity(self):
        """Multi-bubble clouds collapse less symmetrically than a single bubble."""
        assert (
            REGIME_MAX_TEMPERATURE["multi_bubble"]
            < REGIME_MAX_TEMPERATURE["single_bubble"]
        )


class TestCeilingStillBinds:
    def test_ideal_adiabatic_still_requires_a_ceiling(self):
        """CR=1000 with gamma=5/3 gives 3e8 K, so the clamp must still engage."""
        temperature = calculate_collapse_temperature(
            initial_radius=10e-6,
            minimum_radius=10e-9,
            initial_temperature=300.0,
            regime="single_bubble",
        )
        assert temperature == REGIME_MAX_TEMPERATURE["single_bubble"]

    def test_modest_compression_is_not_clamped(self):
        """A physically mild collapse must pass through untouched."""
        temperature = calculate_collapse_temperature(
            initial_radius=10e-6,
            minimum_radius=5e-6,
            initial_temperature=300.0,
            regime="single_bubble",
        )
        assert temperature < REGIME_MAX_TEMPERATURE["single_bubble"]
        assert temperature > 300.0


class TestLimitsProvenanceReported:
    @pytest.fixture
    def collapse(self):
        bubble = BubbleParameters()
        lattice = LatticeParameters.for_material("palladium")
        lattice.loading_ratio = 0.9
        model = BubbleLatticeInteraction(bubble, lattice)
        return model.simulate_collapse(num_cycles=1)

    def test_limits_block_present(self, collapse):
        assert collapse.limits
        for key in ("temperature_k", "pressure_pa", "compression_ratio"):
            assert key in collapse.limits, f"{key} missing from limits"

    def test_limits_expose_ceiling_and_flag(self, collapse):
        for key, limit in collapse.limits.items():
            assert "ceiling" in limit, f"{key} lacks ceiling"
            assert isinstance(limit["is_saturated"], bool), f"{key} lacks flag"
            assert limit["basis"], f"{key} lacks a stated basis"

    def test_reported_values_respect_their_ceilings(self, collapse):
        for key, limit in collapse.limits.items():
            assert limit["value"] <= limit["ceiling"] * (1 + 1e-9), key

    def test_saturation_flag_matches_reported_value(self, collapse):
        temperature = collapse.limits["temperature_k"]
        if temperature["is_saturated"]:
            assert temperature["value"] == pytest.approx(temperature["ceiling"])
        else:
            assert temperature["value"] < temperature["ceiling"]
