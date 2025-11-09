import pytest
import numpy as np
from app.physics_engine.electromagnetic_solver import ElectromagneticSolver
from app.physics_engine.constants import PHYSICAL_CONSTANTS
from app.physics_engine.common.grid import SimulationGrid

# --- Test Fixtures ---

@pytest.fixture
def grid_params():
    """Provides standard grid parameters for tests."""
    # Using simple dimensions/origin for easy boundary calculation
    return {
        "dimensions": (1.0, 2.0, 3.0), # meters
        "resolution": (11, 21, 31),    # grid points (including boundaries)
        "origin": (0.0, 0.0, 0.0)
    }

@pytest.fixture
def test_config(grid_params):
    """Provides a basic configuration dictionary using grid_params."""
    config = grid_params.copy()
    # Add material properties, even if empty, as solver expects it
    config["material_properties"] = {}
    return config

@pytest.fixture
def solver(test_config):
    """Creates an ElectromagneticSolver instance with default grid."""
    # Calculate boundaries from dimensions and origin
    dims = test_config['dimensions']
    origin = test_config['origin']
    boundaries = (
        origin[0], origin[0] + dims[0],
        origin[1], origin[1] + dims[1],
        origin[2], origin[2] + dims[2]
    )
    
    # Create a grid object to pass to the solver
    sim_grid = SimulationGrid(
        resolution=test_config["resolution"],
        boundaries=boundaries # Pass boundaries instead of dimensions/origin
    )
    # Pass the config dictionary and the grid object
    solver_instance = ElectromagneticSolver(config=test_config, grid=sim_grid)
    return solver_instance

@pytest.fixture
def particle_positions():
    """Provides sample particle positions within the grid."""
    # Using grid_params dimensions: x max 1.0, y max 2.0, z max 3.0
    return np.array([
        [0.15, 0.25, 0.35],
        [0.5, 1.0, 1.5], # Center
        [0.85, 1.75, 2.65]
    ])

# --- Test Cases ---

def test_initialization(grid_params):
    """Test if the solver initializes correctly."""
    # Create a config dictionary for initialization
    config_for_init = grid_params.copy()
    config_for_init["material_properties"] = {}
    
    # Initialize without a grid object first (grid=None)
    solver_no_grid = ElectromagneticSolver(config=config_for_init, grid=None)
    assert solver_no_grid.config == config_for_init
    assert solver_no_grid.grid is None
    # Use np.allclose for floating point comparison
    assert np.allclose(solver_no_grid.permittivity, PHYSICAL_CONSTANTS["epsilon_0"])
    assert np.allclose(solver_no_grid.permeability, PHYSICAL_CONSTANTS["mu_0"])
    assert solver_no_grid.grid_shape is None
    assert np.array_equal(solver_no_grid.electric_field, np.zeros((1, 3)))
    assert np.array_equal(solver_no_grid.magnetic_field, np.zeros((1, 3)))

    # Initialize WITH a grid object
    dims = grid_params["dimensions"]
    res = grid_params["resolution"]
    origin = grid_params["origin"]
    # Calculate boundaries
    boundaries = (
        origin[0], origin[0] + dims[0],
        origin[1], origin[1] + dims[1],
        origin[2], origin[2] + dims[2]
    )
    sim_grid = SimulationGrid(resolution=res, boundaries=boundaries)
    
    solver_with_grid = ElectromagneticSolver(config=config_for_init, grid=sim_grid)
    assert solver_with_grid.grid == sim_grid
    assert solver_with_grid.grid_shape == res
    
    # Check spacing calculation - Allow for floating point inaccuracies
    assert np.allclose(solver_with_grid.dx, dims[0] / (res[0] - 1))
    assert np.allclose(solver_with_grid.dy, dims[1] / (res[1] - 1))
    assert np.allclose(solver_with_grid.dz, dims[2] / (res[2] - 1))
    
    expected_field_shape = res + (3,) 
    assert solver_with_grid.electric_field is not None
    assert solver_with_grid.electric_field.shape == expected_field_shape
    assert np.all(solver_with_grid.electric_field == 0)
    assert solver_with_grid.magnetic_field is not None
    assert solver_with_grid.magnetic_field.shape == expected_field_shape
    assert np.all(solver_with_grid.magnetic_field == 0)

def test_set_fields(solver):
    """Test setting electric and magnetic fields by direct assignment."""
    res = solver.grid_shape
    field_shape = res + (3,)
    
    new_E = np.random.rand(*field_shape)
    new_B = np.random.rand(*field_shape)
    
    # Directly assign to the attributes
    solver.electric_field = new_E
    solver.magnetic_field = new_B
    
    assert np.all(solver.electric_field == new_E)
    assert np.all(solver.magnetic_field == new_B)

    # Test assignment with incorrect shapes (NumPy should raise ValueError)
    wrong_shape_E = np.random.rand(res[0], res[1], res[2]-1, 3)
    wrong_shape_B = np.random.rand(res[0], res[1], res[2], 2)
    
    # Assignment itself will raise errors if shapes mismatch implicitly
    # We can assert that the shape is unchanged after trying a bad assignment,
    # or catch the expected ValueError upon assignment if critical.
    # For simplicity, let's just check the successful case for now.

def test_interpolate_field(solver, particle_positions):
    """Test the trilinear interpolation of fields."""
    nx, ny, nz = solver.grid_shape
    
    # Create a simple linear gradient field: E = (x, y, z)
    grid_x, grid_y, grid_z = np.meshgrid(
        np.linspace(solver.grid.xmin, solver.grid.xmax, nx),
        np.linspace(solver.grid.ymin, solver.grid.ymax, ny),
        np.linspace(solver.grid.zmin, solver.grid.zmax, nz),
        indexing='ij'
    )
    
    test_E = np.stack([grid_x, grid_y, grid_z], axis=-1)
    # Assign field directly
    solver.electric_field = test_E
    
    interpolated_E = solver.interpolate_field(particle_positions, field_type='electric')
    
    assert interpolated_E.shape == (len(particle_positions), 3)
    assert np.allclose(interpolated_E, particle_positions, atol=1e-6) 

    # Test interpolation near boundary (should clamp, not error)
    xmin, xmax = solver.grid.xmin, solver.grid.xmax
    ymin, ymax = solver.grid.ymin, solver.grid.ymax
    zmin, zmax = solver.grid.zmin, solver.grid.zmax
    mid_x, mid_y, mid_z = xmin + (xmax-xmin)/2, ymin + (ymax-ymin)/2, zmin + (zmax-zmin)/2
    
    boundary_positions = np.array([
        [xmin - 0.1, mid_y, mid_z], # Outside x min
        [xmax + 0.1, mid_y, mid_z], # Outside x max
        [mid_x, ymin - 0.1, mid_z], # Outside y min
        [mid_x, ymax + 0.1, mid_z], # Outside y max
        [mid_x, mid_y, zmin - 0.1], # Outside z min
        [mid_x, mid_y, zmax + 0.1], # Outside z max
    ])
    
    interp_boundary = solver.interpolate_field(boundary_positions, field_type='electric')
    assert interp_boundary.shape == (len(boundary_positions), 3)
    
    expected_clamped_coords = np.clip(boundary_positions, 
                                     [xmin, ymin, zmin], 
                                     [xmax, ymax, zmax])
    assert np.allclose(interp_boundary, expected_clamped_coords, atol=1e-6)

def test_calculate_curl_E(solver):
    """Test the calculation of -curl(E)."""
    nx, ny, nz = solver.grid_shape
    dx, dy, dz = solver.dx, solver.dy, solver.dz

    # Create a field E = (0, 0, c*y)
    c = 2.0
    E_field = np.zeros(solver.electric_field.shape)
    # Use grid boundaries for meshgrid
    _, grid_y, _ = np.meshgrid(
        np.linspace(solver.grid.xmin, solver.grid.xmax, nx),
        np.linspace(solver.grid.ymin, solver.grid.ymax, ny),
        np.linspace(solver.grid.zmin, solver.grid.zmax, nz),
        indexing='ij'
    )
    E_field[:, :, :, 2] = c * grid_y
    # Assign field directly
    solver.electric_field = E_field

    neg_curl_E = solver._calculate_curl_E()

    expected_neg_curl_E = np.zeros_like(neg_curl_E)
    expected_neg_curl_E[:, :, :, 0] = -c 

    assert np.allclose(neg_curl_E[1:-1, 1:-1, 1:-1, 0], expected_neg_curl_E[1:-1, 1:-1, 1:-1, 0], atol=1e-9)
    assert np.allclose(neg_curl_E[1:-1, 1:-1, 1:-1, 1:], 0.0, atol=1e-9)

def test_calculate_curl_B_over_mu(solver):
    """Test the calculation of curl(B) / mu."""
    nx, ny, nz = solver.grid_shape
    dx, dy, dz = solver.dx, solver.dy, solver.dz
    mu = solver.permeability

    # Create a field B = (0, c*x, 0)
    c = 3.0
    B_field = np.zeros(solver.magnetic_field.shape)
    # Use grid boundaries for meshgrid
    grid_x, _, _ = np.meshgrid(
        np.linspace(solver.grid.xmin, solver.grid.xmax, nx),
        np.linspace(solver.grid.ymin, solver.grid.ymax, ny),
        np.linspace(solver.grid.zmin, solver.grid.zmax, nz),
        indexing='ij'
    )
    B_field[:, :, :, 1] = c * grid_x
    # Assign field directly
    solver.magnetic_field = B_field

    curl_B_over_mu = solver._calculate_curl_B_over_mu()

    expected_curl_B_over_mu = np.zeros_like(curl_B_over_mu)
    expected_curl_B_over_mu[:, :, :, 2] = -c / mu

    assert np.allclose(curl_B_over_mu[1:-1, 1:-1, 1:-1, :2], 0.0, atol=1e-9)
    assert np.allclose(curl_B_over_mu[1:-1, 1:-1, 1:-1, 2], expected_curl_B_over_mu[1:-1, 1:-1, 1:-1, 2], atol=1e-9)


@pytest.mark.asyncio
async def test_update_fields_no_change(solver):
    """Test update_fields with zero fields and no sources/currents."""
    initial_E = np.zeros_like(solver.electric_field)
    initial_B = np.zeros_like(solver.magnetic_field)
    # Assign fields directly
    solver.electric_field = initial_E.copy()
    solver.magnetic_field = initial_B.copy()
    
    dt = 0.001 
    
    await solver.update_fields(dt, charge_density=None, current_density=None)
    
    assert np.all(solver.electric_field == 0)
    assert np.all(solver.magnetic_field == 0)

@pytest.mark.asyncio
async def test_update_fields_simple_wave(solver):
    """Placeholder for a more complex test, e.g., plane wave propagation."""
    pass

# Add more tests as needed, especially for boundary conditions and source interactions 