"""
Test suite for the ALR closed-form and bi-exponential heterogeneous
electron-screening models added from Karahadian et al. (2026), Nat. Commun.,
"Enhanced nuclear fusion in the sub-keV energy regime,"
doi:10.1038/s41467-026-74421-1.

These are opt-in, additional screening models (see
app/physics/electron_screening.py); they do not replace
calculate_enhancement_factor as the pipeline's default screening estimator.
"""

import pytest

from app.physics.electron_screening import (
    calculate_gamow_energy_eV,
    calculate_alr_enhancement,
    calculate_heterogeneous_screening_enhancement,
    KARAHADIAN_2026_HETEROGENEOUS_SCREENING_KEV,
    KARAHADIAN_2026_CROSSOVER_ENERGY_KEV,
    KARAHADIAN_2026_SMOOTHING_WIDTH_KEV,
)


class TestGamowEnergy:
    def test_dd_gamow_energy_positive(self):
        E_G = calculate_gamow_energy_eV(1, 1, 1.0)
        assert E_G > 0

    def test_higher_charge_increases_gamow_energy(self):
        E_G_dd = calculate_gamow_energy_eV(1, 1, 1.0)
        E_G_dp_li = calculate_gamow_energy_eV(1, 3, 1.0)
        assert E_G_dp_li > E_G_dd


class TestALREnhancement:
    def test_enhancement_at_least_one(self):
        # Screening can only increase yield relative to bare nuclei (Ue >= 0).
        enh = calculate_alr_enhancement(6500.0, 800.0)
        assert enh >= 1.0

    def test_zero_screening_gives_unity(self):
        enh = calculate_alr_enhancement(1000.0, 0.0)
        assert enh == pytest.approx(1.0, rel=1e-9)

    def test_lower_energy_gives_larger_enhancement(self):
        enh_high_e = calculate_alr_enhancement(6500.0, 800.0)
        enh_low_e = calculate_alr_enhancement(250.0, 800.0)
        assert enh_low_e > enh_high_e

    def test_larger_screening_potential_gives_larger_enhancement(self):
        enh_low_ue = calculate_alr_enhancement(1000.0, 300.0)
        enh_high_ue = calculate_alr_enhancement(1000.0, 1500.0)
        assert enh_high_ue > enh_low_ue

    def test_rejects_non_positive_energy(self):
        with pytest.raises(ValueError):
            calculate_alr_enhancement(0.0, 800.0)

    def test_rejects_negative_screening_potential(self):
        with pytest.raises(ValueError):
            calculate_alr_enhancement(1000.0, -1.0)

    def test_not_capped_by_max_enhancement_factor(self):
        # MAX_ENHANCEMENT_FACTOR = 1e5 in constants.py; this function must be
        # able to exceed it to reproduce Karahadian et al.'s >1e18 result.
        enh = calculate_alr_enhancement(250.0, 3000.0)
        assert enh > 1e5


class TestHeterogeneousScreeningModel:
    """
    Validates calculate_heterogeneous_screening_enhancement against the
    qualitative and quantitative claims of Karahadian et al. (2026):
    - Ue_eff -> Ue_bulk at high energy (deep implantation)
    - Ue_eff -> Ue_surface at low energy (shallow, defect-rich implantation)
    - Enhancement factor exceeds 1e18 at Ecm = 0.25 keV for Pd
    """

    def test_high_energy_approaches_bulk_asymptote(self):
        pd = KARAHADIAN_2026_HETEROGENEOUS_SCREENING_KEV["palladium"]
        result = calculate_heterogeneous_screening_enhancement(
            energy_cm_keV=6.5,
            Ue_bulk_keV=pd["Ue_bulk"],
            Ue_surface_keV=pd["Ue_surface"],
        )
        assert result["effective_screening_potential_keV"] == pytest.approx(
            pd["Ue_bulk"], abs=0.05
        )
        assert result["regime"] == "bulk_dominated"

    def test_low_energy_approaches_surface_asymptote(self):
        # With the paper's fixed E0=0.6 keV, Delta=0.5 keV, the sigmoid is
        # not fully saturated even at the lowest physically-measured energy
        # (Ecm=0.25 keV, Ue_eff~2.27 of 0.8-3.0 keV span) -- use a tighter,
        # illustrative (E0, Delta) here just to verify the sigmoid direction
        # (low E -> surface value) independent of the specific paper fit.
        pd = KARAHADIAN_2026_HETEROGENEOUS_SCREENING_KEV["palladium"]
        result = calculate_heterogeneous_screening_enhancement(
            energy_cm_keV=0.001,
            Ue_bulk_keV=pd["Ue_bulk"],
            Ue_surface_keV=pd["Ue_surface"],
            crossover_energy_keV=0.1,
            smoothing_width_keV=0.02,
        )
        assert result["effective_screening_potential_keV"] == pytest.approx(
            pd["Ue_surface"], abs=0.05
        )
        assert result["regime"] == "surface_dominated"

    def test_lower_energy_moves_toward_surface_value(self):
        # Using the paper's own fixed (E0, Delta), Ue_eff should still trend
        # monotonically toward the surface value as energy decreases, even
        # if full saturation isn't reached within the measured energy range.
        pd = KARAHADIAN_2026_HETEROGENEOUS_SCREENING_KEV["palladium"]
        ue_high_e = calculate_heterogeneous_screening_enhancement(
            6.5, pd["Ue_bulk"], pd["Ue_surface"]
        )["effective_screening_potential_keV"]
        ue_low_e = calculate_heterogeneous_screening_enhancement(
            0.25, pd["Ue_bulk"], pd["Ue_surface"]
        )["effective_screening_potential_keV"]
        assert ue_low_e > ue_high_e

    def test_pd_enhancement_matches_reported_magnitude_at_lowest_energy(self):
        # Paper: "the fusion enhancement factor approaches or exceeds 1e18
        # for all materials considered ... at the lowest reaction energies."
        pd = KARAHADIAN_2026_HETEROGENEOUS_SCREENING_KEV["palladium"]
        result = calculate_heterogeneous_screening_enhancement(
            energy_cm_keV=0.25,
            Ue_bulk_keV=pd["Ue_bulk"],
            Ue_surface_keV=pd["Ue_surface"],
        )
        assert result["enhancement_factor"] > 1e17

    def test_ti_enhancement_matches_reported_magnitude_at_lowest_energy(self):
        ti = KARAHADIAN_2026_HETEROGENEOUS_SCREENING_KEV["titanium"]
        result = calculate_heterogeneous_screening_enhancement(
            energy_cm_keV=0.25,
            Ue_bulk_keV=ti["Ue_bulk"],
            Ue_surface_keV=ti["Ue_surface"],
        )
        assert result["enhancement_factor"] > 1e15

    def test_monotonic_enhancement_with_decreasing_energy(self):
        pd = KARAHADIAN_2026_HETEROGENEOUS_SCREENING_KEV["palladium"]
        energies_desc = [6.5, 2.5, 2.0, 1.0, 0.5, 0.25]
        enhancements = [
            calculate_heterogeneous_screening_enhancement(
                e, pd["Ue_bulk"], pd["Ue_surface"]
            )["enhancement_factor"]
            for e in energies_desc
        ]
        assert all(
            enhancements[i] < enhancements[i + 1]
            for i in range(len(enhancements) - 1)
        )

    def test_equal_bulk_and_surface_reduces_to_homogeneous_alr(self):
        # If Ue_bulk == Ue_surface, the heterogeneous model must reduce to
        # the plain homogeneous ALR enhancement at that fixed Ue.
        result = calculate_heterogeneous_screening_enhancement(
            energy_cm_keV=1.0, Ue_bulk_keV=0.8, Ue_surface_keV=0.8
        )
        homogeneous = calculate_alr_enhancement(1000.0, 800.0)
        assert result["enhancement_factor"] == pytest.approx(homogeneous, rel=1e-9)

    def test_rejects_non_positive_energy(self):
        with pytest.raises(ValueError):
            calculate_heterogeneous_screening_enhancement(0.0, 0.8, 3.0)

    def test_rejects_non_positive_smoothing_width(self):
        with pytest.raises(ValueError):
            calculate_heterogeneous_screening_enhancement(
                1.0, 0.8, 3.0, smoothing_width_keV=0.0
            )

    def test_default_crossover_and_smoothing_match_paper(self):
        assert KARAHADIAN_2026_CROSSOVER_ENERGY_KEV == pytest.approx(0.6)
        assert KARAHADIAN_2026_SMOOTHING_WIDTH_KEV == pytest.approx(0.5)
