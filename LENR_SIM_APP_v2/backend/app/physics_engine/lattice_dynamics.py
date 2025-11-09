"""
Enhanced Lattice Dynamics Simulator for LENR Simulation v2
Implements optimized real-time lattice structure updates, phonon propagation,
and particle interaction modeling based on the advanced Unified LENR Theory.
Includes spatial property calculations.
"""

from typing import Dict, Any, List, Optional, Tuple, Union
import numpy as np
from scipy import constants, sparse, linalg
from dataclasses import dataclass
import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging

# Import the grid class
from .common.grid import SimulationGrid 

# Set up logging
logger = logging.getLogger(__name__)

@dataclass
class LatticePoint:
    """Data class for lattice point properties."""
    position: np.ndarray
    mass: float
    charge: float
    displacement: np.ndarray
    velocity: np.ndarray
    fixed: bool = False  # Whether point is fixed in position (e.g. boundary condition)
    
    def kinetic_energy(self) -> float:
        """Calculate kinetic energy of the point."""
        return 0.5 * self.mass * np.sum(self.velocity**2)

class LatticeSimulator:
    """
    Enhanced simulator for lattice dynamics in LENR systems.
    Provides optimized implementations for phonon propagation, particle
    interactions, energy transfer, and spatial property calculations.
    """
    
    def __init__(
        self, 
        config: Optional[Dict[str, Any]] = None,
        grid: Optional[SimulationGrid] = None # Accept grid instance
    ):
        """
        Initialize the lattice simulator with configuration and optional grid.
        
        Args:
            config: Configuration dictionary
            grid: Optional SimulationGrid instance for spatial calculations.
        """
        self.config = config or {}
        self.grid = grid # Store the grid instance
        
        # Extract physical constants from config or use defaults
        constants_dict = self.config.get("constants", {})
        self.hbar = constants_dict.get("hbar", constants.hbar)
        self.e = constants_dict.get("e", constants.e)
        self.eps0 = constants_dict.get("epsilon_0", constants.epsilon_0)
        self.kb = constants_dict.get("k_B", constants.k)
        
        # Initialize lattice parameters
        self.lattice_constant = self.config.get("lattice_constant", 3.89e-10)  # meters
        self.temperature = self.config.get("temperature", 300.0)  # Kelvin
        self.dimensions = self.config.get("dimensions", (10, 10, 10))
        self.spring_constant = self.config.get("spring_constant", 10.0)  # N/m
        
        # Advanced configuration for vacancy and impurity modeling
        self.vacancy_concentration = self.config.get("vacancy_concentration", 0.01)  # 1%
        self.impurity_concentration = self.config.get("impurity_concentration", 0.005)  # 0.5%
        
        # Set default masses if not in config
        self.m_host = constants_dict.get("m_Pd", 106.42 * constants.atomic_mass)  # Host lattice (Pd)
        self.m_absorbed = constants_dict.get("m_d", 2.01410177811 * constants.atomic_mass)  # Absorbed particle (D)
        
        # Initialize state variables
        self.lattice_points = self._initialize_lattice()
        self.force_matrix = None  # Will be initialized on first use
        self.time = 0.0  # Current simulation time
        self.step_count = 0  # Number of time steps simulated
        
        # Precompute nearest neighbor indices for optimized force calculation
        self._precompute_nearest_neighbors()
        
        if self.grid:
            logger.info(f"LatticeSimulator initialized WITH grid: {self.grid}")
        else:
            logger.warning("LatticeSimulator initialized WITHOUT grid. Spatial calculations will be unavailable.")
        
    def _initialize_lattice(self) -> List[LatticePoint]:
        """
        Initialize the lattice structure with points, including vacancies and impurities.
        
        Returns:
            List of LatticePoint objects
        """
        lattice_points = []
        nx, ny, nz = self.dimensions
        
        # Precompute thermal displacement amplitude
        thermal_amplitude = self._calculate_thermal_amplitude()
        
        # Create lattice with vacancies and impurities
        for i in range(nx):
            for j in range(ny):
                for k in range(nz):
                    # Skip if vacancy (random selection based on concentration)
                    if np.random.random() < self.vacancy_concentration:
                        continue
                    
                    # Create position with small random offset for disorder
                    position = np.array([i, j, k]) * self.lattice_constant
                    position += np.random.normal(0, 0.01 * self.lattice_constant, 3)
                    
                    # Determine if this is an impurity
                    is_impurity = np.random.random() < self.impurity_concentration
                    
                    # Set mass and charge based on particle type
                    if is_impurity:
                        mass = self.m_absorbed  # Deuterium mass
                        charge = self.e  # Deuterium charge
                    else:
                        mass = self.m_host  # Palladium mass
                        charge = self.config.get("host_charge", 0.0)  # Host charge
                    
                    # Add thermal fluctuations to initial positions
                    thermal_displacement = self._generate_thermal_displacement(thermal_amplitude)
                    
                    # Create a new lattice point and add to list
                    lattice_points.append(LatticePoint(
                        position=position,
                        mass=mass,
                        charge=charge,
                        displacement=thermal_displacement,
                        velocity=self._generate_thermal_velocity(mass, self.temperature)
                    ))
        
        # Apply boundary conditions
        if lattice_points:
            # Mark boundary points as fixed (option for simulating fixed boundaries)
            if self.config.get("fixed_boundaries", False):
                for point in lattice_points:
                    # Check if the point is on the boundary
                    on_boundary = any(
                        coord < self.lattice_constant or
                        coord > (dim - 1) * self.lattice_constant - self.lattice_constant / 2
                        for coord, dim in zip(point.position, self.dimensions)
                    )
                    if on_boundary:
                        point.fixed = True
        
        return lattice_points
    
    def _calculate_thermal_amplitude(self) -> float:
        """
        Calculate thermal displacement amplitude based on temperature.
        
        Returns:
            Thermal amplitude in meters
        """
        # Using equipartition theorem
        return np.sqrt(self.kb * self.temperature / self.spring_constant)
    
    def _generate_thermal_displacement(self, amplitude: float) -> np.ndarray:
        """
        Generate a random thermal displacement vector.
        
        Args:
            amplitude: Thermal amplitude in meters
            
        Returns:
            3D displacement vector
        """
        # Generate random direction
        direction = np.random.randn(3)
        norm = np.linalg.norm(direction)
        
        # Avoid division by zero
        if norm > 0:
            direction /= norm
        else:
            direction = np.array([1.0, 0.0, 0.0])
            
        # Apply random amplitude (Gaussian distribution around mean amplitude)
        return direction * np.random.normal(amplitude, amplitude * 0.2)
    
    def _generate_thermal_velocity(self, mass: float, temperature: float) -> np.ndarray:
        """
        Generate a random thermal velocity vector based on temperature.
        
        Args:
            mass: Particle mass in kg
            temperature: Temperature in Kelvin
            
        Returns:
            3D velocity vector
        """
        # Maxwell-Boltzmann distribution for each component
        sigma = np.sqrt(self.kb * temperature / mass)
        return np.random.normal(0, sigma, 3)
    
    def _precompute_nearest_neighbors(self) -> None:
        """
        Precompute nearest neighbor indices for each lattice point for faster force calculations.
        """
        if not self.lattice_points:
            self.neighbors = []
            return
            
        # Create a dictionary to store neighbor indices for each point
        self.neighbors = []
        
        # Find neighbors for each point
        for i, point in enumerate(self.lattice_points):
            # Find points within cutoff distance
            neighbor_indices = []
            
            for j, other in enumerate(self.lattice_points):
                if i == j:
                    continue
                    
                # Calculate distance
                r_ij = np.linalg.norm(point.position - other.position)
                
                # Check if it's a nearest neighbor (with small tolerance)
                if abs(r_ij - self.lattice_constant) < 0.2 * self.lattice_constant:
                    neighbor_indices.append(j)
            
            self.neighbors.append(neighbor_indices)
    
    async def calculate_phonon_modes(self) -> Dict[str, Any]:
        """
        Calculate phonon modes and frequencies using sparse matrix eigendecomposition.
        
        Returns:
            Dict containing phonon frequencies and eigenvectors
        """
        # Create the dynamical matrix (sparse matrix for efficiency)
        n_points = len(self.lattice_points)
        data = []
        row_ind = []
        col_ind = []
        
        # Fill the dynamical matrix using predetermined neighbors
        for i, point in enumerate(self.lattice_points):
            # Diagonal elements (self-interaction)
            n_neighbors = len(self.neighbors[i])
            if n_neighbors > 0:
                data.append(n_neighbors * self.spring_constant / point.mass)
                row_ind.append(i)
                col_ind.append(i)
                
                # Off-diagonal elements (neighbor interactions)
                for j in self.neighbors[i]:
                    other = self.lattice_points[j]
                    # Spring constant normalized by reduced mass
                    k_ij = -self.spring_constant / np.sqrt(point.mass * other.mass)
                    data.append(k_ij)
                    row_ind.append(i)
                    col_ind.append(j)
        
        # Create sparse dynamical matrix
        dyn_matrix = sparse.csr_matrix((data, (row_ind, col_ind)), shape=(n_points, n_points))
        
        # Calculate eigenvalues and eigenvectors in a thread pool
        def _solve_eigensystem():
            # Use sparse eigensolver for efficiency
            n_modes = min(20, n_points-1)  # Calculate first 20 modes or fewer if matrix is smaller
            try:
                eigenvalues, eigenvectors = sparse.linalg.eigsh(
                    dyn_matrix, 
                    k=n_modes,
                    which='SM'  # Find smallest eigenvalues (lowest frequency modes)
                )
                
                # Convert to frequencies (ensure we take square root of positive values only)
                frequencies = np.sqrt(np.abs(eigenvalues)) / (2 * np.pi)
                
                return frequencies, eigenvectors
            except Exception as e:
                logger.error(f"Error in eigensystem calculation: {str(e)}")
                # Return empty arrays in case of error
                return np.array([]), np.array([])
        
        # Run eigensystem calculation in thread pool
        with ThreadPoolExecutor() as executor:
            frequencies, eigenvectors = await asyncio.get_event_loop().run_in_executor(
                executor, _solve_eigensystem
            )
        
        # Package results
        return {
            "frequencies": frequencies.tolist() if frequencies.size > 0 else [],
            "eigenvectors": eigenvectors.tolist() if eigenvectors.size > 0 else [],
            "metadata": {
                "temperature": self.temperature,
                "lattice_constant": self.lattice_constant,
                "n_points": n_points,
                "dimensions": self.dimensions
            }
        }
    
    async def update_lattice_state(self, dt: float) -> Dict[str, Any]:
        """
        Update lattice state for one time step using Velocity Verlet algorithm.
        Calculates OVERALL system properties.
        
        Args:
            dt: Time step in seconds
            
        Returns:
            Dict containing updated lattice state summary (overall properties)
        """
        # Skip if no lattice points
        if not self.lattice_points:
            return {
                "status": "no_lattice_points",
                "step": self.step_count,
                "time": self.time
            }
        
        # Calculate initial forces
        forces = self._calculate_forces()
        
        # Update positions using Velocity Verlet
        for i, point in enumerate(self.lattice_points):
            if point.fixed:
                continue  # Skip fixed points
                
            # Update position
            point.position += point.velocity * dt + 0.5 * (forces[i] / point.mass) * dt**2
        
        # Calculate new forces at updated positions
        new_forces = self._calculate_forces()
        
        # Update velocities using average force
        for i, point in enumerate(self.lattice_points):
            if point.fixed:
                continue  # Skip fixed points
                
            # Update velocity
            point.velocity += 0.5 * (forces[i] + new_forces[i]) / point.mass * dt
        
        # Apply thermostat if enabled
        if self.config.get("use_thermostat", True):
            self._apply_thermostat()
        
        # Update time and step count
        self.time += dt
        self.step_count += 1
        
        # Calculate OVERALL system energy and temperature
        kinetic_energy = self._calculate_kinetic_energy()
        potential_energy = self._calculate_potential_energy()
        temperature = self._calculate_temperature(kinetic_energy)
        
        # Return state summary
        return {
            "kinetic_energy": kinetic_energy,
            "potential_energy": potential_energy,
            "total_energy": kinetic_energy + potential_energy,
            "temperature": temperature,
            "step": self.step_count,
            "time": self.time,
            "metadata": {
                "time_step": dt,
                "n_points": len(self.lattice_points)
            }
        }
    
    def _calculate_forces(self) -> List[np.ndarray]:
        """
        Calculate forces on all lattice points, optimized using precomputed neighbor lists.
        
        Returns:
            List of force vectors for each lattice point
        """
        n_points = len(self.lattice_points)
        forces = [np.zeros(3) for _ in range(n_points)]
        
        # Calculate spring forces from nearest neighbors
        for i, point in enumerate(self.lattice_points):
            for j in self.neighbors[i]:
                other = self.lattice_points[j]
                
                # Calculate displacement vector
                r_ij = other.position - point.position
                distance = np.linalg.norm(r_ij)
                
                # Avoid division by zero
                if distance < 1e-10:
                    continue
                
                # Calculate spring force (Hooke's law)
                direction = r_ij / distance
                spring_force = self.spring_constant * (distance - self.lattice_constant) * direction
                forces[i] += spring_force
        
        # Calculate Coulomb forces if enabled
        if self.config.get("include_coulomb", True):
            for i, point in enumerate(self.lattice_points):
                if abs(point.charge) < 1e-10:
                    continue  # Skip neutral particles
                    
                for j, other in enumerate(self.lattice_points):
                    if i == j or abs(other.charge) < 1e-10:
                        continue  # Skip self-interaction and neutral particles
                    
                    # Calculate displacement vector
                    r_ij = other.position - point.position
                    distance = np.linalg.norm(r_ij)
                    
                    # Avoid division by zero and very close interactions
                    if distance < 1e-10:
                        continue
                    
                    # Calculate Coulomb force with screening
                    screening_length = self.config.get("screening_length", 5e-11)
                    screened_factor = np.exp(-distance / screening_length)
                    coulomb_force = (
                        point.charge * other.charge * screened_factor /
                        (4 * np.pi * self.eps0 * distance**2)
                    )
                    
                    # Add force
                    if abs(coulomb_force) > 0:
                        forces[i] += coulomb_force * r_ij / distance
        
        return forces
    
    def _calculate_kinetic_energy(self) -> float:
        """
        Calculate total kinetic energy of the lattice.
        
        Returns:
            Kinetic energy in Joules
        """
        return sum(point.kinetic_energy() for point in self.lattice_points)
    
    def _calculate_potential_energy(self) -> float:
        """
        Calculate total potential energy of the lattice.
        
        Returns:
            Potential energy in Joules
        """
        # Start with zero energy
        potential_energy = 0.0
        
        # Calculate spring potential energy using precomputed neighbors
        for i, point in enumerate(self.lattice_points):
            for j in self.neighbors[i]:
                if j > i:  # Count each bond once
                    other = self.lattice_points[j]
                    
                    # Calculate displacement
                    r_ij = other.position - point.position
                    distance = np.linalg.norm(r_ij)
                    
                    # Add spring potential energy
                    potential_energy += 0.5 * self.spring_constant * (distance - self.lattice_constant)**2
        
        # Calculate Coulomb potential energy if enabled
        if self.config.get("include_coulomb", True):
            for i, point in enumerate(self.lattice_points):
                if abs(point.charge) < 1e-10:
                    continue  # Skip neutral particles
                    
                for j, other in enumerate(self.lattice_points):
                    if i >= j or abs(other.charge) < 1e-10:
                        continue  # Skip self and already counted interactions
                    
                    # Calculate distance
                    r_ij = other.position - point.position
                    distance = np.linalg.norm(r_ij)
                    
                    # Avoid division by zero
                    if distance < 1e-10:
                        continue
                    
                    # Calculate Coulomb potential with screening
                    screening_length = self.config.get("screening_length", 5e-11)
                    screened_factor = np.exp(-distance / screening_length)
                    
                    coulomb_energy = (
                        point.charge * other.charge * screened_factor /
                        (4 * np.pi * self.eps0 * distance)
                    )
                    
                    potential_energy += coulomb_energy
        
        return potential_energy
    
    def _calculate_temperature(self, kinetic_energy: Optional[float] = None) -> float:
        """
        Calculate instantaneous temperature from kinetic energy.
        
        Args:
            kinetic_energy: Kinetic energy in Joules (calculated if not provided)
            
        Returns:
            Temperature in Kelvin
        """
        if kinetic_energy is None:
            kinetic_energy = self._calculate_kinetic_energy()
            
        # Get number of degrees of freedom
        n_points = len(self.lattice_points)
        # Subtract 3 if center of mass motion is constrained
        dof_adjustment = 3 if self.config.get("constrain_com", False) else 0
        n_dof = 3 * n_points - dof_adjustment
        
        # Avoid division by zero
        if n_dof > 0:
            return 2 * kinetic_energy / (n_dof * self.kb)
        return 0.0
    
    def _apply_thermostat(self) -> None:
        """
        Apply velocity rescaling thermostat to maintain target temperature.
        """
        # Calculate current temperature
        current_temp = self._calculate_temperature()
        target_temp = self.temperature
        
        # Skip if target is zero or very close to current
        if target_temp < 1e-6 or abs(current_temp - target_temp) / target_temp < 0.01:
            return
            
        # Calculate scaling factor
        if current_temp > 0:
            scale_factor = np.sqrt(target_temp / current_temp)
            
            # Scale all velocities
            for point in self.lattice_points:
                if not point.fixed:
                    point.velocity *= scale_factor
    
    def get_lattice_snapshot(self) -> Dict[str, Any]:
        """
        Get a snapshot of the current lattice state, including both
        raw particle data and spatially resolved properties if grid is available.
        
        Returns:
            Dictionary with lattice state data including spatial grids.
        """
        # Get raw particle data (as before)
        raw_positions = []
        raw_velocities = []
        atom_types = [] # Add type info if needed for visualization
        
        for i, point in enumerate(self.lattice_points):
             raw_positions.append(point.position.tolist())
             raw_velocities.append(point.velocity.tolist())
             # Determine type based on mass (example logic)
             if abs(point.mass - self.m_host) < 1e-28: type_name = "Host" # e.g., Pd
             elif abs(point.mass - self.m_absorbed) < 1e-28: type_name = "Absorbed" # e.g., D
             else: type_name = "Unknown"
             atom_types.append({"id": i, "type": type_name}) # Example structure

        snapshot = {
            "atoms": [{"id": a["id"], "type": a["type"], "pos": p, "vel": v} 
                      for i, (a, p, v) in enumerate(zip(atom_types, raw_positions, raw_velocities))],
            "lattice_constant": self.lattice_constant,
            "time": self.time,
            "step": self.step_count,
            # Include overall calculated properties
            "overall_temperature": self._calculate_temperature(),
            "overall_kinetic_energy": self._calculate_kinetic_energy(),
            "overall_potential_energy": self._calculate_potential_energy(),
            # Initialize spatial data fields
            "spatial_properties": {
                 "temperature_grid": None,
                 "density_grid": None,
                 "atom_indices_grid": None,
                 # Add other potential grids here
            }
        }
        
        # Calculate and add spatial properties if grid exists
        if self.grid:
            spatial_data = self._calculate_spatial_properties()
            snapshot["spatial_properties"].update(spatial_data)
            # Add grid info itself for context
            snapshot["grid_info"] = {
                 "resolution": self.grid.resolution,
                 "boundaries": self.grid.boundaries,
                 "cell_size": self.grid.cell_size
            }
            
        return snapshot
    
    async def run_simulation(self, steps: int, dt: float) -> Dict[str, Any]:
        """
        Run simulation for specified number of steps.
        
        Args:
            steps: Number of time steps to simulate
            dt: Time step in seconds
            
        Returns:
            Dict with simulation results
        """
        results = []
        energies = {
            "kinetic": [],
            "potential": [],
            "total": []
        }
        temperatures = []
        
        # Run simulation steps
        for _ in range(steps):
            state = await self.update_lattice_state(dt)
            results.append(state)
            
            # Record energy and temperature
            energies["kinetic"].append(state["kinetic_energy"])
            energies["potential"].append(state["potential_energy"])
            energies["total"].append(state["total_energy"])
            temperatures.append(state["temperature"])
        
        # Return results
        return {
            "time_evolution": results,
            "energies": energies,
            "temperatures": temperatures,
            "final_state": self.get_lattice_snapshot(),
            "metadata": {
                "time_step": dt,
                "steps": steps,
                "lattice_points": len(self.lattice_points),
                "initial_temperature": self.temperature
            }
        }

    # --- NEW: Spatial Property Calculation ---
    def _calculate_spatial_properties(self) -> Dict[str, Union[np.ndarray, List]]:
        """
        Calculates spatially resolved properties based on current atom positions and velocities,
        mapped onto the simulation grid.

        Returns:
            Dictionary containing NumPy arrays for spatial properties like:
             - temperature_grid: Local temperature in each cell (K)
             - density_grid: Local number density in each cell (m^-3)
             - atom_indices_grid: List of atom indices belonging to each cell (optional)
             # Add others as needed: velocity_grid, charge_density_grid, etc.
        """
        if not self.grid or not self.lattice_points:
            logger.warning("Cannot calculate spatial properties: Grid or lattice points missing.")
            return {
                "temperature_grid": None, 
                "density_grid": None, 
                "atom_indices_grid": None
            }

        # Initialize grids for aggregation
        kinetic_energy_grid = self.grid.create_empty_grid_data(dtype=np.float64, fill_value=0.0)
        atom_count_grid = self.grid.create_empty_grid_data(dtype=np.int32, fill_value=0)
        # Use object dtype for list of indices per cell
        atom_indices_grid = self.grid.create_empty_grid_data(dtype=object, fill_value=None) 
        # Initialize lists within the object array
        for index in np.ndindex(atom_indices_grid.shape):
             atom_indices_grid[index] = []

        # --- Aggregate properties per cell ---
        for atom_index, point in enumerate(self.lattice_points):
            # Get grid index for the atom's current position
            grid_idx = self.grid.get_grid_index(point.position[0], point.position[1], point.position[2])
            
            if grid_idx: # If atom is within grid boundaries
                i, j, k = grid_idx
                atom_count_grid[i, j, k] += 1
                kinetic_energy_grid[i, j, k] += point.kinetic_energy()
                atom_indices_grid[i, j, k].append(atom_index) 
                # Aggregate other properties if needed (e.g., charge for charge density)

        # --- Calculate final spatial grids ---
        
        # Density (atoms per cell volume)
        density_grid = self.grid.create_empty_grid_data(dtype=np.float64)
        if self.grid.cell_volume > 0:
             # Avoid division by zero warning where count is 0
             valid_counts = atom_count_grid > 0
             density_grid[valid_counts] = atom_count_grid[valid_counts] / self.grid.cell_volume
        
        # Temperature (T = 2 * KE_total / (3 * N * kb) per cell)
        # Need to handle cells with zero atoms (temperature is undefined or ambient?)
        temperature_grid = self.grid.create_empty_grid_data(dtype=np.float64, fill_value=self.temperature) # Default to ambient?
        # Calculate where atom_count > 0 to avoid division by zero
        valid_temp_cells = atom_count_grid > 0
        # Calculate temperature only for cells with atoms
        # 3 degrees of freedom per atom assumed here
        temperature_grid[valid_temp_cells] = (2.0 * kinetic_energy_grid[valid_temp_cells]) / (3.0 * atom_count_grid[valid_temp_cells] * self.kb)

        return {
            "temperature_grid": temperature_grid,
            "density_grid": density_grid,
            "atom_indices_grid": atom_indices_grid # Grid where each element is a list of atom indices
            # Add other calculated spatial fields here
        }