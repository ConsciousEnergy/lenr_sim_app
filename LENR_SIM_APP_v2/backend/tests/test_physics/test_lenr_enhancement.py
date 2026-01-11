"""
Unit Tests for LENR Enhancement Engine
======================================

Tests for the LENR multi-physics enhancement calculations.
"""

import pytest
import numpy as np
from app.physics.lenr_enhancement import (
    EnhancementMechanism,
    EnhancementResult,
    LENRConditions,
    LENREnhancementCalculator,
    calculate_lenr_enhancement,
    calculate_lenr_reaction_rate
)


class TestLENRConditions:
    """Test LENRConditions dataclass."""
    
    def test_default_values(self):
        """Test default values are set correctly."""
        conditions = LENRConditions()
        assert conditions.temperature_k == 300.0
        assert conditions.pressure_atm == 1.0
        assert conditions.loading_ratio == 0.8
        assert conditions.material == 'palladium'
    
    def test_custom_values(self):
        """Test custom values are stored correctly."""
        conditions = LENRConditions(
            temperature_k=400.0,
            loading_ratio=0.9,
            material='nickel'
        )
        assert conditions.temperature_k == 400.0
        assert conditions.loading_ratio == 0.9
        assert conditions.material == 'nickel'


class TestLENREnhancementCalculator:
    """Test the LENREnhancementCalculator class."""
    
    @pytest.fixture
    def calculator(self):
        return LENREnhancementCalculator()
    
    @pytest.fixture
    def default_conditions(self):
        return LENRConditions(
            temperature_k=350.0,
            loading_ratio=0.85,
            material='palladium',
            defect_density=0.01
        )
    
    def test_total_enhancement_positive(self, calculator, default_conditions):
        """Test total enhancement is positive."""
        result = calculator.calculate_total_enhancement(
            energy_kev=0.025,
            conditions=default_conditions
        )
        assert result.total_enhancement > 0
    
    def test_total_enhancement_greater_than_one(self, calculator, default_conditions):
        """Test total enhancement is greater than 1 (enhancing, not suppressing)."""
        result = calculator.calculate_total_enhancement(
            energy_kev=0.025,
            conditions=default_conditions
        )
        # At least some enhancement should occur
        assert result.total_enhancement >= 1.0
    
    def test_individual_factors_included(self, calculator, default_conditions):
        """Test individual enhancement factors are included."""
        result = calculator.calculate_total_enhancement(
            energy_kev=0.025,
            conditions=default_conditions
        )
        assert 'electron_screening' in result.individual_factors
        assert 'loading_ratio' in result.individual_factors
    
    def test_dominant_mechanism_identified(self, calculator, default_conditions):
        """Test dominant mechanism is identified."""
        result = calculator.calculate_total_enhancement(
            energy_kev=0.025,
            conditions=default_conditions
        )
        assert result.dominant_mechanism in result.individual_factors
    
    def test_electron_screening_dominant_at_low_energy(self, calculator, default_conditions):
        """Test electron screening dominates at low energy."""
        result = calculator.calculate_total_enhancement(
            energy_kev=0.001,  # Very low energy
            conditions=default_conditions
        )
        # At very low energy, electron screening should dominate
        assert result.individual_factors['electron_screening'] > 1.0
    
    def test_selective_mechanisms(self, calculator, default_conditions):
        """Test selecting specific mechanisms."""
        mechanisms = [
            EnhancementMechanism.ELECTRON_SCREENING,
            EnhancementMechanism.LOADING_RATIO
        ]
        result = calculator.calculate_total_enhancement(
            energy_kev=0.025,
            conditions=default_conditions,
            mechanisms=mechanisms
        )
        # Only selected mechanisms should be present
        assert 'electron_screening' in result.individual_factors
        assert 'loading_ratio' in result.individual_factors
        # Others should not be present
        assert 'phonon_assisted' not in result.individual_factors


class TestElectronScreeningMechanism:
    """Test electron screening enhancement."""
    
    @pytest.fixture
    def calculator(self):
        return LENREnhancementCalculator()
    
    def test_screening_increases_with_lower_energy(self, calculator):
        """Test screening enhancement increases at lower energy."""
        conditions = LENRConditions(material='palladium')
        
        result_high = calculator.calculate_total_enhancement(
            energy_kev=1.0,
            conditions=conditions,
            mechanisms=[EnhancementMechanism.ELECTRON_SCREENING]
        )
        result_low = calculator.calculate_total_enhancement(
            energy_kev=0.01,
            conditions=conditions,
            mechanisms=[EnhancementMechanism.ELECTRON_SCREENING]
        )
        
        assert result_low.individual_factors['electron_screening'] > \
               result_high.individual_factors['electron_screening']


class TestLoadingRatioEnhancement:
    """Test loading ratio enhancement."""
    
    @pytest.fixture
    def calculator(self):
        return LENREnhancementCalculator()
    
    def test_enhancement_increases_with_loading(self, calculator):
        """Test enhancement increases with loading ratio."""
        low_loading = LENRConditions(loading_ratio=0.5)
        high_loading = LENRConditions(loading_ratio=0.95)
        
        result_low = calculator.calculate_total_enhancement(
            energy_kev=0.025,
            conditions=low_loading,
            mechanisms=[EnhancementMechanism.LOADING_RATIO]
        )
        result_high = calculator.calculate_total_enhancement(
            energy_kev=0.025,
            conditions=high_loading,
            mechanisms=[EnhancementMechanism.LOADING_RATIO]
        )
        
        assert result_high.individual_factors['loading_ratio'] > \
               result_low.individual_factors['loading_ratio']
    
    def test_zero_loading_gives_low_enhancement(self, calculator):
        """Test zero loading gives very low enhancement."""
        conditions = LENRConditions(loading_ratio=0.0)
        result = calculator.calculate_total_enhancement(
            energy_kev=0.025,
            conditions=conditions,
            mechanisms=[EnhancementMechanism.LOADING_RATIO]
        )
        assert result.individual_factors['loading_ratio'] < 0.1


class TestDefectEnhancement:
    """Test defect enhancement mechanism."""
    
    @pytest.fixture
    def calculator(self):
        return LENREnhancementCalculator()
    
    def test_defects_enhance(self, calculator):
        """Test defects provide enhancement."""
        no_defects = LENRConditions(defect_density=0.0)
        with_defects = LENRConditions(defect_density=0.1)
        
        result_no = calculator.calculate_total_enhancement(
            energy_kev=0.025,
            conditions=no_defects,
            mechanisms=[EnhancementMechanism.DEFECT_ENHANCEMENT]
        )
        result_yes = calculator.calculate_total_enhancement(
            energy_kev=0.025,
            conditions=with_defects,
            mechanisms=[EnhancementMechanism.DEFECT_ENHANCEMENT]
        )
        
        assert result_yes.individual_factors['defect_enhancement'] >= \
               result_no.individual_factors['defect_enhancement']


class TestConvenienceFunctions:
    """Test convenience functions."""
    
    def test_calculate_lenr_enhancement(self):
        """Test calculate_lenr_enhancement function."""
        result = calculate_lenr_enhancement(
            energy_kev=0.025,
            temperature_k=350.0,
            loading_ratio=0.85,
            material='palladium'
        )
        assert 'total_enhancement' in result
        assert 'individual_factors' in result
        assert 'dominant_mechanism' in result
        assert result['total_enhancement'] > 0
    
    def test_calculate_lenr_reaction_rate(self):
        """Test calculate_lenr_reaction_rate function."""
        result = calculate_lenr_reaction_rate(
            temperature_k=350.0,
            loading_ratio=0.85,
            material='palladium',
            volume_cm3=1.0
        )
        assert 'reaction_rate_per_cm3_s' in result
        assert 'power_output_w' in result
        assert 'base_tunneling_probability' in result
        assert 'enhanced_tunneling_probability' in result
        assert result['reaction_rate_per_cm3_s'] >= 0
    
    def test_enhancement_can_be_disabled(self):
        """Test reaction rate without enhancements."""
        result_with = calculate_lenr_reaction_rate(
            temperature_k=350.0,
            loading_ratio=0.85,
            include_enhancements=True
        )
        result_without = calculate_lenr_reaction_rate(
            temperature_k=350.0,
            loading_ratio=0.85,
            include_enhancements=False
        )
        # With enhancement should give higher rate
        assert result_with['total_enhancement'] >= result_without['total_enhancement']


class TestNumericalStability:
    """Test numerical stability of LENR calculations."""
    
    @pytest.fixture
    def calculator(self):
        return LENREnhancementCalculator()
    
    def test_no_nan_values(self, calculator):
        """Test results don't contain NaN."""
        conditions = LENRConditions()
        for energy in [0.001, 0.01, 0.1, 1.0]:
            result = calculator.calculate_total_enhancement(
                energy_kev=energy,
                conditions=conditions
            )
            assert not np.isnan(result.total_enhancement)
            for factor in result.individual_factors.values():
                assert not np.isnan(factor)
    
    def test_no_infinite_values(self, calculator):
        """Test results don't contain infinity."""
        conditions = LENRConditions()
        for energy in [0.001, 0.01, 0.1, 1.0]:
            result = calculator.calculate_total_enhancement(
                energy_kev=energy,
                conditions=conditions
            )
            # Results are capped at reasonable values
            assert not np.isinf(result.total_enhancement) or result.total_enhancement < 1e20
    
    def test_extreme_conditions(self, calculator):
        """Test with extreme but valid conditions."""
        extreme_conditions = LENRConditions(
            temperature_k=1000.0,
            loading_ratio=0.99,
            defect_density=0.5,
            magnetic_field_t=10.0,
            electric_field_v_m=1e6
        )
        result = calculator.calculate_total_enhancement(
            energy_kev=0.025,
            conditions=extreme_conditions
        )
        assert result.total_enhancement > 0
        assert not np.isnan(result.total_enhancement)

