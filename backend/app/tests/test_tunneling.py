"""
Tests for tunneling engine in LENR_Sim_App
"""

import pytest
import numpy as np
from app.physics.tunneling_engine import (
    calculate_energy_levels,
    calculate_thermal_tunneling,
    calculate_impact_tunneling
)

def test_calculate_energy_levels():
    """Test energy level calculation"""
    # Test parameters
    r0 = 1e-10
    k_spring = 1000
    n_levels = 3
    
    # Calculate energy levels for harmonic potential
    harmonic_levels = calculate_energy_levels(r0, k_spring, "harmonic", n_levels)
    
    # Verify correct number of levels
    assert len(harmonic_levels) == n_levels
    
    # Verify energy increases with quantum number
    energies = [level["energy"] for level in harmonic_levels]
    assert energies[0] < energies[1] < energies[2]
    
    # Verify zero-point energy is present (n=0 has non-zero energy)
    assert energies[0] > 0
    
    # Calculate energy levels for Morse potential
    morse_levels = calculate_energy_levels(r0, k_spring, "morse", n_levels)
    
    # Verify correct number of levels
    assert len(morse_levels) == n_levels
    
    # Verify anharmonicity (spacing between levels decreases)
    harmonic_spacing = [energies[i+1] - energies[i] for i in range(len(energies)-1)]
    morse_energies = [level["energy"] for level in morse_levels]
    morse_spacing = [morse_energies[i+1] - morse_energies[i] for i in range(len(morse_energies)-1)]
    
    # In Morse potential, level spacing decreases with quantum number
    assert morse_spacing[0] > morse_spacing[1]

def test_thermal_tunneling():
    """Test thermal tunneling calculation"""
    # Test parameters
    T = 300  # K
    lambda_param = 1e-10  # m
    r0 = 1e-10  # m
    k_spring = 1000  # N/m
    
    # Calculate tunneling probability
    result = calculate_thermal_tunneling(T, lambda_param, r0, k_spring, "harmonic")
    
    # Verify output structure
    assert "probability" in result
    assert "energy_levels" in result
    assert "metadata" in result
    
    # Verify probability is positive and less than 1
    assert 0 <= result["probability"] <= 1
    
    # Test temperature dependence
    result_high_T = calculate_thermal_tunneling(T * 2, lambda_param, r0, k_spring, "harmonic")
    # Higher temperature should generally give higher tunneling probability
    assert result_high_T["probability"] >= result["probability"]
    
    # Test lambda dependence
    result_high_lambda = calculate_thermal_tunneling(T, lambda_param * 2, r0, k_spring, "harmonic")
    # Larger lambda (smaller barrier) should give higher tunneling probability
    assert result_high_lambda["probability"] >= result["probability"]

def test_impact_tunneling():
    """Test impact tunneling calculation"""
    # Test parameters
    T_impact = 5000  # K
    lambda_param = 1e-10  # m
    r0 = 1e-10  # m
    k_spring = 1000  # N/m
    impact_duration = 1e-12  # s
    
    # Calculate tunneling probability
    result = calculate_impact_tunneling(
        T_impact,
        lambda_param,
        r0,
        k_spring,
        "harmonic",
        impact_duration
    )
    
    # Verify output structure
    assert "probability" in result
    assert "energy_levels" in result
    assert "metadata" in result
    
    # Verify probability is positive and less than 1
    assert 0 <= result["probability"] <= 1
    
    # Test impact duration dependence
    result_short = calculate_impact_tunneling(
        T_impact,
        lambda_param,
        r0,
        k_spring,
        "harmonic",
        impact_duration / 2
    )
    # Shorter impact duration should reduce tunneling probability in our model
    assert result_short["probability"] <= result["probability"]
    
    # Compare thermal vs impact
    thermal_result = calculate_thermal_tunneling(T_impact, lambda_param, r0, k_spring, "harmonic")
    # Impact model result should differ from thermal at same temperature
    assert result["probability"] != thermal_result["probability"] 