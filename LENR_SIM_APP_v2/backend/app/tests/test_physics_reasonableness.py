import math

from scipy import constants as const

from app.physics.bubble_collapse import (
    REGIME_MAX_TEMPERATURE,
    calculate_collapse_temperature,
)
from app.physics.non_equilibrium_thermo import calculate_miles_heat_helium_correlation
from app.physics.quantum_tunneling import calculate_gamow_factor


def test_thermal_energy_scale_at_room_temperature():
    thermal_energy_ev = const.k * 300.0 / const.e
    assert math.isclose(thermal_energy_ev, 0.025852, rel_tol=1e-3)


def test_coulomb_energy_scale_at_nuclear_radius():
    coulomb_barrier_kev = (
        const.e**2 / (4 * math.pi * const.epsilon_0 * 5e-15)
    ) / const.e / 1e3
    assert math.isclose(coulomb_barrier_kev, 287.99, rel_tol=5e-3)
    assert 200.0 <= coulomb_barrier_kev <= 500.0


def test_gamow_factor_is_strongly_suppressed_at_thermal_energy():
    thermal_energy_kev = (const.k * 300.0 / const.e) / 1e3
    gamow_thermal = calculate_gamow_factor(z1=1, z2=1, reduced_mass=1.0, energy=thermal_energy_kev)
    gamow_10kev = calculate_gamow_factor(z1=1, z2=1, reduced_mass=1.0, energy=10.0)

    assert gamow_thermal >= 0.0
    assert gamow_10kev > gamow_thermal
    assert gamow_10kev < 1.0


def test_miles_heat_helium_reference_scale():
    he4_rate = calculate_miles_heat_helium_correlation(1.0)
    assert math.isclose(he4_rate, 2.63e11, rel_tol=1e-12)
    assert 1e11 <= he4_rate <= 1e12


def test_single_bubble_temperature_cap_is_enforced():
    extreme_temp = calculate_collapse_temperature(
        initial_radius=10e-6,
        minimum_radius=10e-9,
        initial_temperature=300.0,
        regime="single_bubble",
    )
    assert extreme_temp <= REGIME_MAX_TEMPERATURE["single_bubble"]
    assert extreme_temp == REGIME_MAX_TEMPERATURE["single_bubble"]
