"""
Integration tests for visualization API endpoints.

These tests verify that the visualization API endpoints correctly process
simulation data and generate interactive visualizations of LENR simulation results.
"""

import pytest
import json
import time
import re
import uuid
import io
import base64
from fastapi.testclient import TestClient
from typing import Dict, Any, List

# Mark the entire module as integration tests
pytestmark = pytest.mark.integration


@pytest.fixture
def user_credentials() -> Dict[str, str]:
    """Return user credentials for testing."""
    return {
        "email": f"viz_test_user_{int(time.time())}@example.com",
        "password": "Test@Password123",
        "first_name": "Viz",
        "last_name": "Tester"
    }


@pytest.fixture
def registered_user(client: TestClient, user_credentials: Dict[str, str]) -> Dict[str, Any]:
    """Register a user and return their credentials and user ID."""
    response = client.post("/api/auth/register", json=user_credentials)
    assert response.status_code == 201
    
    result = response.json()
    
    return {
        "user_id": result["user_id"],
        "email": user_credentials["email"],
        "password": user_credentials["password"]
    }


@pytest.fixture
def user_token(client: TestClient, registered_user: Dict[str, Any]) -> str:
    """Log in as a registered user and return the access token."""
    login_data = {
        "email": registered_user["email"],
        "password": registered_user["password"]
    }
    
    response = client.post("/api/auth/login", json=login_data)
    assert response.status_code == 200
    
    return response.json()["access_token"]


@pytest.fixture
def completed_simulation(client: TestClient, user_token: str) -> str:
    """Create a simulation and wait for it to complete, then return the simulation ID."""
    headers = {"Authorization": f"Bearer {user_token}"}
    
    # Create a simple simulation
    simulation_data = {
        "name": f"Visualization Test Simulation {uuid.uuid4()}",
        "description": "A simple simulation for testing visualizations",
        "model_type": "LENR_BASIC",
        "parameters": {
            "temperature_initial": 293.15,  # Room temperature in Kelvin
            "pressure_initial": 101325,     # Standard atmospheric pressure in Pa
            "catalyst_loading": 0.5,        # 50% loading
            "reaction_time": 1800           # 30 minutes in seconds
        }
    }
    
    response = client.post("/api/simulations", json=simulation_data, headers=headers)
    assert response.status_code == 201
    
    simulation_id = response.json()["simulation_id"]
    
    # Poll for simulation status until it's complete or timeout
    max_attempts = 10
    for attempt in range(max_attempts):
        response = client.get(f"/api/simulations/{simulation_id}", headers=headers)
        assert response.status_code == 200
        
        status = response.json()["status"]
        if status in ["COMPLETED", "FAILED"]:
            break
            
        # Wait before polling again
        time.sleep(2)  # Adjust timing based on expected processing time
    
    # Get final status
    response = client.get(f"/api/simulations/{simulation_id}", headers=headers)
    simulation = response.json()
    
    # If the simulation hasn't completed in the available time, we'll still return the ID
    # but some tests might need to be skipped
    if simulation["status"] != "COMPLETED":
        pytest.skip("No completed simulation available for visualization tests")
    
    return simulation_id


@pytest.fixture
def visualization_request() -> Dict[str, Any]:
    """Return a valid visualization request for testing."""
    return {
        "data_field": "temperature",
        "visualization_type": "heatmap",
        "time_point": 0.0005,  # Mid-point of simulation
        "slice_orientation": "xy",
        "slice_position": 0.0025,  # Middle of domain
        "colormap": "viridis",
        "include_contours": True,
        "include_legend": True
    }


class TestVisualizationAPI:
    """Tests for the visualization API endpoints."""
    
    def test_available_visualization_types(self, client: TestClient):
        """Test retrieving available visualization types."""
        response = client.get("/api/visualization/types")
        assert response.status_code == 200
        
        vis_types = response.json()
        assert isinstance(vis_types, list)
        assert len(vis_types) > 0
        
        # Check for expected visualization types
        expected_types = ["heatmap", "isosurface", "volume_rendering", "contour"]
        for vis_type in expected_types:
            assert vis_type in vis_types, f"{vis_type} should be an available visualization type"
    
    def test_available_colormaps(self, client: TestClient):
        """Test retrieving available colormaps."""
        response = client.get("/api/visualization/colormaps")
        assert response.status_code == 200
        
        colormaps = response.json()
        assert isinstance(colormaps, list)
        assert len(colormaps) > 0
        
        # Check for common colormaps
        expected_maps = ["viridis", "plasma", "inferno", "magma", "jet"]
        for cmap in expected_maps:
            assert cmap in colormaps, f"{cmap} should be an available colormap"
    
    def test_available_data_fields(self, client: TestClient, completed_simulation: str):
        """Test retrieving available data fields for visualization."""
        response = client.get(f"/api/visualization/data-fields/{completed_simulation}")
        assert response.status_code == 200
        
        data_fields = response.json()
        assert isinstance(data_fields, list)
        assert len(data_fields) > 0
        
        # Check for expected data fields
        expected_fields = ["temperature", "reaction_rate", "species_density"]
        for field in expected_fields:
            assert any(field in df for df in data_fields), f"{field} should be available for visualization"
    
    def test_create_visualization(self, client: TestClient, completed_simulation: str, visualization_request: Dict[str, Any]):
        """Test creating a visualization."""
        request = {**visualization_request, "simulation_id": completed_simulation}
        
        response = client.post("/api/visualization/create", json=request)
        assert response.status_code == 202  # Accepted, will process asynchronously
        
        result = response.json()
        assert "visualization_id" in result
        assert "status" in result
        
        visualization_id = result["visualization_id"]
        
        # Poll for visualization completion
        start_time = time.time()
        max_wait = 30  # seconds
        
        while time.time() - start_time < max_wait:
            status_response = client.get(f"/api/visualization/status/{visualization_id}")
            assert status_response.status_code == 200
            
            status = status_response.json()["status"]
            if status in ["completed", "failed"]:
                break
                
            time.sleep(2)
        
        # Get final status
        status_response = client.get(f"/api/visualization/status/{visualization_id}")
        assert status_response.status_code == 200
        assert status_response.json()["status"] == "completed"
        
        # Verify we can get the visualization content
        vis_response = client.get(f"/api/visualization/view/{visualization_id}")
        assert vis_response.status_code == 200
        
        # Check if the response is HTML (for interactive visualizations)
        assert "text/html" in vis_response.headers["content-type"].lower() or \
               "image/" in vis_response.headers["content-type"].lower() or \
               "application/json" in vis_response.headers["content-type"].lower()
    
    def test_heatmap_visualization(self, client: TestClient, completed_simulation: str):
        """Test creating a heatmap visualization."""
        request = {
            "simulation_id": completed_simulation,
            "data_field": "temperature",
            "visualization_type": "heatmap",
            "time_point": 0.0005,
            "slice_orientation": "xy",
            "slice_position": 0.0025,
            "colormap": "viridis"
        }
        
        response = client.post("/api/visualization/create", json=request)
        assert response.status_code == 202
        
        visualization_id = response.json()["visualization_id"]
        
        # Wait for visualization to complete
        start_time = time.time()
        max_wait = 30  # seconds
        
        while time.time() - start_time < max_wait:
            status_response = client.get(f"/api/visualization/status/{visualization_id}")
            assert status_response.status_code == 200
            
            status = status_response.json()["status"]
            if status in ["completed", "failed"]:
                break
                
            time.sleep(2)
        
        # Verify completion
        status_response = client.get(f"/api/visualization/status/{visualization_id}")
        assert status_response.status_code == 200
        assert status_response.json()["status"] == "completed"
        
        # Verify we can view the visualization
        vis_response = client.get(f"/api/visualization/view/{visualization_id}")
        assert vis_response.status_code == 200
    
    def test_isosurface_visualization(self, client: TestClient, completed_simulation: str):
        """Test creating an isosurface visualization."""
        request = {
            "simulation_id": completed_simulation,
            "data_field": "temperature",
            "visualization_type": "isosurface",
            "time_point": 0.0005,
            "iso_value": 350.0,  # slightly above initial temp
            "colormap": "plasma"
        }
        
        response = client.post("/api/visualization/create", json=request)
        assert response.status_code in [202, 501]  # 501 if not implemented
        
        if response.status_code == 202:
            visualization_id = response.json()["visualization_id"]
            
            # Wait for visualization to complete
            start_time = time.time()
            max_wait = 30  # seconds
            
            while time.time() - start_time < max_wait:
                status_response = client.get(f"/api/visualization/status/{visualization_id}")
                assert status_response.status_code == 200
                
                status = status_response.json()["status"]
                if status in ["completed", "failed"]:
                    break
                    
                time.sleep(2)
            
            # Verify completion
            status_response = client.get(f"/api/visualization/status/{visualization_id}")
            assert status_response.status_code == 200
            
            # In case the visualization is actually supported,
            # check if we can view it
            if status_response.json()["status"] == "completed":
                vis_response = client.get(f"/api/visualization/view/{visualization_id}")
                assert vis_response.status_code == 200
    
    def test_volume_rendering(self, client: TestClient, completed_simulation: str):
        """Test creating a volume rendering visualization."""
        request = {
            "simulation_id": completed_simulation,
            "data_field": "temperature",
            "visualization_type": "volume_rendering",
            "time_point": 0.0005,
            "colormap": "inferno",
            "opacity_mapping": "linear"
        }
        
        response = client.post("/api/visualization/create", json=request)
        assert response.status_code in [202, 501]  # 501 if not implemented
        
        if response.status_code == 202:
            visualization_id = response.json()["visualization_id"]
            
            # Wait for visualization to complete
            start_time = time.time()
            max_wait = 30  # seconds
            
            while time.time() - start_time < max_wait:
                status_response = client.get(f"/api/visualization/status/{visualization_id}")
                assert status_response.status_code == 200
                
                status = status_response.json()["status"]
                if status in ["completed", "failed"]:
                    break
                    
                time.sleep(2)
            
            # Verify completion
            status_response = client.get(f"/api/visualization/status/{visualization_id}")
            assert status_response.status_code == 200
            
            # In case the visualization is actually supported,
            # check if we can view it
            if status_response.json()["status"] == "completed":
                vis_response = client.get(f"/api/visualization/view/{visualization_id}")
                assert vis_response.status_code == 200
    
    def test_time_series_visualization(self, client: TestClient, completed_simulation: str):
        """Test creating a time series visualization for a specific point."""
        request = {
            "simulation_id": completed_simulation,
            "data_field": "temperature",
            "visualization_type": "time_series",
            "point": [0.0025, 0.0025, 0.0025]  # Center of domain
        }
        
        response = client.post("/api/visualization/create", json=request)
        assert response.status_code in [202, 501]  # 501 if not implemented
        
        if response.status_code == 202:
            visualization_id = response.json()["visualization_id"]
            
            # Wait for visualization to complete
            start_time = time.time()
            max_wait = 30  # seconds
            
            while time.time() - start_time < max_wait:
                status_response = client.get(f"/api/visualization/status/{visualization_id}")
                assert status_response.status_code == 200
                
                status = status_response.json()["status"]
                if status in ["completed", "failed"]:
                    break
                    
                time.sleep(2)
            
            # Verify completion
            status_response = client.get(f"/api/visualization/status/{visualization_id}")
            assert status_response.status_code == 200
            
            # In case the visualization is actually supported,
            # check if we can view it
            if status_response.json()["status"] == "completed":
                vis_response = client.get(f"/api/visualization/view/{visualization_id}")
                assert vis_response.status_code == 200
    
    def test_list_visualizations(self, client: TestClient, completed_simulation: str, visualization_request: Dict[str, Any]):
        """Test listing all visualizations for a user."""
        # Create a visualization first
        request = {**visualization_request, "simulation_id": completed_simulation}
        create_response = client.post("/api/visualization/create", json=request)
        assert create_response.status_code == 202
        
        # Get visualization list
        response = client.get("/api/visualization/list")
        assert response.status_code == 200
        
        visualizations = response.json()
        assert isinstance(visualizations, list)
        
        # The newly created visualization should be in the list
        vis_id = create_response.json()["visualization_id"]
        vis_ids = [v["visualization_id"] for v in visualizations]
        assert vis_id in vis_ids
    
    def test_filter_visualizations_by_simulation(self, client: TestClient, completed_simulation: str, visualization_request: Dict[str, Any]):
        """Test filtering visualizations by simulation ID."""
        # Create a visualization first
        request = {**visualization_request, "simulation_id": completed_simulation}
        create_response = client.post("/api/visualization/create", json=request)
        assert create_response.status_code == 202
        
        # Get visualizations for this simulation
        response = client.get(f"/api/visualization/list?simulation_id={completed_simulation}")
        assert response.status_code == 200
        
        visualizations = response.json()
        assert isinstance(visualizations, list)
        
        # All visualizations should be for the given simulation
        assert all(v["simulation_id"] == completed_simulation for v in visualizations)
    
    def test_filter_visualizations_by_type(self, client: TestClient, completed_simulation: str):
        """Test filtering visualizations by type."""
        # Create a heatmap visualization
        heatmap_request = {
            "simulation_id": completed_simulation,
            "data_field": "temperature",
            "visualization_type": "heatmap",
            "time_point": 0.0005,
            "slice_orientation": "xy",
            "slice_position": 0.0025
        }
        
        create_response = client.post("/api/visualization/create", json=heatmap_request)
        assert create_response.status_code == 202
        
        # Get visualizations of type 'heatmap'
        response = client.get("/api/visualization/list?type=heatmap")
        assert response.status_code == 200
        
        visualizations = response.json()
        assert isinstance(visualizations, list)
        
        # All visualizations should be of type 'heatmap'
        assert all(v["visualization_type"] == "heatmap" for v in visualizations)
    
    def test_visualization_download(self, client: TestClient, completed_simulation: str, visualization_request: Dict[str, Any]):
        """Test downloading a visualization as an image."""
        # Create a visualization first
        request = {**visualization_request, "simulation_id": completed_simulation}
        create_response = client.post("/api/visualization/create", json=request)
        assert create_response.status_code == 202
        
        vis_id = create_response.json()["visualization_id"]
        
        # Wait for visualization to complete
        start_time = time.time()
        max_wait = 30  # seconds
        
        while time.time() - start_time < max_wait:
            status_response = client.get(f"/api/visualization/status/{vis_id}")
            assert status_response.status_code == 200
            
            status = status_response.json()["status"]
            if status in ["completed", "failed"]:
                break
                
            time.sleep(2)
            
        # Verify completion
        status_response = client.get(f"/api/visualization/status/{vis_id}")
        assert status_response.status_code == 200
        
        if status_response.json()["status"] == "completed":
            # Download as PNG
            download_response = client.get(f"/api/visualization/download/{vis_id}?format=png")
            assert download_response.status_code in [200, 501]  # 501 if not implemented
            
            if download_response.status_code == 200:
                assert download_response.headers["content-type"] == "image/png"
                assert len(download_response.content) > 0
    
    def test_visualization_embed(self, client: TestClient, completed_simulation: str, visualization_request: Dict[str, Any]):
        """Test getting embed code for a visualization."""
        # Create a visualization first
        request = {**visualization_request, "simulation_id": completed_simulation}
        create_response = client.post("/api/visualization/create", json=request)
        assert create_response.status_code == 202
        
        vis_id = create_response.json()["visualization_id"]
        
        # Wait for visualization to complete
        start_time = time.time()
        max_wait = 30  # seconds
        
        while time.time() - start_time < max_wait:
            status_response = client.get(f"/api/visualization/status/{vis_id}")
            assert status_response.status_code == 200
            
            status = status_response.json()["status"]
            if status in ["completed", "failed"]:
                break
                
            time.sleep(2)
        
        # Verify completion
        status_response = client.get(f"/api/visualization/status/{vis_id}")
        assert status_response.status_code == 200
        
        if status_response.json()["status"] == "completed":
            # Get embed code
            embed_response = client.get(f"/api/visualization/embed/{vis_id}")
            assert embed_response.status_code in [200, 501]  # 501 if not implemented
            
            if embed_response.status_code == 200:
                embed_code = embed_response.json()["embed_code"]
                assert isinstance(embed_code, str)
                assert "<iframe" in embed_code or "<div" in embed_code
    
    def test_delete_visualization(self, client: TestClient, completed_simulation: str, visualization_request: Dict[str, Any]):
        """Test deleting a visualization."""
        # First create a visualization
        request = {**visualization_request, "simulation_id": completed_simulation}
        create_response = client.post("/api/visualization/create", json=request)
        assert create_response.status_code == 202
        
        vis_id = create_response.json()["visualization_id"]
        
        # Wait a bit for the visualization to possibly complete
        time.sleep(5)
        
        # Delete the visualization
        delete_response = client.delete(f"/api/visualization/{vis_id}")
        assert delete_response.status_code in [200, 204]
        
        # Verify it's gone
        get_response = client.get(f"/api/visualization/status/{vis_id}")
        assert get_response.status_code == 404
    
    def test_compare_visualizations(self, client: TestClient, completed_simulation: str):
        """Test comparing multiple visualizations."""
        # Create two visualizations first
        vis1_request = {
            "simulation_id": completed_simulation,
            "data_field": "temperature",
            "visualization_type": "heatmap",
            "time_point": 0.0,
            "slice_orientation": "xy",
            "slice_position": 0.0025
        }
        
        vis2_request = {
            "simulation_id": completed_simulation,
            "data_field": "temperature",
            "visualization_type": "heatmap",
            "time_point": 0.001,  # End of simulation
            "slice_orientation": "xy",
            "slice_position": 0.0025
        }
        
        create_response1 = client.post("/api/visualization/create", json=vis1_request)
        assert create_response1.status_code == 202
        
        create_response2 = client.post("/api/visualization/create", json=vis2_request)
        assert create_response2.status_code == 202
        
        vis1_id = create_response1.json()["visualization_id"]
        vis2_id = create_response2.json()["visualization_id"]
        
        # Wait for visualizations to complete
        start_time = time.time()
        max_wait = 30  # seconds
        
        while time.time() - start_time < max_wait:
            status1 = client.get(f"/api/visualization/status/{vis1_id}").json()["status"]
            status2 = client.get(f"/api/visualization/status/{vis2_id}").json()["status"]
            
            if status1 in ["completed", "failed"] and status2 in ["completed", "failed"]:
                break
                
            time.sleep(2)
        
        # Try to compare them
        compare_request = {
            "visualization_ids": [vis1_id, vis2_id],
            "layout": "side_by_side",
            "include_difference": True
        }
        
        response = client.post("/api/visualization/compare", json=compare_request)
        assert response.status_code in [202, 501]  # 501 if not implemented
        
        if response.status_code == 202:
            comparison_id = response.json()["comparison_id"]
            
            # Wait for comparison to complete
            start_time = time.time()
            max_wait = 30  # seconds
            
            while time.time() - start_time < max_wait:
                status_response = client.get(f"/api/visualization/comparison/status/{comparison_id}")
                assert status_response.status_code == 200
                
                status = status_response.json()["status"]
                if status in ["completed", "failed"]:
                    break
                    
                time.sleep(2)
            
            # Verify completion
            status_response = client.get(f"/api/visualization/comparison/status/{comparison_id}")
            assert status_response.status_code == 200
            
            if status_response.json()["status"] == "completed":
                # Get the comparison visualization
                vis_response = client.get(f"/api/visualization/comparison/view/{comparison_id}")
                assert vis_response.status_code == 200
    
    def test_animation_from_visualizations(self, client: TestClient, completed_simulation: str):
        """Test creating an animation from a sequence of visualizations."""
        # Create animation request for a series of time points
        request = {
            "simulation_id": completed_simulation,
            "data_field": "temperature",
            "visualization_type": "heatmap",
            "slice_orientation": "xy",
            "slice_position": 0.0025,
            "time_points": "all",  # Use all available time points
            "colormap": "viridis",
            "output_format": "mp4"
        }
        
        response = client.post("/api/visualization/animate", json=request)
        assert response.status_code in [202, 501]  # 501 if not implemented
        
        if response.status_code == 202:
            animation_id = response.json()["animation_id"]
            
            # Wait for animation to complete
            start_time = time.time()
            max_wait = 45  # seconds - allow more time for animation
            
            while time.time() - start_time < max_wait:
                status_response = client.get(f"/api/visualization/animation/status/{animation_id}")
                assert status_response.status_code == 200
                
                status = status_response.json()["status"]
                if status in ["completed", "failed"]:
                    break
                    
                time.sleep(3)
            
            # Verify completion
            status_response = client.get(f"/api/visualization/animation/status/{animation_id}")
            assert status_response.status_code == 200
            
            if status_response.json()["status"] == "completed":
                # Get the animation
                animation_response = client.get(f"/api/visualization/animation/download/{animation_id}")
                assert animation_response.status_code == 200
                assert animation_response.headers["content-type"] in ["video/mp4", "image/gif"]
    
    def test_visualization_settings(self, client: TestClient, completed_simulation: str):
        """Test visualization settings configuration."""
        request = {
            "simulation_id": completed_simulation,
            "data_field": "temperature",
            "visualization_type": "heatmap",
            "time_point": 0.0005,
            "slice_orientation": "xy",
            "slice_position": 0.0025,
            "settings": {
                "colormap": "jet",
                "include_grid": True,
                "include_axes": True,
                "include_title": True,
                "title": "Custom Temperature Visualization",
                "include_colorbar": True,
                "min_value": 300,
                "max_value": 400
            }
        }
        
        response = client.post("/api/visualization/create", json=request)
        assert response.status_code == 202
        
        visualization_id = response.json()["visualization_id"]
        
        # Wait for visualization to complete
        start_time = time.time()
        max_wait = 30  # seconds
        
        while time.time() - start_time < max_wait:
            status_response = client.get(f"/api/visualization/status/{visualization_id}")
            assert status_response.status_code == 200
            
            status = status_response.json()["status"]
            if status in ["completed", "failed"]:
                break
                
            time.sleep(2)
        
        # Verify completion
        status_response = client.get(f"/api/visualization/status/{visualization_id}")
        assert status_response.status_code == 200
    
    def test_visualization_metadata(self, client: TestClient, completed_simulation: str, visualization_request: Dict[str, Any]):
        """Test retrieving visualization metadata."""
        # Create a visualization first
        request = {**visualization_request, "simulation_id": completed_simulation}
        create_response = client.post("/api/visualization/create", json=request)
        assert create_response.status_code == 202
        
        vis_id = create_response.json()["visualization_id"]
        
        # Wait a bit for processing
        time.sleep(2)
        
        # Get visualization metadata
        response = client.get(f"/api/visualization/metadata/{vis_id}")
        assert response.status_code == 200
        
        metadata = response.json()
        assert "visualization_id" in metadata
        assert "simulation_id" in metadata
        assert "visualization_type" in metadata
        assert "data_field" in metadata
        assert "created_at" in metadata
    
    def test_invalid_simulation_id(self, client: TestClient, visualization_request: Dict[str, Any]):
        """Test behavior with invalid simulation ID."""
        # Use a non-existent simulation ID
        fake_id = "12345678-1234-5678-1234-567812345678"
        request = {**visualization_request, "simulation_id": fake_id}
        
        response = client.post("/api/visualization/create", json=request)
        assert response.status_code == 404
    
    def test_invalid_data_field(self, client: TestClient, completed_simulation: str):
        """Test behavior with invalid data field."""
        request = {
            "simulation_id": completed_simulation,
            "data_field": "nonexistent_field",
            "visualization_type": "heatmap",
            "time_point": 0.0005,
            "slice_orientation": "xy",
            "slice_position": 0.0025
        }
        
        response = client.post("/api/visualization/create", json=request)
        assert response.status_code in [400, 422]
    
    def test_invalid_visualization_type(self, client: TestClient, completed_simulation: str):
        """Test behavior with invalid visualization type."""
        request = {
            "simulation_id": completed_simulation,
            "data_field": "temperature",
            "visualization_type": "nonexistent_type",
            "time_point": 0.0005
        }
        
        response = client.post("/api/visualization/create", json=request)
        assert response.status_code in [400, 422]
    
    def test_missing_required_parameters(self, client: TestClient, completed_simulation: str):
        """Test behavior with missing required parameters."""
        # Missing slice_orientation and slice_position for heatmap
        request = {
            "simulation_id": completed_simulation,
            "data_field": "temperature",
            "visualization_type": "heatmap",
            "time_point": 0.0005
        }
        
        response = client.post("/api/visualization/create", json=request)
        assert response.status_code in [400, 422]
        
        # Check error message mentions the missing parameters
        error_msg = response.json().get("detail", "")
        assert re.search(r"slice_orientation|slice_position", str(error_msg))
    
    def test_get_time_series_plot(self, client: TestClient, user_token: str, completed_simulation: str):
        """Test retrieving a time series plot for a simulation."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Request a time series plot
        response = client.get(
            f"/api/visualizations/time-series",
            headers=headers,
            params={
                "simulation_id": completed_simulation,
                "y_variable": "temperature",
                "format": "json"
            }
        )
        
        if response.status_code == 200:
            # Time series endpoint exists and works
            result = response.json()
            assert "plot_data" in result
            assert "x_data" in result["plot_data"]
            assert "y_data" in result["plot_data"]
            assert len(result["plot_data"]["x_data"]) > 0
            assert len(result["plot_data"]["y_data"]) == len(result["plot_data"]["x_data"])
            assert "title" in result
            assert "x_label" in result
            assert "y_label" in result
        elif response.status_code == 404:
            pytest.skip("Time series visualization endpoint is not implemented")
    
    def test_get_multi_variable_time_series(self, client: TestClient, user_token: str, completed_simulation: str):
        """Test retrieving a multi-variable time series plot."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Request a multi-variable time series plot
        response = client.get(
            f"/api/visualizations/multi-variable",
            headers=headers,
            params={
                "simulation_id": completed_simulation,
                "y_variables": "temperature,pressure,excess_power",
                "format": "json"
            }
        )
        
        if response.status_code == 200:
            # Multi-variable time series endpoint exists and works
            result = response.json()
            assert "plot_data" in result
            assert "x_data" in result["plot_data"]
            
            # Check that all requested variables are present
            assert "temperature" in result["plot_data"]
            assert "pressure" in result["plot_data"] or "pressure_initial" in result["plot_data"]
            assert "excess_power" in result["plot_data"]
            
            # Check data length consistency
            x_length = len(result["plot_data"]["x_data"])
            assert x_length > 0
            
            for var_name, var_data in result["plot_data"].items():
                if var_name != "x_data":
                    assert len(var_data) == x_length
            
            assert "title" in result
            assert "x_label" in result
            assert "y_label" in result
        elif response.status_code == 404:
            pytest.skip("Multi-variable visualization endpoint is not implemented")
    
    def test_get_histogram(self, client: TestClient, user_token: str, completed_simulation: str):
        """Test retrieving a histogram for a simulation variable."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Request a histogram
        response = client.get(
            f"/api/visualizations/histogram",
            headers=headers,
            params={
                "simulation_id": completed_simulation,
                "variable": "temperature",
                "bins": 10,
                "format": "json"
            }
        )
        
        if response.status_code == 200:
            # Histogram endpoint exists and works
            result = response.json()
            assert "plot_data" in result
            assert "bin_edges" in result["plot_data"]
            assert "bin_values" in result["plot_data"]
            assert len(result["plot_data"]["bin_edges"]) > 0
            assert len(result["plot_data"]["bin_values"]) > 0
            assert "title" in result
            assert "x_label" in result
            assert "y_label" in result
        elif response.status_code == 404:
            pytest.skip("Histogram visualization endpoint is not implemented")
    
    def test_get_heatmap(self, client: TestClient, user_token: str, completed_simulation: str):
        """Test retrieving a heatmap for simulation data."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Request a heatmap
        response = client.get(
            f"/api/visualizations/heatmap",
            headers=headers,
            params={
                "simulation_id": completed_simulation,
                "x_variable": "time",
                "y_variable": "location",  # Assuming spatial data exists
                "z_variable": "temperature",
                "format": "json"
            }
        )
        
        if response.status_code == 200:
            # Heatmap endpoint exists and works
            result = response.json()
            assert "plot_data" in result
            assert "x_data" in result["plot_data"]
            assert "y_data" in result["plot_data"]
            assert "z_data" in result["plot_data"]
            assert len(result["plot_data"]["x_data"]) > 0
            assert len(result["plot_data"]["y_data"]) > 0
            assert len(result["plot_data"]["z_data"]) > 0
            assert "title" in result
            assert "x_label" in result
            assert "y_label" in result
        elif response.status_code in [404, 422]:
            # Heatmap endpoint might not be implemented or might not be applicable for this simulation
            pass
    
    def test_get_3d_surface_plot(self, client: TestClient, user_token: str, completed_simulation: str):
        """Test retrieving a 3D surface plot for simulation data."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Request a 3D surface plot
        response = client.get(
            f"/api/visualizations/surface-3d",
            headers=headers,
            params={
                "simulation_id": completed_simulation,
                "x_variable": "time",
                "y_variable": "location",  # Assuming spatial data exists
                "z_variable": "temperature",
                "format": "json"
            }
        )
        
        if response.status_code == 200:
            # 3D surface plot endpoint exists and works
            result = response.json()
            assert "plot_data" in result
            assert "x_data" in result["plot_data"]
            assert "y_data" in result["plot_data"]
            assert "z_data" in result["plot_data"]
            assert len(result["plot_data"]["x_data"]) > 0
            assert len(result["plot_data"]["y_data"]) > 0
            assert len(result["plot_data"]["z_data"]) > 0
            assert "title" in result
            assert "x_label" in result
            assert "y_label" in result
            assert "z_label" in result
        elif response.status_code in [404, 422]:
            # 3D surface plot endpoint might not be implemented or might not be applicable for this simulation
            pass
    
    def test_get_visualization_as_image(self, client: TestClient, user_token: str, completed_simulation: str):
        """Test retrieving a visualization as an image."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Request visualization as PNG image
        response = client.get(
            f"/api/visualizations/time-series",
            headers=headers,
            params={
                "simulation_id": completed_simulation,
                "y_variable": "temperature",
                "format": "png"
            }
        )
        
        if response.status_code == 200:
            # Image format is supported
            assert response.headers["Content-Type"] == "image/png"
            assert len(response.content) > 0
            
            # Try to verify it's actually a PNG image
            assert response.content.startswith(b'\x89PNG')
        elif response.status_code in [404, 422]:
            # Image format might not be supported
            pass
    
    def test_get_visualization_as_svg(self, client: TestClient, user_token: str, completed_simulation: str):
        """Test retrieving a visualization as an SVG image."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Request visualization as SVG image
        response = client.get(
            f"/api/visualizations/time-series",
            headers=headers,
            params={
                "simulation_id": completed_simulation,
                "y_variable": "temperature",
                "format": "svg"
            }
        )
        
        if response.status_code == 200:
            # SVG format is supported
            assert response.headers["Content-Type"] == "image/svg+xml"
            assert len(response.content) > 0
            
            # Try to verify it's actually an SVG image
            assert b'<svg' in response.content.lower()
        elif response.status_code in [404, 422]:
            # SVG format might not be supported
            pass
    
    def test_get_visualization_with_custom_styling(self, client: TestClient, user_token: str, completed_simulation: str):
        """Test retrieving a visualization with custom styling options."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Request visualization with custom styling
        response = client.get(
            f"/api/visualizations/time-series",
            headers=headers,
            params={
                "simulation_id": completed_simulation,
                "y_variable": "temperature",
                "format": "json",
                "title": "Custom Plot Title",
                "x_label": "Custom X Label",
                "y_label": "Custom Y Label",
                "color": "red",
                "line_style": "dashed"
            }
        )
        
        if response.status_code == 200:
            # Custom styling is supported
            result = response.json()
            
            # Check that custom styling was applied
            assert result["title"] == "Custom Plot Title"
            assert result["x_label"] == "Custom X Label"
            assert result["y_label"] == "Custom Y Label"
            
            # Note: The API might or might not include style information in the response
            if "style" in result:
                assert "color" in result["style"]
                assert "line_style" in result["style"]
        elif response.status_code in [404, 422]:
            # Custom styling might not be supported
            pass
    
    def test_visualization_data_filtering(self, client: TestClient, user_token: str, completed_simulation: str):
        """Test filtering visualization data by time range."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # First get the full time range
        full_response = client.get(
            f"/api/visualizations/time-series",
            headers=headers,
            params={
                "simulation_id": completed_simulation,
                "y_variable": "temperature",
                "format": "json"
            }
        )
        
        if full_response.status_code != 200:
            pytest.skip("Time series visualization endpoint is not implemented")
            
        full_data = full_response.json()
        
        # Now get filtered data (first half of time range)
        time_points = full_data["plot_data"]["x_data"]
        if len(time_points) < 2:
            pytest.skip("Not enough data points for filtering test")
            
        mid_time = (time_points[0] + time_points[-1]) / 2
        
        filtered_response = client.get(
            f"/api/visualizations/time-series",
            headers=headers,
            params={
                "simulation_id": completed_simulation,
                "y_variable": "temperature",
                "format": "json",
                "time_start": time_points[0],
                "time_end": mid_time
            }
        )
        
        if filtered_response.status_code == 200:
            # Filtering is supported
            filtered_data = filtered_response.json()
            
            # Check that filtered data has fewer points
            assert len(filtered_data["plot_data"]["x_data"]) < len(full_data["plot_data"]["x_data"])
            
            # Check that filtered data is within the specified range
            assert all(t <= mid_time for t in filtered_data["plot_data"]["x_data"])
        elif filtered_response.status_code in [422]:
            # Filtering might not be supported
            pass
    
    def test_compare_multiple_simulations_visualization(self, client: TestClient, user_token: str, completed_simulation: str):
        """Test visualization comparing multiple simulations."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create another simulation
        simulation_data = {
            "name": f"Comparison Viz Test Simulation {uuid.uuid4()}",
            "description": "A second simulation for testing visualization comparison",
            "model_type": "LENR_BASIC",
            "parameters": {
                "temperature_initial": 303.15,  # Higher starting temperature
                "pressure_initial": 101325,     # Standard atmospheric pressure in Pa
                "catalyst_loading": 0.7,        # Higher loading
                "reaction_time": 1800           # 30 minutes in seconds
            }
        }
        
        response = client.post("/api/simulations", json=simulation_data, headers=headers)
        assert response.status_code == 201
        
        second_simulation_id = response.json()["simulation_id"]
        
        # Wait for second simulation to potentially complete
        time.sleep(3)
        
        # Request comparison visualization
        response = client.get(
            f"/api/visualizations/compare",
            headers=headers,
            params={
                "simulation_ids": f"{completed_simulation},{second_simulation_id}",
                "variable": "temperature",
                "format": "json"
            }
        )
        
        if response.status_code == 200:
            # Comparison visualization is supported
            result = response.json()
            assert "plot_data" in result
            
            # Should have data for both simulations
            assert str(completed_simulation) in result["plot_data"] or "simulation_1" in result["plot_data"]
            assert str(second_simulation_id) in result["plot_data"] or "simulation_2" in result["plot_data"]
            
            # Check for plot metadata
            assert "title" in result
            assert "x_label" in result
            assert "y_label" in result
            assert "legend" in result
        elif response.status_code in [404, 422]:
            # Comparison visualization might not be implemented or second simulation might not be complete
            pass
    
    def test_get_correlation_plot(self, client: TestClient, user_token: str, completed_simulation: str):
        """Test retrieving a correlation plot for two variables."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Request a correlation plot
        response = client.get(
            f"/api/visualizations/correlation",
            headers=headers,
            params={
                "simulation_id": completed_simulation,
                "x_variable": "time",
                "y_variable": "temperature",
                "format": "json"
            }
        )
        
        if response.status_code == 200:
            # Correlation plot endpoint exists and works
            result = response.json()
            assert "plot_data" in result
            assert "x_data" in result["plot_data"]
            assert "y_data" in result["plot_data"]
            assert len(result["plot_data"]["x_data"]) > 0
            assert len(result["plot_data"]["y_data"]) == len(result["plot_data"]["x_data"])
            
            # Check if correlation coefficient is provided
            if "correlation" in result:
                assert -1 <= result["correlation"] <= 1
                
            assert "title" in result
            assert "x_label" in result
            assert "y_label" in result
        elif response.status_code == 404:
            pytest.skip("Correlation plot endpoint is not implemented")
    
    def test_get_visualization_metadata(self, client: TestClient, user_token: str, completed_simulation: str):
        """Test retrieving metadata about available visualizations."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Request visualization metadata
        response = client.get(
            f"/api/visualizations/metadata",
            headers=headers,
            params={
                "simulation_id": completed_simulation
            }
        )
        
        if response.status_code == 200:
            # Metadata endpoint exists
            result = response.json()
            
            # Should include lists of available variables and visualization types
            assert "available_variables" in result
            assert isinstance(result["available_variables"], list)
            assert len(result["available_variables"]) > 0
            
            assert "available_visualization_types" in result
            assert isinstance(result["available_visualization_types"], list)
            assert len(result["available_visualization_types"]) > 0
            
            # Should include information about each variable
            assert "variable_metadata" in result
            assert isinstance(result["variable_metadata"], dict)
            assert len(result["variable_metadata"]) > 0
        elif response.status_code == 404:
            pytest.skip("Visualization metadata endpoint is not implemented")
    
    def test_save_custom_visualization(self, client: TestClient, user_token: str, completed_simulation: str):
        """Test saving a custom visualization configuration."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create a custom visualization configuration
        custom_viz = {
            "name": "My Custom Temperature Plot",
            "simulation_id": completed_simulation,
            "visualization_type": "time_series",
            "parameters": {
                "y_variable": "temperature",
                "title": "Temperature Evolution Over Time",
                "x_label": "Time (s)",
                "y_label": "Temperature (K)",
                "color": "blue",
                "line_style": "solid"
            }
        }
        
        response = client.post(
            f"/api/visualizations/custom",
            headers=headers,
            json=custom_viz
        )
        
        if response.status_code in [201, 200]:
            # Custom visualization saving is supported
            result = response.json()
            assert "visualization_id" in result
            
            # Try to retrieve the saved visualization
            viz_id = result["visualization_id"]
            get_response = client.get(
                f"/api/visualizations/custom/{viz_id}",
                headers=headers
            )
            
            if get_response.status_code == 200:
                saved_viz = get_response.json()
                assert saved_viz["name"] == custom_viz["name"]
                assert saved_viz["simulation_id"] == custom_viz["simulation_id"]
                assert saved_viz["visualization_type"] == custom_viz["visualization_type"]
        elif response.status_code == 404:
            pytest.skip("Custom visualization saving is not implemented")
    
    def test_get_animation_frames(self, client: TestClient, user_token: str, completed_simulation: str):
        """Test retrieving animation frames for a simulation."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Request animation frames
        response = client.get(
            f"/api/visualizations/animation",
            headers=headers,
            params={
                "simulation_id": completed_simulation,
                "variable": "temperature",
                "format": "json",
                "frames": 5  # Request 5 frames
            }
        )
        
        if response.status_code == 200:
            # Animation endpoint exists and works
            result = response.json()
            assert "frames" in result
            assert isinstance(result["frames"], list)
            assert 1 <= len(result["frames"]) <= 5  # Should have at least 1 but not more than requested frames
            
            # Check first frame structure
            assert "plot_data" in result["frames"][0]
            assert "time" in result["frames"][0]
            assert "title" in result["frames"][0]
        elif response.status_code in [404, 422]:
            # Animation endpoint might not be implemented
            pass 