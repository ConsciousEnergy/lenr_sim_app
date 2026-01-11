"""
Thermal Domain Module

This module provides the ThermalDomain class that handles thermal processes
in LENR simulations, including heat generation, transfer, and dissipation.
"""

import numpy as np
from typing import Dict, Any, Optional, List, Set, Tuple
import logging
from scipy import sparse
from scipy.sparse.linalg import spsolve

from app.utils.logging import setup_logger
from app.simulation.domain import SimulationDomain

from .interface import DomainInterface

# Set up logger
logger = setup_logger("thermal_domain", "logs/simulation.log")


class ThermalDomain(DomainInterface):
    """
    Physics domain for thermal processes in LENR simulations.
    
    The ThermalDomain handles heat generation, transfer, and dissipation,
    models temperature-dependent properties, and supports conduction, 
    convection, and radiation heat transfer mechanisms.
    """
    
    def __init__(self, domain: SimulationDomain):
        """
        Initialize the thermal domain.
        
        Args:
            domain: SimulationDomain instance defining the spatial domain
        """
        self.domain = domain
        self.initialized = False
        
        # State variables
        self.temperature = np.zeros(domain.resolution)  # K
        self.heat_capacity = np.zeros(domain.resolution)  # J/(kg*K)
        self.thermal_conductivity = np.zeros(domain.resolution)  # W/(m*K)
        self.density = np.zeros(domain.resolution)  # kg/m^3
        self.heat_source = np.zeros(domain.resolution)  # W/m^3
        
        # Diffusion operator (Laplacian matrix)
        self._diffusion_matrix = None
        
        # Configuration
        self.config: Dict[str, Any] = {}
        
        logger.info("Created ThermalDomain")
    
    def initialize(self, config: Dict[str, Any]) -> None:
        """
        Initialize the thermal domain with configuration.
        
        Args:
            config: Configuration dictionary with parameters:
                - initial_temperature: Initial temperature in K
                - thermal_conductivity: Thermal conductivity in W/(m*K)
                - heat_capacity: Heat capacity in J/(kg*K)
                - density: Material density in kg/m^3
                - boundary_conditions: Dictionary of boundary conditions
        """
        self.config = config
        
        # Initialize temperature if provided
        initial_temp = config.get('initial_temperature', 300.0)  # K
        self.temperature.fill(initial_temp)
        
        # Initialize material properties
        k = config.get('thermal_conductivity', 1.0)  # W/(m*K)
        cp = config.get('heat_capacity', 1000.0)  # J/(kg*K)
        rho = config.get('density', 1000.0)  # kg/m^3
        
        self.thermal_conductivity.fill(k)
        self.heat_capacity.fill(cp)
        self.density.fill(rho)
        
        # Create diffusion matrix for heat equation
        self._create_diffusion_matrix()
        
        self.initialized = True
        logger.info("Initialized ThermalDomain")
    
    def _create_diffusion_matrix(self) -> None:
        """
        Create the diffusion matrix (Laplacian) for the heat equation.
        
        This implements a finite difference approximation of the Laplacian
        operator on the domain grid, taking into account boundary conditions.
        """
        nx, ny, nz = self.domain.resolution
        dx = self.domain.dx
        dy = self.domain.dy
        dz = self.domain.dz
        
        # Number of grid points
        n = nx * ny * nz
        
        # Initialize sparse matrix
        rows = []
        cols = []
        vals = []
        
        # Diffusion coefficients (assuming isotropic material)
        alpha = self.thermal_conductivity / (self.density * self.heat_capacity)
        alpha_mean = np.mean(alpha)  # Use mean value for now
        
        # Constants for finite difference approximation
        cx = alpha_mean / (dx**2)
        cy = alpha_mean / (dy**2)
        cz = alpha_mean / (dz**2)
        
        # Construct sparse matrix for 3D Laplacian
        for i in range(nx):
            for j in range(ny):
                for k in range(nz):
                    # Current node index
                    idx = i * ny * nz + j * nz + k
                    
                    # Diagonal term (central node)
                    rows.append(idx)
                    cols.append(idx)
                    vals.append(-2.0 * (cx + cy + cz))
                    
                    # X direction
                    if i > 0:  # Left neighbor
                        rows.append(idx)
                        cols.append((i-1) * ny * nz + j * nz + k)
                        vals.append(cx)
                    
                    if i < nx-1:  # Right neighbor
                        rows.append(idx)
                        cols.append((i+1) * ny * nz + j * nz + k)
                        vals.append(cx)
                    
                    # Y direction
                    if j > 0:  # Bottom neighbor
                        rows.append(idx)
                        cols.append(i * ny * nz + (j-1) * nz + k)
                        vals.append(cy)
                    
                    if j < ny-1:  # Top neighbor
                        rows.append(idx)
                        cols.append(i * ny * nz + (j+1) * nz + k)
                        vals.append(cy)
                    
                    # Z direction
                    if k > 0:  # Back neighbor
                        rows.append(idx)
                        cols.append(i * ny * nz + j * nz + (k-1))
                        vals.append(cz)
                    
                    if k < nz-1:  # Front neighbor
                        rows.append(idx)
                        cols.append(i * ny * nz + j * nz + (k+1))
                        vals.append(cz)
        
        # Create sparse matrix
        self._diffusion_matrix = sparse.csr_matrix((vals, (rows, cols)), shape=(n, n))
        
        logger.debug(f"Created diffusion matrix for thermal domain with {len(vals)} non-zero entries")
    
    def advance(self, dt: float) -> bool:
        """
        Advance the thermal domain by the given time step.
        
        Args:
            dt: Time step size in seconds
            
        Returns:
            True if the advance was successful, False otherwise
        """
        if not self.initialized:
            logger.error("ThermalDomain not initialized")
            return False
        
        try:
            # Reshape state variables to 1D for matrix operations
            nx, ny, nz = self.domain.resolution
            n = nx * ny * nz
            
            # Flatten arrays
            temperature_flat = self.temperature.flatten()
            heat_source_flat = self.heat_source.flatten()
            
            # Heat equation: dT/dt = α∇²T + Q/(ρc_p)
            # Implicit scheme: (I - dt*α∇²)T^(n+1) = T^n + dt*Q/(ρc_p)
            
            # Right-hand side
            rhs = temperature_flat + dt * heat_source_flat / (self.density.flatten() * self.heat_capacity.flatten())
            
            # Left-hand side matrix: (I - dt*A)
            lhs_matrix = sparse.eye(n) - dt * self._diffusion_matrix
            
            # Solve the system
            temperature_new = spsolve(lhs_matrix, rhs)
            
            # Reshape back to 3D
            self.temperature = temperature_new.reshape(self.domain.resolution)
            
            return True
            
        except Exception as e:
            logger.error(f"Error in ThermalDomain.advance: {str(e)}")
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
        elif variable_name == "thermal_conductivity":
            return np.copy(self.thermal_conductivity)
        elif variable_name == "heat_capacity":
            return np.copy(self.heat_capacity)
        elif variable_name == "density":
            return np.copy(self.density)
        elif variable_name == "heat_source":
            return np.copy(self.heat_source)
        
        raise KeyError(f"Variable not found in ThermalDomain: {variable_name}")
    
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
        elif variable_name == "thermal_conductivity":
            self.thermal_conductivity = np.copy(value)
            
            # The diffusion matrix needs to be updated when conductivity changes
            self._create_diffusion_matrix()
        elif variable_name == "heat_capacity":
            self.heat_capacity = np.copy(value)
            
            # The diffusion matrix needs to be updated when heat capacity changes
            self._create_diffusion_matrix()
        elif variable_name == "density":
            self.density = np.copy(value)
            
            # The diffusion matrix needs to be updated when density changes
            self._create_diffusion_matrix()
        elif variable_name == "heat_source":
            self.heat_source = np.copy(value)
        else:
            raise KeyError(f"Cannot set variable in ThermalDomain: {variable_name}")
    
    def get_max_stable_timestep(self) -> float:
        """
        Get the maximum stable time step for this domain.
        
        For the thermal domain, this is typically limited by the
        diffusion stability criterion: dt <= dx^2 / (2 * alpha)
        where alpha is the thermal diffusivity.
        
        Returns:
            Maximum stable time step in seconds
        """
        # Calculate thermal diffusivity: alpha = k / (rho * c_p)
        alpha = self.thermal_conductivity / (self.density * self.heat_capacity)
        alpha_max = np.max(alpha)
        
        # Get minimum grid spacing
        dx_min = min(self.domain.dx, self.domain.dy, self.domain.dz)
        
        # Von Neumann stability criterion for explicit scheme
        # For implicit scheme, this is not strictly necessary but provides a guideline
        dt_max = 0.5 * dx_min**2 / alpha_max if alpha_max > 0 else float('inf')
        
        # Return a conservative estimate
        return dt_max
    
    def get_required_variables(self) -> Set[str]:
        """
        Get the set of variable names that this domain requires from other domains.
        
        Returns:
            Set of variable names
        """
        # The thermal domain primarily requires heat source input from nuclear domain
        return {"power_density"}
    
    def get_provided_variables(self) -> Set[str]:
        """
        Get the set of variable names that this domain provides to other domains.
        
        Returns:
            Set of variable names
        """
        return {"temperature", "thermal_conductivity", "heat_capacity", "density"}
    
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
        
        # Check for non-positive or NaN values in material properties
        if np.any(np.isnan(self.thermal_conductivity)) or np.any(self.thermal_conductivity <= 0):
            errors.append("Thermal conductivity contains invalid values")
        
        if np.any(np.isnan(self.heat_capacity)) or np.any(self.heat_capacity <= 0):
            errors.append("Heat capacity contains invalid values")
        
        if np.any(np.isnan(self.density)) or np.any(self.density <= 0):
            errors.append("Density contains invalid values")
        
        return len(errors) == 0, errors
    
    def get_domain_name(self) -> str:
        """
        Get the name of this physics domain.
        
        Returns:
            Domain name string
        """
        return "thermal"
