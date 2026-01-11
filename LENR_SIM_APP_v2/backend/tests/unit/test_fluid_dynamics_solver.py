import pytest
import numpy as np
from app.physics_engine.fluid_dynamics_solver import FluidDynamicsSolver, FluidDynamicsParameters


def test_fluid_dynamics_solver_initialization():
    """Test that the FluidDynamicsSolver initializes correctly with default parameters."""
    params = FluidDynamicsParameters(
        nx=50,
        ny=50,
        nz=50,
        kinematic_viscosity=0.01
    )
    
    solver = FluidDynamicsSolver(params)
    
    # Check that arrays are initialized with correct shapes
    assert solver.rho.shape == (50, 50, 50)
    assert solver.u.shape == (3, 50, 50, 50)
    assert solver.f.shape == (19, 50, 50, 50)
    
    # Check initial density
    assert np.allclose(solver.rho, params.density)
    
    # Check initial velocity (should be zero)
    assert np.allclose(solver.u, 0.0)


def test_fluid_dynamics_solver_step():
    """Test that a single simulation step runs without errors."""
    params = FluidDynamicsParameters(
        nx=20,
        ny=20,
        nz=20,
        kinematic_viscosity=0.01,
        tau=0.6
    )
    
    solver = FluidDynamicsSolver(params)
    
    # Apply a force in the x-direction
    solver._set_external_force((0.001, 0, 0))
    
    # Store initial state
    rho_before = solver.rho.copy()
    u_before = solver.u.copy()
    
    # Perform a single step
    solver.step()
    
    # Check that state has changed
    assert not np.array_equal(solver.rho, rho_before)
    assert not np.array_equal(solver.u, u_before)
    
    # Check conservation of mass
    total_mass_before = np.sum(rho_before)
    total_mass_after = np.sum(solver.rho)
    assert np.isclose(total_mass_before, total_mass_after, rtol=1e-5)


def test_fluid_dynamics_solver_run():
    """Test that the simulation runs for multiple steps and returns expected results."""
    params = FluidDynamicsParameters(
        nx=10,
        ny=10,
        nz=10,
        kinematic_viscosity=0.01,
        tau=0.6,
        max_iterations=5
    )
    
    solver = FluidDynamicsSolver(params)
    
    # Apply a force in the x-direction
    solver._set_external_force((0.001, 0, 0))
    
    # Run simulation
    results = solver.run(num_steps=5)
    
    # Check that results contain expected keys
    assert "velocity" in results
    assert "density" in results
    assert "steps_completed" in results
    assert "converged" in results
    
    # Check that steps completed matches expected
    assert results["steps_completed"] == 5
    
    # Check that velocity field shows flow in x-direction
    mean_vx = np.mean(results["velocity"][0])
    assert mean_vx > 0  # Positive flow in x-direction due to force


def test_obstacle_setup():
    """Test that obstacles can be properly set up."""
    params = FluidDynamicsParameters(
        nx=30,
        ny=30,
        nz=30
    )
    
    solver = FluidDynamicsSolver(params)
    
    # Create a cylindrical obstacle
    x, y, z = np.meshgrid(
        np.arange(params.nx),
        np.arange(params.ny),
        np.arange(params.nz),
        indexing='ij'
    )
    
    center_x, center_y = params.nx // 2, params.ny // 2
    radius = params.nx // 6
    
    # True for fluid, False for solid
    cylinder = ((x - center_x)**2 + (y - center_y)**2 > radius**2)
    
    # Set obstacle
    solver.set_obstacle(cylinder)
    
    # Check that mask is set correctly
    assert np.array_equal(solver.mask, cylinder)
    
    # Run a few steps to make sure it doesn't crash with obstacles
    solver.run(num_steps=3)
    
    # Check flow around obstacle (should be zero inside obstacle)
    assert np.all(np.abs(solver.u[:, ~solver.mask]) < 1e-10) 