"""
Unit tests for Unified Enhancement Calculator

Tests validate:
1. Individual enhancement mechanisms (screening, QED, Casimir, coherence)
2. Combined enhancement factor calculation
3. Physical constant consistency
4. Edge cases and numerical stability
5. Spatial enhancement calculations
"""

import pytest
import numpy as np
from typing import Dict, Any
import asyncio

# Import the module under test
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from app.physics_engine.unified_enhancement import UnifiedEnhancementCalculator
from scipy import constants


class TestUnifiedEnhancementCalculator:
    """Test suite for UnifiedEnhancementCalculator class."""
    
    @pytest.fixture
    def calculator(self) -> UnifiedEnhancementCalculator:
        """Create a standard calculator instance."""
        return UnifiedEnhancementCalculator()
    
    @pytest.fixture
    def calculator_with_config(self) -> UnifiedEnhancementCalculator:
        """Create a calculator with custom configuration."""
        config = {
            'debye_temperature': 275.0,
            'coherence_factor': 0.5,
            'tunneling_factor': 0.001,
            'vacancy_concentration': 0.01,
            'enhancement_factor': 1.0,
        }
        return UnifiedEnhancementCalculator(config)
    
    # =========================================================================
    # Initialization Tests
    # =========================================================================
    
    def test_calculator_initialization_default(self, calculator: UnifiedEnhancementCalculator):
        """Test calculator initializes with default constants."""
        assert calculator.hbar == constants.hbar
        assert calculator.e == constants.e
        assert calculator.eps0 == constants.epsilon_0
        assert calculator.me == constants.m_e
        assert calculator.mp == constants.m_p
        assert calculator.alpha == constants.alpha
        assert calculator.c == constants.c
        assert calculator.kb == constants.k
    
    def test_calculator_initialization_custom(self):
        """Test calculator accepts custom constants."""
        custom_hbar = 1.0e-34
        config = {'constants': {'hbar': custom_hbar}}
        calc = UnifiedEnhancementCalculator(config)
        
        assert calc.hbar == custom_hbar
    
    # =========================================================================
    # Tunneling Enhancement Tests
    # =========================================================================
    
    def test_tunneling_enhancement_structure(self, calculator: UnifiedEnhancementCalculator):
        """Test tunneling enhancement returns expected structure."""
        result = calculator.calculate_tunneling_enhancement(
            temperature=300.0,
            electron_density=6.8e28,
            electric_field=1e6,
            lattice_constant=3.89e-10
        )
        
        assert 'enhancement_factor' in result
        assert 'quantum_effects' in result
        
        quantum = result['quantum_effects']
        assert 'thermal_wavelength' in quantum
        assert 'barrier_height' in quantum
        assert 'barrier_width' in quantum
        assert 'tunnel_probability' in quantum
        assert 'coherence_factor' in quantum
        assert 'phonon_factor' in quantum
    
    def test_tunneling_enhancement_positive(self, calculator: UnifiedEnhancementCalculator):
        """Test tunneling enhancement is positive."""
        result = calculator.calculate_tunneling_enhancement(
            temperature=300.0,
            electron_density=6.8e28,
            electric_field=1e6,
            lattice_constant=3.89e-10
        )
        
        assert result['enhancement_factor'] > 0
    
    def test_tunneling_temperature_dependence(self, calculator: UnifiedEnhancementCalculator):
        """Test tunneling enhancement depends on temperature."""
        result_cold = calculator.calculate_tunneling_enhancement(
            temperature=100.0,
            electron_density=6.8e28,
            electric_field=1e6,
            lattice_constant=3.89e-10
        )
        result_hot = calculator.calculate_tunneling_enhancement(
            temperature=1000.0,
            electron_density=6.8e28,
            electric_field=1e6,
            lattice_constant=3.89e-10
        )
        
        # Enhancement should differ at different temperatures
        assert result_cold['enhancement_factor'] != result_hot['enhancement_factor']
    
    def test_tunneling_field_dependence(self, calculator: UnifiedEnhancementCalculator):
        """Test tunneling enhancement depends on electric field."""
        result_low = calculator.calculate_tunneling_enhancement(
            temperature=300.0,
            electron_density=6.8e28,
            electric_field=1e4,
            lattice_constant=3.89e-10
        )
        result_high = calculator.calculate_tunneling_enhancement(
            temperature=300.0,
            electron_density=6.8e28,
            electric_field=1e9,
            lattice_constant=3.89e-10
        )
        
        # Higher field should lower barrier, increase enhancement
        assert result_high['enhancement_factor'] >= result_low['enhancement_factor']
    
    def test_tunneling_nonlinear_scaling(self, calculator: UnifiedEnhancementCalculator):
        """Test non-linear scaling kicks in for high enhancement."""
        # Create conditions for very high enhancement
        result = calculator.calculate_tunneling_enhancement(
            temperature=10000.0,
            electron_density=1e30,
            electric_field=1e12,
            lattice_constant=3.89e-10
        )
        
        # Enhancement should be capped/scaled
        assert result['enhancement_factor'] < 1e10  # Non-linear scaling should apply
    
    # =========================================================================
    # Screening Enhancement Tests
    # =========================================================================
    
    def test_screening_enhancement_structure(self, calculator: UnifiedEnhancementCalculator):
        """Test screening enhancement returns expected structure."""
        result = calculator.calculate_screening_enhancement(
            temperature=300.0,
            electron_density=6.8e28
        )
        
        assert 'screening_potential' in result
        assert 'debye_length' in result
        assert 'fermi_tf_length' in result
        assert 'effective_length' in result
        assert 'plasma_frequency' in result
        assert 'enhancement_factor' in result
    
    def test_screening_debye_length_physical(self, calculator: UnifiedEnhancementCalculator):
        """Test Debye length is physically reasonable."""
        result = calculator.calculate_screening_enhancement(
            temperature=300.0,
            electron_density=6.8e28
        )
        
        # For metal electron density at room temp, Debye length ~1 Å
        assert result['debye_length'] > 1e-12  # > 1 pm
        assert result['debye_length'] < 1e-8   # < 10 nm
    
    def test_screening_uses_smaller_length(self, calculator: UnifiedEnhancementCalculator):
        """Test effective length is minimum of Debye and Thomas-Fermi."""
        result = calculator.calculate_screening_enhancement(
            temperature=300.0,
            electron_density=6.8e28
        )
        
        assert result['effective_length'] <= result['debye_length']
        assert result['effective_length'] <= result['fermi_tf_length']
    
    def test_screening_enhancement_positive(self, calculator: UnifiedEnhancementCalculator):
        """Test screening enhancement is >= 1."""
        result = calculator.calculate_screening_enhancement(
            temperature=300.0,
            electron_density=6.8e28
        )
        
        assert result['enhancement_factor'] >= 1.0
    
    def test_screening_potential_negative(self, calculator: UnifiedEnhancementCalculator):
        """Test screening potential is negative (attractive)."""
        result = calculator.calculate_screening_enhancement(
            temperature=300.0,
            electron_density=6.8e28
        )
        
        assert result['screening_potential'] < 0
    
    # =========================================================================
    # QED Enhancement Tests
    # =========================================================================
    
    def test_qed_enhancement_structure(self, calculator: UnifiedEnhancementCalculator):
        """Test QED enhancement returns expected structure."""
        result = calculator.calculate_qed_enhancement(
            electron_density=6.8e28,
            temperature=300.0
        )
        
        assert 'vacuum_polarization' in result
        assert 'temperature_correction' in result
        assert 'enhancement_factor' in result
        assert 'field_ratio' in result
    
    def test_qed_enhancement_baseline(self, calculator: UnifiedEnhancementCalculator):
        """Test QED enhancement is close to 1 at normal conditions."""
        result = calculator.calculate_qed_enhancement(
            electron_density=6.8e28,
            temperature=300.0
        )
        
        # At normal conditions, QED effects are small
        assert 0.9 < result['enhancement_factor'] < 2.0
    
    def test_qed_field_ratio_small(self, calculator: UnifiedEnhancementCalculator):
        """Test field ratio is small compared to Schwinger field."""
        result = calculator.calculate_qed_enhancement(
            electron_density=6.8e28,
            temperature=300.0
        )
        
        # Schwinger field is ~1.3e18 V/m, so ratio should be tiny
        assert result['field_ratio'] < 1e-10
    
    def test_qed_temperature_correction(self, calculator: UnifiedEnhancementCalculator):
        """Test temperature correction is bounded."""
        result_cold = calculator.calculate_qed_enhancement(
            electron_density=6.8e28,
            temperature=1.0
        )
        result_hot = calculator.calculate_qed_enhancement(
            electron_density=6.8e28,
            temperature=10000.0
        )
        
        # Temperature correction should be modest
        assert 0.9 < result_cold['temperature_correction'] < 1.2
        assert 0.9 < result_hot['temperature_correction'] < 1.2
    
    # =========================================================================
    # Casimir Enhancement Tests
    # =========================================================================
    
    def test_casimir_enhancement_structure(self, calculator: UnifiedEnhancementCalculator):
        """Test Casimir enhancement returns expected structure."""
        result = calculator.calculate_casimir_enhancement(
            lattice_constant=3.89e-10,
            temperature=300.0
        )
        
        assert 'casimir_energy' in result
        assert 'thermal_wavelength' in result
        assert 'temperature_factor' in result
        assert 'enhancement_factor' in result
    
    def test_casimir_energy_negative(self, calculator: UnifiedEnhancementCalculator):
        """Test Casimir energy is negative (attractive force)."""
        result = calculator.calculate_casimir_enhancement(
            lattice_constant=3.89e-10,
            temperature=300.0
        )
        
        assert result['casimir_energy'] < 0
    
    def test_casimir_enhancement_bounded(self, calculator: UnifiedEnhancementCalculator):
        """Test Casimir enhancement is bounded."""
        result = calculator.calculate_casimir_enhancement(
            lattice_constant=3.89e-10,
            temperature=300.0
        )
        
        # Should be capped at 10.0
        assert 1.0 <= result['enhancement_factor'] <= 10.0
    
    def test_casimir_scales_with_distance(self, calculator: UnifiedEnhancementCalculator):
        """Test Casimir effect scales with cavity size."""
        result_small = calculator.calculate_casimir_enhancement(
            lattice_constant=1e-10,
            temperature=300.0
        )
        result_large = calculator.calculate_casimir_enhancement(
            lattice_constant=1e-9,
            temperature=300.0
        )
        
        # Smaller cavity = stronger Casimir effect
        assert abs(result_small['casimir_energy']) > abs(result_large['casimir_energy'])
    
    # =========================================================================
    # Coherence Enhancement Tests
    # =========================================================================
    
    def test_coherence_enhancement_structure(self, calculator: UnifiedEnhancementCalculator):
        """Test coherence enhancement returns expected structure."""
        result = calculator.calculate_coherence_enhancement(
            temperature=300.0,
            lattice_constant=3.89e-10
        )
        
        assert 'thermal_wavelength' in result
        assert 'coherence_length' in result
        assert 'coherent_particles' in result
        assert 'temperature_factor' in result
        assert 'enhancement_factor' in result
    
    def test_coherence_enhancement_positive(self, calculator: UnifiedEnhancementCalculator):
        """Test coherence enhancement is >= 1."""
        result = calculator.calculate_coherence_enhancement(
            temperature=300.0,
            lattice_constant=3.89e-10
        )
        
        assert result['enhancement_factor'] >= 1.0
    
    def test_coherence_increases_at_low_temperature(self, calculator: UnifiedEnhancementCalculator):
        """Test coherence enhancement increases at lower temperature."""
        result_hot = calculator.calculate_coherence_enhancement(
            temperature=1000.0,
            lattice_constant=3.89e-10
        )
        result_cold = calculator.calculate_coherence_enhancement(
            temperature=100.0,
            lattice_constant=3.89e-10
        )
        
        # Lower temperature = longer de Broglie wavelength = more coherence
        assert result_cold['enhancement_factor'] >= result_hot['enhancement_factor']
    
    def test_coherent_particles_bounded(self, calculator: UnifiedEnhancementCalculator):
        """Test coherent particle count is bounded."""
        result = calculator.calculate_coherence_enhancement(
            temperature=300.0,
            lattice_constant=3.89e-10
        )
        
        # Should be capped at 100
        assert result['coherent_particles'] <= 100
    
    # =========================================================================
    # Total Enhancement Tests
    # =========================================================================
    
    @pytest.mark.asyncio
    async def test_total_enhancement_structure(self, calculator: UnifiedEnhancementCalculator):
        """Test total enhancement returns expected structure."""
        result = await calculator.calculate_total_enhancement(
            temperature=300.0,
            electron_density=6.8e28,
            electric_field=1e6,
            lattice_constant=3.89e-10
        )
        
        assert 'total_enhancement' in result
        assert 'factors' in result
        assert 'metadata' in result
        
        factors = result['factors']
        assert 'tunneling' in factors
        assert 'screening' in factors
        assert 'qed' in factors
        assert 'casimir' in factors
        assert 'coherence' in factors
    
    @pytest.mark.asyncio
    async def test_total_enhancement_positive(self, calculator: UnifiedEnhancementCalculator):
        """Test total enhancement is >= 1."""
        result = await calculator.calculate_total_enhancement(
            temperature=300.0,
            electron_density=6.8e28,
            electric_field=1e6,
            lattice_constant=3.89e-10
        )
        
        assert result['total_enhancement'] >= 1.0
    
    @pytest.mark.asyncio
    async def test_total_enhancement_finite(self, calculator: UnifiedEnhancementCalculator):
        """Test total enhancement is finite."""
        result = await calculator.calculate_total_enhancement(
            temperature=300.0,
            electron_density=6.8e28,
            electric_field=1e6,
            lattice_constant=3.89e-10
        )
        
        assert np.isfinite(result['total_enhancement'])
    
    @pytest.mark.asyncio
    async def test_total_enhancement_metadata(self, calculator: UnifiedEnhancementCalculator):
        """Test metadata contains input parameters."""
        temp = 500.0
        density = 5e28
        field = 2e6
        lattice = 4e-10
        
        result = await calculator.calculate_total_enhancement(
            temperature=temp,
            electron_density=density,
            electric_field=field,
            lattice_constant=lattice
        )
        
        metadata = result['metadata']
        assert metadata['temperature'] == temp
        assert metadata['electron_density'] == density
        assert metadata['electric_field'] == field
        assert metadata['lattice_constant'] == lattice
    
    # =========================================================================
    # Helper Function Tests
    # =========================================================================
    
    def test_tunneling_contribution_error_handling(self, calculator: UnifiedEnhancementCalculator):
        """Test tunneling contribution handles errors gracefully."""
        # Zero temperature should not crash
        result = calculator._calculate_tunneling_contribution(
            temperature=0.0,
            electron_density=6.8e28,
            electric_field=1e6,
            lattice_constant=3.89e-10
        )
        
        assert result == 1.0  # Default fallback
    
    def test_screening_contribution_error_handling(self, calculator: UnifiedEnhancementCalculator):
        """Test screening contribution handles errors gracefully."""
        # Zero density should not crash
        result = calculator._calculate_screening_contribution(
            temperature=300.0,
            electron_density=0.0
        )
        
        assert result == 1.0  # Default fallback
    
    def test_qed_contribution_error_handling(self, calculator: UnifiedEnhancementCalculator):
        """Test QED contribution handles errors gracefully."""
        result = calculator._calculate_qed_contribution(
            electron_density=0.0,
            temperature=0.0
        )
        
        assert result == 1.0  # Default fallback
    
    def test_casimir_contribution_error_handling(self, calculator: UnifiedEnhancementCalculator):
        """Test Casimir contribution handles errors gracefully."""
        result = calculator._calculate_casimir_contribution(
            lattice_constant=0.0,
            temperature=300.0
        )
        
        assert result == 1.0  # Default fallback
    
    def test_coherence_contribution_error_handling(self, calculator: UnifiedEnhancementCalculator):
        """Test coherence contribution handles errors gracefully."""
        result = calculator._calculate_coherence_contribution(
            temperature=0.0,
            lattice_constant=0.0
        )
        
        assert result == 1.0  # Default fallback


class TestEffectiveBarrierCalculation:
    """Test effective barrier calculation."""
    
    @pytest.fixture
    def calculator(self) -> UnifiedEnhancementCalculator:
        return UnifiedEnhancementCalculator()
    
    def test_barrier_height_positive(self, calculator: UnifiedEnhancementCalculator):
        """Test barrier height is non-negative."""
        height, width = calculator._calculate_effective_barrier(
            electron_density=6.8e28,
            electric_field=1e6,
            temperature=300.0
        )
        
        assert height >= 0
    
    def test_barrier_width_positive(self, calculator: UnifiedEnhancementCalculator):
        """Test barrier width is positive."""
        height, width = calculator._calculate_effective_barrier(
            electron_density=6.8e28,
            electric_field=1e6,
            temperature=300.0
        )
        
        assert width > 0
    
    def test_high_field_reduces_barrier(self, calculator: UnifiedEnhancementCalculator):
        """Test high electric field reduces barrier."""
        height_low, _ = calculator._calculate_effective_barrier(
            electron_density=6.8e28,
            electric_field=1e4,
            temperature=300.0
        )
        height_high, _ = calculator._calculate_effective_barrier(
            electron_density=6.8e28,
            electric_field=1e10,
            temperature=300.0
        )
        
        assert height_high <= height_low


class TestPhononAssistance:
    """Test phonon-assisted tunneling calculations."""
    
    @pytest.fixture
    def calculator(self) -> UnifiedEnhancementCalculator:
        config = {'debye_temperature': 275.0}
        return UnifiedEnhancementCalculator(config)
    
    def test_phonon_factor_positive(self, calculator: UnifiedEnhancementCalculator):
        """Test phonon factor is positive."""
        factor = calculator._calculate_phonon_assistance(
            barrier_height=1e-19,
            temperature=300.0,
            debye_temp=275.0
        )
        
        assert factor > 0
    
    def test_phonon_factor_minimum_one(self, calculator: UnifiedEnhancementCalculator):
        """Test phonon factor is at least 1."""
        factor = calculator._calculate_phonon_assistance(
            barrier_height=1e-19,
            temperature=300.0,
            debye_temp=275.0
        )
        
        assert factor >= 1.0
    
    def test_phonon_increases_with_temperature(self, calculator: UnifiedEnhancementCalculator):
        """Test phonon assistance increases with temperature."""
        factor_cold = calculator._calculate_phonon_assistance(
            barrier_height=1e-19,
            temperature=100.0,
            debye_temp=275.0
        )
        factor_hot = calculator._calculate_phonon_assistance(
            barrier_height=1e-19,
            temperature=500.0,
            debye_temp=275.0
        )
        
        # Higher temperature = more phonon occupation = more assistance
        assert factor_hot >= factor_cold


class TestCaching:
    """Test LRU cache functionality."""
    
    def test_tunneling_cached(self):
        """Test tunneling calculation uses cache."""
        calc = UnifiedEnhancementCalculator()
        
        # First call
        result1 = calc.calculate_tunneling_enhancement(
            temperature=300.0,
            electron_density=6.8e28,
            electric_field=1e6,
            lattice_constant=3.89e-10
        )
        
        # Second call with same params should be cached
        result2 = calc.calculate_tunneling_enhancement(
            temperature=300.0,
            electron_density=6.8e28,
            electric_field=1e6,
            lattice_constant=3.89e-10
        )
        
        assert result1 == result2
    
    def test_screening_cached(self):
        """Test screening calculation uses cache."""
        calc = UnifiedEnhancementCalculator()
        
        result1 = calc.calculate_screening_enhancement(300.0, 6.8e28)
        result2 = calc.calculate_screening_enhancement(300.0, 6.8e28)
        
        assert result1 == result2


class TestEdgeCases:
    """Test edge cases and numerical stability."""
    
    @pytest.fixture
    def calculator(self) -> UnifiedEnhancementCalculator:
        return UnifiedEnhancementCalculator()
    
    def test_very_low_temperature(self, calculator: UnifiedEnhancementCalculator):
        """Test behavior at very low temperature."""
        # Should not crash or produce NaN
        result = calculator.calculate_tunneling_enhancement(
            temperature=1.0,  # 1 K
            electron_density=6.8e28,
            electric_field=1e6,
            lattice_constant=3.89e-10
        )
        
        assert np.isfinite(result['enhancement_factor'])
    
    def test_very_high_temperature(self, calculator: UnifiedEnhancementCalculator):
        """Test behavior at very high temperature."""
        result = calculator.calculate_tunneling_enhancement(
            temperature=100000.0,  # 100,000 K
            electron_density=6.8e28,
            electric_field=1e6,
            lattice_constant=3.89e-10
        )
        
        assert np.isfinite(result['enhancement_factor'])
    
    def test_very_high_density(self, calculator: UnifiedEnhancementCalculator):
        """Test behavior at very high electron density."""
        result = calculator.calculate_screening_enhancement(
            temperature=300.0,
            electron_density=1e32  # Very high density
        )
        
        assert np.isfinite(result['enhancement_factor'])
    
    def test_very_high_field(self, calculator: UnifiedEnhancementCalculator):
        """Test behavior at very high electric field."""
        result = calculator.calculate_tunneling_enhancement(
            temperature=300.0,
            electron_density=6.8e28,
            electric_field=1e15,  # Very high field
            lattice_constant=3.89e-10
        )
        
        assert np.isfinite(result['enhancement_factor'])
    
    def test_very_small_lattice(self, calculator: UnifiedEnhancementCalculator):
        """Test behavior at very small lattice constant."""
        result = calculator.calculate_casimir_enhancement(
            lattice_constant=1e-12,  # 1 pm
            temperature=300.0
        )
        
        assert np.isfinite(result['enhancement_factor'])
        # Should be bounded
        assert result['enhancement_factor'] <= 10.0


# =========================================================================
# Run tests
# =========================================================================

if __name__ == '__main__':
    pytest.main([__file__, '-v'])
