"""
Fluid Dynamics Solver for LENR Simulation v2
Implements 3D Navier-Stokes equations to model fluid flow and heat transfer
in the lattice environment, supporting both incompressible and compressible flows.
"""

from typing import Dict, Any, List, Optional, Tuple, Union
import numpy as np
from scipy import constants, sparse, linalg, ndimage
import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging
from dataclasses import dataclass

# Set up logging
logger = logging.getLogger(__name__)

@dataclass
class FluidDynamicsParameters:
    """Parameters for fluid dynamics solver."""
    # Physical parameters
    density: float = 1.0  # Fluid density [kg/m³]
    kinematic_viscosity: float = 0.01  # Kinematic viscosity [m²/s]
    
    # Geometry parameters
    nx: int = 100  # Number of grid points in x direction
    ny: int = 100  # Number of grid points in y direction
    nz: int = 100  # Number of grid points in z direction
    dx: float = 1e-3  # Grid spacing [m]
    
    # LBM-specific parameters
    tau: Optional[float] = None  # Relaxation time, if None will be calculated
    max_iterations: int = 1000  # Maximum number of iterations
    convergence_threshold: float = 1e-6  # Threshold for convergence
    
    # Boundary conditions
    boundary_conditions: Dict[str, str] = None
    
    def __post_init__(self):
        if self.boundary_conditions is None:
            # Default to bounce-back on all boundaries
            self.boundary_conditions = {
                "x_min": "bounce-back", "x_max": "bounce-back",
                "y_min": "bounce-back", "y_max": "bounce-back",
                "z_min": "bounce-back", "z_max": "bounce-back"
            }
        
        # Calculate relaxation time if not provided
        if self.tau is None:
            # For D3Q19 lattice: cs^2 = 1/3
            cs_squared = 1.0 / 3.0
            self.tau = 0.5 + self.kinematic_viscosity / (cs_squared * self.dx)
            
            # Ensure stability
            if self.tau < 0.51 or self.tau > 2.0:
                logger.warning(f"Relaxation time tau={self.tau:.4f} may lead to instability.")
                self.tau = max(0.51, min(self.tau, 2.0))
                logger.warning(f"Adjusted tau to {self.tau:.4f}")
            
            logger.info(f"Calculated relaxation time: tau={self.tau:.4f}")


class FluidDynamicsSolver:
    """
    Fluid dynamics solver using Lattice Boltzmann Method (LBM) with D3Q19 lattice.
    
    This solver implements the LBM for solving the Navier-Stokes equations in
    three dimensions, with support for various boundary conditions and obstacles.
    """
    
    def __init__(self, params: FluidDynamicsParameters):
        """
        Initialize the Lattice Boltzmann solver.
        
        Args:
            params: Parameters for the fluid dynamics solver
        """
        self.params = params
        self.nx, self.ny, self.nz = params.nx, params.ny, params.nz
        self.dx = params.dx
        self.tau = params.tau
        
        # Define D3Q19 lattice velocities
        # Format: (x, y, z) directions
        self.e = np.array([
            [ 0,  0,  0],  # 0: Rest
            [ 1,  0,  0],  # 1: East
            [-1,  0,  0],  # 2: West
            [ 0,  1,  0],  # 3: North
            [ 0, -1,  0],  # 4: South
            [ 0,  0,  1],  # 5: Up
            [ 0,  0, -1],  # 6: Down
            [ 1,  1,  0],  # 7: North-East
            [-1,  1,  0],  # 8: North-West
            [ 1, -1,  0],  # 9: South-East
            [-1, -1,  0],  # 10: South-West
            [ 1,  0,  1],  # 11: East-Up
            [-1,  0,  1],  # 12: West-Up
            [ 1,  0, -1],  # 13: East-Down
            [-1,  0, -1],  # 14: West-Down
            [ 0,  1,  1],  # 15: North-Up
            [ 0, -1,  1],  # 16: South-Up
            [ 0,  1, -1],  # 17: North-Down
            [ 0, -1, -1]   # 18: South-Down
        ])
        
        # Define weights for D3Q19
        self.w = np.array([
            1.0/3.0,                # Rest
            1.0/18.0, 1.0/18.0,     # E, W
            1.0/18.0, 1.0/18.0,     # N, S
            1.0/18.0, 1.0/18.0,     # U, D
            1.0/36.0, 1.0/36.0,     # NE, NW
            1.0/36.0, 1.0/36.0,     # SE, SW
            1.0/36.0, 1.0/36.0,     # EU, WU
            1.0/36.0, 1.0/36.0,     # ED, WD
            1.0/36.0, 1.0/36.0,     # NU, SU
            1.0/36.0, 1.0/36.0      # ND, SD
        ])
        
        # Define opposite directions for bounce-back
        self.opposite = np.array([0, 2, 1, 4, 3, 6, 5, 10, 9, 8, 7, 14, 13, 12, 11, 18, 17, 16, 15])
        
        # Initialize fluid density and velocity fields
        self.rho = np.ones((self.nx, self.ny, self.nz)) * params.density
        self.u = np.zeros((3, self.nx, self.ny, self.nz))  # Velocity vector (3 components)
        
        # Initialize distribution functions
        self.f = np.zeros((19, self.nx, self.ny, self.nz))
        self._init_equilibrium()
        
        # Initialize mask for obstacles (True for fluid, False for solid)
        self.mask = np.ones((self.nx, self.ny, self.nz), dtype=bool)
        
        # External force
        self.force = np.zeros((3, self.nx, self.ny, self.nz))
        
        logger.info(f"Initialized FluidDynamicsSolver with grid size: {self.nx}x{self.ny}x{self.nz}")
        logger.info(f"Fluid properties: ρ={params.density} kg/m³, ν={params.kinematic_viscosity} m²/s")
    
    def _init_equilibrium(self):
        """Initialize distribution functions to equilibrium state."""
        for i in range(19):
            # Calculate dot product of e_i and u
            eu = np.zeros((self.nx, self.ny, self.nz))
            for d in range(3):
                eu += self.e[i, d] * self.u[d]
            
            # Calculate u²
            usqr = np.zeros((self.nx, self.ny, self.nz))
            for d in range(3):
                usqr += self.u[d]**2
            
            # Equilibrium distribution
            self.f[i] = self.rho * self.w[i] * (
                1.0 + 3.0 * eu + 4.5 * eu**2 - 1.5 * usqr
            )
    
    def _equilibrium(self, rho, u):
        """
        Calculate equilibrium distribution functions.
        
        Args:
            rho: Density field
            u: Velocity field [3, nx, ny, nz]
            
        Returns:
            Equilibrium distribution function [19, nx, ny, nz]
        """
        feq = np.zeros((19, self.nx, self.ny, self.nz))
        
        # Calculate u²
        usqr = np.zeros((self.nx, self.ny, self.nz))
        for d in range(3):
            usqr += u[d]**2
        
        # Calculate equilibrium for each direction
        for i in range(19):
            # Calculate dot product of e_i and u
            eu = np.zeros((self.nx, self.ny, self.nz))
            for d in range(3):
                eu += self.e[i, d] * u[d]
            
            # Equilibrium distribution
            feq[i] = rho * self.w[i] * (
                1.0 + 3.0 * eu + 4.5 * eu**2 - 1.5 * usqr
            )
        
        return feq
    
    def _collision(self):
        """Perform collision step (relaxation toward equilibrium)."""
        # Get current density and velocity
        self._calculate_macroscopic()
        
        # Calculate equilibrium distribution
        feq = self._equilibrium(self.rho, self.u)
        
        # Apply BGK collision operator
        omega = 1.0 / self.tau
        self.f = self.f * (1.0 - omega) + feq * omega
        
        # Add force term (Guo forcing scheme)
        for i in range(19):
            for d in range(3):
                # Force contribution to distribution function
                # Reshape e[i] for proper broadcasting with u (3, nx, ny, nz)
                e_i_reshaped = self.e[i].reshape(3, 1, 1, 1)
                ei_dot_u = np.sum(e_i_reshaped * self.u, axis=0)  # Shape: (nx, ny, nz)
                self.f[i] += (1.0 - 0.5 * omega) * self.w[i] * (
                    3.0 * (self.e[i, d] - self.u[d]) + 
                    9.0 * ei_dot_u * self.e[i, d]
                ) * self.force[d]
    
    def _streaming(self):
        """Perform streaming step (propagation of distribution functions)."""
        for i in range(19):
            # Skip rest distribution (i=0)
            if i == 0:
                continue
                
            # Create a copy to avoid overwriting during propagation
            f_temp = self.f[i].copy()
            
            # Stream to neighbor cells
            ex, ey, ez = self.e[i]
            
            # Handle boundary conditions through shifting and slicing
            if ex > 0:
                self.f[i, 1:, :, :] = f_temp[:-1, :, :]
            elif ex < 0:
                self.f[i, :-1, :, :] = f_temp[1:, :, :]
                
            if ey > 0:
                self.f[i, :, 1:, :] = self.f[i, :, :-1, :]
            elif ey < 0:
                self.f[i, :, :-1, :] = self.f[i, :, 1:, :]
                
            if ez > 0:
                self.f[i, :, :, 1:] = self.f[i, :, :, :-1]
            elif ez < 0:
                self.f[i, :, :, :-1] = self.f[i, :, :, 1:]
    
    def _apply_boundary_conditions(self):
        """Apply boundary conditions to the distribution functions."""
        # Apply specified boundary conditions
        for boundary, bc_type in self.params.boundary_conditions.items():
            if bc_type == "bounce-back":
                # No-slip bounce-back
                if boundary == "x_min":
                    for i in range(1, 19):
                        if self.e[i, 0] > 0:  # If pointing outward
                            opp = self.opposite[i]
                            self.f[opp, 0, :, :] = self.f[i, 0, :, :]
                            
                elif boundary == "x_max":
                    for i in range(1, 19):
                        if self.e[i, 0] < 0:  # If pointing outward
                            opp = self.opposite[i]
                            self.f[opp, -1, :, :] = self.f[i, -1, :, :]
                            
                elif boundary == "y_min":
                    for i in range(1, 19):
                        if self.e[i, 1] > 0:  # If pointing outward
                            opp = self.opposite[i]
                            self.f[opp, :, 0, :] = self.f[i, :, 0, :]
                            
                elif boundary == "y_max":
                    for i in range(1, 19):
                        if self.e[i, 1] < 0:  # If pointing outward
                            opp = self.opposite[i]
                            self.f[opp, :, -1, :] = self.f[i, :, -1, :]
                            
                elif boundary == "z_min":
                    for i in range(1, 19):
                        if self.e[i, 2] > 0:  # If pointing outward
                            opp = self.opposite[i]
                            self.f[opp, :, :, 0] = self.f[i, :, :, 0]
                            
                elif boundary == "z_max":
                    for i in range(1, 19):
                        if self.e[i, 2] < 0:  # If pointing outward
                            opp = self.opposite[i]
                            self.f[opp, :, :, -1] = self.f[i, :, :, -1]
            
            elif bc_type == "periodic":
                # Periodic boundary conditions
                if boundary in ["x_min", "x_max"]:
                    for i in range(1, 19):
                        if self.e[i, 0] > 0:  # If pointing to positive x
                            self.f[i, 0, :, :] = self.f[i, -1, :, :]
                        elif self.e[i, 0] < 0:  # If pointing to negative x
                            self.f[i, -1, :, :] = self.f[i, 0, :, :]
                            
                elif boundary in ["y_min", "y_max"]:
                    for i in range(1, 19):
                        if self.e[i, 1] > 0:  # If pointing to positive y
                            self.f[i, :, 0, :] = self.f[i, :, -1, :]
                        elif self.e[i, 1] < 0:  # If pointing to negative y
                            self.f[i, :, -1, :] = self.f[i, :, 0, :]
                            
                elif boundary in ["z_min", "z_max"]:
                    for i in range(1, 19):
                        if self.e[i, 2] > 0:  # If pointing to positive z
                            self.f[i, :, :, 0] = self.f[i, :, :, -1]
                        elif self.e[i, 2] < 0:  # If pointing to negative z
                            self.f[i, :, :, -1] = self.f[i, :, :, 0]
        
        # Handle internal obstacle boundaries (bounce-back)
        for i in range(1, 19):
            opp = self.opposite[i]
            
            # Mask is True for fluid, False for solid
            # Create shifted mask for checking neighbors
            # For each direction, check if the cell in that direction is solid
            ex, ey, ez = self.e[i]
            
            # Pad mask to handle boundaries
            padded_mask = np.pad(self.mask, 1, 'constant', constant_values=True)
            
            # Calculate indices for the neighbor cells
            nx, ny, nz = self.mask.shape
            i_range = np.arange(1, nx+1)
            j_range = np.arange(1, ny+1)
            k_range = np.arange(1, nz+1)
            
            # Calculate shifted indices for neighbor cells
            i_shift = i_range + ex
            j_shift = j_range + ey
            k_shift = k_range + ez
            
            # Get shifted mask
            shifted_mask = padded_mask[
                np.ix_(i_shift, j_shift, k_shift)
            ]
            
            # Find cells where the neighbor is solid but current cell is fluid
            boundary_cells = self.mask & (~shifted_mask)
            
            # Apply bounce-back at obstacle boundaries
            if np.any(boundary_cells):
                # Store temporary copy to avoid overwriting
                f_temp = self.f[i, boundary_cells].copy()
                
                # Apply bounce-back: distribution from solid to fluid becomes
                # the opposite direction distribution from previous step
                self.f[opp, boundary_cells] = f_temp
    
    def _calculate_macroscopic(self):
        """Recalculate macroscopic variables (density and velocity) from distributions."""
        # Calculate density
        self.rho = np.sum(self.f, axis=0)
        
        # Calculate velocity (with zero division protection)
        for d in range(3):
            self.u[d] = np.zeros((self.nx, self.ny, self.nz))
            for i in range(19):
                self.u[d] += self.e[i, d] * self.f[i]
            
            # Add half-step force contribution (Guo forcing scheme)
            self.u[d] += 0.5 * self.force[d]
            
            # Divide by density (avoid division by zero)
            mask = self.rho > 1e-10
            self.u[d, mask] /= self.rho[mask]
            
        # Zero velocity inside obstacles
        for d in range(3):
            self.u[d, ~self.mask] = 0.0
    
    def _set_external_force(self, force_vector: Tuple[float, float, float]):
        """
        Set a uniform external force field.
        
        Args:
            force_vector: (fx, fy, fz) components of force per unit mass
        """
        fx, fy, fz = force_vector
        self.force[0, :, :, :] = fx
        self.force[1, :, :, :] = fy
        self.force[2, :, :, :] = fz
        
        logger.info(f"Set uniform external force: F=({fx}, {fy}, {fz})")
    
    def set_spatially_varying_force(self, force_func):
        """
        Set a spatially-varying external force field.
        
        Args:
            force_func: Function taking (x,y,z) coordinates and returning (fx,fy,fz)
        """
        # Create meshgrid for coordinates
        x = np.arange(0, self.nx) * self.dx
        y = np.arange(0, self.ny) * self.dx
        z = np.arange(0, self.nz) * self.dx
        X, Y, Z = np.meshgrid(x, y, z, indexing='ij')
        
        # Evaluate force function
        fx, fy, fz = force_func(X, Y, Z)
        
        # Set force field
        self.force[0, :, :, :] = fx
        self.force[1, :, :, :] = fy
        self.force[2, :, :, :] = fz
        
        logger.info("Set spatially-varying external force field")
    
    def set_obstacle(self, mask):
        """
        Set obstacles in the fluid domain.
        
        Args:
            mask: Boolean array of shape (nx, ny, nz), True for fluid, False for solid
        """
        if mask.shape != (self.nx, self.ny, self.nz):
            raise ValueError(f"Mask shape {mask.shape} does not match grid shape ({self.nx}, {self.ny}, {self.nz})")
        
        self.mask = mask.copy()
        
        # Reset velocity inside obstacles
        for d in range(3):
            self.u[d, ~self.mask] = 0.0
        
        # Re-initialize distribution functions
        self._init_equilibrium()
        
        # Count obstacle cells
        obstacle_count = np.sum(~self.mask)
        logger.info(f"Set obstacles with {obstacle_count} solid cells")
    
    def step(self):
        """Perform a single time step of the simulation."""
        # Collision step
        self._collision()
        
        # Streaming step
        self._streaming()
        
        # Apply boundary conditions
        self._apply_boundary_conditions()
        
        # Recalculate macroscopic variables
        self._calculate_macroscopic()
    
    def run(self, num_steps: Optional[int] = None, callback=None) -> Dict[str, Any]:
        """
        Run the LBM simulation for the specified number of steps or until convergence.
        
        Args:
            num_steps: Number of time steps to run, if None use max_iterations from params
            callback: Optional function called after each step with (step, rho, u)
            
        Returns:
            Dict with simulation results
        """
        if num_steps is None:
            num_steps = self.params.max_iterations
            
        # Initialize convergence tracking
        converged = False
        velocity_history = []
        
        # Run time steps
        for step in range(num_steps):
            # Store previous velocity for convergence check
            u_prev = self.u.copy()
            
            # Perform single step
            self.step()
            
            # Calculate velocity magnitude
            u_mag = np.sqrt(np.sum(self.u**2, axis=0))
            velocity_history.append(np.mean(u_mag))
            
            # Check convergence
            if step > 0:
                # Calculate velocity change
                du = np.sqrt(np.sum((self.u - u_prev)**2) / np.sum(u_prev**2 + 1e-10))
                
                if du < self.params.convergence_threshold:
                    converged = True
                    logger.info(f"Converged after {step+1} steps with du={du:.3e}")
                    break
            
            # Log progress
            if step % max(1, num_steps // 10) == 0:
                # Calculate average velocity magnitude
                avg_vel = np.mean(u_mag)
                max_vel = np.max(u_mag)
                
                # Calculate Reynolds number
                characteristic_length = min(self.nx, self.ny, self.nz) * self.dx
                re = max_vel * characteristic_length / self.params.kinematic_viscosity
                
                logger.info(f"Step {step+1}/{num_steps}, avg_vel={avg_vel:.3e}, max_vel={max_vel:.3e}, Re={re:.1f}")
            
            # Call user callback if provided
            if callback is not None:
                callback(step, self.rho, self.u)
        
        # Prepare results
        velocity_magnitude = np.sqrt(np.sum(self.u**2, axis=0))
        
        results = {
            "velocity": self.u.copy(),
            "density": self.rho.copy(),
            "velocity_magnitude": velocity_magnitude,
            "velocity_history": np.array(velocity_history),
            "steps_completed": min(step + 1, num_steps),
            "converged": converged,
            "total_mass": np.sum(self.rho),
            "max_velocity": np.max(velocity_magnitude),
            "avg_velocity": np.mean(velocity_magnitude),
            "kinetic_energy": 0.5 * np.sum(self.rho * velocity_magnitude**2) * self.dx**3
        }
        
        return results
    
    def get_velocity_field(self) -> np.ndarray:
        """
        Get the current velocity field.
        
        Returns:
            Array of shape (3, nx, ny, nz) containing the velocity components
        """
        return self.u.copy()
    
    def get_density_field(self) -> np.ndarray:
        """
        Get the current density field.
        
        Returns:
            Array of shape (nx, ny, nz) containing the density
        """
        return self.rho.copy()
    
    def get_vorticity(self) -> np.ndarray:
        """
        Calculate vorticity field (curl of velocity).
        
        Returns:
            Array of shape (3, nx, ny, nz) containing the vorticity components
        """
        # Initialize vorticity field
        vorticity = np.zeros((3, self.nx, self.ny, self.nz))
        
        # Calculate derivatives using central differences
        h = self.dx
        
        # Interior points
        # ω_x = ∂w/∂y - ∂v/∂z
        vorticity[0, 1:-1, 1:-1, 1:-1] = (
            (self.u[2, 1:-1, 2:, 1:-1] - self.u[2, 1:-1, :-2, 1:-1]) / (2*h) -
            (self.u[1, 1:-1, 1:-1, 2:] - self.u[1, 1:-1, 1:-1, :-2]) / (2*h)
        )
        
        # ω_y = ∂u/∂z - ∂w/∂x
        vorticity[1, 1:-1, 1:-1, 1:-1] = (
            (self.u[0, 1:-1, 1:-1, 2:] - self.u[0, 1:-1, 1:-1, :-2]) / (2*h) -
            (self.u[2, 2:, 1:-1, 1:-1] - self.u[2, :-2, 1:-1, 1:-1]) / (2*h)
        )
        
        # ω_z = ∂v/∂x - ∂u/∂y
        vorticity[2, 1:-1, 1:-1, 1:-1] = (
            (self.u[1, 2:, 1:-1, 1:-1] - self.u[1, :-2, 1:-1, 1:-1]) / (2*h) -
            (self.u[0, 1:-1, 2:, 1:-1] - self.u[0, 1:-1, :-2, 1:-1]) / (2*h)
        )
        
        return vorticity
    
    def get_summary(self) -> Dict[str, Any]:
        """
        Return a summary of the current state of the fluid.
        
        Returns:
            Dict with summary information
        """
        velocity_magnitude = np.sqrt(np.sum(self.u**2, axis=0))
        
        summary = {
            "grid_size": (self.nx, self.ny, self.nz),
            "dx": self.dx,
            "tau": self.tau,
            "density": {
                "min": float(np.min(self.rho)),
                "max": float(np.max(self.rho)),
                "mean": float(np.mean(self.rho)),
                "total_mass": float(np.sum(self.rho) * self.dx**3)
            },
            "velocity": {
                "min": float(np.min(velocity_magnitude)),
                "max": float(np.max(velocity_magnitude)),
                "mean": float(np.mean(velocity_magnitude)),
                "kinetic_energy": float(0.5 * np.sum(self.rho * velocity_magnitude**2) * self.dx**3)
            },
            "reynolds_number": float(
                np.max(velocity_magnitude) * 
                min(self.nx, self.ny, self.nz) * self.dx / 
                self.params.kinematic_viscosity
            )
        }
        
        return summary

# Helper functions

def create_flow_channel(nx: int, ny: int, nz: int, 
                       channel_width: int = None,
                       channel_height: int = None) -> np.ndarray:
    """
    Create a flow channel geometry for fluid simulation.
    
    Args:
        nx, ny, nz: Grid dimensions
        channel_width: Width of channel in cells (default: 2/3 of ny)
        channel_height: Height of channel in cells (default: 2/3 of nz)
        
    Returns:
        Boolean mask array with True for fluid cells, False for solid cells
    """
    if channel_width is None:
        channel_width = int(2*ny/3)
    if channel_height is None:
        channel_height = int(2*nz/3)
        
    # Start with all cells as solid
    mask = np.zeros((nx, ny, nz), dtype=bool)
    
    # Create channel (centered in y and z directions)
    y_start = (ny - channel_width) // 2
    z_start = (nz - channel_height) // 2
    
    mask[:, y_start:y_start+channel_width, z_start:z_start+channel_height] = True
    
    return mask

def create_porous_medium(nx: int, ny: int, nz: int, 
                        porosity: float = 0.7,
                        grain_size: int = 3) -> np.ndarray:
    """
    Create a random porous medium geometry for fluid simulation.
    
    Args:
        nx, ny, nz: Grid dimensions
        porosity: Target porosity (void fraction)
        grain_size: Average grain size in cells
        
    Returns:
        Boolean mask array with True for fluid cells, False for solid cells
    """
    # Generate random noise field
    noise = np.random.rand(nx, ny, nz)
    
    # Smooth the noise field to get grain-like structures
    smoothed = ndimage.gaussian_filter(noise, sigma=grain_size/2)
    
    # Threshold to achieve desired porosity
    threshold = np.percentile(smoothed, 100 * (1 - porosity))
    mask = smoothed > threshold
    
    actual_porosity = np.mean(mask)
    logger.info(f"Created porous medium with porosity {actual_porosity:.3f} (target: {porosity:.3f})")
    
    return mask 