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
from app.physics.potential_models import PotentialParameters

def test_calculate_energy_levels():
    """Test energy level calculation"""
    # Test parameters
    r0 = 1e-10
    k_spring = 1000
    n_levels = 3
    
    # Create parameters object for harmonic potential
    harmonic_params = PotentialParameters(
        equilibrium_position=r0,
        spring_constant=k_spring,
        model_type="harmonic"
    )
    
    # Calculate energy levels for harmonic potential
    harmonic_levels = calculate_energy_levels(harmonic_params)
    
    # Verify correct number of levels
    assert len(harmonic_levels) == 10  # Default is 10 levels
    harmonic_levels = harmonic_levels[:n_levels]  # Take just the first 3
    
    # Verify energy increases with quantum number
    energies = [level["energy"] for level in harmonic_levels]
    assert energies[0] < energies[1] < energies[2]
    
    # Verify zero-point energy is present (n=0 has non-zero energy)
    assert energies[0] > 0
    
    # Create parameters object for Morse potential
    morse_params = PotentialParameters(
        equilibrium_position=r0,
        spring_constant=k_spring,
        model_type="morse"
    )
    
    # Calculate energy levels for Morse potential
    morse_levels = calculate_energy_levels(morse_params)
    
    # Verify correct number of levels
    assert len(morse_levels) > 0
    morse_levels = morse_levels[:n_levels]  # Take just the first 3
    
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
    
    # Create parameters object
    params = PotentialParameters(
        equilibrium_position=r0,
        spring_constant=k_spring,
        model_type="harmonic",
        T=T,
        lambda_param=lambda_param
    )
    
    # Calculate tunneling probability
    result = calculate_thermal_tunneling(params)
    
    # Verify output structure
    assert "probability" in result
    assert "energy_levels" in result
    assert "metadata" in result
    
    # Verify probability is positive and less than 1
    assert 0 <= result["probability"] <= 1
    
    # Test temperature dependence
    params_high_T = params.copy()
    params_high_T.T = T * 2
    result_high_T = calculate_thermal_tunneling(params_high_T)
    
    # Higher temperature should generally give higher tunneling probability
    assert result_high_T["probability"] >= result["probability"]
    
    # Test lambda dependence
    params_high_lambda = params.copy()
    params_high_lambda.lambda_param = lambda_param * 2
    result_high_lambda = calculate_thermal_tunneling(params_high_lambda)
    
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
    
    # Create parameter object
    params = PotentialParameters(
        equilibrium_position=r0,
        spring_constant=k_spring,
        model_type="harmonic",
        T=T_impact,
        lambda_param=lambda_param
    )
    
    # Calculate tunneling probability
    result = calculate_impact_tunneling(
        T_impact=T_impact,
        lambda_param=lambda_param,
        r0=r0,
        k_spring=k_spring,
        potential_type="harmonic",
        impact_duration=impact_duration
    )
    
    # Verify output structure
    assert "probability" in result
    assert "energy_levels" in result
    assert "metadata" in result
    
    # Verify probability is positive and less than 1
    assert 0 <= result["probability"] <= 1
    
    # Test impact duration dependence
    result_short = calculate_impact_tunneling(
        T_impact=T_impact,
        lambda_param=lambda_param,
        r0=r0,
        k_spring=k_spring,
        potential_type="harmonic",
        impact_duration=impact_duration / 2
    )
    
    # Shorter impact duration should reduce tunneling probability in our model
    assert result_short["probability"] <= result["probability"]
    
    # Compare thermal vs impact
    result_thermal = calculate_thermal_tunneling(params)
    
    # Impact model result should differ from thermal at same temperature
    assert result["probability"] != result_thermal["probability"] 