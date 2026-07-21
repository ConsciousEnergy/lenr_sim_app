"""
Visualization Hooks Module

This module provides the event system and hooks for analyzing simulation results
and enabling real-time visualization during simulation execution.
"""

import numpy as np
import json
import logging
from enum import Enum
from typing import Dict, Any, List, Callable, Optional, Set, Tuple
from abc import ABC, abstractmethod

from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("visualization_hooks", "logs/simulation.log")


class VisualizationEventType(Enum):
    """Enumeration of visualization event types"""
    SIMULATION_STARTED = "simulation_started"
    SIMULATION_STEP_COMPLETED = "simulation_step_completed"
    SIMULATION_COMPLETED = "simulation_completed"
    SIMULATION_ERROR = "simulation_error"
    DOMAIN_STATE_CHANGED = "domain_state_changed"
    DERIVED_DATA_UPDATED = "derived_data_updated"
    CUSTOM_EVENT = "custom_event"


class VisualizationEvent:
    """
    Class representing a visualization event.
    
    Events are used to notify visualization systems about changes in the simulation state,
    allowing for real-time updates and monitoring.
    """
    
    def __init__(
        self, 
        event_type: VisualizationEventType, 
        source: str, 
        data: Dict[str, Any],
        timestamp: float = None
    ):
        """
        Initialize a visualization event.
        
        Args:
            event_type: Type of the event
            source: Source of the event (e.g., domain name)
            data: Event data payload
            timestamp: Event timestamp (defaults to current time)
        """
        import time
        self.event_type = event_type
        self.source = source
        self.data = data
        self.timestamp = timestamp if timestamp is not None else time.time()
    
    def serialize(self) -> Dict[str, Any]:
        """
        Serialize the event to a dictionary.
        
        Returns:
            Dictionary representation of the event
        """
        return {
            "event_type": self.event_type.value,
            "source": self.source,
            "data": self.data,
            "timestamp": self.timestamp
        }


class VisualizationEventListener(ABC):
    """Abstract base class for visualization event listeners"""
    
    @abstractmethod
    def on_event(self, event: VisualizationEvent) -> None:
        """
        Handle a visualization event.
        
        Args:
            event: The event to handle
        """
        pass


class ResultAnalyzer:
    """
    Class for analyzing simulation results and computing derived quantities.
    
    This class provides functionality to extract meaningful data from simulation
    results and compute statistics and derived quantities useful for visualization
    and analysis.
    """
    
    def __init__(self):
        """Initialize the result analyzer."""
        self.statistics_functions = {}
        self.derived_quantity_functions = {}
        
        # Register default statistics functions
        self.register_statistic("mean", np.mean)
        self.register_statistic("min", np.min)
        self.register_statistic("max", np.max)
        self.register_statistic("std", np.std)
    
    def register_statistic(self, name: str, function: Callable[[np.ndarray], Any]) -> None:
        """
        Register a statistic function.
        
        Args:
            name: Name of the statistic
            function: Function that computes the statistic from an array
        """
        self.statistics_functions[name] = function
    
    def register_derived_quantity(
        self, 
        name: str, 
        function: Callable[[Dict[str, np.ndarray]], np.ndarray]
    ) -> None:
        """
        Register a derived quantity function.
        
        Args:
            name: Name of the derived quantity
            function: Function that computes the derived quantity from a set of variables
        """
        self.derived_quantity_functions[name] = function
    
    def compute_statistics(
        self, 
        data: np.ndarray, 
        statistics: List[str] = None
    ) -> Dict[str, Any]:
        """
        Compute statistics for a dataset.
        
        Args:
            data: Data array
            statistics: List of statistics to compute (defaults to all registered)
            
        Returns:
            Dictionary mapping statistic names to values
        """
        if statistics is None:
            statistics = list(self.statistics_functions.keys())
        
        results = {}
        for stat in statistics:
            if stat in self.statistics_functions:
                try:
                    results[stat] = float(self.statistics_functions[stat](data))
                except Exception as e:
                    logger.error(f"Error computing statistic {stat}: {e}")
                    results[stat] = None
        
        return results
    
    def compute_derived_quantity(
        self, 
        name: str, 
        variables: Dict[str, np.ndarray]
    ) -> Optional[np.ndarray]:
        """
        Compute a derived quantity.
        
        Args:
            name: Name of the derived quantity
            variables: Dictionary mapping variable names to data arrays
            
        Returns:
            Computed derived quantity or None if computation fails
        """
        if name not in self.derived_quantity_functions:
            logger.error(f"Derived quantity '{name}' not registered")
            return None
        
        try:
            return self.derived_quantity_functions[name](variables)
        except Exception as e:
            logger.error(f"Error computing derived quantity '{name}': {e}")
            return None


class EventSystem:
    """
    Event system for publishing and subscribing to visualization events.
    
    This class implements a simple publisher-subscriber pattern to allow
    visualization components to receive notifications about simulation events.
    """
    
    def __init__(self):
        """Initialize the event system."""
        self.listeners: Dict[VisualizationEventType, List[VisualizationEventListener]] = {
            event_type: [] for event_type in VisualizationEventType
        }
        self.all_events_listeners: List[VisualizationEventListener] = []
        self.event_history: List[VisualizationEvent] = []
        self.max_history_size = 1000  # Default size
        
        # For JSON serialization of events
        try:
            import numpy as np
            from json import JSONEncoder
            
            # Extend the JSONEncoder to handle NumPy arrays and types
            class NumpyJSONEncoder(JSONEncoder):
                def default(self, obj):
                    if isinstance(obj, np.ndarray):
                        return obj.tolist()
                    if isinstance(obj, (np.int_, np.intc, np.intp, np.int8,
                                       np.int16, np.int32, np.int64, np.uint8,
                                       np.uint16, np.uint32, np.uint64)):
                        return int(obj)
                    if isinstance(obj, (np.float16, np.float32, np.float64)):
                        return float(obj)
                    if isinstance(obj, (np.bool_)):
                        return bool(obj)
                    return JSONEncoder.default(self, obj)
            
            self.json_encoder = NumpyJSONEncoder
        except ImportError:
            self.json_encoder = None
    
    def set_max_history_size(self, size: int) -> None:
        """
        Set the maximum history size.
        
        Args:
            size: Maximum number of events to keep in history
        """
        self.max_history_size = size
        
        # Trim history if needed
        if len(self.event_history) > self.max_history_size:
            self.event_history = self.event_history[-self.max_history_size:]
    
    def add_listener(
        self, 
        listener: VisualizationEventListener, 
        event_types: List[VisualizationEventType] = None
    ) -> None:
        """
        Add a listener for specific event types or all events.
        
        Args:
            listener: Event listener
            event_types: List of event types to listen for, or None for all events
        """
        if event_types is None:
            # Subscribe to all events
            self.all_events_listeners.append(listener)
        else:
            # Subscribe to specific event types
            for event_type in event_types:
                self.listeners[event_type].append(listener)
    
    def remove_listener(
        self, 
        listener: VisualizationEventListener, 
        event_types: List[VisualizationEventType] = None
    ) -> None:
        """
        Remove a listener for specific event types or all events.
        
        Args:
            listener: Event listener
            event_types: List of event types to remove listener from, or None for all events
        """
        if event_types is None:
            # Unsubscribe from all events
            if listener in self.all_events_listeners:
                self.all_events_listeners.remove(listener)
            
            # Remove from specific event types as well
            for event_type in VisualizationEventType:
                if listener in self.listeners[event_type]:
                    self.listeners[event_type].remove(listener)
        else:
            # Unsubscribe from specific event types
            for event_type in event_types:
                if listener in self.listeners[event_type]:
                    self.listeners[event_type].remove(listener)
    
    def publish_event(self, event: VisualizationEvent) -> None:
        """
        Publish an event to all appropriate listeners.
        
        Args:
            event: The event to publish
        """
        # Add to history
        self.event_history.append(event)
        
        # Trim history if needed
        if len(self.event_history) > self.max_history_size:
            self.event_history = self.event_history[-self.max_history_size:]
        
        # Notify type-specific listeners
        for listener in self.listeners[event.event_type]:
            try:
                listener.on_event(event)
            except Exception as e:
                logger.error(f"Error notifying listener about event: {e}")
        
        # Notify all-events listeners
        for listener in self.all_events_listeners:
            try:
                listener.on_event(event)
            except Exception as e:
                logger.error(f"Error notifying all-events listener about event: {e}")
    
    def get_event_history(
        self, 
        event_types: List[VisualizationEventType] = None,
        sources: List[str] = None,
        max_events: int = None
    ) -> List[VisualizationEvent]:
        """
        Get event history filtered by event types and sources.
        
        Args:
            event_types: List of event types to filter by (None for all)
            sources: List of sources to filter by (None for all)
            max_events: Maximum number of events to return (None for all)
            
        Returns:
            Filtered list of events
        """
        filtered_events = self.event_history
        
        # Filter by event type
        if event_types is not None:
            filtered_events = [e for e in filtered_events if e.event_type in event_types]
        
        # Filter by source
        if sources is not None:
            filtered_events = [e for e in filtered_events if e.source in sources]
        
        # Limit number of events
        if max_events is not None:
            filtered_events = filtered_events[-max_events:]
        
        return filtered_events
    
    def serialize_events(
        self, 
        events: List[VisualizationEvent]
    ) -> str:
        """
        Serialize events to JSON.
        
        Args:
            events: List of events to serialize
            
        Returns:
            JSON string representation of events
        """
        if self.json_encoder is None:
            raise RuntimeError("JSON encoder not available (NumPy import failed)")
        
        serialized_events = [event.serialize() for event in events]
        return json.dumps(serialized_events, cls=self.json_encoder)


class VisualizationHooks:
    """
    Main class for visualization hooks integration.
    
    This class provides the public API for the visualization hooks system,
    combining the event system and result analyzer functionalities.
    """
    
    def __init__(self):
        """Initialize the visualization hooks."""
        self.event_system = EventSystem()
        self.result_analyzer = ResultAnalyzer()
        self.region_extractors = {}
    
    def register_region_extractor(
        self,
        name: str,
        extractor: Callable[[np.ndarray, Tuple], np.ndarray]
    ) -> None:
        """
        Register a function to extract data from a specific region.
        
        Args:
            name: Name of the region extractor
            extractor: Function that extracts data from a region
        """
        self.region_extractors[name] = extractor
    
    def add_listener(
        self, 
        listener: VisualizationEventListener, 
        event_types: List[VisualizationEventType] = None
    ) -> None:
        """
        Add a listener for specific event types or all events.
        
        Args:
            listener: Event listener
            event_types: List of event types to listen for, or None for all events
        """
        self.event_system.add_listener(listener, event_types)
    
    def remove_listener(
        self, 
        listener: VisualizationEventListener, 
        event_types: List[VisualizationEventType] = None
    ) -> None:
        """
        Remove a listener for specific event types or all events.
        
        Args:
            listener: Event listener
            event_types: List of event types to remove listener from, or None for all events
        """
        self.event_system.remove_listener(listener, event_types)
    
    def publish_event(
        self, 
        event_type: VisualizationEventType, 
        source: str, 
        data: Dict[str, Any]
    ) -> None:
        """
        Create and publish an event.
        
        Args:
            event_type: Type of the event
            source: Source of the event
            data: Event data payload
        """
        event = VisualizationEvent(event_type, source, data)
        self.event_system.publish_event(event)
    
    def extract_region(
        self, 
        data: np.ndarray, 
        region_type: str, 
        region_params: Tuple
    ) -> Optional[np.ndarray]:
        """
        Extract data from a specific region of the domain.
        
        Args:
            data: Full domain data
            region_type: Type of region extraction method
            region_params: Parameters for the region extraction
            
        Returns:
            Extracted data or None if extraction fails
        """
        if region_type not in self.region_extractors:
            logger.error(f"Region extractor '{region_type}' not registered")
            return None
        
        try:
            return self.region_extractors[region_type](data, region_params)
        except Exception as e:
            logger.error(f"Error extracting region using '{region_type}': {e}")
            return None
    
    def compute_statistics(
        self, 
        data: np.ndarray, 
        statistics: List[str] = None
    ) -> Dict[str, Any]:
        """
        Compute statistics for a dataset.
        
        Args:
            data: Data array
            statistics: List of statistics to compute (defaults to all registered)
            
        Returns:
            Dictionary mapping statistic names to values
        """
        return self.result_analyzer.compute_statistics(data, statistics)
    
    def compute_derived_quantity(
        self, 
        name: str, 
        variables: Dict[str, np.ndarray]
    ) -> Optional[np.ndarray]:
        """
        Compute a derived quantity.
        
        Args:
            name: Name of the derived quantity
            variables: Dictionary mapping variable names to data arrays
            
        Returns:
            Computed derived quantity or None if computation fails
        """
        return self.result_analyzer.compute_derived_quantity(name, variables)
    
    def register_statistic(
        self, 
        name: str, 
        function: Callable[[np.ndarray], Any]
    ) -> None:
        """
        Register a statistic function.
        
        Args:
            name: Name of the statistic
            function: Function that computes the statistic from an array
        """
        self.result_analyzer.register_statistic(name, function)
    
    def register_derived_quantity(
        self, 
        name: str, 
        function: Callable[[Dict[str, np.ndarray]], np.ndarray]
    ) -> None:
        """
        Register a derived quantity function.
        
        Args:
            name: Name of the derived quantity
            function: Function that computes the derived quantity from a set of variables
        """
        self.result_analyzer.register_derived_quantity(name, function)


# Create a default instance for easy imports
default_hooks = VisualizationHooks() 