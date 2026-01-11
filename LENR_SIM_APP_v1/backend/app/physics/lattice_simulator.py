"""
Lattice Simulator module for LENR_Sim_App

This module provides functions for simulating the dynamics of a 3D lattice
of atoms, including thermal vibrations, phonon propagation, and energy dynamics.
"""

import time
import uuid
import numpy as np
import threading
from typing import Dict, List, Any, Optional, Tuple

# Import logging
from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("lattice_simulator", "logs/simulation.log")

# Dictionary to store active simulations
# Each simulation has its own thread and data
active_simulations = {}

class LatticeSimulation(threading.Thread):
    """
    Thread-based lattice simulation that can be started, stopped, and reset
    """
    
    def __init__(
        self, 
        sim_id: str, 
        lattice_size: int = 3, 
        temperature: float = 300, 
        potential_type: str = "harmonic",
        spring_constant: float = 1000
    ):
        """Initialize the lattice simulation with the given parameters"""
        threading.Thread.__init__(self)
        self.daemon = True  # Thread will exit when the main program exits
        
        self.sim_id = sim_id
        self.lattice_size = lattice_size
        self.temperature = temperature
        self.potential_type = potential_type
        self.spring_constant = spring_constant
        
        # Simulation state
        self.is_running = False
        self.should_stop = False
        self.is_initialized = False
        self.last_update_time = 0
        self.step_count = 0
        
        # Simulation data
        self.lattice_data = None
        self.energy_data = None
        self.phonon_data = None
        
        # Initialize the lattice
        self._initialize_lattice()
        
        logger.info(f"Initialized lattice simulation {sim_id} with size {lattice_size}")
    
    def _initialize_lattice(self):
        """Initialize the lattice structure and simulation data"""
        try:
            # Create a cubic lattice of atoms
            # The lattice has size (lattice_size x lattice_size x lattice_size)
            # Each atom has a position, velocity, and type (e.g., Pd or D)
            
            # Create arrays for atom data
            n_atoms = self.lattice_size**3
            positions = np.zeros((n_atoms, 3))
            velocities = np.zeros((n_atoms, 3))
            atom_types = np.zeros(n_atoms, dtype=int)  # 0 for Pd, 1 for D
            
            # Set initial positions in a cubic lattice
            spacing = 2.0  # in Angstroms
            idx = 0
            for x in range(self.lattice_size):
                for y in range(self.lattice_size):
                    for z in range(self.lattice_size):
                        positions[idx] = [x * spacing, y * spacing, z * spacing]
                        atom_types[idx] = 0  # Palladium
                        idx += 1
            
            # Add some Deuterium atoms at interstitial positions
            n_deuterium = n_atoms // 3  # Add about 1/3 as many D atoms
            d_positions = np.zeros((n_deuterium, 3))
            d_velocities = np.zeros((n_deuterium, 3))
            d_types = np.ones(n_deuterium, dtype=int)  # 1 for D
            
            for i in range(n_deuterium):
                # Random interstitial position
                x = np.random.uniform(0, (self.lattice_size - 1) * spacing)
                y = np.random.uniform(0, (self.lattice_size - 1) * spacing)
                z = np.random.uniform(0, (self.lattice_size - 1) * spacing)
                d_positions[i] = [x, y, z]
            
            # Combine all atoms
            all_positions = np.vstack([positions, d_positions])
            all_velocities = np.vstack([velocities, d_velocities])
            all_types = np.concatenate([atom_types, d_types])
            
            # Initialize velocities according to Maxwell-Boltzmann distribution
            # Adjust for atom type (Pd vs D)
            kb = 8.617333262e-5  # Boltzmann constant in eV/K
            T_eV = kb * self.temperature
            
            for i in range(len(all_types)):
                # Mass in atomic mass units (amu)
                mass = 106.42 if all_types[i] == 0 else 2.014  # Pd or D
                # Standard deviation for Maxwell-Boltzmann
                sigma = np.sqrt(T_eV / mass)
                # Generate random velocities
                all_velocities[i] = np.random.normal(0, sigma, 3)
            
            # Store the initialized data
            self.lattice_data = {
                "positions": all_positions,
                "velocities": all_velocities,
                "types": all_types,
                "n_atoms": len(all_types)
            }
            
            # Initialize energy data
            total_ke = self._calculate_kinetic_energy()
            total_pe = self._calculate_potential_energy()
            
            self.energy_data = {
                "kinetic": [total_ke],
                "potential": [total_pe],
                "total": [total_ke + total_pe],
                "time": [0]
            }
            
            # Initialize phonon data (placeholder for now)
            self.phonon_data = {
                "modes": [],
                "amplitudes": [],
                "time": []
            }
            
            self.is_initialized = True
            logger.info(f"Lattice for sim {self.sim_id} initialized with {len(all_types)} atoms")
            
        except Exception as e:
            logger.error(f"Error initializing lattice: {str(e)}", exc_info=True)
            self.is_initialized = False
    
    def _calculate_kinetic_energy(self) -> float:
        """Calculate the total kinetic energy of the system"""
        if not self.is_initialized:
            return 0.0
        
        velocities = self.lattice_data["velocities"]
        types = self.lattice_data["types"]
        
        # Calculate kinetic energy: 1/2 * m * v^2
        total_ke = 0.0
        for i in range(len(types)):
            mass = 106.42 if types[i] == 0 else 2.014  # Pd or D mass in amu
            v_squared = np.sum(velocities[i]**2)
            total_ke += 0.5 * mass * v_squared
        
        return total_ke
    
    def _calculate_potential_energy(self) -> float:
        """Calculate the total potential energy of the system"""
        if not self.is_initialized:
            return 0.0
        
        positions = self.lattice_data["positions"]
        types = self.lattice_data["types"]
        
        # Simple harmonic potential between nearest neighbors
        total_pe = 0.0
        
        # TODO: Implement a more sophisticated potential calculation
        # For now, just a basic estimate
        # This would be replaced with Morse potential or Lennard-Jones in a real implementation
        
        # Calculate distances between all pairs and apply a simple harmonic potential
        for i in range(len(positions)):
            for j in range(i+1, len(positions)):
                dist = np.linalg.norm(positions[i] - positions[j])
                if dist < 5.0:  # Only consider interactions within a cutoff
                    # Simple harmonic potential: 1/2 * k * (r - r0)^2
                    r0 = 2.0  # equilibrium distance in Angstroms
                    pe = 0.5 * self.spring_constant * (dist - r0)**2
                    total_pe += pe
        
        return total_pe
    
    def _update_simulation(self):
        """Update the simulation by one time step"""
        if not self.is_initialized:
            return
        
        # Time step in femtoseconds
        dt = 1.0
        
        positions = self.lattice_data["positions"]
        velocities = self.lattice_data["velocities"]
        types = self.lattice_data["types"]
        
        # Calculate forces (negative gradient of potential)
        forces = np.zeros_like(positions)
        
        # For now, use a simple harmonic potential for demonstration
        for i in range(len(positions)):
            for j in range(len(positions)):
                if i != j:
                    r_ij = positions[i] - positions[j]
                    dist = np.linalg.norm(r_ij)
                    
                    if dist < 5.0:  # Only consider interactions within a cutoff
                        # Force for harmonic potential: -k * (r - r0) * unit_vector
                        r0 = 2.0  # equilibrium distance in Angstroms
                        if dist > 0:
                            force_mag = -self.spring_constant * (dist - r0)
                            force_vec = force_mag * r_ij / dist
                            forces[i] += force_vec
        
        # Update velocities (v = v + F/m * dt)
        for i in range(len(velocities)):
            mass = 106.42 if types[i] == 0 else 2.014  # Pd or D mass in amu
            velocities[i] += forces[i] * dt / mass
        
        # Update positions (r = r + v * dt)
        positions += velocities * dt
        
        # Store updated data
        self.lattice_data["positions"] = positions
        self.lattice_data["velocities"] = velocities
        
        # Calculate and store energy data
        total_ke = self._calculate_kinetic_energy()
        total_pe = self._calculate_potential_energy()
        sim_time = self.step_count * dt
        
        self.energy_data["kinetic"].append(total_ke)
        self.energy_data["potential"].append(total_pe)
        self.energy_data["total"].append(total_ke + total_pe)
        self.energy_data["time"].append(sim_time)
        
        # Update step count
        self.step_count += 1
        self.last_update_time = time.time()
    
    def run(self):
        """Main simulation loop that runs in a separate thread"""
        if not self.is_initialized:
            logger.error(f"Cannot run simulation {self.sim_id}: not initialized")
            return
        
        logger.info(f"Starting simulation thread for {self.sim_id}")
        self.is_running = True
        self.should_stop = False
        
        while not self.should_stop:
            # Update the simulation
            self._update_simulation()
            
            # Sleep a bit to not consume excessive CPU
            # In a real implementation, this would be more sophisticated
            time.sleep(0.01)
        
        self.is_running = False
        logger.info(f"Simulation thread for {self.sim_id} stopped")
    
    def stop(self):
        """Stop the simulation thread"""
        logger.info(f"Stopping simulation {self.sim_id}")
        self.should_stop = True
    
    def reset(self):
        """Reset the simulation to its initial state"""
        logger.info(f"Resetting simulation {self.sim_id}")
        
        # Stop the simulation if it's running
        was_running = self.is_running
        if was_running:
            self.stop()
            # Wait for the thread to stop
            while self.is_running:
                time.sleep(0.01)
        
        # Reinitialize the lattice
        self._initialize_lattice()
        self.step_count = 0
        
        # Restart if it was running before
        if was_running:
            self.start()
    
    def get_data(self) -> Dict[str, Any]:
        """Get the current simulation data"""
        return {
            "sim_id": self.sim_id,
            "is_running": self.is_running,
            "step_count": self.step_count,
            "lattice_size": self.lattice_size,
            "temperature": self.temperature,
            "potential_type": self.potential_type,
            "spring_constant": self.spring_constant,
            "last_update": self.last_update_time,
            "atom_positions": self.lattice_data["positions"].tolist() if self.is_initialized else [],
            "atom_types": self.lattice_data["types"].tolist() if self.is_initialized else [],
            "energy_data": {
                "kinetic": self.energy_data["kinetic"][-10:] if self.is_initialized else [],
                "potential": self.energy_data["potential"][-10:] if self.is_initialized else [],
                "total": self.energy_data["total"][-10:] if self.is_initialized else [],
                "time": self.energy_data["time"][-10:] if self.is_initialized else []
            }
        }

def start_simulation(
    sim_id: str, 
    lattice_size: int = 3, 
    temperature: float = 300, 
    potential_type: str = "harmonic",
    spring_constant: float = 1000
) -> bool:
    """
    Start a new lattice simulation with the given parameters
    
    Args:
        sim_id: Unique identifier for the simulation
        lattice_size: Size of the cubic lattice (N x N x N)
        temperature: Temperature in Kelvin
        potential_type: Type of interatomic potential
        spring_constant: Spring constant for harmonic potentials
    
    Returns:
        bool: True if the simulation was started successfully
    """
    try:
        # Check if a simulation with this ID already exists
        if sim_id in active_simulations:
            logger.warning(f"Simulation {sim_id} already exists, stopping the existing one")
            stop_simulation(sim_id)
        
        # Create a new simulation
        simulation = LatticeSimulation(
            sim_id=sim_id,
            lattice_size=lattice_size,
            temperature=temperature,
            potential_type=potential_type,
            spring_constant=spring_constant
        )
        
        # Start the simulation thread
        simulation.start()
        
        # Store the simulation
        active_simulations[sim_id] = simulation
        
        logger.info(f"Simulation {sim_id} started successfully")
        return True
        
    except Exception as e:
        logger.error(f"Error starting simulation {sim_id}: {str(e)}", exc_info=True)
        return False

def stop_simulation(sim_id: str) -> bool:
    """
    Stop a running simulation
    
    Args:
        sim_id: Unique identifier for the simulation
    
    Returns:
        bool: True if the simulation was stopped successfully
    """
    try:
        if sim_id not in active_simulations:
            logger.warning(f"Simulation {sim_id} not found")
            return False
        
        # Stop the simulation thread
        simulation = active_simulations[sim_id]
        simulation.stop()
        
        logger.info(f"Simulation {sim_id} stopped successfully")
        return True
        
    except Exception as e:
        logger.error(f"Error stopping simulation {sim_id}: {str(e)}", exc_info=True)
        return False

def reset_simulation(sim_id: str) -> bool:
    """
    Reset a simulation to its initial state
    
    Args:
        sim_id: Unique identifier for the simulation
    
    Returns:
        bool: True if the simulation was reset successfully
    """
    try:
        if sim_id not in active_simulations:
            logger.warning(f"Simulation {sim_id} not found")
            return False
        
        # Reset the simulation
        simulation = active_simulations[sim_id]
        simulation.reset()
        
        logger.info(f"Simulation {sim_id} reset successfully")
        return True
        
    except Exception as e:
        logger.error(f"Error resetting simulation {sim_id}: {str(e)}", exc_info=True)
        return False

def get_simulation_data(sim_id: str) -> Optional[Dict[str, Any]]:
    """
    Get the current data for a simulation
    
    Args:
        sim_id: Unique identifier for the simulation
    
    Returns:
        Dict or None: The simulation data, or None if the simulation was not found
    """
    try:
        if sim_id not in active_simulations:
            logger.warning(f"Simulation {sim_id} not found")
            return None
        
        # Get the simulation data
        simulation = active_simulations[sim_id]
        return simulation.get_data()
        
    except Exception as e:
        logger.error(f"Error getting simulation data for {sim_id}: {str(e)}", exc_info=True)
        return None 