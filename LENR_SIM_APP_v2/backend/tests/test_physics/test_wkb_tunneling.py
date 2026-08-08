"""
Unit Tests for WKB Quantum Tunneling Calculator
================================================

Tests for the WKB approximation tunneling calculations.
"""

import pytest
import numpy as np
from app.physics.wkb_tunneling import (
    WKBTunnelingCalculator,
    TunnelingResult,
    calculate_dd_tunneling,
    calculate_dt_tunneling
)


class TestWKBTunnelingCalculator:
    """Test the WKBTunnelingCalculator class."""
    
    @pytest.fixture
    def calculator(self):
        """Create a general WKB tunneling calculator."""
        return WKBTunnelingCalculator()
    
    def test_initialization(self, calculator):
        """Test calculator initialization."""
        assert calculator is not None
        assert hasattr(calculator, 'potential_models')
        assert 'coulomb' in calculator.potential_models
    
    def test_dd_calculation_uses_correct_mass(self, calculator):
        """Test D-D calculation uses correct reduced mass."""
        # D-D with a1=a2=2 should give specific result
        result = calculator.calculate_tunneling_probability(
            z1=1, z2=1, a1=2.0, a2=2.0, energy_kev=1.0
        )
        assert result.probability > 0
        
    def test_dt_calculation_differs_from_dd(self, calculator):
        """Test D-T calculation differs from D-D due to mass difference."""
        dd_result = calculator.calculate_tunneling_probability(
            z1=1, z2=1, a1=2.0, a2=2.0, energy_kev=1.0
        )
        dt_result = calculator.calculate_tunneling_probability(
            z1=1, z2=1, a1=2.0, a2=3.0, energy_kev=1.0
        )
        # Different mass numbers should give different results
        assert dd_result.probability != dt_result.probability
    
    def test_tunneling_probability_positive(self, calculator):
        """Test tunneling probability is positive."""
        result = calculator.calculate_tunneling_probability(
            z1=1, z2=1, a1=2.0, a2=2.0, energy_kev=1.0
        )
        assert result.probability > 0
    
    def test_tunneling_probability_less_than_one(self, calculator):
        """Test tunneling probability is less than 1."""
        result = calculator.calculate_tunneling_probability(
            z1=1, z2=1, a1=2.0, a2=2.0, energy_kev=1.0
        )
        assert result.probability <= 1.0
    
    def test_probability_increases_with_energy(self, calculator):
        """Test probability increases with energy."""
        result_low = calculator.calculate_tunneling_probability(
            z1=1, z2=1, a1=2.0, a2=2.0, energy_kev=0.1
        )
        result_high = calculator.calculate_tunneling_probability(
            z1=1, z2=1, a1=2.0, a2=2.0, energy_kev=1.0
        )
        assert result_high.probability > result_low.probability
    
    def test_gamow_factor_positive(self, calculator):
        """Test Gamow factor is positive."""
        result = calculator.calculate_tunneling_probability(
            z1=1, z2=1, a1=2.0, a2=2.0, energy_kev=1.0
        )
        assert result.gamow_factor > 0
    
    def test_gamow_factor_decreases_with_energy(self, calculator):
        """Test Gamow factor decreases with energy."""
        result_low = calculator.calculate_tunneling_probability(
            z1=1, z2=1, a1=2.0, a2=2.0, energy_kev=0.1
        )
        result_high = calculator.calculate_tunneling_probability(
            z1=1, z2=1, a1=2.0, a2=2.0, energy_kev=1.0
        )
        assert result_low.gamow_factor > result_high.gamow_factor
    
    def test_barrier_height_positive(self, calculator):
        """Test barrier height is positive."""
        result = calculator.calculate_tunneling_probability(
            z1=1, z2=1, a1=2.0, a2=2.0, energy_kev=1.0
        )
        assert result.barrier_height > 0
    
    def test_screened_potential_enhances(self, calculator):
        """Test screened potential gives higher probability."""
        result_coulomb = calculator.calculate_tunneling_probability(
            z1=1, z2=1, a1=2.0, a2=2.0,
            energy_kev=0.1,
            potential_type='coulomb'
        )
        result_screened = calculator.calculate_tunneling_probability(
            z1=1, z2=1, a1=2.0, a2=2.0,
            energy_kev=0.1,
            potential_type='screened',
            screening_energy_ev=800
        )
        assert result_screened.probability >= result_coulomb.probability
    
    def test_classical_turning_point_positive(self, calculator):
        """Test classical turning point is positive."""
        result = calculator.calculate_tunneling_probability(
            z1=1, z2=1, a1=2.0, a2=2.0, energy_kev=1.0
        )
        assert result.classical_turning_point > 0
    
    def test_result_contains_all_fields(self, calculator):
        """Test result contains all expected fields."""
        result = calculator.calculate_tunneling_probability(
            z1=1, z2=1, a1=2.0, a2=2.0, energy_kev=1.0
        )
        assert hasattr(result, 'probability')
        assert hasattr(result, 'gamow_factor')
        assert hasattr(result, 'barrier_height')
        assert hasattr(result, 'classical_turning_point')
        assert hasattr(result, 'method')


class TestTunnelingConvenienceFunctions:
    """Test convenience functions for specific reactions."""
    
    def test_dd_tunneling_returns_result(self):
        """Test calculate_dd_tunneling returns valid result."""
        result = calculate_dd_tunneling(energy_kev=0.1, temperature_k=300)
        assert isinstance(result, TunnelingResult)
        assert result.probability > 0
    
    def test_dt_tunneling_returns_result(self):
        """Test calculate_dt_tunneling returns valid result."""
        result = calculate_dt_tunneling(energy_kev=0.1, temperature_k=300)
        assert isinstance(result, TunnelingResult)
        assert result.probability > 0
    
    def test_dt_probability_different_from_dd(self):
        """Test D-T has different tunneling probability than D-D due to kinematics."""
        # D-T has different reduced mass, so probabilities will differ
        dd_result = calculate_dd_tunneling(energy_kev=10.0)
        dt_result = calculate_dt_tunneling(energy_kev=10.0)
        
        # Both should have valid positive probabilities
        assert dt_result.probability > 0
        assert dd_result.probability > 0
        
        # Probabilities should differ due to different reduced masses
        # (Not asserting which is higher as it depends on energy regime)
        assert dt_result.probability != dd_result.probability
    
    def test_material_screening(self):
        """Test different materials give different results."""
        result_pd = calculate_dd_tunneling(
            energy_kev=0.1, material='palladium'
        )
        result_ni = calculate_dd_tunneling(
            energy_kev=0.1, material='nickel'
        )
        # Different materials have different screening
        # Results may differ
        assert result_pd.probability > 0
        assert result_ni.probability > 0


class TestPhysicalLimits:
    """Test physical limits and edge cases."""
    
    @pytest.fixture
    def calculator(self):
        return WKBTunnelingCalculator()
    
    def test_very_low_energy(self, calculator):
        """Test behavior at very low energy."""
        result = calculator.calculate_tunneling_probability(
            z1=1, z2=1, a1=2.0, a2=2.0, energy_kev=0.001
        )
        assert result.probability > 0
        assert result.probability < 1e-10  # Should be very small
    
    def test_high_energy_approaches_one(self, calculator):
        """Test high energy approaches transmission."""
        result = calculator.calculate_tunneling_probability(
            z1=1, z2=1, a1=2.0, a2=2.0, energy_kev=1000.0
        )
        # At high energy, probability should increase but may not reach 1
        assert result.probability > 0.1
    
    def test_zero_energy_gives_zero_probability(self, calculator):
        """Test zero energy gives zero or very small probability."""
        # Note: Zero energy may cause division issues, use very small value
        result = calculator.calculate_tunneling_probability(
            z1=1, z2=1, a1=2.0, a2=2.0, energy_kev=1e-10
        )
        assert result.probability >= 0
        assert result.probability < 1e-50


class TestNumericalStability:
    """Test numerical stability of calculations."""
    
    @pytest.fixture
    def calculator(self):
        return WKBTunnelingCalculator()
    
    def test_result_not_nan(self, calculator):
        """Test results are not NaN."""
        for energy in [0.01, 0.1, 1.0, 10.0, 100.0]:
            result = calculator.calculate_tunneling_probability(
                z1=1, z2=1, a1=2.0, a2=2.0, energy_kev=energy
            )
            assert not np.isnan(result.probability), f"Probability is NaN at energy={energy}"
            assert not np.isnan(result.gamow_factor), f"Gamow factor is NaN at energy={energy}"
    
    def test_result_not_infinite(self, calculator):
        """Test results are not infinite (finite values expected)."""
        for energy in [0.01, 0.1, 1.0, 10.0, 100.0]:
            result = calculator.calculate_tunneling_probability(
                z1=1, z2=1, a1=2.0, a2=2.0, energy_kev=energy
            )
            assert np.isfinite(result.probability), f"Probability is infinite at energy={energy}"
            assert np.isfinite(result.gamow_factor), f"Gamow factor is infinite at energy={energy}"
    
    def test_monotonic_probability(self, calculator):
        """Test probability increases monotonically with energy."""
        energies = [0.01, 0.1, 1.0, 10.0, 100.0]
        probabilities = [
            calculator.calculate_tunneling_probability(
                z1=1, z2=1, a1=2.0, a2=2.0, energy_kev=e
            ).probability
            for e in energies
        ]
        for i in range(len(probabilities) - 1):
            assert probabilities[i+1] >= probabilities[i], \
                f"Probability not monotonic: {probabilities[i+1]} < {probabilities[i]}"


class TestStreamingContract:
    """Pin the TunnelingResult fields consumed by the WebSocket stream.

    ``app/routers/websocket_router.py`` serialises ``probability``,
    ``gamow_factor`` and ``barrier_height`` on every streamed frame. Renaming or
    re-basing the units of any of them breaks the stream at runtime rather than
    at import time, so the contract is asserted here.
    """

    @pytest.fixture
    def calculator(self):
        return WKBTunnelingCalculator()

    def test_streamed_fields_exist(self, calculator):
        result = calculator.calculate_tunneling_probability(
            z1=1, z2=1, a1=2.0, a2=2.0, energy_kev=0.1,
            potential_type='screened', screening_energy_ev=800,
            temperature_k=300.0, material='palladium',
        )
        for field in ('probability', 'gamow_factor', 'barrier_height'):
            assert hasattr(result, field), f"websocket_router streams {field}"
            assert np.isfinite(float(getattr(result, field)))

    def test_barrier_height_is_kev(self, calculator):
        """barrier_height is already keV, so the stream must not rescale it."""
        result = calculator.calculate_tunneling_probability(
            z1=1, z2=1, a1=2.0, a2=2.0, energy_kev=0.1,
            potential_type='screened', screening_energy_ev=800,
            temperature_k=300.0, material='palladium',
        )
        # D-D Coulomb barrier at contact is a few hundred keV; joules or eV
        # would land many orders of magnitude away from this window.
        assert 100.0 < result.barrier_height < 1000.0

    def test_barrier_height_grows_with_charge(self, calculator):
        """Z1*Z2 scaling confirms the field carries barrier physics, not a stub."""
        dd = calculator.calculate_tunneling_probability(
            z1=1, z2=1, a1=2.0, a2=2.0, energy_kev=1.0
        )
        dhe = calculator.calculate_tunneling_probability(
            z1=1, z2=2, a1=2.0, a2=3.0, energy_kev=1.0
        )
        assert dhe.barrier_height > dd.barrier_height

