"""
Test file for the heatmap module to verify it works with the PotentialParameters copy method.
"""
import pytest
import numpy as np
from app.physics.heatmap_module import generate_heatmap

def test_heatmap_generation():
    """Test the heatmap generation with small resolution to verify functionality"""
    # Use small resolution for faster testing
    resolution = 3
    
    # Test parameters
    T_min = 100.0
    T_max = 300.0
    lambda_min = 1e-11
    lambda_max = 1e-10
    r0 = 1e-10
    k_spring = 500.0
    potential_type = "harmonic"
    
    # Generate the heatmap
    result = generate_heatmap(
        T_min=T_min,
        T_max=T_max,
        lambda_min=lambda_min,
        lambda_max=lambda_max,
        r0=r0,
        k_spring=k_spring,
        potential_type=potential_type,
        resolution=resolution
    )
    
    # Verify the shape of the result
    assert len(result["grid_values"]) == resolution
    assert len(result["grid_values"][0]) == resolution
    assert len(result["x_values"]) == resolution
    assert len(result["y_values"]) == resolution
    
    # Verify the metadata
    assert result["metadata"]["resolution"] == resolution
    assert result["metadata"]["potential_type"] == potential_type
    assert result["metadata"]["r0"] == r0
    assert result["metadata"]["k_spring"] == k_spring
    
    # Check that the x and y values are correct
    assert np.isclose(result["x_values"][0], lambda_min)
    assert np.isclose(result["x_values"][-1], lambda_max)
    assert np.isclose(result["y_values"][0], T_min)
    assert np.isclose(result["y_values"][-1], T_max)
    
    # Verify axis labels
    assert result["x_label"] == "Lambda (m)"
    assert result["y_label"] == "Temperature (K)"
    
    return "Heatmap generation test completed successfully!"

if __name__ == "__main__":
    result = test_heatmap_generation()
    print(result) 