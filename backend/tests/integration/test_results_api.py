"""
Integration tests for the results API endpoints.

These tests verify that the results API endpoints correctly handle
simulation results, analysis, and exports.
"""

import pytest
import json
import time
from fastapi.testclient import TestClient
from typing import Dict, Any, List, Optional
from pathlib import Path

# Mark the entire module as integration tests
pytestmark = pytest.mark.integration


@pytest.fixture
def completed_simulation(client: TestClient) -> str:
    """Set up a completed simulation and return its ID for testing results API."""
    # Create a simple simulation for testing
    sim_request = {
        "domain_size": [0.005, 0.005, 0.005],
        "resolution": [5, 5, 5],
        "simulation_time": 0.001,
        "time_step": 1.0e-4,
        "reactions": ["d-d"],
        "mechanisms": ["electron_screening"],
        "initial_temperature": 300.0,
        "species_densities": {"d": 1.0e28},
        "thermal_conductivity": 10.0,
        "heat_capacity": 500.0,
        "material_density": 1000.0
    }
    
    response = client.post("/api/multi-physics/simulations", json=sim_request)
    assert response.status_code == 200
    
    simulation_id = response.json()["simulation_id"]
    
    # Wait for simulation to complete
    start_time = time.time()
    max_wait = 30  # seconds
    
    while time.time() - start_time < max_wait:
        status_response = client.get(f"/api/multi-physics/simulations/{simulation_id}/status")
        assert status_response.status_code == 200
        
        if status_response.json()["status"] in ["completed", "failed"]:
            break
            
        time.sleep(2)
    
    # Verify simulation completed successfully
    status_response = client.get(f"/api/multi-physics/simulations/{simulation_id}/status")
    assert status_response.status_code == 200
    assert status_response.json()["status"] == "completed"
    
    return simulation_id


@pytest.fixture
def saved_simulation(client: TestClient, completed_simulation: str) -> str:
    """Save a simulation result and return its ID."""
    # Save the simulation to disk
    save_response = client.post(f"/api/results/simulations/{completed_simulation}/save")
    assert save_response.status_code == 200
    return completed_simulation


@pytest.fixture
def analysis_config() -> Dict[str, Any]:
    """Return a valid analysis configuration for testing."""
    return {
        "method": "time_series_analysis",
        "parameters": {
            "data_field": "temperature",
            "position": [0.5, 0.5, 0.5],
            "time_range": [0, 0.001],
            "moving_average_window": 3
        }
    }


class TestResultsAPI:
    """Tests for the results API endpoints."""

    def test_list_simulations(self, client: TestClient, saved_simulation: str):
        """Test listing available simulations."""
        response = client.get("/api/results/simulations")
        assert response.status_code == 200
        
        simulations = response.json()
        assert isinstance(simulations, list)
        assert len(simulations) > 0
        
        # Check that our saved simulation is in the list
        simulation_ids = [sim["simulation_id"] for sim in simulations]
        assert saved_simulation in simulation_ids
        
        # Verify structure of simulation metadata
        for sim in simulations:
            assert "simulation_id" in sim
            assert "status" in sim
            assert "metadata" in sim
            assert isinstance(sim["metadata"], dict)

    def test_get_simulation_metadata(self, client: TestClient, saved_simulation: str):
        """Test retrieving metadata for a specific simulation."""
        response = client.get(f"/api/results/simulations/{saved_simulation}")
        assert response.status_code == 200
        
        metadata = response.json()
        assert "simulation_id" in metadata
        assert metadata["simulation_id"] == saved_simulation
        assert "metadata" in metadata
        assert "status" in metadata
        
        # Status should be either "cached" or "saved"
        assert metadata["status"] in ["cached", "saved"]
        
        # Verify available_analysis is a list
        assert "available_analysis" in metadata
        assert isinstance(metadata["available_analysis"], list)

    def test_get_simulation_results(self, client: TestClient, saved_simulation: str):
        """Test retrieving full results for a simulation."""
        response = client.get(f"/api/results/simulations/{saved_simulation}/results")
        assert response.status_code == 200
        
        results = response.json()
        assert isinstance(results, dict)
        assert "metadata" in results
        assert "time" in results
        assert isinstance(results["time"], list)
        assert len(results["time"]) > 0
        
        # Test with include_raw_data=True
        response = client.get(
            f"/api/results/simulations/{saved_simulation}/results",
            params={"include_raw_data": True}
        )
        assert response.status_code == 200
        
        # With raw data, we should have more fields
        detailed_results = response.json()
        assert len(detailed_results.keys()) >= len(results.keys())

    def test_get_simulation_results_with_time_filter(self, client: TestClient, saved_simulation: str):
        """Test retrieving results with time range filter."""
        # First get the full time range
        full_response = client.get(f"/api/results/simulations/{saved_simulation}/results")
        assert full_response.status_code == 200
        
        full_results = full_response.json()
        all_times = full_results.get("time", [])
        
        if len(all_times) >= 2:
            # Choose a subset of the time range
            min_time = all_times[0]
            max_time = all_times[-1]
            mid_time = (min_time + max_time) / 2
            
            # Test with time filter
            response = client.get(
                f"/api/results/simulations/{saved_simulation}/results",
                params={"time_range": f"{min_time},{mid_time}"}
            )
            assert response.status_code == 200
            
            filtered_results = response.json()
            filtered_times = filtered_results.get("time", [])
            
            # Verify filtered times are within the specified range
            assert all(min_time <= t <= mid_time for t in filtered_times)
            
            # Verify we have fewer time points than the full results
            assert len(filtered_times) < len(all_times)

    def test_analyze_simulation_results(self, client: TestClient, saved_simulation: str, analysis_config: Dict[str, Any]):
        """Test analyzing simulation results."""
        response = client.post(
            f"/api/results/simulations/{saved_simulation}/analyze",
            json=analysis_config
        )
        assert response.status_code == 200
        
        analysis_result = response.json()
        assert "analysis_id" in analysis_result
        assert "data" in analysis_result
        
        # Verify the analysis data structure
        data = analysis_result["data"]
        assert isinstance(data, dict)
        
        # Check if analysis was stored
        metadata_response = client.get(f"/api/results/simulations/{saved_simulation}")
        metadata = metadata_response.json()
        
        # The analysis should now be in the available_analysis list
        analysis_id = analysis_result["analysis_id"]
        assert analysis_id in metadata.get("available_analysis", [])

    def test_get_analysis_results(self, client: TestClient, saved_simulation: str, analysis_config: Dict[str, Any]):
        """Test retrieving previously computed analysis results."""
        # First run an analysis to get an analysis_id
        analysis_response = client.post(
            f"/api/results/simulations/{saved_simulation}/analyze",
            json=analysis_config
        )
        assert analysis_response.status_code == 200
        analysis_id = analysis_response.json()["analysis_id"]
        
        # Now retrieve the analysis results
        response = client.get(f"/api/results/simulations/{saved_simulation}/analysis/{analysis_id}")
        assert response.status_code == 200
        
        analysis_data = response.json()
        assert isinstance(analysis_data, dict)
        
        # The structure should match what was returned from the analyze endpoint
        assert analysis_data == analysis_response.json()["data"]

    def test_export_simulation_results(self, client: TestClient, saved_simulation: str):
        """Test exporting simulation results in different formats."""
        # Test JSON format
        response = client.get(
            f"/api/results/simulations/{saved_simulation}/export",
            params={"format": "json"}
        )
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/json"
        
        # Verify we can parse the JSON
        try:
            json_data = json.loads(response.content)
            assert isinstance(json_data, dict)
        except json.JSONDecodeError:
            pytest.fail("Response is not valid JSON")
        
        # Test CSV format
        response = client.get(
            f"/api/results/simulations/{saved_simulation}/export",
            params={"format": "csv"}
        )
        # Accept either success or not implemented
        assert response.status_code in [200, 501]
        
        if response.status_code == 200:
            assert response.headers["content-type"] == "text/csv"
            content = response.content.decode("utf-8")
            assert "," in content
            assert "\n" in content

    def test_delete_simulation_results(self, client: TestClient, saved_simulation: str):
        """Test deleting simulation results."""
        # First verify the simulation exists
        response = client.get(f"/api/results/simulations/{saved_simulation}")
        assert response.status_code == 200
        
        # Now delete it
        delete_response = client.delete(f"/api/results/simulations/{saved_simulation}")
        assert delete_response.status_code == 200
        
        # Verify it's deleted
        response = client.get(f"/api/results/simulations/{saved_simulation}")
        assert response.status_code == 404

    def test_register_simulation_result(self, client: TestClient):
        """Test registering a new simulation result."""
        # Create a minimal simulation result
        result_data = {
            "metadata": {
                "simulation_id": f"test_sim_{int(time.time())}",
                "timestamp": time.time(),
                "parameters": {
                    "domain_size": [0.01, 0.01, 0.01],
                    "resolution": [10, 10, 10]
                }
            },
            "time": [0.0, 0.001, 0.002],
            "temperature": [300.0, 301.0, 302.0]
        }
        
        response = client.post("/api/results/register-result", json=result_data)
        assert response.status_code == 200
        
        result = response.json()
        assert "simulation_id" in result
        simulation_id = result["simulation_id"]
        
        # Verify the result was registered
        list_response = client.get("/api/results/simulations")
        assert list_response.status_code == 200
        
        simulations = list_response.json()
        simulation_ids = [sim["simulation_id"] for sim in simulations]
        assert simulation_id in simulation_ids

    def test_nonexistent_simulation(self, client: TestClient):
        """Test behavior with nonexistent simulation IDs."""
        fake_id = "nonexistent_simulation_id"
        
        # Test various endpoints with a nonexistent ID
        endpoints = [
            f"/api/results/simulations/{fake_id}",
            f"/api/results/simulations/{fake_id}/results",
            f"/api/results/simulations/{fake_id}/export"
        ]
        
        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 404, f"Expected 404 for {endpoint}"
            
        # Test POST endpoints
        post_endpoints = [
            (f"/api/results/simulations/{fake_id}/analyze", {"method": "basic_stats"}),
            (f"/api/results/simulations/{fake_id}/save", {})
        ]
        
        for endpoint, payload in post_endpoints:
            response = client.post(endpoint, json=payload)
            assert response.status_code == 404, f"Expected 404 for {endpoint}"

    def test_invalid_analysis_config(self, client: TestClient, saved_simulation: str):
        """Test behavior with invalid analysis configuration."""
        invalid_configs = [
            # Missing method
            {"parameters": {"data_field": "temperature"}},
            # Invalid method
            {"method": "invalid_method", "parameters": {}},
            # Missing required parameters
            {"method": "time_series_analysis", "parameters": {}}
        ]
        
        for config in invalid_configs:
            response = client.post(
                f"/api/results/simulations/{saved_simulation}/analyze",
                json=config
            )
            assert response.status_code in [400, 422], f"Expected error for {config}" 