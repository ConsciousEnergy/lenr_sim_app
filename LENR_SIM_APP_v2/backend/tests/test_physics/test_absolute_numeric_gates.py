"""
Absolute numeric gates for core physics quantities.

Most physics tests in this repository check behaviour (monotonicity, caps,
contract shape). These gates instead pin *absolute magnitudes* against
independent references, so an order-of-magnitude regression (wrong constant,
unit slip, missing pi^2) cannot pass silently again. Each gate documents its
reference value.

References:
- Gamow energy E_G = 2*mu*c^2*(pi*alpha*Z1*Z2)^2 ~ 986 keV for D+D
  (standard form; e.g. Clayton, "Principles of Stellar Evolution").
- D+D Coulomb barrier at the touching radius ~ 0.4-0.5 MeV.
- Mean thermal speed v = c*sqrt(8kT/(pi*mu*c^2)) ~ 2.5 km/s for D-D at 300 K.
- Assenbaum, Langanke & Rolfs (1987) Z. Phys. A 327, 461 (screening).
- Bosch & Hale (1992) Nucl. Fusion 32, 611: D(d,n)He3 <sigma*v> at
  T = 2 / 10 keV ~ 3.1e-21 / 6.0e-19 cm^3/s.
- Casimir classical limit F/A = -zeta(3) kT / (8*pi*d^3) (decreases with d).
"""

import numpy as np
import pytest
import scipy.constants as const

pytestmark = [pytest.mark.physics, pytest.mark.unit]

MU_DD_KG = 3.3435837724e-27 / 2.0  # deuteron mass / 2
MU_DD_AMU = MU_DD_KG / const.u

# E_G(D,D) = 2*mu*c^2*(pi*alpha)^2 with the exact D+D reduced mass.
E_G_DD_KEV = 2 * MU_DD_KG * const.c**2 * (np.pi * const.alpha) ** 2 / const.e / 1e3


class TestGamowEnergyGate:
    """Every Gamow-energy implementation must agree at ~986 keV for D+D."""

    def test_reference_value_is_986_kev(self):
        assert E_G_DD_KEV == pytest.approx(986, rel=0.01)

    def test_core_constants_gamow_energy(self):
        from app.physics.core_constants import gamow_energy

        assert gamow_energy(1, 1, MU_DD_KG) == pytest.approx(E_G_DD_KEV, rel=1e-6)

    def test_reaction_rates_gamow_energy(self):
        from app.physics.reaction_rates import calculate_gamow_energy

        # A previous derivation here omitted the pi^2 and returned ~100 keV.
        assert calculate_gamow_energy(1, 1, MU_DD_AMU) == pytest.approx(
            E_G_DD_KEV, rel=0.01
        )

    def test_mhd_compute_gamow_energy(self):
        from app.physics_engine.mhd.nuclear_force_coupling import compute_gamow_energy

        assert compute_gamow_energy(1, 1, MU_DD_AMU) == pytest.approx(
            E_G_DD_KEV, rel=0.01
        )


class TestCoulombBarrierGate:
    """D+D barrier at nuclear contact is a few hundred keV, never ~0.5 eV."""

    def test_core_constants_barrier_kev(self):
        from app.physics.core_constants import coulomb_barrier

        barrier_kev = coulomb_barrier(1, 1)  # default touching radius
        assert 300.0 <= barrier_kev <= 600.0

    def test_phonon_barrier_is_ev_scale_of_mev(self):
        # The phonon module builds its own barrier estimate: for D+D,
        # 1.44 MeV*fm / r_fm ~ 0.48 MeV, i.e. ~4.8e5 eV. A previous version
        # labelled the MeV number as eV (0.48 eV), 10^6 too small.
        nuclear_radius_m = 1.2e-15 * (2 ** (1 / 3) + 2 ** (1 / 3))
        barrier_ev = 1.44e6 * 1 * 1 / (nuclear_radius_m * 1e15)
        assert 3e5 <= barrier_ev <= 6e5

        from app.physics.phonon_modes import calculate_comprehensive_phonon_enhancement
        from app.physics.phonon_modes import LatticeParameters

        result = calculate_comprehensive_phonon_enhancement(
            LatticeParameters(lattice_constant=3.89, debye_temperature=274.0,
                              atomic_mass=106.42),
            temperature=300.0, z1=1, z2=1, a1=2, a2=2
        )
        # A previous version reported this barrier as ~0.48 eV (MeV mislabelled
        # as eV), 10^6 too small.
        assert 3e5 <= result["barrier_height_ev"] <= 6e5
        assert np.isfinite(result["total_enhancement"])


class TestThermalSpeedGate:
    """Mean thermal speed for D-D at 300 K is ~2.5 km/s (not ~2500 km/s)."""

    def test_mean_thermal_speed_magnitude(self):
        from app.physics.quantum_tunneling import mean_thermal_speed

        v = mean_thermal_speed(300.0, MU_DD_AMU * 2)  # reduced mass of D-D pair
        # v = c*sqrt(8kT/(pi*mu*c^2)); ~2.5e3 m/s for mu ~ 1 amu at 300 K.
        assert 1.5e3 <= v <= 4.0e3

    def test_speed_scales_with_sqrt_temperature(self):
        from app.physics.quantum_tunneling import mean_thermal_speed

        v300 = mean_thermal_speed(300.0, 1.0)
        v1200 = mean_thermal_speed(1200.0, 1.0)
        assert v1200 / v300 == pytest.approx(2.0, rel=1e-6)


class TestAssenbaumValidityGate:
    """Screening enhancement checked in its validity regime (Ue << E)."""

    def test_wkb_enhancement_matches_analytic_assenbaum(self):
        from app.physics.core_constants import sommerfeld_parameter
        from app.physics.wkb_tunneling import WKBTunnelingCalculator

        calc = WKBTunnelingCalculator()
        energy_kev, ue_ev = 20.0, 100.0  # Ue/E = 5e-3, deep in validity
        result = calc.calculate_tunneling_probability(
            z1=1, z2=1, a1=2, a2=2,
            energy_kev=energy_kev,
            potential_type='coulomb',
            screening_energy_ev=ue_ev,
            temperature_k=0.0,  # isolate the screening factor
        )
        # The WKB module builds masses from integer mass numbers (a * AMU), so
        # mu = 1.0 amu exactly for a1 = a2 = 2.
        eta = sommerfeld_parameter(1, 1, energy_kev, 1.0 * const.u)
        f_analytic = np.exp(np.pi * eta * (ue_ev / 1000.0) / energy_kev)
        assert result.enhancement_factor == pytest.approx(f_analytic, rel=1e-6)

    def test_screening_applied_exactly_once(self):
        # probability must equal bare probability x enhancement factor; the
        # old path also shifted the energy, triple-counting screening.
        from app.physics.wkb_tunneling import WKBTunnelingCalculator

        calc = WKBTunnelingCalculator()
        kwargs = dict(z1=1, z2=1, a1=2, a2=2, energy_kev=5.0,
                      potential_type='coulomb', temperature_k=0.0)
        bare = calc.calculate_tunneling_probability(screening_energy_ev=0.0, **kwargs)
        screened = calc.calculate_tunneling_probability(screening_energy_ev=300.0, **kwargs)
        assert screened.probability == pytest.approx(
            bare.probability * screened.enhancement_factor, rel=1e-9
        )

    def test_enhancement_capped_at_governance_ceiling(self):
        from app.physics.wkb_tunneling import calculate_dd_tunneling
        from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR

        # Thermal-scale energy with a metal screening potential saturates the
        # exponent; the cap must be the governance ceiling, not 1e10.
        result = calculate_dd_tunneling(0.03, material='palladium')
        assert result.enhancement_factor <= MAX_ENHANCEMENT_FACTOR * (1 + 1e-9)


class TestQValueConsistencyGate:
    """Q-values must agree between the constants table and the MHD module."""

    def test_dd_and_pd_q_values(self):
        from app.physics.core_constants import REACTION_Q_VALUES
        from app.physics_engine.mhd import nuclear_force_coupling as nfc

        sfactors = getattr(nfc, "_DD_SFACTOR_PARAMS")
        assert REACTION_Q_VALUES['d-d_n'] == pytest.approx(
            sfactors["D(d,n)He3"]["Q_value_MeV"], abs=1e-3
        )
        assert REACTION_Q_VALUES['d-d_p'] == pytest.approx(
            sfactors["D(d,p)T"]["Q_value_MeV"], abs=1e-3
        )
        assert REACTION_Q_VALUES['d-d_gamma'] == pytest.approx(
            sfactors["D(d,gamma)He4"]["Q_value_MeV"], abs=1e-3
        )
        pd_params = getattr(nfc, "_PD_SFACTOR_PARAMS")
        assert REACTION_Q_VALUES['p-d'] == pytest.approx(
            pd_params["p(d,gamma)He3"]["Q_value_MeV"], abs=1e-3
        )

    def test_neutron_branch_q_is_not_neutron_kinetic_energy(self):
        # Guard against the recurring 2.45 MeV (neutron KE) vs 3.269 MeV (Q)
        # confusion.
        from app.physics.core_constants import REACTION_Q_VALUES

        assert REACTION_Q_VALUES['d-d_n'] == pytest.approx(3.269, abs=0.01)


class TestSigmaVReferenceGate:
    """<sigma*v> spot-checks against Bosch & Hale (1992) D(d,n)He3 values."""

    @pytest.mark.parametrize(
        "temperature_kev,reference_cm3_s",
        [
            (2.0, 3.11e-21),
            (5.0, 9.13e-20),
            (10.0, 6.02e-19),
        ],
    )
    def test_thermal_average_matches_bosch_hale_scale(
        self, temperature_kev, reference_cm3_s
    ):
        from app.physics.reaction_rates import thermal_average_cross_section

        sigma_v, _ = thermal_average_cross_section(
            temperature_kev, 1, 1, MU_DD_AMU, s_factor_keV_barn=55.0
        )
        # The simplified constant-S model tracks the tabulated values within
        # a factor of ~2 across 2-10 keV; a unit slip is off by >1e15.
        assert reference_cm3_s / 2.5 <= sigma_v <= reference_cm3_s * 2.5


class TestCasimirHighTemperatureGate:
    """Above the thermal length the force follows the classical 1/d^3 law."""

    def test_force_decreases_with_separation(self):
        from app.physics.casimir_forces import calculate_casimir_force

        # lambda_T ~ 1.2 um at 300 K; both points are in the classical regime.
        f2 = calculate_casimir_force(2e-6, 1e-12, temperature=300.0)
        f4 = calculate_casimir_force(4e-6, 1e-12, temperature=300.0)
        assert f2 < 0 and f4 < 0
        assert abs(f4) < abs(f2)
        # Classical limit is exactly 1/d^3.
        assert abs(f2) / abs(f4) == pytest.approx(8.0, rel=1e-6)

    def test_classical_limit_magnitude(self):
        from app.physics.casimir_forces import calculate_casimir_force

        d, area, T = 2e-6, 1e-12, 300.0
        zeta_3 = 1.2020569031595942
        expected = -zeta_3 * const.k * T * area / (8 * np.pi * d**3)
        assert calculate_casimir_force(d, area, temperature=T) == pytest.approx(
            expected, rel=1e-9
        )


class TestWidomLarsenThresholdGate:
    """WL mass-renormalization threshold is (m_n - m_p) ~ 2.531 m_e."""

    def test_threshold_ratio(self):
        threshold_ratio = (const.m_n - const.m_p) / const.m_e
        assert threshold_ratio == pytest.approx(2.531, abs=0.01)

    def test_module_uses_wl_threshold(self):
        from app.physics_engine.theories.widom_larsen import WidomLarsenTheory

        theory = WidomLarsenTheory()
        # Just above the WL 2006 threshold (and below the previous erroneous
        # 3.531): production must switch on.
        contribution = theory.calculate(
            {"temperature": 300.0, "electron_density": 6.8e28, "loading_ratio": 0.9},
            {"electron_mass_renormalization": 2.6},
        )
        assert contribution.observables["mass_sufficient"] == 1.0
