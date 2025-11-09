"""
Test file for PotentialParameters class to verify the fix.
"""
import pytest
from app.physics.potential_models import PotentialParameters

def test_potential_params():
    """Test the PotentialParameters class"""
    # Create test parameters
    params = PotentialParameters(
        model_type="morse",
        depth=2.0,
        width=0.5,
        equilibrium_position=0.8,
        spring_constant=20.0,
        reference_point=0.1,
        custom_param="test",
        another_custom=123
    )
    
    # Test basic parameter access
    assert params.model_type == "morse"
    assert params.depth == 2.0
    assert params.custom_param == "test"
    
    # Test copy method
    params_copy = params.copy()
    
    # Verify copy has all the original attributes
    assert params_copy.model_type == params.model_type
    assert params_copy.custom_param == params.custom_param
    assert params_copy.another_custom == 123
    
    # Verify modifying copy doesn't affect original
    params_copy.depth = 3.0
    assert params.depth == 2.0
    
    return "PotentialParameters copy test completed successfully!"

if __name__ == "__main__":
    result = test_potential_params()
    print(result) 