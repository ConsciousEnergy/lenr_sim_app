"""
Domain Interface Module

This module defines the abstract interface that all physics domains must implement
to participate in the multi-physics coupling framework.
"""

import abc
import numpy as np
from typing import Dict, Any, Optional, List, Set, Tuple


class DomainInterface(abc.ABC):
    """
    Abstract base class defining the interface for physics domains.
    
    All physics domains (nuclear, thermal, mechanical, etc.) must implement
    this interface to participate in the multi-physics coupling framework.
    """
    
    @abc.abstractmethod
    def initialize(self, config: Dict[str, Any]) -> None:
        """
        Initialize the physics domain with configuration parameters.
        
        Args:
            config: Dictionary containing domain-specific configuration parameters
        """
        pass
        
    @abc.abstractmethod
    def advance(self, dt: float) -> bool:
        """
        Advance the domain state by the given time step.
        
        Args:
            dt: Time step size in seconds
            
        Returns:
            True if the advance was successful, False otherwise
        """
        pass
        
    @abc.abstractmethod
    def get_state(self, variable_name: str) -> np.ndarray:
        """
        Get the current state of a specific variable.
        
        Args:
            variable_name: Name of the state variable to retrieve
            
        Returns:
            NumPy array containing the variable state
            
        Raises:
            KeyError: If the variable does not exist in this domain
        """
        pass
        
    @abc.abstractmethod
    def set_state(self, variable_name: str, value: np.ndarray) -> None:
        """
        Set the state of a specific variable.
        
        Args:
            variable_name: Name of the state variable to set
            value: NumPy array containing the new variable state
            
        Raises:
            KeyError: If the variable does not exist in this domain
            ValueError: If the value has an incompatible shape
        """
        pass
        
    @abc.abstractmethod
    def get_max_stable_timestep(self) -> float:
        """
        Get the maximum stable time step for this domain.
        
        Returns:
            Maximum stable time step in seconds
        """
        pass
    
    @abc.abstractmethod
    def get_required_variables(self) -> Set[str]:
        """
        Get the set of variable names that this domain requires from other domains.
        
        Returns:
            Set of variable names
        """
        pass
    
    @abc.abstractmethod
    def get_provided_variables(self) -> Set[str]:
        """
        Get the set of variable names that this domain provides to other domains.
        
        Returns:
            Set of variable names
        """
        pass
        
    @abc.abstractmethod
    def validate_state(self) -> Tuple[bool, List[str]]:
        """
        Validate the current state of the domain for physical consistency.
        
        Returns:
            Tuple containing:
            - Boolean indicating if the state is valid
            - List of error messages if the state is invalid
        """
        pass
        
    @abc.abstractmethod
    def get_domain_name(self) -> str:
        """
        Get the name of this physics domain.
        
        Returns:
            Domain name string
        """
        pass
