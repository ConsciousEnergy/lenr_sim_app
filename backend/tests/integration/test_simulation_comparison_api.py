"""
Integration tests for simulation comparison API endpoints.

These tests verify that the simulation comparison API endpoints correctly
allow users to compare the results of multiple simulations, generate
comparison visualizations, and extract insights from differences between simulations.
"""

import pytest
import json
import time
import uuid
from fastapi.testclient import TestClient
from typing import Dict, Any, List, Tuple

# Mark the entire module as integration tests
pytestmark = pytest.mark.integration


@pytest.fixture
def completed_simulations(client: TestClient) -> List[str]:
    """Set up multiple completed simulations and return their IDs for comparison testing."""
    simulation_ids = []
    
    # Create two simulations with slightly different parameters
    base_request = {
        "domain_size": [0.005, 0.005, 0.005],
        "resolution": [5, 5, 5],
        "simulation_time": 0.001,
        "time_step": 1.0e-4,
        "reactions": ["d-d"],
        "mechanisms": ["electron_screening"],
        "material_density": 1000.0,
        "heat_capacity": 500.0
    }
    
    # First simulation with standard parameters
    sim1_request = {
        **base_request,
        "initial_temperature": 300.0,
        "species_densities": {"d": 1.0e28},
        "thermal_conductivity": 10.0,
    }
    
    # Second simulation with higher temperature
    sim2_request = {
        **base_request,
        "initial_temperature": 350.0,
        "species_densities": {"d": 1.0e28},
        "thermal_conductivity": 10.0,
    }
    
    # Create the simulations
    responses = []
    for sim_request in [sim1_request, sim2_request]:
        response = client.post("/api/multi-physics/simulations", json=sim_request)
        assert response.status_code == 200
        simulation_id = response.json()["simulation_id"]
        simulation_ids.append(simulation_id)
        responses.append(response)
    
    # Wait for simulations to complete
    start_time = time.time()
    max_wait = 60  # seconds
    
    while time.time() - start_time < max_wait:
        all_completed = True
        
        for sim_id in simulation_ids:
            status_response = client.get(f"/api/multi-physics/simulations/{sim_id}/status")
            assert status_response.status_code == 200
            
            if status_response.json()["status"] not in ["completed", "failed"]:
                all_completed = False
                break
        
        if all_completed:
            break
            
        time.sleep(2)
    
    # Verify all simulations completed successfully
    for sim_id in simulation_ids:
        status_response = client.get(f"/api/multi-physics/simulations/{sim_id}/status")
        assert status_response.status_code == 200
        assert status_response.json()["status"] == "completed"
    
    return simulation_ids


@pytest.fixture
def comparison_request(completed_simulations: List[str]) -> Dict[str, Any]:
    """Return a valid comparison request for testing."""
    return {
        "simulation_ids": completed_simulations,
        "name": "Test Comparison",
        "description": "Comparing simulations with different initial temperatures",
        "data_fields": ["temperature", "reaction_rate"],
        "time_points": [0.0, 0.0005, 0.001]  # Start, middle, end
    }


class TestSimulationComparisonAPI:
    """Tests for the simulation comparison API endpoints."""
    
    def test_create_comparison(self, client: TestClient, comparison_request: Dict[str, Any]):
        """Test creating a comparison between simulations."""
        response = client.post("/api/comparison/create", json=comparison_request)
        assert response.status_code == 202  # Accepted, processing asynchronously
        
        result = response.json()
        assert "comparison_id" in result
        assert "status" in result
        
        comparison_id = result["comparison_id"]
        
        # Poll for comparison completion
        start_time = time.time()
        max_wait = 30  # seconds
        
        while time.time() - start_time < max_wait:
            status_response = client.get(f"/api/comparison/status/{comparison_id}")
            assert status_response.status_code == 200
            
            status = status_response.json()["status"]
            if status in ["completed", "failed"]:
                break
                
            time.sleep(2)
        
        # Verify completion
        status_response = client.get(f"/api/comparison/status/{comparison_id}")
        assert status_response.status_code == 200
        assert status_response.json()["status"] == "completed"
    
    def test_list_comparisons(self, client: TestClient, comparison_request: Dict[str, Any]):
        """Test listing all comparisons for a user."""
        # Create a comparison first
        create_response = client.post("/api/comparison/create", json=comparison_request)
        assert create_response.status_code == 202
        
        # Get list of comparisons
        response = client.get("/api/comparison/list")
        assert response.status_code == 200
        
        comparisons = response.json()
        assert isinstance(comparisons, list)
        
        # The newly created comparison should be in the list
        comparison_id = create_response.json()["comparison_id"]
        comparison_ids = [c["comparison_id"] for c in comparisons]
        assert comparison_id in comparison_ids
    
    def test_get_comparison_details(self, client: TestClient, comparison_request: Dict[str, Any]):
        """Test retrieving details of a comparison."""
        # Create a comparison first
        create_response = client.post("/api/comparison/create", json=comparison_request)
        assert create_response.status_code == 202
        
        comparison_id = create_response.json()["comparison_id"]
        
        # Wait for comparison to complete
        start_time = time.time()
        max_wait = 30  # seconds
        
        while time.time() - start_time < max_wait:
            status_response = client.get(f"/api/comparison/status/{comparison_id}")
            assert status_response.status_code == 200
            
            status = status_response.json()["status"]
            if status in ["completed", "failed"]:
                break
                
            time.sleep(2)
        
        # Get comparison details
        response = client.get(f"/api/comparison/{comparison_id}")
        assert response.status_code == 200
        
        comparison = response.json()
        assert comparison["comparison_id"] == comparison_id
        assert comparison["name"] == comparison_request["name"]
        assert comparison["description"] == comparison_request["description"]
        assert set(comparison["simulation_ids"]) == set(comparison_request["simulation_ids"])
        assert "results" in comparison
    
    def test_get_comparison_visualizations(self, client: TestClient, comparison_request: Dict[str, Any]):
        """Test getting visualizations from a comparison."""
        # Create a comparison first
        create_response = client.post("/api/comparison/create", json=comparison_request)
        assert create_response.status_code == 202
        
        comparison_id = create_response.json()["comparison_id"]
        
        # Wait for comparison to complete
        start_time = time.time()
        max_wait = 30  # seconds
        
        while time.time() - start_time < max_wait:
            status_response = client.get(f"/api/comparison/status/{comparison_id}")
            assert status_response.status_code == 200
            
            status = status_response.json()["status"]
            if status in ["completed", "failed"]:
                break
                
            time.sleep(2)
        
        # Get comparison visualizations
        response = client.get(f"/api/comparison/{comparison_id}/visualizations")
        assert response.status_code == 200
        
        visualizations = response.json()
        assert isinstance(visualizations, list)
        assert len(visualizations) > 0
        
        # Check that visualization items have required fields
        for vis in visualizations:
            assert "visualization_id" in vis
            assert "data_field" in vis
            assert "time_point" in vis
            assert "type" in vis
    
    def test_view_comparison_visualization(self, client: TestClient, comparison_request: Dict[str, Any]):
        """Test viewing a specific visualization from a comparison."""
        # Create a comparison first
        create_response = client.post("/api/comparison/create", json=comparison_request)
        assert create_response.status_code == 202
        
        comparison_id = create_response.json()["comparison_id"]
        
        # Wait for comparison to complete
        start_time = time.time()
        max_wait = 30  # seconds
        
        while time.time() - start_time < max_wait:
            status_response = client.get(f"/api/comparison/status/{comparison_id}")
            assert status_response.status_code == 200
            
            status = status_response.json()["status"]
            if status in ["completed", "failed"]:
                break
                
            time.sleep(2)
        
        # Get list of visualizations
        vis_response = client.get(f"/api/comparison/{comparison_id}/visualizations")
        assert vis_response.status_code == 200
        
        visualizations = vis_response.json()
        assert len(visualizations) > 0
        
        # View the first visualization
        vis_id = visualizations[0]["visualization_id"]
        response = client.get(f"/api/comparison/visualization/{vis_id}")
        assert response.status_code == 200
        
        # Response should be HTML or image
        assert "text/html" in response.headers["content-type"].lower() or \
               "image/" in response.headers["content-type"].lower() or \
               "application/json" in response.headers["content-type"].lower()
    
    def test_get_statistical_analysis(self, client: TestClient, comparison_request: Dict[str, Any]):
        """Test getting statistical analysis of simulation differences."""
        # Create a comparison first
        create_response = client.post("/api/comparison/create", json=comparison_request)
        assert create_response.status_code == 202
        
        comparison_id = create_response.json()["comparison_id"]
        
        # Wait for comparison to complete
        start_time = time.time()
        max_wait = 30  # seconds
        
        while time.time() - start_time < max_wait:
            status_response = client.get(f"/api/comparison/status/{comparison_id}")
            assert status_response.status_code == 200
            
            status = status_response.json()["status"]
            if status in ["completed", "failed"]:
                break
                
            time.sleep(2)
        
        # Get statistical analysis
        response = client.get(f"/api/comparison/{comparison_id}/statistics")
        assert response.status_code in [200, 501]  # 501 if not implemented
        
        if response.status_code == 200:
            stats = response.json()
            assert "data_fields" in stats
            assert isinstance(stats["data_fields"], list)
            assert len(stats["data_fields"]) > 0
            
            # Check for temperature analysis (since we know temperatures differ)
            temp_stats = next((s for s in stats["data_fields"] if s["field"] == "temperature"), None)
            assert temp_stats is not None
            assert "difference" in temp_stats
            assert temp_stats["difference"]["mean"] > 0  # Should be positive since second sim has higher temp
    
    def test_delete_comparison(self, client: TestClient, comparison_request: Dict[str, Any]):
        """Test deleting a comparison."""
        # Create a comparison first
        create_response = client.post("/api/comparison/create", json=comparison_request)
        assert create_response.status_code == 202
        
        comparison_id = create_response.json()["comparison_id"]
        
        # Wait a bit for processing
        time.sleep(5)
        
        # Delete the comparison
        delete_response = client.delete(f"/api/comparison/{comparison_id}")
        assert delete_response.status_code in [200, 204]
        
        # Verify it's gone
        get_response = client.get(f"/api/comparison/{comparison_id}")
        assert get_response.status_code == 404
    
    def test_get_comparison_summary(self, client: TestClient, comparison_request: Dict[str, Any]):
        """Test getting a summary of differences between simulations."""
        # Create a comparison first
        create_response = client.post("/api/comparison/create", json=comparison_request)
        assert create_response.status_code == 202
        
        comparison_id = create_response.json()["comparison_id"]
        
        # Wait for comparison to complete
        start_time = time.time()
        max_wait = 30  # seconds
        
        while time.time() - start_time < max_wait:
            status_response = client.get(f"/api/comparison/status/{comparison_id}")
            assert status_response.status_code == 200
            
            status = status_response.json()["status"]
            if status in ["completed", "failed"]:
                break
                
            time.sleep(2)
        
        # Get summary
        response = client.get(f"/api/comparison/{comparison_id}/summary")
        assert response.status_code in [200, 501]  # 501 if not implemented
        
        if response.status_code == 200:
            summary = response.json()
            assert "comparison_id" in summary
            assert "key_differences" in summary
            assert isinstance(summary["key_differences"], list)
            
            # Should mention temperature difference since that's what we changed
            temp_diff = any("temperature" in str(diff).lower() for diff in summary["key_differences"])
            assert temp_diff, "Summary should mention temperature differences"
    
    def test_export_comparison(self, client: TestClient, comparison_request: Dict[str, Any]):
        """Test exporting comparison data to different formats."""
        # Create a comparison first
        create_response = client.post("/api/comparison/create", json=comparison_request)
        assert create_response.status_code == 202
        
        comparison_id = create_response.json()["comparison_id"]
        
        # Wait for comparison to complete
        start_time = time.time()
        max_wait = 30  # seconds
        
        while time.time() - start_time < max_wait:
            status_response = client.get(f"/api/comparison/status/{comparison_id}")
            assert status_response.status_code == 200
            
            status = status_response.json()["status"]
            if status in ["completed", "failed"]:
                break
                
            time.sleep(2)
        
        # Export in different formats
        formats = ["json", "csv", "excel"]
        
        for format_type in formats:
            export_response = client.get(
                f"/api/comparison/{comparison_id}/export", 
                params={"format": format_type}
            )
            assert export_response.status_code in [200, 501]  # 501 if not implemented
            
            if export_response.status_code == 200:
                if format_type == "json":
                    assert "application/json" in export_response.headers["content-type"].lower()
                    data = export_response.json()
                    assert isinstance(data, dict)
                elif format_type == "csv":
                    assert "text/csv" in export_response.headers["content-type"].lower()
                    content = export_response.content.decode("utf-8")
                    assert "," in content
                    assert "\n" in content
                elif format_type == "excel":
                    assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in export_response.headers["content-type"].lower()
                    assert len(export_response.content) > 0
    
    def test_parameter_difference_report(self, client: TestClient, comparison_request: Dict[str, Any]):
        """Test getting a report of parameter differences between simulations."""
        # Create a comparison first
        create_response = client.post("/api/comparison/create", json=comparison_request)
        assert create_response.status_code == 202
        
        comparison_id = create_response.json()["comparison_id"]
        
        # Wait for comparison to complete
        start_time = time.time()
        max_wait = 30  # seconds
        
        while time.time() - start_time < max_wait:
            status_response = client.get(f"/api/comparison/status/{comparison_id}")
            assert status_response.status_code == 200
            
            status = status_response.json()["status"]
            if status in ["completed", "failed"]:
                break
                
            time.sleep(2)
        
        # Get parameter differences
        response = client.get(f"/api/comparison/{comparison_id}/parameters")
        assert response.status_code in [200, 501]  # 501 if not implemented
        
        if response.status_code == 200:
            params = response.json()
            assert "differences" in params
            
            # Check that initial_temperature is identified as different
            temp_diff = False
            for diff in params["differences"]:
                if diff["parameter"] == "initial_temperature":
                    temp_diff = True
                    assert diff["values"][0] == 300.0
                    assert diff["values"][1] == 350.0
            
            assert temp_diff, "Temperature difference should be identified"
    
    def test_create_comparison_with_invalid_simulation(self, client: TestClient, completed_simulations: List[str]):
        """Test creating a comparison with an invalid simulation ID."""
        # Use one valid simulation and one non-existent simulation
        fake_id = str(uuid.uuid4())
        request = {
            "simulation_ids": [completed_simulations[0], fake_id],
            "name": "Invalid Comparison",
            "description": "This should fail",
            "data_fields": ["temperature"],
            "time_points": [0.0, 0.001]
        }
        
        response = client.post("/api/comparison/create", json=request)
        assert response.status_code == 404
    
    def test_create_comparison_with_invalid_data_field(self, client: TestClient, completed_simulations: List[str]):
        """Test creating a comparison with an invalid data field."""
        request = {
            "simulation_ids": completed_simulations,
            "name": "Invalid Field Comparison",
            "description": "This should fail",
            "data_fields": ["nonexistent_field"],
            "time_points": [0.0, 0.001]
        }
        
        response = client.post("/api/comparison/create", json=request)
        assert response.status_code in [400, 422]
    
    def test_create_comparison_with_same_simulation(self, client: TestClient, completed_simulations: List[str]):
        """Test creating a comparison with the same simulation used twice."""
        # Use the same simulation ID twice
        request = {
            "simulation_ids": [completed_simulations[0], completed_simulations[0]],
            "name": "Self Comparison",
            "description": "Comparing a simulation with itself",
            "data_fields": ["temperature"],
            "time_points": [0.0, 0.001]
        }
        
        response = client.post("/api/comparison/create", json=request)
        assert response.status_code in [202, 400, 422]
        
        # If the API accepts this and creates a comparison (202),
        # the comparison should show no differences
        if response.status_code == 202:
            comparison_id = response.json()["comparison_id"]
            
            # Wait for comparison to complete
            start_time = time.time()
            max_wait = 30  # seconds
            
            while time.time() - start_time < max_wait:
                status_response = client.get(f"/api/comparison/status/{comparison_id}")
                assert status_response.status_code == 200
                
                status = status_response.json()["status"]
                if status in ["completed", "failed"]:
                    break
                    
                time.sleep(2)
            
            # Get statistical analysis
            stats_response = client.get(f"/api/comparison/{comparison_id}/statistics")
            if stats_response.status_code == 200:
                stats = stats_response.json()
                
                # Check for zero differences (or very small differences due to floating point)
                for field_stat in stats["data_fields"]:
                    if "difference" in field_stat and "mean" in field_stat["difference"]:
                        assert abs(field_stat["difference"]["mean"]) < 1e-6
    
    def test_time_series_comparison(self, client: TestClient, completed_simulations: List[str]):
        """Test comparing time series data from different simulations."""
        request = {
            "simulation_ids": completed_simulations,
            "name": "Time Series Comparison",
            "description": "Comparing time evolution of temperature",
            "data_fields": ["temperature"],
            "comparison_type": "time_series",
            "point": [0.0025, 0.0025, 0.0025]  # Center of domain
        }
        
        response = client.post("/api/comparison/create", json=request)
        assert response.status_code in [202, 501]  # 501 if not implemented
        
        if response.status_code == 202:
            comparison_id = response.json()["comparison_id"]
            
            # Wait for comparison to complete
            start_time = time.time()
            max_wait = 30  # seconds
            
            while time.time() - start_time < max_wait:
                status_response = client.get(f"/api/comparison/status/{comparison_id}")
                assert status_response.status_code == 200
                
                status = status_response.json()["status"]
                if status in ["completed", "failed"]:
                    break
                    
                time.sleep(2)
            
            # Get the time series visualization
            response = client.get(f"/api/comparison/{comparison_id}/time-series")
            assert response.status_code == 200
            
            data = response.json()
            assert "time_points" in data
            assert "values" in data
            assert len(data["time_points"]) > 0
            assert len(data["values"]) == len(completed_simulations)
            
            # Each simulation should have a series of values
            for sim_values in data["values"]:
                assert len(sim_values) == len(data["time_points"])
    
    def test_update_comparison_metadata(self, client: TestClient, comparison_request: Dict[str, Any]):
        """Test updating comparison metadata (name and description)."""
        # Create a comparison first
        create_response = client.post("/api/comparison/create", json=comparison_request)
        assert create_response.status_code == 202
        
        comparison_id = create_response.json()["comparison_id"]
        
        # Wait a bit for processing
        time.sleep(5)
        
        # Update the metadata
        update_request = {
            "name": "Updated Comparison Name",
            "description": "This description has been updated"
        }
        
        update_response = client.put(f"/api/comparison/{comparison_id}", json=update_request)
        assert update_response.status_code in [200, 501]  # 501 if not implemented
        
        if update_response.status_code == 200:
            # Verify the update
            get_response = client.get(f"/api/comparison/{comparison_id}")
            assert get_response.status_code == 200
            
            updated_comparison = get_response.json()
            assert updated_comparison["name"] == update_request["name"]
            assert updated_comparison["description"] == update_request["description"] 