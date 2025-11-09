"""
Test module for the DomainInterface abstract base class
"""

import unittest
import numpy as np
from unittest.mock import Mock, patch

from app.simulation.multi_physics.interface import DomainInterface


class MockDomain(DomainInterface):
    """A concrete implementation of DomainInterface for testing"""
    
    def __init__(self):
        self.initialized = False
        self.state = {}
    
    def initialize(self, config):
        self.config = config
        self.initialized = True
    
    def advance(self, dt):
        return True
    
    def get_state(self, variable_name):
        if variable_name not in self.state:
            raise KeyError(f"Variable not found: {variable_name}")
        return self.state[variable_name]
    
    def set_state(self, variable_name, value):
        self.state[variable_name] = value
    
    def get_max_stable_timestep(self):
        return 1.0e-6
    
    def get_required_variables(self):
        return {"temperature", "pressure"}
    
    def get_provided_variables(self):
        return {"density", "velocity"}
    
    def validate_state(self):
        return True, []
    
    def get_domain_name(self):
        return "mock_domain"


class TestDomainInterface(unittest.TestCase):
    """Test case for the DomainInterface class"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.domain = MockDomain()
    
    def test_initialization(self):
        """Test the initialization method"""
        config = {"param1": 1, "param2": "test"}
        self.domain.initialize(config)
        self.assertTrue(self.domain.initialized)
        self.assertEqual(self.domain.config, config)
    
    def test_state_management(self):
        """Test state variable management"""
        test_data = np.array([1.0, 2.0, 3.0])
        
        # Set a state variable
        self.domain.set_state("test_var", test_data)
        
        # Get the state variable
        retrieved_data = self.domain.get_state("test_var")
        
        # Check that the retrieved data matches the original data
        np.testing.assert_array_equal(retrieved_data, test_data)
        
        # Test KeyError when getting non-existent variable
        with self.assertRaises(KeyError):
            self.domain.get_state("non_existent_var")
    
    def test_domain_name(self):
        """Test the domain name getter"""
        self.assertEqual(self.domain.get_domain_name(), "mock_domain")
    
    def test_required_variables(self):
        """Test getting required variables"""
        required = self.domain.get_required_variables()
        self.assertIsInstance(required, set)
        self.assertEqual(required, {"temperature", "pressure"})
    
    def test_provided_variables(self):
        """Test getting provided variables"""
        provided = self.domain.get_provided_variables()
        self.assertIsInstance(provided, set)
        self.assertEqual(provided, {"density", "velocity"})
    
    def test_advance(self):
        """Test the advance method"""
        result = self.domain.advance(0.001)
        self.assertTrue(result)
    
    def test_get_max_stable_timestep(self):
        """Test getting the maximum stable timestep"""
        dt = self.domain.get_max_stable_timestep()
        self.assertEqual(dt, 1.0e-6)
    
    def test_validate_state(self):
        """Test state validation"""
        valid, errors = self.domain.validate_state()
        self.assertTrue(valid)
        self.assertEqual(errors, [])


if __name__ == "__main__":
    unittest.main() 