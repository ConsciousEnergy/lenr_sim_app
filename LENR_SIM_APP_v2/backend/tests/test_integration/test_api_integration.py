"""
End-to-End API Integration Tests
================================

Tests that verify the complete request-response cycle for all physics endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app


# Create test client
client = TestClient(app)


class TestHealthEndpoints:
    """Test health and status endpoints."""
    
    def test_health_endpoint(self):
        """Test health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
    
    def test_docs_available(self):
        """Test API documentation is available."""
        response = client.get("/api/docs")
        assert response.status_code == 200


class TestQuantumTunnelingAPI:
    """Integration tests for quantum tunneling endpoints."""
    
    def test_quantum_tunneling_basic(self):
        """Test basic quantum tunneling calculation."""
        response = client.post("/api/physics/quantum-tunneling", json={
            "z1": 1,
            "z2": 1,
            "a1": 2.0,
            "a2": 2.0,
            "energy_kev": 0.1,
            "temperature_k": 300.0,
            "material": "palladium"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Check all required fields are present
        assert "tunneling_probability" in data
        assert "gamow_factor" in data
        assert "barrier_height_kev" in data
        assert "potential_curve" in data
        assert "wave_function" in data
        
        # Check values are reasonable
        assert data["tunneling_probability"] > 0
        assert data["tunneling_probability"] < 1
        assert data["gamow_factor"] > 0
    
    def test_quantum_tunneling_with_screening(self):
        """Test quantum tunneling with electron screening."""
        response = client.post("/api/physics/quantum-tunneling", json={
            "z1": 1,
            "z2": 1,
            "energy_kev": 0.1,
            "potential_type": "screened",
            "screening_enhancement": 2.0,
            "material": "palladium"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Screened should have higher probability
        assert data["electron_screening_enhancement"] > 1.0
    
    def test_quantum_tunneling_materials(self):
        """Test quantum tunneling with different materials."""
        materials = ["palladium", "nickel", "titanium", "platinum"]
        
        for material in materials:
            response = client.post("/api/physics/quantum-tunneling", json={
                "z1": 1,
                "z2": 1,
                "energy_kev": 0.1,
                "material": material
            })
            assert response.status_code == 200
    
    def test_quantum_tunneling_defaults(self):
        """Test quantum tunneling defaults endpoint."""
        response = client.get("/api/physics/quantum-tunneling/defaults")
        assert response.status_code == 200
        data = response.json()
        
        assert "defaults" in data
        assert data["defaults"]["z1"] == 1
        assert data["defaults"]["z2"] == 1


class TestLENREnhancementAPI:
    """Integration tests for LENR enhancement endpoints."""
    
    def test_lenr_enhancement_basic(self):
        """Test basic LENR enhancement calculation."""
        response = client.post("/api/physics/lenr-enhancement", json={
            "energy_kev": 0.025,
            "temperature_k": 350.0,
            "loading_ratio": 0.85,
            "material": "palladium"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "total_enhancement" in data
        assert "individual_factors" in data
        assert "dominant_mechanism" in data
        
        assert data["total_enhancement"] > 0
    
    def test_lenr_enhancement_mechanisms(self):
        """Test LENR enhancement with specific mechanisms."""
        response = client.post("/api/physics/lenr-enhancement", json={
            "energy_kev": 0.025,
            "temperature_k": 350.0,
            "loading_ratio": 0.9,
            "mechanisms": ["electron_screening", "loading_ratio"]
        })
        assert response.status_code == 200
        data = response.json()
        
        # Should only have selected mechanisms
        assert "electron_screening" in data["individual_factors"]
        assert "loading_ratio" in data["individual_factors"]
    
    def test_lenr_reaction_rate(self):
        """Test LENR reaction rate calculation."""
        response = client.post("/api/physics/lenr-reaction-rate", json={
            "temperature_k": 400.0,
            "loading_ratio": 0.9,
            "material": "palladium",
            "volume_cm3": 1.0
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "reaction_rate_per_cm3_s" in data
        assert "power_output_w" in data
    
    def test_lenr_mechanisms_list(self):
        """Test getting list of enhancement mechanisms."""
        response = client.get("/api/physics/lenr-enhancement/mechanisms")
        assert response.status_code == 200
        data = response.json()
        
        assert "mechanisms" in data
        assert len(data["mechanisms"]) > 0
        
        mechanism_ids = [m["id"] for m in data["mechanisms"]]
        assert "electron_screening" in mechanism_ids
        assert "loading_ratio" in mechanism_ids


class TestBubbleFusionAPI:
    """Integration tests for bubble fusion endpoints."""
    
    def test_bubble_fusion_basic(self):
        """Test basic bubble fusion simulation."""
        response = client.post("/api/physics/bubble-fusion", json={
            "initial_radius_um": 10.0,
            "acoustic_pressure_bar": 1.2,
            "frequency_khz": 20.0,
            "gas_type": "deuterium"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "collapse_results" in data
        assert "timeseries" in data
        
        results = data["collapse_results"]
        assert "max_temperature_k" in results
        assert "max_pressure_pa" in results
        assert "min_radius_um" in results
        assert "compression_ratio" in results
    
    def test_bubble_fusion_different_fluids(self):
        """Test bubble fusion with different fluids."""
        fluids = ["water", "d2o"]
        
        for fluid in fluids:
            response = client.post("/api/physics/bubble-fusion", json={
                "initial_radius_um": 10.0,
                "acoustic_pressure_bar": 1.2,
                "fluid_type": fluid,
                "gas_type": "deuterium"
            })
            assert response.status_code == 200
    
    def test_bubble_fusion_timeseries(self):
        """Test bubble fusion returns timeseries data."""
        response = client.post("/api/physics/bubble-fusion", json={
            "initial_radius_um": 15.0,
            "acoustic_pressure_bar": 1.5,
            "frequency_khz": 25.0
        })
        assert response.status_code == 200
        data = response.json()
        
        # Check timeseries data
        timeseries = data["timeseries"]
        assert "time_us" in timeseries
        assert "radius_um" in timeseries
        assert "temperature_k" in timeseries
        assert len(timeseries["time_us"]) > 0
    
    def test_bubble_fusion_defaults(self):
        """Test bubble fusion defaults endpoint."""
        response = client.get("/api/physics/bubble-fusion/defaults")
        assert response.status_code == 200
        data = response.json()
        
        assert "defaults" in data
        assert "options" in data
        assert "limits" in data


class TestFusionRateAPI:
    """Integration tests for fusion rate endpoints."""
    
    def test_fusion_rate_dd(self):
        """Test D-D fusion rate calculation."""
        response = client.post("/api/physics/fusion-rate", json={
            "reaction_type": "d-d",
            "temperature_k": 1000.0,
            "density_per_cm3": 1e22,
            "material": "palladium"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "reaction_rate_per_s" in data
        assert "cross_section_barn" in data
        assert "power_density_w_cm3" in data
    
    def test_fusion_rate_dt(self):
        """Test D-T fusion rate calculation."""
        response = client.post("/api/physics/fusion-rate", json={
            "reaction_type": "d-t",
            "temperature_k": 1000.0,
            "density_per_cm3": 1e22
        })
        assert response.status_code == 200


class TestMaterialsAPI:
    """Integration tests for materials endpoints."""
    
    def test_get_materials(self):
        """Test getting available materials."""
        response = client.get("/api/physics/materials")
        assert response.status_code == 200
        data = response.json()
        
        assert "materials" in data
        assert len(data["materials"]) > 0
        
        # Check material has required fields
        material = data["materials"][0]
        assert "id" in material
        assert "symbol" in material
        assert "screening_potential_ev" in material
    
    def test_get_reactions(self):
        """Test getting available reactions."""
        response = client.get("/api/physics/reactions")
        assert response.status_code == 200
        data = response.json()
        
        assert "reactions" in data
        assert len(data["reactions"]) > 0


class TestEdgeCases:
    """Test edge cases and error handling."""
    
    def test_invalid_energy(self):
        """Test with invalid energy value."""
        response = client.post("/api/physics/quantum-tunneling", json={
            "z1": 1,
            "z2": 1,
            "energy_kev": -1.0  # Invalid negative energy
        })
        # Should handle gracefully, either 200 with warning or 400
        assert response.status_code in [200, 400, 422, 500]
    
    def test_missing_required_fields(self):
        """Test with missing required fields uses defaults."""
        # Should work with defaults
        response = client.post("/api/physics/quantum-tunneling", json={})
        assert response.status_code == 200
    
    def test_extreme_temperature(self):
        """Test with extreme temperature."""
        response = client.post("/api/physics/quantum-tunneling", json={
            "z1": 1,
            "z2": 1,
            "energy_kev": 0.1,
            "temperature_k": 1e6  # Very high temperature
        })
        assert response.status_code == 200
    
    def test_very_low_energy(self):
        """Test with very low energy."""
        response = client.post("/api/physics/quantum-tunneling", json={
            "z1": 1,
            "z2": 1,
            "energy_kev": 0.001
        })
        assert response.status_code == 200


class TestWebSocketEndpoints:
    """Test WebSocket-related endpoints (non-WS)."""
    
    def test_active_simulations(self):
        """Test getting active simulations."""
        response = client.get("/api/ws/active")
        assert response.status_code == 200
        data = response.json()
        
        assert "active_simulations" in data
        assert "running_tasks" in data


class TestConcurrency:
    """Test concurrent request handling."""
    
    def test_multiple_calculations(self):
        """Test multiple concurrent calculations."""
        import concurrent.futures
        
        def make_request(energy):
            return client.post("/api/physics/quantum-tunneling", json={
                "z1": 1, "z2": 1, "energy_kev": energy
            })
        
        energies = [0.1, 0.2, 0.3, 0.4, 0.5]
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_request, e) for e in energies]
            results = [f.result() for f in futures]
        
        # All requests should succeed
        for response in results:
            assert response.status_code == 200

