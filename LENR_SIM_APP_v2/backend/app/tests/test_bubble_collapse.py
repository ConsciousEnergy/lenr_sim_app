"""
Unit tests for Bubble-Lattice Interaction Physics

Tests validate:
1. Rayleigh-Plesset dynamics
2. Bubble collapse conditions
3. Double-layer field evolution
4. Proton phase transitions
5. Enhancement factor calculations
"""

import pytest
import numpy as np
from typing import Dict, Any

# Import the module under test
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from app.physics_engine.bubble_lattice_interaction import (
    BubbleLatticeInteraction,
    BubbleParameters,
    LatticeParameters,
    CollapseResult,
    create_bubble_lattice_simulation,
)


class TestBubbleParameters:
    """Test BubbleParameters dataclass."""
    
    def test_default_parameters(self):
        """Test default parameter values are physically reasonable."""
        params = BubbleParameters()
        
        # Check default values
        assert params.initial_radius == 10e-6  # 10 μm
        assert params.ambient_pressure == 101325.0  # 1 atm
        assert params.frequency == 20e3  # 20 kHz
        assert params.ambient_temperature == 298.0  # Room temperature
        
        # Check fluid properties (water)
        assert params.fluid_density == 998.0
        assert params.surface_tension == 0.0728
        assert params.dynamic_viscosity == 1.002e-3
    
    def test_custom_parameters(self):
        """Test setting custom parameters."""
        params = BubbleParameters(
            initial_radius=5e-6,
            driving_pressure=2e5,
            frequency=40e3,
        )
        
        assert params.initial_radius == 5e-6
        assert params.driving_pressure == 2e5
        assert params.frequency == 40e3


class TestLatticeParameters:
    """Test LatticeParameters dataclass."""
    
    def test_default_parameters(self):
        """Test default lattice parameters."""
        params = LatticeParameters()
        
        assert params.host_material == "palladium"
        assert params.loading_ratio == 0.9
        assert params.lattice_constant == 3.89e-10  # Pd lattice constant
        assert params.electron_density == 6.8e28
    
    def test_custom_material(self):
        """Test setting custom material parameters."""
        params = LatticeParameters(
            host_material="nickel",
            loading_ratio=0.85,
            lattice_constant=3.52e-10,
        )
        
        assert params.host_material == "nickel"
        assert params.loading_ratio == 0.85
        assert params.lattice_constant == 3.52e-10


class TestBubbleLatticeInteraction:
    """Test BubbleLatticeInteraction class."""
    
    @pytest.fixture
    def model(self) -> BubbleLatticeInteraction:
        """Create a standard model for testing."""
        return BubbleLatticeInteraction()
    
    @pytest.fixture
    def high_pressure_model(self) -> BubbleLatticeInteraction:
        """Create a high-pressure model for testing extreme conditions."""
        bubble_params = BubbleParameters(
            driving_pressure=3e5,  # 3 bar
            frequency=30e3,
        )
        return BubbleLatticeInteraction(bubble_params)
    
    # =========================================================================
    # Rayleigh-Plesset Dynamics Tests
    # =========================================================================
    
    def test_rayleigh_plesset_rhs_shape(self, model: BubbleLatticeInteraction):
        """Test Rayleigh-Plesset ODE returns correct shape."""
        y = np.array([model.bubble.initial_radius, 0.0])
        t = 0.0
        
        result = model.rayleigh_plesset_rhs(y, t)
        
        assert result.shape == (2,), f"Expected shape (2,), got {result.shape}"
    
    def test_rayleigh_plesset_initial_acceleration(self, model: BubbleLatticeInteraction):
        """Test initial acceleration depends on pressure difference."""
        y = np.array([model.bubble.initial_radius, 0.0])
        
        # At t=0, acoustic pressure starts at 0, so acceleration should be small
        result_t0 = model.rayleigh_plesset_rhs(y, 0.0)
        
        # At t=T/4 (quarter cycle), acoustic pressure is maximum
        T = 1.0 / model.bubble.frequency
        result_t_quarter = model.rayleigh_plesset_rhs(y, T/4)
        
        # Acceleration magnitude should differ based on acoustic phase
        assert result_t0[1] != result_t_quarter[1], \
            "Acceleration should vary with acoustic phase"
    
    def test_rayleigh_plesset_singularity_protection(self, model: BubbleLatticeInteraction):
        """Test that very small radius doesn't cause numerical issues."""
        y_small = np.array([1e-12, 0.0])  # Very small radius
        t = 0.0
        
        result = model.rayleigh_plesset_rhs(y_small, t)
        
        assert np.isfinite(result).all(), \
            f"Result contains non-finite values: {result}"
    
    # =========================================================================
    # Bubble Collapse Simulation Tests
    # =========================================================================
    
    def test_simulate_collapse_returns_result(self, model: BubbleLatticeInteraction):
        """Test that simulation returns a CollapseResult."""
        result = model.simulate_collapse(num_cycles=1)
        
        assert isinstance(result, CollapseResult)
    
    def test_collapse_result_structure(self, model: BubbleLatticeInteraction):
        """Test CollapseResult contains all expected fields."""
        result = model.simulate_collapse(num_cycles=1)
        
        # Check time series
        assert len(result.time_series) > 0
        assert len(result.radius_series) == len(result.time_series)
        assert len(result.velocity_series) == len(result.time_series)
        
        # Check peak conditions
        assert result.min_radius > 0
        assert result.max_temperature > 0
        assert result.max_pressure > 0
        assert result.collapse_time >= 0
        assert result.compression_ratio >= 1
        
        # Check LENR outputs
        assert result.double_layer_field_peak > 0
        assert result.enhancement_factor >= 1
        assert isinstance(result.proton_phase_distribution, dict)
    
    def test_compression_ratio_physical(self, model: BubbleLatticeInteraction):
        """Test compression ratio is physically reasonable."""
        result = model.simulate_collapse(num_cycles=2)
        
        # Typical sonoluminescence compression ratios are 10-100
        # Our model may have different values, but should be > 1
        assert result.compression_ratio > 1, \
            f"Compression ratio {result.compression_ratio} should be > 1"
        
        # And not unreasonably high (avoid numerical issues)
        assert result.compression_ratio < 1e7, \
            f"Compression ratio {result.compression_ratio} unreasonably high"
    
    def test_minimum_radius_positive(self, model: BubbleLatticeInteraction):
        """Test minimum radius is always positive."""
        result = model.simulate_collapse(num_cycles=2)
        
        assert result.min_radius > 0, \
            f"Minimum radius {result.min_radius} should be positive"
        assert result.min_radius < model.bubble.initial_radius, \
            "Minimum radius should be less than initial radius"
    
    def test_max_temperature_reasonable(self, model: BubbleLatticeInteraction):
        """Test maximum temperature is within physical bounds."""
        result = model.simulate_collapse(num_cycles=2)
        
        # Temperature should increase during collapse (adiabatic heating)
        assert result.max_temperature > model.bubble.ambient_temperature, \
            "Max temperature should exceed ambient"
        
        # Sonoluminescence temperatures can reach ~15,000 K
        # With our parameters, we expect some heating
        assert result.max_temperature < 1e9, \
            f"Max temperature {result.max_temperature} K unreasonably high"
    
    def test_collapse_time_positive(self, model: BubbleLatticeInteraction):
        """Test collapse time is positive."""
        result = model.simulate_collapse(num_cycles=2)
        
        assert result.collapse_time > 0, \
            f"Collapse time {result.collapse_time} should be positive"
    
    # =========================================================================
    # Electric Field Tests
    # =========================================================================
    
    def test_double_layer_field_intensifies(self, model: BubbleLatticeInteraction):
        """Test double-layer electric field intensifies during collapse."""
        result = model.simulate_collapse(num_cycles=2)
        
        # Field should be higher at collapse than initial
        initial_field = model.bubble.double_layer_field
        
        assert result.double_layer_field_peak > initial_field, \
            f"Peak field {result.double_layer_field_peak} should exceed initial {initial_field}"
    
    def test_field_scales_with_compression(self, model: BubbleLatticeInteraction):
        """Test field intensity scales with compression ratio."""
        result = model.simulate_collapse(num_cycles=2)
        
        # E ∝ (R0/R)^2 = compression^2
        expected_field = model.bubble.double_layer_field * result.compression_ratio**2
        
        # Should be within order of magnitude (capping may apply)
        ratio = result.double_layer_field_peak / expected_field
        assert 0.01 < ratio < 100, \
            f"Field scaling ratio {ratio} outside expected range"
    
    # =========================================================================
    # Proton Phase Distribution Tests
    # =========================================================================
    
    def test_proton_phases_sum_to_one(self, model: BubbleLatticeInteraction):
        """Test proton phase distribution sums to 1.0."""
        result = model.simulate_collapse(num_cycles=2)
        
        total = sum(result.proton_phase_distribution.values())
        
        assert abs(total - 1.0) < 0.01, \
            f"Proton phases sum to {total}, expected 1.0"
    
    def test_proton_phases_all_positive(self, model: BubbleLatticeInteraction):
        """Test all proton phase fractions are non-negative."""
        result = model.simulate_collapse(num_cycles=2)
        
        for phase, fraction in result.proton_phase_distribution.items():
            assert fraction >= 0, \
                f"Phase {phase} has negative fraction {fraction}"
    
    def test_proton_phases_contain_expected_states(self, model: BubbleLatticeInteraction):
        """Test proton distribution contains expected state names."""
        result = model.simulate_collapse(num_cycles=2)
        
        expected_states = {'FREE', 'SCREENED', 'CAPTURE_READY', 'NUCLEAR'}
        actual_states = set(result.proton_phase_distribution.keys())
        
        assert actual_states == expected_states, \
            f"Expected states {expected_states}, got {actual_states}"
    
    def test_high_enhancement_increases_nuclear_phase(self, high_pressure_model: BubbleLatticeInteraction):
        """Test higher enhancement increases NUCLEAR phase fraction."""
        result = high_pressure_model.simulate_collapse(num_cycles=2)
        
        # With high pressure driving, should see some NUCLEAR phase
        nuclear_fraction = result.proton_phase_distribution.get('NUCLEAR', 0)
        
        # At high enhancement, NUCLEAR phase should be non-zero
        if result.enhancement_factor > 1e5:
            assert nuclear_fraction > 0, \
                f"Expected NUCLEAR phase > 0 at enhancement {result.enhancement_factor}"
    
    # =========================================================================
    # Enhancement Factor Tests
    # =========================================================================
    
    def test_enhancement_factor_minimum(self, model: BubbleLatticeInteraction):
        """Test enhancement factor is at least 1.0."""
        result = model.simulate_collapse(num_cycles=2)
        
        assert result.enhancement_factor >= 1.0, \
            f"Enhancement {result.enhancement_factor} should be >= 1.0"
    
    def test_enhancement_factor_not_infinite(self, model: BubbleLatticeInteraction):
        """Test enhancement factor is finite."""
        result = model.simulate_collapse(num_cycles=2)
        
        assert np.isfinite(result.enhancement_factor), \
            f"Enhancement factor {result.enhancement_factor} is not finite"
    
    def test_enhancement_capped(self, high_pressure_model: BubbleLatticeInteraction):
        """Test enhancement factor is capped at reasonable value."""
        result = high_pressure_model.simulate_collapse(num_cycles=2)
        
        # Should be capped at 1e8 per model design
        assert result.enhancement_factor <= 1e8, \
            f"Enhancement {result.enhancement_factor} exceeds cap of 1e8"
    
    # =========================================================================
    # Collapse Phase Tests
    # =========================================================================
    
    def test_get_collapse_phases_expansion(self, model: BubbleLatticeInteraction):
        """Test EXPANSION phase at beginning of cycle."""
        phase, conditions = model.get_collapse_phases(0.0)
        
        assert phase == 'EXPANSION', f"Expected EXPANSION at t=0, got {phase}"
        assert conditions['radius_factor'] >= 1.0
        assert not conditions['is_critical']
    
    def test_get_collapse_phases_collapse(self, model: BubbleLatticeInteraction):
        """Test COLLAPSE phase during compression."""
        phase, conditions = model.get_collapse_phases(0.5)
        
        assert phase == 'COLLAPSE', f"Expected COLLAPSE at t=0.5, got {phase}"
        assert conditions['is_critical']
    
    def test_get_collapse_phases_minimum(self, model: BubbleLatticeInteraction):
        """Test MINIMUM phase at maximum compression."""
        phase, conditions = model.get_collapse_phases(0.57)
        
        assert phase == 'MINIMUM', f"Expected MINIMUM at t=0.57, got {phase}"
        assert conditions['is_critical']
        assert conditions['radius_factor'] < 0.5
    
    def test_get_collapse_phases_rebound(self, model: BubbleLatticeInteraction):
        """Test REBOUND phase after minimum."""
        phase, conditions = model.get_collapse_phases(0.65)
        
        assert phase == 'REBOUND', f"Expected REBOUND at t=0.65, got {phase}"
    
    def test_get_collapse_phases_recovery(self, model: BubbleLatticeInteraction):
        """Test RECOVERY phase at end of cycle."""
        phase, conditions = model.get_collapse_phases(0.9)
        
        assert phase == 'RECOVERY', f"Expected RECOVERY at t=0.9, got {phase}"
        assert not conditions['is_critical']
    
    # =========================================================================
    # Instantaneous Enhancement Tests
    # =========================================================================
    
    def test_instantaneous_enhancement_structure(self, model: BubbleLatticeInteraction):
        """Test instantaneous enhancement returns expected structure."""
        result = model.calculate_instantaneous_enhancement(0.5)
        
        assert 'phase' in result
        assert 'enhancement' in result
        assert 'proton_distribution' in result
        assert 'conditions' in result
    
    def test_instantaneous_enhancement_varies_with_time(self, model: BubbleLatticeInteraction):
        """Test enhancement varies over the cycle."""
        results = [model.calculate_instantaneous_enhancement(t) for t in [0.0, 0.3, 0.5, 0.57, 0.8]]
        enhancements = [r['enhancement'] for r in results]
        
        # Enhancement should vary (not all same)
        assert len(set(enhancements)) > 1, \
            "Enhancement should vary across cycle"
        
        # Maximum enhancement should be at or near minimum radius
        max_enhancement = max(enhancements)
        max_idx = enhancements.index(max_enhancement)
        
        # Should be during COLLAPSE or MINIMUM phase (indices 2 or 3)
        assert max_idx in [2, 3], \
            f"Max enhancement at index {max_idx}, expected during collapse"
    
    # =========================================================================
    # Factory Function Tests
    # =========================================================================
    
    def test_create_bubble_lattice_simulation_default(self):
        """Test factory function with no arguments."""
        model = create_bubble_lattice_simulation()
        
        assert isinstance(model, BubbleLatticeInteraction)
    
    def test_create_bubble_lattice_simulation_custom(self):
        """Test factory function with custom parameters."""
        model = create_bubble_lattice_simulation(
            bubble_params={'initial_radius': 20e-6, 'frequency': 30e3},
            lattice_params={'host_material': 'nickel', 'loading_ratio': 0.85}
        )
        
        assert model.bubble.initial_radius == 20e-6
        assert model.bubble.frequency == 30e3
        assert model.lattice.host_material == 'nickel'
        assert model.lattice.loading_ratio == 0.85


class TestEnhancementBreakdown:
    """Test enhancement factor breakdown calculations."""
    
    @pytest.fixture
    def model(self) -> BubbleLatticeInteraction:
        return BubbleLatticeInteraction()
    
    def test_enhancement_breakdown_components(self, model: BubbleLatticeInteraction):
        """Test enhancement breakdown contains all mechanisms."""
        breakdown = model._calculate_enhancement_breakdown(
            temperature=5000.0,
            pressure=1e8,
            electric_field=1e10,
            compression=10.0
        )
        
        expected_keys = {'total', 'screening', 'qed', 'casimir', 'rydberg', 'compression', 'loading'}
        assert set(breakdown.keys()) == expected_keys
    
    def test_enhancement_components_positive(self, model: BubbleLatticeInteraction):
        """Test all enhancement components are positive."""
        breakdown = model._calculate_enhancement_breakdown(
            temperature=5000.0,
            pressure=1e8,
            electric_field=1e10,
            compression=10.0
        )
        
        for key, value in breakdown.items():
            assert value > 0, f"Component {key} has non-positive value {value}"
    
    def test_enhancement_screening_temperature_dependence(self, model: BubbleLatticeInteraction):
        """Test screening enhancement depends on temperature."""
        breakdown_cold = model._calculate_enhancement_breakdown(
            temperature=300.0, pressure=1e5, electric_field=1e8, compression=1.0
        )
        breakdown_hot = model._calculate_enhancement_breakdown(
            temperature=10000.0, pressure=1e5, electric_field=1e8, compression=1.0
        )
        
        # Screening should differ at different temperatures
        assert breakdown_cold['screening'] != breakdown_hot['screening']
    
    def test_enhancement_loading_threshold(self, model: BubbleLatticeInteraction):
        """Test loading ratio enhancement threshold at 0.8."""
        # Model with high loading
        model_high = BubbleLatticeInteraction(
            lattice_params=LatticeParameters(loading_ratio=0.95)
        )
        model_low = BubbleLatticeInteraction(
            lattice_params=LatticeParameters(loading_ratio=0.7)
        )
        
        breakdown_high = model_high._calculate_enhancement_breakdown(
            temperature=5000.0, pressure=1e8, electric_field=1e10, compression=10.0
        )
        breakdown_low = model_low._calculate_enhancement_breakdown(
            temperature=5000.0, pressure=1e8, electric_field=1e10, compression=10.0
        )
        
        # High loading should give higher enhancement
        assert breakdown_high['loading'] > breakdown_low['loading']


# =========================================================================
# Run tests
# =========================================================================

if __name__ == '__main__':
    pytest.main([__file__, '-v'])
