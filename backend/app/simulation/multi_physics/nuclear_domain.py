"""
Nuclear Domain Module

This module provides the NuclearDomain class that handles nuclear processes
in LENR simulations, including fusion reactions and energy production.
"""

import numpy as np
from typing import Dict, Any, Optional, List, Set, Tuple
import logging

from app.utils.logging import setup_logger
from app.physics.enhanced_fusion import calculator as fusion_calculator
from app.simulation.domain import SimulationDomain

from .interface import DomainInterface

# Set up logger
logger = setup_logger("nuclear_domain", "logs/simulation.log")


class NuclearDomain(DomainInterface):
    """
    Physics domain for nuclear processes in LENR simulations.
    
    The NuclearDomain handles fusion reactions and nuclear processes,
    calculates reaction rates and energy production, and provides
    this information to other domains through the coupling interface.
    """
    
    def __init__(self, domain: SimulationDomain):
        """
        Initialize the nuclear domain.
        
        Args:
            domain: SimulationDomain instance defining the spatial domain
        """
        self.domain = domain
        self.initialized = False
        
        # State variables
        self.temperature = np.zeros(domain.resolution)  # K
        self.densities: Dict[str, np.ndarray] = {}      # m^-3
        self.reaction_rates: Dict[str, np.ndarray] = {} # reactions/s/m^3
        self.power_density = np.zeros(domain.resolution) # W/m^3
        self.energy_deposition = np.zeros(domain.resolution) # J/m^3
        
        # Configuration
        self.reactions: List[str] = []
        self.mechanisms: Optional[List[str]] = None
        self.config: Dict[str, Any] = {}
        
        logger.info("Created NuclearDomain")
    
    def initialize(self, config: Dict[str, Any]) -> None:
        """
        Initialize the nuclear domain with configuration.
        
        Args:
            config: Configuration dictionary with parameters:
                - reactions: List of reaction names to simulate
                - mechanisms: List of enhancement mechanisms to include
                - initial_temperature: Initial temperature in K
                - densities: Dictionary mapping species to initial densities
        """
        self.reactions = config.get('reactions', [])
        self.mechanisms = config.get('mechanisms', None)
        self.config = config
        
        # Initialize temperature if provided
        initial_temp = config.get('initial_temperature', 300.0)  # K
        self.temperature.fill(initial_temp)
        
        # Initialize densities
        for species, density in config.get('densities', {}).items():
            # Create density array if needed
            if species not in self.densities:
                self.densities[species] = np.zeros(self.domain.resolution)
            
            # Set initial density
            self.densities[species].fill(density)
        
        # Initialize reaction rates for each reaction
        for reaction in self.reactions:
            self.reaction_rates[reaction] = np.zeros(self.domain.resolution)
        
        self.initialized = True
        logger.info(f"Initialized NuclearDomain with {len(self.reactions)} reactions")
    
    def advance(self, dt: float) -> bool:
        """
        Advance the nuclear domain by the given time step.
        
        Args:
            dt: Time step size in seconds
            
        Returns:
            True if the advance was successful, False otherwise
        """
        if not self.initialized:
            logger.error("NuclearDomain not initialized")
            return False
        
        try:
            # Reset the power density and energy deposition
            self.power_density.fill(0.0)
            
            # Calculate reaction rates for each reaction
            for reaction in self.reactions:
                # Get reactant species from reaction name (e.g., 'd-d', 'p-B11')
                reactants = reaction.split('-')
                if len(reactants) != 2:
                    logger.warning(f"Invalid reaction format: {reaction}")
                    continue
                
                r1, r2 = reactants
                
                # Skip if densities not available
                if r1 not in self.densities or r2 not in self.densities:
                    logger.warning(f"Missing density for reaction {reaction}")
                    continue
                
                # Calculate reaction rates for each point
                # For performance, we'll use a representative temperature
                # In a full implementation, we would calculate rates for each spatial position
                
                # Get a representative temperature (e.g., mean)
                temp = np.mean(self.temperature)
                
                # Get representative densities
                density1 = np.mean(self.densities[r1])
                density2 = np.mean(self.densities[r2])
                
                try:
                    # Calculate reaction rate using EnhancedFusionCalculator
                    result = fusion_calculator.calculate_reaction_rate(
                        reaction_name=reaction,
                        temperature=temp,
                        density1=density1,
                        density2=density2,
                        mechanisms=self.mechanisms
                    )
                    
                    # Get the reaction rate and power density
                    rate = result.get("reaction_rate_m3_s", 0.0)
                    power = result.get("power_density_W_m3", 0.0)
                    
                    # Update the domain-wide rates using the density distributions
                    # This is a simplified approach; a full implementation would
                    # calculate rates for each spatial position
                    norm_density1 = self.densities[r1] / density1 if density1 > 0 else np.zeros_like(self.densities[r1])
                    norm_density2 = self.densities[r2] / density2 if density2 > 0 else np.zeros_like(self.densities[r2])
                    
                    # Spatial distribution of reaction rate
                    self.reaction_rates[reaction] = rate * norm_density1 * norm_density2
                    
                    # Add to total power density
                    self.power_density += power * norm_density1 * norm_density2
                    
                except Exception as e:
                    logger.error(f"Error calculating reaction rate for {reaction}: {str(e)}")
                    return False
            
            # Calculate energy deposition
            self.energy_deposition += self.power_density * dt
            
            return True
            
        except Exception as e:
            logger.error(f"Error in NuclearDomain.advance: {str(e)}")
            return False
    
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
        if variable_name == "temperature":
            return np.copy(self.temperature)
        elif variable_name == "power_density":
            return np.copy(self.power_density)
        elif variable_name == "energy_deposition":
            return np.copy(self.energy_deposition)
        elif variable_name.startswith("density_"):
            species = variable_name[8:]  # Remove 'density_' prefix
            if species in self.densities:
                return np.copy(self.densities[species])
        elif variable_name.startswith("reaction_rate_"):
            reaction = variable_name[14:]  # Remove 'reaction_rate_' prefix
            if reaction in self.reaction_rates:
                return np.copy(self.reaction_rates[reaction])
        
        raise KeyError(f"Variable not found in NuclearDomain: {variable_name}")
    
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
        # Check shape compatibility
        expected_shape = self.domain.resolution
        if value.shape != expected_shape:
            raise ValueError(f"Incompatible shape: expected {expected_shape}, got {value.shape}")
        
        if variable_name == "temperature":
            self.temperature = np.copy(value)
        elif variable_name.startswith("density_"):
            species = variable_name[8:]  # Remove 'density_' prefix
            self.densities[species] = np.copy(value)
        else:
            raise KeyError(f"Cannot set variable in NuclearDomain: {variable_name}")
    
    def get_max_stable_timestep(self) -> float:
        """
        Get the maximum stable time step for this domain.
        
        For the nuclear domain, this is typically limited by the rate of
        change of temperature or density due to reactions.
        
        Returns:
            Maximum stable time step in seconds
        """
        # In a full implementation, this would be based on reaction rates
        # For now, return a conservative estimate
        return 1.0e-6  # 1 microsecond
    
    def get_required_variables(self) -> Set[str]:
        """
        Get the set of variable names that this domain requires from other domains.
        
        Returns:
            Set of variable names
        """
        # The nuclear domain primarily requires temperature input
        return {"temperature"}
    
    def get_provided_variables(self) -> Set[str]:
        """
        Get the set of variable names that this domain provides to other domains.
        
        Returns:
            Set of variable names
        """
        provided = {"power_density", "energy_deposition"}
        
        # Add all density variables
        for species in self.densities:
            provided.add(f"density_{species}")
        
        # Add all reaction rate variables
        for reaction in self.reaction_rates:
            provided.add(f"reaction_rate_{reaction}")
        
        return provided
    
    def validate_state(self) -> Tuple[bool, List[str]]:
        """
        Validate the current state of the domain for physical consistency.
        
        Returns:
            Tuple containing:
            - Boolean indicating if the state is valid
            - List of error messages if the state is invalid
        """
        errors = []
        
        # Check for negative or NaN values in temperature
        if np.any(np.isnan(self.temperature)):
            errors.append("Temperature contains NaN values")
        elif np.any(self.temperature < 0):
            errors.append("Temperature contains negative values")
        
        # Check for negative or NaN values in densities
        for species, density in self.densities.items():
            if np.any(np.isnan(density)):
                errors.append(f"Density of {species} contains NaN values")
            elif np.any(density < 0):
                errors.append(f"Density of {species} contains negative values")
        
        # Check for NaN values in reaction rates
        for reaction, rate in self.reaction_rates.items():
            if np.any(np.isnan(rate)):
                errors.append(f"Reaction rate for {reaction} contains NaN values")
        
        return len(errors) == 0, errors
    
    def get_domain_name(self) -> str:
        """
        Get the name of this physics domain.
        
        Returns:
            Domain name string
        """
        return "nuclear"
