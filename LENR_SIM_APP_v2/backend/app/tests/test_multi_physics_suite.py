"""
Test runner for all Multi-Physics Coupling tests
"""

import unittest
import os
import sys

# Add the parent directory to sys.path to allow imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# Import test modules
from app.tests.multi_physics.test_domain_interface import TestDomainInterface
from app.tests.multi_physics.test_state_repository import TestStateRepository
from app.tests.multi_physics.test_domain_coupler import TestDomainCoupler
from app.tests.multi_physics.test_domain_manager import TestPhysicsDomainManager
from app.tests.multi_physics.test_integration import TestMultiPhysicsIntegration


def create_test_suite():
    """Create a test suite containing all Multi-Physics Coupling tests"""
    test_suite = unittest.TestSuite()
    
    # Add test cases
    test_suite.addTest(unittest.makeSuite(TestDomainInterface))
    test_suite.addTest(unittest.makeSuite(TestStateRepository))
    test_suite.addTest(unittest.makeSuite(TestDomainCoupler))
    test_suite.addTest(unittest.makeSuite(TestPhysicsDomainManager))
    test_suite.addTest(unittest.makeSuite(TestMultiPhysicsIntegration))
    
    return test_suite


if __name__ == "__main__":
    # Create the test suite
    suite = create_test_suite()
    
    # Create a test runner and run the tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Set exit code based on test results
    sys.exit(not result.wasSuccessful()) 