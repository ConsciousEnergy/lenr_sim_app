"""
Unit tests for enhanced fusion calculations
"""

import unittest
import numpy as np
import math
from app.physics.enhanced_fusion import (
    calculate_gamow_factor,
    calculate_proximity_enhancement,
    calculate_screening_enhancement,
    calculate_fluctuation_enhancement,
    calculate_resonance_enhancement,
    calculate_quantum_enhancement,
    calculate_total_fusion_enhancement,
    estimate_observable_threshold,
    evaluate_fusion_scenario,
    FusionEnhancementFactors
)

class TestEnhancedFusion(unittest.TestCase):
    """Test the enhanced fusion calculations"""
    
    def test_gamow_factor(self):
        """Test the Gamow tunneling factor calculation"""
        # Gamow factor should decrease with distance
        r1 = 1e-10  # 1 Angstrom
        r2 = 2e-10  # 2 Angstroms
        
        gf1 = calculate_gamow_factor(r1)
        gf2 = calculate_gamow_factor(r2)
        
        # Verify that closer nuclei have higher tunneling probability
        self.assertGreater(gf1, gf2)
        
        # Verify that the Gamow factor is extremely small for D-D fusion
        self.assertLess(gf1, 1e-20)
    
    def test_proximity_enhancement(self):
        """Test proximity effects based on lattice site occupation"""
        # Test different lattice sites
        octa = calculate_proximity_enhancement("octahedral")
        tetra = calculate_proximity_enhancement("tetrahedral")
        vacancy = calculate_proximity_enhancement("vacancy")
        
        # Verify that tetrahedral sites (smaller distance) have higher enhancement
        self.assertGreater(tetra, octa)
        
        # Vacancy should have highest enhancement (molecular D2 distance)
        self.assertGreater(vacancy, tetra)
        self.assertGreater(vacancy, octa)
    
    def test_screening_enhancement(self):
        """Test electron screening enhancement"""
        # Test that higher screening potential increases enhancement
        e1 = calculate_screening_enhancement(50.0, 300)
        e2 = calculate_screening_enhancement(100.0, 300)
        
        self.assertGreater(e2, e1)
        
        # Test that lower temperature increases enhancement
        e3 = calculate_screening_enhancement(100.0, 300)
        e4 = calculate_screening_enhancement(100.0, 150)
        
        self.assertGreater(e4, e3)
    
    def test_enhancement_factors_class(self):
        """Test the FusionEnhancementFactors class"""
        factors = FusionEnhancementFactors()
        
        # Default values should all be 1.0
        self.assertEqual(factors.proximity_factor, 1.0)
        self.assertEqual(factors.screening_factor, 1.0)
        self.assertEqual(factors.fluctuation_factor, 1.0)
        self.assertEqual(factors.resonance_factor, 1.0)
        self.assertEqual(factors.quantum_factor, 1.0)
        
        # Total enhancement should be product of all factors
        self.assertEqual(factors.get_total_enhancement(), 1.0)
        
        # Set some values
        factors.proximity_factor = 10.0
        factors.screening_factor = 20.0
        
        # Check that total enhancement is correct
        self.assertEqual(factors.get_total_enhancement(), 200.0)
        
        # Enhanced rate should be baseline * enhancement
        self.assertEqual(factors.get_enhanced_rate(), factors.baseline_rate * 200.0)
        
        # String representation should not throw errors
        str_rep = str(factors)
        self.assertIsInstance(str_rep, str)
        self.assertIn("Proximity", str_rep)
        self.assertIn("Total", str_rep)
    
    def test_total_enhancement_calculation(self):
        """Test the calculation of all enhancement factors combined"""
        params = {
            "site_type": "tetrahedral",
            "lattice_constant": 3.89e-10,
            "screening_potential": 150.0,
            "temperature": 300.0,
            "displacement_amplitude": 5e-12,
            "screening_fluctuation": 0.4,
            "energy": 1.0,
            "n_coherent": 1000,
            "resonance_match": 0.9
        }
        
        factors = calculate_total_fusion_enhancement(params)
        
        # All enhancement factors should be positive
        self.assertGreater(factors.proximity_factor, 0)
        self.assertGreater(factors.screening_factor, 0)
        self.assertGreater(factors.fluctuation_factor, 0)
        self.assertGreater(factors.resonance_factor, 0)
        self.assertGreater(factors.quantum_factor, 0)
        
        # Total enhancement should be product of all individual factors
        expected_total = (
            factors.proximity_factor *
            factors.screening_factor *
            factors.fluctuation_factor *
            factors.resonance_factor *
            factors.quantum_factor
        )
        self.assertAlmostEqual(factors.get_total_enhancement(), expected_total)
    
    def test_fusion_scenario_evaluation(self):
        """Test the fusion scenario evaluation with various configurations."""
        # Test with basic parameters
        result = evaluate_fusion_scenario(
            metal="Pd",
            site_type="tetrahedral",
            temperature=300.0,
            include_resonance=True,
            include_quantum=True
        )
        
        # Check that result contains the expected keys
        self.assertIn("enhancement_factors", result)
        self.assertIn("baseline_rate", result)
        self.assertIn("enhanced_rate", result)
        self.assertIn("is_observable", result)
        
        # Check that enhancement factors are calculated properly
        self.assertGreater(result["enhancement_factors"]["proximity"], 1.0)
        self.assertGreater(result["enhancement_factors"]["screening"], 1.0)
        self.assertGreater(result["enhancement_factors"]["total"], 1.0)
        
        # Check that rates are calculated
        self.assertGreater(result["enhanced_rate"], result["baseline_rate"])
        
        # Check parameters
        self.assertEqual(result["metal"], "Pd")
        self.assertEqual(result["site_type"], "tetrahedral")
        self.assertEqual(result["temperature"], 300.0)
        
        # Test excluding certain effects
        result_no_quantum = evaluate_fusion_scenario(
            metal="Pd",
            site_type="tetrahedral",
            temperature=300.0,
            include_resonance=True,
            include_quantum=False
        )
        
        # Enhancement should be lower when quantum effects are excluded
        self.assertLess(
            result_no_quantum["enhancement_factors"]["total"],
            result["enhancement_factors"]["total"]
        )
        
        # Quantum factor should be 1.0 when excluded
        self.assertEqual(result_no_quantum["enhancement_factors"]["quantum"], 1.0)
    
    def test_observable_threshold(self):
        """Test the calculation of observable fusion threshold"""
        threshold = estimate_observable_threshold()
        
        # Threshold should be a positive number
        self.assertGreater(threshold, 0)
        
        # For typical parameters, threshold should be around 1e-50 to 1e-40
        # (100 fusions/sec in 10^22 deuteron pairs)
        self.assertLess(threshold, 1e-40)
        self.assertGreater(threshold, 1e-60)

if __name__ == "__main__":
    unittest.main() 