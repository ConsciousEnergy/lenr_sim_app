"""
Configuration file for pytest with fixtures and utilities for LENR simulation testing.
"""

import os
import sys
import pytest
from pathlib import Path

# Add the backend directory to the path so we can import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

# Import app modules
from app.core.config import get_settings
from app.core.logging import setup_logging
from .mocks.redis_mock import MockRedis
from .mocks.vtk_mock import MockVTK
from .mocks.numpy_mock import MockNumPy
from .mocks.http_mock import MockHTTPClient

# Setup application-wide test fixtures
@pytest.fixture(scope="session")
def test_settings():
    """Return test settings for the application."""
    # Override settings for testing environment
    return get_settings(env_file=".env.test")

@pytest.fixture(scope="session")
def setup_test_environment():
    """Set up the test environment."""
    # Setup logging for tests
    setup_logging(log_level="DEBUG", log_to_file=False)
    yield
    # Cleanup after all tests have run

@pytest.fixture
def mock_redis():
    """Create a mock Redis instance."""
    return MockRedis(latency_ms=5.0)

@pytest.fixture
def mock_vtk():
    """Create a mock VTK instance."""
    return MockVTK()

@pytest.fixture
def mock_numpy():
    """Create a mock NumPy instance."""
    return MockNumPy(seed=42)

@pytest.fixture
def mock_http():
    """Create a mock HTTP client."""
    return MockHTTPClient(latency_ms=10.0)

@pytest.fixture
def mock_simulation_result():
    """Generate mock simulation result data."""
    return {
        "tunneling": {
            "base_probability": 1e-30,
            "enhanced_probability": 1e-25,
            "enhancement_factor": 1e5
        },
        "reaction_rate": {
            "reactions_per_second": 1e10,
            "power_density_w_m3": 1e2,
            "energy_per_reaction_ev": 3.5e6
        },
        "enhancements": {
            "electron_screening": 1e2,
            "phonon_assistance": 1e3,
            "collective_effects": 5e0
        }
    }

@pytest.fixture
def mock_visualization_data():
    """Generate mock visualization data."""
    import numpy as np
    
    # Create a simple 3D grid
    x = np.linspace(-5, 5, 20)
    y = np.linspace(-5, 5, 20)
    z = np.linspace(-5, 5, 20)
    X, Y, Z = np.meshgrid(x, y, z)
    
    # Create some scalar and vector fields
    scalar_field = np.exp(-(X**2 + Y**2 + Z**2) / 10)
    vector_field = np.stack([
        -Y / (X**2 + Y**2 + 1),
        X / (X**2 + Y**2 + 1),
        np.zeros_like(X)
    ], axis=-1)
    
    return {
        "grid": {
            "x": X,
            "y": Y,
            "z": Z
        },
        "fields": {
            "scalar": scalar_field,
            "vector": vector_field
        }
    }

@pytest.fixture
def mock_physics_constants():
    """Provide mock physics constants for testing."""
    return {
        "planck_constant": 6.62607015e-34,  # J⋅s
        "boltzmann_constant": 1.380649e-23,  # J/K
        "electron_mass": 9.1093837015e-31,  # kg
        "proton_mass": 1.67262192369e-27,  # kg
        "elementary_charge": 1.602176634e-19,  # C
        "vacuum_permittivity": 8.8541878128e-12,  # F/m
        "fine_structure_constant": 7.297352569e-3,  # dimensionless
        "speed_of_light": 299792458  # m/s
    }

@pytest.fixture
def mock_reaction_parameters():
    """Provide mock reaction parameters for testing."""
    return {
        "temperature": 300.0,  # K
        "pressure": 1.0e5,  # Pa
        "concentration": {
            "deuterium": 0.9,  # mol fraction
            "hydrogen": 0.1  # mol fraction
        },
        "lattice": {
            "material": "palladium",
            "loading_ratio": 0.85,  # D/Pd ratio
            "crystal_structure": "fcc",
            "lattice_constant": 3.89e-10  # m
        },
        "electric_field": {
            "strength": 1.0e6,  # V/m
            "frequency": 1.0e6  # Hz
        }
    }

@pytest.fixture
def sample_reaction_params():
    """Return sample reaction parameters for testing."""
    from app.physics.integrated_mechanisms import IntegratedSimulationParameters
    
    return IntegratedSimulationParameters(
        reaction_name="d-d",
        projectile_z=1,
        projectile_a=2,
        target_z=1,
        target_a=2,
        temperature=300,  # Room temperature in K
        pressure=1e5,     # Atmospheric pressure in Pa
        electric_field=0,
        lattice_constant=4e-10,
        debye_temperature=300,
        loading_ratio=0.8
    )

@pytest.fixture
def sample_lattice_params():
    """Return sample lattice parameters for testing."""
    from app.physics.phonon_modes import LatticeParameters
    
    return LatticeParameters(
        lattice_type="fcc",
        lattice_constant=4e-10,
        debye_temperature=300,
        temperature=300,
        has_loading=True,
        loading_element="H",
        loading_ratio=0.8
    )

# Utility functions for validating physics results
def validate_probability(value):
    """Validate that a value is a valid probability (between 0 and 1)."""
    assert 0 <= value <= 1, f"Expected probability between 0 and 1, got {value}"
    
def validate_non_negative(value):
    """Validate that a value is non-negative."""
    assert value >= 0, f"Expected non-negative value, got {value}"

def validate_positive(value):
    """Validate that a value is positive."""
    assert value > 0, f"Expected positive value, got {value}" 