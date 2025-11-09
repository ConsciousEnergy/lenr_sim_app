"""
Simulation Hooks Module

This module provides hooks to connect the simulation engine to the visualization
system, enabling real-time monitoring and result extraction during simulation.
"""

import numpy as np
from typing import Dict, Any, List, Callable, Optional, Set, Tuple, Union
import logging
import time
import asyncio
import threading
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

from app.utils.logging import setup_logger
from app.visualization.result_analysis import ResultAnalyzer, AnalysisConfig, AnalysisMethod, default_analyzer
from app.simulation.multi_physics import (
    VisualizationEvent, 
    VisualizationEventType,
    VisualizationEventListener,
    EventSystem
)

# Set up logger
logger = setup_logger("simulation_hooks", "logs/visualization.log")

# Thread pool for async analysis tasks
_analysis_executor = ThreadPoolExecutor(max_workers=2)


class SimulationHook:
    """
    Base class for simulation hooks.
    
    Hooks are attached to the simulation engine to perform specific
    operations during simulation execution, such as extracting data
    or triggering visualization updates.
    """
    
    def __init__(self, name: str):
        """
        Initialize the simulation hook.
        
        Args:
            name: Hook name
        """
        self.name = name
        self.enabled = True
        self.hook_id = str(uuid4())
    
    def on_simulation_start(self, simulation_id: str, metadata: Dict[str, Any]) -> None:
        """
        Called when a simulation starts.
        
        Args:
            simulation_id: ID of the simulation
            metadata: Simulation metadata
        """
        pass
    
    def on_simulation_step(
        self, 
        simulation_id: str, 
        step_number: int, 
        time: float, 
        state: Dict[str, Any]
    ) -> None:
        """
        Called after each simulation step.
        
        Args:
            simulation_id: ID of the simulation
            step_number: Current step number
            time: Current simulation time
            state: Current simulation state
        """
        pass
    
    def on_simulation_end(self, simulation_id: str, results: Dict[str, Any]) -> None:
        """
        Called when a simulation ends.
        
        Args:
            simulation_id: ID of the simulation
            results: Simulation results
        """
        pass
    
    def on_simulation_error(self, simulation_id: str, error: Exception) -> None:
        """
        Called when a simulation encounters an error.
        
        Args:
            simulation_id: ID of the simulation
            error: The error that occurred
        """
        pass


class EventPublisherHook(SimulationHook):
    """
    Hook that publishes events to the event system.
    """
    
    def __init__(self, event_system: EventSystem, name: str = "event_publisher"):
        """
        Initialize the event publisher hook.
        
        Args:
            event_system: Event system to publish events to
            name: Hook name
        """
        super().__init__(name)
        self.event_system = event_system
    
    def on_simulation_start(self, simulation_id: str, metadata: Dict[str, Any]) -> None:
        """Publish simulation start event"""
        event = VisualizationEvent(
            event_type=VisualizationEventType.SIMULATION_STARTED,
            source=simulation_id,
            data={
                "metadata": metadata,
                "timestamp": time.time()
            }
        )
        self.event_system.publish_event(event)
    
    def on_simulation_step(
        self, 
        simulation_id: str, 
        step_number: int, 
        time: float, 
        state: Dict[str, Any]
    ) -> None:
        """Publish simulation step event"""
        # Create a lightweight version of the state for the event
        # (to avoid sending large arrays over WebSocket)
        light_state = {
            "step": step_number,
            "time": time,
            "stats": {}
        }
        
        # Add basic statistics for each state variable
        for var_name, var_data in state.items():
            if isinstance(var_data, dict):
                light_state["stats"][var_name] = {}
                for sub_name, sub_data in var_data.items():
                    if isinstance(sub_data, np.ndarray):
                        light_state["stats"][var_name][sub_name] = {
                            "min": float(np.min(sub_data)),
                            "max": float(np.max(sub_data)),
                            "mean": float(np.mean(sub_data)),
                            "shape": sub_data.shape
                        }
            elif isinstance(var_data, np.ndarray):
                light_state["stats"][var_name] = {
                    "min": float(np.min(var_data)),
                    "max": float(np.max(var_data)),
                    "mean": float(np.mean(var_data)),
                    "shape": var_data.shape
                }
        
        event = VisualizationEvent(
            event_type=VisualizationEventType.SIMULATION_STEP_COMPLETED,
            source=simulation_id,
            data=light_state
        )
        self.event_system.publish_event(event)
    
    def on_simulation_end(self, simulation_id: str, results: Dict[str, Any]) -> None:
        """Publish simulation end event"""
        # Create a lightweight version of the results
        light_results = {
            "timestamp": time.time(),
            "duration": results.get("duration", 0),
            "steps": results.get("steps", 0),
            "status": "completed"
        }
        
        event = VisualizationEvent(
            event_type=VisualizationEventType.SIMULATION_COMPLETED,
            source=simulation_id,
            data=light_results
        )
        self.event_system.publish_event(event)
    
    def on_simulation_error(self, simulation_id: str, error: Exception) -> None:
        """Publish simulation error event"""
        event = VisualizationEvent(
            event_type=VisualizationEventType.SIMULATION_ERROR,
            source=simulation_id,
            data={
                "timestamp": time.time(),
                "error": str(error),
                "error_type": type(error).__name__
            }
        )
        self.event_system.publish_event(event)


class DataExtractionHook(SimulationHook):
    """
    Hook that extracts data from the simulation at specified intervals.
    """
    
    def __init__(
        self,
        extraction_interval: float = 0.1,
        extract_full_state: bool = False,
        variables: List[str] = None,
        name: str = "data_extractor"
    ):
        """
        Initialize the data extraction hook.
        
        Args:
            extraction_interval: Interval (in simulation time) between extractions
            extract_full_state: Whether to extract the full simulation state
            variables: List of specific variables to extract
            name: Hook name
        """
        super().__init__(name)
        self.extraction_interval = extraction_interval
        self.extract_full_state = extract_full_state
        self.variables = variables or []
        self.last_extraction_time = 0.0
        self.extracted_data = {
            "time": [],
            "variables": {}
        }
    
    def on_simulation_start(self, simulation_id: str, metadata: Dict[str, Any]) -> None:
        """Reset extracted data on simulation start"""
        self.extracted_data = {
            "time": [],
            "variables": {},
            "simulation_id": simulation_id,
            "metadata": metadata
        }
        self.last_extraction_time = 0.0
    
    def on_simulation_step(
        self, 
        simulation_id: str, 
        step_number: int, 
        time: float, 
        state: Dict[str, Any]
    ) -> None:
        """Extract data if interval has elapsed"""
        if time - self.last_extraction_time >= self.extraction_interval:
            self.last_extraction_time = time
            self.extracted_data["time"].append(time)
            
            # Extract data for each variable
            if self.extract_full_state:
                for var_name, var_data in state.items():
                    if var_name not in self.extracted_data["variables"]:
                        self.extracted_data["variables"][var_name] = []
                    
                    # Handle numpy arrays
                    if isinstance(var_data, np.ndarray):
                        self.extracted_data["variables"][var_name].append(var_data.copy())
                    # Handle dictionaries of numpy arrays
                    elif isinstance(var_data, dict):
                        if not isinstance(self.extracted_data["variables"][var_name], dict):
                            self.extracted_data["variables"][var_name] = {}
                        
                        for sub_name, sub_data in var_data.items():
                            if sub_name not in self.extracted_data["variables"][var_name]:
                                self.extracted_data["variables"][var_name][sub_name] = []
                            
                            if isinstance(sub_data, np.ndarray):
                                self.extracted_data["variables"][var_name][sub_name].append(sub_data.copy())
            else:
                # Extract only specified variables
                for var_name in self.variables:
                    if var_name in state:
                        if var_name not in self.extracted_data["variables"]:
                            self.extracted_data["variables"][var_name] = []
                        
                        var_data = state[var_name]
                        if isinstance(var_data, np.ndarray):
                            self.extracted_data["variables"][var_name].append(var_data.copy())
    
    def get_extracted_data(self) -> Dict[str, Any]:
        """
        Get the extracted data.
        
        Returns:
            Dictionary of extracted data
        """
        return self.extracted_data
    
    def clear_extracted_data(self) -> None:
        """Clear all extracted data"""
        self.extracted_data = {
            "time": [],
            "variables": {}
        }


class AnalysisHook(SimulationHook):
    """
    Hook that performs real-time analysis of simulation data.
    """
    
    def __init__(
        self,
        analyzer: ResultAnalyzer = None,
        analysis_interval: float = 0.5,
        analysis_config: AnalysisConfig = None,
        event_system: Optional[EventSystem] = None,
        name: str = "analysis_hook"
    ):
        """
        Initialize the analysis hook.
        
        Args:
            analyzer: Result analyzer to use
            analysis_interval: Interval (in simulation time) between analyses
            analysis_config: Configuration for analysis
            event_system: Event system to publish derived data events
            name: Hook name
        """
        super().__init__(name)
        self.analyzer = analyzer or default_analyzer
        self.analysis_interval = analysis_interval
        self.analysis_config = analysis_config or AnalysisConfig()
        self.event_system = event_system
        self.last_analysis_time = 0.0
        self.analysis_results = {}
        self.data_extractor = DataExtractionHook(
            extraction_interval=analysis_interval,
            extract_full_state=True,
            name=f"{name}_extractor"
        )
    
    def on_simulation_start(self, simulation_id: str, metadata: Dict[str, Any]) -> None:
        """Reset analysis state and initialize data extractor"""
        self.analysis_results = {}
        self.last_analysis_time = 0.0
        self.data_extractor.on_simulation_start(simulation_id, metadata)
    
    def on_simulation_step(
        self, 
        simulation_id: str, 
        step_number: int, 
        time: float, 
        state: Dict[str, Any]
    ) -> None:
        """Perform analysis if interval has elapsed"""
        # Forward to data extractor
        self.data_extractor.on_simulation_step(simulation_id, step_number, time, state)
        
        if time - self.last_analysis_time >= self.analysis_interval:
            self.last_analysis_time = time
            
            # Prepare data for analysis
            extracted_data = self.data_extractor.get_extracted_data()
            
            # Run analysis in a separate thread to avoid blocking simulation
            if _analysis_executor is not None:
                _analysis_executor.submit(
                    self._perform_analysis,
                    simulation_id,
                    extracted_data,
                    time
                )
    
    def _perform_analysis(
        self, 
        simulation_id: str, 
        data: Dict[str, Any], 
        current_time: float
    ) -> None:
        """
        Perform analysis on extracted data.
        
        Args:
            simulation_id: ID of the simulation
            data: Extracted data to analyze
            current_time: Current simulation time
        """
        try:
            # Convert data to required format
            analysis_data = {
                "time": data.get("time", []),
                "concentrations": {},
                "temperature": [],
                "reaction_rates": {}
            }
            
            for var_name, var_data in data.get("variables", {}).items():
                # Map variable names to appropriate categories
                if var_name == "temperature":
                    analysis_data["temperature"] = var_data
                elif var_name == "concentrations":
                    analysis_data["concentrations"] = var_data
                elif var_name == "reaction_rates":
                    analysis_data["reaction_rates"] = var_data
                else:
                    # Store other variables in appropriate categories based on name
                    if "rate" in var_name or "reaction" in var_name:
                        if isinstance(var_data, dict):
                            for sub_name, sub_data in var_data.items():
                                analysis_data["reaction_rates"][f"{var_name}_{sub_name}"] = sub_data
                        else:
                            analysis_data["reaction_rates"][var_name] = var_data
                    elif "species" in var_name or "concentration" in var_name:
                        if isinstance(var_data, dict):
                            for sub_name, sub_data in var_data.items():
                                analysis_data["concentrations"][f"{var_name}_{sub_name}"] = sub_data
                        else:
                            analysis_data["concentrations"][var_name] = var_data
            
            # Perform analysis
            results = self.analyzer.analyze_simulation_data(analysis_data, self.analysis_config)
            
            # Store results
            self.analysis_results = results
            
            # Publish event if event system is available
            if self.event_system:
                # Create a lightweight version of the results for the event
                light_results = {
                    "timestamp": time.time(),
                    "simulation_time": current_time,
                    "summary": results.get("summary", {}),
                    "derived": {}
                }
                
                # Include derived quantity summaries
                for name, value in results.get("derived", {}).items():
                    if name.endswith("_mean") or name.endswith("_min") or name.endswith("_max"):
                        light_results["derived"][name] = value
                
                event = VisualizationEvent(
                    event_type=VisualizationEventType.DERIVED_DATA_UPDATED,
                    source=simulation_id,
                    data=light_results
                )
                self.event_system.publish_event(event)
        
        except Exception as e:
            logger.error(f"Error performing analysis: {e}")
    
    def get_analysis_results(self) -> Dict[str, Any]:
        """
        Get the latest analysis results.
        
        Returns:
            Dictionary of analysis results
        """
        return self.analysis_results
    
    def on_simulation_end(self, simulation_id: str, results: Dict[str, Any]) -> None:
        """Perform final analysis on complete simulation data"""
        self.data_extractor.on_simulation_end(simulation_id, results)
        
        # Perform final analysis with all data
        extracted_data = self.data_extractor.get_extracted_data()
        self._perform_analysis(simulation_id, extracted_data, results.get("time", 0))


class StreamingVisualizationHook(SimulationHook):
    """
    Hook that streams visualization data to clients via WebSockets.
    """
    
    def __init__(
        self,
        event_system: EventSystem,
        streaming_interval: float = 0.1,
        include_full_state: bool = False,
        include_analysis: bool = True,
        analyzer: ResultAnalyzer = None,
        analysis_config: AnalysisConfig = None,
        name: str = "streaming_viz"
    ):
        """
        Initialize the streaming visualization hook.
        
        Args:
            event_system: Event system to publish events to
            streaming_interval: Interval (in simulation time) between stream updates
            include_full_state: Whether to include full state in stream (warning: data volume)
            include_analysis: Whether to include analysis results in stream
            analyzer: Result analyzer to use
            analysis_config: Configuration for analysis
            name: Hook name
        """
        super().__init__(name)
        self.event_system = event_system
        self.streaming_interval = streaming_interval
        self.include_full_state = include_full_state
        self.include_analysis = include_analysis
        self.last_stream_time = 0.0
        
        # Create analysis hook if needed
        if include_analysis:
            self.analysis_hook = AnalysisHook(
                analyzer=analyzer,
                analysis_interval=streaming_interval,
                analysis_config=analysis_config,
                event_system=None,  # We'll handle events manually
                name=f"{name}_analysis"
            )
        else:
            self.analysis_hook = None
        
        # Create data extractor for non-analysis state data
        self.data_extractor = DataExtractionHook(
            extraction_interval=streaming_interval,
            extract_full_state=include_full_state,
            name=f"{name}_extractor"
        )
    
    def on_simulation_start(self, simulation_id: str, metadata: Dict[str, Any]) -> None:
        """Initialize hooks and publish start event"""
        self.last_stream_time = 0.0
        
        # Initialize sub-hooks
        if self.analysis_hook:
            self.analysis_hook.on_simulation_start(simulation_id, metadata)
        self.data_extractor.on_simulation_start(simulation_id, metadata)
        
        # Publish start event
        event = VisualizationEvent(
            event_type=VisualizationEventType.SIMULATION_STARTED,
            source=simulation_id,
            data={
                "metadata": metadata,
                "timestamp": time.time(),
                "streaming_interval": self.streaming_interval,
                "include_full_state": self.include_full_state,
                "include_analysis": self.include_analysis
            }
        )
        self.event_system.publish_event(event)
    
    def on_simulation_step(
        self, 
        simulation_id: str, 
        step_number: int, 
        time: float, 
        state: Dict[str, Any]
    ) -> None:
        """Process simulation step and stream updates at specified interval"""
        # Forward to sub-hooks
        if self.analysis_hook:
            self.analysis_hook.on_simulation_step(simulation_id, step_number, time, state)
        self.data_extractor.on_simulation_step(simulation_id, step_number, time, state)
        
        # Stream updates at specified interval
        if time - self.last_stream_time >= self.streaming_interval:
            self.last_stream_time = time
            
            # Prepare event data
            event_data = {
                "step": step_number,
                "time": time,
                "timestamp": time.time()
            }
            
            # Include state data if requested
            if self.include_full_state:
                extracted_data = self.data_extractor.get_extracted_data()
                # Get only the most recent data point
                state_data = {}
                for var_name, var_data in extracted_data.get("variables", {}).items():
                    if isinstance(var_data, list) and var_data:
                        if isinstance(var_data[-1], np.ndarray):
                            state_data[var_name] = var_data[-1].tolist()
                        else:
                            state_data[var_name] = var_data[-1]
                    elif isinstance(var_data, dict):
                        state_data[var_name] = {}
                        for sub_name, sub_data in var_data.items():
                            if isinstance(sub_data, list) and sub_data:
                                if isinstance(sub_data[-1], np.ndarray):
                                    state_data[var_name][sub_name] = sub_data[-1].tolist()
                                else:
                                    state_data[var_name][sub_name] = sub_data[-1]
                
                event_data["state"] = state_data
            
            # Include analysis results if requested
            if self.include_analysis and self.analysis_hook:
                analysis_results = self.analysis_hook.get_analysis_results()
                if analysis_results:
                    # Include only the summary and derived data to reduce payload size
                    event_data["analysis"] = {
                        "summary": analysis_results.get("summary", {}),
                        "derived": analysis_results.get("derived", {})
                    }
            
            # Publish event
            event = VisualizationEvent(
                event_type=VisualizationEventType.DOMAIN_STATE_CHANGED,
                source=simulation_id,
                data=event_data
            )
            self.event_system.publish_event(event)
    
    def on_simulation_end(self, simulation_id: str, results: Dict[str, Any]) -> None:
        """Process simulation end and stream final event"""
        # Forward to sub-hooks
        if self.analysis_hook:
            self.analysis_hook.on_simulation_end(simulation_id, results)
        self.data_extractor.on_simulation_end(simulation_id, results)
        
        # Create final event data
        final_data = {
            "timestamp": time.time(),
            "duration": results.get("duration", 0),
            "steps": results.get("steps", 0),
            "status": "completed"
        }
        
        # Include final analysis if available
        if self.include_analysis and self.analysis_hook:
            analysis_results = self.analysis_hook.get_analysis_results()
            if analysis_results:
                final_data["final_analysis"] = {
                    "summary": analysis_results.get("summary", {}),
                    "derived": analysis_results.get("derived", {})
                }
        
        # Publish completion event
        event = VisualizationEvent(
            event_type=VisualizationEventType.SIMULATION_COMPLETED,
            source=simulation_id,
            data=final_data
        )
        self.event_system.publish_event(event)
    
    def on_simulation_error(self, simulation_id: str, error: Exception) -> None:
        """Process simulation error and stream error event"""
        # Publish error event
        event = VisualizationEvent(
            event_type=VisualizationEventType.SIMULATION_ERROR,
            source=simulation_id,
            data={
                "timestamp": time.time(),
                "error": str(error),
                "error_type": type(error).__name__
            }
        )
        self.event_system.publish_event(event)


class HookManager:
    """
    Manager for simulation hooks.
    
    This class manages hook registration and invocation during simulation.
    """
    
    def __init__(self):
        """Initialize the hook manager."""
        self.hooks: Dict[str, SimulationHook] = {}
    
    def register_hook(self, hook: SimulationHook) -> None:
        """
        Register a simulation hook.
        
        Args:
            hook: Hook to register
        """
        self.hooks[hook.hook_id] = hook
        logger.info(f"Registered hook: {hook.name} ({hook.hook_id})")
    
    def unregister_hook(self, hook_id: str) -> None:
        """
        Unregister a simulation hook.
        
        Args:
            hook_id: ID of the hook to unregister
        """
        if hook_id in self.hooks:
            hook = self.hooks.pop(hook_id)
            logger.info(f"Unregistered hook: {hook.name} ({hook_id})")
    
    def notify_simulation_start(self, simulation_id: str, metadata: Dict[str, Any]) -> None:
        """
        Notify hooks of simulation start.
        
        Args:
            simulation_id: ID of the simulation
            metadata: Simulation metadata
        """
        for hook in self.hooks.values():
            if hook.enabled:
                try:
                    hook.on_simulation_start(simulation_id, metadata)
                except Exception as e:
                    logger.error(f"Error in hook {hook.name} on simulation start: {e}")
    
    def notify_simulation_step(
        self, 
        simulation_id: str, 
        step_number: int, 
        time: float, 
        state: Dict[str, Any]
    ) -> None:
        """
        Notify hooks of simulation step.
        
        Args:
            simulation_id: ID of the simulation
            step_number: Current step number
            time: Current simulation time
            state: Current simulation state
        """
        for hook in self.hooks.values():
            if hook.enabled:
                try:
                    hook.on_simulation_step(simulation_id, step_number, time, state)
                except Exception as e:
                    logger.error(f"Error in hook {hook.name} on simulation step: {e}")
    
    def notify_simulation_end(self, simulation_id: str, results: Dict[str, Any]) -> None:
        """
        Notify hooks of simulation end.
        
        Args:
            simulation_id: ID of the simulation
            results: Simulation results
        """
        for hook in self.hooks.values():
            if hook.enabled:
                try:
                    hook.on_simulation_end(simulation_id, results)
                except Exception as e:
                    logger.error(f"Error in hook {hook.name} on simulation end: {e}")
    
    def notify_simulation_error(self, simulation_id: str, error: Exception) -> None:
        """
        Notify hooks of simulation error.
        
        Args:
            simulation_id: ID of the simulation
            error: The error that occurred
        """
        for hook in self.hooks.values():
            if hook.enabled:
                try:
                    hook.on_simulation_error(simulation_id, error)
                except Exception as e:
                    logger.error(f"Error in hook {hook.name} on simulation error: {e}")


# Create a default instance for convenience
default_hook_manager = HookManager()


def create_default_streaming_hook(
    event_system: EventSystem,
    streaming_interval: float = 0.1,
    include_full_state: bool = False
) -> StreamingVisualizationHook:
    """
    Create a default streaming visualization hook.
    
    Args:
        event_system: Event system to publish events to
        streaming_interval: Interval between stream updates
        include_full_state: Whether to include full state in stream
        
    Returns:
        Configured StreamingVisualizationHook
    """
    # Create analysis config
    analysis_config = AnalysisConfig(
        methods=[
            AnalysisMethod.MEAN,
            AnalysisMethod.MIN,
            AnalysisMethod.MAX,
            AnalysisMethod.GRADIENT
        ],
        normalize=True
    )
    
    # Create the hook
    hook = StreamingVisualizationHook(
        event_system=event_system,
        streaming_interval=streaming_interval,
        include_full_state=include_full_state,
        include_analysis=True,
        analysis_config=analysis_config
    )
    
    return hook 