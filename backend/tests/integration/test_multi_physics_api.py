"""
Integration tests for multi-physics simulation API endpoints.

These tests verify the entire simulation workflow from creating a simulation,
checking its status, and retrieving results.
"""

import os
import pytest
import time
from fastapi.testclient import TestClient
from typing import Dict, Any

# Mark the entire module as integration tests
pytestmark = pytest.mark.integration


@pytest.fixture
def simulation_request_data() -> Dict[str, Any]:
    """Return data for a simulation request with short runtime for testing."""
    return {
        "domain_size": [0.005, 0.005, 0.005],  # Small domain for faster tests
        "resolution": [5, 5, 5],  # Low resolution for faster tests
        "simulation_time": 0.001,  # Short simulation time for faster tests
        "time_step": 1.0e-4,  # Larger time step for faster tests
        "reactions": ["d-d"],
        "mechanisms": ["electron_screening"],
        "initial_temperature": 300.0,
        "species_densities": {"d": 1.0e28},
        "thermal_conductivity": 10.0,
        "heat_capacity": 500.0,
        "material_density": 1000.0
    }


class TestMultiPhysicsSimulation:
    """Tests for the multi-physics simulation API endpoints."""

    def test_simulation_workflow(self, client: TestClient, simulation_request_data: Dict[str, Any]):
        """Test the complete simulation workflow from start to results retrieval."""
        # Step 1: Start a new simulation
        response = client.post("/api/multi-physics/simulations", json=simulation_request_data)
        assert response.status_code == 200, f"Failed to start simulation: {response.text}"
        
        data = response.json()
        assert "simulation_id" in data, "Response missing simulation ID"
        simulation_id = data["simulation_id"]
        
        # Step 2: Check simulation status until completion or timeout
        start_time = time.time()
        max_wait_time = 30  # Maximum time to wait for simulation in seconds
        completed = False
        
        # We'll check every 2 seconds
        while time.time() - start_time < max_wait_time:
            response = client.get(f"/api/multi-physics/simulations/{simulation_id}/status")
            assert response.status_code == 200, f"Failed to check simulation status: {response.text}"
            
            status_data = response.json()
            assert status_data["simulation_id"] == simulation_id
            
            # If simulation completed or failed, break the loop
            if status_data["status"] in ["completed", "failed"]:
                completed = status_data["status"] == "completed"
                break
                
            # Wait before checking again
            time.sleep(2)
        
        # Check if simulation completed successfully
        assert completed, f"Simulation did not complete in {max_wait_time} seconds"
        
        # Step 3: Retrieve simulation results
        response = client.get(f"/api/multi-physics/simulations/{simulation_id}/results")
        assert response.status_code == 200, f"Failed to retrieve simulation results: {response.text}"
        
        results = response.json()
        assert results["simulation_id"] == simulation_id
        assert results["status"] == "completed"
        
        # Validate result structure
        assert "times" in results
        assert "max_temperatures" in results
        assert "mean_reaction_rates" in results
        assert "final_max_temperature" in results
        assert "elapsed_time" in results
        assert "step_count" in results
        
        # Basic validation of result contents
        assert len(results["times"]) > 0
        assert len(results["max_temperatures"]) == len(results["times"])
        assert len(results["mean_reaction_rates"]) == len(results["times"])
        assert results["final_max_temperature"] >= simulation_request_data["initial_temperature"]
        assert results["elapsed_time"] > 0
        assert results["step_count"] > 0

    def test_list_simulations(self, client: TestClient, simulation_request_data: Dict[str, Any]):
        """Test listing all simulations."""
        # Start a simulation first
        response = client.post("/api/multi-physics/simulations", json=simulation_request_data)
        assert response.status_code == 200
        simulation_id = response.json()["simulation_id"]
        
        # List all simulations
        response = client.get("/api/multi-physics/simulations")
        assert response.status_code == 200
        
        simulations = response.json()
        assert isinstance(simulations, list)
        
        # Check if our simulation is in the list
        found = False
        for sim in simulations:
            if sim["simulation_id"] == simulation_id:
                found = True
                break
                
        assert found, f"Simulation {simulation_id} not found in the simulations list"

    def test_invalid_simulation_parameters(self, client: TestClient):
        """Test handling of invalid simulation parameters."""
        # Invalid simulation parameters (missing required fields)
        invalid_data = {
            "domain_size": [0.01, 0.01, 0.01],
            # Missing other required fields
        }
        
        response = client.post("/api/multi-physics/simulations", json=invalid_data)
        assert response.status_code in [400, 422], "Server should reject invalid parameters"

    def test_nonexistent_simulation(self, client: TestClient):
        """Test requesting a non-existent simulation."""
        fake_id = "12345678-1234-5678-1234-567812345678"
        
        # Try to get status of non-existent simulation
        response = client.get(f"/api/multi-physics/simulations/{fake_id}/status")
        assert response.status_code == 404
        
        # Try to get results of non-existent simulation
        response = client.get(f"/api/multi-physics/simulations/{fake_id}/results")
        assert response.status_code == 404

    def test_delete_simulation(self, client: TestClient, simulation_request_data: Dict[str, Any]):
        """Test deleting a simulation."""
        # Start a simulation
        response = client.post("/api/multi-physics/simulations", json=simulation_request_data)
        assert response.status_code == 200
        simulation_id = response.json()["simulation_id"]
        
        # Delete the simulation
        response = client.delete(f"/api/multi-physics/simulations/{simulation_id}")
        assert response.status_code == 200
        
        # Verify it's deleted by trying to get its status
        response = client.get(f"/api/multi-physics/simulations/{simulation_id}/status")
        assert response.status_code == 404 