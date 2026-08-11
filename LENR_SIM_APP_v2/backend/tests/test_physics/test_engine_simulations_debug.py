"""
Direct physics-engine debugging tests (no HTTP).

Companion to ``test_all_simulations_debug.py``. Use this layer when an API
500 needs isolation to the integrator / theory module itself.

    pytest tests/test_physics/test_engine_simulations_debug.py -m simulation_debug -q --no-cov
"""

from __future__ import annotations

import math
import sys

import numpy as np
import pytest

pytestmark = [pytest.mark.physics, pytest.mark.simulation_debug]


def _assert_finite(value, name: str) -> float:
    number = float(value)
    assert math.isfinite(number), f"{name} not finite: {number}"
    return number


def _assert_positive(value, name: str) -> float:
    number = _assert_finite(value, name)
    assert number > 0.0, f"{name} must be > 0, got {number}"
    return number


class TestBubbleLatticeEngineDebug:
    def test_simulate_collapse_reports_portable_solver(self) -> None:
        from app.physics_engine.bubble_lattice_interaction import (
            BubbleLatticeInteraction,
            BubbleParameters,
            LatticeParameters,
        )

        lattice = LatticeParameters.for_material("palladium")
        lattice.loading_ratio = 0.9
        model = BubbleLatticeInteraction(
            BubbleParameters(
                initial_radius=9.99e-6,
                driving_pressure=1.5e5,
                frequency=20e3,
                ambient_temperature=300.0,
            ),
            lattice,
        )
        result = model.simulate_collapse(num_cycles=2)
        solver = result.bubble_dynamics["solver"]
        assert solver in {
            "scipy.integrate.solve_ivp(LSODA)",
            "scipy.integrate.solve_ivp(BDF)",
        }
        if sys.platform.startswith("win"):
            assert solver.endswith("(BDF)")
        _assert_positive(result.min_radius, "min_radius")
        assert np.all(np.isfinite(result.radius_series))
        assert np.all(result.radius_series > 0)
        assert np.all(np.isfinite(result.velocity_series))

    def test_instantaneous_enhancement_finite(self) -> None:
        from app.physics_engine.bubble_lattice_interaction import BubbleLatticeInteraction

        instant = BubbleLatticeInteraction().calculate_instantaneous_enhancement(0.5)
        enhancement = instant["enhancement"]
        if isinstance(enhancement, dict):
            enhancement = enhancement.get("total", enhancement.get("value"))
        _assert_positive(enhancement, "instant.total")
        _assert_positive(instant["conditions"]["temperature"], "instant.temperature")


class TestUnifiedModelEngineDebug:
    def test_run_simulation_legacy_and_pipeline(self) -> None:
        from app.physics_engine.unified_lenr_model import (
            SimulationConfig,
            UnifiedLENRModel,
        )

        legacy = UnifiedLENRModel(SimulationConfig(use_theory_pipeline=False)).run_simulation()
        _assert_positive(legacy.total_enhancement, "legacy.total_enhancement")

        pipeline = UnifiedLENRModel(
            SimulationConfig(
                use_theory_pipeline=True,
                enabled_theories=["electron_screening", "hagelstein_phonon"],
                time_steps=10,
                total_time=1.0,
            )
        ).run_simulation()
        _assert_positive(pipeline.total_enhancement, "pipeline.total_enhancement")


class TestTheoryPipelineEngineDebug:
    def test_every_registered_theory_produces_finite_enhancement(self) -> None:
        from app.physics_engine.theory_pipeline import get_default_pipeline

        pipeline = get_default_pipeline()
        conditions = {
            "temperature": 300.0,
            "loading_ratio": 0.9,
            "pressure": 101325.0,
            "electron_density": 6.8e28,
        }
        theory_ids = [row["theory_id"] for row in pipeline.list_theories()]
        assert theory_ids
        for theory_id in theory_ids:
            contrib = pipeline.run_single(theory_id, conditions=conditions)
            enh = getattr(contrib, "enhancement_factor", None)
            if enh is None:
                enh = contrib.observables.get("enhancement_factor", 1.0)
            _assert_finite(enh, f"{theory_id}.enhancement_factor")


class TestRateAndScreeningEngineDebug:
    def test_reaction_rate_and_screening_kernel(self) -> None:
        from app.physics_engine.screening_kernel import compute_screening_enhancement
        from app.physics_engine.unified_lenr_model.config import SimulationConfig
        from app.physics_engine.unified_lenr_model.reaction_rate_engine import (
            compute_reaction_rate,
        )

        screening = compute_screening_enhancement(
            temperature_k=300.0,
            material="palladium",
        )
        _assert_positive(screening["enhancement"], "screening.enhancement")
        _assert_positive(
            screening["screening_potential_ev"], "screening.screening_potential_ev"
        )

        rate = compute_reaction_rate(
            SimulationConfig(temperature=320.0, loading_ratio=0.9),
            tunneling_prob=1.0,
            mode="two_body",
        )
        value = _assert_finite(rate.rate_per_m3_s, "reaction_rate.rate_per_m3_s")
        assert value >= 0.0
