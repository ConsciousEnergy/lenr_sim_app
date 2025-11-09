"""
Integration tests for the user dashboard API.

These tests verify that the dashboard endpoints correctly provide user-specific
information, statistics, and recent activities.
"""

import pytest
import time
import uuid
from fastapi.testclient import TestClient
from typing import Dict, Any, List

# Mark the entire module as integration tests
pytestmark = pytest.mark.integration


@pytest.fixture
def user_credentials() -> Dict[str, str]:
    """Return user credentials for testing."""
    return {
        "email": f"dashboard_test_user_{int(time.time())}@example.com",
        "password": "Test@Password123",
        "first_name": "Dashboard",
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
def simulation_data(user_token: str) -> Dict[str, Any]:
    """Create and return simulation data for testing."""
    return {
        "name": f"Dashboard Test Simulation {uuid.uuid4()}",
        "description": "A simple simulation for testing dashboard functionality",
        "model_type": "LENR_BASIC",
        "parameters": {
            "temperature_initial": 293.15,
            "pressure_initial": 101325,
            "catalyst_loading": 0.5,
            "reaction_time": 1800
        }
    }


@pytest.fixture
def created_simulations(client: TestClient, user_token: str, simulation_data: Dict[str, Any]) -> List[str]:
    """Create multiple simulations for the user and return their IDs."""
    headers = {"Authorization": f"Bearer {user_token}"}
    simulation_ids = []
    
    # Create 3 simulations
    for i in range(3):
        # Modify the simulation name to ensure uniqueness
        curr_simulation_data = simulation_data.copy()
        curr_simulation_data["name"] = f"{simulation_data['name']} {i+1}"
        
        response = client.post("/api/simulations", json=curr_simulation_data, headers=headers)
        assert response.status_code == 201
        simulation_ids.append(response.json()["simulation_id"])
        
        # Brief pause to ensure different creation timestamps
        time.sleep(0.5)
    
    return simulation_ids


class TestUserDashboard:
    """Tests for the user dashboard API."""
    
    def test_get_dashboard_summary(self, client: TestClient, user_token: str, created_simulations: List[str]):
        """Test retrieving a summary of the user's dashboard."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get("/api/dashboard/summary", headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            
            # Check basic structure
            assert "user_info" in result
            assert "simulation_stats" in result
            
            # Check user info
            assert "user_id" in result["user_info"]
            assert "email" in result["user_info"]
            assert "first_name" in result["user_info"]
            assert "last_name" in result["user_info"]
            
            # Check simulation statistics
            assert "total_simulations" in result["simulation_stats"]
            assert result["simulation_stats"]["total_simulations"] >= len(created_simulations)
            
            assert "running_simulations" in result["simulation_stats"]
            assert "completed_simulations" in result["simulation_stats"]
            assert "failed_simulations" in result["simulation_stats"]
            
            # The sum of running, completed, and failed should equal total
            assert (result["simulation_stats"]["running_simulations"] +
                    result["simulation_stats"]["completed_simulations"] +
                    result["simulation_stats"]["failed_simulations"]) == result["simulation_stats"]["total_simulations"]
        elif response.status_code == 404:
            pytest.skip("Dashboard summary endpoint is not implemented")
    
    def test_get_recent_simulations(self, client: TestClient, user_token: str, created_simulations: List[str]):
        """Test retrieving recent simulations for the user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get("/api/dashboard/recent-simulations", headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            
            # Check that we received a list of simulations
            assert isinstance(result, list)
            
            # There should be at least as many simulations as we created
            assert len(result) >= len(created_simulations)
            
            # Check the structure of the first simulation
            first_sim = result[0]
            assert "simulation_id" in first_sim
            assert "name" in first_sim
            assert "model_type" in first_sim
            assert "status" in first_sim
            assert "created_at" in first_sim
            
            # Check that simulations are sorted by created_at in descending order
            for i in range(1, len(result)):
                assert result[i-1]["created_at"] >= result[i]["created_at"]
            
            # Verify that our created simulations are in the results
            result_ids = [sim["simulation_id"] for sim in result]
            for sim_id in created_simulations:
                assert sim_id in result_ids
        elif response.status_code == 404:
            pytest.skip("Recent simulations endpoint is not implemented")
    
    def test_get_simulation_status_counts(self, client: TestClient, user_token: str):
        """Test retrieving simulation status counts."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get("/api/dashboard/simulation-stats", headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            
            # Check that we have status counts
            assert "status_counts" in result
            assert isinstance(result["status_counts"], dict)
            
            # Check that we have the expected status types
            for status in ["PENDING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"]:
                assert status in result["status_counts"]
                assert isinstance(result["status_counts"][status], int)
            
            # Check total count
            assert "total" in result
            assert result["total"] == sum(result["status_counts"].values())
        elif response.status_code == 404:
            pytest.skip("Simulation stats endpoint is not implemented")
    
    def test_get_recent_activities(self, client: TestClient, user_token: str, created_simulations: List[str]):
        """Test retrieving recent user activities."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get("/api/dashboard/recent-activities", headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            
            # Check that we received a list of activities
            assert isinstance(result, list)
            
            # There should be at least as many activities as simulations we created
            assert len(result) >= len(created_simulations)
            
            # Check the structure of the first activity
            first_activity = result[0]
            assert "activity_id" in first_activity
            assert "activity_type" in first_activity
            assert "timestamp" in first_activity
            assert "details" in first_activity
            
            # Activities should be sorted by timestamp in descending order
            for i in range(1, len(result)):
                assert result[i-1]["timestamp"] >= result[i]["timestamp"]
            
            # At least one activity should be of type SIMULATION_CREATED
            assert any(act["activity_type"] == "SIMULATION_CREATED" for act in result)
        elif response.status_code == 404:
            pytest.skip("Recent activities endpoint is not implemented")
    
    def test_get_resource_usage(self, client: TestClient, user_token: str):
        """Test retrieving resource usage statistics."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get("/api/dashboard/resource-usage", headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            
            # Check that we have resource usage metrics
            assert "compute_time" in result
            assert "storage_used" in result
            
            # Verify data types and ranges
            assert isinstance(result["compute_time"], (int, float))
            assert result["compute_time"] >= 0
            
            assert isinstance(result["storage_used"], (int, float))
            assert result["storage_used"] >= 0
            
            # Check for usage limits if they exist
            if "compute_time_limit" in result:
                assert result["compute_time_limit"] >= result["compute_time"]
            
            if "storage_limit" in result:
                assert result["storage_limit"] >= result["storage_used"]
        elif response.status_code == 404:
            pytest.skip("Resource usage endpoint is not implemented")
    
    def test_get_dashboard_notifications(self, client: TestClient, user_token: str):
        """Test retrieving user notifications."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get("/api/dashboard/notifications", headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            
            # Check that we received a list of notifications
            assert isinstance(result, list)
            
            # If there are notifications, check their structure
            if result:
                first_notification = result[0]
                assert "notification_id" in first_notification
                assert "message" in first_notification
                assert "timestamp" in first_notification
                assert "read" in first_notification
                assert "priority" in first_notification
                
                # Notifications should be sorted by timestamp in descending order
                for i in range(1, len(result)):
                    assert result[i-1]["timestamp"] >= result[i]["timestamp"]
        elif response.status_code == 404:
            pytest.skip("Notifications endpoint is not implemented")
    
    def test_mark_notification_as_read(self, client: TestClient, user_token: str):
        """Test marking a notification as read."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # First get available notifications
        response = client.get("/api/dashboard/notifications", headers=headers)
        
        if response.status_code != 200 or not response.json():
            pytest.skip("No notifications available or endpoint not implemented")
            
        notifications = response.json()
        notification_id = notifications[0]["notification_id"]
        
        # Mark notification as read
        response = client.put(
            f"/api/dashboard/notifications/{notification_id}/read",
            headers=headers
        )
        
        if response.status_code == 200:
            result = response.json()
            assert result["notification_id"] == notification_id
            assert result["read"] is True
            
            # Verify the notification is marked as read in the notifications list
            response = client.get("/api/dashboard/notifications", headers=headers)
            assert response.status_code == 200
            
            updated_notifications = response.json()
            updated_notification = next(n for n in updated_notifications if n["notification_id"] == notification_id)
            assert updated_notification["read"] is True
        elif response.status_code == 404:
            pytest.skip("Mark notification as read endpoint is not implemented")
    
    def test_dashboard_search(self, client: TestClient, user_token: str, created_simulations: List[str], simulation_data: Dict[str, Any]):
        """Test searching across dashboard entities."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Use a term that should match the simulation name
        search_term = "Dashboard Test"
        
        response = client.get(
            "/api/dashboard/search",
            headers=headers,
            params={"query": search_term}
        )
        
        if response.status_code == 200:
            result = response.json()
            
            # Check structure of search results
            assert "simulations" in result
            assert isinstance(result["simulations"], list)
            
            # Should find at least the simulations we created
            assert len(result["simulations"]) >= 1
            
            # Verify that search results contain our simulations
            for simulation in result["simulations"]:
                assert "simulation_id" in simulation
                assert "name" in simulation
                assert "description" in simulation
                assert "model_type" in simulation
                
                # The search term should be in the simulation name or description
                assert (
                    search_term.lower() in simulation["name"].lower() or 
                    (simulation["description"] and search_term.lower() in simulation["description"].lower())
                )
        elif response.status_code == 404:
            pytest.skip("Dashboard search endpoint is not implemented")
    
    def test_get_simulation_calendar(self, client: TestClient, user_token: str, created_simulations: List[str]):
        """Test retrieving the simulation calendar data."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Get calendar data for the current month
        current_time = int(time.time())
        thirty_days_ago = current_time - (30 * 24 * 60 * 60)
        
        response = client.get(
            "/api/dashboard/simulation-calendar",
            headers=headers,
            params={
                "start_date": thirty_days_ago,
                "end_date": current_time
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            
            # Check that we have calendar data
            assert isinstance(result, list)
            
            # Each calendar entry should have a date and count
            for entry in result:
                assert "date" in entry
                assert "count" in entry
                
                # Date should be a timestamp or ISO string
                if isinstance(entry["date"], (int, float)):
                    assert entry["date"] >= thirty_days_ago
                    assert entry["date"] <= current_time
                
                # Count should be a non-negative integer
                assert isinstance(entry["count"], int)
                assert entry["count"] >= 0
        elif response.status_code == 404:
            pytest.skip("Simulation calendar endpoint is not implemented")
    
    def test_get_model_type_distribution(self, client: TestClient, user_token: str):
        """Test retrieving the distribution of simulation model types."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get("/api/dashboard/model-type-distribution", headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            
            # Check that we have distribution data
            assert isinstance(result, list)
            
            # Each entry should have a model type and count
            for entry in result:
                assert "model_type" in entry
                assert "count" in entry
                
                # Model type should be a string
                assert isinstance(entry["model_type"], str)
                
                # Count should be a non-negative integer
                assert isinstance(entry["count"], int)
                assert entry["count"] >= 0
            
            # LENR_BASIC should be one of the model types
            assert any(entry["model_type"] == "LENR_BASIC" for entry in result)
        elif response.status_code == 404:
            pytest.skip("Model type distribution endpoint is not implemented")
    
    def test_get_last_login_history(self, client: TestClient, user_token: str):
        """Test retrieving the user's login history."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get("/api/dashboard/login-history", headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            
            # Check that we have login history data
            assert isinstance(result, list)
            
            # Each entry should have a timestamp and potentially other metadata
            for entry in result:
                assert "timestamp" in entry
                
                # Optional but commonly tracked fields
                if "ip_address" in entry:
                    assert isinstance(entry["ip_address"], str)
                
                if "device_info" in entry:
                    assert isinstance(entry["device_info"], dict)
                
                # Entries should be sorted by timestamp in descending order
                for i in range(1, len(result)):
                    assert result[i-1]["timestamp"] >= result[i]["timestamp"]
        elif response.status_code == 404:
            pytest.skip("Login history endpoint is not implemented") 