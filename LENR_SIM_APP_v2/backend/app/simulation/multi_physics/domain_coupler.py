"""
Domain Coupler Module

This module provides the DomainCoupler class that manages data exchange between
different physics domains, including interpolation and transformation of variables.
"""

import numpy as np
from typing import Dict, Any, Optional, List, Callable, Tuple
import logging

from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("domain_coupler", "logs/simulation.log")


class DomainCoupler:
    """
    Manages the data exchange between physics domains.
    
    The DomainCoupler handles the mapping of variables between different domains,
    including any necessary transformations or interpolations to convert between
    different discretizations or coordinate systems.
    """
    
    def __init__(self, source_domain: str, target_domain: str):
        """
        Initialize a coupler between two domains.
        
        Args:
            source_domain: Name of the source domain
            target_domain: Name of the target domain
        """
        self.source_domain = source_domain
        self.target_domain = target_domain
        self.variable_mappings: Dict[str, Tuple[str, Optional[Callable]]] = {}
        
        logger.info(f"Created coupler: {source_domain} -> {target_domain}")
    
    def add_variable_mapping(
        self, 
        source_var: str, 
        target_var: str, 
        transformation: Optional[Callable] = None
    ) -> None:
        """
        Add a mapping between source and target variables.
        
        Args:
            source_var: Name of the source variable
            target_var: Name of the target variable
            transformation: Optional function to transform the variable
                If provided, should accept a NumPy array and return a NumPy array
                If None, direct copying is used
        """
        self.variable_mappings[source_var] = (target_var, transformation)
        if transformation:
            logger.debug(f"Added mapping with transformation: {source_var} -> {target_var}")
        else:
            logger.debug(f"Added direct mapping: {source_var} -> {target_var}")
    
    def exchange_data(self, manager: 'PhysicsDomainManager') -> None:
        """
        Exchange data between domains using the current mappings.
        
        Args:
            manager: PhysicsDomainManager instance to get/set variables
            
        Raises:
            KeyError: If a domain or variable doesn't exist
            ValueError: If a transformation fails
        """
        from .domain_manager import PhysicsDomainManager
        
        for source_var, (target_var, transformation) in self.variable_mappings.items():
            try:
                # Get the source variable from the state repository
                source_value = manager.state_repository.get_variable(
                    self.source_domain, source_var
                )
                
                # Apply transformation if provided
                if transformation:
                    try:
                        target_value = transformation(source_value)
                    except Exception as e:
                        logger.error(f"Transformation failed for {source_var} -> {target_var}: {str(e)}")
                        raise ValueError(f"Transformation failed: {str(e)}")
                else:
                    target_value = np.copy(source_value)
                
                # Set the target variable in the state repository
                manager.state_repository.set_variable(
                    self.target_domain, target_var, target_value
                )
                
                logger.debug(f"Exchanged data: {self.source_domain}.{source_var} -> {self.target_domain}.{target_var}")
                
            except KeyError as e:
                logger.error(f"Data exchange failed: {str(e)}")
                raise
    
    def get_mappings(self) -> Dict[str, Tuple[str, bool]]:
        """
        Get all variable mappings for this coupler.
        
        Returns:
            Dictionary mapping source variables to tuples of
            (target variable, has transformation)
        """
        return {
            source_var: (target_var, transformation is not None)
            for source_var, (target_var, transformation) in self.variable_mappings.items()
        }
    
    def get_source_domain(self) -> str:
        """
        Get the name of the source domain.
        
        Returns:
            Source domain name
        """
        return self.source_domain
    
    def get_target_domain(self) -> str:
        """
        Get the name of the target domain.
        
        Returns:
            Target domain name
        """
        return self.target_domain
