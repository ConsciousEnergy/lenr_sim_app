"""
Bubble Dynamics Reduction-Limit Gates
======================================

Canonical-limit checks for the bubble dynamics stack, modelled on the validation
suite of the open-source `sonolumen` single-bubble simulator and the APECSS
library (doi:10.21105/joss.05435).

Unit tests elsewhere assert that our code agrees with itself. These gates instead
assert agreement with results that do not depend on our implementation at all:

  - Rayleigh collapse time for an empty cavity
  - Minnaert resonance frequency, cross-checked against the resonant-radius inverse
  - Blake threshold, cross-checked against the stationary point of the equilibrium
    pressure curve it is derived from
  - Keller-Miksis reducing to Rayleigh-Plesset as the sound speed goes to infinity

A solver can pass every unit test and still be wrong; failing a reduction limit
means the physics is wrong, not merely inconsistent.
"""

import numpy as np
import pytest

from app.physics.bubble_collapse import (
    STANDARD_PRESSURE,
    WATER_DENSITY,
    calculate_blake_critical_radius,
    calculate_blake_threshold_pressure,
    calculate_minnaert_frequency,
    calculate_rayleigh_collapse_time,
    calculate_resonant_radius,
)
from app.physics_engine.bubble_solver import (
    RayleighPlessetParams,
    solve_keller_miksis,
    solve_modified_rayleigh_plesset,
)

SURFACE_TENSION = 0.0728  # N/m, water at 20 C


class TestRayleighCollapseTime:
    """t_R = 0.915 * R_0 * sqrt(rho / dP) for an empty cavity (Rayleigh 1917)."""

    def test_matches_closed_form(self):
        radius = 10e-6
        expected = 0.915 * radius * np.sqrt(WATER_DENSITY / STANDARD_PRESSURE)
        assert calculate_rayleigh_collapse_time(radius) == pytest.approx(
            expected, rel=1e-12
        )

    def test_scales_linearly_with_radius(self):
        base = calculate_rayleigh_collapse_time(10e-6)
        doubled = calculate_rayleigh_collapse_time(20e-6)
        assert doubled == pytest.approx(2 * base, rel=1e-12)

    def test_scales_as_inverse_sqrt_pressure(self):
        base = calculate_rayleigh_collapse_time(10e-6, ambient_pressure=1e5)
        higher = calculate_rayleigh_collapse_time(10e-6, ambient_pressure=4e5)
        assert higher == pytest.approx(base / 2.0, rel=1e-12)

    def test_order_of_magnitude_for_a_10um_bubble(self):
        """A 10 um bubble in water at 1 atm collapses on a ~1 us timescale."""
        collapse_time = calculate_rayleigh_collapse_time(10e-6)
        assert 1e-7 < collapse_time < 1e-5


class TestMinnaertFrequency:
    """f_0 = (1 / 2*pi*R) * sqrt(3*gamma*P_0 / rho) (Minnaert 1933)."""

    def test_matches_closed_form(self):
        radius = 10e-6
        expected = (1 / (2 * np.pi * radius)) * np.sqrt(
            3 * 1.4 * STANDARD_PRESSURE / WATER_DENSITY
        )
        assert calculate_minnaert_frequency(radius) == pytest.approx(expected, rel=1e-12)

    def test_inverse_of_resonant_radius(self):
        """Independent cross-check: the two helpers must invert each other."""
        radius = 25e-6
        frequency = calculate_minnaert_frequency(radius)
        assert calculate_resonant_radius(frequency) == pytest.approx(radius, rel=1e-9)

    def test_known_scaling_constant(self):
        """The classic rule of thumb: f_0 * R ~ 3.3 m/s for an air bubble in water."""
        radius = 1e-3
        product = calculate_minnaert_frequency(radius) * radius
        assert 3.0 < product < 3.6

    def test_frequency_falls_with_radius(self):
        assert calculate_minnaert_frequency(1e-6) > calculate_minnaert_frequency(1e-3)


class TestBlakeThreshold:
    """Blake critical radius and threshold pressure (Blake 1949)."""

    def test_critical_radius_is_the_stationary_point(self):
        """Independent check: R_crit must maximise the equilibrium pressure curve.

        This validates the closed form against the equation it is derived from,
        rather than against itself.
        """
        radius = 5e-6
        p_gas_0 = STANDARD_PRESSURE + 2 * SURFACE_TENSION / radius

        def liquid_pressure(r):
            return p_gas_0 * (radius / r) ** 3 - 2 * SURFACE_TENSION / r

        r_crit = calculate_blake_critical_radius(radius)
        grid = np.linspace(radius, 20 * r_crit, 400_000)
        numeric_argmax = grid[int(np.argmin(liquid_pressure(grid)))]

        assert r_crit == pytest.approx(numeric_argmax, rel=1e-3)

    def test_critical_radius_exceeds_equilibrium_radius(self):
        radius = 5e-6
        assert calculate_blake_critical_radius(radius) > radius

    def test_threshold_positive_and_above_ambient_scale(self):
        """Inertial cavitation of a micron bubble needs order-atmosphere tension."""
        threshold = calculate_blake_threshold_pressure(1e-6)
        assert threshold > 0
        assert 1e4 < threshold < 1e7

    def test_smaller_bubbles_are_harder_to_cavitate(self):
        """Surface tension dominates as R_0 shrinks, so the threshold must rise."""
        assert calculate_blake_threshold_pressure(
            0.5e-6
        ) > calculate_blake_threshold_pressure(5e-6)

    def test_threshold_falls_towards_ambient_for_large_bubbles(self):
        """Large bubbles are nearly unrestrained by surface tension."""
        threshold = calculate_blake_threshold_pressure(1e-3)
        assert threshold < STANDARD_PRESSURE * 1.1

    def test_zero_surface_tension_has_no_finite_threshold(self):
        assert not np.isfinite(calculate_blake_critical_radius(1e-6, surface_tension=0))


class TestKellerMiksisReducesToRayleighPlesset:
    """Keller-Miksis must recover Rayleigh-Plesset as c -> infinity.

    This is the sonolumen `test_keller_miksis_reduces_to_RPE` gate. It is the single
    most informative check on the compressible solver: every compressibility
    correction is proportional to some power of Mach number, so an algebra error in
    any of them shows up as a failure to converge on the incompressible solution.
    """

    R0 = 10e-6
    T_SPAN = (0.0, 2e-6)

    @staticmethod
    def _params():
        return RayleighPlessetParams(drive_factor=2.0)

    def _rp_solution(self):
        return solve_modified_rayleigh_plesset(
            self.R0, self.T_SPAN, params=self._params(), max_step=2e-9
        )

    def _km_solution(self, sound_speed):
        return solve_keller_miksis(
            self.R0,
            self.T_SPAN,
            params=self._params(),
            sound_speed=sound_speed,
            max_step=2e-9,
        )

    def test_converges_to_rayleigh_plesset_at_large_sound_speed(self):
        t_rp, r_rp, _ = self._rp_solution()
        t_km, r_km, _ = self._km_solution(sound_speed=1e12)

        # Compare on a shared grid; the two integrators choose their own steps.
        grid = np.linspace(self.T_SPAN[0], min(t_rp[-1], t_km[-1]), 500)
        interpolated_rp = np.interp(grid, t_rp, r_rp)
        interpolated_km = np.interp(grid, t_km, r_km)

        relative_error = np.max(
            np.abs(interpolated_km - interpolated_rp) / self.R0
        )
        assert relative_error < 1e-3, (
            f"Keller-Miksis did not reduce to Rayleigh-Plesset "
            f"(max relative deviation {relative_error:.2e})"
        )

    def test_convergence_is_monotone_in_sound_speed(self):
        """Raising c must move the solution towards the incompressible limit."""
        t_rp, r_rp, _ = self._rp_solution()

        errors = []
        for sound_speed in (1481.0, 1e5, 1e8, 1e12):
            t_km, r_km, _ = self._km_solution(sound_speed)
            grid = np.linspace(self.T_SPAN[0], min(t_rp[-1], t_km[-1]), 500)
            errors.append(
                np.max(
                    np.abs(np.interp(grid, t_km, r_km) - np.interp(grid, t_rp, r_rp))
                    / self.R0
                )
            )

        for faster, slower in zip(errors[1:], errors[:-1]):
            assert faster <= slower * 1.05, (
                f"deviation from the incompressible limit grew with c: {errors}"
            )

    def test_physical_sound_speed_damps_the_collapse(self):
        """Acoustic radiation removes energy, so the real liquid must not collapse
        harder than the incompressible idealisation."""
        _, r_rp, _ = self._rp_solution()
        _, r_km, _ = self._km_solution(sound_speed=1481.0)
        assert np.min(r_km) >= np.min(r_rp) * 0.9

    def test_solution_stays_physical(self):
        _, r_km, v_km = self._km_solution(sound_speed=1481.0)
        assert np.all(r_km > 0), "radius must stay positive"
        assert np.all(np.isfinite(r_km))
        assert np.all(np.isfinite(v_km))
