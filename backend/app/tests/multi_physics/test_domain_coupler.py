"""
Test module for the DomainCoupler class
"""

import unittest
import numpy as np
from unittest.mock import Mock, patch

from app.simulation.multi_physics.domain_coupler import DomainCoupler
from app.simulation.multi_physics.interface import DomainInterface
from app.simulation.multi_physics.state_repository import StateRepository


class MockDomain(DomainInterface):
    """Mock implementation of DomainInterface for testing"""
    
    def __init__(self, name, required_vars=None, provided_vars=None):
        self.name = name
        self.state = {}
        self._required_vars = required_vars or set()
        self._provided_vars = provided_vars or set() 
    
    def initialize(self, config):
        self.config = config
        return True
    
    def advance(self, dt):
        return True
    
    def get_state(self, variable_name):
        if variable_name not in self.state:
            raise KeyError(f"Variable not found: {variable_name}")
        return self.state[variable_name]
    
    def set_state(self, variable_name, value):
        self.state[variable_name] = value
    
    def get_max_stable_timestep(self):
        return 1.0
    
    def get_required_variables(self):
        return self._required_vars
    
    def get_provided_variables(self):
        return self._provided_vars
    
    def validate_state(self):
        return True, []
    
    def get_domain_name(self):
        return self.name


class MockPhysicsDomainManager:
    """Mock domain manager for testing domain coupler"""
    
    def __init__(self):
        self.state_repository = MockStateRepository()
    

class MockStateRepository:
    """Mock state repository for testing domain coupler"""
    
    def __init__(self):
        self.state = {}
        self.domains = {}
    
    def register_domain(self, domain_name):
        self.state[domain_name] = {}
    
    def get_variable(self, domain, variable):
        if domain not in self.state:
            raise KeyError(f"Domain not registered: {domain}")
        if variable not in self.state[domain]:
            raise KeyError(f"Variable not found: {variable} in domain {domain}")
        return self.state[domain][variable]
    
    def set_variable(self, domain, variable, value):
        if domain not in self.state:
            raise KeyError(f"Domain not registered: {domain}")
        self.state[domain][variable] = value


class TestDomainCoupler(unittest.TestCase):
    """Test case for the DomainCoupler class"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.source_domain = MockDomain("source", provided_vars={"var1", "var2"})
        self.target_domain = MockDomain("target", required_vars={"var1", "var3"})
        
        # Create manager with repository
        self.manager = MockPhysicsDomainManager()
        self.state_repo = self.manager.state_repository
        
        # Register domains
        self.state_repo.register_domain("source")
        self.state_repo.register_domain("target")
        
        # Set initial state values
        self.state_repo.state["source"]["var1"] = np.ones((5, 5))
        self.state_repo.state["source"]["var2"] = np.zeros((5, 5))
        self.state_repo.state["target"]["var3"] = np.ones((5, 5)) * 2
        
        # Create the coupler
        self.coupler = DomainCoupler("source", "target")
    
    def test_initialization(self):
        """Test initialization of DomainCoupler"""
        self.assertEqual(self.coupler.source_domain, "source")
        self.assertEqual(self.coupler.target_domain, "target")
        self.assertEqual(len(self.coupler.variable_mappings), 0)
    
    def test_add_variable_mapping(self):
        """Test adding variable mappings"""
        self.coupler.add_variable_mapping("var1", "var1")
        self.coupler.add_variable_mapping("var2", "var2")
        
        self.assertEqual(len(self.coupler.variable_mappings), 2)
        self.assertIn("var1", self.coupler.variable_mappings)
        self.assertIn("var2", self.coupler.variable_mappings)
    
    def test_add_duplicate_mapping(self):
        """Test adding a duplicate mapping"""
        self.coupler.add_variable_mapping("var1", "var1")
        
        # Adding the same mapping again should not add a duplicate
        self.coupler.add_variable_mapping("var1", "var1")
        
        self.assertEqual(len(self.coupler.variable_mappings), 1)
    
    def test_get_mappings(self):
        """Test getting variable mappings"""
        self.coupler.add_variable_mapping("var1", "var1")
        self.coupler.add_variable_mapping("var2", "var2", lambda x: x * 2)
        
        mappings = self.coupler.get_mappings()
        
        self.assertEqual(len(mappings), 2)
        self.assertIn("var1", mappings)
        self.assertIn("var2", mappings)
        
        # Check mapping values
        self.assertEqual(mappings["var1"][0], "var1")
        self.assertFalse(mappings["var1"][1])  # No transformation
        
        self.assertEqual(mappings["var2"][0], "var2")
        self.assertTrue(mappings["var2"][1])  # Has transformation
    
    def test_exchange_data(self):
        """Test exchanging data between domains"""
        # Add variable mappings
        self.coupler.add_variable_mapping("var1", "var1")
        self.coupler.add_variable_mapping("var2", "var3")
        
        # Exchange data
        self.coupler.exchange_data(self.manager)
        
        # Check that variables were exchanged
        np.testing.assert_array_equal(
            self.state_repo.state["target"]["var1"], 
            self.state_repo.state["source"]["var1"]
        )
        
        # var2 from source should be mapped to var3 in target
        np.testing.assert_array_equal(
            self.state_repo.state["target"]["var3"], 
            self.state_repo.state["source"]["var2"]
        )
    
    def test_exchange_data_with_missing_variable(self):
        """Test exchanging data with a missing variable"""
        # Add a mapping for a variable that doesn't exist in the source domain
        self.coupler.add_variable_mapping("non_existent_var", "var1")
        
        # Exchange data - this should raise a KeyError
        with self.assertRaises(KeyError):
            self.coupler.exchange_data(self.manager)
    
    def test_exchange_data_with_transform(self):
        """Test exchanging data with a transform function"""
        # Create a transform function that doubles the values
        def double_values(data):
            return data * 2
        
        # Add variable mapping with transform
        self.coupler.add_variable_mapping("var1", "var1", double_values)
        
        # Exchange data
        self.coupler.exchange_data(self.manager)
        
        # Check that the variable was exchanged and transformed
        np.testing.assert_array_equal(
            self.state_repo.state["target"]["var1"], 
            self.state_repo.state["source"]["var1"] * 2
        )
    
    def test_exchange_data_with_units_conversion(self):
        """Test exchanging data with units conversion"""
        # Add a mapping for temperature with units conversion
        # (e.g., Kelvin to Celsius)
        def k_to_c(temp_k):
            return temp_k - 273.15
        
        # Set initial temperatures in Kelvin
        self.state_repo.state["source"]["temperature_k"] = np.ones((5, 5)) * 300.0  # 300 K
        
        # Add variable mapping with units conversion
        self.coupler.add_variable_mapping("temperature_k", "temperature_c", k_to_c)
        
        # Exchange data
        self.coupler.exchange_data(self.manager)
        
        # Check that the variable was exchanged and converted
        # 300 K = 26.85 C
        expected_temp_c = 300.0 - 273.15
        np.testing.assert_array_equal(
            self.state_repo.state["target"]["temperature_c"], 
            np.ones((5, 5)) * expected_temp_c
        )
    
    def test_get_source_domain(self):
        """Test getting the source domain name"""
        self.assertEqual(self.coupler.get_source_domain(), "source")
    
    def test_get_target_domain(self):
        """Test getting the target domain name"""
        self.assertEqual(self.coupler.get_target_domain(), "target")
    
    def test_str_representation(self):
        """Test string representation of the coupler"""
        # DomainCoupler doesn't have a custom __str__ implementation,
        # so we're just checking that we get some string representation
        str_repr = str(self.coupler)
        self.assertIsInstance(str_repr, str)
        self.assertTrue(len(str_repr) > 0)


if __name__ == "__main__":
    unittest.main() 