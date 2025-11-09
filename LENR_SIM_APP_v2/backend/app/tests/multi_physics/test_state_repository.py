"""
Test module for the StateRepository class
"""

import unittest
import numpy as np
from unittest.mock import Mock, patch

from app.simulation.multi_physics.interface import DomainInterface
from app.simulation.multi_physics.state_repository import StateRepository


class MockDomain(DomainInterface):
    """Mock domain implementation for testing"""
    
    def __init__(self, name):
        self.name = name
        self.state = {}
    
    def initialize(self, config):
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
        return set()
    
    def get_provided_variables(self):
        return set()
    
    def validate_state(self):
        return True, []
    
    def get_domain_name(self):
        return self.name


class TestStateRepository(unittest.TestCase):
    """Test case for the StateRepository class"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.repo = StateRepository()
        
        # Create mock domains
        self.domain1 = MockDomain("domain1")
        self.domain2 = MockDomain("domain2")
        
        # Set initial state in domains
        self.domain1.state["var1"] = np.ones((5, 5))
        self.domain1.state["var2"] = np.zeros((5, 5))
        self.domain2.state["var3"] = np.ones((5, 5)) * 2
        
        # Register domains with the repository
        self.repo.register_domain("domain1")
        self.repo.register_domain("domain2")
        
        # Set initial values in repository
        self.repo.set_variable("domain1", "var1", self.domain1.state["var1"])
        self.repo.set_variable("domain1", "var2", self.domain1.state["var2"])
        self.repo.set_variable("domain2", "var3", self.domain2.state["var3"])
    
    def test_initialization(self):
        """Test initialization of StateRepository"""
        self.assertIsInstance(self.repo.state, dict)
        self.assertEqual(len(self.repo.state), 2)
    
    def test_register_domain(self):
        """Test domain registration"""
        # Create a new domain
        domain3 = MockDomain("domain3")
        
        # Register the domain
        self.repo.register_domain("domain3")
        
        # Check that the domain was registered
        self.assertIn("domain3", self.repo.state)
        
        # Test registering a domain with a duplicate name (should not raise error but log warning)
        self.repo.register_domain("domain3")
    
    def test_get_domains(self):
        """Test getting all registered domains"""
        domains = list(self.repo.state.keys())
        
        self.assertEqual(len(domains), 2)
        self.assertIn("domain1", domains)
        self.assertIn("domain2", domains)
    
    def test_get_variable(self):
        """Test getting a variable from a domain"""
        var1 = self.repo.get_variable("domain1", "var1")
        var2 = self.repo.get_variable("domain1", "var2")
        var3 = self.repo.get_variable("domain2", "var3")
        
        # Check values
        np.testing.assert_array_equal(var1, np.ones((5, 5)))
        np.testing.assert_array_equal(var2, np.zeros((5, 5)))
        np.testing.assert_array_equal(var3, np.ones((5, 5)) * 2)
        
        # Test getting a variable from a non-existent domain
        with self.assertRaises(KeyError):
            self.repo.get_variable("non_existent_domain", "var1")
        
        # Test getting a non-existent variable
        with self.assertRaises(KeyError):
            self.repo.get_variable("domain1", "non_existent_var")
    
    def test_set_variable(self):
        """Test setting a variable in a domain"""
        new_data = np.ones((5, 5)) * 3
        
        # Set a new variable
        self.repo.set_variable("domain1", "new_var", new_data)
        
        # Check that the variable was set
        retrieved_data = self.repo.get_variable("domain1", "new_var")
        np.testing.assert_array_equal(retrieved_data, new_data)
        
        # Update an existing variable
        updated_data = np.ones((5, 5)) * 4
        self.repo.set_variable("domain1", "var1", updated_data)
        
        # Check that the variable was updated
        retrieved_data = self.repo.get_variable("domain1", "var1")
        np.testing.assert_array_equal(retrieved_data, updated_data)
        
        # Test setting a variable in a non-existent domain
        with self.assertRaises(KeyError):
            self.repo.set_variable("non_existent_domain", "var", new_data)
    
    def test_save_and_restore_state(self):
        """Test saving and restoring state"""
        # Save state at time 1.0
        self.repo.save_state(1.0)
        
        # Modify a variable
        modified_data = np.ones((5, 5)) * 5
        self.repo.set_variable("domain1", "var1", modified_data)
        
        # Check that the variable was modified
        retrieved_data = self.repo.get_variable("domain1", "var1")
        np.testing.assert_array_equal(retrieved_data, modified_data)
        
        # Restore state to time 1.0
        success = self.repo.restore_state(1.0)
        self.assertTrue(success)
        
        # Check that the variable was restored
        restored_data = self.repo.get_variable("domain1", "var1")
        np.testing.assert_array_equal(restored_data, np.ones((5, 5)))
        
        # Test restoring to a non-existent timestamp
        success = self.repo.restore_state(999.0)
        self.assertFalse(success)
    
    def test_clear_history(self):
        """Test clearing history"""
        # Save state at time 1.0
        self.repo.save_state(1.0)
        
        # Check that history contains the saved state
        self.assertEqual(len(self.repo.history), 1)
        
        # Clear history
        self.repo.clear_history()
        
        # Check that history is empty
        self.assertEqual(len(self.repo.history), 0)
    
    def test_get_timestamps(self):
        """Test getting timestamps from history"""
        # Save states at different times
        self.repo.save_state(1.0)
        self.repo.save_state(2.0)
        self.repo.save_state(3.0)
        
        # Get timestamps
        timestamps = self.repo.get_timestamps()
        
        # Check timestamps
        self.assertEqual(len(timestamps), 3)
        self.assertIn(1.0, timestamps)
        self.assertIn(2.0, timestamps)
        self.assertIn(3.0, timestamps)
        
        # Check that timestamps are in ascending order
        self.assertEqual(timestamps, [1.0, 2.0, 3.0])
    
    def test_get_current_time(self):
        """Test getting current time"""
        # Initial time should be 0.0
        self.assertEqual(self.repo.get_current_time(), 0.0)
        
        # Save state at time 1.0
        self.repo.save_state(1.0)
        
        # Check that current time was updated
        self.assertEqual(self.repo.get_current_time(), 1.0)
    
    def test_exchange_data(self):
        """Test manually exchanging data between domains"""
        # Get source data
        source_data = self.repo.get_variable("domain1", "var1")
        
        # Set target data in repository
        self.repo.set_variable("domain2", "var1", source_data)
        
        # Check that data was exchanged
        target_data = self.repo.get_variable("domain2", "var1")
        np.testing.assert_array_equal(target_data, source_data)
    
    def test_variable_info(self):
        """Test getting variable info"""
        # Get variable info
        info = self.repo.get_variable_info()
        
        # Check info structure
        self.assertIn("domain1", info)
        self.assertIn("domain2", info)
        
        # Check variable names
        self.assertIn("var1", info["domain1"])
        self.assertIn("var2", info["domain1"])
        self.assertIn("var3", info["domain2"])


if __name__ == "__main__":
    unittest.main() 