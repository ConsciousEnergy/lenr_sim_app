"""
Integration tests for visualization settings and preferences.

These tests verify that visualization settings and user preferences
are correctly stored, retrieved, and applied.
"""

import pytest
import json
import uuid
from fastapi.testclient import TestClient
from typing import Dict, Any, List, Optional, Tuple

# Mark the entire module as integration tests
pytestmark = pytest.mark.integration


@pytest.fixture
def user_credentials() -> Dict[str, str]:
    """Return test user credentials."""
    return {
        "username": f"testuser_{uuid.uuid4().hex[:8]}",
        "password": "testpassword123",
        "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
    }


@pytest.fixture
def registered_user(client: TestClient, user_credentials: Dict[str, str]) -> Dict[str, str]:
    """Register a test user and return credentials."""
    response = client.post("/api/users/register", json=user_credentials)
    assert response.status_code == 200
    return user_credentials


@pytest.fixture
def user_token(client: TestClient, registered_user: Dict[str, str]) -> str:
    """Get authentication token for the test user."""
    response = client.post(
        "/api/users/token",
        data={
            "username": registered_user["username"],
            "password": registered_user["password"],
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture
def auth_headers(user_token: str) -> Dict[str, str]:
    """Return authorization headers with user token."""
    return {"Authorization": f"Bearer {user_token}"}


@pytest.fixture
def completed_simulation(client: TestClient, auth_headers: Dict[str, str]) -> str:
    """Set up a completed simulation and return its ID."""
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
    
    response = client.post(
        "/api/multi-physics/simulations",
        json=sim_request,
        headers=auth_headers
    )
    assert response.status_code == 200
    
    simulation_id = response.json()["simulation_id"]
    
    # Wait for simulation to complete
    import time
    start_time = time.time()
    max_wait = 30  # seconds
    
    while time.time() - start_time < max_wait:
        status_response = client.get(
            f"/api/multi-physics/simulations/{simulation_id}/status",
            headers=auth_headers
        )
        assert status_response.status_code == 200
        
        if status_response.json()["status"] in ["completed", "failed"]:
            break
            
        time.sleep(2)
    
    # Verify simulation completed successfully
    status_response = client.get(
        f"/api/multi-physics/simulations/{simulation_id}/status",
        headers=auth_headers
    )
    assert status_response.status_code == 200
    assert status_response.json()["status"] == "completed"
    
    return simulation_id


@pytest.fixture
def visualization_settings() -> Dict[str, Any]:
    """Return test visualization settings."""
    return {
        "name": "Test Settings Profile",
        "color_map": "viridis",
        "background_color": "#ffffff",
        "axis_labels": True,
        "grid_lines": True,
        "legend_position": "bottom",
        "font_size": 12,
        "plot_style": "scientific",
        "3d_rendering_quality": "high",
        "animation_speed": 1.0,
        "default_plots": ["temperature", "reaction_rate"],
        "custom_color_ranges": {
            "temperature": [300, 1000],
            "reaction_rate": [0, 1e-10]
        }
    }


class TestVisualizationSettings:
    """Tests for visualization settings and preferences."""

    def test_create_visualization_settings(self, client: TestClient, auth_headers: Dict[str, str], visualization_settings: Dict[str, Any]):
        """Test creating visualization settings."""
        response = client.post(
            "/api/visualization/settings",
            json=visualization_settings,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        result = response.json()
        assert "settings_id" in result
        assert "created_at" in result
        
        # Verify all settings were stored correctly
        for key, value in visualization_settings.items():
            assert key in result
            assert result[key] == value

    def test_get_visualization_settings(self, client: TestClient, auth_headers: Dict[str, str], visualization_settings: Dict[str, Any]):
        """Test retrieving visualization settings."""
        # First create settings
        create_response = client.post(
            "/api/visualization/settings",
            json=visualization_settings,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        settings_id = create_response.json()["settings_id"]
        
        # Retrieve settings
        response = client.get(
            f"/api/visualization/settings/{settings_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        settings = response.json()
        assert settings["settings_id"] == settings_id
        
        # Verify all settings match
        for key, value in visualization_settings.items():
            assert key in settings
            assert settings[key] == value

    def test_list_visualization_settings(self, client: TestClient, auth_headers: Dict[str, str], visualization_settings: Dict[str, Any]):
        """Test listing all visualization settings for a user."""
        # Create multiple settings
        settings_names = ["Profile 1", "Profile 2", "Profile 3"]
        settings_ids = []
        
        for name in settings_names:
            settings = visualization_settings.copy()
            settings["name"] = name
            
            response = client.post(
                "/api/visualization/settings",
                json=settings,
                headers=auth_headers
            )
            assert response.status_code == 200
            settings_ids.append(response.json()["settings_id"])
        
        # List all settings
        response = client.get(
            "/api/visualization/settings",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        all_settings = response.json()
        assert isinstance(all_settings, list)
        assert len(all_settings) >= len(settings_names)
        
        # Verify all created settings are in the list
        returned_ids = [s["settings_id"] for s in all_settings]
        for settings_id in settings_ids:
            assert settings_id in returned_ids

    def test_update_visualization_settings(self, client: TestClient, auth_headers: Dict[str, str], visualization_settings: Dict[str, Any]):
        """Test updating visualization settings."""
        # First create settings
        create_response = client.post(
            "/api/visualization/settings",
            json=visualization_settings,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        settings_id = create_response.json()["settings_id"]
        
        # Update settings
        updates = {
            "name": "Updated Profile",
            "color_map": "plasma",
            "background_color": "#000000",
            "font_size": 14
        }
        
        response = client.put(
            f"/api/visualization/settings/{settings_id}",
            json=updates,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        updated_settings = response.json()
        assert updated_settings["settings_id"] == settings_id
        
        # Verify updated fields
        for key, value in updates.items():
            assert updated_settings[key] == value
            
        # Verify other fields unchanged
        for key, value in visualization_settings.items():
            if key not in updates:
                assert updated_settings[key] == value

    def test_delete_visualization_settings(self, client: TestClient, auth_headers: Dict[str, str], visualization_settings: Dict[str, Any]):
        """Test deleting visualization settings."""
        # First create settings
        create_response = client.post(
            "/api/visualization/settings",
            json=visualization_settings,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        settings_id = create_response.json()["settings_id"]
        
        # Delete settings
        delete_response = client.delete(
            f"/api/visualization/settings/{settings_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        
        # Verify deletion
        response = client.get(
            f"/api/visualization/settings/{settings_id}",
            headers=auth_headers
        )
        assert response.status_code == 404

    def test_default_visualization_settings(self, client: TestClient, auth_headers: Dict[str, str]):
        """Test retrieving default visualization settings."""
        response = client.get(
            "/api/visualization/settings/default",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        default_settings = response.json()
        assert isinstance(default_settings, dict)
        
        # Check some expected default fields
        expected_fields = ["color_map", "background_color", "plot_style"]
        for field in expected_fields:
            assert field in default_settings

    def test_apply_settings_to_visualization(self, client: TestClient, auth_headers: Dict[str, str], 
                                           visualization_settings: Dict[str, Any], completed_simulation: str):
        """Test applying visualization settings to a plot."""
        # First create settings
        create_response = client.post(
            "/api/visualization/settings",
            json=visualization_settings,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        settings_id = create_response.json()["settings_id"]
        
        # Create a visualization request with settings
        plot_request = {
            "simulation_id": completed_simulation,
            "plot_type": "time_series",
            "data_field": "temperature",
            "position": [0.5, 0.5, 0.5],
            "settings_id": settings_id
        }
        
        response = client.post(
            "/api/visualization/plot",
            json=plot_request,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        result = response.json()
        assert "plot_id" in result
        assert "image_url" in result
        
        # We can't easily verify the visual aspects of the plot in an automated test,
        # but we can verify the request was accepted and processed

    def test_set_user_default_settings(self, client: TestClient, auth_headers: Dict[str, str], visualization_settings: Dict[str, Any]):
        """Test setting a profile as the user's default settings."""
        # First create settings
        create_response = client.post(
            "/api/visualization/settings",
            json=visualization_settings,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        settings_id = create_response.json()["settings_id"]
        
        # Set as default
        response = client.post(
            f"/api/visualization/settings/{settings_id}/set-default",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        # Verify it's now the default
        default_response = client.get(
            "/api/visualization/settings/user-default",
            headers=auth_headers
        )
        assert default_response.status_code == 200
        
        default_settings = default_response.json()
        assert default_settings["settings_id"] == settings_id

    def test_user_preferences(self, client: TestClient, auth_headers: Dict[str, str]):
        """Test storing and retrieving user visualization preferences."""
        # Create preferences
        preferences = {
            "auto_refresh": True,
            "default_plot_type": "time_series",
            "show_welcome_screen": False,
            "tutorial_completed": True,
            "dashboard_layout": "grid",
            "default_comparison_mode": "overlay"
        }
        
        response = client.post(
            "/api/visualization/preferences",
            json=preferences,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        # Retrieve preferences
        get_response = client.get(
            "/api/visualization/preferences",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        
        stored_preferences = get_response.json()
        
        # Verify preferences were stored correctly
        for key, value in preferences.items():
            assert key in stored_preferences
            assert stored_preferences[key] == value

    def test_visualization_templates(self, client: TestClient, auth_headers: Dict[str, str], completed_simulation: str):
        """Test creating and using visualization templates."""
        # Create a template
        template = {
            "name": "Standard Analysis",
            "description": "Basic temperature and reaction analysis",
            "plots": [
                {
                    "plot_type": "time_series",
                    "data_field": "temperature",
                    "position": [0.5, 0.5, 0.5],
                    "plot_style": {"title": "Temperature vs Time"}
                },
                {
                    "plot_type": "spatial_distribution",
                    "data_field": "reaction_rate",
                    "time_point": 0.001,
                    "slice_axis": "z",
                    "slice_position": 0.5,
                    "plot_style": {"title": "Reaction Rate Distribution"}
                }
            ]
        }
        
        response = client.post(
            "/api/visualization/templates",
            json=template,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        result = response.json()
        assert "template_id" in result
        template_id = result["template_id"]
        
        # Apply template to a simulation
        apply_response = client.post(
            f"/api/visualization/templates/{template_id}/apply",
            json={"simulation_id": completed_simulation},
            headers=auth_headers
        )
        assert apply_response.status_code == 200
        
        plots = apply_response.json()
        assert isinstance(plots, list)
        assert len(plots) == len(template["plots"])
        
        # Verify each plot was created
        for plot in plots:
            assert "plot_id" in plot
            assert "image_url" in plot

    def test_permission_control(self, client: TestClient, auth_headers: Dict[str, str], 
                              visualization_settings: Dict[str, Any], user_credentials: Dict[str, str]):
        """Test that users can only access their own settings."""
        # Create settings for the first user
        response = client.post(
            "/api/visualization/settings",
            json=visualization_settings,
            headers=auth_headers
        )
        assert response.status_code == 200
        settings_id = response.json()["settings_id"]
        
        # Create a second user
        second_user = {
            "username": f"testuser2_{uuid.uuid4().hex[:8]}",
            "password": "testpassword123",
            "email": f"test2_{uuid.uuid4().hex[:8]}@example.com",
        }
        
        register_response = client.post("/api/users/register", json=second_user)
        assert register_response.status_code == 200
        
        # Get token for second user
        token_response = client.post(
            "/api/users/token",
            data={
                "username": second_user["username"],
                "password": second_user["password"],
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert token_response.status_code == 200
        second_token = token_response.json()["access_token"]
        
        second_headers = {"Authorization": f"Bearer {second_token}"}
        
        # Second user should not be able to access first user's settings
        response = client.get(
            f"/api/visualization/settings/{settings_id}",
            headers=second_headers
        )
        assert response.status_code == 404 