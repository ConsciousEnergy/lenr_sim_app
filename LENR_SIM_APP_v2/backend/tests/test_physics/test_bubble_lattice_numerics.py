"""
Numerics gates for the production collapse integrator.

``test_bubble_dynamics_gates.py`` exercises the standalone ``bubble_solver``.
Nothing gated ``BubbleLatticeInteraction`` itself, which is what the API actually
runs, and which used ``odeint`` on a fixed grid: it emitted "Excess work done on
this call" on every run and could not locate the collapse instant more precisely
than the sample spacing.

The Keller-Miksis variant lives on this class rather than routing to
``bubble_solver``, because that module drives with a constant
``P_inf * drive_factor`` and a constant field while this path uses a sinusoidal
acoustic drive and ``E ~ (R0/R)^2``. Sharing the drive model is what makes the
``c -> infinity`` reduction test below meaningful.
"""

import numpy as np
import pytest

from app.physics_engine.bubble_lattice_interaction import (
    BubbleLatticeInteraction,
    BubbleParameters,
    LatticeParameters,
)


def build_model(
    *,
    driving_pressure: float = 1.5e5,
    mode: str = "rayleigh_plesset",
    sound_speed: float = 1481.0,
) -> BubbleLatticeInteraction:
    bubble = BubbleParameters(
        initial_radius=10e-6,
        driving_pressure=driving_pressure,
        frequency=20e3,
        ambient_temperature=298.0,
        bubble_dynamics_mode=mode,
        sound_speed=sound_speed,
    )
    return BubbleLatticeInteraction(bubble, LatticeParameters.for_material("palladium"))


class TestAdaptiveSolver:
    def test_reports_the_adaptive_solver(self):
        result = build_model().simulate_collapse(num_cycles=1)
        assert result.bubble_dynamics["solver"] == "scipy.integrate.solve_ivp(LSODA)"

    def test_no_integrator_warning_is_emitted(self, recwarn):
        """odeint raised ODEintWarning('Excess work done') on every run."""
        build_model(driving_pressure=4e5).simulate_collapse(num_cycles=1)
        messages = [str(w.message) for w in recwarn]
        assert not any("Excess work done" in message for message in messages), messages

    def test_solution_stays_physical(self):
        result = build_model(driving_pressure=4e5).simulate_collapse(num_cycles=2)
        assert np.all(result.radius_series > 0)
        assert np.all(np.isfinite(result.radius_series))
        assert np.all(np.isfinite(result.velocity_series))

    def test_time_series_is_monotonic_after_event_splice(self):
        """The exact collapse instant is inserted into the grid, so ordering must
        survive the splice."""
        result = build_model(driving_pressure=4e5).simulate_collapse(num_cycles=1)
        times = result.time_series
        assert np.all(np.diff(times) >= 0)

    def test_series_stay_aligned(self):
        result = build_model(driving_pressure=4e5).simulate_collapse(num_cycles=1)
        assert result.time_series.size == result.radius_series.size
        assert result.time_series.size == result.velocity_series.size

    def test_reported_minimum_is_present_in_the_trajectory(self):
        """Refining the minimum beyond the grid must not desynchronise the cached
        trajectory from the reported peak, which the timeline depends on."""
        result = build_model(driving_pressure=4e5).simulate_collapse(num_cycles=1)
        assert np.min(result.radius_series) == pytest.approx(result.min_radius, rel=1e-12)

    def test_collapse_time_matches_the_trajectory_minimum(self):
        result = build_model(driving_pressure=4e5).simulate_collapse(num_cycles=1)
        min_index = int(np.argmin(result.radius_series))
        assert result.time_series[min_index] == pytest.approx(result.collapse_time)


class TestMachReporting:
    def test_peak_mach_is_reported(self):
        dynamics = build_model().simulate_collapse(num_cycles=1).bubble_dynamics
        assert dynamics["peak_mach"] >= 0.0
        assert dynamics["sound_speed_m_s"] == pytest.approx(1481.0)

    def test_mach_is_consistent_with_the_velocity_series(self):
        result = build_model(driving_pressure=4e5).simulate_collapse(num_cycles=1)
        expected = np.max(np.abs(result.velocity_series)) / 1481.0
        assert result.bubble_dynamics["peak_mach"] == pytest.approx(expected, rel=1e-9)

    @pytest.mark.parametrize(
        "sound_speed,expected_regime",
        [
            (1e12, "incompressible_valid"),
            (1.0, "compressibility_significant"),
        ],
    )
    def test_regime_classification_follows_mach(self, sound_speed, expected_regime):
        dynamics = (
            build_model(driving_pressure=4e5, sound_speed=sound_speed)
            .simulate_collapse(num_cycles=1)
            .bubble_dynamics
        )
        assert dynamics["compressibility_regime"] == expected_regime

    def test_gentle_drive_stays_incompressible(self):
        dynamics = build_model().simulate_collapse(num_cycles=1).bubble_dynamics
        assert dynamics["peak_mach"] < 0.1
        assert dynamics["compressibility_regime"] != "compressibility_significant"


class TestKellerMiksisMode:
    def test_mode_is_opt_in(self):
        """Default must stay Rayleigh-Plesset so stored baselines remain valid."""
        dynamics = build_model().simulate_collapse(num_cycles=1).bubble_dynamics
        assert dynamics["mode"] == "rayleigh_plesset"

    def test_selecting_keller_miksis_is_reported(self):
        dynamics = (
            build_model(mode="keller_miksis").simulate_collapse(num_cycles=1).bubble_dynamics
        )
        assert dynamics["mode"] == "keller_miksis"

    def test_reduces_to_rayleigh_plesset_as_sound_speed_grows(self):
        """Every compressibility correction scales with Rdot/c, so c -> infinity
        must recover the incompressible solution."""
        rp = build_model(driving_pressure=4e5).simulate_collapse(num_cycles=1)
        km = build_model(
            driving_pressure=4e5, mode="keller_miksis", sound_speed=1e12
        ).simulate_collapse(num_cycles=1)

        grid = np.linspace(0.0, min(rp.time_series[-1], km.time_series[-1]), 500)
        interpolated_rp = np.interp(grid, rp.time_series, rp.radius_series)
        interpolated_km = np.interp(grid, km.time_series, km.radius_series)
        relative_error = np.max(np.abs(interpolated_km - interpolated_rp)) / 10e-6
        assert relative_error < 1e-3, (
            f"Keller-Miksis did not reduce to Rayleigh-Plesset ({relative_error:.2e})"
        )

    def test_convergence_is_monotone_in_sound_speed(self):
        rp = build_model(driving_pressure=4e5).simulate_collapse(num_cycles=1)
        errors = []
        for sound_speed in (1481.0, 1e5, 1e8, 1e12):
            km = build_model(
                driving_pressure=4e5, mode="keller_miksis", sound_speed=sound_speed
            ).simulate_collapse(num_cycles=1)
            grid = np.linspace(0.0, min(rp.time_series[-1], km.time_series[-1]), 500)
            errors.append(
                np.max(
                    np.abs(
                        np.interp(grid, km.time_series, km.radius_series)
                        - np.interp(grid, rp.time_series, rp.radius_series)
                    )
                )
                / 10e-6
            )
        for faster, slower in zip(errors[1:], errors[:-1]):
            assert faster <= slower * 1.05, f"deviation grew with c: {errors}"

    def test_physical_sound_speed_does_not_collapse_harder(self):
        """Acoustic radiation removes energy, so the compressible liquid must not
        collapse more violently than the incompressible idealisation."""
        rp = build_model(driving_pressure=4e5).simulate_collapse(num_cycles=1)
        km = build_model(driving_pressure=4e5, mode="keller_miksis").simulate_collapse(
            num_cycles=1
        )
        assert km.min_radius >= rp.min_radius * 0.9

    def test_keller_miksis_stays_physical(self):
        result = build_model(driving_pressure=4e5, mode="keller_miksis").simulate_collapse(
            num_cycles=2
        )
        assert np.all(result.radius_series > 0)
        assert np.all(np.isfinite(result.radius_series))
        assert np.all(np.isfinite(result.velocity_series))

    def test_both_modes_share_the_acoustic_drive(self):
        """The two RHS functions must differ only in compressibility, otherwise the
        reduction test above would be comparing two different problems."""
        rp_model = build_model(driving_pressure=4e5)
        km_model = build_model(driving_pressure=4e5, mode="keller_miksis", sound_speed=1e14)
        state = np.array([9e-6, -1.0])
        time = 1e-5
        rp = rp_model.rayleigh_plesset_rhs(state, time)
        km = km_model.keller_miksis_rhs(state, time)
        assert km[0] == pytest.approx(rp[0])
        assert km[1] == pytest.approx(rp[1], rel=1e-5)

    def test_unknown_mode_falls_back_to_rayleigh_plesset(self):
        model = build_model()
        model.bubble.bubble_dynamics_mode = "nonsense_mode"
        dynamics = model.simulate_collapse(num_cycles=1).bubble_dynamics
        assert dynamics["mode"] == "nonsense_mode"
        # The dispatcher still integrates the incompressible equation.
        state = np.array([9e-6, -1.0])
        assert model._dynamics_rhs(state, 1e-5) == pytest.approx(
            model.rayleigh_plesset_rhs(state, 1e-5)
        )
