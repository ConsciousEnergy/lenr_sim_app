"""
Test script to verify that the fixed imports work correctly.
"""

import sys
import os

# Add parent directory to Python path if running the script directly
if __name__ == "__main__":
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

print("Testing imports...")
try:
    from backend.app.services.simulation_manager import simulation_manager
    print("✓ simulation_manager imported successfully")
except ImportError as e:
    print(f"✗ simulation_manager import failed: {e}")

try:
    from backend.app.simulation.engines.simple import SimpleSimulationEngine
    print("✓ SimpleSimulationEngine imported successfully")
except ImportError as e:
    print(f"✗ SimpleSimulationEngine import failed: {e}")

try:
    from backend.app.simulation.engines.advanced import AdvancedSimulationEngine
    print("✓ AdvancedSimulationEngine imported successfully")
except ImportError as e:
    print(f"✗ AdvancedSimulationEngine import failed: {e}")

try:
    import backend.app.physics.fem_mesh
    print("✓ fem_mesh imported successfully")
except ImportError as e:
    print(f"✗ fem_mesh import failed: {e}")

try:
    from backend.app.simulation.factory import create_simulation
    print("✓ create_simulation imported successfully")
except ImportError as e:
    print(f"✗ create_simulation import failed: {e}")

print("\nAll imports tested!") 