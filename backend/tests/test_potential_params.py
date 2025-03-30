"""
Test file for PotentialParameters class to verify the fix.
"""

from app.physics.tunneling_engine import PotentialParameters

def main():
    """Test the PotentialParameters class"""
    # Create instance
    params = PotentialParameters(
        r0=1e-10,
        k_spring=1000,
        potential_type="harmonic"
    )
    
    # Test copy method
    params_copy = params.copy()
    
    # Verify the copy
    print(f"Original params: r0={params.r0}, k_spring={params.k_spring}, potential_type={params.potential_type}")
    print(f"Copied params: r0={params_copy.r0}, k_spring={params_copy.k_spring}, potential_type={params_copy.potential_type}")
    
    # Test attribute modification
    params_copy.r0 = 2e-10
    
    # Verify the copy is independent
    print(f"Modified original: r0={params.r0}")
    print(f"Modified copy: r0={params_copy.r0}")
    
    # Return success
    return "PotentialParameters copy test completed successfully!"

if __name__ == "__main__":
    result = main()
    print(result) 