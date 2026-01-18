"""
End-to-End API Integration Tests for LENR Simulation App

Tests the full integration between:
- Frontend parameter structure → Backend API
- Backend physics calculations → API response
- API response structure → Frontend visualization

Run with: pytest app/tests/test_api_integration.py -v --no-cov
"""

import pytest
import json
from fastapi.testclient import TestClient


class TestUnifiedSimulationAPI:
    """Test unified simulation API endpoints."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test client."""
        from app.main import app
        self.client = TestClient(app)
    
    def test_presets_endpoint(self):
        """Test /api/unified/presets returns valid preset configurations."""
        response = self.client.get("/api/unified/presets")
        assert response.status_code == 200
        
        data = response.json()
        assert "presets" in data
        assert len(data["presets"]) >= 3
        
        # Verify preset structure
        for preset in data["presets"]:
            assert "id" in preset
            assert "name" in preset
            assert "config" in preset
    
    def test_simulate_endpoint_with_defaults(self):
        """Test /api/unified/simulate with default parameters."""
        response = self.client.post(
            "/api/unified/simulate",
            json={}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "enhancement" in data
        assert "observables" in data
        assert "thresholds" in data
        assert "time_series" in data
        assert "confidence" in data
        assert "computation_time" in data
    
    def test_simulate_endpoint_with_pd_d(self):
        """Test simulation with Palladium-Deuterium configuration."""
        response = self.client.post(
            "/api/unified/simulate",
            json={
                "material": {"host_material": "palladium", "reactant": "deuterium"},
                "environmental": {"temperature": 300.0, "pressure": 101325.0},
                "lattice": {"loading_ratio": 0.9}
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert float(data["enhancement"]["total"]) >= 1.0
    
    def test_simulate_endpoint_with_ni_h(self):
        """Test simulation with Nickel-Hydrogen configuration."""
        response = self.client.post(
            "/api/unified/simulate",
            json={
                "material": {"host_material": "nickel", "reactant": "hydrogen"},
                "environmental": {"temperature": 500.0, "pressure": 101325.0},
                "lattice": {"loading_ratio": 0.85}
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
    
    def test_bubble_lattice_endpoint_pd_d(self):
        """Test /api/unified/bubble-lattice with Palladium-Deuterium."""
        response = self.client.post(
            "/api/unified/bubble-lattice",
            json={
                "bubble": {
                    "initial_radius_um": 10.0,
                    "driving_pressure_bar": 1.5,
                    "frequency_khz": 20.0,
                    "ambient_temperature_k": 300.0
                },
                "material": {
                    "host_material": "palladium",
                    "reactant": "deuterium"
                },
                "lattice": {
                    "loading_ratio": 0.9,
                    "defect_density": 1e16,
                    "surface_roughness": 5e-9
                },
                "num_cycles": 2
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "collapse_results" in data
        assert "enhancement_timeline" in data
        assert "peak_conditions" in data
        
        # Verify collapse results structure
        collapse = data["collapse_results"]
        assert "min_radius_um" in collapse
        assert "max_temperature_k" in collapse
        assert "max_pressure_bar" in collapse
        assert "compression_ratio" in collapse
        
        # Verify timeline structure for frontend visualization
        timeline = data["enhancement_timeline"]
        assert len(timeline) > 0
        for entry in timeline:
            assert "normalized_time" in entry
            assert "phase" in entry
            assert "enhancement_breakdown" in entry
    
    def test_bubble_lattice_endpoint_ni_h(self):
        """Test /api/unified/bubble-lattice with Nickel-Hydrogen."""
        response = self.client.post(
            "/api/unified/bubble-lattice",
            json={
                "bubble": {
                    "initial_radius_um": 8.0,
                    "driving_pressure_bar": 2.0,
                    "frequency_khz": 25.0,
                    "ambient_temperature_k": 500.0
                },
                "material": {
                    "host_material": "nickel",
                    "reactant": "hydrogen"
                },
                "lattice": {
                    "loading_ratio": 0.85,
                    "defect_density": 1e16,
                    "surface_roughness": 5e-9
                },
                "num_cycles": 2
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
    
    def test_equations_endpoint(self):
        """Test /api/unified/equations returns physics equations."""
        response = self.client.get("/api/unified/equations")
        assert response.status_code == 200
        
        data = response.json()
        assert "equations" in data
        assert len(data["equations"]) > 0
    
    def test_mechanisms_endpoint(self):
        """Test /api/unified/mechanisms returns mechanism breakdown."""
        response = self.client.get(
            "/api/unified/mechanisms",
            params={"temperature": 300.0, "loading_ratio": 0.9}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "mechanisms" in data
        assert "total_enhancement" in data


class TestAPIResponseStructure:
    """Verify API responses match frontend expectations."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test client."""
        from app.main import app
        self.client = TestClient(app)
    
    def test_bubble_lattice_timeline_has_required_fields(self):
        """Verify timeline entries have all fields needed by frontend visualization."""
        response = self.client.post(
            "/api/unified/bubble-lattice",
            json={
                "bubble": {"initial_radius_um": 10.0, "driving_pressure_bar": 1.5, "frequency_khz": 20.0},
                "material": {"host_material": "palladium", "reactant": "deuterium"},
                "lattice": {"loading_ratio": 0.9},
                "num_cycles": 2
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        timeline = data["enhancement_timeline"]
        
        # Explicitly assert timeline is non-empty
        assert len(timeline) > 0, "Timeline should not be empty"
        
        # Check first entry has all required fields
        entry = timeline[0]
        
        # Required by UnifiedBubbleLatticeVisualization.jsx interpolateFromAPITimeline
        required_fields = [
            "normalized_time",
            "phase",
            "enhancement",
            "enhancement_breakdown"
        ]
        
        for field in required_fields:
            assert field in entry, f"Missing required field: {field}"
        
        # Enhancement breakdown should have these sub-fields
        breakdown = entry["enhancement_breakdown"]
        expected_breakdown_keys = ["total", "screening", "phonon"]
        for key in expected_breakdown_keys:
            assert key in breakdown, f"Missing breakdown key: {key}"
    
    def test_response_values_are_json_serializable(self):
        """Verify all response values are proper JSON types (not numpy types)."""
        response = self.client.post(
            "/api/unified/simulate",
            json={}
        )
        assert response.status_code == 200
        
        # If we can serialize it, all values are proper JSON types
        json_str = json.dumps(response.json())
        assert len(json_str) > 0


class TestPhysicsCalculations:
    """Verify physics calculations return sensible results."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test client."""
        from app.main import app
        self.client = TestClient(app)
    
    def test_enhancement_increases_with_loading(self):
        """Test that enhancement increases with loading ratio."""
        # Low loading
        response_low = self.client.post(
            "/api/unified/simulate",
            json={"lattice": {"loading_ratio": 0.5}}
        )
        # High loading
        response_high = self.client.post(
            "/api/unified/simulate",
            json={"lattice": {"loading_ratio": 0.95}}
        )
        
        assert response_low.status_code == 200
        assert response_high.status_code == 200
        
        enh_low = response_low.json()["enhancement"]["total"]
        enh_high = response_high.json()["enhancement"]["total"]
        
        # Higher loading should give higher enhancement
        assert enh_high >= enh_low
    
    def test_compression_ratio_physical(self):
        """Test compression ratio is physically reasonable."""
        response = self.client.post(
            "/api/unified/bubble-lattice",
            json={
                "bubble": {"initial_radius_um": 10.0, "driving_pressure_bar": 1.5, "frequency_khz": 20.0},
                "material": {"host_material": "palladium", "reactant": "deuterium"},
                "lattice": {"loading_ratio": 0.9},
                "num_cycles": 2
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        compression = data["collapse_results"]["compression_ratio"]
        
        # Compression ratio should be >= 1 (can't expand during collapse)
        assert compression >= 1.0
        # Reasonable upper bound for sonoluminescence
        assert compression <= 1e7


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--no-cov"])
