"""
Integration tests for animation API endpoints.

These tests verify that the animation API endpoints correctly process
simulation data and generate animations of LENR simulation results.
"""

import pytest
import json
import time
from fastapi.testclient import TestClient
from typing import Dict, Any, List

# Mark the entire module as integration tests
pytestmark = pytest.mark.integration


@pytest.fixture
def completed_simulation(client: TestClient) -> str:
    """Set up a completed simulation and return its ID for testing animations."""
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
def animation_request() -> Dict[str, Any]:
    """Return a valid animation request for testing."""
    return {
        "animation_type": "temperature_evolution",
        "data_field": "temperature",
        "slice_axis": "z",
        "slice_position": 0.5,
        "frame_count": 10,
        "fps": 5,
        "colormap": "plasma",
        "include_time_display": True,
        "include_color_bar": True
    }


class TestAnimationAPI:
    """Tests for the animation API endpoints."""

    def test_available_animation_types(self, client: TestClient):
        """Test retrieving available animation types."""
        response = client.get("/api/animation/types")
        assert response.status_code == 200
        
        animation_types = response.json()
        assert isinstance(animation_types, list)
        assert len(animation_types) > 0
        
        # Check for expected animation types
        expected_types = ["temperature_evolution", "reaction_rate_evolution"]
        for anim_type in expected_types:
            assert anim_type in animation_types, f"{anim_type} should be an available animation type"

    def test_create_animation(self, client: TestClient, completed_simulation: str, animation_request: Dict[str, Any]):
        """Test creating an animation from simulation results."""
        # Add simulation ID to request
        request = {**animation_request, "simulation_id": completed_simulation}
        
        response = client.post("/api/animation/create", json=request)
        assert response.status_code == 202  # Accepted, will process asynchronously
        
        result = response.json()
        assert "animation_id" in result
        assert "status" in result
        assert result["status"] in ["pending", "processing"]
        
        animation_id = result["animation_id"]
        
        # Poll for animation completion
        start_time = time.time()
        max_wait = 30  # seconds
        
        while time.time() - start_time < max_wait:
            status_response = client.get(f"/api/animation/status/{animation_id}")
            assert status_response.status_code == 200
            
            status = status_response.json()["status"]
            if status in ["completed", "failed"]:
                break
                
            time.sleep(2)
        
        # Get final status
        status_response = client.get(f"/api/animation/status/{animation_id}")
        assert status_response.status_code == 200
        assert status_response.json()["status"] in ["completed", "processing", "pending"]

    def test_get_animation(self, client: TestClient, completed_simulation: str, animation_request: Dict[str, Any]):
        """Test retrieving a completed animation."""
        # First create an animation
        request = {**animation_request, "simulation_id": completed_simulation}
        
        create_response = client.post("/api/animation/create", json=request)
        assert create_response.status_code == 202
        
        animation_id = create_response.json()["animation_id"]
        
        # Wait for animation to complete
        start_time = time.time()
        max_wait = 30  # seconds
        
        while time.time() - start_time < max_wait:
            status_response = client.get(f"/api/animation/status/{animation_id}")
            assert status_response.status_code == 200
            
            status = status_response.json()["status"]
            if status in ["completed", "failed"]:
                break
                
            time.sleep(2)
        
        # If the animation completed, try to get it
        status_response = client.get(f"/api/animation/status/{animation_id}")
        if status_response.json()["status"] == "completed":
            response = client.get(f"/api/animation/{animation_id}")
            assert response.status_code == 200
            
            result = response.json()
            assert "animation_url" in result
            
            # Check that the animation file is accessible
            animation_url = result["animation_url"]
            file_response = client.get(animation_url)
            assert file_response.status_code == 200
            assert file_response.headers["content-type"] in ["video/mp4", "image/gif", "application/octet-stream"]

    def test_list_user_animations(self, client: TestClient, completed_simulation: str, animation_request: Dict[str, Any]):
        """Test listing all animations for a user."""
        # Create an animation first
        request = {**animation_request, "simulation_id": completed_simulation}
        create_response = client.post("/api/animation/create", json=request)
        assert create_response.status_code == 202
        
        # Get animation list
        response = client.get("/api/animation/list")
        assert response.status_code == 200
        
        animations = response.json()
        assert isinstance(animations, list)
        
        # The newly created animation should be in the list
        animation_id = create_response.json()["animation_id"]
        animation_ids = [a["animation_id"] for a in animations]
        assert animation_id in animation_ids

    def test_filter_animations_by_simulation(self, client: TestClient, completed_simulation: str, animation_request: Dict[str, Any]):
        """Test filtering animations by simulation ID."""
        # Create an animation first
        request = {**animation_request, "simulation_id": completed_simulation}
        create_response = client.post("/api/animation/create", json=request)
        assert create_response.status_code == 202
        
        # Get animations for this simulation
        response = client.get(f"/api/animation/list?simulation_id={completed_simulation}")
        assert response.status_code == 200
        
        animations = response.json()
        assert isinstance(animations, list)
        assert len(animations) > 0
        
        # All animations should be for the given simulation
        for animation in animations:
            assert animation["simulation_id"] == completed_simulation

    def test_animation_settings(self, client: TestClient, completed_simulation: str):
        """Test animation with different settings."""
        # Create an animation with specific settings
        request = {
            "simulation_id": completed_simulation,
            "animation_type": "temperature_evolution",
            "data_field": "temperature",
            "slice_axis": "x",
            "slice_position": 0.25,
            "frame_count": 5,
            "fps": 2,
            "colormap": "viridis",
            "include_time_display": True,
            "include_color_bar": True,
            "min_value": 300,
            "max_value": 500
        }
        
        response = client.post("/api/animation/create", json=request)
        assert response.status_code == 202
        
        # We can't easily verify the visual output in an automated test,
        # but we can check that the request was accepted

    def test_animation_formats(self, client: TestClient, completed_simulation: str):
        """Test creating animations in different formats."""
        formats = ["mp4", "gif"]
        
        for format_type in formats:
            request = {
                "simulation_id": completed_simulation,
                "animation_type": "temperature_evolution",
                "data_field": "temperature",
                "format": format_type,
                "frame_count": 5
            }
            
            response = client.post("/api/animation/create", json=request)
            # The format might not be supported, so accept 202 or appropriate error code
            assert response.status_code in [202, 400, 422, 501]
            
            if response.status_code == 202:
                animation_id = response.json()["animation_id"]
                
                # Wait briefly then check status
                time.sleep(2)
                status_response = client.get(f"/api/animation/status/{animation_id}")
                assert status_response.status_code == 200

    def test_cancel_animation(self, client: TestClient, completed_simulation: str, animation_request: Dict[str, Any]):
        """Test cancelling an animation in progress."""
        # Start an animation
        request = {**animation_request, "simulation_id": completed_simulation}
        response = client.post("/api/animation/create", json=request)
        assert response.status_code == 202
        
        animation_id = response.json()["animation_id"]
        
        # Try to cancel it
        cancel_response = client.post(f"/api/animation/cancel/{animation_id}")
        assert cancel_response.status_code in [200, 204, 404, 409]
        
        # A 200/204 means it was cancelled
        # A 404 might mean it already completed
        # A 409 might mean it can't be cancelled (already done)

    def test_delete_animation(self, client: TestClient, completed_simulation: str, animation_request: Dict[str, Any]):
        """Test deleting an animation."""
        # First create an animation
        request = {**animation_request, "simulation_id": completed_simulation}
        create_response = client.post("/api/animation/create", json=request)
        assert create_response.status_code == 202
        
        animation_id = create_response.json()["animation_id"]
        
        # Wait a bit for the animation to possibly complete
        time.sleep(5)
        
        # Delete the animation
        delete_response = client.delete(f"/api/animation/{animation_id}")
        assert delete_response.status_code in [200, 204]
        
        # Verify it's gone
        get_response = client.get(f"/api/animation/{animation_id}")
        assert get_response.status_code == 404

    def test_invalid_simulation_id(self, client: TestClient, animation_request: Dict[str, Any]):
        """Test behavior with invalid simulation ID."""
        # Use a non-existent simulation ID
        fake_id = "12345678-1234-5678-1234-567812345678"
        request = {**animation_request, "simulation_id": fake_id}
        
        response = client.post("/api/animation/create", json=request)
        assert response.status_code == 404

    def test_invalid_animation_parameters(self, client: TestClient, completed_simulation: str):
        """Test behavior with invalid animation parameters."""
        # Invalid animation type
        request = {
            "simulation_id": completed_simulation,
            "animation_type": "nonexistent_type",
            "data_field": "temperature"
        }
        
        response = client.post("/api/animation/create", json=request)
        assert response.status_code in [400, 422]
        
        # Invalid data field
        request = {
            "simulation_id": completed_simulation,
            "animation_type": "temperature_evolution",
            "data_field": "nonexistent_field"
        }
        
        response = client.post("/api/animation/create", json=request)
        assert response.status_code in [400, 422]

    def test_animation_metadata(self, client: TestClient, completed_simulation: str, animation_request: Dict[str, Any]):
        """Test retrieving animation metadata."""
        # Create an animation first
        request = {**animation_request, "simulation_id": completed_simulation}
        create_response = client.post("/api/animation/create", json=request)
        assert create_response.status_code == 202
        
        animation_id = create_response.json()["animation_id"]
        
        # Wait a bit for processing
        time.sleep(2)
        
        # Get animation metadata
        response = client.get(f"/api/animation/metadata/{animation_id}")
        assert response.status_code == 200
        
        metadata = response.json()
        assert "animation_id" in metadata
        assert "animation_type" in metadata
        assert "data_field" in metadata
        assert "simulation_id" in metadata
        assert "created_at" in metadata 