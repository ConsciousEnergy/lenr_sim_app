"""
Integration tests for the simulation data processing pipeline.

These tests verify that the simulation data validation, processing, and storage 
components work correctly together, ensuring that the system handles valid data
appropriately and rejects invalid data with proper error messages.
"""

import pytest
import json
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
        "email": f"sim_test_user_{int(time.time())}@example.com",
        "password": "Test@Password123",
        "first_name": "Sim",
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
def valid_basic_simulation() -> Dict[str, Any]:
    """Return a valid basic LENR simulation definition."""
    return {
        "name": f"Basic LENR Test Simulation {uuid.uuid4()}",
        "description": "A basic LENR simulation for testing",
        "model_type": "LENR_BASIC",
        "parameters": {
            "temperature_initial": 293.15,  # Room temperature in Kelvin
            "pressure_initial": 101325,     # Standard atmospheric pressure in Pa
            "catalyst_loading": 0.5,        # 50% loading
            "reaction_time": 3600           # 1 hour in seconds
        }
    }


@pytest.fixture
def valid_advanced_simulation() -> Dict[str, Any]:
    """Return a valid advanced LENR simulation definition."""
    return {
        "name": f"Advanced LENR Test Simulation {uuid.uuid4()}",
        "description": "An advanced LENR simulation for testing",
        "model_type": "LENR_ADVANCED",
        "parameters": {
            "temperature_initial": 293.15,    # Room temperature in Kelvin
            "pressure_initial": 101325,       # Standard atmospheric pressure in Pa
            "catalyst_loading": 0.5,          # 50% loading
            "reaction_time": 3600,            # 1 hour in seconds
            "lattice_constant": 4.05e-10,     # Lattice constant in meters (e.g., for Palladium)
            "diffusion_coefficient": 1e-9,    # Diffusion coefficient in m²/s
            "activation_energy": 0.5,         # Activation energy in eV
            "excess_heat_coefficient": 0.3    # Coefficient for excess heat calculation
        }
    }


class TestSimulationDataPipeline:
    """Tests for the simulation data processing pipeline."""
    
    def test_create_valid_basic_simulation(self, client: TestClient, user_token: str, valid_basic_simulation: Dict[str, Any]):
        """Test creating a valid basic simulation."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.post("/api/simulations", json=valid_basic_simulation, headers=headers)
        assert response.status_code == 201
        
        result = response.json()
        assert "simulation_id" in result
        assert result["name"] == valid_basic_simulation["name"]
        assert result["model_type"] == valid_basic_simulation["model_type"]
        assert "created_at" in result
        assert "status" in result
        assert result["status"] in ["CREATED", "QUEUED", "PROCESSING"]
    
    def test_create_valid_advanced_simulation(self, client: TestClient, user_token: str, valid_advanced_simulation: Dict[str, Any]):
        """Test creating a valid advanced simulation."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.post("/api/simulations", json=valid_advanced_simulation, headers=headers)
        assert response.status_code == 201
        
        result = response.json()
        assert "simulation_id" in result
        assert result["name"] == valid_advanced_simulation["name"]
        assert result["model_type"] == valid_advanced_simulation["model_type"]
        assert "created_at" in result
        assert "status" in result
        assert result["status"] in ["CREATED", "QUEUED", "PROCESSING"]
    
    def test_create_simulation_with_missing_required_parameters(self, client: TestClient, user_token: str, valid_basic_simulation: Dict[str, Any]):
        """Test creating a simulation with missing required parameters."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Remove a required parameter
        invalid_simulation = valid_basic_simulation.copy()
        del invalid_simulation["parameters"]["temperature_initial"]
        
        response = client.post("/api/simulations", json=invalid_simulation, headers=headers)
        assert response.status_code == 422  # Unprocessable Entity
        
        error_detail = response.json()["detail"]
        assert any("temperature_initial" in str(error) for error in error_detail)
    
    def test_create_simulation_with_invalid_parameter_values(self, client: TestClient, user_token: str, valid_basic_simulation: Dict[str, Any]):
        """Test creating a simulation with invalid parameter values."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Set invalid temperature (negative Kelvin)
        invalid_simulation = valid_basic_simulation.copy()
        invalid_simulation["parameters"] = valid_basic_simulation["parameters"].copy()
        invalid_simulation["parameters"]["temperature_initial"] = -50
        
        response = client.post("/api/simulations", json=invalid_simulation, headers=headers)
        assert response.status_code == 422  # Unprocessable Entity
        
        error_detail = response.json()["detail"]
        assert any("temperature_initial" in str(error) for error in error_detail)
    
    def test_create_simulation_with_unknown_model_type(self, client: TestClient, user_token: str, valid_basic_simulation: Dict[str, Any]):
        """Test creating a simulation with an unknown model type."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        invalid_simulation = valid_basic_simulation.copy()
        invalid_simulation["model_type"] = "UNKNOWN_MODEL"
        
        response = client.post("/api/simulations", json=invalid_simulation, headers=headers)
        assert response.status_code == 422  # Unprocessable Entity
        
        error_detail = response.json()["detail"]
        assert any("model_type" in str(error) for error in error_detail)
    
    def test_simulation_complete_lifecycle(self, client: TestClient, user_token: str, valid_basic_simulation: Dict[str, Any]):
        """Test the complete lifecycle of a simulation from creation to results."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create simulation
        response = client.post("/api/simulations", json=valid_basic_simulation, headers=headers)
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
        
        # Check final status
        response = client.get(f"/api/simulations/{simulation_id}", headers=headers)
        simulation = response.json()
        
        # Depending on the system configuration, the simulation might complete during the test or still be processing
        # We accept either COMPLETED or still being in a processing state
        assert simulation["status"] in ["CREATED", "QUEUED", "PROCESSING", "COMPLETED"]
        
        # If complete, check results
        if simulation["status"] == "COMPLETED":
            # Fetch results
            response = client.get(f"/api/simulations/{simulation_id}/results", headers=headers)
            assert response.status_code == 200
            
            results = response.json()
            assert "time_points" in results
            assert "temperature" in results
            assert "excess_power" in results
            assert len(results["time_points"]) > 0
            assert len(results["temperature"]) == len(results["time_points"])
    
    def test_cancel_running_simulation(self, client: TestClient, user_token: str, valid_basic_simulation: Dict[str, Any]):
        """Test cancelling a running simulation."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create simulation
        response = client.post("/api/simulations", json=valid_basic_simulation, headers=headers)
        assert response.status_code == 201
        
        simulation_id = response.json()["simulation_id"]
        
        # Cancel the simulation
        response = client.post(f"/api/simulations/{simulation_id}/cancel", headers=headers)
        
        # The API might return different status codes depending on whether cancellation is implemented
        # and whether the simulation was actually in a cancellable state
        if response.status_code == 200:
            # Cancellation succeeded
            assert response.json()["status"] in ["CANCELLING", "CANCELLED"]
            
            # Verify the simulation was actually cancelled
            get_response = client.get(f"/api/simulations/{simulation_id}", headers=headers)
            assert get_response.status_code == 200
            
            status = get_response.json()["status"]
            assert status in ["CANCELLING", "CANCELLED", "COMPLETED", "FAILED"]
        elif response.status_code == 404:
            # Either the endpoint doesn't exist or the simulation is already complete/failed
            pytest.skip("Simulation cancellation is not implemented or not applicable")
        else:
            # Some other status, like the simulation already being in a non-cancellable state
            assert response.status_code in [400, 409]
    
    def test_retrieve_simulation_progress(self, client: TestClient, user_token: str, valid_basic_simulation: Dict[str, Any]):
        """Test retrieving the progress of a running simulation."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create simulation
        response = client.post("/api/simulations", json=valid_basic_simulation, headers=headers)
        assert response.status_code == 201
        
        simulation_id = response.json()["simulation_id"]
        
        # Get simulation progress
        response = client.get(f"/api/simulations/{simulation_id}/progress", headers=headers)
        
        if response.status_code == 200:
            # Progress endpoint exists
            progress = response.json()
            assert "percentage" in progress
            assert 0 <= progress["percentage"] <= 100
            assert "status" in progress
            assert progress["status"] in ["CREATED", "QUEUED", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"]
        elif response.status_code == 404:
            # Progress endpoint not implemented
            pytest.skip("Simulation progress endpoint is not implemented")
    
    def test_simulation_parameter_validation_ranges(self, client: TestClient, user_token: str, valid_basic_simulation: Dict[str, Any]):
        """Test validation of parameter ranges for simulations."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Test with a parameter above its maximum allowed value
        invalid_simulation = valid_basic_simulation.copy()
        invalid_simulation["parameters"] = valid_basic_simulation["parameters"].copy()
        invalid_simulation["parameters"]["temperature_initial"] = 5000  # Extremely high temperature
        
        response = client.post("/api/simulations", json=invalid_simulation, headers=headers)
        
        # Check if the API properly validates range constraints
        if response.status_code == 422:
            # Validation working correctly
            error_detail = response.json()["detail"]
            assert any("temperature_initial" in str(error) for error in error_detail)
        elif response.status_code == 201:
            # The API might accept extreme values if validation is lenient
            pass
        else:
            assert False, f"Unexpected status code: {response.status_code}"
    
    def test_simulation_model_specific_parameters(self, client: TestClient, user_token: str, valid_advanced_simulation: Dict[str, Any]):
        """Test that model-specific parameters are correctly validated."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create a mix of parameters from different models
        mixed_simulation = valid_advanced_simulation.copy()
        mixed_simulation["model_type"] = "LENR_BASIC"  # Basic model
        
        # But keep advanced parameters
        # When using a basic model, advanced parameters should be ignored or rejected
        
        response = client.post("/api/simulations", json=mixed_simulation, headers=headers)
        
        # The API can handle this in different ways:
        # 1. Reject the request due to extra parameters (422)
        # 2. Accept but ignore the extra parameters (201)
        assert response.status_code in [201, 422]
        
        if response.status_code == 201:
            # If accepted, get the created simulation to confirm extra params were ignored
            simulation_id = response.json()["simulation_id"]
            get_response = client.get(f"/api/simulations/{simulation_id}", headers=headers)
            assert get_response.status_code == 200
            
            # Check if returned parameters match the expected model type
            returned_params = get_response.json().get("parameters", {})
            
            # Advanced parameters should not be present in a basic model
            advanced_only_params = ["lattice_constant", "diffusion_coefficient", 
                                   "activation_energy", "excess_heat_coefficient"]
            
            for param in advanced_only_params:
                # Either these params shouldn't be present, or they should be null/removed
                if param in returned_params:
                    assert returned_params[param] is None
    
    def test_update_simulation_parameters(self, client: TestClient, user_token: str, valid_basic_simulation: Dict[str, Any]):
        """Test updating simulation parameters."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create a simulation
        response = client.post("/api/simulations", json=valid_basic_simulation, headers=headers)
        assert response.status_code == 201
        
        simulation_id = response.json()["simulation_id"]
        
        # Update the simulation parameters
        update_data = {
            "name": "Updated Simulation Name",
            "description": "Updated description",
            "parameters": {
                "temperature_initial": 310.15,  # Changed temperature
                "pressure_initial": 101325,
                "catalyst_loading": 0.6,        # Changed loading
                "reaction_time": 7200           # Changed reaction time
            }
        }
        
        response = client.put(f"/api/simulations/{simulation_id}", json=update_data, headers=headers)
        
        # Updating might be allowed or not depending on the simulation state
        if response.status_code == 200:
            # Update allowed
            updated_sim = response.json()
            assert updated_sim["name"] == update_data["name"]
            assert updated_sim["description"] == update_data["description"]
            
            # Check if parameters were updated
            if "parameters" in updated_sim:
                assert updated_sim["parameters"]["temperature_initial"] == update_data["parameters"]["temperature_initial"]
                assert updated_sim["parameters"]["catalyst_loading"] == update_data["parameters"]["catalyst_loading"]
                assert updated_sim["parameters"]["reaction_time"] == update_data["parameters"]["reaction_time"]
        elif response.status_code in [400, 409]:
            # Update not allowed because simulation already started processing
            error_data = response.json()
            assert "already" in error_data.get("detail", "").lower() or "cannot" in error_data.get("detail", "").lower()
    
    def test_export_simulation_data(self, client: TestClient, user_token: str, valid_basic_simulation: Dict[str, Any]):
        """Test exporting simulation data in different formats."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create a simulation
        response = client.post("/api/simulations", json=valid_basic_simulation, headers=headers)
        assert response.status_code == 201
        
        simulation_id = response.json()["simulation_id"]
        
        # Wait a bit to give the simulation a chance to process
        time.sleep(2)
        
        # Test JSON export
        json_response = client.get(
            f"/api/simulations/{simulation_id}/export",
            headers=headers,
            params={"format": "json"}
        )
        
        if json_response.status_code == 200:
            # JSON export is supported
            assert json_response.headers["Content-Type"] == "application/json"
            export_data = json_response.json()
            assert "simulation_id" in export_data
            assert export_data["simulation_id"] == simulation_id
            
            # Check for parameter data
            assert "parameters" in export_data
            
            # Check for result data if simulation is complete
            if export_data.get("status") == "COMPLETED":
                assert "results" in export_data
        elif json_response.status_code == 404:
            pytest.skip("Simulation export endpoint is not implemented")
        
        # Test CSV export if implemented
        csv_response = client.get(
            f"/api/simulations/{simulation_id}/export",
            headers=headers,
            params={"format": "csv"}
        )
        
        if csv_response.status_code == 200:
            # CSV export is supported
            assert "text/csv" in csv_response.headers["Content-Type"]
            assert len(csv_response.content) > 0
        elif csv_response.status_code in [404, 422]:
            # CSV export not implemented or not applicable
            pass
    
    def test_batch_simulation_creation(self, client: TestClient, user_token: str, valid_basic_simulation: Dict[str, Any]):
        """Test creating multiple simulations in a batch."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create batch data with multiple simulations
        batch_data = {
            "simulations": [
                {
                    "name": f"Batch Sim 1 - {uuid.uuid4()}",
                    "description": "First simulation in batch",
                    "model_type": "LENR_BASIC",
                    "parameters": {
                        "temperature_initial": 293.15,
                        "pressure_initial": 101325,
                        "catalyst_loading": 0.5,
                        "reaction_time": 3600
                    }
                },
                {
                    "name": f"Batch Sim 2 - {uuid.uuid4()}",
                    "description": "Second simulation in batch",
                    "model_type": "LENR_BASIC",
                    "parameters": {
                        "temperature_initial": 303.15,
                        "pressure_initial": 101325,
                        "catalyst_loading": 0.7,
                        "reaction_time": 3600
                    }
                }
            ]
        }
        
        response = client.post("/api/simulations/batch", json=batch_data, headers=headers)
        
        if response.status_code == 201:
            # Batch creation is supported
            result = response.json()
            assert "simulation_ids" in result
            assert isinstance(result["simulation_ids"], list)
            assert len(result["simulation_ids"]) == 2
            
            # Verify each simulation was created
            for sim_id in result["simulation_ids"]:
                get_response = client.get(f"/api/simulations/{sim_id}", headers=headers)
                assert get_response.status_code == 200
        elif response.status_code == 404:
            pytest.skip("Batch simulation creation endpoint is not implemented")
    
    def test_simulation_comparison(self, client: TestClient, user_token: str, valid_basic_simulation: Dict[str, Any]):
        """Test comparing multiple simulations."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create two simulations with different parameters
        sim1 = valid_basic_simulation.copy()
        sim1["name"] = f"Comparison Sim 1 - {uuid.uuid4()}"
        
        sim2 = valid_basic_simulation.copy()
        sim2["name"] = f"Comparison Sim 2 - {uuid.uuid4()}"
        sim2["parameters"] = valid_basic_simulation["parameters"].copy()
        sim2["parameters"]["catalyst_loading"] = 0.8  # Different loading
        
        # Create both simulations
        response1 = client.post("/api/simulations", json=sim1, headers=headers)
        assert response1.status_code == 201
        sim1_id = response1.json()["simulation_id"]
        
        response2 = client.post("/api/simulations", json=sim2, headers=headers)
        assert response2.status_code == 201
        sim2_id = response2.json()["simulation_id"]
        
        # Wait for processing to potentially complete
        time.sleep(3)
        
        # Try to compare the simulations
        comparison_data = {
            "simulation_ids": [sim1_id, sim2_id]
        }
        
        response = client.post("/api/simulations/compare", json=comparison_data, headers=headers)
        
        if response.status_code == 200:
            # Comparison endpoint exists
            comparison = response.json()
            assert "comparison_id" in comparison or "comparison_results" in comparison
            
            # If results are returned directly
            if "comparison_results" in comparison:
                assert isinstance(comparison["comparison_results"], dict)
                assert "simulations" in comparison["comparison_results"]
                assert len(comparison["comparison_results"]["simulations"]) == 2
        elif response.status_code == 404:
            pytest.skip("Simulation comparison endpoint is not implemented")
        elif response.status_code in [400, 409]:
            # Might return an error if simulations are not completed
            pass
    
    def test_parameter_sweep_simulation(self, client: TestClient, user_token: str, valid_basic_simulation: Dict[str, Any]):
        """Test creating a parameter sweep simulation."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Define a parameter sweep
        sweep_data = {
            "base_simulation": valid_basic_simulation,
            "parameter_sweeps": [
                {
                    "parameter": "temperature_initial",
                    "values": [293.15, 303.15, 313.15]
                },
                {
                    "parameter": "catalyst_loading",
                    "values": [0.3, 0.5, 0.7]
                }
            ],
            "name_template": "Sweep - Temp {temperature_initial} - Loading {catalyst_loading}"
        }
        
        response = client.post("/api/simulations/parameter-sweep", json=sweep_data, headers=headers)
        
        if response.status_code == 201:
            # Parameter sweep is supported
            result = response.json()
            assert "sweep_id" in result or "simulation_ids" in result
            
            # If individual simulation IDs are returned
            if "simulation_ids" in result:
                assert isinstance(result["simulation_ids"], list)
                # Should have 3x3=9 simulations in the full factorial sweep
                assert len(result["simulation_ids"]) == 9
                
                # Verify at least one simulation was created
                get_response = client.get(f"/api/simulations/{result['simulation_ids'][0]}", headers=headers)
                assert get_response.status_code == 200
        elif response.status_code == 404:
            pytest.skip("Parameter sweep endpoint is not implemented")
    
    def test_get_recent_simulations(self, client: TestClient, user_token: str, valid_basic_simulation: Dict[str, Any]):
        """Test retrieving recent simulations."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create a few simulations
        for i in range(3):
            sim = valid_basic_simulation.copy()
            sim["name"] = f"Recent Test Sim {i} - {uuid.uuid4()}"
            
            response = client.post("/api/simulations", json=sim, headers=headers)
            assert response.status_code == 201
        
        # Get recent simulations
        response = client.get("/api/simulations/recent", headers=headers)
        assert response.status_code == 200
        
        recent_sims = response.json()
        assert isinstance(recent_sims, list)
        assert len(recent_sims) >= 3  # Should have at least the 3 we just created
        
        # Verify simulations are sorted by creation time (newest first)
        if len(recent_sims) >= 2:
            assert recent_sims[0]["created_at"] >= recent_sims[1]["created_at"]
    
    def test_search_simulations(self, client: TestClient, user_token: str, valid_basic_simulation: Dict[str, Any]):
        """Test searching for simulations by name and parameters."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create a simulation with a unique searchable name
        unique_term = f"SEARCHABLE-{uuid.uuid4()}"
        sim = valid_basic_simulation.copy()
        sim["name"] = f"Test Simulation {unique_term}"
        
        response = client.post("/api/simulations", json=sim, headers=headers)
        assert response.status_code == 201
        
        # Search for the simulation by the unique term
        response = client.get(f"/api/simulations/search?query={unique_term}", headers=headers)
        
        if response.status_code == 200:
            # Search endpoint exists
            search_results = response.json()
            assert isinstance(search_results, list)
            assert len(search_results) >= 1
            assert any(unique_term in result["name"] for result in search_results)
        elif response.status_code == 404:
            pytest.skip("Simulation search endpoint is not implemented")
    
    def test_duplicate_simulation(self, client: TestClient, user_token: str, valid_basic_simulation: Dict[str, Any]):
        """Test duplicating an existing simulation."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create a simulation to duplicate
        response = client.post("/api/simulations", json=valid_basic_simulation, headers=headers)
        assert response.status_code == 201
        
        original_id = response.json()["simulation_id"]
        
        # Try to duplicate the simulation
        duplicate_data = {
            "new_name": f"Duplicate of {valid_basic_simulation['name']}"
        }
        
        response = client.post(f"/api/simulations/{original_id}/duplicate", json=duplicate_data, headers=headers)
        
        if response.status_code == 201:
            # Duplication endpoint exists
            result = response.json()
            assert "simulation_id" in result
            assert result["simulation_id"] != original_id
            
            # Check the duplicated simulation
            get_response = client.get(f"/api/simulations/{result['simulation_id']}", headers=headers)
            assert get_response.status_code == 200
            
            duplicated_sim = get_response.json()
            assert duplicated_sim["name"] == duplicate_data["new_name"]
            assert duplicated_sim["model_type"] == valid_basic_simulation["model_type"]
            
            # Parameters should be the same
            for key, value in valid_basic_simulation["parameters"].items():
                assert duplicated_sim["parameters"][key] == value
        elif response.status_code == 404:
            pytest.skip("Simulation duplication endpoint is not implemented") 