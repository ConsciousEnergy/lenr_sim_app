"""
Simulation Species Module for LENR_Sim_App

This module defines the Species class for representing chemical and nuclear
species in LENR simulations, including their properties and distributions.
"""

import numpy as np
from typing import Dict, Tuple, Optional, Union, Any
import logging

from app.utils.logging import setup_logger
from app.simulation.domain import SimulationDomain

# Set up logger
logger = setup_logger("sim_species", "logs/simulation.log")

class Species:
    """
    Class representing a chemical or nuclear species in the simulation.
    Handles species properties, initial conditions, and distribution functions.
    """
    
    def __init__(
        self, 
        name: str, 
        atomic_number: int, 
        mass_number: int, 
        diffusion_coefficient: float = 0.0,
        initial_concentration: Union[float, np.ndarray, Dict[str, Any]] = 0.0,
        properties: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize a species.
        
        Args:
            name: Name of the species
            atomic_number: Atomic number (Z)
            mass_number: Mass number (A)
            diffusion_coefficient: Diffusion coefficient in m²/s
            initial_concentration: Initial concentration as:
                - float: Uniform concentration
                - ndarray: Spatial distribution matching domain
                - dict: Parameters for distribution function
            properties: Additional properties of the species (e.g., charge, spin)
        """
        self.name = name
        self.atomic_number = atomic_number
        self.mass_number = mass_number
        self.diffusion_coefficient = diffusion_coefficient
        self.properties = properties or {}
        
        # Store the initial concentration specification for later instantiation
        # on a specific domain
        self._initial_concentration_spec = initial_concentration
        self._concentration = None
        
        logger.debug(f"Created species {name} (Z={atomic_number}, A={mass_number})")
    
    @property
    def concentration(self) -> Optional[np.ndarray]:
        """Get the current concentration array"""
        return self._concentration
    
    @concentration.setter
    def concentration(self, value: np.ndarray):
        """Set the concentration array"""
        self._concentration = value
    
    def initialize_on_domain(self, domain: SimulationDomain) -> np.ndarray:
        """
        Initialize the concentration distribution on a specific domain.
        
        Args:
            domain: Simulation domain to initialize on
            
        Returns:
            Initialized concentration array
        """
        nx, ny, nz = domain.resolution
        
        # Handle different types of initial concentration specifications
        if isinstance(self._initial_concentration_spec, float):
            # Uniform concentration
            concentration = np.ones(domain.resolution) * self._initial_concentration_spec
            
        elif isinstance(self._initial_concentration_spec, np.ndarray):
            # Directly provided spatial distribution
            if self._initial_concentration_spec.shape != domain.resolution:
                logger.warning(
                    f"Concentration array shape {self._initial_concentration_spec.shape} "
                    f"doesn't match domain resolution {domain.resolution}. Resizing."
                )
                # Resize array to match domain (simple interpolation)
                concentration = np.resize(self._initial_concentration_spec, domain.resolution)
            else:
                concentration = self._initial_concentration_spec.copy()
                
        elif isinstance(self._initial_concentration_spec, dict):
            # Distribution function parameters
            dist_type = self._initial_concentration_spec.get('type', 'uniform')
            
            if dist_type == 'uniform':
                value = self._initial_concentration_spec.get('value', 0.0)
                concentration = np.ones(domain.resolution) * value
                
            elif dist_type == 'gaussian':
                # Gaussian distribution parameters
                center = self._initial_concentration_spec.get('center', (0.5, 0.5, 0.5))
                sigma = self._initial_concentration_spec.get('sigma', (0.1, 0.1, 0.1))
                amplitude = self._initial_concentration_spec.get('amplitude', 1.0)
                background = self._initial_concentration_spec.get('background', 0.0)
                
                # Create Gaussian distribution
                x_rel = (domain.x_grid - center[0] * domain.dimensions[0]) / (sigma[0] * domain.dimensions[0])
                y_rel = (domain.y_grid - center[1] * domain.dimensions[1]) / (sigma[1] * domain.dimensions[1]) 
                z_rel = (domain.z_grid - center[2] * domain.dimensions[2]) / (sigma[2] * domain.dimensions[2])
                
                gaussian = np.exp(-(x_rel**2 + y_rel**2 + z_rel**2))
                concentration = background + amplitude * gaussian
                
            elif dist_type == 'exponential':
                # Exponential distribution from a boundary
                direction = self._initial_concentration_spec.get('direction', 'x')
                scale = self._initial_concentration_spec.get('scale', 0.1)
                amplitude = self._initial_concentration_spec.get('amplitude', 1.0)
                background = self._initial_concentration_spec.get('background', 0.0)
                
                if direction == 'x':
                    rel_pos = domain.x_grid / domain.dimensions[0]
                elif direction == 'y':
                    rel_pos = domain.y_grid / domain.dimensions[1]
                elif direction == 'z':
                    rel_pos = domain.z_grid / domain.dimensions[2]
                else:
                    logger.warning(f"Unknown direction {direction}, using x")
                    rel_pos = domain.x_grid / domain.dimensions[0]
                
                concentration = background + amplitude * np.exp(-rel_pos / scale)
                
            elif dist_type == 'custom':
                # Custom function provided as a string to be evaluated
                function_str = self._initial_concentration_spec.get('function', '0.0')
                try:
                    # Create local variables for the domain grids, normalized to [0,1]
                    x = domain.x_grid / domain.dimensions[0]
                    y = domain.y_grid / domain.dimensions[1]
                    z = domain.z_grid / domain.dimensions[2]
                    
                    # Evaluate the function string
                    concentration = eval(function_str)
                except Exception as e:
                    logger.error(f"Error evaluating custom distribution function: {e}")
                    concentration = np.zeros(domain.resolution)
            else:
                logger.warning(f"Unknown distribution type: {dist_type}, using uniform zero")
                concentration = np.zeros(domain.resolution)
        else:
            logger.warning(f"Invalid initial concentration specification type, using zero")
            concentration = np.zeros(domain.resolution)
        
        # Ensure concentration is non-negative
        concentration = np.maximum(concentration, 0.0)
        
        # Store and return the concentration array
        self._concentration = concentration
        
        logger.info(f"Initialized {self.name} concentration on domain: min={np.min(concentration):.2e}, max={np.max(concentration):.2e}, mean={np.mean(concentration):.2e}")
        return concentration
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert the species to a dictionary representation
        
        Returns:
            Dictionary with species properties
        """
        return {
            'name': self.name,
            'atomic_number': self.atomic_number,
            'mass_number': self.mass_number,
            'diffusion_coefficient': self.diffusion_coefficient,
            'initial_concentration': self._initial_concentration_spec,
            'properties': self.properties
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Species':
        """
        Create a species from a dictionary representation
        
        Args:
            data: Dictionary with species properties
            
        Returns:
            Species instance
        """
        return cls(
            name=data['name'],
            atomic_number=data['atomic_number'],
            mass_number=data['mass_number'],
            diffusion_coefficient=data.get('diffusion_coefficient', 0.0),
            initial_concentration=data.get('initial_concentration', 0.0),
            properties=data.get('properties')
        ) 