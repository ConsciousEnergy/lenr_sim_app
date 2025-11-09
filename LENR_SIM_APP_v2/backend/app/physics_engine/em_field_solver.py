"""
Electromagnetic Field Solver for LENR Simulation v2
Implements Maxwell's equations to model dynamic electromagnetic fields
in the lattice environment, supporting both static and time-varying fields.
"""

from typing import Dict, Any, List, Optional, Tuple, Union
import numpy as np
from scipy import constants, sparse, linalg
import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging
from dataclasses import dataclass, field

# Set up logging
logger = logging.getLogger(__name__)

@dataclass
class EMFieldParameters:
    """Parameters for the electromagnetic field solver."""
    # Physical constants
    permittivity: float = 8.85e-12  # Vacuum permittivity (F/m)
    permeability: float = 1.257e-6  # Vacuum permeability (H/m)
    
    # Material properties
    relative_permittivity: float = 1.0  # Relative permittivity of the medium
    relative_permeability: float = 1.0  # Relative permeability of the medium
    conductivity: float = 0.0  # Electrical conductivity (S/m)
    
    # Numerical parameters
    time_step: float = 1.0e-15  # Time step (s)
    spatial_resolution: float = 1.0e-9  # Spatial resolution (m)
    
    # Solver options
    use_pml: bool = True  # Use Perfectly Matched Layer boundary condition
    pml_thickness: int = 10  # Thickness of PML in grid cells
    pml_strength: float = 1e-6  # PML absorption strength
    
    # External field parameters
    external_e_field: Tuple[float, float, float] = (0.0, 0.0, 0.0)  # External electric field (V/m)
    external_b_field: Tuple[float, float, float] = (0.0, 0.0, 0.0)  # External magnetic field (T)
    
    # Pulse parameters for dynamic excitation
    pulse_type: str = "none"  # none, gaussian, sinusoidal
    pulse_amplitude: float = 0.0  # Amplitude of the pulse
    pulse_frequency: float = 0.0  # Frequency of the pulse (Hz)
    pulse_duration: float = 0.0  # Duration of the pulse (s)
    pulse_delay: float = 0.0  # Delay before pulse starts (s)
    
    # Additional physics
    enable_plasma_coupling: bool = False  # Couple with plasma physics
    enable_lorentz_force: bool = True  # Calculate Lorentz force on charged particles
    
    # Current sources
    source_positions: List[Tuple[int, int, int]] = field(default_factory=list)
    source_currents: List[Tuple[float, float, float]] = field(default_factory=list)
    
    # Antenna parameters
    antenna_positions: List[Tuple[int, int, int]] = field(default_factory=list)
    antenna_directions: List[Tuple[float, float, float]] = field(default_factory=list)
    antenna_lengths: List[float] = field(default_factory=list)

class EMFieldSolver:
    """
    Electromagnetic field solver implementing the Finite-Difference Time-Domain (FDTD) method.
    This solver implements Maxwell's equations in 3D to simulate electromagnetic field propagation
    within the LENR lattice and surrounding environment.
    """
    
    def __init__(self, 
                 grid_size: Tuple[int, int, int],
                 cell_size: Tuple[float, float, float] = (1e-9, 1e-9, 1e-9),
                 parameters: Optional[EMFieldParameters] = None):
        """
        Initialize the EM field solver.
        
        Args:
            grid_size: Tuple of grid dimensions (nx, ny, nz)
            cell_size: Tuple of cell sizes in each dimension (dx, dy, dz) in meters
            parameters: EMFieldParameters instance with solver parameters
        """
        self.grid_size = grid_size
        self.cell_size = cell_size
        self.params = parameters or EMFieldParameters()
        
        # Initialize fields using Yee grid staggering
        # E-fields are defined at the edges of the cells
        self.ex = np.zeros((grid_size[0], grid_size[1]+1, grid_size[2]+1))
        self.ey = np.zeros((grid_size[0]+1, grid_size[1], grid_size[2]+1))
        self.ez = np.zeros((grid_size[0]+1, grid_size[1]+1, grid_size[2]))
        
        # H-fields are defined at the faces of the cells
        self.hx = np.zeros((grid_size[0]+1, grid_size[1], grid_size[2]))
        self.hy = np.zeros((grid_size[0], grid_size[1]+1, grid_size[2]))
        self.hz = np.zeros((grid_size[0], grid_size[1], grid_size[2]+1))
        
        # Material properties on the grid
        self.epsilon = np.ones(grid_size) * self.params.permittivity * self.params.relative_permittivity
        self.mu = np.ones(grid_size) * self.params.permeability * self.params.relative_permeability
        self.sigma = np.ones(grid_size) * self.params.conductivity
        
        # Derived parameters
        self.dt = self.params.time_step
        self.dx, self.dy, self.dz = cell_size
        
        # Current time
        self.current_time = 0.0
        
        # Stability check (CFL condition)
        self._check_stability()
        
        # Set up PML if enabled
        self.pml_sigma_x = np.zeros_like(self.ex)
        self.pml_sigma_y = np.zeros_like(self.ey)
        self.pml_sigma_z = np.zeros_like(self.ez)
        
        if self.params.use_pml:
            self._setup_pml()
        
        # Initialize external fields
        self._apply_external_fields()
        
        logger.info(f"EMFieldSolver initialized with grid size {grid_size} and cell size {cell_size}")
    
    def _check_stability(self):
        """Check the CFL condition for numerical stability."""
        c = 1 / np.sqrt(self.params.permittivity * self.params.permeability)  # Speed of light
        dt_max = 1 / (c * np.sqrt(1/self.dx**2 + 1/self.dy**2 + 1/self.dz**2))
        
        if self.dt > dt_max:
            logger.warning(f"Time step {self.dt} exceeds maximum stable time step {dt_max}. "
                           f"Reducing time step to ensure stability.")
            self.dt = 0.95 * dt_max
            self.params.time_step = self.dt
    
    def _setup_pml(self):
        """Set up the Perfectly Matched Layer (PML) for absorbing boundary conditions."""
        t = self.params.pml_thickness
        strength = self.params.pml_strength
        
        # Create PML profile (polynomial grading)
        def pml_profile(i, n_pml):
            return strength * ((i + 0.5) / n_pml) ** 3
        
        # Apply to x boundaries
        for i in range(t):
            sigma_value = pml_profile(i, t)
            self.pml_sigma_x[i, :, :] = sigma_value
            self.pml_sigma_x[-(i+1), :, :] = sigma_value
        
        # Apply to y boundaries
        for i in range(t):
            sigma_value = pml_profile(i, t)
            self.pml_sigma_y[:, i, :] = sigma_value
            self.pml_sigma_y[:, -(i+1), :] = sigma_value
        
        # Apply to z boundaries
        for i in range(t):
            sigma_value = pml_profile(i, t)
            self.pml_sigma_z[:, :, i] = sigma_value
            self.pml_sigma_z[:, :, -(i+1)] = sigma_value
        
        logger.debug(f"PML setup complete with thickness {t} cells and strength {strength}")
    
    def _apply_external_fields(self):
        """Apply external E and B fields to the simulation domain."""
        e_ext = np.array(self.params.external_e_field)
        b_ext = np.array(self.params.external_b_field)
        
        if np.any(e_ext != 0):
            # Add uniform external E field
            self.ex += e_ext[0]
            self.ey += e_ext[1]
            self.ez += e_ext[2]
            logger.info(f"Applied external E-field: {e_ext} V/m")
        
        if np.any(b_ext != 0):
            # Add uniform external B field
            self.hx += b_ext[0] / self.params.permeability
            self.hy += b_ext[1] / self.params.permeability
            self.hz += b_ext[2] / self.params.permeability
            logger.info(f"Applied external B-field: {b_ext} T")
    
    def _apply_source_currents(self):
        """Apply source currents to the electromagnetic field."""
        for pos, current in zip(self.params.source_positions, self.params.source_currents):
            i, j, k = pos
            jx, jy, jz = current
            
            # Current density affects the electric field through Ampere's law
            if 0 <= i < self.grid_size[0] and 0 <= j < self.grid_size[1] and 0 <= k < self.grid_size[2]:
                # Apply current to the E-field equations in the next update step
                self.ex[i, j, k] -= jx * self.dt / self.epsilon[i, j, k]
                self.ey[i, j, k] -= jy * self.dt / self.epsilon[i, j, k]
                self.ez[i, j, k] -= jz * self.dt / self.epsilon[i, j, k]
    
    def _update_h_field(self):
        """Update magnetic field components using Faraday's law."""
        # Update Hx
        self.hx[1:-1, :, :] += self.dt / self.mu[1:-1, :, :] * (
            (self.ez[1:-1, 1:, :] - self.ez[1:-1, :-1, :]) / self.dy -
            (self.ey[1:-1, :, 1:] - self.ey[1:-1, :, :-1]) / self.dz
        )
        
        # Update Hy
        self.hy[:, 1:-1, :] += self.dt / self.mu[:, 1:-1, :] * (
            (self.ex[:, 1:-1, 1:] - self.ex[:, 1:-1, :-1]) / self.dz -
            (self.ez[1:, 1:-1, :] - self.ez[:-1, 1:-1, :]) / self.dx
        )
        
        # Update Hz
        self.hz[:, :, 1:-1] += self.dt / self.mu[:, :, 1:-1] * (
            (self.ey[1:, :, 1:-1] - self.ey[:-1, :, 1:-1]) / self.dx -
            (self.ex[:, 1:, 1:-1] - self.ex[:, :-1, 1:-1]) / self.dy
        )
    
    def _update_e_field(self):
        """Update electric field components using Ampere's law."""
        # Update Ex
        self.ex[:, 1:-1, 1:-1] += self.dt / self.epsilon[:, 1:-1, 1:-1] * (
            (self.hz[:, 1:, 1:-1] - self.hz[:, :-1, 1:-1]) / self.dy -
            (self.hy[:, 1:-1, 1:] - self.hy[:, 1:-1, :-1]) / self.dz
        )
        
        # Apply conductivity effect (Ohm's law)
        self.ex[:, 1:-1, 1:-1] -= self.dt * self.sigma[:, 1:-1, 1:-1] * self.ex[:, 1:-1, 1:-1] / self.epsilon[:, 1:-1, 1:-1]
        
        # Update Ey
        self.ey[1:-1, :, 1:-1] += self.dt / self.epsilon[1:-1, :, 1:-1] * (
            (self.hx[1:-1, :, 1:] - self.hx[1:-1, :, :-1]) / self.dz -
            (self.hz[1:, :, 1:-1] - self.hz[:-1, :, 1:-1]) / self.dx
        )
        
        # Apply conductivity effect
        self.ey[1:-1, :, 1:-1] -= self.dt * self.sigma[1:-1, :, 1:-1] * self.ey[1:-1, :, 1:-1] / self.epsilon[1:-1, :, 1:-1]
        
        # Update Ez
        self.ez[1:-1, 1:-1, :] += self.dt / self.epsilon[1:-1, 1:-1, :] * (
            (self.hy[1:, 1:-1, :] - self.hy[:-1, 1:-1, :]) / self.dx -
            (self.hx[1:-1, 1:, :] - self.hx[1:-1, :-1, :]) / self.dy
        )
        
        # Apply conductivity effect
        self.ez[1:-1, 1:-1, :] -= self.dt * self.sigma[1:-1, 1:-1, :] * self.ez[1:-1, 1:-1, :] / self.epsilon[1:-1, 1:-1, :]
    
    def _apply_pml(self):
        """Apply PML boundary condition to absorb outgoing waves."""
        if not self.params.use_pml:
            return
            
        # Apply PML to E-fields
        self.ex *= np.exp(-self.pml_sigma_x * self.dt)
        self.ey *= np.exp(-self.pml_sigma_y * self.dt)
        self.ez *= np.exp(-self.pml_sigma_z * self.dt)
        
        # Apply PML to H-fields (using appropriate indexing for the staggered grid)
        hx_pml = np.zeros_like(self.hx)
        hx_pml[1:-1, :, :] = 0.5 * (self.pml_sigma_y[1:-1, :, :] + self.pml_sigma_z[1:-1, :, :])
        self.hx *= np.exp(-hx_pml * self.dt)
        
        hy_pml = np.zeros_like(self.hy)
        hy_pml[:, 1:-1, :] = 0.5 * (self.pml_sigma_x[:, 1:-1, :] + self.pml_sigma_z[:, 1:-1, :])
        self.hy *= np.exp(-hy_pml * self.dt)
        
        hz_pml = np.zeros_like(self.hz)
        hz_pml[:, :, 1:-1] = 0.5 * (self.pml_sigma_x[:, :, 1:-1] + self.pml_sigma_y[:, :, 1:-1])
        self.hz *= np.exp(-hz_pml * self.dt)
    
    def _generate_pulse(self):
        """Generate pulse sources according to parameters."""
        if self.params.pulse_type == "none":
            return
            
        # Skip if before delay time
        if self.current_time < self.params.pulse_delay:
            return
            
        # Skip if after pulse duration
        if self.current_time > self.params.pulse_delay + self.params.pulse_duration:
            return
            
        t = self.current_time - self.params.pulse_delay
        amplitude = self.params.pulse_amplitude
        
        if self.params.pulse_type == "gaussian":
            # Gaussian pulse
            center = self.params.pulse_duration / 2
            width = self.params.pulse_duration / 6  # 3 sigma on each side
            value = amplitude * np.exp(-((t - center) / width) ** 2)
            
        elif self.params.pulse_type == "sinusoidal":
            # Sinusoidal pulse
            value = amplitude * np.sin(2 * np.pi * self.params.pulse_frequency * t)
            
        else:
            logger.warning(f"Unknown pulse type: {self.params.pulse_type}")
            return
            
        # Apply pulse to antennas
        for pos, direction, length in zip(
            self.params.antenna_positions,
            self.params.antenna_directions,
            self.params.antenna_lengths
        ):
            i, j, k = pos
            dx, dy, dz = direction
            
            # Normalize direction
            norm = np.sqrt(dx**2 + dy**2 + dz**2)
            if norm > 0:
                dx, dy, dz = dx/norm, dy/norm, dz/norm
            
            # Apply as current source
            if 0 <= i < self.grid_size[0] and 0 <= j < self.grid_size[1] and 0 <= k < self.grid_size[2]:
                # Current direction matching antenna orientation
                jx, jy, jz = dx * value, dy * value, dz * value
                
                # Add to source current list
                if (i, j, k) not in self.params.source_positions:
                    self.params.source_positions.append((i, j, k))
                    self.params.source_currents.append((jx, jy, jz))
                else:
                    idx = self.params.source_positions.index((i, j, k))
                    self.params.source_currents[idx] = (jx, jy, jz)
    
    def get_electric_field(self) -> np.ndarray:
        """
        Get the electric field magnitude for visualization or coupling with other physics.
        
        Returns:
            A 3D numpy array with electric field magnitude at each cell
        """
        # Interpolate staggered E-field components to cell centers
        ex_centered = 0.5 * (self.ex[:self.grid_size[0], 1:-1, 1:-1] + self.ex[:self.grid_size[0], :-2, :-2])
        ey_centered = 0.5 * (self.ey[1:-1, :self.grid_size[1], 1:-1] + self.ey[:-2, :self.grid_size[1], :-2])
        ez_centered = 0.5 * (self.ez[1:-1, 1:-1, :self.grid_size[2]] + self.ez[:-2, :-2, :self.grid_size[2]])
        
        # Calculate magnitude
        e_magnitude = np.sqrt(ex_centered**2 + ey_centered**2 + ez_centered**2)
        return e_magnitude
    
    def get_magnetic_field(self) -> np.ndarray:
        """
        Get the magnetic field magnitude for visualization or coupling with other physics.
        
        Returns:
            A 3D numpy array with magnetic field magnitude at each cell
        """
        # Interpolate staggered H-field components to cell centers
        hx_centered = 0.5 * (self.hx[1:, :self.grid_size[1], :self.grid_size[2]] + self.hx[:-1, :self.grid_size[1], :self.grid_size[2]])
        hy_centered = 0.5 * (self.hy[:self.grid_size[0], 1:, :self.grid_size[2]] + self.hy[:self.grid_size[0], :-1, :self.grid_size[2]])
        hz_centered = 0.5 * (self.hz[:self.grid_size[0], :self.grid_size[1], 1:] + self.hz[:self.grid_size[0], :self.grid_size[1], :-1])
        
        # Calculate magnitude
        h_magnitude = np.sqrt(hx_centered**2 + hy_centered**2 + hz_centered**2)
        return h_magnitude
    
    def get_energy_density(self) -> np.ndarray:
        """
        Calculate electromagnetic energy density at each cell.
        
        Returns:
            A 3D numpy array with energy density (J/m³) at each cell
        """
        e_field = self.get_electric_field()
        h_field = self.get_magnetic_field()
        
        # Energy density = 0.5 * (epsilon*|E|² + mu*|H|²)
        energy_density = 0.5 * (
            self.epsilon * e_field**2 + 
            self.mu * h_field**2
        )
        
        return energy_density
    
    def calculate_lorentz_force(self, charge_density: np.ndarray, velocity: np.ndarray) -> np.ndarray:
        """
        Calculate Lorentz force on charged particles.
        
        Args:
            charge_density: 3D array of charge density (C/m³)
            velocity: 4D array (3, nx, ny, nz) of velocity components (m/s)
            
        Returns:
            4D array (3, nx, ny, nz) with force density components (N/m³)
        """
        if not self.params.enable_lorentz_force:
            return np.zeros((3, *self.grid_size))
        
        # Get field components at cell centers
        e_field = np.stack([
            0.5 * (self.ex[:self.grid_size[0], 1:-1, 1:-1] + self.ex[:self.grid_size[0], :-2, :-2]),
            0.5 * (self.ey[1:-1, :self.grid_size[1], 1:-1] + self.ey[:-2, :self.grid_size[1], :-2]),
            0.5 * (self.ez[1:-1, 1:-1, :self.grid_size[2]] + self.ez[:-2, :-2, :self.grid_size[2]])
        ])
        
        h_field = np.stack([
            0.5 * (self.hx[1:, :self.grid_size[1], :self.grid_size[2]] + self.hx[:-1, :self.grid_size[1], :self.grid_size[2]]),
            0.5 * (self.hy[:self.grid_size[0], 1:, :self.grid_size[2]] + self.hy[:self.grid_size[0], :-1, :self.grid_size[2]]),
            0.5 * (self.hz[:self.grid_size[0], :self.grid_size[1], 1:] + self.hz[:self.grid_size[0], :self.grid_size[1], :-1])
        ])
        
        # Convert H to B
        b_field = h_field * self.params.permeability
        
        # Calculate force components: F = q(E + v × B)
        force = np.zeros((3, *self.grid_size))
        
        # Electric field component: q*E
        for i in range(3):
            force[i] = charge_density * e_field[i]
        
        # Magnetic field component: q(v × B)
        # Cross product components
        force[0] += charge_density * (velocity[1] * b_field[2] - velocity[2] * b_field[1])
        force[1] += charge_density * (velocity[2] * b_field[0] - velocity[0] * b_field[2])
        force[2] += charge_density * (velocity[0] * b_field[1] - velocity[1] * b_field[0])
        
        return force
    
    def add_material_region(self, region_start: Tuple[int, int, int], 
                           region_end: Tuple[int, int, int],
                           properties: Dict[str, float]):
        """
        Add a region with specific material properties.
        
        Args:
            region_start: Starting indices (i, j, k) of the region
            region_end: Ending indices (i, j, k) of the region
            properties: Dictionary with material properties:
                        - 'epsilon_r': relative permittivity
                        - 'mu_r': relative permeability
                        - 'sigma': conductivity
        """
        i_start, j_start, k_start = region_start
        i_end, j_end, k_end = region_end
        
        i_start = max(0, min(i_start, self.grid_size[0]-1))
        j_start = max(0, min(j_start, self.grid_size[1]-1))
        k_start = max(0, min(k_start, self.grid_size[2]-1))
        
        i_end = max(0, min(i_end, self.grid_size[0]))
        j_end = max(0, min(j_end, self.grid_size[1]))
        k_end = max(0, min(k_end, self.grid_size[2]))
        
        # Set material properties
        if 'epsilon_r' in properties:
            self.epsilon[i_start:i_end, j_start:j_end, k_start:k_end] = (
                self.params.permittivity * properties['epsilon_r']
            )
        
        if 'mu_r' in properties:
            self.mu[i_start:i_end, j_start:j_end, k_start:k_end] = (
                self.params.permeability * properties['mu_r']
            )
        
        if 'sigma' in properties:
            self.sigma[i_start:i_end, j_start:j_end, k_start:k_end] = properties['sigma']
        
        logger.debug(f"Added material region from {region_start} to {region_end} with properties {properties}")
    
    def add_antenna(self, position: Tuple[int, int, int], 
                   direction: Tuple[float, float, float],
                   length: float = 1.0):
        """
        Add an antenna at a specific position with a given orientation.
        
        Args:
            position: Grid position (i, j, k) for the antenna
            direction: Direction vector (dx, dy, dz) for the antenna
            length: Length of the antenna in grid cells
        """
        self.params.antenna_positions.append(position)
        self.params.antenna_directions.append(direction)
        self.params.antenna_lengths.append(length)
        
        logger.debug(f"Added antenna at position {position} with direction {direction} and length {length}")
    
    def step(self):
        """Perform a single time step of the EM field simulation."""
        # Generate pulse sources if enabled
        self._generate_pulse()
        
        # Apply source currents
        self._apply_source_currents()
        
        # Update H-field (magnetic field)
        self._update_h_field()
        
        # Update E-field (electric field)
        self._update_e_field()
        
        # Apply PML boundary conditions
        self._apply_pml()
        
        # Update simulation time
        self.current_time += self.dt
        
        return {
            'e_field': self.get_electric_field(),
            'h_field': self.get_magnetic_field(),
            'energy_density': self.get_energy_density(),
            'time': self.current_time
        }
    
    def run_simulation(self, num_steps: int, callback=None) -> Dict:
        """
        Run the EM field simulation for a specified number of time steps.
        
        Args:
            num_steps: Number of time steps to simulate
            callback: Optional callback function called after each step with step data
            
        Returns:
            Dictionary with final simulation state
        """
        logger.info(f"Starting EM field simulation for {num_steps} steps")
        
        for step in range(num_steps):
            step_data = self.step()
            
            if callback and callable(callback):
                callback(step, step_data)
                
            if step % 100 == 0:
                logger.debug(f"Completed step {step}/{num_steps}, t={self.current_time:.3e}s")
        
        logger.info(f"EM field simulation completed. Final time: {self.current_time:.3e}s")
        
        return {
            'e_field': self.get_electric_field(),
            'h_field': self.get_magnetic_field(),
            'energy_density': self.get_energy_density(),
            'time': self.current_time
        }
    
    def reset(self):
        """Reset the simulation to its initial state."""
        self.ex[:] = 0
        self.ey[:] = 0
        self.ez[:] = 0
        self.hx[:] = 0
        self.hy[:] = 0
        self.hz[:] = 0
        self.current_time = 0.0
        
        # Reset external fields
        self._apply_external_fields()
        
        logger.info("EMFieldSolver reset to initial state")

# Helper functions

def verify_cfl_condition(dx: float, dt: float, c: float = constants.c) -> bool:
    """
    Verify that the time step satisfies the CFL condition for numerical stability.
    
    Args:
        dx: Grid spacing in meters
        dt: Time step in seconds
        c: Speed of light in m/s
        
    Returns:
        True if CFL condition is satisfied, False otherwise
    """
    # CFL condition for 3D: dt <= dx/(sqrt(3)*c)
    cfl_dt_max = dx / (np.sqrt(3) * c)
    
    if dt <= cfl_dt_max:
        logger.debug(f"CFL condition satisfied: dt={dt:.2e}s <= {cfl_dt_max:.2e}s")
        return True
    else:
        logger.warning(f"CFL condition violated: dt={dt:.2e}s > {cfl_dt_max:.2e}s")
        return False 