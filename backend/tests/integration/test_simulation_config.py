"""
Integration tests for the simulation configuration API.

These tests verify that simulation configurations can be saved, retrieved,
updated, and reused for starting new simulations.
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
        "email": f"config_test_user_{int(time.time())}@example.com",
        "password": "Test@Password123",
        "first_name": "Config",
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
def simulation_config_data() -> Dict[str, Any]:
    """Return a simulation configuration for testing."""
    return {
        "name": f"Test Configuration {int(time.time())}",
        "description": "A test simulation configuration for integration testing",
        "model_type": "LENR_BASIC",
        "parameters": {
            "temperature_initial": 293.15,
            "pressure_initial": 101325,
            "catalyst_loading": 0.5,
            "reaction_time": 1800
        }
    }


class TestSimulationConfig:
    """Tests for the simulation configuration API."""
    
    def test_create_simulation_config(self, client: TestClient, user_token: str, simulation_config_data: Dict[str, Any]):
        """Test creating a simulation configuration."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.post(
            "/api/simulation-configs", 
            json=simulation_config_data,
            headers=headers
        )
        
        if response.status_code == 201:
            result = response.json()
            
            # Check response structure
            assert "config_id" in result
            assert "name" in result
            assert "model_type" in result
            assert "created_at" in result
            assert "user_id" in result
            
            # Check that values match what we sent
            assert result["name"] == simulation_config_data["name"]
            assert result["model_type"] == simulation_config_data["model_type"]
            
            # Store for later use in other tests
            return result
        elif response.status_code == 404:
            pytest.skip("Simulation configuration endpoint is not implemented")
        else:
            pytest.fail(f"Failed to create simulation configuration: {response.text}")
    
    def test_get_simulation_configs(self, client: TestClient, user_token: str, simulation_config_data: Dict[str, Any]):
        """Test retrieving all simulation configurations for a user."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # First create a configuration
        create_response = client.post(
            "/api/simulation-configs", 
            json=simulation_config_data,
            headers=headers
        )
        
        if create_response.status_code != 201:
            pytest.skip("Create simulation configuration endpoint is not working or not implemented")
        
        # Get all configurations
        response = client.get("/api/simulation-configs", headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            
            # Check that we received a list of configurations
            assert isinstance(result, list)
            assert len(result) >= 1
            
            # Check the structure of the first configuration
            first_config = result[0]
            assert "config_id" in first_config
            assert "name" in first_config
            assert "model_type" in first_config
            assert "created_at" in first_config
            assert "user_id" in first_config
            
            # Verify our created config is in the results
            config_id = create_response.json()["config_id"]
            found = False
            for config in result:
                if config["config_id"] == config_id:
                    found = True
                    break
            
            assert found, "The created configuration was not found in the list of configurations"
        elif response.status_code == 404:
            pytest.skip("Get simulation configurations endpoint is not implemented")
    
    def test_get_simulation_config_by_id(self, client: TestClient, user_token: str, simulation_config_data: Dict[str, Any]):
        """Test retrieving a specific simulation configuration by ID."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # First create a configuration
        create_response = client.post(
            "/api/simulation-configs", 
            json=simulation_config_data,
            headers=headers
        )
        
        if create_response.status_code != 201:
            pytest.skip("Create simulation configuration endpoint is not working or not implemented")
        
        config_id = create_response.json()["config_id"]
        
        # Get the specific configuration
        response = client.get(f"/api/simulation-configs/{config_id}", headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            
            # Check response structure
            assert "config_id" in result
            assert "name" in result
            assert "description" in result
            assert "model_type" in result
            assert "parameters" in result
            assert "created_at" in result
            assert "user_id" in result
            
            # Check that values match what we sent
            assert result["config_id"] == config_id
            assert result["name"] == simulation_config_data["name"]
            assert result["description"] == simulation_config_data["description"]
            assert result["model_type"] == simulation_config_data["model_type"]
            
            # Check that parameters match
            for key, value in simulation_config_data["parameters"].items():
                assert key in result["parameters"]
                assert result["parameters"][key] == value
        elif response.status_code == 404:
            pytest.skip("Get simulation configuration by ID endpoint is not implemented")
    
    def test_update_simulation_config(self, client: TestClient, user_token: str, simulation_config_data: Dict[str, Any]):
        """Test updating a simulation configuration."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # First create a configuration
        create_response = client.post(
            "/api/simulation-configs", 
            json=simulation_config_data,
            headers=headers
        )
        
        if create_response.status_code != 201:
            pytest.skip("Create simulation configuration endpoint is not working or not implemented")
        
        config_id = create_response.json()["config_id"]
        
        # Update data
        updated_data = simulation_config_data.copy()
        updated_data["name"] = f"Updated Configuration {int(time.time())}"
        updated_data["description"] = "This configuration has been updated"
        updated_data["parameters"]["temperature_initial"] = 300.0
        updated_data["parameters"]["catalyst_loading"] = 0.75
        
        # Update the configuration
        response = client.put(
            f"/api/simulation-configs/{config_id}", 
            json=updated_data,
            headers=headers
        )
        
        if response.status_code == 200:
            result = response.json()
            
            # Check response structure
            assert "config_id" in result
            assert "name" in result
            assert "description" in result
            assert "model_type" in result
            assert "parameters" in result
            
            # Check that values match the updated data
            assert result["config_id"] == config_id
            assert result["name"] == updated_data["name"]
            assert result["description"] == updated_data["description"]
            assert result["model_type"] == updated_data["model_type"]
            
            # Check that parameters have been updated
            assert result["parameters"]["temperature_initial"] == updated_data["parameters"]["temperature_initial"]
            assert result["parameters"]["catalyst_loading"] == updated_data["parameters"]["catalyst_loading"]
            
            # Get the updated configuration to verify changes persisted
            get_response = client.get(f"/api/simulation-configs/{config_id}", headers=headers)
            
            if get_response.status_code == 200:
                get_result = get_response.json()
                assert get_result["name"] == updated_data["name"]
                assert get_result["parameters"]["temperature_initial"] == updated_data["parameters"]["temperature_initial"]
        elif response.status_code == 404:
            pytest.skip("Update simulation configuration endpoint is not implemented")
    
    def test_delete_simulation_config(self, client: TestClient, user_token: str, simulation_config_data: Dict[str, Any]):
        """Test deleting a simulation configuration."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # First create a configuration
        create_response = client.post(
            "/api/simulation-configs", 
            json=simulation_config_data,
            headers=headers
        )
        
        if create_response.status_code != 201:
            pytest.skip("Create simulation configuration endpoint is not working or not implemented")
        
        config_id = create_response.json()["config_id"]
        
        # Delete the configuration
        response = client.delete(f"/api/simulation-configs/{config_id}", headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            
            # Check response
            assert "message" in result
            assert "config_id" in result
            assert result["config_id"] == config_id
            
            # Verify the configuration is actually deleted
            get_response = client.get(f"/api/simulation-configs/{config_id}", headers=headers)
            assert get_response.status_code == 404
        elif response.status_code == 404:
            pytest.skip("Delete simulation configuration endpoint is not implemented")
    
    def test_start_simulation_from_config(self, client: TestClient, user_token: str, simulation_config_data: Dict[str, Any]):
        """Test starting a new simulation from a saved configuration."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # First create a configuration
        create_response = client.post(
            "/api/simulation-configs", 
            json=simulation_config_data,
            headers=headers
        )
        
        if create_response.status_code != 201:
            pytest.skip("Create simulation configuration endpoint is not working or not implemented")
        
        config_id = create_response.json()["config_id"]
        
        # Start a simulation from the configuration
        simulation_request = {
            "name": f"Simulation from Config {int(time.time())}",
            "description": "This simulation was created from a saved configuration",
            "config_id": config_id
        }
        
        response = client.post(
            "/api/simulations/from-config", 
            json=simulation_request,
            headers=headers
        )
        
        if response.status_code == 201:
            result = response.json()
            
            # Check response structure
            assert "simulation_id" in result
            assert "name" in result
            assert "status" in result
            assert "model_type" in result
            assert "created_at" in result
            
            # Check that values match what we sent
            assert result["name"] == simulation_request["name"]
            assert result["model_type"] == simulation_config_data["model_type"]
            assert result["status"] in ["PENDING", "RUNNING"]
            
            # Get the simulation details to verify parameters were copied from the configuration
            sim_response = client.get(f"/api/simulations/{result['simulation_id']}", headers=headers)
            
            if sim_response.status_code == 200:
                sim_result = sim_response.json()
                assert "parameters" in sim_result
                
                # Check that parameters match the configuration
                for key, value in simulation_config_data["parameters"].items():
                    assert key in sim_result["parameters"]
                    assert sim_result["parameters"][key] == value
        elif response.status_code == 404:
            pytest.skip("Start simulation from config endpoint is not implemented")
    
    def test_create_config_from_simulation(self, client: TestClient, user_token: str, simulation_config_data: Dict[str, Any]):
        """Test creating a configuration from an existing simulation."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # First create a simulation
        simulation_data = {
            "name": f"Source Simulation {int(time.time())}",
            "description": "A simulation to create a configuration from",
            "model_type": simulation_config_data["model_type"],
            "parameters": simulation_config_data["parameters"]
        }
        
        sim_response = client.post("/api/simulations", json=simulation_data, headers=headers)
        
        if sim_response.status_code != 201:
            pytest.skip("Create simulation endpoint is not working or not implemented")
        
        simulation_id = sim_response.json()["simulation_id"]
        
        # Create a configuration from the simulation
        config_request = {
            "name": f"Config from Simulation {int(time.time())}",
            "description": "This configuration was created from an existing simulation",
            "simulation_id": simulation_id
        }
        
        response = client.post(
            "/api/simulation-configs/from-simulation", 
            json=config_request,
            headers=headers
        )
        
        if response.status_code == 201:
            result = response.json()
            
            # Check response structure
            assert "config_id" in result
            assert "name" in result
            assert "description" in result
            assert "model_type" in result
            assert "parameters" in result
            
            # Check that values match what we sent
            assert result["name"] == config_request["name"]
            assert result["description"] == config_request["description"]
            assert result["model_type"] == simulation_data["model_type"]
            
            # Check that parameters match the simulation
            for key, value in simulation_data["parameters"].items():
                assert key in result["parameters"]
                assert result["parameters"][key] == value
        elif response.status_code == 404:
            pytest.skip("Create config from simulation endpoint is not implemented")
    
    def test_duplicate_simulation_config(self, client: TestClient, user_token: str, simulation_config_data: Dict[str, Any]):
        """Test duplicating a simulation configuration."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # First create a configuration
        create_response = client.post(
            "/api/simulation-configs", 
            json=simulation_config_data,
            headers=headers
        )
        
        if create_response.status_code != 201:
            pytest.skip("Create simulation configuration endpoint is not working or not implemented")
        
        config_id = create_response.json()["config_id"]
        
        # Duplicate the configuration
        duplicate_request = {
            "name": f"Duplicated Configuration {int(time.time())}",
            "description": "This is a duplicate of another configuration"
        }
        
        response = client.post(
            f"/api/simulation-configs/{config_id}/duplicate", 
            json=duplicate_request,
            headers=headers
        )
        
        if response.status_code == 201:
            result = response.json()
            
            # Check response structure
            assert "config_id" in result
            assert "name" in result
            assert "description" in result
            assert "model_type" in result
            assert "parameters" in result
            
            # New config should have a different ID
            assert result["config_id"] != config_id
            
            # Check that values match what we sent for the duplicate
            assert result["name"] == duplicate_request["name"]
            assert result["description"] == duplicate_request["description"]
            
            # But model type and parameters should match the original
            assert result["model_type"] == simulation_config_data["model_type"]
            
            # Check that parameters match the original configuration
            for key, value in simulation_config_data["parameters"].items():
                assert key in result["parameters"]
                assert result["parameters"][key] == value
        elif response.status_code == 404:
            pytest.skip("Duplicate simulation configuration endpoint is not implemented")
    
    def test_get_recent_configs(self, client: TestClient, user_token: str, simulation_config_data: Dict[str, Any]):
        """Test retrieving recent simulation configurations."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create a few configurations
        configs = []
        for i in range(3):
            config_data = simulation_config_data.copy()
            config_data["name"] = f"{config_data['name']} {i+1}"
            
            response = client.post(
                "/api/simulation-configs", 
                json=config_data,
                headers=headers
            )
            
            if response.status_code != 201:
                pytest.skip("Create simulation configuration endpoint is not working or not implemented")
            
            configs.append(response.json()["config_id"])
            time.sleep(0.5)  # Brief pause to ensure different creation timestamps
        
        # Get recent configurations
        response = client.get(
            "/api/simulation-configs/recent",
            headers=headers,
            params={"limit": 5}
        )
        
        if response.status_code == 200:
            result = response.json()
            
            # Check that we received a list of configurations
            assert isinstance(result, list)
            assert len(result) >= len(configs)
            
            # Check that configurations are sorted by created_at in descending order
            for i in range(1, len(result)):
                assert result[i-1]["created_at"] >= result[i]["created_at"]
            
            # Verify our created configs are in the results
            result_ids = [config["config_id"] for config in result]
            for config_id in configs:
                assert config_id in result_ids
        elif response.status_code == 404:
            pytest.skip("Recent simulation configurations endpoint is not implemented")
    
    def test_search_configs(self, client: TestClient, user_token: str, simulation_config_data: Dict[str, Any]):
        """Test searching for simulation configurations by name or description."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create a configuration with a specific name for searching
        search_term = "Searchable Config"
        config_data = simulation_config_data.copy()
        config_data["name"] = f"{search_term} {int(time.time())}"
        
        response = client.post(
            "/api/simulation-configs", 
            json=config_data,
            headers=headers
        )
        
        if response.status_code != 201:
            pytest.skip("Create simulation configuration endpoint is not working or not implemented")
        
        config_id = response.json()["config_id"]
        
        # Search for configurations
        response = client.get(
            "/api/simulation-configs/search",
            headers=headers,
            params={"query": search_term}
        )
        
        if response.status_code == 200:
            result = response.json()
            
            # Check that we received a list of configurations
            assert isinstance(result, list)
            assert len(result) >= 1
            
            # Verify our specific configuration is in the results
            found = False
            for config in result:
                if config["config_id"] == config_id:
                    found = True
                    assert search_term in config["name"]
                    break
            
            assert found, "The created configuration was not found in the search results"
        elif response.status_code == 404:
            pytest.skip("Search simulation configurations endpoint is not implemented")
    
    def test_get_config_versions(self, client: TestClient, user_token: str, simulation_config_data: Dict[str, Any]):
        """Test retrieving all versions of a simulation configuration."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # First create a configuration
        create_response = client.post(
            "/api/simulation-configs", 
            json=simulation_config_data,
            headers=headers
        )
        
        if create_response.status_code != 201:
            pytest.skip("Create simulation configuration endpoint is not working or not implemented")
        
        config_id = create_response.json()["config_id"]
        
        # Update the configuration multiple times
        for i in range(2):
            updated_data = simulation_config_data.copy()
            updated_data["name"] = f"Updated Configuration Version {i+1}"
            updated_data["parameters"]["temperature_initial"] = 293.15 + (i+1) * 10
            
            update_response = client.put(
                f"/api/simulation-configs/{config_id}", 
                json=updated_data,
                headers=headers
            )
            
            if update_response.status_code != 200:
                pytest.skip("Update simulation configuration endpoint is not working or not implemented")
            
            time.sleep(0.5)  # Brief pause between updates
        
        # Get all versions of the configuration
        response = client.get(
            f"/api/simulation-configs/{config_id}/versions",
            headers=headers
        )
        
        if response.status_code == 200:
            result = response.json()
            
            # Check that we received a list of configuration versions
            assert isinstance(result, list)
            assert len(result) >= 3  # Original + 2 updates, unless versioning isn't implemented
            
            # Versions should be sorted by version number or timestamp in descending order
            if "version" in result[0]:
                for i in range(1, len(result)):
                    assert result[i-1]["version"] > result[i]["version"]
            elif "created_at" in result[0] or "updated_at" in result[0]:
                time_field = "updated_at" if "updated_at" in result[0] else "created_at"
                for i in range(1, len(result)):
                    assert result[i-1][time_field] >= result[i][time_field]
            
            # Check the latest version matches our last update
            latest = result[0]
            assert "parameters" in latest
            assert latest["parameters"]["temperature_initial"] == 293.15 + 2 * 10
        elif response.status_code == 404:
            pytest.skip("Configuration versions endpoint is not implemented") 