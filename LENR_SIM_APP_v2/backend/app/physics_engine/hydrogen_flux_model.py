import numpy as np
import scipy.sparse as sp
import scipy.sparse.linalg as spla
import logging
from typing import Dict, Tuple, List, Optional, Union, Callable
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

@dataclass
class HydrogenFluxParameters:
    """Parameters controlling hydrogen/deuterium flux behavior in a lattice."""
    
    # Diffusion coefficients (m²/s)
    diffusion_coefficient: float = 1e-9  # Base diffusion coefficient
    activation_energy: float = 0.5       # Activation energy (eV)
    
    # Temperature dependence
    temperature_dependence: bool = True   # Whether diffusion depends on temperature
    
    # Lattice parameters
    lattice_type: str = "palladium"       # Type of lattice material
    lattice_constant: float = 3.89e-10    # Lattice constant (m)
    
    # Concentration parameters
    initial_concentration: float = 0.01   # Initial H/D concentration (atomic ratio)
    max_concentration: float = 1.0        # Maximum possible concentration
    
    # Trapping parameters
    trap_density: float = 1e24           # Density of trapping sites (1/m³)
    trap_energy: float = 0.3             # Trapping energy (eV)
    
    # Electromigration parameters
    enable_electromigration: bool = False # Whether to include electromigration
    electric_field: np.ndarray = field(default_factory=lambda: np.zeros(3))  
    effective_charge: float = 0.5         # Effective charge for electromigration
    
    # Stress-induced diffusion
    enable_stress_diffusion: bool = False # Whether to include stress effects
    stress_tensor: np.ndarray = field(default_factory=lambda: np.zeros((3, 3)))
    stress_coupling: float = 1e-30        # Stress-diffusion coupling coefficient
    
    # Surface effects
    surface_desorption_rate: float = 1e-7 # Surface desorption rate (1/s)
    surface_adsorption_rate: float = 1e-7 # Surface adsorption rate (m²/s)
    
    # Isotope effects (for deuterium vs hydrogen)
    isotope_mass_ratio: float = 2.0       # Mass ratio (D/H)
    isotope_diffusion_ratio: float = 0.7  # Diffusion coefficient ratio (D/H)


class HydrogenFluxModel:
    """
    Model for simulating hydrogen/deuterium migration through lattice materials.
    
    This model tracks the spatial and temporal evolution of hydrogen/deuterium
    concentration within metal lattices, accounting for diffusion, trapping,
    temperature effects, stress effects, and electromigration.
    
    The model solves the modified diffusion equation:
    ∂c/∂t = ∇·(D∇c) - ∇·(c·v_drift) + S - L
    
    Where:
    - c is the hydrogen/deuterium concentration
    - D is the diffusion coefficient (temperature dependent)
    - v_drift is the drift velocity due to external forces
    - S is the source term (loading)
    - L is the loss term (unloading, trapping)
    """
    
    def __init__(
        self, 
        grid_size: Tuple[int, int, int],
        cell_size: Tuple[float, float, float],
        parameters: HydrogenFluxParameters = None,
        dt: float = 1e-6,
        boundary_conditions: str = "periodic"
    ):
        """
        Initialize the hydrogen flux model.
        
        Args:
            grid_size: Number of grid cells in (x, y, z) directions
            cell_size: Physical size of each cell in (x, y, z) directions (meters)
            parameters: Model parameters for hydrogen flux behavior
            dt: Time step for simulations (seconds)
            boundary_conditions: Type of boundary conditions ("periodic", "neumann", "dirichlet")
        """
        self.grid_size = grid_size
        self.cell_size = cell_size
        self.params = parameters or HydrogenFluxParameters()
        self.dt = dt
        self.boundary_conditions = boundary_conditions
        
        # Initialize computational domain
        self.initialize_domain()
        
        # Create coefficient matrices for implicit solver
        self.build_coefficient_matrices()
        
        # Stats and metrics
        self.total_flux_history = []
        self.max_concentration_history = []
        self.average_concentration_history = []
        
        logger.info(f"Initialized HydrogenFluxModel with grid size {grid_size}")
        
    def initialize_domain(self):
        """Initialize the computational domain and fields."""
        nx, ny, nz = self.grid_size
        
        # Primary fields
        self.concentration = np.ones((nx, ny, nz)) * self.params.initial_concentration
        self.trapped_concentration = np.zeros((nx, ny, nz))
        self.temperature = np.ones((nx, ny, nz)) * 300.0  # Default room temperature (K)
        
        # Auxiliary fields
        self.diffusion_field = np.ones((nx, ny, nz)) * self.params.diffusion_coefficient
        self.flux = np.zeros((3, nx, ny, nz))  # Vector field for flux in each direction
        self.electric_field = np.zeros((3, nx, ny, nz))
        self.stress_field = np.zeros((3, 3, nx, ny, nz))
        
        # Material properties
        self.initialize_material_properties()
        
    def initialize_material_properties(self):
        """Set up spatially-varying material properties based on lattice structure."""
        nx, ny, nz = self.grid_size
        
        # Default homogeneous properties
        self.material_type = np.ones((nx, ny, nz), dtype=int)  # 1=bulk, 2=surface, 3=defect
        self.activation_energy_map = np.ones((nx, ny, nz)) * self.params.activation_energy
        self.trap_density_map = np.ones((nx, ny, nz)) * self.params.trap_density
        
        # Example: Add some defects (can be customized based on specific simulations)
        if nx > 10 and ny > 10 and nz > 10:
            # Create some random defects with higher trap energy
            rng = np.random.RandomState(42)  # Fixed seed for reproducibility
            defect_indices = rng.choice(nx*ny*nz, size=int(nx*ny*nz*0.01), replace=False)
            ix, iy, iz = np.unravel_index(defect_indices, (nx, ny, nz))
            
            self.material_type[ix, iy, iz] = 3  # Mark as defect
            self.trap_density_map[ix, iy, iz] *= 10.0  # Higher trap density at defects
            self.activation_energy_map[ix, iy, iz] *= 1.5  # Higher activation energy
        
        # Mark surface cells
        self.material_type[0, :, :] = 2
        self.material_type[-1, :, :] = 2
        self.material_type[:, 0, :] = 2
        self.material_type[:, -1, :] = 2
        self.material_type[:, :, 0] = 2
        self.material_type[:, :, -1] = 2
    
    def build_coefficient_matrices(self):
        """Build sparse matrices for implicit solver."""
        nx, ny, nz = self.grid_size
        n_total = nx * ny * nz
        
        # For efficiency in 3D, we'll build the diffusion operator when needed
        # based on current diffusion coefficients
        self.matrix_built = False
        self.diffusion_matrix = None
        
    def update_diffusion_coefficient(self):
        """Update diffusion coefficients based on temperature and activation energy."""
        if not self.params.temperature_dependence:
            self.diffusion_field[:] = self.params.diffusion_coefficient
            return
            
        # Arrhenius relationship: D = D0 * exp(-Ea/kT)
        kb = 8.617333262e-5  # Boltzmann constant in eV/K
        self.diffusion_field = self.params.diffusion_coefficient * np.exp(
            -self.activation_energy_map / (kb * self.temperature)
        )
        
        # Apply isotope effects if simulating deuterium
        if hasattr(self, 'is_deuterium') and self.is_deuterium:
            self.diffusion_field *= self.params.isotope_diffusion_ratio
    
    def compute_drift_velocity(self) -> np.ndarray:
        """
        Compute drift velocity field from external forces (E-field, stress gradients).
        
        Returns:
            3D vector field representing drift velocity at each grid point
        """
        drift_velocity = np.zeros((3, *self.grid_size))
        
        # Add electromigration if enabled
        if self.params.enable_electromigration:
            electron_charge = 1.602176634e-19  # C
            kb = 1.380649e-23  # J/K (Boltzmann constant)
            
            for dim in range(3):
                mobility = self.diffusion_field / (kb * self.temperature) 
                drift_velocity[dim] = mobility * electron_charge * self.params.effective_charge * self.electric_field[dim]
        
        # Add stress-driven diffusion if enabled
        if self.params.enable_stress_diffusion:
            # Simplified approximation - in reality this would use the 
            # gradient of the hydrostatic stress and a more complex tensor relation
            for dim in range(3):
                # Compute stress gradient using central differencing
                stress_grad = np.gradient(np.trace(self.stress_field, axis1=0, axis2=1) / 3.0, 
                                         self.cell_size[dim], axis=dim)
                drift_velocity[dim] += -self.params.stress_coupling * stress_grad
                
        return drift_velocity
    
    def compute_source_term(self) -> np.ndarray:
        """Compute source/sink terms for hydrogen concentration."""
        source_term = np.zeros(self.grid_size)
        
        # Surface adsorption - add hydrogen at surfaces based on external pressure
        # (simplified model, would depend on external H2/D2 pressure)
        surface_mask = (self.material_type == 2)
        surface_concentration = self.concentration.copy()
        surface_concentration[~surface_mask] = 0
        
        # Adsorption term: rate * (max_conc - current_conc) at surfaces
        adsorption = self.params.surface_adsorption_rate * (
            self.params.max_concentration - surface_concentration
        )
        adsorption[~surface_mask] = 0
        
        # Desorption term: rate * current_conc at surfaces
        desorption = self.params.surface_desorption_rate * surface_concentration
        desorption[~surface_mask] = 0
        
        # Trapping/detrapping dynamics
        # Trapping rate proportional to available traps and concentration
        available_traps = self.params.trap_density * (
            1.0 - self.trapped_concentration / self.params.trap_density
        )
        trapping_rate = 1e-5 * available_traps * self.concentration  # Simplified model
        
        # Detrapping rate (temperature dependent)
        kb = 8.617333262e-5  # Boltzmann constant in eV/K
        detrapping_rate = 1e13 * np.exp(-self.params.trap_energy / (kb * self.temperature)) * self.trapped_concentration
        
        # Net source term
        source_term = adsorption - desorption - trapping_rate + detrapping_rate
        
        return source_term
    
    def apply_boundary_conditions(self):
        """Apply boundary conditions to the concentration field."""
        if self.boundary_conditions == "periodic":
            # No action needed for periodic BCs as they're handled in the solver
            pass
        elif self.boundary_conditions == "neumann":
            # Zero-flux boundary conditions (zero gradient)
            # X boundaries
            self.concentration[0, :, :] = self.concentration[1, :, :]
            self.concentration[-1, :, :] = self.concentration[-2, :, :]
            
            # Y boundaries
            self.concentration[:, 0, :] = self.concentration[:, 1, :]
            self.concentration[:, -1, :] = self.concentration[:, -2, :]
            
            # Z boundaries
            self.concentration[:, :, 0] = self.concentration[:, :, 1]
            self.concentration[:, :, -1] = self.concentration[:, :, -2]
        
        elif self.boundary_conditions == "dirichlet":
            # Fixed-value boundary conditions (specified concentration)
            # This would typically be set based on external H2/D2 pressure
            # using Sievert's law or other applicable relations
            
            # Example: fixed surfaces at some concentration
            fixed_conc = 0.1  # Could be computed from external pressure
            
            # X boundaries
            self.concentration[0, :, :] = fixed_conc
            self.concentration[-1, :, :] = fixed_conc
            
            # Y boundaries
            self.concentration[:, 0, :] = fixed_conc
            self.concentration[:, -1, :] = fixed_conc
            
            # Z boundaries
            self.concentration[:, :, 0] = fixed_conc
            self.concentration[:, :, -1] = fixed_conc
        
        # Ensure concentration remains in physical range
        np.clip(self.concentration, 0, self.params.max_concentration, out=self.concentration)
    
    def compute_flux(self):
        """
        Compute hydrogen flux throughout the domain.
        
        The flux is given by:
        J = -D∇c + c*v_drift
        """
        dx, dy, dz = self.cell_size
        
        # Compute concentration gradients
        grad_x = np.gradient(self.concentration, dx, axis=0)
        grad_y = np.gradient(self.concentration, dy, axis=1)
        grad_z = np.gradient(self.concentration, dz, axis=2)
        
        # Compute diffusive flux (-D∇c)
        self.flux[0] = -self.diffusion_field * grad_x
        self.flux[1] = -self.diffusion_field * grad_y
        self.flux[2] = -self.diffusion_field * grad_z
        
        # Add drift component (c*v_drift)
        drift_velocity = self.compute_drift_velocity()
        for dim in range(3):
            self.flux[dim] += self.concentration * drift_velocity[dim]
        
    def step(self, dt: Optional[float] = None):
        """
        Advance the simulation by one time step.
        
        Args:
            dt: Time step to use (if None, use the instance dt)
        
        Returns:
            Maximum change in concentration during this step
        """
        dt = dt or self.dt
        
        # Update temperature-dependent properties
        self.update_diffusion_coefficient()
        
        # Calculate flux
        self.compute_flux()
        
        # Compute divergence of flux for diffusion term
        dx, dy, dz = self.cell_size
        div_flux = (
            np.gradient(self.flux[0], dx, axis=0) +
            np.gradient(self.flux[1], dy, axis=1) +
            np.gradient(self.flux[2], dz, axis=2)
        )
        
        # Compute source/sink terms
        source_term = self.compute_source_term()
        
        # Explicit time integration
        conc_old = self.concentration.copy()
        self.concentration += dt * (div_flux + source_term)
        
        # Trap dynamics (update trapped concentration)
        available_traps = self.params.trap_density * (
            1.0 - self.trapped_concentration / self.params.trap_density
        )
        trapping_rate = 1e-5 * available_traps * self.concentration
        
        kb = 8.617333262e-5  # Boltzmann constant in eV/K
        detrapping_rate = 1e13 * np.exp(-self.params.trap_energy / (kb * self.temperature)) * self.trapped_concentration
        
        self.trapped_concentration += dt * (trapping_rate - detrapping_rate)
        np.clip(self.trapped_concentration, 0, self.params.trap_density, out=self.trapped_concentration)
        
        # Apply boundary conditions
        self.apply_boundary_conditions()
        
        # Update history
        self.total_flux_history.append(np.sum(np.abs(self.flux)))
        self.max_concentration_history.append(np.max(self.concentration))
        self.average_concentration_history.append(np.mean(self.concentration))
        
        # Return max change as indicator of stability
        return np.max(np.abs(self.concentration - conc_old))
    
    def get_metrics(self) -> Dict:
        """
        Get current metrics from the simulation.
        
        Returns:
            Dictionary of current metrics
        """
        return {
            "total_concentration": np.sum(self.concentration),
            "total_trapped": np.sum(self.trapped_concentration),
            "max_concentration": np.max(self.concentration),
            "average_concentration": np.mean(self.concentration),
            "total_flux": np.sum(np.abs(self.flux)),
            "concentration_uniformity": 1.0 - (np.std(self.concentration) / np.mean(self.concentration + 1e-10)),
        }
    
    def run_simulation(self, n_steps: int, callback: Optional[Callable] = None):
        """
        Run simulation for specified number of steps.
        
        Args:
            n_steps: Number of time steps to simulate
            callback: Optional callback function called after each step
                      with the current model state
        
        Returns:
            Dictionary of simulation results and metrics
        """
        max_changes = []
        
        for step_num in range(n_steps):
            max_change = self.step()
            max_changes.append(max_change)
            
            if callback and callable(callback):
                callback(self, step_num, max_change)
            
            # Adaptive time stepping could be implemented here
            if max_change > 0.1:
                self.dt *= 0.8  # Reduce time step if changes are too large
                logger.info(f"Reducing time step to {self.dt} at step {step_num}")
            elif max_change < 0.001 and step_num > 10:
                self.dt *= 1.1  # Increase time step if changes are small
                self.dt = min(self.dt, 1e-4)  # Cap maximum time step
        
        return {
            "metrics": self.get_metrics(),
            "max_changes": max_changes,
            "flux_history": self.total_flux_history,
            "max_concentration_history": self.max_concentration_history,
            "average_concentration_history": self.average_concentration_history,
            "final_concentration": self.concentration.copy(),
            "final_trapped_concentration": self.trapped_concentration.copy(),
        }
    
    def create_channel(self, start: Tuple[int, int, int], end: Tuple[int, int, int], radius: int):
        """
        Create a channel in the lattice with different properties.
        
        Args:
            start: Starting point of channel (ix, iy, iz)
            end: Ending point of channel (ix, iy, iz)
            radius: Radius of the channel in grid cells
        """
        # Convert to numpy arrays for vector operations
        start = np.array(start)
        end = np.array(end)
        direction = end - start
        length = np.linalg.norm(direction)
        
        if length == 0:
            return
            
        unit_dir = direction / length
        
        # Create a meshgrid for the entire domain
        nx, ny, nz = self.grid_size
        x, y, z = np.meshgrid(np.arange(nx), np.arange(ny), np.arange(nz), indexing='ij')
        points = np.stack([x.flatten(), y.flatten(), z.flatten()], axis=1)
        
        # Compute distances to the line segment
        v = end - start
        w = points - start.reshape(1, 3)
        
        # Compute projection and clamp to line segment
        c1 = np.einsum('ij,j->i', w, v)
        c2 = np.dot(v, v)
        b = np.clip(c1 / c2, 0, 1) if c2 > 0 else np.zeros(len(w))
        
        # Compute closest points on the line segment
        pb = start + np.outer(b, v)
        
        # Compute distances from each point to closest point on line
        distances = np.sqrt(np.sum((points - pb)**2, axis=1))
        
        # Reshape to 3D grid and mark channel points
        distances = distances.reshape(self.grid_size)
        channel_mask = distances <= radius
        
        # Set properties for the channel
        self.material_type[channel_mask] = 4  # Channel type
        self.diffusion_field[channel_mask] *= 5.0  # Higher diffusion in channels
        self.activation_energy_map[channel_mask] *= 0.7  # Lower activation energy
        
        logger.info(f"Created channel from {start} to {end} with radius {radius}")
    
    def create_surface_loading_region(self, face: str, loading_rate: float = 1e-6):
        """
        Create a region on one face of the domain with enhanced H/D loading.
        
        Args:
            face: Which face to apply loading ('top', 'bottom', 'left', 'right', 'front', 'back')
            loading_rate: Rate of hydrogen loading (concentration/second)
        """
        nx, ny, nz = self.grid_size
        
        # Create mask for the specified face
        if face == 'left':
            mask = np.zeros(self.grid_size, dtype=bool)
            mask[0, :, :] = True
        elif face == 'right':
            mask = np.zeros(self.grid_size, dtype=bool)
            mask[-1, :, :] = True
        elif face == 'bottom':
            mask = np.zeros(self.grid_size, dtype=bool)
            mask[:, 0, :] = True
        elif face == 'top':
            mask = np.zeros(self.grid_size, dtype=bool)
            mask[:, -1, :] = True
        elif face == 'back':
            mask = np.zeros(self.grid_size, dtype=bool)
            mask[:, :, 0] = True
        elif face == 'front':
            mask = np.zeros(self.grid_size, dtype=bool)
            mask[:, :, -1] = True
        else:
            raise ValueError(f"Unknown face: {face}")
        
        # Mark as a loading region
        self.material_type[mask] = 5  # Loading region type
        
        # Store loading rate for this region
        if not hasattr(self, 'loading_regions'):
            self.loading_regions = {}
        
        self.loading_regions[face] = {
            'mask': mask,
            'rate': loading_rate
        }
        
        logger.info(f"Created loading region on {face} face with rate {loading_rate}") 