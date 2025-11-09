"""
Test module for the DomainInterface class
"""

import unittest
import numpy as np
from unittest.mock import patch

from app.simulation.multi_physics.interface import DomainInterface


class MockDomain(DomainInterface):
    """Mock implementation of DomainInterface for testing"""
    
    def __init__(self, name="test_domain"):
        self.name = name
        self.state = {
            "temperature": np.ones((5, 5)) * 300.0,
            "pressure": np.ones((5, 5)) * 101325.0
        }
        self.required_vars = {"heat_source", "boundary_condition"}
        self.provided_vars = {"temperature", "pressure"}
        self.initialized = False
        self.advanced = False
        self.max_timestep = 0.001
    
    def initialize(self, config):
        self.config = config
        self.initialized = True
        return True
    
    def advance(self, dt):
        self.advanced = True
        self.dt = dt
        return True
    
    def get_state(self, variable_name):
        if variable_name not in self.state:
            raise KeyError(f"Variable not found: {variable_name}")
        return self.state[variable_name]
    
    def set_state(self, variable_name, value):
        self.state[variable_name] = value
    
    def get_max_stable_timestep(self):
        return self.max_timestep
    
    def get_required_variables(self):
        return self.required_vars
    
    def get_provided_variables(self):
        return self.provided_vars
    
    def validate_state(self):
        return True, []
    
    def get_domain_name(self):
        return self.name


class TestDomainInterface(unittest.TestCase):
    """Test case for the DomainInterface class"""
    
    def setUp(self):
        """Set up test fixtures"""
        # Create a concrete implementation of DomainInterface
        self.domain = MockDomain()
    
    def test_initialize(self):
        """Test initialization method"""
        # Call initialize method
        config = {"param1": 10, "param2": "test"}
        result = self.domain.initialize(config)
        
        # Check result
        self.assertTrue(result)
        self.assertTrue(self.domain.initialized)
        self.assertEqual(self.domain.config, config)
    
    def test_advance(self):
        """Test advance method"""
        # Call advance method
        dt = 0.0005
        result = self.domain.advance(dt)
        
        # Check result
        self.assertTrue(result)
        self.assertTrue(self.domain.advanced)
        self.assertEqual(self.domain.dt, dt)
    
    def test_get_state(self):
        """Test get_state method"""
        # Get an existing variable
        temp = self.domain.get_state("temperature")
        
        # Check result
        self.assertEqual(temp.shape, (5, 5))
        self.assertTrue(np.all(temp == 300.0))
        
        # Try to get a non-existent variable
        with self.assertRaises(KeyError):
            self.domain.get_state("non_existent_var")
    
    def test_set_state(self):
        """Test set_state method"""
        # Create new data
        new_temp = np.ones((5, 5)) * 350.0
        
        # Set state
        self.domain.set_state("temperature", new_temp)
        
        # Check that state was updated
        temp = self.domain.get_state("temperature")
        np.testing.assert_array_equal(temp, new_temp)
        
        # Set a new variable
        new_var = np.zeros((5, 5))
        self.domain.set_state("new_var", new_var)
        
        # Check that new variable was created
        result = self.domain.get_state("new_var")
        np.testing.assert_array_equal(result, new_var)
    
    def test_get_max_stable_timestep(self):
        """Test get_max_stable_timestep method"""
        # Get the max timestep
        dt = self.domain.get_max_stable_timestep()
        
        # Check result
        self.assertEqual(dt, 0.001)
        
        # Change max timestep
        self.domain.max_timestep = 0.002
        
        # Get the updated max timestep
        dt = self.domain.get_max_stable_timestep()
        
        # Check updated result
        self.assertEqual(dt, 0.002)
    
    def test_get_required_variables(self):
        """Test get_required_variables method"""
        # Get required variables
        required = self.domain.get_required_variables()
        
        # Check result
        self.assertEqual(required, {"heat_source", "boundary_condition"})
        
        # Modify required variables
        self.domain.required_vars.add("new_required_var")
        
        # Get updated required variables
        required = self.domain.get_required_variables()
        
        # Check updated result
        self.assertEqual(required, {"heat_source", "boundary_condition", "new_required_var"})
    
    def test_get_provided_variables(self):
        """Test get_provided_variables method"""
        # Get provided variables
        provided = self.domain.get_provided_variables()
        
        # Check result
        self.assertEqual(provided, {"temperature", "pressure"})
        
        # Modify provided variables
        self.domain.provided_vars.add("new_provided_var")
        
        # Get updated provided variables
        provided = self.domain.get_provided_variables()
        
        # Check updated result
        self.assertEqual(provided, {"temperature", "pressure", "new_provided_var"})
    
    def test_validate_state(self):
        """Test validate_state method"""
        # Validate state
        is_valid, messages = self.domain.validate_state()
        
        # Check result
        self.assertTrue(is_valid)
        self.assertEqual(messages, [])
    
    def test_get_domain_name(self):
        """Test get_domain_name method"""
        # Get domain name
        name = self.domain.get_domain_name()
        
        # Check result
        self.assertEqual(name, "test_domain")
        
        # Change domain name
        self.domain.name = "new_domain_name"
        
        # Get updated domain name
        name = self.domain.get_domain_name()
        
        # Check updated result
        self.assertEqual(name, "new_domain_name")
    
    def test_abstract_class(self):
        """Test that DomainInterface cannot be instantiated directly"""
        # Attempting to instantiate DomainInterface should raise TypeError
        with self.assertRaises(TypeError):
            DomainInterface()


if __name__ == "__main__":
    unittest.main() 