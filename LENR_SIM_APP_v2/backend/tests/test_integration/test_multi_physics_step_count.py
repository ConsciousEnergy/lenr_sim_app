"""Multi-physics result mapping uses simulation_stats.step_count."""

import numpy as np

from app.routers import multi_physics_routes as routes


def test_run_simulation_task_reads_step_count_from_stats(monkeypatch) -> None:
    routes.simulation_results.clear()
    sim_id = "test-step-count"

    def fake_run_coupled_simulation(**_kwargs):
        return {
            "times": np.array([0.0, 0.5, 1.0]),
            "max_temperatures": np.array([300.0, 305.0, 310.0]),
            "mean_reaction_rates": np.array([0.0, 0.1, 0.2]),
            "elapsed_time": 0.01,
            "final_temperature": np.array([300.0, 310.0]),
            "simulation_stats": {"step_count": 7},
        }

    monkeypatch.setattr(routes, "run_coupled_simulation", fake_run_coupled_simulation)
    monkeypatch.setattr(routes, "plot_results", lambda *_args, **_kwargs: None)

    routes.simulation_results[sim_id] = {"status": "pending"}
    params = routes.SimulationRequest(
        domain_size=(0.01, 0.01, 0.01),
        resolution=(2, 2, 2),
        simulation_time=0.001,
        time_step=0.001,
    )
    routes.run_simulation_task(sim_id, params)
    stored = routes.simulation_results[sim_id]
    assert stored["status"] == "completed"
    assert stored["results"]["step_count"] == 7
    assert stored["results"]["times"] == [0.0, 0.5, 1.0]
