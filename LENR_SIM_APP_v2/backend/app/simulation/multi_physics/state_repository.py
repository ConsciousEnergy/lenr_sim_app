"""
State Repository Module

This module provides a central repository for state variables across all physics domains,
enabling data exchange between domains with efficient caching and versioning.
"""

import numpy as np
import copy
from typing import Dict, Any, Optional, List, Tuple
import logging

from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("state_repository", "logs/simulation.log")


class StateRepository:
    """
    Central storage for state variables across all physics domains.
    
    The StateRepository manages the exchange of state variables between different
    physics domains, providing efficient access with appropriate caching and
    versioning to support rollback in adaptive time stepping.
    """
    
    def __init__(self):
        """Initialize an empty state repository."""
        # Main state storage: domain -> variable -> value
        self.state: Dict[str, Dict[str, np.ndarray]] = {}
        
        # Version history for adaptive time stepping and rollback
        self.history: Dict[float, Dict[str, Dict[str, np.ndarray]]] = {}
        
        # Keep track of the latest timestamp
        self.current_time: float = 0.0
        
        # Cache for optimizing data access
        self._cache: Dict[str, Any] = {}
        
        logger.info("Initialized StateRepository")
    
    def register_domain(self, domain_name: str) -> None:
        """
        Register a new physics domain with the repository.
        
        Args:
            domain_name: Name of the domain to register
        """
        if domain_name not in self.state:
            self.state[domain_name] = {}
            logger.info(f"Registered domain: {domain_name}")
        else:
            logger.warning(f"Domain already registered: {domain_name}")
    
    def set_variable(self, domain: str, name: str, value: np.ndarray) -> None:
        """
        Set a state variable for a specific domain.
        
        Args:
            domain: Name of the physics domain
            name: Name of the state variable
            value: NumPy array containing the variable state
            
        Raises:
            KeyError: If the domain is not registered
        """
        if domain not in self.state:
            raise KeyError(f"Domain not registered: {domain}")
        
        # Store a copy to prevent external modification
        self.state[domain][name] = np.copy(value)
        
        # Invalidate cache for this variable
        cache_key = f"{domain}:{name}"
        if cache_key in self._cache:
            del self._cache[cache_key]
    
    def get_variable(self, domain: str, name: str) -> np.ndarray:
        """
        Get a state variable for a specific domain.
        
        Args:
            domain: Name of the physics domain
            name: Name of the state variable
            
        Returns:
            NumPy array containing the variable state
            
        Raises:
            KeyError: If the domain is not registered or the variable does not exist
        """
        if domain not in self.state:
            raise KeyError(f"Domain not registered: {domain}")
        
        if name not in self.state[domain]:
            raise KeyError(f"Variable not found: {name} in domain {domain}")
        
        # Check if the value is cached
        cache_key = f"{domain}:{name}"
        if cache_key not in self._cache:
            # Return a copy to prevent external modification
            self._cache[cache_key] = np.copy(self.state[domain][name])
        
        return self._cache[cache_key]
    
    def save_state(self, timestamp: float) -> None:
        """
        Save the current state at the given timestamp.
        
        Args:
            timestamp: Simulation time in seconds
        """
        # Create a deep copy of the current state
        self.history[timestamp] = copy.deepcopy(self.state)
        self.current_time = timestamp
        
        # Limit history size to prevent memory issues
        if len(self.history) > 10:  # Keep only the last 10 states
            oldest_time = min(self.history.keys())
            if oldest_time < timestamp:  # Don't delete the current state
                del self.history[oldest_time]
        
        logger.debug(f"Saved state at time: {timestamp}")
    
    def restore_state(self, timestamp: float) -> bool:
        """
        Restore the state to the given timestamp.
        
        Args:
            timestamp: Simulation time in seconds to restore to
            
        Returns:
            True if the state was successfully restored, False otherwise
        """
        if timestamp not in self.history:
            logger.error(f"Cannot restore state: Timestamp {timestamp} not found")
            return False
        
        # Restore the state from history
        self.state = copy.deepcopy(self.history[timestamp])
        self.current_time = timestamp
        
        # Clear the cache as it's now invalid
        self._cache.clear()
        
        logger.info(f"Restored state to time: {timestamp}")
        return True
    
    def get_variable_info(self) -> Dict[str, List[str]]:
        """
        Get information about all variables in the repository.
        
        Returns:
            Dictionary mapping domain names to lists of variable names
        """
        return {domain: list(variables.keys()) 
                for domain, variables in self.state.items()}
    
    def clear_history(self) -> None:
        """Clear the state history to free memory."""
        self.history.clear()
        logger.info("Cleared state history")
    
    def get_timestamps(self) -> List[float]:
        """
        Get all available timestamps in the history.
        
        Returns:
            List of timestamps in ascending order
        """
        return sorted(self.history.keys())
    
    def get_current_time(self) -> float:
        """
        Get the current simulation time.
        
        Returns:
            Current time in seconds
        """
        return self.current_time
