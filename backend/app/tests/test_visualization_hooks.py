"""
Test module for visualization hooks functionality.

This module tests the integration between simulation engine and visualization hooks.
"""

import numpy as np
import unittest
import time
from typing import Dict, Any, List

from app.simulation.domain import SimulationDomain
from app.simulation.engine import SimulationEngine, SimulationConfig
from app.simulation.species import Species
from app.simulation.reaction import Reaction
from app.visualization.simulation_hooks import default_hook_manager, SimulationHook, HookManager


class TestHook(SimulationHook):
    """Test hook implementation that records events for verification"""
    
    def __init__(self, name: str = "test_hook"):
        """Initialize the test hook"""
        super().__init__(name)
        self.events = []
        self.simulation_states = []
        self.metadata = None
        self.results = None
        self.error = None
    
    def on_simulation_start(self, simulation_id: str, metadata: Dict[str, Any]) -> None:
        """Record simulation start event"""
        self.events.append(("start", simulation_id))
        self.metadata = metadata
    
    def on_simulation_step(
        self, 
        simulation_id: str, 
        step_number: int, 
        time: float, 
        state: Dict[str, Any]
    ) -> None:
        """Record simulation step event"""
        self.events.append(("step", simulation_id, step_number, time))
        
        # Store a simplified version of the state (to avoid storing large arrays)
        simple_state = {}
        for key, value in state.items():
            if isinstance(value, dict):
                simple_state[key] = {k: "array" for k in value.keys()}
            else:
                simple_state[key] = "array"
        
        self.simulation_states.append(simple_state)
    
    def on_simulation_end(self, simulation_id: str, results: Dict[str, Any]) -> None:
        """Record simulation end event"""
        self.events.append(("end", simulation_id))
        self.results = {
            "metadata": results.get("metadata", {}),
            "time_points": len(results.get("time", [])),
            "species": list(results.get("concentrations", {}).keys()),
        }
    
    def on_simulation_error(self, simulation_id: str, error: Exception) -> None:
        """Record simulation error event"""
        self.events.append(("error", simulation_id))
        self.error = str(error)


class TestVisualizationHooks(unittest.TestCase):
    """Test case for visualization hooks functionality"""
    
    def setUp(self):
        """Set up test case"""
        # Create a separate hook manager for testing
        self.hook_manager = HookManager()
        
        # Create a test hook
        self.test_hook = TestHook()
        self.hook_manager.register_hook(self.test_hook)
        
        # Set up a simple simulation domain
        self.domain = SimulationDomain(
            dimensions=1,
            resolution=(10,),
            extents=(1.0,)
        )
        
        # Create a simulation configuration for quick tests
        self.config = SimulationConfig(
            time_step=0.1,
            max_time=1.0,
            output_interval=0.2
        )
        
        # Create a simulation engine
        self.engine = SimulationEngine(self.domain, self.config)
        
        # Add a species
        self.species = Species(
            name="test_species",
            diffusion_coefficient=0.1,
            initial_value=1.0
        )
        self.engine.add_species(self.species)
        
        # Set temperature
        self.engine.set_temperature(300.0)
        
        # Save the original hook manager to restore later
        self._original_hook_manager = default_hook_manager
    
    def tearDown(self):
        """Clean up after test case"""
        # Restore original hook manager
        globals()['default_hook_manager'] = self._original_hook_manager
    
    def test_hooks_receive_events(self):
        """Test that hooks receive events from simulation engine"""
        # Replace the default hook manager with our test manager
        globals()['default_hook_manager'] = self.hook_manager
        
        # Initialize and run the simulation
        self.engine.initialize()
        self.engine.run()
        
        # Check that events were recorded
        self.assertGreaterEqual(len(self.test_hook.events), 3)  # At least start, step, end
        
        # Check event types
        event_types = [event[0] for event in self.test_hook.events]
        self.assertIn("start", event_types)
        self.assertIn("step", event_types)
        self.assertIn("end", event_types)
        
        # Check metadata from start event
        self.assertIsNotNone(self.test_hook.metadata)
        self.assertEqual(self.test_hook.metadata["species"], ["test_species"])
        
        # Check simulation states
        self.assertGreaterEqual(len(self.test_hook.simulation_states), 1)
        self.assertIn("concentrations", self.test_hook.simulation_states[0])
        self.assertIn("temperature", self.test_hook.simulation_states[0])
        
        # Check results from end event
        self.assertIsNotNone(self.test_hook.results)
        self.assertIn("test_species", self.test_hook.results["species"])
        self.assertGreaterEqual(self.test_hook.results["time_points"], 5)  # At least 5 time points
    
    def test_error_notification(self):
        """Test that hooks receive error notifications"""
        # Replace the default hook manager with our test manager
        globals()['default_hook_manager'] = self.hook_manager
        
        # Create a failing simulation
        class FailingSpecies(Species):
            """Species that raises an exception during diffusion calculation"""
            def calculate_diffusion(self, *args, **kwargs):
                raise ValueError("Simulated error for testing")
        
        # Add the failing species
        failing_species = FailingSpecies(
            name="failing_species",
            diffusion_coefficient=0.1,
            initial_value=1.0
        )
        
        # Create a new engine
        engine = SimulationEngine(self.domain, self.config)
        engine.add_species(failing_species)
        engine.set_temperature(300.0)
        
        # Initialize and run with exception handling
        engine.initialize()
        try:
            engine.run()
        except ValueError:
            pass  # Expected exception
        
        # Check that error event was recorded
        event_types = [event[0] for event in self.test_hook.events]
        self.assertIn("error", event_types)
        self.assertIsNotNone(self.test_hook.error)
        self.assertIn("Simulated error", self.test_hook.error)


if __name__ == "__main__":
    unittest.main() 