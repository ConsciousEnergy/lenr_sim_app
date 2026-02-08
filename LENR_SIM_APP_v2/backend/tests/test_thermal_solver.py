"""
Tests for the ThermalSolver module.
"""

import pytest
import numpy as np
import asyncio
from app.physics_engine.thermal_solver import ThermalSolver
from app.physics_engine.common.grid import SimulationGrid


@pytest.fixture
def grid_config():
    """Config and grid for thermal solver with grid."""
    resolution = (4, 4, 4)
    boundaries = (0.0, 1.0, 0.0, 1.0, 0.0, 1.0)
    grid = SimulationGrid(resolution, boundaries)
    config = {
        "grid_resolution": resolution,
        "domain_boundaries": boundaries,
        "material_properties": {
            "thermal_conductivity": 50.0,
            "specific_heat_capacity": 500.0,
            "density": 8000.0,
        },
        "initial_temperature": 300.0,
        "thermal_boundary_condition": "neumann",
    }
    return config, grid


@pytest.fixture
def solver_with_grid(grid_config):
    config, grid = grid_config
    return ThermalSolver(config, grid)


@pytest.fixture
def solver_no_grid():
    config = {
        "material_properties": {"thermal_conductivity": 1.0, "specific_heat_capacity": 1.0, "density": 1.0},
        "initial_temperature": 300.0,
    }
    return ThermalSolver(config, None)


def test_thermal_solver_init_with_grid(solver_with_grid, grid_config):
    """ThermalSolver with grid has correct grid_shape and thermal_diffusivity."""
    config, grid = grid_config
    assert solver_with_grid.grid_shape == (4, 4, 4)
    assert solver_with_grid.temperature_grid.shape == (4, 4, 4)
    alpha = 50.0 / (8000.0 * 500.0)
    assert abs(solver_with_grid.thermal_diffusivity - alpha) < 1e-12
    assert solver_with_grid.dx == pytest.approx(1.0 / 3.0)
    assert np.all(solver_with_grid.temperature_grid == 300.0)


def test_thermal_solver_init_without_grid(solver_no_grid):
    """ThermalSolver without grid has single temperature value."""
    assert solver_no_grid.grid is None
    assert solver_no_grid.temperature_grid.shape == (1,)
    assert solver_no_grid.temperature_grid[0] == 300.0


def test_thermal_solver_init_invalid_density():
    """ThermalSolver raises ValueError when density is zero."""
    config = {
        "material_properties": {"thermal_conductivity": 1.0, "specific_heat_capacity": 1.0, "density": 0.0},
    }
    with pytest.raises(ValueError, match="Density and specific heat must be positive"):
        ThermalSolver(config, None)


def test_thermal_solver_init_invalid_specific_heat():
    """ThermalSolver raises ValueError when specific_heat is zero."""
    config = {
        "material_properties": {"thermal_conductivity": 1.0, "specific_heat_capacity": 0.0, "density": 1.0},
    }
    with pytest.raises(ValueError, match="Density and specific heat must be positive"):
        ThermalSolver(config, None)


def test_thermal_solver_get_temperature_grid(solver_with_grid, solver_no_grid):
    """get_temperature_grid returns the temperature array."""
    grid = solver_with_grid.get_temperature_grid()
    assert grid is not None
    assert grid.shape == (4, 4, 4)
    single = solver_no_grid.get_temperature_grid()
    assert single is not None
    assert single.shape == (1,)


@pytest.mark.asyncio
async def test_thermal_solver_update_temperature_no_grid(solver_no_grid):
    """Without grid, single heat source updates single temperature value."""
    initial = float(solver_no_grid.temperature_grid[0])
    heat_sources = np.array([1e6])  # W/m^3
    await solver_no_grid.update_temperature(0.01, heat_sources)
    delta_T = 1e6 * 0.01 / (1.0 * 1.0)
    assert solver_no_grid.temperature_grid[0] == pytest.approx(initial + delta_T)


@pytest.mark.asyncio
async def test_thermal_solver_update_temperature_with_grid(solver_with_grid):
    """With grid, update_temperature runs without error and keeps finite values."""
    heat_sources = np.zeros((4, 4, 4))
    heat_sources[1, 1, 1] = 1e5  # single cell source
    dt = 1e-6  # small for stability
    await solver_with_grid.update_temperature(dt, heat_sources)
    T = solver_with_grid.temperature_grid
    assert np.all(np.isfinite(T))
    assert T.shape == (4, 4, 4)
    # Center cell should have increased
    assert T[1, 1, 1] >= 300.0


def test_thermal_solver_apply_boundary_conditions_neumann(solver_with_grid):
    """Neumann BC: boundary values mirror inner (zero gradient)."""
    solver_with_grid.temperature_grid[1, 1, 1] = 400.0
    solver_with_grid._apply_boundary_conditions()
    # After mirroring, edges should match adjacent inner
    assert solver_with_grid.temperature_grid[0, :, :].mean() == pytest.approx(
        solver_with_grid.temperature_grid[1, :, :].mean()
    )
    assert solver_with_grid.temperature_grid[-1, :, :].mean() == pytest.approx(
        solver_with_grid.temperature_grid[-2, :, :].mean()
    )
