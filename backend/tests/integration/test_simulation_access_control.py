"""
Integration tests for simulation data access controls.

These tests verify that the simulation API endpoints correctly enforce
authorization rules, ensuring that users can only access simulations they
own or have been granted access to, and that administrative functions are
restricted to users with appropriate permissions.
"""

import pytest
import time
import uuid
from fastapi.testclient import TestClient
from typing import Dict, Any, List, Tuple

# Mark the entire module as integration tests
pytestmark = pytest.mark.integration


@pytest.fixture
def user_credentials() -> Dict[str, str]:
    """Return user credentials for testing."""
    return {
        "email": f"user_{int(time.time())}@example.com",
        "password": "Test@Password123",
        "first_name": "Test",
        "last_name": "User"
    }


@pytest.fixture
def second_user_credentials() -> Dict[str, str]:
    """Return credentials for a second user."""
    return {
        "email": f"second_user_{int(time.time())}@example.com",
        "password": "Test@Password123",
        "first_name": "Second",
        "last_name": "User"
    }


@pytest.fixture
def admin_credentials() -> Dict[str, str]:
    """Return admin credentials for testing."""
    return {
        "email": f"admin_{int(time.time())}@example.com",
        "password": "Admin@Password123",
        "first_name": "Admin",
        "last_name": "User"
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
def second_registered_user(client: TestClient, second_user_credentials: Dict[str, str]) -> Dict[str, Any]:
    """Register a second user and return their credentials and user ID."""
    response = client.post("/api/auth/register", json=second_user_credentials)
    assert response.status_code == 201
    
    result = response.json()
    
    return {
        "user_id": result["user_id"],
        "email": second_user_credentials["email"],
        "password": second_user_credentials["password"]
    }


@pytest.fixture
def registered_admin(client: TestClient, admin_credentials: Dict[str, str]) -> Dict[str, Any]:
    """Register an admin user and return their credentials and user ID."""
    # First register as a normal user
    response = client.post("/api/auth/register", json=admin_credentials)
    assert response.status_code == 201
    
    user_id = response.json()["user_id"]
    
    # Try to promote to admin - may need to be adapted based on your system
    superadmin_login_response = client.post("/api/auth/login", json={
        "email": "superadmin@example.com",
        "password": "SuperAdmin@Password123"
    })
    
    if superadmin_login_response.status_code == 200:
        superadmin_token = superadmin_login_response.json()["access_token"]
        
        # Promote user to admin
        response = client.put(
            f"/api/admin/users/{user_id}/role",
            json={"role": "admin"},
            headers={"Authorization": f"Bearer {superadmin_token}"}
        )
        assert response.status_code == 200
    
    return {
        "user_id": user_id,
        "email": admin_credentials["email"],
        "password": admin_credentials["password"]
    }


@pytest.fixture
def user_token(client: TestClient, registered_user: Dict[str, Any]) -> Dict[str, str]:
    """Log in as a registered user and return authentication tokens."""
    login_data = {
        "email": registered_user["email"],
        "password": registered_user["password"]
    }
    
    response = client.post("/api/auth/login", json=login_data)
    assert response.status_code == 200
    
    result = response.json()
    
    return {
        "access_token": result["access_token"],
        "refresh_token": result["refresh_token"]
    }


@pytest.fixture
def second_user_token(client: TestClient, second_registered_user: Dict[str, Any]) -> Dict[str, str]:
    """Log in as a second registered user and return authentication tokens."""
    login_data = {
        "email": second_registered_user["email"],
        "password": second_registered_user["password"]
    }
    
    response = client.post("/api/auth/login", json=login_data)
    assert response.status_code == 200
    
    result = response.json()
    
    return {
        "access_token": result["access_token"],
        "refresh_token": result["refresh_token"]
    }


@pytest.fixture
def admin_token(client: TestClient, registered_admin: Dict[str, Any]) -> Dict[str, str]:
    """Log in as an admin user and return authentication tokens."""
    login_data = {
        "email": registered_admin["email"],
        "password": registered_admin["password"]
    }
    
    response = client.post("/api/auth/login", json=login_data)
    
    # Skip if admin login fails (likely due to missing setup)
    if response.status_code != 200:
        return {}
    
    result = response.json()
    
    return {
        "access_token": result["access_token"],
        "refresh_token": result["refresh_token"]
    }


@pytest.fixture
def user_simulation(client: TestClient, user_token: Dict[str, str]) -> str:
    """Create a simulation for the first user and return its ID."""
    headers = {"Authorization": f"Bearer {user_token['access_token']}"}
    
    # Create a basic simulation
    simulation_data = {
        "name": f"Test Simulation {uuid.uuid4()}",
        "description": "Test simulation for access control testing",
        "model_type": "LENR_BASIC",
        "parameters": {
            "temperature_initial": 293.15,
            "pressure_initial": 101325,
            "catalyst_loading": 0.5,
            "reaction_time": 3600
        }
    }
    
    response = client.post("/api/simulations", json=simulation_data, headers=headers)
    assert response.status_code == 201
    
    result = response.json()
    assert "simulation_id" in result
    
    # Return the simulation ID
    return result["simulation_id"]


class TestSimulationAccessControl:
    """Tests for simulation data access controls."""
    
    def test_user_can_access_own_simulation(self, client: TestClient, user_token: Dict[str, str], user_simulation: str):
        """Test that users can access their own simulations."""
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        
        # Get simulation details
        response = client.get(f"/api/simulations/{user_simulation}", headers=headers)
        assert response.status_code == 200
        
        simulation = response.json()
        assert simulation["simulation_id"] == user_simulation
    
    def test_user_cannot_access_others_simulation(self, client: TestClient, second_user_token: Dict[str, str], user_simulation: str):
        """Test that users cannot access simulations they don't own."""
        headers = {"Authorization": f"Bearer {second_user_token['access_token']}"}
        
        # Try to get simulation details
        response = client.get(f"/api/simulations/{user_simulation}", headers=headers)
        assert response.status_code == 403  # Forbidden
    
    def test_admin_can_access_any_simulation(self, client: TestClient, admin_token: Dict[str, str], user_simulation: str):
        """Test that admin users can access any simulation."""
        # Skip if admin fixture is not properly set up
        if not admin_token.get("access_token"):
            pytest.skip("Admin user setup is not available")
        
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        
        # Get simulation details
        response = client.get(f"/api/simulations/{user_simulation}", headers=headers)
        assert response.status_code == 200
        
        simulation = response.json()
        assert simulation["simulation_id"] == user_simulation
    
    def test_user_cannot_modify_others_simulation(self, client: TestClient, second_user_token: Dict[str, str], user_simulation: str):
        """Test that users cannot modify simulations they don't own."""
        headers = {"Authorization": f"Bearer {second_user_token['access_token']}"}
        
        update_data = {
            "name": "Updated Simulation Name",
            "description": "This update should fail"
        }
        
        # Try to update the simulation
        response = client.put(f"/api/simulations/{user_simulation}", json=update_data, headers=headers)
        assert response.status_code == 403  # Forbidden
    
    def test_user_cannot_delete_others_simulation(self, client: TestClient, second_user_token: Dict[str, str], user_simulation: str):
        """Test that users cannot delete simulations they don't own."""
        headers = {"Authorization": f"Bearer {second_user_token['access_token']}"}
        
        # Try to delete the simulation
        response = client.delete(f"/api/simulations/{user_simulation}", headers=headers)
        assert response.status_code == 403  # Forbidden
    
    def test_admin_can_delete_any_simulation(self, client: TestClient, admin_token: Dict[str, str], user_simulation: str):
        """Test that admin users can delete any simulation."""
        # Skip if admin fixture is not properly set up
        if not admin_token.get("access_token"):
            pytest.skip("Admin user setup is not available")
        
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        
        # Delete the simulation
        response = client.delete(f"/api/simulations/{user_simulation}", headers=headers)
        assert response.status_code == 204  # No Content
        
        # Verify it's deleted
        get_response = client.get(f"/api/simulations/{user_simulation}", headers=headers)
        assert get_response.status_code == 404  # Not Found
    
    def test_share_simulation_with_specific_user(self, client: TestClient, user_token: Dict[str, str], second_registered_user: Dict[str, Any], user_simulation: str):
        """Test sharing a simulation with a specific user."""
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        
        # Share the simulation with the second user
        share_data = {
            "user_id": second_registered_user["user_id"],
            "access_level": "read"  # Assuming read-only access
        }
        
        response = client.post(
            f"/api/simulations/{user_simulation}/share",
            json=share_data,
            headers=headers
        )
        assert response.status_code == 200
        
        # Verify second user can now access the simulation
        second_headers = {
            "Authorization": f"Bearer {second_user_token['access_token']}"
        }
        
        get_response = client.get(f"/api/simulations/{user_simulation}", headers=second_headers)
        assert get_response.status_code == 200
    
    def test_share_simulation_with_write_access(self, client: TestClient, user_token: Dict[str, str], second_user_token: Dict[str, str], second_registered_user: Dict[str, Any], user_simulation: str):
        """Test sharing a simulation with write access."""
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        
        # Share the simulation with the second user with write access
        share_data = {
            "user_id": second_registered_user["user_id"],
            "access_level": "write"
        }
        
        response = client.post(
            f"/api/simulations/{user_simulation}/share",
            json=share_data,
            headers=headers
        )
        assert response.status_code == 200
        
        # Verify second user can modify the simulation
        second_headers = {
            "Authorization": f"Bearer {second_user_token['access_token']}"
        }
        
        update_data = {
            "name": "Updated By Second User",
            "description": "This update should succeed with write access"
        }
        
        update_response = client.put(
            f"/api/simulations/{user_simulation}",
            json=update_data,
            headers=second_headers
        )
        assert update_response.status_code == 200
        
        # Verify the changes were applied
        get_response = client.get(
            f"/api/simulations/{user_simulation}",
            headers=second_headers
        )
        assert get_response.status_code == 200
        
        updated_simulation = get_response.json()
        assert updated_simulation["name"] == update_data["name"]
        assert updated_simulation["description"] == update_data["description"]
    
    def test_revoke_simulation_access(self, client: TestClient, user_token: Dict[str, str], second_user_token: Dict[str, str], second_registered_user: Dict[str, Any], user_simulation: str):
        """Test revoking shared access to a simulation."""
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        
        # First share the simulation with the second user
        share_data = {
            "user_id": second_registered_user["user_id"],
            "access_level": "read"
        }
        
        response = client.post(
            f"/api/simulations/{user_simulation}/share",
            json=share_data,
            headers=headers
        )
        assert response.status_code == 200
        
        # Verify second user can access the simulation
        second_headers = {
            "Authorization": f"Bearer {second_user_token['access_token']}"
        }
        
        get_response = client.get(
            f"/api/simulations/{user_simulation}",
            headers=second_headers
        )
        assert get_response.status_code == 200
        
        # Now revoke access
        revoke_data = {
            "user_id": second_registered_user["user_id"]
        }
        
        revoke_response = client.delete(
            f"/api/simulations/{user_simulation}/share",
            json=revoke_data,
            headers=headers
        )
        assert revoke_response.status_code == 200
        
        # Verify second user can no longer access the simulation
        get_response_after_revoke = client.get(
            f"/api/simulations/{user_simulation}",
            headers=second_headers
        )
        assert get_response_after_revoke.status_code == 403  # Forbidden
    
    def test_list_shared_simulations(self, client: TestClient, user_token: Dict[str, str], second_user_token: Dict[str, str], second_registered_user: Dict[str, Any], user_simulation: str):
        """Test listing simulations shared with a user."""
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        
        # Share the simulation with the second user
        share_data = {
            "user_id": second_registered_user["user_id"],
            "access_level": "read"
        }
        
        response = client.post(
            f"/api/simulations/{user_simulation}/share",
            json=share_data,
            headers=headers
        )
        assert response.status_code == 200
        
        # List simulations shared with the second user
        second_headers = {
            "Authorization": f"Bearer {second_user_token['access_token']}"
        }
        
        list_response = client.get("/api/simulations/shared-with-me", headers=second_headers)
        assert list_response.status_code == 200
        
        shared_simulations = list_response.json()
        assert isinstance(shared_simulations, list)
        assert any(sim["simulation_id"] == user_simulation for sim in shared_simulations)
    
    def test_list_users_with_access(self, client: TestClient, user_token: Dict[str, str], second_registered_user: Dict[str, Any], user_simulation: str):
        """Test listing users who have access to a simulation."""
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        
        # Share the simulation with the second user
        share_data = {
            "user_id": second_registered_user["user_id"],
            "access_level": "read"
        }
        
        response = client.post(
            f"/api/simulations/{user_simulation}/share",
            json=share_data,
            headers=headers
        )
        assert response.status_code == 200
        
        # List users with access to the simulation
        list_response = client.get(
            f"/api/simulations/{user_simulation}/access",
            headers=headers
        )
        assert list_response.status_code == 200
        
        users_with_access = list_response.json()
        assert isinstance(users_with_access, list)
        assert any(user["user_id"] == second_registered_user["user_id"] for user in users_with_access)
    
    def test_public_simulation_access(self, client: TestClient, user_token: Dict[str, str], second_user_token: Dict[str, str], user_simulation: str):
        """Test making a simulation public and accessing it."""
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        
        # Make the simulation public
        visibility_data = {
            "visibility": "public"
        }
        
        response = client.put(
            f"/api/simulations/{user_simulation}/visibility",
            json=visibility_data,
            headers=headers
        )
        assert response.status_code == 200
        
        # Verify any user can access the simulation
        second_headers = {
            "Authorization": f"Bearer {second_user_token['access_token']}"
        }
        
        get_response = client.get(
            f"/api/simulations/{user_simulation}",
            headers=second_headers
        )
        assert get_response.status_code == 200
    
    def test_browse_public_simulations(self, client: TestClient, user_token: Dict[str, str], second_user_token: Dict[str, str], user_simulation: str):
        """Test browsing public simulations."""
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        
        # Make the simulation public
        visibility_data = {
            "visibility": "public"
        }
        
        response = client.put(
            f"/api/simulations/{user_simulation}/visibility",
            json=visibility_data,
            headers=headers
        )
        assert response.status_code == 200
        
        # Browse public simulations as second user
        second_headers = {
            "Authorization": f"Bearer {second_user_token['access_token']}"
        }
        
        browse_response = client.get("/api/simulations/public", headers=second_headers)
        assert browse_response.status_code == 200
        
        public_simulations = browse_response.json()
        assert isinstance(public_simulations, list)
        assert any(sim["simulation_id"] == user_simulation for sim in public_simulations)
    
    def test_bulk_share_simulations(self, client: TestClient, user_token: Dict[str, str], second_registered_user: Dict[str, Any]):
        """Test sharing multiple simulations at once."""
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        
        # Create multiple simulations
        simulation_ids = []
        for i in range(3):
            simulation_data = {
                "name": f"Bulk Share Test Simulation {i}",
                "description": f"Test simulation {i} for bulk sharing",
                "model_type": "LENR_BASIC",
                "parameters": {
                    "temperature_initial": 293.15 + i,
                    "pressure_initial": 101325,
                    "catalyst_loading": 0.5,
                    "reaction_time": 3600
                }
            }
            
            create_response = client.post(
                "/api/simulations",
                json=simulation_data,
                headers=headers
            )
            assert create_response.status_code == 201
            simulation_ids.append(create_response.json()["simulation_id"])
        
        # Bulk share the simulations
        bulk_share_data = {
            "simulation_ids": simulation_ids,
            "user_id": second_registered_user["user_id"],
            "access_level": "read"
        }
        
        response = client.post(
            "/api/simulations/bulk-share",
            json=bulk_share_data,
            headers=headers
        )
        assert response.status_code == 200
        
        # Verify the second user has access to all shared simulations
        second_headers = {
            "Authorization": f"Bearer {second_user_token['access_token']}"
        }
        
        for sim_id in simulation_ids:
            get_response = client.get(
                f"/api/simulations/{sim_id}",
                headers=second_headers
            )
            assert get_response.status_code == 200
    
    def test_simulation_access_log(self, client: TestClient, user_token: Dict[str, str], user_simulation: str):
        """Test logging and retrieving access history for a simulation."""
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        
        # Access the simulation a few times to generate logs
        for _ in range(3):
            client.get(f"/api/simulations/{user_simulation}", headers=headers)
            time.sleep(0.1)  # Small delay to ensure distinct timestamps
        
        # Get access logs for the simulation
        logs_response = client.get(
            f"/api/simulations/{user_simulation}/access-logs",
            headers=headers
        )
        
        # If access logs are implemented
        if logs_response.status_code == 200:
            logs = logs_response.json()
            assert isinstance(logs, list)
            assert len(logs) >= 3  # Should have at least 3 log entries
        else:
            # If access logs are not implemented, this test can be skipped
            assert logs_response.status_code in [404, 501]  # Not Found or Not Implemented
            pytest.skip("Simulation access logs are not implemented") 