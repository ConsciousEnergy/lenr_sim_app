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


class TestVanDerWaalsHardCore:
    """The hard core belongs in the gas law, not in a post-hoc radius clamp.

    ``P_0 (R_0/R)^(3 gamma)`` plus ``R = max(R, floor)`` inside the right-hand side
    was genuinely singular: the state kept driving the radius below the floor while
    the RHS pretended it sat at the floor. LSODA's raw solution diverged to ~-3e145
    at the collapse instant, which was invisible because it was sanitised away.
    """

    def test_gas_pressure_matches_the_polytropic_law_at_the_initial_radius(self):
        model = build_model()
        pressure, _ = model._gas_pressure(model.bubble.initial_radius, 0.0)
        expected = (
            model.bubble.ambient_pressure
            + 2 * model.bubble.surface_tension / model.bubble.initial_radius
        )
        assert pressure == pytest.approx(expected, rel=1e-9)

    def test_gas_pressure_diverges_towards_the_hard_core(self):
        model = build_model()
        h = model.hard_core_radius
        near = model._gas_pressure(h * 1.01, 0.0)[0]
        far = model._gas_pressure(h * 10.0, 0.0)[0]
        assert near > far * 100

    def test_hard_core_radius_matches_the_compression_limit(self):
        model = build_model()
        assert model.hard_core_radius == pytest.approx(
            model.bubble.initial_radius / model.MAX_COMPRESSION_RATIO
        )

    def test_radius_guard_keeps_the_state_outside_the_core(self):
        model = build_model()
        assert model._guard_radius(0.0) > model.hard_core_radius
        assert model._guard_radius(float("nan")) > model.hard_core_radius
        assert model._guard_radius(5e-6) == pytest.approx(5e-6)

    def test_raw_solution_no_longer_diverges(self):
        """Before the hard-core gas law the unsanitised minimum was ~-3e145."""
        from scipy.integrate import solve_ivp

        model = build_model(driving_pressure=8e5)
        total_time = 2.0 / model.bubble.frequency
        solution = solve_ivp(
            lambda t, y: model._dynamics_rhs(y, t),
            (0.0, total_time),
            np.array([model.bubble.initial_radius, 0.0]),
            t_eval=np.linspace(0.0, total_time, 2000),
            method="LSODA",
            rtol=1e-8,
            atol=[model.hard_core_radius * 1e-6, 1e-6],
        )
        assert solution.success
        assert np.all(np.isfinite(solution.y))
        # No sanitisation applied here: the raw solution itself must stay physical.
        assert np.min(solution.y[0]) > 0.0
        assert np.min(solution.y[0]) >= model.hard_core_radius

    @pytest.mark.parametrize("driving_pressure", [1.5e5, 4e5, 8e5])
    def test_minimum_radius_respects_the_hard_core(self, driving_pressure):
        result = build_model(driving_pressure=driving_pressure).simulate_collapse(
            num_cycles=2
        )
        assert result.min_radius >= build_model().hard_core_radius
        assert result.compression_ratio <= BubbleLatticeInteraction.MAX_COMPRESSION_RATIO


class TestSubGridRefinement:
    def test_refinement_method_is_reported(self):
        dynamics = (
            build_model(driving_pressure=4e5).simulate_collapse(num_cycles=1).bubble_dynamics
        )
        assert dynamics["collapse_time_refinement"] in {"parabolic_subgrid", "grid_sample"}

    def test_refined_vertex_is_the_trajectory_minimum(self):
        result = build_model(driving_pressure=4e5).simulate_collapse(num_cycles=1)
        assert np.min(result.radius_series) == pytest.approx(result.min_radius, rel=1e-12)

    def test_refinement_does_not_break_below_the_bracket(self):
        """A parabolic vertex must sit inside the samples that bracket it."""
        result = build_model(driving_pressure=4e5).simulate_collapse(num_cycles=1)
        radii = np.sort(result.radius_series)
        # The refined minimum should be close to the next-smallest sample, not an
        # order of magnitude below it.
        assert radii[0] > radii[1] * 0.5


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
