"""
Simulation Reaction Module for LENR_Sim_App

This module defines the Reaction classes for representing chemical and nuclear
reactions in LENR simulations, including rate calculations and product generation.
"""

import numpy as np
from typing import Dict, List, Tuple, Optional, Union, Any, Protocol
import logging
from abc import ABC, abstractmethod

from app.utils.logging import setup_logger
from app.simulation.domain import SimulationDomain
from app.simulation.species import Species
from app.physics.models import FusionReaction
from app.physics.enhanced_fusion import EnhancedFusionCalculator

# Set up logger
logger = setup_logger("sim_reaction", "logs/simulation.log")

class Reaction(ABC):
    """
    Abstract base class for reactions in the simulation.
    Provides interface for all reaction types.
    """
    
    def __init__(
        self, 
        name: str,
        reactants: List[Species],
        products: List[Species],
        stoichiometry: Optional[Dict[str, float]] = None
    ):
        """
        Initialize a reaction.
        
        Args:
            name: Name of the reaction
            reactants: List of reactant species
            products: List of product species
            stoichiometry: Dictionary mapping species names to stoichiometric coefficients
                           (negative for reactants, positive for products)
        """
        self.name = name
        self.reactants = reactants
        self.products = products
        
        # Initialize stoichiometry if not provided
        if stoichiometry is None:
            self.stoichiometry = {}
            # Default: -1 for reactants, +1 for products
            for species in reactants:
                self.stoichiometry[species.name] = -1.0
            for species in products:
                self.stoichiometry[species.name] = 1.0
        else:
            self.stoichiometry = stoichiometry
            
        # Reaction rate array (initialized when calculating)
        self._rate = None
        
        logger.debug(f"Created reaction {name} with {len(reactants)} reactants and {len(products)} products")
    
    @property
    def rate(self) -> Optional[np.ndarray]:
        """Get the current reaction rate array"""
        return self._rate
    
    @abstractmethod
    def calculate_rate(
        self, 
        concentrations: Dict[str, np.ndarray], 
        temperature: np.ndarray,
        domain: SimulationDomain,
        **kwargs
    ) -> np.ndarray:
        """
        Calculate the reaction rate for the given conditions.
        
        Args:
            concentrations: Dictionary mapping species names to concentration arrays
            temperature: Temperature array
            domain: Simulation domain
            **kwargs: Additional parameters for the calculation
            
        Returns:
            Reaction rate array
        """
        pass
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert the reaction to a dictionary representation
        
        Returns:
            Dictionary with reaction properties
        """
        return {
            'name': self.name,
            'reactants': [r.name for r in self.reactants],
            'products': [p.name for p in self.products],
            'stoichiometry': self.stoichiometry,
            'type': self.__class__.__name__
        }
    
    @classmethod
    def from_dict(
        cls, 
        data: Dict[str, Any], 
        species_dict: Dict[str, Species]
    ) -> 'Reaction':
        """
        Create a reaction from a dictionary representation
        
        Args:
            data: Dictionary with reaction properties
            species_dict: Dictionary mapping species names to Species objects
            
        Returns:
            Reaction instance
        """
        # Get reactants and products from species dictionary
        reactants = [species_dict[name] for name in data['reactants']]
        products = [species_dict[name] for name in data['products']]
        
        return cls(
            name=data['name'],
            reactants=reactants,
            products=products,
            stoichiometry=data.get('stoichiometry')
        )


class MassActionReaction(Reaction):
    """
    Mass action reaction model for chemical reactions.
    Rate = k * prod(reactant_concentrations^stoichiometry)
    """
    
    def __init__(
        self,
        name: str,
        reactants: List[Species],
        products: List[Species],
        rate_constant: float,
        activation_energy: float = 0.0,
        temperature_exponent: float = 0.0,
        stoichiometry: Optional[Dict[str, float]] = None
    ):
        """
        Initialize a mass action reaction.
        
        Args:
            name: Name of the reaction
            reactants: List of reactant species
            products: List of product species
            rate_constant: Rate constant k
            activation_energy: Activation energy in J/mol
            temperature_exponent: Temperature exponent for modified Arrhenius equation
            stoichiometry: Dictionary mapping species names to stoichiometric coefficients
        """
        super().__init__(name, reactants, products, stoichiometry)
        self.rate_constant = rate_constant
        self.activation_energy = activation_energy
        self.temperature_exponent = temperature_exponent
        
        logger.debug(f"Created mass action reaction {name} with k={rate_constant}, Ea={activation_energy} J/mol")
    
    def calculate_rate(
        self, 
        concentrations: Dict[str, np.ndarray], 
        temperature: np.ndarray,
        domain: SimulationDomain,
        **kwargs
    ) -> np.ndarray:
        """
        Calculate the reaction rate based on mass action kinetics.
        
        Args:
            concentrations: Dictionary mapping species names to concentration arrays
            temperature: Temperature array
            domain: Simulation domain
            **kwargs: Additional parameters (not used)
            
        Returns:
            Reaction rate array
        """
        # Get gas constant in J/(mol*K)
        R = 8.314
        
        # Calculate temperature-dependent rate constant (Arrhenius equation)
        # k(T) = A * T^n * exp(-Ea/RT)
        k = self.rate_constant * temperature**self.temperature_exponent * np.exp(-self.activation_energy / (R * temperature))
        
        # Calculate rate based on mass action kinetics
        rate = np.ones_like(temperature)
        
        for species in self.reactants:
            if species.name in concentrations:
                # Get concentration and absolute stoichiometric coefficient
                conc = concentrations[species.name]
                coeff = abs(self.stoichiometry.get(species.name, 1.0))
                
                # Multiply rate by concentration^coefficient
                rate *= conc**coeff
        
        # Multiply by rate constant
        rate *= k
        
        # Store and return the rate
        self._rate = rate
        return rate
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation"""
        data = super().to_dict()
        data.update({
            'rate_constant': self.rate_constant,
            'activation_energy': self.activation_energy,
            'temperature_exponent': self.temperature_exponent
        })
        return data
    
    @classmethod
    def from_dict(
        cls, 
        data: Dict[str, Any], 
        species_dict: Dict[str, Species]
    ) -> 'MassActionReaction':
        """Create from dictionary representation"""
        # Get reactants and products from species dictionary
        reactants = [species_dict[name] for name in data['reactants']]
        products = [species_dict[name] for name in data['products']]
        
        return cls(
            name=data['name'],
            reactants=reactants,
            products=products,
            rate_constant=data['rate_constant'],
            activation_energy=data.get('activation_energy', 0.0),
            temperature_exponent=data.get('temperature_exponent', 0.0),
            stoichiometry=data.get('stoichiometry')
        )


class FusionReactionModel(Reaction):
    """
    Fusion reaction model for nuclear reactions.
    Uses the EnhancedFusionCalculator for rate calculations.
    """
    
    def __init__(
        self,
        name: str,
        reactants: List[Species],
        products: List[Species],
        fusion_reaction: FusionReaction,
        calculator: Optional[EnhancedFusionCalculator] = None,
        enhancement_mechanisms: Optional[List[str]] = None,
        custom_config: Optional[Dict[str, Any]] = None,
        stoichiometry: Optional[Dict[str, float]] = None
    ):
        """
        Initialize a fusion reaction model.
        
        Args:
            name: Name of the reaction
            reactants: List of reactant species (must be exactly 2)
            products: List of product species
            fusion_reaction: FusionReaction instance with reaction parameters
            calculator: EnhancedFusionCalculator instance (created if None)
            enhancement_mechanisms: List of enhancement mechanisms to include
            custom_config: Custom configuration for enhancement mechanisms
            stoichiometry: Dictionary mapping species names to stoichiometric coefficients
        """
        super().__init__(name, reactants, products, stoichiometry)
        
        if len(reactants) != 2:
            logger.warning(f"Fusion reaction {name} should have exactly 2 reactants, got {len(reactants)}")
        
        self.fusion_reaction = fusion_reaction
        self.enhancement_mechanisms = enhancement_mechanisms
        self.custom_config = custom_config
        
        # Create calculator if not provided
        if calculator is None:
            self.calculator = EnhancedFusionCalculator()
        else:
            self.calculator = calculator
            
        logger.debug(f"Created fusion reaction model {name} with calculator and {len(products)} products")
    
    def calculate_rate(
        self, 
        concentrations: Dict[str, np.ndarray], 
        temperature: np.ndarray,
        domain: SimulationDomain,
        **kwargs
    ) -> np.ndarray:
        """
        Calculate the fusion reaction rate using the EnhancedFusionCalculator.
        
        Args:
            concentrations: Dictionary mapping species names to concentration arrays
            temperature: Temperature array in Kelvin
            domain: Simulation domain
            **kwargs: Additional parameters:
                - sample_factor: Factor to reduce sampling points (default: 5)
                - min_temp_cutoff: Minimum temperature to consider (default: 1000)
            
        Returns:
            Reaction rate array
        """
        if len(self.reactants) < 2:
            logger.error(f"Fusion reaction {self.name} requires 2 reactants, only {len(self.reactants)} provided")
            self._rate = np.zeros_like(temperature)
            return self._rate
            
        r1_name = self.reactants[0].name
        r2_name = self.reactants[1].name
        
        # Check if reactants exist in concentrations
        if r1_name not in concentrations or r2_name not in concentrations:
            missing = []
            if r1_name not in concentrations:
                missing.append(r1_name)
            if r2_name not in concentrations:
                missing.append(r2_name)
                
            logger.warning(f"Missing reactant concentrations for {missing} in reaction {self.name}")
            self._rate = np.zeros_like(temperature)
            return self._rate
        
        # Extract additional parameters
        sample_factor = kwargs.get('sample_factor', 5)
        min_temp_cutoff = kwargs.get('min_temp_cutoff', 1000)  # K
        
        # Get concentrations
        conc1 = concentrations[r1_name]
        conc2 = concentrations[r2_name]
        
        # Create output array
        nx, ny, nz = domain.resolution
        rates = np.zeros((nx, ny, nz))
        
        # Calculate sampling intervals
        sample_x = max(1, nx // sample_factor)
        sample_y = max(1, ny // sample_factor)
        sample_z = max(1, nz // sample_factor)
        
        # Calculate reaction rates at sampled points
        for i in range(0, nx, sample_x):
            for j in range(0, ny, sample_y):
                for k in range(0, nz, sample_z):
                    # Skip calculations for low temperatures (performance optimization)
                    if temperature[i, j, k] < min_temp_cutoff:
                        rates[i, j, k] = 0.0
                        continue
                        
                    # Calculate reaction rate at this point
                    try:
                        result = self.calculator.calculate_reaction_rate(
                            reaction_name=self.fusion_reaction.name,
                            temperature=temperature[i, j, k],
                            density1=conc1[i, j, k],
                            density2=conc2[i, j, k],
                            mechanisms=self.enhancement_mechanisms,
                            custom_config=self.custom_config
                        )
                        
                        # Extract rate and store
                        rates[i, j, k] = result.get("reaction_rate", 0.0)
                    except Exception as e:
                        logger.error(f"Error calculating fusion rate at point ({i},{j},{k}): {str(e)}")
                        rates[i, j, k] = 0.0
        
        # Interpolate to fill the rest of the domain
        # For simplicity, we'll use a nearest-neighbor approach
        # A real implementation would use a proper interpolation method
        for i in range(nx):
            i_sample = (i // sample_x) * sample_x
            i_sample = min(i_sample, nx - 1)
            
            for j in range(ny):
                j_sample = (j // sample_y) * sample_y
                j_sample = min(j_sample, ny - 1)
                
                for k in range(nz):
                    k_sample = (k // sample_z) * sample_z
                    k_sample = min(k_sample, nz - 1)
                    
                    if not (i % sample_x == 0 and j % sample_y == 0 and k % sample_z == 0):
                        rates[i, j, k] = rates[i_sample, j_sample, k_sample]
        
        # Store and return the rate
        self._rate = rates
        return rates
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation"""
        data = super().to_dict()
        data.update({
            'fusion_reaction': self.fusion_reaction.to_dict(),
            'enhancement_mechanisms': self.enhancement_mechanisms,
            'custom_config': self.custom_config
        })
        return data
    
    @classmethod
    def from_dict(
        cls, 
        data: Dict[str, Any], 
        species_dict: Dict[str, Species]
    ) -> 'FusionReactionModel':
        """Create from dictionary representation"""
        # Get reactants and products from species dictionary
        reactants = [species_dict[name] for name in data['reactants']]
        products = [species_dict[name] for name in data['products']]
        
        # Recreate fusion reaction
        fusion_reaction = FusionReaction.from_dict(data['fusion_reaction'])
        
        return cls(
            name=data['name'],
            reactants=reactants,
            products=products,
            fusion_reaction=fusion_reaction,
            enhancement_mechanisms=data.get('enhancement_mechanisms'),
            custom_config=data.get('custom_config'),
            stoichiometry=data.get('stoichiometry')
        ) 