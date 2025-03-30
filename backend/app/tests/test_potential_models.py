"""
Tests for potential models in LENR_Sim_App
"""

import pytest
import numpy as np
from app.physics.potential_models import (
    harmonic_potential,
    morse_potential,
    coulomb_barrier,
    combined_potential,
    find_classical_turning_points
)

def test_harmonic_potential():
    """Test harmonic potential function"""
    # Test parameters
    r0 = 1e-10  # equilibrium position
    k_spring = 1000  # spring constant
    
    # Test positions
    x = np.array([r0 - 1e-11, r0, r0 + 1e-11])
    
    # Calculate potential
    V = harmonic_potential(x, r0, k_spring)
    
    # Verify potential is zero at equilibrium
    assert V[1] == 0.0
    
    # Verify symmetry around equilibrium
    assert np.isclose(V[0], V[2])
    
    # Verify magnitude
    expected_V = 0.5 * k_spring * (1e-11)**2
    assert np.isclose(V[0], expected_V)

def test_morse_potential():
    """Test Morse potential function"""
    # Test parameters
    r0 = 1e-10  # equilibrium position
    k_spring = 1000  # spring constant
    
    # Test positions
    x = np.array([r0 - 1e-11, r0, r0 + 1e-11, r0 + 1e-9])
    
    # Calculate potential
    V = morse_potential(x, r0, k_spring)
    
    # Verify potential is zero at equilibrium
    assert V[1] == 0.0
    
    # Verify asymmetry (Morse potential is not symmetric)
    assert V[0] != V[2]
    
    # Verify dissociation limit
    De = k_spring * r0**2 / 2
    assert V[3] < De * 1.1  # Should be approaching but not exceeding De

def test_coulomb_barrier():
    """Test Coulomb barrier function"""
    # Test parameters
    Z1 = 1.0  # Atomic number of first nucleus
    Z2 = 1.0  # Atomic number of second nucleus
    
    # Test positions (avoid r=0)
    x = np.array([1e-12, 1e-11, 1e-10])
    
    # Calculate potential
    V = coulomb_barrier(x, Z1, Z2)
    
    # Verify 1/r dependence
    ratio1 = V[0] / V[1]
    ratio2 = V[1] / V[2]
    
    assert np.isclose(ratio1, 10.0)
    assert np.isclose(ratio2, 10.0)

def test_combined_potential():
    """Test combined potential function"""
    # Test parameters
    r0 = 1e-10  # equilibrium position
    k_spring = 1000  # spring constant
    Z1 = 1.0
    Z2 = 1.0
    
    # Test positions
    x = np.array([r0 - 1e-11, r0, r0 + 1e-11])
    
    # Test different combinations
    V_harmonic = combined_potential(x, r0, k_spring, Z1, Z2, potential_type="harmonic", include_coulomb=False)
    V_morse = combined_potential(x, r0, k_spring, Z1, Z2, potential_type="morse", include_coulomb=False)
    V_combined = combined_potential(x, r0, k_spring, Z1, Z2, potential_type="harmonic", include_coulomb=True)
    
    # Verify that harmonic component matches the standalone function
    V_harmonic_standalone = harmonic_potential(x, r0, k_spring)
    assert np.allclose(V_harmonic, V_harmonic_standalone)
    
    # Verify combined potential includes Coulomb contribution
    assert np.all(V_combined > V_harmonic)

def test_find_classical_turning_points():
    """Test finding classical turning points"""
    # Create harmonic potential
    r0 = 1e-10
    k_spring = 1000
    potential_func = lambda x: harmonic_potential(x, r0, k_spring)
    
    # Energy level
    energy = k_spring * (1e-11)**2 / 2  # Should give turning points at r0 ± 1e-11
    
    # Find turning points
    x1, x2 = find_classical_turning_points(
        energy,
        potential_func,
        x_min=r0 - 1e-10,
        x_max=r0 + 1e-10,
        num_points=1000
    )
    
    # Verify turning points are symmetric around r0
    assert np.isclose(x1, r0 - 1e-11, rtol=1e-3)
    assert np.isclose(x2, r0 + 1e-11, rtol=1e-3) 