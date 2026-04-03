"""
Phase 4.1: Unit tests validating corrected paper equations (LENR Physics Engine Overhaul).

Validates:
1. Thomas-Fermi screening: k_TF ~ 10^10 m^-1 for Pd, U_s ~ 14.4 eV
2. Strong screening: Salpeter breakdown flagged when U_s/E > 1 (classify_screening_regime)
3. S-factor cross-section: sigma(E) at thermal energies; D+D S~55 keV*b
4. Weak interaction: sigma ~ 10^-47 m^2, THRESHOLD_ELECTRON_MEV = 0.782
5. BEC driven-dissipative: T_c_eff calculation, phase-space density criterion
6. Coherence lengths: xi_e ~ 6.6 nm, xi_D ~ 7.2 pm at 300 K
7. Miles heat-helium: 2.63 x 10^11 atoms/s/W
8. Casimir: F ~ 1.3 mN for A=1 um^2, d=1 nm; domain_valid=False when d<2nm
"""

import math
import pytest
import numpy as np
from scipy import constants as const


# ============ 1. Thomas-Fermi screening ============
def _thomas_fermi_k_TF(n_e: float) -> float:
    """Thomas-Fermi wave vector k_TF = 1/lambda_TF."""
    HBAR = const.hbar
    M_ELECTRON = const.m_e
    EPSILON_0 = const.epsilon_0
    E_CHARGE = const.e
    E_F = (HBAR**2 / (2 * M_ELECTRON)) * (3 * np.pi**2 * n_e) ** (2 / 3)
    lambda_TF = np.sqrt(EPSILON_0 * E_F / (3 * n_e * E_CHARGE**2))
    return 1.0 / lambda_TF


class TestThomasFermiScreening:
    """Thomas-Fermi screening: k_TF ~ 10^10 m^-1 for Pd, U_s in eV range."""

    def test_k_TF_order_for_palladium(self):
        """k_TF ~ 10^10 m^-1 for Pd (n_e=6.8e28)."""
        n_e_pd = 6.8e28
        k_TF = _thomas_fermi_k_TF(n_e_pd)
        assert 0.3e10 <= k_TF <= 5e10, f"k_TF={k_TF:.2e} expected ~10^10 m^-1"

    def test_U_s_for_palladium_thomas_fermi(self):
        """U_s from Thomas-Fermi for Pd is in expected range (10-50 eV)."""
        from app.physics.electron_screening import calculate_screening_potential

        n_e_pd = 6.8e28
        U_s = calculate_screening_potential(n_e_pd, 10.0, 300.0, model="thomas_fermi")
        assert 10.0 <= U_s <= 60.0, f"U_s={U_s:.2f} eV expected ~10-50 eV for Pd"


# ============ 2. Strong screening / Salpeter breakdown ============
class TestStrongScreeningSalpeterBreakdown:
    """Salpeter breakdown flagged when U_s/E > 1."""

    def test_salpeter_breakdown_when_U_s_over_E_gt_1(self):
        """classify_screening_regime: regime=strong and salpeter_valid=False when U_s/E > 1."""
        from app.physics.electron_screening import classify_screening_regime

        U_s = 20.0  # eV
        E = 10.0    # eV
        result = classify_screening_regime(U_s, E)
        assert result["U_s_over_E"] == 2.0
        assert result["regime"] == "strong"
        assert result["salpeter_valid"] is False

    def test_salpeter_valid_when_U_s_over_E_lt_0_1(self):
        """Salpeter valid when U_s/E < 0.1."""
        from app.physics.electron_screening import classify_screening_regime

        result = classify_screening_regime(1.0, 20.0)
        assert result["salpeter_valid"] is True
        assert result["regime"] == "weak"


# ============ 3. S-factor cross-section ============
class TestSFactorCrossSection:
    """S-factor cross-section: D+D S~55 keV*b."""

    def test_D_D_S_factor_and_sigma_at_keV(self):
        """sigma(E) = S/E * exp(-sqrt(E_G/E)); D+D S~55 keV*b."""
        from app.physics.reaction_rates import tunneling_cross_section, calculate_gamow_energy

        E_G = calculate_gamow_energy(1, 1, 1.0)  # D+D reduced mass 1 amu
        sigma = tunneling_cross_section(10.0, E_G, s_factor_keV_barn=55)
        assert sigma > 0
        assert 0.01 <= sigma <= 10.0, f"sigma={sigma:.4f} barns at 10 keV"


# ============ 4. Weak interaction ============
class TestWeakInteraction:
    """Weak interaction: sigma ~ 10^-47 m^2, THRESHOLD_ELECTRON_MEV = 0.782."""

    def test_threshold_electron_mev(self):
        """THRESHOLD_ELECTRON_MEV = 0.782 for p+e -> n+nu_e."""
        from app.physics.weak_interaction import THRESHOLD_ELECTRON_MEV

        assert THRESHOLD_ELECTRON_MEV == pytest.approx(0.782, rel=1e-3)

    def test_sigma_order_of_magnitude(self):
        """Cross-section ~ 10^-47 m^2 at ~1-3 MeV."""
        from app.physics.weak_interaction import calculate_weak_interaction_cross_section

        sig_1mev = calculate_weak_interaction_cross_section(1e6)
        sig_3mev = calculate_weak_interaction_cross_section(3e6)
        assert 1e-49 <= sig_1mev <= 1e-46
        assert 1e-48 <= sig_3mev <= 1e-45
        assert sig_3mev > sig_1mev


# ============ 5. BEC driven-dissipative ============
class TestBECDrivenDissipative:
    """BEC driven-dissipative: T_c_eff, phase-space density criterion."""

    def test_T_c_eff_and_phase_space_density(self):
        """Kim BEC driven_dissipative model computes T_c_eff and phase_space_density."""
        from app.physics_engine.theories.kim_bec import KimBECTheory

        theory = KimBECTheory()
        conditions = {"temperature": 300.0, "loading_ratio": 0.9, "electron_density": 6.8e28}
        config = {"bec_model": "driven_dissipative"}
        contrib = theory.calculate(conditions, config)
        obs = contrib.observables
        assert "T_c_eff" in obs
        assert "phase_space_density" in obs
        assert obs["T_c_eff"] is not None
        assert obs["phase_space_density"] is not None
        assert obs["bec_model"] == "driven_dissipative"


# ============ 6. Coherence lengths ============
class TestCoherenceLengths:
    """xi_e ~ 6.6 nm, xi_D ~ 7.2 pm at 300 K."""

    def test_electronic_coherence_length(self):
        """xi_e ~ 6.6 nm for v_F=1e6 m/s, delta_E=0.1 eV."""
        from app.physics_engine.coherence import calculate_electronic_coherence_length, XI_E_TYPICAL_NM

        xi_e = calculate_electronic_coherence_length(1e6, 0.1)
        assert xi_e > 0
        assert 5.0 <= xi_e * 1e9 <= 8.0, f"xi_e={xi_e*1e9:.2f} nm"
        assert XI_E_TYPICAL_NM == pytest.approx(6.6, rel=0.05)

    def test_nuclear_coherence_length_at_300K(self):
        """xi_D ~ 7.2 pm at 300 K."""
        from app.physics_engine.coherence import (
            calculate_nuclear_coherence_length,
            get_deuteron_thermal_velocity,
            XI_D_TYPICAL_PM,
        )

        v_D = get_deuteron_thermal_velocity(300)
        xi_D = calculate_nuclear_coherence_length(v_D, 0.1)
        assert xi_D > 0
        assert 5.0 <= xi_D * 1e12 <= 10.0, f"xi_D={xi_D*1e12:.2f} pm"
        assert XI_D_TYPICAL_PM == pytest.approx(7.2, rel=0.1)


# ============ 7. Miles heat-helium ============
class TestMilesHeatHelium:
    """Miles heat-helium: 2.63 x 10^11 atoms/s/W."""

    def test_miles_rate_per_watt(self):
        """1 W excess heat -> ~2.63e11 He-4 atoms/s."""
        from app.physics_engine.theories.miles_heat_helium import MILES_RATE_PER_WATT

        rate = MILES_RATE_PER_WATT
        assert 2.0e11 <= rate <= 3.0e11, f"MILES_RATE_PER_WATT={rate:.2e}"


# ============ 8. Casimir ============
class TestCasimir:
    """Casimir: F ~ 1.3 mN for A=1 um^2, d=1 nm; domain_valid=False when d<2nm."""

    def test_casimir_force_magnitude(self):
        """F ~ 1.3 mN for A=1 um^2, d=1 nm (perfect conductors, default eps=1.0)."""
        from app.physics.casimir_forces import calculate_casimir_force

        A = 1e-12  # m^2
        d = 1e-9   # m
        # Default permittivity 1.0 treated as ideal conductors -> ~1.3 mN
        F = calculate_casimir_force(d, A)
        F_mN = abs(F) * 1e3
        assert 1.0 <= F_mN <= 1.5, f"|F|={F_mN:.3f} mN"

    def test_domain_valid_false_when_d_lt_2nm(self):
        """domain_valid=False when d < 2 nm."""
        from app.physics.casimir_forces import calculate_casimir_force_with_metadata

        r = calculate_casimir_force_with_metadata(distance=1e-9, area=1e-12, plasma_frequency=None)
        assert r["domain_valid"] is False
        assert "d<2nm" in r["warning"].lower() or "2nm" in r["warning"]

    def test_domain_valid_true_when_d_ge_2nm(self):
        """domain_valid=True when d >= 2 nm."""
        from app.physics.casimir_forces import calculate_casimir_force_with_metadata

        r = calculate_casimir_force_with_metadata(distance=2e-9, area=1e-12, plasma_frequency=None)
        assert r["domain_valid"] is True
