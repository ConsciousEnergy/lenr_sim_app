"""
Integration tests for physics API endpoints.

These tests verify that the physics API endpoints correctly calculate
fusion reaction rates, enhancement factors, and quantum tunneling probabilities.
"""

import pytest
from fastapi.testclient import TestClient
from typing import Dict, Any, List
import numpy as np

# Mark the entire module as integration tests
pytestmark = pytest.mark.integration


@pytest.fixture
def fusion_rate_request() -> Dict[str, Any]:
    """Return a valid fusion rate calculation request."""
    return {
        "reaction_name": "d-d",
        "conditions": {
            "temperature": 10.0,  # keV
            "density": 1.0e20,    # particles/m^3
            "confinement_time": 1.0  # seconds
        },
        "enhancement_factors": {
            "electron_screening": 1.5,
            "quantum_nuclear_effect": 2.0,
            "resonant_tunneling": 1.2,
            "lattice_vibration": 1.8,
            "magnetic_effect": 1.0,
            "pressure_effect": 1.1
        }
    }


@pytest.fixture
def temperature_scan_request() -> Dict[str, Any]:
    """Return a valid temperature scan request."""
    return {
        "reaction_name": "d-d",
        "temperatures": [1.0, 2.0, 5.0, 10.0, 20.0],  # keV
        "density": 1.0e20,  # particles/m^3
        "enhancement_factors": {
            "electron_screening": 1.5
        }
    }


@pytest.fixture
def tunneling_request() -> Dict[str, Any]:
    """Return a valid quantum tunneling calculation request."""
    return {
        "temperature": 300.0,
        "potential_type": "coulomb",
        "barrier_width": 1.0e-10,
        "z1": 1,
        "z2": 1,
        "energy_min_ev": 0.1,
        "energy_max_ev": 10.0,
        "energy_points": 10,
        "electron_screening": True,
        "phonon_assisted": False,
        "lattice_sites": 1,
        "model_type": "wkb"
    }


@pytest.fixture
def phonon_request() -> Dict[str, Any]:
    """Return a valid phonon calculation request."""
    return {
        "lattice_params": {
            "lattice_type": "fcc",
            "lattice_constant": 3.89e-10,
            "dimensions": [5, 5, 5],
            "debye_temperature": 275.0,
            "spring_constant": 20.0,
            "anharmonicity": 0.05,
            "has_loading": True,
            "loading_element": "D",
            "loading_ratio": 0.8,
            "loading_sites": "octahedral",
            "temperature": 300.0,
            "max_wavenumber": 10.0,
            "wavenumber_points": 20
        },
        "direction": "100"
    }


class TestPhysicsAPI:
    """Tests for the physics API endpoints."""

    def test_calculate_fusion_rate(self, client: TestClient, fusion_rate_request: Dict[str, Any]):
        """Test calculating fusion reaction rate."""
        response = client.post("/api/physics/calculate/rate", json=fusion_rate_request)
        assert response.status_code == 200, f"Failed to calculate fusion rate: {response.text}"
        
        data = response.json()
        assert "reaction_rate" in data
        assert "cross_section" in data
        assert "enhanced_rate" in data
        assert "enhancement_factor" in data
        
        # Check that the values are reasonable
        assert data["reaction_rate"] > 0
        assert data["cross_section"] > 0
        assert data["enhanced_rate"] > data["reaction_rate"]
        assert data["enhancement_factor"] > 1.0

    def test_temperature_scan(self, client: TestClient, temperature_scan_request: Dict[str, Any]):
        """Test temperature scan calculation."""
        response = client.post("/api/physics/calculate/temperature-scan", json=temperature_scan_request)
        assert response.status_code == 200, f"Failed to calculate temperature scan: {response.text}"
        
        data = response.json()
        assert "temperatures" in data
        assert "reaction_rates" in data
        assert "enhanced_rates" in data
        
        # Check that arrays have correct lengths
        temperatures = temperature_scan_request["temperatures"]
        assert len(data["temperatures"]) == len(temperatures)
        assert len(data["reaction_rates"]) == len(temperatures)
        assert len(data["enhanced_rates"]) == len(temperatures)
        
        # Check that rates increase with temperature (generally true for fusion)
        rates = data["reaction_rates"]
        for i in range(1, len(rates)):
            assert rates[i] > rates[i-1], "Reaction rates should increase with temperature"

    def test_available_reactions(self, client: TestClient):
        """Test retrieving available reactions."""
        response = client.get("/api/physics/available-reactions")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Check that basic reactions are included
        reaction_names = [r.get("name") for r in data if isinstance(r, dict) and "name" in r]
        assert "d-d" in reaction_names, "D-D reaction should be available"
        assert "d-t" in reaction_names, "D-T reaction should be available"

    def test_quantum_tunneling(self, client: TestClient, tunneling_request: Dict[str, Any]):
        """Test quantum tunneling calculation."""
        response = client.post("/api/physics/quantum-tunneling", json=tunneling_request)
        assert response.status_code == 200, f"Failed to calculate tunneling: {response.text}"
        
        data = response.json()
        assert "energies" in data
        assert "probabilities" in data
        assert "enhanced_probabilities" in data
        assert "enhancement_factors" in data
        
        # Check array dimensions
        energies = data["energies"]
        probs = data["probabilities"]
        enhanced = data["enhanced_probabilities"]
        factors = data["enhancement_factors"]
        
        assert len(energies) == tunneling_request["energy_points"]
        assert len(probs) == len(energies)
        assert len(enhanced) == len(energies)
        assert len(factors) == len(energies)
        
        # Check that probabilities are valid
        for p in probs:
            assert 0 <= p <= 1, "Probability must be between 0 and 1"
            
        # Check that enhanced probabilities are higher
        for i in range(len(probs)):
            assert enhanced[i] >= probs[i], "Enhanced probability should be >= base probability"

    def test_phonon_dispersion(self, client: TestClient, phonon_request: Dict[str, Any]):
        """Test phonon dispersion calculation."""
        response = client.post("/api/physics/phonon-dispersion", json=phonon_request)
        assert response.status_code == 200, f"Failed to calculate phonon dispersion: {response.text}"
        
        data = response.json()
        assert "wavenumbers" in data
        assert "frequencies" in data
        assert "dispersion_data" in data
        
        # Check that arrays have data
        assert len(data["wavenumbers"]) > 0
        assert len(data["frequencies"]) > 0
        
        # Check that data is physically reasonable
        for freq in data["frequencies"]:
            assert freq >= 0, "Frequencies should be non-negative"

    def test_optimize_temperature(self, client: TestClient):
        """Test temperature optimization for reaction rate."""
        request_data = {
            "reaction_name": "d-d",
            "temperature_range": [1.0, 50.0],  # keV
            "density": 1.0e20,  # particles/m^3
            "enhancement_factors": {
                "electron_screening": 1.5
            }
        }
        
        response = client.post("/api/physics/optimize/temperature", json=request_data)
        assert response.status_code == 200, f"Failed to optimize temperature: {response.text}"
        
        data = response.json()
        assert "optimal_temperature" in data
        assert "maximum_rate" in data
        
        # Check that optimal temperature is within the specified range
        assert request_data["temperature_range"][0] <= data["optimal_temperature"] <= request_data["temperature_range"][1]
        assert data["maximum_rate"] > 0

    def test_enhancement_calculation(self, client: TestClient):
        """Test enhancement factor calculation."""
        # First, get the default configuration
        response = client.get("/api/physics/default-configuration")
        assert response.status_code == 200
        
        default_config = response.json()
        
        # Now use this configuration to calculate enhancement
        request_data = {
            "config": default_config,
            "mechanisms": ["electron_screening", "lattice_vibration", "coherent_tunneling"]
        }
        
        response = client.post("/api/physics/calculate-enhancement", json=request_data)
        assert response.status_code == 200, f"Failed to calculate enhancement: {response.text}"
        
        data = response.json()
        assert "total_enhancement" in data
        assert "mechanism_contributions" in data
        assert data["total_enhancement"] > 1.0
        
        # Check that all requested mechanisms are included in contributions
        contrib_keys = data["mechanism_contributions"].keys()
        for mech in request_data["mechanisms"]:
            assert mech in contrib_keys, f"Mechanism {mech} missing from contributions"

    def test_invalid_reaction_name(self, client: TestClient, fusion_rate_request: Dict[str, Any]):
        """Test error handling for invalid reaction name."""
        invalid_request = fusion_rate_request.copy()
        invalid_request["reaction_name"] = "invalid-reaction"
        
        response = client.post("/api/physics/calculate/rate", json=invalid_request)
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "Invalid reaction name" in data["detail"]

    def test_out_of_range_parameters(self, client: TestClient, fusion_rate_request: Dict[str, Any]):
        """Test error handling for out-of-range parameters."""
        # Test extremely high temperature
        invalid_request = fusion_rate_request.copy()
        invalid_request["conditions"]["temperature"] = 1.0e6  # Unrealistically high temperature
        
        response = client.post("/api/physics/calculate/rate", json=invalid_request)
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "temperature" in data["detail"].lower()

        # Test negative density
        invalid_request = fusion_rate_request.copy()
        invalid_request["conditions"]["density"] = -1.0
        
        response = client.post("/api/physics/calculate/rate", json=invalid_request)
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "density" in data["detail"].lower()

    def test_conservation_laws(self, client: TestClient, fusion_rate_request: Dict[str, Any]):
        """Test that energy and particle number are conserved in calculations."""
        response = client.post("/api/physics/calculate/rate", json=fusion_rate_request)
        assert response.status_code == 200
        data = response.json()
        
        # Request detailed energy balance
        energy_request = fusion_rate_request.copy()
        energy_request["include_energy_balance"] = True
        
        energy_response = client.post("/api/physics/calculate/rate", json=energy_request)
        assert energy_response.status_code == 200
        energy_data = energy_response.json()
        
        # Check energy conservation
        assert "energy_balance" in energy_data
        balance = energy_data["energy_balance"]
        assert abs(balance["total_input_energy"] - balance["total_output_energy"]) < 1e-10
        
        # Check particle number conservation
        assert "particle_balance" in energy_data
        particles = energy_data["particle_balance"]
        assert particles["input_nucleons"] == particles["output_nucleons"]

    def test_boundary_conditions(self, client: TestClient, tunneling_request: Dict[str, Any]):
        """Test handling of boundary conditions in quantum calculations."""
        # Test zero barrier width
        invalid_request = tunneling_request.copy()
        invalid_request["barrier_width"] = 0.0
        
        response = client.post("/api/physics/quantum-tunneling", json=invalid_request)
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "barrier width" in data["detail"].lower()
        
        # Test negative energy range
        invalid_request = tunneling_request.copy()
        invalid_request["energy_min_ev"] = -1.0
        
        response = client.post("/api/physics/quantum-tunneling", json=invalid_request)
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "energy" in data["detail"].lower()

    def test_numerical_stability(self, client: TestClient, tunneling_request: Dict[str, Any]):
        """Test numerical stability of calculations at extreme parameter values."""
        # Test very thin barrier
        edge_request = tunneling_request.copy()
        edge_request["barrier_width"] = 1.0e-15  # Very thin barrier
        
        response = client.post("/api/physics/quantum-tunneling", json=edge_request)
        assert response.status_code == 200
        data = response.json()
        
        # Probabilities should still be valid
        for prob in data["probabilities"]:
            assert 0 <= prob <= 1
            
        # Test very thick barrier
        edge_request["barrier_width"] = 1.0e-8  # Very thick barrier
        
        response = client.post("/api/physics/quantum-tunneling", json=edge_request)
        assert response.status_code == 200
        data = response.json()
        
        # Probabilities should be very small but non-negative
        for prob in data["probabilities"]:
            assert 0 <= prob <= 1
            assert prob < 1e-10  # Should be very small for thick barrier

    def test_calculation_persistence(self, client: TestClient, fusion_rate_request: Dict[str, Any]):
        """Test that physics calculations are properly persisted and can be retrieved."""
        # First, perform a calculation
        response = client.post("/api/physics/calculate/rate", json=fusion_rate_request)
        assert response.status_code == 200
        data = response.json()
        calculation_id = data["calculation_id"]
        
        # Retrieve the calculation
        response = client.get(f"/api/physics/calculations/{calculation_id}")
        assert response.status_code == 200
        retrieved_data = response.json()
        
        # Verify calculation details
        assert retrieved_data["input_parameters"] == fusion_rate_request
        assert retrieved_data["status"] == "completed"
        assert "results" in retrieved_data
        assert "timestamp" in retrieved_data
        assert "calculation_time" in retrieved_data

    def test_calculation_history(self, client: TestClient, fusion_rate_request: Dict[str, Any]):
        """Test retrieval of calculation history and filtering."""
        # Perform multiple calculations with different parameters
        calculations = []
        for temp in [5.0, 10.0, 15.0]:
            request = fusion_rate_request.copy()
            request["conditions"]["temperature"] = temp
            response = client.post("/api/physics/calculate/rate", json=request)
            assert response.status_code == 200
            calculations.append(response.json()["calculation_id"])
            
        # Get calculation history
        response = client.get("/api/physics/calculations")
        assert response.status_code == 200
        history = response.json()
        
        # Verify all calculations are present
        history_ids = [calc["id"] for calc in history["calculations"]]
        for calc_id in calculations:
            assert calc_id in history_ids
            
        # Test filtering by time range
        response = client.get("/api/physics/calculations?time_range=last_hour")
        assert response.status_code == 200
        recent_history = response.json()
        assert len(recent_history["calculations"]) >= len(calculations)
        
        # Test filtering by calculation type
        response = client.get("/api/physics/calculations?type=fusion_rate")
        assert response.status_code == 200
        fusion_history = response.json()
        assert len(fusion_history["calculations"]) >= len(calculations)

    def test_calculation_metadata(self, client: TestClient, fusion_rate_request: Dict[str, Any]):
        """Test that calculation metadata is properly tracked and can be queried."""
        # Perform a calculation
        response = client.post("/api/physics/calculate/rate", json=fusion_rate_request)
        assert response.status_code == 200
        data = response.json()
        calculation_id = data["calculation_id"]
        
        # Get calculation metadata
        response = client.get(f"/api/physics/calculations/{calculation_id}/metadata")
        assert response.status_code == 200
        metadata = response.json()
        
        # Verify metadata fields
        assert "calculation_type" in metadata
        assert metadata["calculation_type"] == "fusion_rate"
        assert "input_hash" in metadata
        assert "version" in metadata
        assert "dependencies" in metadata
        assert "performance_metrics" in metadata
        
        # Verify performance metrics
        metrics = metadata["performance_metrics"]
        assert "calculation_time" in metrics
        assert "memory_usage" in metrics
        assert "cpu_usage" in metrics

    def test_calculation_dependencies(self, client: TestClient):
        """Test handling of calculations with dependencies on other calculations."""
        # First calculation: basic fusion rate
        base_request = {
            "reaction_name": "d-d",
            "conditions": {
                "temperature": 10.0,
                "density": 1.0e20
            }
        }
        response = client.post("/api/physics/calculate/rate", json=base_request)
        assert response.status_code == 200
        base_calc_id = response.json()["calculation_id"]
        
        # Second calculation: enhancement using results from first
        enhance_request = {
            "base_calculation_id": base_calc_id,
            "enhancement_factors": {
                "electron_screening": 1.5,
                "quantum_nuclear_effect": 2.0
            }
        }
        response = client.post("/api/physics/calculate/enhancement", json=enhance_request)
        assert response.status_code == 200
        enhance_calc_id = response.json()["calculation_id"]
        
        # Verify dependency tracking
        response = client.get(f"/api/physics/calculations/{enhance_calc_id}/dependencies")
        assert response.status_code == 200
        deps = response.json()
        
        assert len(deps["dependencies"]) == 1
        assert deps["dependencies"][0]["id"] == base_calc_id
        assert "calculation_chain" in deps
        assert len(deps["calculation_chain"]) == 2

    def test_multi_step_reaction_chain(self, client: TestClient):
        """Test calculation of multi-step reaction chains."""
        # Initial d-d reaction
        dd_request = {
            "reaction_name": "d-d",
            "conditions": {
                "temperature": 10.0,
                "density": 1.0e20,
                "confinement_time": 1.0
            },
            "include_products": True
        }
        
        response = client.post("/api/physics/calculate/rate", json=dd_request)
        assert response.status_code == 200
        dd_data = response.json()
        
        # Secondary reactions with products
        products = dd_data["reaction_products"]
        assert "he3" in products or "t" in products  # D-D produces He-3 or T
        
        # Calculate secondary d-he3 reaction if he3 is produced
        if "he3" in products:
            dhe3_request = {
                "reaction_name": "d-he3",
                "conditions": {
                    "temperature": 10.0,
                    "density": {
                        "d": 1.0e20,
                        "he3": products["he3"]["density"]
                    },
                    "confinement_time": 1.0
                }
            }
            
            response = client.post("/api/physics/calculate/rate", json=dhe3_request)
            assert response.status_code == 200
            dhe3_data = response.json()
            
            # Verify energy balance across reaction chain
            assert dd_data["energy_per_reaction"] + dhe3_data["energy_per_reaction"] > 0

    def test_coupled_physics_effects(self, client: TestClient):
        """Test calculations involving coupled physics effects."""
        # Calculate phonon spectrum first
        phonon_request = {
            "lattice_params": {
                "lattice_type": "fcc",
                "lattice_constant": 3.89e-10,
                "dimensions": [5, 5, 5],
                "temperature": 300.0
            }
        }
        
        response = client.post("/api/physics/phonon-spectrum", json=phonon_request)
        assert response.status_code == 200
        phonon_data = response.json()
        
        # Use phonon data in tunneling calculation
        tunneling_request = {
            "temperature": 300.0,
            "barrier_width": 1.0e-10,
            "z1": 1,
            "z2": 1,
            "energy_range": {
                "min": 0.1,
                "max": 10.0,
                "points": 20
            },
            "phonon_assistance": {
                "enabled": True,
                "spectrum": phonon_data["spectrum"]
            }
        }
        
        response = client.post("/api/physics/quantum-tunneling", json=tunneling_request)
        assert response.status_code == 200
        tunneling_data = response.json()
        
        # Verify phonon-assisted tunneling shows enhancement
        assert any(ef > 1.0 for ef in tunneling_data["enhancement_factors"])

    def test_physical_constraints(self, client: TestClient):
        """Test that calculations respect fundamental physical constraints."""
        # Test energy conservation in reactions
        reaction_request = {
            "reaction_name": "d-t",
            "conditions": {
                "temperature": 20.0,
                "density": 1.0e20,
                "confinement_time": 1.0
            },
            "include_detailed_energy": True
        }
        
        response = client.post("/api/physics/calculate/rate", json=reaction_request)
        assert response.status_code == 200
        data = response.json()
        
        # Check energy conservation
        energy_data = data["energy_details"]
        total_input = sum(energy_data["input_energies"].values())
        total_output = sum(energy_data["output_energies"].values())
        assert abs(total_output - total_input - 17.6) < 1e-6  # D-T fusion releases 17.6 MeV
        
        # Test momentum conservation
        assert "momentum_balance" in data
        momentum = data["momentum_balance"]
        for component in ["x", "y", "z"]:
            assert abs(momentum[f"total_{component}"]) < 1e-10
        
        # Test quantum mechanical constraints
        tunneling_request = {
            "barrier_type": "coulomb",
            "particle": "deuteron",
            "energy": 1000.0,  # eV
            "include_uncertainty": True
        }
        
        response = client.post("/api/physics/tunneling-probability", json=tunneling_request)
        assert response.status_code == 200
        qm_data = response.json()
        
        # Verify uncertainty principle is respected
        assert qm_data["position_uncertainty"] * qm_data["momentum_uncertainty"] >= 1.0545718e-34 / 2  # ℏ/2

    def test_convergence_and_stability(self, client: TestClient):
        """Test numerical convergence and stability of calculations."""
        # Test convergence with increasing precision
        base_request = {
            "reaction_name": "d-d",
            "conditions": {
                "temperature": 10.0,
                "density": 1.0e20
            }
        }
        
        previous_result = None
        for precision in [1, 2, 3, 4, 5]:
            request = base_request.copy()
            request["numerical_params"] = {
                "precision": precision,
                "max_iterations": 1000
            }
            
            response = client.post("/api/physics/calculate/rate", json=request)
            assert response.status_code == 200
            data = response.json()
            
            if previous_result is not None:
                # Check that results converge
                relative_change = abs(data["reaction_rate"] - previous_result) / previous_result
                assert relative_change < 0.1  # Should converge with increasing precision
            
            previous_result = data["reaction_rate"]
        
        # Test stability with varying time steps
        time_evolution_request = {
            "initial_conditions": {
                "temperature": 10.0,
                "density": 1.0e20
            },
            "time_range": {
                "start": 0.0,
                "end": 1.0,
                "steps": 100
            }
        }
        
        response = client.post("/api/physics/time-evolution", json=time_evolution_request)
        assert response.status_code == 200
        evolution_data = response.json()
        
        # Check that energy is conserved throughout evolution
        energies = evolution_data["total_energy"]
        initial_energy = energies[0]
        for energy in energies[1:]:
            assert abs(energy - initial_energy) / initial_energy < 0.01  # Allow for small numerical errors 