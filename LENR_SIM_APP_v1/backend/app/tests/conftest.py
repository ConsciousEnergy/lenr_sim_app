"""
Pytest configuration for LENR_Sim_App tests
"""

import os
import sys
import pytest
from pathlib import Path

# Add app directory to path to ensure imports work
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Setup the test environment"""
    # Ensure logs directory exists
    os.makedirs("logs", exist_ok=True)
    
    # Ensure static directories exist
    os.makedirs("static/cluster_fields", exist_ok=True)
    
    # Yield to run the tests
    yield
    
    # Cleanup (if needed)
    # This will run after all tests are completed 