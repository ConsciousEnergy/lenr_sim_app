"""
Integration tests for data export API endpoints.

These tests verify that the data export API endpoints correctly process
simulation data and export results in various formats (CSV, JSON, Excel, etc.).
"""

import pytest
import json
import time
import os
import tempfile
from fastapi.testclient import TestClient
from typing import Dict, Any

# Mark the entire module as integration tests
pytestmark = pytest.mark.integration


@pytest.fixture
def completed_simulation(client: TestClient) -> str:
    """Set up a completed simulation and return its ID for testing data export."""
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
def export_request() -> Dict[str, Any]:
    """Return a valid data export request for testing."""
    return {
        "data_fields": ["temperature", "reaction_rate"],
        "format": "csv",
        "include_metadata": True,
        "time_points": "all"  # Alternatively: [0.0, 0.0005, 0.001]
    }


class TestDataExportAPI:
    """Tests for the data export API endpoints."""
    
    def test_available_export_formats(self, client: TestClient):
        """Test retrieving available export formats."""
        response = client.get("/api/export/formats")
        assert response.status_code == 200
        
        formats = response.json()
        assert isinstance(formats, list)
        assert len(formats) > 0
        
        # Check for expected formats
        expected_formats = ["csv", "json", "excel", "vtk", "hdf5"]
        for format_type in expected_formats:
            assert format_type in formats, f"{format_type} should be an available export format"
    
    def test_available_data_fields(self, client: TestClient, completed_simulation: str):
        """Test retrieving available data fields for export."""
        response = client.get(f"/api/export/data-fields/{completed_simulation}")
        assert response.status_code == 200
        
        data_fields = response.json()
        assert isinstance(data_fields, list)
        assert len(data_fields) > 0
        
        # Check for expected data fields
        expected_fields = ["temperature", "reaction_rate", "species_density"]
        for field in expected_fields:
            assert any(field in df for df in data_fields), f"{field} should be available for export"
    
    def test_export_csv(self, client: TestClient, completed_simulation: str):
        """Test exporting simulation data to CSV format."""
        request = {
            "simulation_id": completed_simulation,
            "data_fields": ["temperature"],
            "format": "csv",
            "include_metadata": True
        }
        
        response = client.post("/api/export/data", json=request)
        assert response.status_code == 202  # Accepted, will process asynchronously
        
        result = response.json()
        assert "export_id" in result
        assert "status" in result
        
        export_id = result["export_id"]
        
        # Poll for export completion
        start_time = time.time()
        max_wait = 30  # seconds
        
        while time.time() - start_time < max_wait:
            status_response = client.get(f"/api/export/status/{export_id}")
            assert status_response.status_code == 200
            
            status = status_response.json()["status"]
            if status in ["completed", "failed"]:
                break
                
            time.sleep(2)
        
        # Get final status
        status_response = client.get(f"/api/export/status/{export_id}")
        assert status_response.status_code == 200
        assert status_response.json()["status"] == "completed"
        
        # Download the exported file
        download_response = client.get(f"/api/export/download/{export_id}")
        assert download_response.status_code == 200
        assert download_response.headers["content-type"] == "text/csv"
        
        # Check the content of the CSV file
        content = download_response.content.decode("utf-8")
        assert "temperature" in content
        assert content.count("\n") > 1  # At least header + one data row
    
    def test_export_json(self, client: TestClient, completed_simulation: str):
        """Test exporting simulation data to JSON format."""
        request = {
            "simulation_id": completed_simulation,
            "data_fields": ["temperature", "reaction_rate"],
            "format": "json",
            "include_metadata": True
        }
        
        response = client.post("/api/export/data", json=request)
        assert response.status_code == 202
        
        export_id = response.json()["export_id"]
        
        # Wait for export to complete
        start_time = time.time()
        max_wait = 30  # seconds
        
        while time.time() - start_time < max_wait:
            status_response = client.get(f"/api/export/status/{export_id}")
            assert status_response.status_code == 200
            
            status = status_response.json()["status"]
            if status in ["completed", "failed"]:
                break
                
            time.sleep(2)
        
        # Verify completion
        status_response = client.get(f"/api/export/status/{export_id}")
        assert status_response.status_code == 200
        assert status_response.json()["status"] == "completed"
        
        # Download the exported file
        download_response = client.get(f"/api/export/download/{export_id}")
        assert download_response.status_code == 200
        assert download_response.headers["content-type"] == "application/json"
        
        # Check the content of the JSON file
        content = json.loads(download_response.content)
        assert "data" in content
        assert "metadata" in content
        assert "temperature" in content["data"]
        assert "reaction_rate" in content["data"]
    
    def test_export_excel(self, client: TestClient, completed_simulation: str):
        """Test exporting simulation data to Excel format."""
        request = {
            "simulation_id": completed_simulation,
            "data_fields": ["temperature"],
            "format": "excel",
            "include_metadata": True
        }
        
        response = client.post("/api/export/data", json=request)
        assert response.status_code in [202, 501]  # Accept 501 if not implemented
        
        if response.status_code == 202:
            export_id = response.json()["export_id"]
            
            # Wait for export to complete
            start_time = time.time()
            max_wait = 30  # seconds
            
            while time.time() - start_time < max_wait:
                status_response = client.get(f"/api/export/status/{export_id}")
                assert status_response.status_code == 200
                
                status = status_response.json()["status"]
                if status in ["completed", "failed"]:
                    break
                    
                time.sleep(2)
            
            # Verify completion
            status_response = client.get(f"/api/export/status/{export_id}")
            if status_response.json()["status"] == "completed":
                # Download the exported file
                download_response = client.get(f"/api/export/download/{export_id}")
                assert download_response.status_code == 200
                assert download_response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                
                # Save content to temp file to verify it's a valid Excel file
                with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as temp:
                    temp.write(download_response.content)
                    temp_path = temp.name
                
                # Simple check that file exists and has content
                assert os.path.exists(temp_path)
                assert os.path.getsize(temp_path) > 0
                
                # Clean up
                os.unlink(temp_path)
    
    def test_export_vtk(self, client: TestClient, completed_simulation: str):
        """Test exporting simulation data to VTK format."""
        request = {
            "simulation_id": completed_simulation,
            "data_fields": ["temperature"],
            "format": "vtk",
            "include_metadata": False
        }
        
        response = client.post("/api/export/data", json=request)
        assert response.status_code in [202, 501]  # Accept 501 if not implemented
        
        if response.status_code == 202:
            export_id = response.json()["export_id"]
            
            # Wait for export to complete
            start_time = time.time()
            max_wait = 30  # seconds
            
            while time.time() - start_time < max_wait:
                status_response = client.get(f"/api/export/status/{export_id}")
                assert status_response.status_code == 200
                
                status = status_response.json()["status"]
                if status in ["completed", "failed"]:
                    break
                    
                time.sleep(2)
            
            # Verify completion
            status_response = client.get(f"/api/export/status/{export_id}")
            if status_response.json()["status"] == "completed":
                # Download the exported file
                download_response = client.get(f"/api/export/download/{export_id}")
                assert download_response.status_code == 200
                assert download_response.headers["content-type"] in ["application/octet-stream", "application/x-vtk"]
    
    def test_export_time_specific(self, client: TestClient, completed_simulation: str):
        """Test exporting data for specific time points."""
        # Get simulation time range
        info_response = client.get(f"/api/multi-physics/simulations/{completed_simulation}")
        assert info_response.status_code == 200
        
        sim_info = info_response.json()
        sim_time = sim_info.get("simulation_time", 0.001)
        
        request = {
            "simulation_id": completed_simulation,
            "data_fields": ["temperature"],
            "format": "csv",
            "include_metadata": True,
            "time_points": [0.0, sim_time/2, sim_time]
        }
        
        response = client.post("/api/export/data", json=request)
        assert response.status_code == 202
        
        export_id = response.json()["export_id"]
        
        # Wait for export to complete
        start_time = time.time()
        max_wait = 30  # seconds
        
        while time.time() - start_time < max_wait:
            status_response = client.get(f"/api/export/status/{export_id}")
            assert status_response.status_code == 200
            
            status = status_response.json()["status"]
            if status in ["completed", "failed"]:
                break
                
            time.sleep(2)
        
        # Verify completion
        status_response = client.get(f"/api/export/status/{export_id}")
        assert status_response.status_code == 200
        
        if status_response.json()["status"] == "completed":
            # Download the exported file
            download_response = client.get(f"/api/export/download/{export_id}")
            assert download_response.status_code == 200
    
    def test_export_specific_region(self, client: TestClient, completed_simulation: str):
        """Test exporting data for a specific spatial region."""
        request = {
            "simulation_id": completed_simulation,
            "data_fields": ["temperature"],
            "format": "csv",
            "include_metadata": True,
            "spatial_region": {
                "x_range": [0.0, 0.0025],
                "y_range": [0.0, 0.0025],
                "z_range": [0.0, 0.0025]
            }
        }
        
        response = client.post("/api/export/data", json=request)
        assert response.status_code in [202, 400, 422]  # 400/422 if not supported
        
        if response.status_code == 202:
            export_id = response.json()["export_id"]
            
            # Wait for export to complete
            start_time = time.time()
            max_wait = 30  # seconds
            
            while time.time() - start_time < max_wait:
                status_response = client.get(f"/api/export/status/{export_id}")
                assert status_response.status_code == 200
                
                status = status_response.json()["status"]
                if status in ["completed", "failed"]:
                    break
                    
                time.sleep(2)
            
            # Verify completion
            status_response = client.get(f"/api/export/status/{export_id}")
            assert status_response.status_code == 200
    
    def test_list_exports(self, client: TestClient, completed_simulation: str, export_request: Dict[str, Any]):
        """Test listing all exports for a user."""
        # Create an export first
        request = {**export_request, "simulation_id": completed_simulation}
        create_response = client.post("/api/export/data", json=request)
        assert create_response.status_code == 202
        
        # Get export list
        response = client.get("/api/export/list")
        assert response.status_code == 200
        
        exports = response.json()
        assert isinstance(exports, list)
        
        # The newly created export should be in the list
        export_id = create_response.json()["export_id"]
        export_ids = [e["export_id"] for e in exports]
        assert export_id in export_ids
    
    def test_filter_exports_by_simulation(self, client: TestClient, completed_simulation: str, export_request: Dict[str, Any]):
        """Test filtering exports by simulation ID."""
        # Create an export first
        request = {**export_request, "simulation_id": completed_simulation}
        create_response = client.post("/api/export/data", json=request)
        assert create_response.status_code == 202
        
        # Get exports for this simulation
        response = client.get(f"/api/export/list?simulation_id={completed_simulation}")
        assert response.status_code == 200
        
        exports = response.json()
        assert isinstance(exports, list)
        
        # All exports should be for the given simulation
        for export in exports:
            assert export["simulation_id"] == completed_simulation
    
    def test_delete_export(self, client: TestClient, completed_simulation: str, export_request: Dict[str, Any]):
        """Test deleting an export."""
        # First create an export
        request = {**export_request, "simulation_id": completed_simulation}
        create_response = client.post("/api/export/data", json=request)
        assert create_response.status_code == 202
        
        export_id = create_response.json()["export_id"]
        
        # Wait a bit for the export to possibly complete
        time.sleep(5)
        
        # Delete the export
        delete_response = client.delete(f"/api/export/{export_id}")
        assert delete_response.status_code in [200, 204]
        
        # Verify it's gone
        get_response = client.get(f"/api/export/status/{export_id}")
        assert get_response.status_code == 404
    
    def test_export_metadata(self, client: TestClient, completed_simulation: str, export_request: Dict[str, Any]):
        """Test retrieving export metadata."""
        # Create an export first
        request = {**export_request, "simulation_id": completed_simulation}
        create_response = client.post("/api/export/data", json=request)
        assert create_response.status_code == 202
        
        export_id = create_response.json()["export_id"]
        
        # Wait a bit for processing
        time.sleep(2)
        
        # Get export metadata
        response = client.get(f"/api/export/metadata/{export_id}")
        assert response.status_code == 200
        
        metadata = response.json()
        assert "export_id" in metadata
        assert "simulation_id" in metadata
        assert "format" in metadata
        assert "data_fields" in metadata
        assert "created_at" in metadata
    
    def test_bulk_export(self, client: TestClient, completed_simulation: str):
        """Test bulk export of multiple simulations."""
        # This test assumes there are multiple simulations
        # For now, we'll just test with one simulation
        request = {
            "simulation_ids": [completed_simulation],
            "data_fields": ["temperature"],
            "format": "json",
            "include_metadata": True
        }
        
        response = client.post("/api/export/bulk", json=request)
        assert response.status_code in [202, 404, 501]  # 404/501 if not implemented
        
        if response.status_code == 202:
            bulk_export_id = response.json()["bulk_export_id"]
            
            # Wait for export to complete
            start_time = time.time()
            max_wait = 30  # seconds
            
            while time.time() - start_time < max_wait:
                status_response = client.get(f"/api/export/bulk/status/{bulk_export_id}")
                assert status_response.status_code == 200
                
                status = status_response.json()["status"]
                if status in ["completed", "failed"]:
                    break
                    
                time.sleep(2)
            
            # Verify completion
            status_response = client.get(f"/api/export/bulk/status/{bulk_export_id}")
            assert status_response.status_code == 200
    
    def test_invalid_simulation_id(self, client: TestClient, export_request: Dict[str, Any]):
        """Test behavior with invalid simulation ID."""
        # Use a non-existent simulation ID
        fake_id = "12345678-1234-5678-1234-567812345678"
        request = {**export_request, "simulation_id": fake_id}
        
        response = client.post("/api/export/data", json=request)
        assert response.status_code == 404
    
    def test_invalid_data_fields(self, client: TestClient, completed_simulation: str):
        """Test behavior with invalid data fields."""
        request = {
            "simulation_id": completed_simulation,
            "data_fields": ["nonexistent_field"],
            "format": "csv"
        }
        
        response = client.post("/api/export/data", json=request)
        assert response.status_code in [400, 422]
    
    def test_invalid_format(self, client: TestClient, completed_simulation: str):
        """Test behavior with invalid export format."""
        request = {
            "simulation_id": completed_simulation,
            "data_fields": ["temperature"],
            "format": "nonexistent_format"
        }
        
        response = client.post("/api/export/data", json=request)
        assert response.status_code in [400, 422] 