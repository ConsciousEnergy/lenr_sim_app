"""
Thermal Solver component using Finite Difference Method (FDM).

Handles thermal diffusion, heat generation/loss within the simulation grid.
"""

import numpy as np
import logging
from typing import Optional, Tuple, Dict, Any

from .common.grid import SimulationGrid

logger = logging.getLogger(__name__)

class ThermalSolver:
    """Handles thermal calculations using FDM."""

    def __init__(self, config: Dict[str, Any], grid: Optional[SimulationGrid]):
        """Initialize the thermal solver.

        Args:
            config: Dictionary containing simulation configuration.
            grid: Optional SimulationGrid object.
        """
        self.config = config
        self.grid = grid
        self.material_properties = config.get("material_properties", {})

        # Extract necessary material properties
        self.conductivity = self.material_properties.get("thermal_conductivity", 1.0) # W/(m*K)
        self.specific_heat = self.material_properties.get("specific_heat_capacity", 1.0) # J/(kg*K)
        self.density = self.material_properties.get("density", 1.0) # kg/m^3

        if self.density <= 0 or self.specific_heat <= 0:
            raise ValueError("Density and specific heat must be positive.")
        
        self.thermal_diffusivity = self.conductivity / (self.density * self.specific_heat)

        # Initialize temperature grid and spacing
        if self.grid:
            self.grid_shape = self.grid.resolution
            self.dx, self.dy, self.dz = self.grid.get_spacing()
            initial_temp = self.config.get("initial_temperature", 300.0) # K
            self.temperature_grid = np.full(self.grid_shape, initial_temp, dtype=float)
            logger.info(f"ThermalSolver initialized with grid. Shape: {self.grid_shape}, Alpha: {self.thermal_diffusivity:.2e}")
        else:
            self.grid_shape = None
            self.dx = self.dy = self.dz = None
            self.temperature_grid = np.array([self.config.get("initial_temperature", 300.0)], dtype=float)
            logger.warning("ThermalSolver initialized without grid. Using single temperature value.")

        self.boundary_condition_type = self.config.get("thermal_boundary_condition", "neumann") # e.g., 'dirichlet', 'neumann'

    def _apply_boundary_conditions(self):
        """Applies boundary conditions to the temperature grid."""
        if not self.grid: return
        
        # Placeholder: Implement boundary logic based on self.boundary_condition_type
        # Example for Neumann (zero flux / insulated):
        if self.boundary_condition_type == "neumann":
            # Set ghost cells or adjust edge values to enforce zero gradient
            # Simple approach: mirror edge values
            if self.grid_shape[0] > 1: # Check if more than 1 cell in x
                self.temperature_grid[0, :, :] = self.temperature_grid[1, :, :]
                self.temperature_grid[-1, :, :] = self.temperature_grid[-2, :, :]
            if self.grid_shape[1] > 1:
                self.temperature_grid[:, 0, :] = self.temperature_grid[:, 1, :]
                self.temperature_grid[:, -1, :] = self.temperature_grid[:, -2, :]
            if self.grid_shape[2] > 1:
                self.temperature_grid[:, :, 0] = self.temperature_grid[:, :, 1]
                self.temperature_grid[:, :, -1] = self.temperature_grid[:, :, -2]
        elif self.boundary_condition_type == "dirichlet":
            # Example: Set boundary cells to a fixed value
            fixed_temp = self.config.get("boundary_temperature", 300.0)
            self.temperature_grid[0, :, :] = fixed_temp
            self.temperature_grid[-1, :, :] = fixed_temp
            self.temperature_grid[:, 0, :] = fixed_temp
            self.temperature_grid[:, -1, :] = fixed_temp
            self.temperature_grid[:, :, 0] = fixed_temp
            self.temperature_grid[:, :, -1] = fixed_temp
        # TODO: Add periodic boundary conditions if needed

    async def update_temperature(self, dt: float, heat_sources: np.ndarray):
        """Update the temperature grid over a time step dt using FDM.

        Args:
            dt: Time step duration.
            heat_sources: Numpy array representing heat generated/lost per grid cell (W/m^3).
        """
        if not self.grid:
            logger.warning("Cannot update temperature without a grid.")
            # Potentially update the single value if non-spatial heat source is provided?
            if heat_sources.size == 1:
                 # Q = mcΔT => ΔT = (Q_source * V_cell * dt) / (m_cell * c) 
                 # ΔT = (heat_sources[0] * V_cell * dt) / (rho * V_cell * c) 
                 # ΔT = heat_sources[0] * dt / (rho * c)
                 delta_T = heat_sources[0] * dt / (self.density * self.specific_heat)
                 self.temperature_grid[0] += delta_T
            return

        # Simple Explicit FDM for Heat Equation: T_new = T + alpha * dt * laplacian(T) + (Q / (rho*c)) * dt
        laplacian_T = np.zeros_like(self.temperature_grid)

        # Calculate Laplacian (central differences, assuming dx=dy=dz for simplicity here)
        # Need to handle boundaries properly. Using np.roll for periodic or custom logic for others.
        # This is a basic example, stability (CFL condition) needs consideration.
        if self.dx is None or self.dy is None or self.dz is None:
             logger.error("Grid spacing not defined for FDM calculation.")
             return

        # Check stability condition (simple explicit scheme)
        stability_limit = 0.5 * min(self.dx**2, self.dy**2, self.dz**2) / self.thermal_diffusivity
        if dt > stability_limit:
            logger.warning(f"Time step dt={dt:.2e} may exceed stability limit {stability_limit:.2e} for explicit FDM.")
            # Consider reducing dt or using an implicit method

        # Central difference calculation (example for dx)
        # Need to handle boundaries - _apply_boundary_conditions helps before this
        T = self.temperature_grid # alias
        if self.grid_shape[0] > 2:
            laplacian_T[1:-1, :, :] += (T[2:, :, :] - 2*T[1:-1, :, :] + T[:-2, :, :]) / self.dx**2
        if self.grid_shape[1] > 2:
            laplacian_T[:, 1:-1, :] += (T[:, 2:, :] - 2*T[:, 1:-1, :] + T[:, :-2, :]) / self.dy**2
        if self.grid_shape[2] > 2:
            laplacian_T[:, :, 1:-1] += (T[:, :, 2:] - 2*T[:, :, 1:-1] + T[:, :, :-2]) / self.dz**2

        # Update temperature grid
        # Source term Q is in W/m^3, need Q / (rho * c)
        source_term_coeff = dt / (self.density * self.specific_heat)
        
        delta_T_diffusion = self.thermal_diffusivity * dt * laplacian_T
        delta_T_source = source_term_coeff * heat_sources

        self.temperature_grid += delta_T_diffusion + delta_T_source

        # Apply boundary conditions after update
        self._apply_boundary_conditions()

        logger.debug(f"Temperature updated. Min: {np.min(self.temperature_grid):.2f}, Max: {np.max(self.temperature_grid):.2f}")


    def get_temperature_grid(self) -> Optional[np.ndarray]:
        """Return the current temperature grid."""
        return self.temperature_grid 