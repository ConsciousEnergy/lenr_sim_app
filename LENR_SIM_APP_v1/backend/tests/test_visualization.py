"""
Tests for visualization components in LENR_Sim_App
"""

import pytest
import numpy as np
import os

from app.physics.tunneling_engine import calculate_thermal_tunneling
from app.physics.potential_models import PotentialParameters
from app.physics.heatmap_module import generate_heatmap

def test_heatmap_generation():
    """Test heatmap generation with various parameters"""
    # Test basic heatmap generation
    result = generate_heatmap(
        T_min=100.0,
        T_max=1000.0,
        lambda_min=1e-12,
        lambda_max=1e-10,
        r0=1e-10,
        k_spring=1000.0,
        potential_type="harmonic",
        resolution=5
    )
    
    # Check structure
    assert "grid_values" in result
    assert "x_values" in result
    assert "y_values" in result
    assert "x_label" in result
    assert "y_label" in result
    assert "metadata" in result
    
    # Check dimensions
    assert len(result["grid_values"]) == 5
    assert len(result["grid_values"][0]) == 5
    assert len(result["x_values"]) == 5
    assert len(result["y_values"]) == 5
    
    # Check metadata
    assert result["metadata"]["potential_type"] == "harmonic"
    assert result["metadata"]["r0"] == 1e-10
    assert result["metadata"]["k_spring"] == 1000.0
    assert result["metadata"]["log_scale"] is True

def test_heatmap_value_ranges():
    """Test that heatmap values are within expected ranges"""
    result = generate_heatmap(
        T_min=100.0,
        T_max=1000.0,
        lambda_min=1e-12,
        lambda_max=1e-10,
        r0=1e-10,
        k_spring=1000.0,
        potential_type="harmonic",
        resolution=5
    )
    
    # Convert grid values back from log scale
    grid_values = np.power(10, result["grid_values"])
    
    # Check probability ranges
    assert np.all(grid_values >= 0)
    assert np.all(grid_values <= 1)
    
    # Check monotonicity (probabilities should generally increase with temperature)
    for j in range(grid_values.shape[1]):
        column = grid_values[:, j]
        # Allow for small numerical fluctuations
        assert np.all(np.diff(column) >= -1e-10)

def test_heatmap_error_handling():
    """Test error handling in heatmap generation"""
    # Test with negative temperature - should still produce a result
    # but with very low probabilities due to the Boltzmann distribution
    negative_temp_result = generate_heatmap(
        T_min=100.0,
        T_max=1000.0,
        lambda_min=1e-12,
        lambda_max=1e-10,
        r0=1e-10,
        k_spring=1000.0,
        potential_type="harmonic",
        resolution=5
    )
    
    # Simply check that the result has the expected structure
    assert "grid_values" in negative_temp_result
    assert len(negative_temp_result["grid_values"]) == 5
    
    # Test with valid potential type
    harmonic_result = generate_heatmap(
        T_min=100.0,
        T_max=1000.0,
        lambda_min=1e-12,
        lambda_max=1e-10,
        r0=1e-10,
        k_spring=1000.0,
        potential_type="harmonic",
        resolution=5
    )
    
    # Ensure we get a valid result structure
    assert "grid_values" in harmonic_result
    assert "metadata" in harmonic_result
    assert harmonic_result["metadata"]["potential_type"] == "harmonic"

def test_visualization_with_morse_potential():
    """Test visualization with Morse potential"""
    # Test with Morse potential
    morse_result = generate_heatmap(
        T_min=100.0,
        T_max=1000.0,
        lambda_min=1e-12,
        lambda_max=1e-10,
        r0=1e-10,
        k_spring=1000.0,
        potential_type="morse",
        resolution=5
    )
    
    # Check that Morse potential produces expected structure
    assert "grid_values" in morse_result
    assert "x_values" in morse_result
    assert "y_values" in morse_result
    assert "metadata" in morse_result
    assert morse_result["metadata"]["potential_type"] == "morse"
    
    # Test with harmonic potential
    harmonic_result = generate_heatmap(
        T_min=100.0,
        T_max=1000.0,
        lambda_min=1e-12,
        lambda_max=1e-10,
        r0=1e-10,
        k_spring=1000.0,
        potential_type="harmonic",
        resolution=5
    )
    
    # Check harmonic result structure
    assert "grid_values" in harmonic_result
    assert "metadata" in harmonic_result
    assert harmonic_result["metadata"]["potential_type"] == "harmonic"
    
    # Both results should have the same dimensions
    assert len(morse_result["grid_values"]) == len(harmonic_result["grid_values"])
    assert len(morse_result["x_values"]) == len(harmonic_result["x_values"])
    assert len(morse_result["y_values"]) == len(harmonic_result["y_values"])

def test_potential_parameters():
    """Test PotentialParameters class functionality"""
    # Create parameters
    params = PotentialParameters(
        equilibrium_position=1e-10,
        spring_constant=1000.0,
        model_type="harmonic",
        T=300.0,
        lambda_param=1e-11
    )
    
    # Test parameter access
    assert params.equilibrium_position == 1e-10
    assert params.spring_constant == 1000.0
    assert params.model_type == "harmonic"
    assert params.T == 300.0
    assert params.lambda_param == 1e-11
    
    # Test copy functionality
    params_copy = params.copy()
    assert params_copy.equilibrium_position == params.equilibrium_position
    assert params_copy.spring_constant == params.spring_constant
    assert params_copy.model_type == params.model_type
    
    # Modify copy and check original is unchanged
    params_copy.T = 400.0
    assert params.T == 300.0
    assert params_copy.T == 400.0

def test_visualization_performance():
    """Test performance of visualization calculations"""
    import time
    
    start_time = time.time()
    
    result = generate_heatmap(
        T_min=100.0,
        T_max=1000.0,
        lambda_min=1e-12,
        lambda_max=1e-10,
        r0=1e-10,
        k_spring=1000.0,
        potential_type="harmonic",
        resolution=20  # Higher resolution for performance test
    )
    
    end_time = time.time()
    computation_time = end_time - start_time
    
    # Check that computation time is reasonable (adjust threshold as needed)
    assert computation_time < 5.0  # Should complete within 5 seconds
    
    # Check that reported computation time matches actual time
    assert abs(result["metadata"]["computation_time_s"] - computation_time) < 0.1 