"""
Unit tests for QuantumEffectsSolver and UltraDenseHydrogenModel.
Tests quantum physics calculations including UDH effects from arxiv 2505.21946.
"""

import pytest
import numpy as np
from unittest.mock import MagicMock

# Import physics modules
from app.physics_engine.udh_physics import UltraDenseHydrogenModel, calculate_udh_enhancement
from app.physics_engine.quantum_effects_solver import QuantumEffectsSolver
from app.physics_engine.constants import get_config, UDH_CONSTANTS, DEFAULT_CONFIG


class TestUltraDenseHydrogenModel:
    """Tests for the UDH physics model."""
    
    @pytest.fixture
    def udh_model(self):
        """Create a UDH model instance with default config."""
        config = get_config()
        return UltraDenseHydrogenModel(config)
    
    def test_initialization(self, udh_model):
        """Test model initializes with correct parameters."""
        assert udh_model.cluster_size == 6
        assert udh_model.udh_bond_length == pytest.approx(2.3e-12, rel=1e-3)
        # density_factor = (74pm / 2.3pm)^3 ≈ 33,305
        assert udh_model.density_factor > 3e4  # UDH is much denser than normal H2

    
    def test_calculate_udh_density(self, udh_model):
        """Test UDH density calculation returns valid results."""
        result = udh_model.calculate_udh_density(
            temperature=400.0,
            pressure=101325.0,
            lattice_params={"defect_density": 0.01, "hydrogen_density": 1e28}
        )
        
        assert "formation_probability" in result
        assert "density_enhancement" in result
        assert 0 <= result["formation_probability"] <= 1
        assert result["density_enhancement"] >= 1.0
        assert not np.isnan(result["formation_probability"])
        assert not np.isinf(result["density_enhancement"])
    
    def test_calculate_bosonic_state_energy(self, udh_model):
        """Test bosonic state energy calculations."""
        result = udh_model.calculate_bosonic_state_energy(cluster_size=6)
        
        assert "ground_state_energy_J" in result
        assert "total_binding_energy_eV" in result
        assert result["ground_state_energy_J"] < 0  # Bound state
        assert result["total_binding_energy_eV"] > 0
        assert not np.isnan(result["total_binding_energy_eV"])
    
    def test_calculate_field_collapse_probability(self, udh_model):
        """Test field collapse probability calculations."""
        # Below threshold
        result_low = udh_model.calculate_field_collapse_probability(em_field_strength=1e6)
        assert result_low["collapse_probability"] < 0.5
        
        # Above threshold
        result_high = udh_model.calculate_field_collapse_probability(em_field_strength=1e9)
        assert result_high["collapse_probability"] > 0.5
        assert 0 <= result_high["collapse_probability"] <= 1

    
    def test_calculate_vacuum_squeeze_factor(self, udh_model):
        """Test vacuum squeezing calculations."""
        result = udh_model.calculate_vacuum_squeeze_factor(
            local_density=1e28,
            temperature=400.0
        )
        
        assert "squeeze_parameter" in result
        assert "total_squeeze_factor" in result
        assert result["total_squeeze_factor"] >= 1.0
        assert not np.isnan(result["squeeze_parameter"])
    
    def test_calculate_total_udh_enhancement(self, udh_model):
        """Test total UDH enhancement calculation."""
        result = udh_model.calculate_total_udh_enhancement(
            temperature=400.0,
            pressure=101325.0,
            em_field=1e7,
            local_density=1e28
        )
        
        assert "total_enhancement" in result
        assert "components" in result
        assert result["total_enhancement"] >= 1.0
        assert not np.isnan(result["total_enhancement"])
        assert not np.isinf(result["total_enhancement"])
    
    def test_convenience_function(self):
        """Test the convenience function for quick calculations."""
        enhancement = calculate_udh_enhancement(
            temperature=400.0,
            pressure=101325.0,
            em_field=1e7,
            local_density=1e28
        )
        
        assert enhancement >= 1.0
        assert not np.isnan(enhancement)


class TestQuantumEffectsSolver:
    """Tests for the QuantumEffectsSolver class."""
    
    @pytest.fixture
    def solver_no_grid(self):
        """Create solver without grid (scalar mode)."""
        config = get_config()
        return QuantumEffectsSolver(config, grid=None)

    
    def test_initialization_no_grid(self, solver_no_grid):
        """Test solver initializes correctly without grid."""
        assert solver_no_grid.grid is None
        assert solver_no_grid.tunneling_enhancement_grid is not None
        assert len(solver_no_grid.tunneling_enhancement_grid) == 1
    
    @pytest.mark.asyncio
    async def test_scalar_enhancement_calculation(self, solver_no_grid):
        """Test scalar enhancement calculation."""
        local_state = {
            "temperature_grid": np.array([400.0]),
            "density_grid": np.array([1e28]),
            "electric_field_grid": np.array([1e6])
        }
        
        await solver_no_grid.calculate_tunneling_enhancement(local_state)
        enhancement = solver_no_grid.get_tunneling_enhancement_grid()
        
        assert enhancement[0] >= 1.0
        assert not np.isnan(enhancement[0])
        assert not np.isinf(enhancement[0])
    
    @pytest.mark.asyncio
    async def test_udh_enhancement_grid(self, solver_no_grid):
        """Test UDH enhancement grid is populated."""
        local_state = {
            "temperature_grid": np.array([400.0]),
            "density_grid": np.array([1e28]),
            "electric_field_grid": np.array([1e7])
        }
        
        await solver_no_grid.calculate_tunneling_enhancement(local_state)
        udh_grid = solver_no_grid.get_udh_enhancement_grid()
        
        assert udh_grid is not None
        assert udh_grid[0] >= 1.0



class TestConstants:
    """Tests for the constants module updates."""
    
    def test_udh_constants_exist(self):
        """Test UDH constants are defined."""
        assert UDH_CONSTANTS is not None
        assert "udh_bond_length" in UDH_CONSTANTS
        assert "bosonic_binding_energy" in UDH_CONSTANTS
        assert "collapse_threshold_field" in UDH_CONSTANTS
    
    def test_config_includes_udh(self):
        """Test get_config includes UDH settings."""
        config = get_config()
        assert "udh_params" in config or "udh_constants" in config
        assert "enable_udh_physics" in config


class TestEdgeCases:
    """Tests for edge cases and boundary conditions."""
    
    @pytest.fixture
    def udh_model(self):
        return UltraDenseHydrogenModel()
    
    def test_zero_temperature(self, udh_model):
        """Test handling of zero temperature."""
        # Should not raise exception
        result = udh_model.calculate_vacuum_squeeze_factor(1e28, temperature=0.01)
        assert not np.isnan(result["total_squeeze_factor"])
    
    def test_very_high_field(self, udh_model):
        """Test saturation at very high fields."""
        result = udh_model.calculate_field_collapse_probability(em_field_strength=1e15)
        assert result["collapse_probability"] <= 1.0
    
    def test_extreme_density(self, udh_model):
        """Test handling of extreme densities."""
        result = udh_model.calculate_total_udh_enhancement(
            temperature=400.0, pressure=101325.0,
            em_field=1e7, local_density=1e35
        )
        # Should not overflow
        assert result["total_enhancement"] < 1e20
        assert not np.isnan(result["total_enhancement"])
