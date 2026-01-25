import pytest
import numpy as np
from app.physics_engine.hydrogen_flux_model import HydrogenFluxModel, HydrogenFluxParameters


def test_initialization():
    """Test that the model initializes correctly."""
    grid_size = (10, 10, 10)
    cell_size = (1e-9, 1e-9, 1e-9)
    
    # Default initialization
    model = HydrogenFluxModel(grid_size, cell_size)
    
    # Check that arrays are created with expected dimensions
    assert model.concentration.shape == grid_size
    assert model.trapped_concentration.shape == grid_size
    assert model.diffusion_field.shape == grid_size
    assert model.flux.shape == (3, *grid_size)
    
    # Check default values
    assert np.allclose(model.concentration, model.params.initial_concentration)
    assert np.all(model.trapped_concentration == 0)


def test_diffusion_coefficient_update():
    """Test that diffusion coefficients update with temperature."""
    grid_size = (5, 5, 5)
    cell_size = (1e-9, 1e-9, 1e-9)
    
    params = HydrogenFluxParameters(
        diffusion_coefficient=1e-9,
        activation_energy=0.5,
        temperature_dependence=True
    )
    
    model = HydrogenFluxModel(grid_size, cell_size, parameters=params)
    
    # Get initial diffusion field at default temperature (300K)
    initial_diffusion = model.diffusion_field.copy()
    
    # Increase temperature and check diffusion increases
    model.temperature[:] = 400.0  # Higher temperature
    model.update_diffusion_coefficient()
    
    assert np.all(model.diffusion_field > initial_diffusion)
    
    # Test with temperature dependence disabled
    model.params.temperature_dependence = False
    model.diffusion_field[:] = 0.0  # Reset
    model.update_diffusion_coefficient()
    
    assert np.all(model.diffusion_field == model.params.diffusion_coefficient)


def test_concentration_conservation():
    """Test that total hydrogen is approximately conserved (within numerical error)."""
    grid_size = (10, 10, 10)
    cell_size = (1e-9, 1e-9, 1e-9)
    
    # Use periodic boundary conditions to ensure conservation
    model = HydrogenFluxModel(grid_size, cell_size, boundary_conditions="periodic")
    
    # Disable all sources/sinks/trapping for this test to ensure true conservation
    model.params.surface_adsorption_rate = 0.0
    model.params.surface_desorption_rate = 0.0
    model.params.trap_density = 0.0  # Disable trapping/detrapping
    
    # Ensure trapped concentration is zero
    model.trapped_concentration[:] = 0.0
    
    # Get initial total concentration (free + trapped)
    initial_total = np.sum(model.concentration) + np.sum(model.trapped_concentration)
    
    # Disable drift effects
    model.params.enable_electromigration = False
    model.params.enable_stress_diffusion = False
    
    # Run for several steps
    for _ in range(10):
        model.step()
    
    # Get final total concentration
    final_total = np.sum(model.concentration) + np.sum(model.trapped_concentration)
    
    # Check conservation (with tolerance for numerical errors from finite differences)
    # Using relative tolerance that accounts for numerical precision in 3D finite difference methods
    # Note: Periodic BCs with np.gradient have numerical errors, so we use a more realistic tolerance
    relative_error = abs(final_total - initial_total) / max(initial_total, 1e-15)
    assert relative_error < 1e-6, f"Conservation violated: {relative_error:.2e} > 1e-6. Initial: {initial_total:.10e}, Final: {final_total:.10e}"


def test_flux_computation():
    """Test that flux is computed correctly for a simple gradient."""
    grid_size = (20, 3, 3)
    cell_size = (1e-9, 1e-9, 1e-9)
    
    model = HydrogenFluxModel(grid_size, cell_size)
    
    # Create a linear concentration gradient in x direction
    x = np.linspace(0, 1, grid_size[0])
    for i in range(grid_size[0]):
        model.concentration[i, :, :] = x[i]
    
    # Disable drift to isolate diffusion
    model.params.enable_electromigration = False
    model.params.enable_stress_diffusion = False
    
    # Compute flux
    model.compute_flux()
    
    # Check that flux is negative in x (from high to low concentration)
    # and approximately uniform
    assert np.all(model.flux[0] < 0)
    assert np.allclose(model.flux[0], model.flux[0][0, 0, 0], rtol=1e-10)
    
    # Check that flux in y and z are approximately zero
    assert np.allclose(model.flux[1], 0, atol=1e-15)
    assert np.allclose(model.flux[2], 0, atol=1e-15)


def test_channel_creation():
    """Test that channels are created correctly."""
    grid_size = (20, 20, 20)
    cell_size = (1e-9, 1e-9, 1e-9)
    
    model = HydrogenFluxModel(grid_size, cell_size)
    
    # Original material map
    original_material = model.material_type.copy()
    
    # Create a channel
    start = (5, 5, 5)
    end = (15, 15, 15)
    radius = 2
    model.create_channel(start, end, radius)
    
    # Check that some points were changed to channel type
    assert np.any(model.material_type == 4)  # 4 is channel type
    assert np.sum(model.material_type == 4) > 0
    assert np.sum(model.material_type != original_material) > 0


def test_temperature_effect_on_detrapping():
    """Test that higher temperatures increase detrapping rate."""
    grid_size = (5, 5, 5)
    cell_size = (1e-9, 1e-9, 1e-9)
    
    # Create two separate models to ensure clean state
    model_low = HydrogenFluxModel(grid_size, cell_size)
    model_high = HydrogenFluxModel(grid_size, cell_size)
    
    # Set same initial trapped concentration for both
    initial_trapped = model_low.params.trap_density * 0.5
    model_low.trapped_concentration[:] = initial_trapped
    model_high.trapped_concentration[:] = initial_trapped
    
    # Set same initial concentration for both
    model_low.concentration[:] = model_low.params.initial_concentration
    model_high.concentration[:] = model_high.params.initial_concentration
    
    # Run at low temperature
    model_low.temperature[:] = 300.0
    model_low.step()
    trapped_low_temp = model_low.trapped_concentration.copy()
    
    # Run at high temperature
    model_high.temperature[:] = 600.0
    model_high.step()
    trapped_high_temp = model_high.trapped_concentration.copy()
    
    # Higher temperature should result in more detrapping (less trapped concentration)
    assert np.mean(trapped_high_temp) < np.mean(trapped_low_temp), \
        f"Detrapping should increase with temperature. Low temp mean: {np.mean(trapped_low_temp):.6e}, High temp mean: {np.mean(trapped_high_temp):.6e}"


def test_surface_loading():
    """Test that surface loading regions work correctly."""
    grid_size = (10, 10, 10)
    cell_size = (1e-9, 1e-9, 1e-9)
    
    model = HydrogenFluxModel(grid_size, cell_size)
    
    # Create a loading region with high rate
    loading_rate = 1e-2
    model.create_surface_loading_region('left', loading_rate)
    
    # Check that the region is marked correctly
    assert np.any(model.material_type == 5)  # 5 is loading region type
    assert 'left' in model.loading_regions
    
    # The loading functionality itself is tested through the compute_source_term 
    # function which is called during the step() method 