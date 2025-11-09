"""
Integration tests for result visualization API endpoints.

These tests verify that the result visualization API endpoints correctly process
and return data visualizations of simulation results.
"""

import pytest
import json
from fastapi.testclient import TestClient
from typing import Dict, Any, List, Tuple

# Mark the entire module as integration tests
pytestmark = pytest.mark.integration


@pytest.fixture
def completed_simulation(client: TestClient) -> str:
    """Set up a completed simulation and return its ID for testing result visualization."""
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
    import time
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
def plot_request() -> Dict[str, Any]:
    """Return a valid plot request for testing."""
    return {
        "plot_type": "time_series",
        "data_field": "temperature",
        "position": [0.5, 0.5, 0.5],
        "time_range": [0, 0.001],
        "plot_style": {
            "line_color": "blue",
            "line_style": "solid",
            "marker": "circle",
            "title": "Temperature vs Time"
        }
    }


class TestResultVisualizationAPI:
    """Tests for the result visualization API endpoints."""

    def test_available_plot_types(self, client: TestClient):
        """Test retrieving available plot types."""
        response = client.get("/api/result-visualization/plot-types")
        assert response.status_code == 200
        
        plot_types = response.json()
        assert isinstance(plot_types, list)
        assert len(plot_types) > 0
        
        # Check common plot types
        expected_types = ["time_series", "spatial_distribution", "contour"]
        for plot_type in expected_types:
            assert plot_type in plot_types, f"{plot_type} should be an available plot type"

    def test_available_data_fields(self, client: TestClient, completed_simulation: str):
        """Test retrieving available data fields for a simulation."""
        response = client.get(f"/api/result-visualization/data-fields/{completed_simulation}")
        assert response.status_code == 200
        
        data_fields = response.json()
        assert isinstance(data_fields, list)
        assert len(data_fields) > 0
        
        # Check for common field types
        expected_fields = ["temperature", "reaction_rate"]
        for field in expected_fields:
            assert field in data_fields, f"{field} should be an available data field"

    def test_generate_plot(self, client: TestClient, completed_simulation: str, plot_request: Dict[str, Any]):
        """Test generating a plot from simulation results."""
        # Add simulation ID to request
        request = {**plot_request, "simulation_id": completed_simulation}
        
        response = client.post("/api/result-visualization/plot", json=request)
        assert response.status_code == 200
        
        result = response.json()
        assert "plot_id" in result
        assert "image_url" in result
        
        # Validate image URL
        assert result["image_url"].startswith("/static/")
        
        # Check that the image is accessible
        image_response = client.get(result["image_url"])
        assert image_response.status_code == 200
        assert image_response.headers["content-type"].startswith("image/")

    def test_plot_data_extraction(self, client: TestClient, completed_simulation: str):
        """Test extracting raw data for plotting."""
        request = {
            "simulation_id": completed_simulation,
            "data_field": "temperature",
            "position": [0.5, 0.5, 0.5],
            "time_range": [0, 0.001]
        }
        
        response = client.post("/api/result-visualization/data", json=request)
        assert response.status_code == 200
        
        data = response.json()
        assert "times" in data
        assert "values" in data
        
        # Check data validity
        assert len(data["times"]) > 0
        assert len(data["values"]) > 0
        assert len(data["times"]) == len(data["values"])

    def test_comparison_plot(self, client: TestClient, completed_simulation: str):
        """Test generating a comparison plot from multiple simulations."""
        # For a proper test, we would need multiple simulations
        # But we can still test the API behavior with a single simulation
        
        request = {
            "simulation_ids": [completed_simulation],
            "plot_type": "time_series",
            "data_field": "temperature",
            "position": [0.5, 0.5, 0.5],
            "labels": ["Simulation 1"]
        }
        
        response = client.post("/api/result-visualization/compare", json=request)
        assert response.status_code == 200
        
        result = response.json()
        assert "plot_id" in result
        assert "image_url" in result

    def test_plot_customization(self, client: TestClient, completed_simulation: str):
        """Test customization options for plots."""
        request = {
            "simulation_id": completed_simulation,
            "plot_type": "time_series",
            "data_field": "temperature",
            "position": [0.5, 0.5, 0.5],
            "plot_style": {
                "line_color": "red",
                "line_style": "dashed",
                "marker": "square",
                "grid": True,
                "title": "Custom Plot",
                "x_label": "Time (s)",
                "y_label": "Temperature (K)"
            }
        }
        
        response = client.post("/api/result-visualization/plot", json=request)
        assert response.status_code == 200
        
        # We can't easily verify the plot style in an automated test,
        # but we can check that the request was accepted

    def test_export_plot_data(self, client: TestClient, completed_simulation: str):
        """Test exporting plot data to different formats."""
        # First generate a plot
        plot_request = {
            "simulation_id": completed_simulation,
            "plot_type": "time_series",
            "data_field": "temperature",
            "position": [0.5, 0.5, 0.5]
        }
        
        plot_response = client.post("/api/result-visualization/plot", json=plot_request)
        assert plot_response.status_code == 200
        
        plot_id = plot_response.json()["plot_id"]
        
        # Test exporting in different formats
        formats = ["csv", "json", "excel"]
        
        for format_type in formats:
            response = client.get(
                f"/api/result-visualization/export/{plot_id}",
                params={"format": format_type}
            )
            
            # Some formats might not be implemented, so accept 200 or 501
            assert response.status_code in [200, 501]
            
            if response.status_code == 200:
                if format_type == "json":
                    assert response.headers["content-type"] == "application/json"
                    try:
                        data = response.json()
                        assert isinstance(data, dict)
                    except json.JSONDecodeError:
                        pytest.fail("Response is not valid JSON")
                
                elif format_type == "csv":
                    assert response.headers["content-type"] == "text/csv"
                    content = response.content.decode("utf-8")
                    assert "," in content
                    assert "\n" in content

    def test_spatial_plot(self, client: TestClient, completed_simulation: str):
        """Test generating spatial distribution plots."""
        request = {
            "simulation_id": completed_simulation,
            "plot_type": "spatial_distribution",
            "data_field": "temperature",
            "time_point": 0.001,  # final time
            "slice_axis": "z",
            "slice_position": 0.5
        }
        
        response = client.post("/api/result-visualization/plot", json=request)
        assert response.status_code == 200
        
        result = response.json()
        assert "plot_id" in result
        assert "image_url" in result

    def test_invalid_simulation_id(self, client: TestClient, plot_request: Dict[str, Any]):
        """Test behavior with invalid simulation ID."""
        # Use a non-existent simulation ID
        fake_id = "12345678-1234-5678-1234-567812345678"
        request = {**plot_request, "simulation_id": fake_id}
        
        response = client.post("/api/result-visualization/plot", json=request)
        assert response.status_code == 404

    def test_invalid_data_field(self, client: TestClient, completed_simulation: str):
        """Test behavior with invalid data field."""
        request = {
            "simulation_id": completed_simulation,
            "plot_type": "time_series",
            "data_field": "nonexistent_field",
            "position": [0.5, 0.5, 0.5]
        }
        
        response = client.post("/api/result-visualization/plot", json=request)
        assert response.status_code in [400, 422], "Should reject invalid data field" 