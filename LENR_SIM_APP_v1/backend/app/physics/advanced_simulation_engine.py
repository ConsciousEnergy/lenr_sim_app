"""
Advanced Reaction Simulation Engine for LENR Simulations

This module provides a comprehensive framework for simulating LENR reactions
with spatial heterogeneity, temporal evolution, and coupled physics mechanisms.
It extends the basic fusion calculations to include reaction-diffusion dynamics,
spatial discretization, and multi-physics coupling.
"""

import numpy as np
import scipy.sparse as sp
import scipy.sparse.linalg as spla
from scipy.integrate import solve_ivp
from typing import Dict, List, Tuple, Any, Optional, Union, Callable
import logging
import time
import copy
from enum import Enum
from dataclasses import dataclass, field

from app.utils.logging import setup_logger
from app.physics.models import FusionReaction, FusionEnhancementFactors, ReactionConditions
from app.physics.enhanced_fusion import EnhancedFusionCalculator

# Set up logger
logger = setup_logger("advanced_simulation", "logs/physics.log")


class SimulationDomain:
    """
    Class representing the spatial domain for the simulation.
    """
    def __init__(
        self, 
        dimensions: Tuple[float, float, float], 
        resolution: Tuple[int, int, int],
        boundary_conditions: Dict[str, str] = None
    ):
        """
        Initialize the simulation domain.
        
        Args:
            dimensions: Physical dimensions of the domain in meters (x, y, z)
            resolution: Number of grid points in each dimension (nx, ny, nz)
            boundary_conditions: Boundary conditions for each dimension and face
                Possible values: 'periodic', 'dirichlet', 'neumann'
                Default is periodic for all boundaries.
        """
        self.dimensions = dimensions
        self.resolution = resolution
        
        # Create default boundary conditions if not provided
        if boundary_conditions is None:
            self.boundary_conditions = {
                'x_min': 'periodic', 'x_max': 'periodic',
                'y_min': 'periodic', 'y_max': 'periodic',
                'z_min': 'periodic', 'z_max': 'periodic'
            }
        else:
            self.boundary_conditions = boundary_conditions
        
        # Calculate grid spacing
        self.dx = dimensions[0] / resolution[0]
        self.dy = dimensions[1] / resolution[1]
        self.dz = dimensions[2] / resolution[2]
        
        # Total number of grid points
        self.total_points = resolution[0] * resolution[1] * resolution[2]
        
        # Create mesh grid
        x = np.linspace(0, dimensions[0], resolution[0])
        y = np.linspace(0, dimensions[1], resolution[1])
        z = np.linspace(0, dimensions[2], resolution[2])
        self.x_grid, self.y_grid, self.z_grid = np.meshgrid(x, y, z, indexing='ij')
        
        logger.info(f"Created simulation domain: {dimensions} m with {resolution} grid points")

    def get_coordinates(self, idx: int) -> Tuple[float, float, float]:
        """
        Get the physical coordinates for a given flat index.
        
        Args:
            idx: Flat index in the grid
            
        Returns:
            Tuple of (x, y, z) coordinates
        """
        # Convert flat index to 3D indices
        nx, ny, nz = self.resolution
        i = idx // (ny * nz)
        j = (idx % (ny * nz)) // nz
        k = idx % nz
        
        # Get physical coordinates
        x = i * self.dx
        y = j * self.dy
        z = k * self.dz
        
        return (x, y, z)
    
    def get_index(self, coords: Tuple[float, float, float]) -> int:
        """
        Get the flat index for given physical coordinates.
        
        Args:
            coords: Physical coordinates (x, y, z)
            
        Returns:
            Flat index in the grid
        """
        # Convert physical coordinates to grid indices
        x, y, z = coords
        i = int(x / self.dx)
        j = int(y / self.dy)
        k = int(z / self.dz)
        
        # Ensure indices are within bounds
        i = max(0, min(i, self.resolution[0] - 1))
        j = max(0, min(j, self.resolution[1] - 1))
        k = max(0, min(k, self.resolution[2] - 1))
        
        # Convert to flat index
        nx, ny, nz = self.resolution
        return i * ny * nz + j * nz + k
    
    def create_laplacian_matrix(self) -> sp.csr_matrix:
        """
        Create a sparse matrix representing the Laplacian operator for the domain.
        This is used for diffusion calculations.
        
        Returns:
            Sparse matrix for the Laplacian operator
        """
        nx, ny, nz = self.resolution
        n = nx * ny * nz
        
        # Stencil for 3D Laplacian (7-point stencil)
        stencil = np.zeros((3, 3, 3))
        stencil[1, 1, 0] = 1.0 / (self.dz ** 2)  # z-1
        stencil[1, 0, 1] = 1.0 / (self.dy ** 2)  # y-1
        stencil[0, 1, 1] = 1.0 / (self.dx ** 2)  # x-1
        stencil[1, 1, 1] = -2.0 * (1.0 / (self.dx ** 2) + 1.0 / (self.dy ** 2) + 1.0 / (self.dz ** 2))  # center
        stencil[2, 1, 1] = 1.0 / (self.dx ** 2)  # x+1
        stencil[1, 2, 1] = 1.0 / (self.dy ** 2)  # y+1
        stencil[1, 1, 2] = 1.0 / (self.dz ** 2)  # z+1
        
        # Create sparse matrix
        rows = []
        cols = []
        data = []
        
        # Apply stencil to each point in the grid
        for i in range(nx):
            for j in range(ny):
                for k in range(nz):
                    center_idx = i * ny * nz + j * nz + k
                    
                    # Apply each point in the stencil
                    for di in range(-1, 2):
                        for dj in range(-1, 2):
                            for dk in range(-1, 2):
                                if stencil[di+1, dj+1, dk+1] != 0:
                                    ni, nj, nk = i + di, j + dj, k + dk
                                    
                                    # Handle boundary conditions
                                    if 0 <= ni < nx and 0 <= nj < ny and 0 <= nk < nz:
                                        neighbor_idx = ni * ny * nz + nj * nz + nk
                                        rows.append(center_idx)
                                        cols.append(neighbor_idx)
                                        data.append(stencil[di+1, dj+1, dk+1])
        
        # Create sparse matrix
        laplacian = sp.csr_matrix((data, (rows, cols)), shape=(n, n))
        return laplacian


class Species:
    """
    Class representing a chemical or nuclear species in the simulation.
    """
    def __init__(
        self, 
        name: str, 
        z: int, 
        a: int, 
        diffusion_coefficient: float = 0.0,
        initial_concentration: Union[float, np.ndarray] = 0.0
    ):
        """
        Initialize a species.
        
        Args:
            name: Name of the species
            z: Atomic number
            a: Mass number
            diffusion_coefficient: Diffusion coefficient in m²/s
            initial_concentration: Initial concentration (scalar or spatial distribution)
        """
        self.name = name
        self.z = z
        self.a = a
        self.diffusion_coefficient = diffusion_coefficient
        
        # Store initial concentration (scalar or array)
        self.initial_concentration = initial_concentration
        
        logger.debug(f"Created species: {name} (Z={z}, A={a})")
    
    def __str__(self):
        return f"{self.name} (Z={self.z}, A={self.a})"


class ReactionModel:
    """
    Base class for reaction models in the simulation.
    """
    def __init__(
        self, 
        name: str,
        reactants: List[Species],
        products: List[Species],
        rate_constant: float = 0.0,
        activation_energy: float = 0.0,
        is_fusion: bool = False
    ):
        """
        Initialize a reaction model.
        
        Args:
            name: Name of the reaction
            reactants: List of reactant species
            products: List of product species
            rate_constant: Base rate constant for the reaction
            activation_energy: Activation energy in eV
            is_fusion: Whether this is a fusion reaction
        """
        self.name = name
        self.reactants = reactants
        self.products = products
        self.rate_constant = rate_constant
        self.activation_energy = activation_energy
        self.is_fusion = is_fusion
        
        logger.debug(f"Created reaction model: {name}")
    
    def calculate_rate(
        self,
        concentrations: Dict[str, np.ndarray],
        temperature: Union[float, np.ndarray],
        enhancement_factors: Optional[Dict[str, float]] = None
    ) -> np.ndarray:
        """
        Calculate the reaction rate at each point in the domain.
        
        Args:
            concentrations: Dictionary mapping species names to concentration arrays
            temperature: Temperature at each point (K)
            enhancement_factors: Enhancement factors for fusion reactions
            
        Returns:
            Array of reaction rates at each point
        """
        # Base implementation for simple reactions (to be overridden for fusion)
        # r = k * [A] * [B] * exp(-Ea/kT)
        
        # Initialize rate array
        rate = np.ones_like(temperature, dtype=float) * self.rate_constant
        
        # Apply Arrhenius temperature dependence
        if self.activation_energy > 0:
            # Convert activation energy from eV to J
            ea_j = self.activation_energy * 1.602e-19
            kb = 1.380649e-23  # Boltzmann constant in J/K
            
            # Apply temperature dependence
            if isinstance(temperature, float):
                rate *= np.exp(-ea_j / (kb * temperature))
            else:
                # Avoid division by zero in temperature array
                temp_safe = np.maximum(temperature, 1e-10)
                rate *= np.exp(-ea_j / (kb * temp_safe))
        
        # Multiply by reactant concentrations
        for reactant in self.reactants:
            if reactant.name in concentrations:
                rate *= concentrations[reactant.name]
        
        return rate
    
    def __str__(self):
        reactants_str = " + ".join(str(r) for r in self.reactants)
        products_str = " + ".join(str(p) for p in self.products)
        return f"{self.name}: {reactants_str} -> {products_str}"


class FusionReactionModel(ReactionModel):
    """
    Specialized reaction model for fusion reactions.
    """
    def __init__(
        self,
        fusion_reaction: FusionReaction,
        reactants: List[Species],
        products: List[Species],
        calculator: EnhancedFusionCalculator = None
    ):
        """
        Initialize a fusion reaction model.
        
        Args:
            fusion_reaction: FusionReaction object with reaction details
            reactants: List of reactant species
            products: List of product species
            calculator: EnhancedFusionCalculator instance for rate calculations
        """
        super().__init__(
            name=fusion_reaction.name,
            reactants=reactants,
            products=products,
            activation_energy=fusion_reaction.activation_energy,
            is_fusion=True
        )
        
        self.fusion_reaction = fusion_reaction
        self.calculator = calculator or EnhancedFusionCalculator()
        
        logger.debug(f"Created fusion reaction model: {fusion_reaction.name}")
    
    def calculate_rate(
        self,
        concentrations: Dict[str, np.ndarray],
        temperature: Union[float, np.ndarray],
        enhancement_factors: Optional[Dict[str, float]] = None
    ) -> np.ndarray:
        """
        Calculate fusion reaction rate using the EnhancedFusionCalculator.
        
        Args:
            concentrations: Dictionary mapping species names to concentration arrays
            temperature: Temperature at each point (K)
            enhancement_factors: Enhancement factors for fusion mechanisms
            
        Returns:
            Array of reaction rates at each point
        """
        # Extract reactant concentrations
        if len(self.reactants) < 2:
            logger.warning(f"Fusion reaction {self.name} has fewer than 2 reactants")
            return np.zeros_like(temperature, dtype=float)
        
        # Get concentrations for each reactant
        r1_name = self.reactants[0].name
        r2_name = self.reactants[1].name
        
        if r1_name not in concentrations or r2_name not in concentrations:
            logger.warning(f"Missing concentration data for fusion reactants: {r1_name}, {r2_name}")
            return np.zeros_like(temperature, dtype=float)
        
        # Calculate reaction rates for each point in the domain
        # For efficiency, we'll calculate on the whole domain at once when temperature is uniform
        if isinstance(temperature, float):
            # Uniform temperature case
            density1 = concentrations[r1_name]
            density2 = concentrations[r2_name]
            
            # Create enhancement factors object
            ef = None
            if enhancement_factors:
                ef = FusionEnhancementFactors.from_dict(enhancement_factors)
            
            # Calculate reaction rate
            result = self.calculator.calculate_reaction_rate(
                reaction_name=self.fusion_reaction.name,
                temperature=temperature,
                density1=np.mean(density1),
                density2=np.mean(density2),
                mechanisms=None,
                custom_config=None
            )
            
            # Extract rate and apply spatial variation
            base_rate = result.get("reaction_rate", 0.0)
            return base_rate * density1 * density2 / (np.mean(density1) * np.mean(density2))
        else:
            # Variable temperature case - calculate point by point
            # Note: This is computationally expensive and would benefit from vectorization
            rates = np.zeros_like(temperature, dtype=float)
            
            # Sample a subset of points for efficiency
            # In a real implementation, vectorization would be preferred
            nx, ny, nz = temperature.shape
            sample_x = max(1, nx // 10)
            sample_y = max(1, ny // 10)
            sample_z = max(1, nz // 10)
            
            for i in range(0, nx, sample_x):
                for j in range(0, ny, sample_y):
                    for k in range(0, nz, sample_z):
                        # Create enhancement factors object
                        ef = None
                        if enhancement_factors:
                            ef = FusionEnhancementFactors.from_dict(enhancement_factors)
                        
                        # Calculate reaction rate at this point
                        result = self.calculator.calculate_reaction_rate(
                            reaction_name=self.fusion_reaction.name,
                            temperature=temperature[i, j, k],
                            density1=concentrations[r1_name][i, j, k],
                            density2=concentrations[r2_name][i, j, k],
                            mechanisms=None,
                            custom_config=None
                        )
                        
                        # Extract rate and store
                        rates[i, j, k] = result.get("reaction_rate", 0.0)
            
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
            
            return rates


class AdvancedSimulationEngine:
    """
    Core simulation engine for advanced LENR simulations.
    """
    def __init__(
        self,
        domain: SimulationDomain,
        time_step: float,
        max_time: float
    ):
        """
        Initialize the simulation engine.
        
        Args:
            domain: Simulation domain
            time_step: Time step for the simulation in seconds
            max_time: Maximum simulation time in seconds
        """
        self.domain = domain
        self.time_step = time_step
        self.max_time = max_time
        
        # Lists to store simulation components
        self.species: List[Species] = []
        self.reactions: List[ReactionModel] = []
        
        # Storage for simulation data
        self.concentrations: Dict[str, np.ndarray] = {}
        self.temperature: np.ndarray = None
        self.time = 0.0
        
        # Matrices for diffusion calculations
        self.diffusion_matrices: Dict[str, sp.csr_matrix] = {}
        
        # Results storage
        self.results_history = {
            'time': [],
            'concentrations': {},
            'temperature': [],
            'reaction_rates': {}
        }
        
        logger.info(f"Initialized AdvancedSimulationEngine with dt={time_step}s, max_time={max_time}s")
    
    def add_species(self, species: Species):
        """
        Add a species to the simulation.
        
        Args:
            species: Species to add
        """
        self.species.append(species)
        
        # Initialize concentration array
        if isinstance(species.initial_concentration, float):
            # Uniform initial concentration
            concentration = np.ones(self.domain.resolution) * species.initial_concentration
        else:
            # Spatial distribution provided
            concentration = species.initial_concentration
        
        self.concentrations[species.name] = concentration
        self.results_history['concentrations'][species.name] = []
        
        # Create diffusion matrix for this species
        if species.diffusion_coefficient > 0:
            laplacian = self.domain.create_laplacian_matrix()
            self.diffusion_matrices[species.name] = species.diffusion_coefficient * laplacian
        
        logger.debug(f"Added species {species.name} to simulation")
    
    def add_reaction(self, reaction: ReactionModel):
        """
        Add a reaction to the simulation.
        
        Args:
            reaction: Reaction to add
        """
        self.reactions.append(reaction)
        self.results_history['reaction_rates'][reaction.name] = []
        logger.debug(f"Added reaction {reaction.name} to simulation")
    
    def set_temperature(self, temperature: Union[float, np.ndarray]):
        """
        Set the temperature distribution for the simulation.
        
        Args:
            temperature: Temperature in Kelvin (scalar or array)
        """
        if isinstance(temperature, float):
            self.temperature = np.ones(self.domain.resolution) * temperature
        else:
            self.temperature = temperature
        
        logger.debug(f"Set temperature distribution: mean={np.mean(self.temperature)}K")
    
    def initialize(self):
        """
        Initialize the simulation before running.
        """
        # Check that all required components are set
        if not self.species:
            logger.warning("No species added to simulation")
        
        if not self.reactions:
            logger.warning("No reactions added to simulation")
        
        if self.temperature is None:
            logger.warning("Temperature not set, using default 300K")
            self.temperature = np.ones(self.domain.resolution) * 300.0
        
        # Initialize result history with initial values
        self.time = 0.0
        self.results_history['time'].append(self.time)
        
        for name, concentration in self.concentrations.items():
            self.results_history['concentrations'][name].append(concentration.copy())
        
        self.results_history['temperature'].append(self.temperature.copy())
        
        # Calculate initial reaction rates
        for reaction in self.reactions:
            rate = reaction.calculate_rate(self.concentrations, self.temperature)
            self.results_history['reaction_rates'][reaction.name].append(rate.copy())
        
        logger.info("Simulation initialized")
    
    def step(self):
        """
        Advance the simulation by one time step.
        
        Returns:
            bool: True if the simulation can continue, False if it has reached the end
        """
        # Check if we've reached the maximum time
        if self.time >= self.max_time:
            logger.info(f"Reached maximum simulation time: {self.max_time}s")
            return False
        
        # Calculate reaction rates
        reaction_rates = {}
        for reaction in self.reactions:
            reaction_rates[reaction.name] = reaction.calculate_rate(
                self.concentrations, self.temperature
            )
        
        # Update concentrations due to reactions
        new_concentrations = {name: conc.copy() for name, conc in self.concentrations.items()}
        
        for reaction in self.reactions:
            rate = reaction_rates[reaction.name]
            
            # Update reactant concentrations (consumption)
            for reactant in reaction.reactants:
                if reactant.name in new_concentrations:
                    new_concentrations[reactant.name] -= rate * self.time_step
            
            # Update product concentrations (production)
            for product in reaction.products:
                if product.name in new_concentrations:
                    new_concentrations[product.name] += rate * self.time_step
        
        # Ensure concentrations don't go negative
        for name in new_concentrations:
            new_concentrations[name] = np.maximum(new_concentrations[name], 0.0)
        
        # Apply diffusion
        for species in self.species:
            if species.diffusion_coefficient > 0 and species.name in self.diffusion_matrices:
                # Apply implicit diffusion step: (I - dt*D*∇²)c^(n+1) = c^n
                # Where D is the diffusion coefficient and ∇² is the Laplacian
                
                # Flatten concentration array for matrix operations
                conc_flat = new_concentrations[species.name].flatten()
                
                # Solve the linear system
                diffusion_matrix = self.diffusion_matrices[species.name]
                identity = sp.eye(self.domain.total_points)
                lhs = identity - self.time_step * diffusion_matrix
                
                # Solve using a sparse linear solver
                new_conc_flat = spla.spsolve(lhs, conc_flat)
                
                # Reshape back to 3D
                new_concentrations[species.name] = new_conc_flat.reshape(self.domain.resolution)
        
        # Update simulation state
        self.concentrations = new_concentrations
        self.time += self.time_step
        
        # Store results
        self.results_history['time'].append(self.time)
        
        for name, concentration in self.concentrations.items():
            self.results_history['concentrations'][name].append(concentration.copy())
        
        self.results_history['temperature'].append(self.temperature.copy())
        
        for name, rate in reaction_rates.items():
            self.results_history['reaction_rates'][name].append(rate.copy())
        
        return True
    
    def run(self, callback: Optional[Callable] = None):
        """
        Run the simulation from start to finish.
        
        Args:
            callback: Optional callback function called after each step
        """
        logger.info(f"Starting simulation for {self.max_time}s with dt={self.time_step}s")
        
        # Initialize the simulation
        self.initialize()
        
        # Run until the end
        total_steps = int(self.max_time / self.time_step)
        step_count = 0
        
        start_time = time.time()
        
        while self.step():
            step_count += 1
            
            # Call the callback if provided
            if callback is not None:
                callback(self, step_count)
            
            # Log progress periodically
            if step_count % max(1, total_steps // 10) == 0:
                progress = (step_count / total_steps) * 100
                elapsed = time.time() - start_time
                remaining = (elapsed / step_count) * (total_steps - step_count)
                
                logger.info(f"Simulation progress: {progress:.1f}% ({elapsed:.1f}s elapsed, ~{remaining:.1f}s remaining)")
        
        end_time = time.time()
        logger.info(f"Simulation completed in {end_time - start_time:.2f}s ({step_count} steps)")
    
    def get_results(self) -> Dict[str, Any]:
        """
        Get the simulation results.
        
        Returns:
            Dictionary with simulation results
        """
        return {
            'time': np.array(self.results_history['time']),
            'concentrations': {
                name: np.array(conc_history) 
                for name, conc_history in self.results_history['concentrations'].items()
            },
            'temperature': np.array(self.results_history['temperature']),
            'reaction_rates': {
                name: np.array(rate_history)
                for name, rate_history in self.results_history['reaction_rates'].items()
            },
            'domain': {
                'dimensions': self.domain.dimensions,
                'resolution': self.domain.resolution,
                'x_grid': self.domain.x_grid,
                'y_grid': self.domain.y_grid,
                'z_grid': self.domain.z_grid
            }
        }


# Example helper function to create a simulation
def create_fusion_simulation(
    reaction_name: str,
    domain_size: Tuple[float, float, float],
    resolution: Tuple[int, int, int],
    initial_temperature: float,
    reactant_concentrations: Dict[str, float],
    simulation_time: float,
    time_step: float,
    enhancement_factors: Optional[Dict[str, float]] = None
) -> AdvancedSimulationEngine:
    """
    Create a simulation for a specific fusion reaction.
    
    Args:
        reaction_name: Name of the fusion reaction
        domain_size: Physical size of the domain in meters
        resolution: Grid resolution
        initial_temperature: Initial temperature in Kelvin
        reactant_concentrations: Initial concentrations for reactants
        simulation_time: Total simulation time in seconds
        time_step: Time step in seconds
        enhancement_factors: Enhancement factors for fusion mechanisms
        
    Returns:
        Configured AdvancedSimulationEngine
    """
    # Create calculator and get reaction
    calculator = EnhancedFusionCalculator()
    
    if reaction_name not in calculator.reactions:
        logger.error(f"Reaction {reaction_name} not found")
        return None
    
    fusion_reaction = calculator.reactions[reaction_name]
    
    # Create simulation domain
    domain = SimulationDomain(domain_size, resolution)
    
    # Create simulation engine
    engine = AdvancedSimulationEngine(domain, time_step, simulation_time)
    
    # Create and add species
    # Reactants
    reactant1 = Species(
        name=f"{fusion_reaction.reactant1_z}-{fusion_reaction.reactant1_a}",
        z=fusion_reaction.reactant1_z,
        a=fusion_reaction.reactant1_a,
        diffusion_coefficient=1e-9,  # Example value
        initial_concentration=reactant_concentrations.get(f"{fusion_reaction.reactant1_z}-{fusion_reaction.reactant1_a}", 0.0)
    )
    engine.add_species(reactant1)
    
    reactant2 = Species(
        name=f"{fusion_reaction.reactant2_z}-{fusion_reaction.reactant2_a}",
        z=fusion_reaction.reactant2_z,
        a=fusion_reaction.reactant2_a,
        diffusion_coefficient=1e-9,  # Example value
        initial_concentration=reactant_concentrations.get(f"{fusion_reaction.reactant2_z}-{fusion_reaction.reactant2_a}", 0.0)
    )
    engine.add_species(reactant2)
    
    # Products
    if fusion_reaction.products_detail:
        for product in fusion_reaction.products_detail:
            product_species = Species(
                name=product["name"],
                z=product["z"],
                a=product["a"],
                diffusion_coefficient=1e-9,  # Example value
                initial_concentration=0.0
            )
            engine.add_species(product_species)
    
    # Create and add reaction
    reactants = [reactant1, reactant2]
    products = [
        species for species in engine.species 
        if species.name not in [reactant1.name, reactant2.name]
    ]
    
    reaction = FusionReactionModel(
        fusion_reaction=fusion_reaction,
        reactants=reactants,
        products=products,
        calculator=calculator
    )
    engine.add_reaction(reaction)
    
    # Set temperature
    engine.set_temperature(initial_temperature)
    
    return engine 