"""
Tests for numerical stability of LENR physics calculations
"""

import unittest
import numpy as np
import sys
import os

# Add the backend directory to the path so we can import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from app.physics.quantum_tunneling import (
    calculate_tunneling_probability,
    calculate_gamow_factor,
    calculate_enhanced_tunneling
)
from app.physics.phonon_modes import (
    LatticeParameters,
    calculate_phonon_assisted_tunneling,
    calculate_coherent_phonon_tunneling,
    calculate_comprehensive_phonon_enhancement
)
from app.physics.potential_models import calculate_coulomb_barrier
from app.physics.tunneling_engine import calculate_integrated_tunneling
from app.physics.integrated_mechanisms import (
    IntegratedSimulationParameters,
    simulate_reaction_at_energy
)


class TestNumericalStability(unittest.TestCase):
    """Test numerical stability of physics calculations"""
    
    def test_tunneling_probability_edge_cases(self):
        """Test tunneling probability calculation with edge cases"""
        # Test with zero energy
        prob_zero = calculate_tunneling_probability(
            energy=0.0,
            potential_barrier=100.0,
            barrier_width=1e-10
        )
        self.assertGreaterEqual(prob_zero, 0.0)
        self.assertLessEqual(prob_zero, 1.0)
        
        # Test with energy equal to barrier
        prob_equal = calculate_tunneling_probability(
            energy=100.0,
            potential_barrier=100.0,
            barrier_width=1e-10
        )
        self.assertEqual(prob_equal, 1.0)
        
        # Test with extreme barrier width
        prob_wide = calculate_tunneling_probability(
            energy=10.0,
            potential_barrier=100.0,
            barrier_width=1e-8  # Very wide barrier
        )
        self.assertGreaterEqual(prob_wide, 0.0)
        self.assertLessEqual(prob_wide, 1.0)
        
        # Test with extremely small barrier width
        prob_narrow = calculate_tunneling_probability(
            energy=10.0,
            potential_barrier=100.0,
            barrier_width=1e-15  # Very narrow barrier
        )
        self.assertGreaterEqual(prob_narrow, 0.0)
        self.assertLessEqual(prob_narrow, 1.0)

    def test_gamow_factor_edge_cases(self):
        """Test Gamow factor calculation with edge cases"""
        import scipy.constants as const
        
        # Test with extremely low energy
        gamow_low = calculate_gamow_factor(
            z1=1,
            z2=1,
            reduced_mass=const.m_p/2,  # Reduced mass of d-d
            energy=1e-10
        )
        self.assertFalse(np.isnan(gamow_low))
        self.assertFalse(np.isinf(gamow_low))
        
        # Test with very high charges
        gamow_high_z = calculate_gamow_factor(
            z1=92,  # Uranium
            z2=92,  # Uranium
            reduced_mass=238 * const.u,
            energy=1.0
        )
        self.assertFalse(np.isnan(gamow_high_z))
        self.assertFalse(np.isinf(gamow_high_z))

    def test_enhanced_tunneling_edge_cases(self):
        """Test enhanced tunneling calculation with edge cases"""
        # Test with extreme enhancement
        prob = calculate_enhanced_tunneling(
            standard_probability=1e-30,
            enhancement_factors={
                "electron_screening": 1e15,
                "lattice_oscillation": 1e15,
                "resonant_tunneling": 1e15
            }
        )
        self.assertGreaterEqual(prob, 0.0)
        self.assertLessEqual(prob, 1.0)
        
        # Test with zero standard probability
        prob_zero = calculate_enhanced_tunneling(
            standard_probability=0.0,
            enhancement_factors={
                "electron_screening": 1e10,
                "lattice_oscillation": 1e10,
                "resonant_tunneling": 1e10
            }
        )
        self.assertEqual(prob_zero, 0.0)

    def test_phonon_calculations_edge_cases(self):
        """Test phonon-related calculations with edge cases"""
        # Create extreme lattice parameters
        extreme_params = LatticeParameters(
            lattice_type="fcc",
            lattice_constant=1e-12,  # Extremely small
            debye_temperature=1e-6,  # Extremely small
            temperature=1e-6,  # Extremely small
            has_loading=True,
            loading_element="H",
            loading_ratio=0.0  # Zero loading
        )
        
        # Test phonon-assisted tunneling
        phonon_result = calculate_phonon_assisted_tunneling(
            params=extreme_params,
            incident_energy_ev=1e-10,
            barrier_height_ev=1e10,
            barrier_width=1e-15
        )
        
        # Check results are valid numbers
        self.assertFalse(np.isnan(phonon_result["base_probability"]))
        self.assertFalse(np.isnan(phonon_result["enhanced_probability"]))
        self.assertFalse(np.isnan(phonon_result["enhancement_factor"]))
        
        # Check they are in valid ranges
        self.assertGreaterEqual(phonon_result["base_probability"], 0.0)
        self.assertLessEqual(phonon_result["base_probability"], 1.0)
        self.assertGreaterEqual(phonon_result["enhanced_probability"], 0.0)
        self.assertLessEqual(phonon_result["enhanced_probability"], 1.0)
        self.assertGreaterEqual(phonon_result["enhancement_factor"], 1.0)

    def test_integrated_mechanisms_edge_cases(self):
        """Test integrated mechanisms with edge cases"""
        # Create parameters with extreme conditions
        params = IntegratedSimulationParameters(
            reaction_name="d-d",
            projectile_z=1,
            projectile_a=2,
            target_z=1,
            target_a=2,
            temperature=1e-3,  # Extremely low temperature
            pressure=1e12,  # Extremely high pressure
            electric_field=1e12,  # Extremely high field
            lattice_constant=1e-12,  # Extremely small lattice
            debye_temperature=1.0,  # Extremely low Debye temperature
            loading_ratio=1e-6  # Extremely low loading
        )
        
        # Test simulation at extremely low energy
        result = simulate_reaction_at_energy(params, 1e-10)
        
        # Check key results
        self.assertFalse(np.isnan(result["tunneling"]["base_probability"]))
        self.assertFalse(np.isnan(result["tunneling"]["enhanced_probability"]))
        self.assertFalse(np.isnan(result["reaction_rate"]["power_density_w_m3"]))
        
        # Test simulation at extremely high energy
        result_high = simulate_reaction_at_energy(params, 1e6)
        
        # Check key results
        self.assertFalse(np.isnan(result_high["tunneling"]["base_probability"]))
        self.assertFalse(np.isnan(result_high["tunneling"]["enhanced_probability"]))
        self.assertFalse(np.isnan(result_high["reaction_rate"]["power_density_w_m3"]))

    def test_error_handling(self):
        """Test error handling in calculations"""
        # Test handling of invalid inputs
        # These should raise warnings/errors or return fallback values
        
        # Test with negative energy
        prob_neg = calculate_tunneling_probability(
            energy=-10.0,
            potential_barrier=100.0,
            barrier_width=1e-10
        )
        self.assertGreaterEqual(prob_neg, 0.0)
        self.assertLessEqual(prob_neg, 1.0)
        
        # Test with negative barrier
        prob_neg_barrier = calculate_tunneling_probability(
            energy=10.0,
            potential_barrier=-100.0,
            barrier_width=1e-10
        )
        self.assertGreaterEqual(prob_neg_barrier, 0.0)
        self.assertLessEqual(prob_neg_barrier, 1.0)
        
        # Test with negative barrier width
        prob_neg_width = calculate_tunneling_probability(
            energy=10.0,
            potential_barrier=100.0,
            barrier_width=-1e-10
        )
        self.assertGreaterEqual(prob_neg_width, 0.0)
        self.assertLessEqual(prob_neg_width, 1.0)
        
        # Test Gamow factor with invalid inputs
        import scipy.constants as const
        
        # Test with negative energy
        gamow_neg = calculate_gamow_factor(
            z1=1,
            z2=1,
            reduced_mass=const.m_p/2,
            energy=-1.0
        )
        self.assertFalse(np.isnan(gamow_neg))
        self.assertFalse(np.isinf(gamow_neg))
        
        # Test with negative Z
        gamow_neg_z = calculate_gamow_factor(
            z1=-1,
            z2=1,
            reduced_mass=const.m_p/2,
            energy=1.0
        )
        self.assertFalse(np.isnan(gamow_neg_z))
        self.assertFalse(np.isinf(gamow_neg_z))
        
        # Test with zero reduced mass
        gamow_zero_mass = calculate_gamow_factor(
            z1=1,
            z2=1,
            reduced_mass=0.0,
            energy=1.0
        )
        self.assertFalse(np.isnan(gamow_zero_mass))
        self.assertFalse(np.isinf(gamow_zero_mass))

    def test_consistency(self):
        """Test consistency of results across methods"""
        import scipy.constants as const
        
        # Parameters common to multiple calculations
        z1, z2 = 1, 1
        reduced_mass = const.m_p / 2
        energy_ev = 100.0
        
        # Calculate barrier using different methods
        barrier_ev = calculate_coulomb_barrier(z1, z2)
        
        # Calculate tunneling probability directly
        prob_direct = calculate_tunneling_probability(
            energy=energy_ev,
            potential_barrier=barrier_ev,
            barrier_width=1e-10,
            particle_mass=reduced_mass
        )
        
        # Calculate via integrated tunneling
        tunneling_result = calculate_integrated_tunneling(
            z1=z1,
            z2=z2,
            a1=2,
            a2=2,
            energy_kev=energy_ev / 1000,
            temperature=300.0,
            barrier_width=1e-10,
            include_phonons=False,
            include_coherent=False,
            include_electron_screening=False
        )
        
        # Base probabilities should be similar (not exactly equal due to implementation differences)
        # but should be within an order of magnitude
        ratio = tunneling_result["base_probability"] / prob_direct if prob_direct > 0 else 1.0
        self.assertTrue(0.1 < ratio < 10.0 or (prob_direct < 1e-10 and tunneling_result["base_probability"] < 1e-10))

    def test_range_invariance(self):
        """Test that calculations work across many orders of magnitude"""
        # Create an array of energies spanning many orders of magnitude
        energies = np.logspace(-6, 6, 13)  # 10^-6 to 10^6 eV
        
        for energy in energies:
            # Calculate tunneling probabilities
            prob = calculate_tunneling_probability(
                energy=energy,
                potential_barrier=1e6,  # Fixed barrier
                barrier_width=1e-10
            )
            
            # Check valid range
            self.assertGreaterEqual(prob, 0.0)
            self.assertLessEqual(prob, 1.0)
            
            # For energies above barrier, probability should be 1.0
            if energy >= 1e6:
                self.assertEqual(prob, 1.0)


if __name__ == '__main__':
    unittest.main() 