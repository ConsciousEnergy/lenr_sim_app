"""
LENR Simulation App - Comprehensive Test Suite

This file organizes all tests for the LENR simulation application to ensure 
proper functionality across all components.
"""

import pytest
import numpy as np
import os
import sys
import json
from fastapi.testclient import TestClient
import scipy.constants as const

# Add the parent directory to the path so we can import the app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app
from app.physics.potential_models import (
    harmonic_potential, 
    morse_potential, 
    coulomb_barrier, 
    combined_potential,
    get_potential_function,
    find_classical_turning_points,
    PotentialParameters
)
from app.physics.tunneling_engine import (
    calculate_energy_levels,
    calculate_thermal_tunneling,
    calculate_impact_tunneling
)
from app.physics.heatmap_module import generate_heatmap

# Create a test client for API testing
client = TestClient(app)

# ================ Physics Models Tests ================

class TestPotentialModels:
    """Tests for the potential energy models"""
    
    def test_harmonic_potential(self):
        """Test the harmonic oscillator potential"""
        r0 = 1e-10  # equilibrium position
        k = 1000.0  # spring constant
        
        # Test at minimum
        assert harmonic_potential(np.array([r0]), r0, k)[0] == pytest.approx(0.0)
        
        # Test for symmetric behavior
        x1 = r0 - 1e-11
        x2 = r0 + 1e-11
        v1 = harmonic_potential(np.array([x1]), r0, k)[0]
        v2 = harmonic_potential(np.array([x2]), r0, k)[0]
        assert v1 == pytest.approx(v2)
        
        # Test proportionality to displacement squared
        x3 = r0 + 2e-11
        v3 = harmonic_potential(np.array([x3]), r0, k)[0]
        assert v3 == pytest.approx(4 * v2)
    
    def test_morse_potential(self):
        """Test the Morse potential"""
        r0 = 1e-10  # equilibrium position
        k = 1000.0  # spring constant
        
        # Test at minimum
        assert morse_potential(np.array([r0]), r0, k)[0] == pytest.approx(0.0)
        
        # Test for asymmetric behavior
        x1 = r0 - 1e-11
        x2 = r0 + 1e-11
        v1 = morse_potential(np.array([x1]), r0, k)[0]
        v2 = morse_potential(np.array([x2]), r0, k)[0]
        assert v1 > v2  # Morse is steeper for compression than extension
    
    def test_coulomb_barrier(self):
        """Test the Coulomb barrier function"""
        # Test the 1/r dependence
        r1 = 1e-10
        r2 = 2e-10
        Z1 = 1.0
        Z2 = 1.0
        
        v1 = coulomb_barrier(np.array([r1]), Z1, Z2)[0]
        v2 = coulomb_barrier(np.array([r2]), Z1, Z2)[0]
        
        # Should be inverse relationship with distance
        assert v1 == pytest.approx(2 * v2)
        
        # Test Z dependence
        v3 = coulomb_barrier(np.array([r1]), 2.0, 2.0)[0]
        assert v3 == pytest.approx(4 * v1)
    
    def test_combined_potential(self):
        """Test the combined potential function"""
        r0 = 1e-10
        k = 1000.0
        
        # Test with Coulomb included vs not included
        x = np.array([1.5e-10])
        v_with = combined_potential(x, r0, k, 1.0, 1.0, "harmonic", True)
        v_without = combined_potential(x, r0, k, 1.0, 1.0, "harmonic", False)
        
        # v_with should be greater than v_without because Coulomb adds a positive term
        assert v_with[0] > v_without[0]
        
        # Test combined with different oscillator types
        v_harmonic = combined_potential(x, r0, k, 1.0, 1.0, "harmonic", False)
        v_morse = combined_potential(x, r0, k, 1.0, 1.0, "morse", False)
        
        # For r > r0, Morse potential is smaller than harmonic
        assert v_morse[0] < v_harmonic[0]
    
    def test_get_potential_function(self):
        """Test the function factory for potentials"""
        params = {
            "r0": 1e-10,
            "k_spring": 1000.0,
            "Z1": 1.0,
            "Z2": 1.0
        }
        
        # Get harmonic potential function
        harmonic_func = get_potential_function("harmonic", params)
        x = np.array([1.5e-10])
        
        # Compare with direct call
        direct_value = harmonic_potential(x, params["r0"], params["k_spring"])
        factory_value = harmonic_func(x)
        
        assert factory_value[0] == pytest.approx(direct_value[0])
    
    def test_find_classical_turning_points(self):
        """Test finding classical turning points"""
        # Create a simple harmonic potential
        r0 = 1e-10
        k = 1000.0
        pot_func = lambda x: harmonic_potential(x, r0, k)
        
        # Energy corresponding to a certain amplitude
        amplitude = 1e-11
        energy = 0.5 * k * amplitude**2
        
        # Find turning points
        x_min, x_max = find_classical_turning_points(
            energy, pot_func, 0.5e-10, 1.5e-10, 1000
        )
        
        # Check the turning points are at the expected positions
        expected_min = r0 - amplitude
        expected_max = r0 + amplitude
        
        assert x_min == pytest.approx(expected_min, rel=1e-3)
        assert x_max == pytest.approx(expected_max, rel=1e-3)

# ================ Tunneling Engine Tests ================

class TestTunnelingEngine:
    """Tests for the quantum tunneling engine"""
    
    def test_potential_parameters_class(self):
        """Test the PotentialParameters class functionality"""
        # Create a parameters object
        params = PotentialParameters(
            equilibrium_position=1e-10,
            spring_constant=1000.0,
            model_type="harmonic"
        )
        
        # Test attribute access
        assert params.equilibrium_position == 1e-10
        assert params.spring_constant == 1000.0
        assert params.model_type == "harmonic"
        
        # Test copy method
        params_copy = params.copy()
        params_copy.equilibrium_position = 2e-10
        
        # Original should be unchanged
        assert params.equilibrium_position == 1e-10
        assert params_copy.equilibrium_position == 2e-10
    
    def test_calculate_energy_levels(self):
        """Test energy level calculation"""
        r0 = 1e-10
        k = 1000.0
        
        # Test for harmonic potential
        params_harmonic = PotentialParameters(
            model_type="harmonic",
            equilibrium_position=r0,
            spring_constant=k
        )
        levels_harmonic = calculate_energy_levels(params_harmonic)
        
        # Should have at least 3 levels (default is 10)
        assert len(levels_harmonic) >= 3
        
        # Check energy increases with quantum number
        assert levels_harmonic[1]["energy"] > levels_harmonic[0]["energy"]
        assert levels_harmonic[2]["energy"] > levels_harmonic[1]["energy"]
        
        # Test for Morse potential
        params_morse = PotentialParameters(
            model_type="morse",
            equilibrium_position=r0,
            spring_constant=k
        )
        levels_morse = calculate_energy_levels(params_morse)
        
        # Should have at least 3 levels
        assert len(levels_morse) >= 3
        
        # For Morse, spacing between levels decreases with n
        energy_diff_01 = levels_morse[1]["energy"] - levels_morse[0]["energy"]
        energy_diff_12 = levels_morse[2]["energy"] - levels_morse[1]["energy"]
        
        assert energy_diff_12 < energy_diff_01
    
    def test_calculate_thermal_tunneling(self):
        """Test thermal tunneling calculation"""
        # Test with different temperatures
        params_cold = PotentialParameters(
            model_type="harmonic",
            equilibrium_position=1e-10,
            spring_constant=1000.0,
            T=100.0,
            lambda_param=1e-11
        )
        
        params_hot = PotentialParameters(
            model_type="harmonic",
            equilibrium_position=1e-10,
            spring_constant=1000.0,
            T=1000.0,
            lambda_param=1e-11
        )
        
        result_cold = calculate_thermal_tunneling(params=params_cold)
        result_hot = calculate_thermal_tunneling(params=params_hot)
        
        # Higher temperature should increase tunneling probability
        assert result_hot["probability"] > result_cold["probability"]
        
        # Test with different lambda values
        params_small_lambda = PotentialParameters(
            model_type="harmonic",
            equilibrium_position=1e-10,
            spring_constant=1000.0,
            T=300.0,
            lambda_param=5e-12
        )
        
        params_large_lambda = PotentialParameters(
            model_type="harmonic",
            equilibrium_position=1e-10,
            spring_constant=1000.0,
            T=300.0,
            lambda_param=1e-11
        )
        
        result_small_lambda = calculate_thermal_tunneling(params=params_small_lambda)
        result_large_lambda = calculate_thermal_tunneling(params=params_large_lambda)
        
        # Larger lambda should increase tunneling probability
        assert result_large_lambda["probability"] > result_small_lambda["probability"]
    
    def test_calculate_impact_tunneling(self):
        """Test impact tunneling calculation"""
        # Test with different impact temperatures
        result_low_impact = calculate_impact_tunneling(
            T_impact=5000.0,
            lambda_param=1e-11,
            r0=1e-10,
            k_spring=1000.0,
            potential_type="harmonic"
        )
        
        result_high_impact = calculate_impact_tunneling(
            T_impact=10000.0,
            lambda_param=1e-11,
            r0=1e-10,
            k_spring=1000.0,
            potential_type="harmonic"
        )
        
        # Higher impact temperature should increase tunneling probability
        assert result_high_impact["probability"] > result_low_impact["probability"]
        
        # Test impact duration effect
        result_long = calculate_impact_tunneling(
            T_impact=5000.0,
            lambda_param=1e-11,
            r0=1e-10,
            k_spring=1000.0,
            potential_type="harmonic",
            impact_duration=1e-12
        )
        
        result_short = calculate_impact_tunneling(
            T_impact=5000.0,
            lambda_param=1e-11,
            r0=1e-10,
            k_spring=1000.0,
            potential_type="harmonic",
            impact_duration=5e-13
        )
        
        # Longer duration should increase tunneling probability
        assert result_long["probability"] > result_short["probability"]

# ================ Heatmap Module Tests ================

class TestHeatmapModule:
    """Tests for the heatmap generation module"""
    
    def test_generate_heatmap(self):
        """Test heatmap generation"""
        # Generate a small heatmap for testing
        result = generate_heatmap(
            T_min=100.0,
            T_max=1000.0,
            lambda_min=1e-12,
            lambda_max=1e-10,
            r0=1e-10,
            k_spring=1000.0,
            potential_type="harmonic",
            resolution=5  # Small grid for testing
        )
        
        # Check structure of result
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

# ================ API Endpoint Tests ================

class TestAPIEndpoints:
    """Tests for the FastAPI endpoints"""
    
    def test_root_endpoint(self):
        """Test the root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert "endpoints" in data
    
    def test_health_endpoint(self):
        """Test the health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
    
    def test_thermal_tunneling_endpoint(self):
        """Test the thermal tunneling simulation endpoint"""
        payload = {
            "T": 300.0,
            "lambda": 1e-11,
            "r0": 1e-10,
            "k_spring": 1000.0,
            "potential": "harmonic"
        }
        
        response = client.post("/simulate/thermal", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "probability" in data
        assert "energy_levels" in data
        assert "metadata" in data
        assert "input_params" in data
    
    def test_impact_tunneling_endpoint(self):
        """Test the impact tunneling simulation endpoint"""
        payload = {
            "T_impact": 5000.0,
            "lambda": 1e-11,
            "r0": 1e-10,
            "k_spring": 1000.0,
            "potential": "harmonic",
            "impact_duration": 1e-12
        }
        
        response = client.post("/simulate/impact", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "probability" in data
        assert "energy_levels" in data
        assert "metadata" in data
        assert "input_params" in data
    
    def test_heatmap_endpoint(self):
        """Test the heatmap generation endpoint"""
        payload = {
            "T_min": 100.0,
            "T_max": 1000.0,
            "lambda_min": 1e-12,
            "lambda_max": 1e-10,
            "r0": 1e-10,
            "k_spring": 1000.0,
            "potential": "harmonic",
            "resolution": 5  # Small grid for testing
        }
        
        response = client.post("/simulate/heatmap", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "grid_values" in data
        assert "x_values" in data
        assert "y_values" in data
        assert "metadata" in data
    
    def test_cluster_visualization_endpoint(self):
        """Test the cluster visualization endpoint"""
        payload = {
            "num_particles": 10,
            "charge": 1.0,
            "cluster_radius": 1e-9,
            "grid_resolution": 10  # Small grid for testing
        }
        
        response = client.post("/simulate/cluster", json=payload)
        # Accept either 200 (when PyVista is available) or 422 (when it's not)
        assert response.status_code in [200, 422]
        
        if response.status_code == 200:
            data = response.json()
            assert "vtk_file_url" in data
            assert "particle_positions" in data
            assert "potential_range" in data
            assert "metadata" in data

# ================ Integration Tests ================

class TestIntegration:
    """Integration tests across multiple components"""
    
    def test_end_to_end_simulation(self):
        """Test a complete simulation flow from physics to API"""
        # 1. Calculate energy levels directly
        params = PotentialParameters(
            model_type="harmonic",
            equilibrium_position=1e-10,
            spring_constant=1000.0
        )
        energy_levels = calculate_energy_levels(params)
        
        # 2. Calculate tunneling directly
        params.T = 300.0
        params.lambda_param = 1e-11
        tunneling_result = calculate_thermal_tunneling(params=params)
        
        # 3. Access the same data through API
        payload = {
            "T": 300.0,
            "lambda": 1e-11,
            "r0": 1e-10,
            "k_spring": 1000.0,
            "potential": "harmonic"
        }
        
        response = client.post("/simulate/thermal", json=payload)
        api_result = response.json()
        
        # Compare direct calculation with API result
        assert tunneling_result["probability"] == pytest.approx(api_result["probability"])
        assert len(tunneling_result["energy_levels"]) == len(api_result["energy_levels"])

# Run the tests when the file is executed directly
if __name__ == "__main__":
    pytest.main(["-xvs", __file__]) 