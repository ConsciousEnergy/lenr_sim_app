"""
Integration tests for the data export API endpoints.

These tests verify that the data export functionality correctly handles
exporting simulation results and visualizations in different formats.
"""

import pytest
import json
import time
import io
import zipfile
import csv
import pandas as pd
from fastapi.testclient import TestClient
from typing import Dict, Any, List, Optional

# Mark the entire module as integration tests
pytestmark = pytest.mark.integration


@pytest.fixture
def completed_simulation(client: TestClient) -> str:
    """Set up a completed simulation and return its ID for testing exports."""
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
def saved_simulation(client: TestClient, completed_simulation: str) -> str:
    """Save a simulation result and return its ID."""
    # Save the simulation to disk
    save_response = client.post(f"/api/results/simulations/{completed_simulation}/save")
    assert save_response.status_code == 200
    return completed_simulation


@pytest.fixture
def visualization_plot(client: TestClient, completed_simulation: str) -> str:
    """Generate a visualization plot and return its ID."""
    plot_request = {
        "simulation_id": completed_simulation,
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
    
    response = client.post("/api/visualization/plot", json=plot_request)
    if response.status_code != 200:
        # Try with the result-visualization endpoint if the first one failed
        response = client.post("/api/result-visualization/plot", json=plot_request)
    
    assert response.status_code == 200
    return response.json()["plot_id"]


class TestDataExport:
    """Tests for data export functionality."""

    def test_export_simulation_json(self, client: TestClient, saved_simulation: str):
        """Test exporting a simulation in JSON format."""
        response = client.get(
            f"/api/results/simulations/{saved_simulation}/export",
            params={"format": "json"}
        )
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/json"
        
        # Verify the content
        data = json.loads(response.content)
        assert isinstance(data, dict)
        assert "metadata" in data
        assert data["metadata"]["simulation_id"] == saved_simulation

    def test_export_simulation_csv(self, client: TestClient, saved_simulation: str):
        """Test exporting a simulation in CSV format."""
        response = client.get(
            f"/api/results/simulations/{saved_simulation}/export",
            params={"format": "csv"}
        )
        # Accept either success or not implemented
        if response.status_code == 501:
            pytest.skip("CSV export not implemented")
            
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/csv")
        
        # Verify the content is valid CSV
        content = response.content.decode("utf-8")
        reader = csv.reader(io.StringIO(content))
        rows = list(reader)
        
        # Check header and data rows
        assert len(rows) > 1  # At least header and one data row
        assert "time" in rows[0]  # Header should contain "time"
        assert len(rows[1]) > 0  # Data row should have values

    def test_export_simulation_excel(self, client: TestClient, saved_simulation: str):
        """Test exporting a simulation in Excel format."""
        response = client.get(
            f"/api/results/simulations/{saved_simulation}/export",
            params={"format": "excel"}
        )
        # Accept either success or not implemented
        if response.status_code == 501:
            pytest.skip("Excel export not implemented")
            
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        
        # Verify the content is a valid Excel file
        try:
            df = pd.read_excel(io.BytesIO(response.content))
            assert not df.empty
            assert "time" in df.columns
        except Exception as e:
            pytest.fail(f"Failed to read Excel file: {e}")

    def test_export_visualization_png(self, client: TestClient, visualization_plot: str):
        """Test exporting a visualization as PNG."""
        response = client.get(
            f"/api/visualization/plot/{visualization_plot}/export",
            params={"format": "png"}
        )
        # Accept either success or not implemented
        if response.status_code == 501:
            # Try alternative endpoint
            response = client.get(
                f"/api/result-visualization/plot/{visualization_plot}/export",
                params={"format": "png"}
            )
            if response.status_code == 501:
                pytest.skip("PNG export not implemented")
                
        assert response.status_code == 200
        assert response.headers["content-type"] == "image/png"
        
        # Verify it's a valid PNG
        assert response.content[:8] == b'\x89PNG\r\n\x1a\n'

    def test_export_visualization_svg(self, client: TestClient, visualization_plot: str):
        """Test exporting a visualization as SVG."""
        response = client.get(
            f"/api/visualization/plot/{visualization_plot}/export",
            params={"format": "svg"}
        )
        # Accept either success or not implemented
        if response.status_code == 501:
            # Try alternative endpoint
            response = client.get(
                f"/api/result-visualization/plot/{visualization_plot}/export",
                params={"format": "svg"}
            )
            if response.status_code == 501:
                pytest.skip("SVG export not implemented")
                
        assert response.status_code == 200
        assert response.headers["content-type"] == "image/svg+xml"
        
        # Verify it's valid SVG
        content = response.content.decode("utf-8")
        assert content.startswith("<?xml") or content.startswith("<svg")

    def test_export_visualization_data(self, client: TestClient, visualization_plot: str):
        """Test exporting visualization data as JSON."""
        response = client.get(
            f"/api/visualization/plot/{visualization_plot}/data",
            params={"format": "json"}
        )
        # Accept either success or not implemented
        if response.status_code == 501:
            # Try alternative endpoint
            response = client.get(
                f"/api/result-visualization/plot/{visualization_plot}/data",
                params={"format": "json"}
            )
            if response.status_code == 501:
                pytest.skip("Data export not implemented")
                
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/json"
        
        # Verify the content
        data = json.loads(response.content)
        assert isinstance(data, dict)
        
        # Check for expected data fields
        if "times" in data and "values" in data:
            assert len(data["times"]) > 0
            assert len(data["values"]) > 0
            assert len(data["times"]) == len(data["values"])
        elif "data" in data:
            assert isinstance(data["data"], list) or isinstance(data["data"], dict)

    def test_export_simulation_zip(self, client: TestClient, saved_simulation: str):
        """Test exporting a simulation as a ZIP bundle with data and metadata."""
        response = client.get(
            f"/api/results/simulations/{saved_simulation}/export",
            params={"format": "zip"}
        )
        # Accept either success or not implemented
        if response.status_code == 501:
            pytest.skip("ZIP export not implemented")
            
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/zip"
        
        # Verify the content is a valid ZIP file
        try:
            with zipfile.ZipFile(io.BytesIO(response.content)) as zip_file:
                # Check for expected files in the ZIP
                file_list = zip_file.namelist()
                assert any(file.endswith(".json") for file in file_list)
                
                # Check at least one of the files contains the simulation data
                for file in file_list:
                    if file.endswith(".json"):
                        with zip_file.open(file) as json_file:
                            data = json.load(json_file)
                            if "metadata" in data and data["metadata"].get("simulation_id") == saved_simulation:
                                break
                else:
                    pytest.fail("No file in ZIP contains the simulation data")
        except Exception as e:
            pytest.fail(f"Failed to read ZIP file: {e}")

    def test_export_data_selection(self, client: TestClient, saved_simulation: str):
        """Test exporting a selection of data fields."""
        # First get available fields
        results_response = client.get(f"/api/results/simulations/{saved_simulation}/results")
        assert results_response.status_code == 200
        
        results = results_response.json()
        
        # Select a subset of fields
        fields = ["time"]
        for key in results.keys():
            if key not in ["metadata", "time", "analysis_results"] and len(fields) < 3:
                fields.append(key)
        
        # Export with field selection
        response = client.post(
            f"/api/results/simulations/{saved_simulation}/export-selection",
            json={"fields": fields, "format": "json"}
        )
        # Accept either success or not implemented
        if response.status_code == 404:
            # Try alternative endpoint
            response = client.post(
                f"/api/results/export-selection",
                json={"simulation_id": saved_simulation, "fields": fields, "format": "json"}
            )
            if response.status_code in [404, 501]:
                pytest.skip("Export selection not implemented")
                
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/json"
        
        # Verify the content
        data = json.loads(response.content)
        assert isinstance(data, dict)
        
        # Check only requested fields are included
        for field in fields:
            assert field in data
        
        # Check other fields are not included
        for key in results.keys():
            if key not in fields and key not in ["metadata"]:
                assert key not in data

    def test_export_with_time_range(self, client: TestClient, saved_simulation: str):
        """Test exporting data with a specific time range."""
        # First get all results to find time range
        full_response = client.get(f"/api/results/simulations/{saved_simulation}/results")
        assert full_response.status_code == 200
        
        full_results = full_response.json()
        all_times = full_results.get("time", [])
        
        if len(all_times) >= 2:
            # Choose a subset of the time range
            min_time = all_times[0]
            max_time = all_times[-1]
            mid_time = (min_time + max_time) / 2
            
            # Export with time range
            response = client.get(
                f"/api/results/simulations/{saved_simulation}/export",
                params={"format": "json", "time_range": f"{min_time},{mid_time}"}
            )
            assert response.status_code == 200
            
            data = json.loads(response.content)
            times = data.get("time", [])
            
            # Verify times are within range
            assert all(min_time <= t <= mid_time for t in times)
            
            # Verify we have fewer time points
            assert len(times) < len(all_times)

    def test_export_multiple_simulations(self, client: TestClient, saved_simulation: str):
        """Test exporting data from multiple simulations for comparison."""
        # Create a second simulation (simplified for test purposes)
        sim_request = {
            "domain_size": [0.005, 0.005, 0.005],
            "resolution": [5, 5, 5],
            "simulation_time": 0.001,
            "time_step": 1.0e-4,
            "reactions": ["d-d"],
            "mechanisms": ["electron_screening"],
            "initial_temperature": 350.0,  # Different temperature
            "species_densities": {"d": 1.0e28},
            "thermal_conductivity": 10.0,
            "heat_capacity": 500.0,
            "material_density": 1000.0
        }
        
        sim_response = client.post("/api/multi-physics/simulations", json=sim_request)
        assert sim_response.status_code == 200
        
        second_sim_id = sim_response.json()["simulation_id"]
        
        # Wait for second simulation to complete
        start_time = time.time()
        max_wait = 30  # seconds
        
        while time.time() - start_time < max_wait:
            status_response = client.get(f"/api/multi-physics/simulations/{second_sim_id}/status")
            assert status_response.status_code == 200
            
            if status_response.json()["status"] in ["completed", "failed"]:
                break
                
            time.sleep(2)
        
        # Save second simulation
        save_response = client.post(f"/api/results/simulations/{second_sim_id}/save")
        if save_response.status_code != 200:
            pytest.skip("Could not save second simulation")
        
        # Export multiple simulations
        response = client.post(
            "/api/results/export-comparison",
            json={
                "simulation_ids": [saved_simulation, second_sim_id],
                "data_field": "temperature",
                "position": [0.5, 0.5, 0.5],
                "format": "json"
            }
        )
        # Accept either success or not implemented
        if response.status_code in [404, 501]:
            pytest.skip("Comparison export not implemented")
            
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/json"
        
        # Verify the content
        data = json.loads(response.content)
        assert isinstance(data, dict)
        
        # Check for expected structure in comparison data
        assert saved_simulation in data
        assert second_sim_id in data
        
        # Verify both simulations have data
        assert "time" in data[saved_simulation]
        assert "values" in data[saved_simulation]
        assert "time" in data[second_sim_id]
        assert "values" in data[second_sim_id] 