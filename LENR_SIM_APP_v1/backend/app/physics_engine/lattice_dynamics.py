"""
Lattice Dynamics Simulator for LENR Simulation
Implements real-time lattice structure updates, phonon propagation,
and particle interaction modeling based on the Unified LENR Theory.
"""

from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from scipy import constants
from scipy.sparse import csr_matrix
from scipy.sparse.linalg import eigsh
import asyncio
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor

@dataclass
class LatticePoint:
    """Data class for lattice point properties."""
    position: np.ndarray
    mass: float
    charge: float
    displacement: np.ndarray
    velocity: np.ndarray

class LatticeSimulator:
    """
    Core simulator for lattice dynamics in LENR systems.
    Handles phonon propagation, particle interactions, and energy transfer.
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        # Physical constants
        self.hbar = constants.hbar
        self.kb = constants.k
        self.e = constants.e
        self.eps0 = constants.epsilon_0
        
        # Initialize lattice parameters
        self.lattice_constant = self.config.get("lattice_constant", 4e-10)  # meters
        self.temperature = self.config.get("temperature", 300)  # Kelvin
        self.dimensions = self.config.get("dimensions", (10, 10, 10))
        
        # Initialize lattice structure
        self.lattice_points = self._initialize_lattice()
        self.force_constants = self._initialize_force_constants()
        
    def _initialize_lattice(self) -> List[LatticePoint]:
        """Initialize the lattice structure with points."""
        lattice_points = []
        nx, ny, nz = self.dimensions
        
        for i in range(nx):
            for j in range(ny):
                for k in range(nz):
                    position = np.array([i, j, k]) * self.lattice_constant
                    
                    # Add thermal fluctuations to initial positions
                    thermal_displacement = self._calculate_thermal_displacement()
                    
                    lattice_points.append(LatticePoint(
                        position=position,
                        mass=constants.m_p,  # Using proton mass for lattice points
                        charge=self.e,  # Using elementary charge
                        displacement=thermal_displacement,
                        velocity=np.zeros(3)  # Initial velocity
                    ))
        
        return lattice_points
    
    def _initialize_force_constants(self) -> csr_matrix:
        """Initialize the force constant matrix for phonon calculations."""
        n_points = len(self.lattice_points)
        
        # Create sparse force constant matrix
        data = []
        row_ind = []
        col_ind = []
        
        # Nearest neighbor interaction model
        for i in range(n_points):
            for j in range(n_points):
                if i != j:
                    # Calculate distance between points
                    r_ij = np.linalg.norm(
                        self.lattice_points[i].position - 
                        self.lattice_points[j].position
                    )
                    
                    # Add force constant for nearest neighbors
                    if abs(r_ij - self.lattice_constant) < 1e-12:
                        k_ij = self.config.get("spring_constant", 10.0)  # N/m
                        data.append(k_ij)
                        row_ind.append(i)
                        col_ind.append(j)
        
        return csr_matrix((data, (row_ind, col_ind)), shape=(n_points, n_points))
    
    def _calculate_thermal_displacement(self) -> np.ndarray:
        """Calculate thermal displacement for a lattice point."""
        # Using equipartition theorem
        amplitude = np.sqrt(self.kb * self.temperature / 
                          (constants.m_p * self.config.get("spring_constant", 10.0)))
        
        # Random direction
        direction = np.random.randn(3)
        direction /= np.linalg.norm(direction)
        
        return amplitude * direction
    
    async def calculate_phonon_modes(self) -> Dict[str, Any]:
        """
        Calculate phonon modes and frequencies.
        
        Returns:
            Dict containing phonon frequencies and eigenvectors
        """
        def _solve_eigensystem():
            # Calculate eigenvalues and eigenvectors of force constant matrix
            eigenvalues, eigenvectors = eigsh(
                self.force_constants, 
                k=min(10, len(self.lattice_points)-1)  # Calculate first 10 modes
            )
            
            # Convert to frequencies
            frequencies = np.sqrt(np.abs(eigenvalues) / constants.m_p) / (2 * np.pi)
            
            return frequencies, eigenvectors
        
        # Run eigensystem calculation in thread pool
        with ThreadPoolExecutor() as executor:
            frequencies, eigenvectors = await asyncio.get_event_loop().run_in_executor(
                executor, _solve_eigensystem
            )
        
        return {
            "frequencies": frequencies.tolist(),
            "eigenvectors": eigenvectors.tolist(),
            "metadata": {
                "temperature": self.temperature,
                "lattice_constant": self.lattice_constant
            }
        }
    
    async def update_lattice_state(self, dt: float) -> Dict[str, Any]:
        """
        Update lattice state for one time step.
        
        Args:
            dt: Time step in seconds
            
        Returns:
            Dict containing updated lattice state
        """
        # Update positions and velocities using Velocity Verlet algorithm
        for point in self.lattice_points:
            # Calculate forces
            force = self._calculate_total_force(point)
            
            # Update position
            point.position += point.velocity * dt + 0.5 * (force / point.mass) * dt**2
            
            # Store old force for velocity update
            old_force = force
            
            # Calculate new force at new position
            new_force = self._calculate_total_force(point)
            
            # Update velocity
            point.velocity += 0.5 * (old_force + new_force) / point.mass * dt
        
        # Calculate system energy
        kinetic_energy = self._calculate_kinetic_energy()
        potential_energy = self._calculate_potential_energy()
        
        return {
            "kinetic_energy": kinetic_energy,
            "potential_energy": potential_energy,
            "total_energy": kinetic_energy + potential_energy,
            "temperature": self._calculate_temperature(),
            "metadata": {
                "time_step": dt,
                "n_points": len(self.lattice_points)
            }
        }
    
    def _calculate_total_force(self, point: LatticePoint) -> np.ndarray:
        """Calculate total force on a lattice point."""
        force = np.zeros(3)
        
        # Spring forces from neighbors
        for other in self.lattice_points:
            if other is not point:
                r_ij = other.position - point.position
                distance = np.linalg.norm(r_ij)
                
                if abs(distance - self.lattice_constant) < 1e-12:
                    k = self.config.get("spring_constant", 10.0)
                    force += k * (distance - self.lattice_constant) * r_ij / distance
        
        # Add Coulomb forces
        for other in self.lattice_points:
            if other is not point:
                r_ij = other.position - point.position
                distance = np.linalg.norm(r_ij)
                
                coulomb_force = (point.charge * other.charge / 
                               (4 * np.pi * self.eps0 * distance**2))
                force += coulomb_force * r_ij / distance
        
        return force
    
    def _calculate_kinetic_energy(self) -> float:
        """Calculate total kinetic energy of the lattice."""
        return sum(0.5 * point.mass * np.sum(point.velocity**2)
                  for point in self.lattice_points)
    
    def _calculate_potential_energy(self) -> float:
        """Calculate total potential energy of the lattice."""
        energy = 0.0
        
        # Spring potential energy
        for i, point in enumerate(self.lattice_points):
            for other in self.lattice_points[i+1:]:
                r_ij = other.position - point.position
                distance = np.linalg.norm(r_ij)
                
                if abs(distance - self.lattice_constant) < 1e-12:
                    k = self.config.get("spring_constant", 10.0)
                    energy += 0.5 * k * (distance - self.lattice_constant)**2
        
        # Coulomb potential energy
        for i, point in enumerate(self.lattice_points):
            for other in self.lattice_points[i+1:]:
                r_ij = other.position - point.position
                distance = np.linalg.norm(r_ij)
                
                energy += (point.charge * other.charge / 
                          (4 * np.pi * self.eps0 * distance))
        
        return energy
    
    def _calculate_temperature(self) -> float:
        """Calculate instantaneous temperature from kinetic energy."""
        n_degrees = 3 * len(self.lattice_points)  # 3 degrees of freedom per point
        kinetic_energy = self._calculate_kinetic_energy()
        return 2 * kinetic_energy / (n_degrees * self.kb) 