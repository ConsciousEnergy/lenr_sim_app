"""
Simulation Engine Module for LENR_Sim_App

This module provides the core simulation engine for LENR simulations,
integrating spatial domains, species, and reactions with time evolution.
"""

import numpy as np
import scipy.sparse as sp
import scipy.sparse.linalg as spla
from typing import Dict, List, Tuple, Set, Optional, Union, Any, Callable
import logging
import time
import copy
from dataclasses import dataclass, field
import threading
import uuid
import asyncio
import traceback
import gc
from concurrent.futures import TimeoutError
from functools import wraps

from app.utils.logging import setup_logger
from app.simulation.domain import SimulationDomain
from app.simulation.species import Species
from app.simulation.reaction import Reaction
from app.visualization.simulation_hooks import default_hook_manager

# Set up logger
logger = setup_logger("sim_engine", "logs/simulation.log")

# Performance monitoring timeouts
DEFAULT_SIMULATION_TIMEOUT = 120  # seconds
TIMEOUT_BUFFER = 10  # Add buffer seconds to internal timeouts

def timeout_aware(timeout=DEFAULT_SIMULATION_TIMEOUT):
    """
    Decorator for simulation functions to make them timeout-aware
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                # Set internal timeout slightly lower than external one
                internal_timeout = max(1, timeout - TIMEOUT_BUFFER)
                
                # Start memory tracking
                initial_memory = get_memory_usage()
                start_time = time.time()
                
                # Execute with timeout
                result = await asyncio.wait_for(
                    func(*args, **kwargs), 
                    timeout=internal_timeout
                )
                
                # Track performance metrics
                elapsed = time.time() - start_time
                memory_used = get_memory_usage() - initial_memory
                
                # Log performance data
                logger.info(
                    f"Simulation task completed: {func.__name__}, "
                    f"Time: {elapsed:.2f}s, Memory: {memory_used/1024/1024:.2f}MB"
                )
                
                # Perform cleanup
                gc.collect()
                
                return result
                
            except asyncio.TimeoutError:
                # Log detailed information about the timeout
                logger.error(
                    f"Simulation timeout in {func.__name__} after {timeout}s. "
                    f"Args: {args}, Kwargs: {kwargs}"
                )
                
                # Force garbage collection
                gc.collect()
                
                # Raise a more informative timeout error
                raise TimeoutError(
                    f"Simulation calculation timed out after {timeout} seconds. "
                    f"Try simplifying your simulation parameters or "
                    f"increasing the timeout settings."
                )
                
            except Exception as e:
                # Log the detailed error
                logger.error(
                    f"Error in simulation {func.__name__}: {str(e)}\n"
                    f"{traceback.format_exc()}"
                )
                raise
                
        return wrapper
    return decorator

def get_memory_usage():
    """Get current memory usage in bytes"""
    import psutil
    import os
    
    process = psutil.Process(os.getpid())
    return process.memory_info().rss

@dataclass
class SimulationConfig:
    """Configuration parameters for the simulation engine"""
    time_step: float = 1e-6  # Time step in seconds
    max_time: float = 1.0    # Maximum simulation time in seconds
    adaptive_time: bool = True  # Use adaptive time stepping
    min_time_step: float = 1e-12  # Minimum time step when using adaptive stepping
    max_time_step: float = 1e-3   # Maximum time step when using adaptive stepping
    stability_factor: float = 0.9  # Safety factor for adaptive time stepping
    max_iterations_per_step: int = 10  # Maximum iterations per time step
    convergence_tolerance: float = 1e-6  # Convergence tolerance
    output_interval: float = 0.01  # Interval for storing results
    progress_interval: float = 0.1  # Interval for reporting progress


class SimulationEngine:
    """
    Core simulation engine for LENR simulations.
    Integrates spatial domain, species, reactions, and time evolution.
    """
    
    def __init__(
        self,
        domain: SimulationDomain,
        config: Optional[SimulationConfig] = None
    ):
        """
        Initialize the simulation engine.
        
        Args:
            domain: Simulation domain
            config: Simulation configuration parameters
        """
        self.domain = domain
        self.config = config or SimulationConfig()
        
        # Lists to store simulation components
        self.species: List[Species] = []
        self.reactions: List[Reaction] = []
        
        # Storage for simulation data
        self.concentrations: Dict[str, np.ndarray] = {}
        self.old_concentrations: Dict[str, np.ndarray] = {}
        self.temperature: np.ndarray = None
        self.time: float = 0.0
        
        # Matrices for implicit diffusion calculations (cached)
        self.diffusion_matrices: Dict[str, Tuple[sp.csr_matrix, sp.csr_matrix]] = {}
        
        # Results storage
        self.results_history = {
            'time': [],
            'concentrations': {},
            'temperature': [],
            'reaction_rates': {}
        }
        
        # Simulation metadata
        self.simulation_id = str(uuid.uuid4())
        self.start_time = None
        self.end_time = None
        self.is_running = False
        self.is_initialized = False
        self.step_number = 0  # Add step counter
        
        logger.info(f"Created SimulationEngine (id={self.simulation_id}) with domain and config")
    
    def add_species(self, species: Species) -> None:
        """
        Add a species to the simulation.
        
        Args:
            species: Species to add
        """
        # Check if a species with the same name already exists
        for existing in self.species:
            if existing.name == species.name:
                logger.warning(f"Species {species.name} already exists, replacing")
                self.species.remove(existing)
                break
                
        self.species.append(species)
        
        # Initialize concentration array on the domain
        concentration = species.initialize_on_domain(self.domain)
        self.concentrations[species.name] = concentration
        self.old_concentrations[species.name] = concentration.copy()
        
        # Initialize result history for this species
        if 'concentrations' not in self.results_history:
            self.results_history['concentrations'] = {}
            
        self.results_history['concentrations'][species.name] = []
        
        # Precompute matrices for implicit diffusion if coefficient > 0
        if species.diffusion_coefficient > 0:
            self._precompute_diffusion_matrices(species)
        
        logger.debug(f"Added species {species.name} to simulation")
    
    def add_reaction(self, reaction: Reaction) -> None:
        """
        Add a reaction to the simulation.
        
        Args:
            reaction: Reaction to add
        """
        # Check if a reaction with the same name already exists
        for existing in self.reactions:
            if existing.name == reaction.name:
                logger.warning(f"Reaction {reaction.name} already exists, replacing")
                self.reactions.remove(existing)
                break
                
        self.reactions.append(reaction)
        
        # Initialize result history for this reaction
        if 'reaction_rates' not in self.results_history:
            self.results_history['reaction_rates'] = {}
            
        self.results_history['reaction_rates'][reaction.name] = []
        
        logger.debug(f"Added reaction {reaction.name} to simulation")
    
    def set_temperature(self, temperature: Union[float, np.ndarray]) -> None:
        """
        Set the temperature distribution for the simulation.
        
        Args:
            temperature: Temperature in Kelvin (scalar or array)
        """
        if isinstance(temperature, float):
            self.temperature = np.ones(self.domain.resolution) * temperature
        else:
            # Ensure array has the right shape
            if temperature.shape != self.domain.resolution:
                logger.warning(
                    f"Temperature array shape {temperature.shape} doesn't match "
                    f"domain resolution {self.domain.resolution}. Resizing."
                )
                # Resize to match domain
                self.temperature = np.resize(temperature, self.domain.resolution)
            else:
                self.temperature = temperature.copy()
        
        # Initialize result history for temperature
        if 'temperature' not in self.results_history:
            self.results_history['temperature'] = []
        
        logger.debug(f"Set temperature distribution: min={np.min(self.temperature):.2f}K, "
                    f"max={np.max(self.temperature):.2f}K, mean={np.mean(self.temperature):.2f}K")
    
    def _precompute_diffusion_matrices(self, species: Species) -> None:
        """
        Precompute matrices for implicit diffusion calculations.
        
        For each species with diffusion, we precompute:
        1. Laplacian matrix with diffusion coefficient applied
        2. (I - dt*D*∇²) matrix for implicit time stepping
        
        Args:
            species: Species to precompute matrices for
        """
        if species.diffusion_coefficient <= 0:
            return
            
        # Get diffusion coefficient
        D = species.diffusion_coefficient
        
        # Get Laplacian operator
        laplacian = self.domain.create_laplacian_matrix()
        
        # Scale by diffusion coefficient
        diffusion_op = D * laplacian
        
        # Create identity matrix
        n = self.domain.total_points
        identity = sp.eye(n, format='csr')
        
        # Store both matrices (we'll use different dt values during simulation)
        self.diffusion_matrices[species.name] = (diffusion_op, identity)
        
        logger.debug(f"Precomputed diffusion matrices for {species.name} with D={D:.2e} m²/s")
    
    def initialize(self) -> None:
        """
        Initialize the simulation.
        
        Sets up initial arrays and validates simulation configuration.
        """
        if self.is_initialized:
            logger.warning("Simulation already initialized, skipping")
            return
        
        # Validate that we have at least one species
        if not self.species:
            logger.error("No species added to simulation")
            raise ValueError("No species added to simulation")
        
        # Validate domain resolution
        if any(dim <= 0 for dim in self.domain.resolution):
            logger.error(f"Invalid domain resolution: {self.domain.resolution}")
            raise ValueError(f"Invalid domain resolution: {self.domain.resolution}")
        
        # Initialize temperature if not set
        if self.temperature is None:
            logger.info("Temperature not set, initializing to 300K")
            self.set_temperature(300.0)  # Default to room temperature
        
        # Clear results history
        self.results_history = {
            'time': [],
            'concentrations': {},
            'temperature': [],
            'reaction_rates': {}
        }
        
        # Cache initial state
        self._cache_state()
        
        self.is_initialized = True
        logger.info("Simulation initialized")
        
        # Notify visualization hooks of simulation start
        self._notify_simulation_start()
    
    def _calculate_adaptive_time_step(self) -> float:
        """
        Calculate an appropriate time step based on stability criteria.
        
        Returns:
            Appropriate time step in seconds
        """
        if not self.config.adaptive_time:
            return self.config.time_step
            
        # Start with maximum allowed time step
        dt = self.config.max_time_step
        
        # Consider diffusion stability: dt <= dx²/(2*D)
        for species in self.species:
            D = species.diffusion_coefficient
            if D > 0:
                # Calculate minimum grid spacing
                dx = min(self.domain.dx, self.domain.dy, self.domain.dz)
                
                # von Neumann stability criterion for diffusion
                dt_diff = self.config.stability_factor * dx**2 / (2 * D)
                dt = min(dt, dt_diff)
        
        # Consider reaction rates: dt <= 1/max(rate)
        for reaction in self.reactions:
            if reaction.rate is not None:
                max_rate = np.max(np.abs(reaction.rate))
                if max_rate > 0:
                    dt_react = self.config.stability_factor / max_rate
                    dt = min(dt, dt_react)
        
        # Ensure dt is within bounds
        dt = max(dt, self.config.min_time_step)
        dt = min(dt, self.config.max_time_step)
        
        # Also ensure we don't exceed the remaining simulation time
        dt = min(dt, self.config.max_time - self.time)
        
        return dt
    
    def _apply_diffusion(self, dt: float) -> None:
        """
        Apply diffusion to all species using implicit method.
        
        Args:
            dt: Time step to use
        """
        for species in self.species:
            if species.diffusion_coefficient <= 0:
                continue
                
            if species.name not in self.diffusion_matrices:
                # Matrices not precomputed, skip
                logger.warning(f"Diffusion matrices not precomputed for {species.name}")
                continue
                
            # Get matrices
            diffusion_op, identity = self.diffusion_matrices[species.name]
            
            # Create LHS matrix for implicit scheme: (I - dt*D*∇²)
            lhs = identity - dt * diffusion_op
            
            # Get concentration and flatten for matrix operations
            conc = self.concentrations[species.name].flatten()
            
            # Solve the linear system using a sparse solver
            new_conc = spla.spsolve(lhs, conc)
            
            # Reshape and update
            self.concentrations[species.name] = new_conc.reshape(self.domain.resolution)
            
            # Ensure non-negative concentrations (physical constraint)
            self.concentrations[species.name] = np.maximum(self.concentrations[species.name], 0.0)
    
    def _apply_reactions(self, dt: float) -> None:
        """
        Apply reactions to update species concentrations.
        
        Args:
            dt: Time step to use
        """
        # Calculate reaction rates for all reactions
        reaction_rates = {}
        for reaction in self.reactions:
            reaction_rates[reaction.name] = reaction.calculate_rate(
                self.concentrations, 
                self.temperature,
                self.domain
            )
        
        # Update concentrations based on reaction rates and stoichiometry
        for reaction in self.reactions:
            rate = reaction_rates[reaction.name]
            
            # Apply to each species based on stoichiometry
            for species_name, stoich_coeff in reaction.stoichiometry.items():
                if species_name in self.concentrations:
                    self.concentrations[species_name] += stoich_coeff * rate * dt
        
        # Ensure non-negative concentrations
        for name in self.concentrations:
            self.concentrations[name] = np.maximum(self.concentrations[name], 0.0)
    
    def step(self) -> bool:
        """
        Advance the simulation by one time step.
        
        Returns:
            bool: True if the step was successful, False if the simulation is complete
        """
        if not self.is_initialized:
            logger.error("Simulation not initialized, call initialize() first")
            raise RuntimeError("Simulation not initialized, call initialize() first")
        
        if not self.is_running:
            logger.info("Starting simulation run")
            self.is_running = True
            self.start_time = time.time()
        
        # Check if we've reached the maximum time
        if self.time >= self.config.max_time:
            logger.info(f"Reached maximum time ({self.config.max_time}s), stopping")
            self.is_running = False
            self.end_time = time.time()
            return False
        
        # Determine time step (adaptive or fixed)
        dt = self.config.time_step
        if self.config.adaptive_time:
            dt = self._calculate_adaptive_time_step()
        
        # Ensure we don't exceed max_time
        if self.time + dt > self.config.max_time:
            dt = self.config.max_time - self.time
        
        # Store old concentrations
        for name, conc in self.concentrations.items():
            self.old_concentrations[name] = conc.copy()
        
        # Apply diffusion (implicit)
        self._apply_diffusion(dt)
        
        # Apply reactions (explicit)
        self._apply_reactions(dt)
        
        # Update time
        self.time += dt
        self.step_number += 1  # Increment step counter
        
        # Cache state at output intervals
        if (len(self.results_history['time']) == 0 or 
            self.time - self.results_history['time'][-1] >= self.config.output_interval):
            self._cache_state()
            
        # Log progress at specified intervals
        if (len(self.results_history['time']) == 0 or 
            self.time - self.results_history['time'][-1] >= self.config.progress_interval):
            logger.info(f"Simulation time: {self.time:.6f}s, Step size: {dt:.6e}s")
        
        # Notify visualization hooks of step completion
        self._notify_simulation_step()
        
        return True
    
    def run(self, callback: Optional[Callable] = None) -> Dict[str, Any]:
        """
        Run the simulation until completion.
        
        Args:
            callback: Optional callback function to be called after each step
            
        Returns:
            Dict containing simulation results
        """
        if not self.is_initialized:
            self.initialize()
        
        self.is_running = True
        self.start_time = time.time()
        
        logger.info(f"Starting simulation run (max_time={self.config.max_time}s)")
        
        try:
            # Main simulation loop
            while self.step():
                # Call user callback if provided
                if callback:
                    try:
                        callback(self)
                    except Exception as e:
                        logger.error(f"Error in callback function: {e}")
                
                # Check if we should stop
                if not self.is_running:
                    break
            
            self.end_time = time.time()
            self.is_running = False
            
            # Final state cache to ensure we have the last step
            self._cache_state()
            
            duration = self.end_time - self.start_time
            logger.info(f"Simulation complete, duration: {duration:.2f}s, steps: {self.step_number}")
            
            # Prepare results
            results = self.get_results()
            
            # Notify visualization hooks of simulation completion
            self._notify_simulation_end(results)
            
            return results
            
        except Exception as e:
            self.end_time = time.time()
            self.is_running = False
            logger.error(f"Error during simulation: {e}")
            
            # Notify visualization hooks of simulation error
            self._notify_simulation_error(e)
            
            raise
    
    def stop(self) -> None:
        """Stop a running simulation"""
        if self.is_running:
            self.is_running = False
            logger.info(f"Simulation {self.simulation_id} stopped by user")
    
    def get_results(self) -> Dict[str, Any]:
        """
        Get the simulation results.
        
        Returns:
            Dictionary with simulation results
        """
        # Basic simulation metadata
        results = {
            'id': self.simulation_id,
            'domain': self.domain.to_dict(),
            'config': {k: v for k, v in self.config.__dict__.items()},
            'time': np.array(self.results_history['time']),
            'elapsed_time': None
        }
        
        # Add elapsed time if available
        if self.start_time is not None:
            if self.end_time is not None:
                results['elapsed_time'] = self.end_time - self.start_time
            else:
                results['elapsed_time'] = time.time() - self.start_time
        
        # Add species concentrations
        results['concentrations'] = {
            name: np.array(conc_history) 
            for name, conc_history in self.results_history['concentrations'].items()
        }
        
        # Add temperature
        results['temperature'] = np.array(self.results_history['temperature'])
        
        # Add reaction rates
        results['reaction_rates'] = {
            name: np.array(rate_history)
            for name, rate_history in self.results_history['reaction_rates'].items()
        }
        
        # Include species info
        results['species'] = {
            species.name: {
                'atomic_number': species.atomic_number,
                'mass_number': species.mass_number,
                'diffusion_coefficient': species.diffusion_coefficient
            } for species in self.species
        }
        
        # Include reaction info
        results['reactions'] = {
            reaction.name: {
                'type': reaction.__class__.__name__,
                'reactants': [r.name for r in reaction.reactants],
                'products': [p.name for p in reaction.products],
                'stoichiometry': reaction.stoichiometry
            } for reaction in self.reactions
        }
        
        return results
    
    def _cache_state(self) -> None:
        """Cache the current simulation state in results_history"""
        self.results_history['time'].append(self.time)
        
        # Cache concentrations
        for name, conc in self.concentrations.items():
            if name not in self.results_history['concentrations']:
                self.results_history['concentrations'][name] = []
            self.results_history['concentrations'][name].append(conc.copy())
        
        # Cache temperature
        self.results_history['temperature'].append(self.temperature.copy())
        
        # Cache reaction rates
        for reaction in self.reactions:
            rate_name = reaction.name
            if rate_name not in self.results_history['reaction_rates']:
                self.results_history['reaction_rates'][rate_name] = []
            
            # Calculate and cache rate
            rate = reaction.calculate_rate(self.concentrations, self.temperature)
            self.results_history['reaction_rates'][rate_name].append(rate.copy())
    
    def _notify_simulation_start(self) -> None:
        """Notify visualization hooks that simulation has started"""
        # Prepare metadata
        metadata = {
            "simulation_id": self.simulation_id,
            "domain": {
                "dimensions": self.domain.dimensions,
                "resolution": self.domain.resolution,
                "extents": self.domain.extents
            },
            "config": {
                "time_step": self.config.time_step,
                "max_time": self.config.max_time,
                "adaptive_time": self.config.adaptive_time
            },
            "species": [species.name for species in self.species],
            "reactions": [reaction.name for reaction in self.reactions],
            "timestamp": time.time()
        }
        
        # Notify hooks
        default_hook_manager.notify_simulation_start(self.simulation_id, metadata)
    
    def _notify_simulation_step(self) -> None:
        """Notify visualization hooks that a simulation step has completed"""
        # Prepare current state
        state = {
            "concentrations": self.concentrations,
            "temperature": self.temperature,
            "reaction_rates": {
                reaction.name: reaction.calculate_rate(self.concentrations, self.temperature)
                for reaction in self.reactions
            }
        }
        
        # Notify hooks
        default_hook_manager.notify_simulation_step(
            self.simulation_id, 
            self.step_number, 
            self.time, 
            state
        )
    
    def _notify_simulation_end(self, results: Dict[str, Any]) -> None:
        """
        Notify visualization hooks that simulation has completed.
        
        Args:
            results: Simulation results
        """
        default_hook_manager.notify_simulation_end(self.simulation_id, results)
    
    def _notify_simulation_error(self, error: Exception) -> None:
        """
        Notify visualization hooks that simulation has encountered an error.
        
        Args:
            error: The error that occurred
        """
        default_hook_manager.notify_simulation_error(self.simulation_id, error)

    async def run_with_progress(self, callback=None):
        """
        Run the simulation with progress tracking and proper timeout handling
        
        Args:
            callback: Optional callback function to report progress
            
        Returns:
            Simulation results
        """
        try:
            # Mark as running
            self.status = "running"
            
            # Initialize progress
            progress = 0
            start_time = time.time()
            last_gc_time = start_time
            
            # Configure optimal chunk size based on simulation complexity
            chunk_size = self._determine_optimal_chunk_size()
            
            # Pre-allocate result arrays (improves memory efficiency)
            self._initialize_result_arrays()
            
            # Run in chunks with timeouts
            total_steps = self.parameters.get('simulation_duration', 100)
            steps_completed = 0
            
            while steps_completed < total_steps:
                # Determine steps to compute in this chunk
                steps_to_compute = min(chunk_size, total_steps - steps_completed)
                
                # Run chunk with timeout protection
                await self._run_simulation_chunk(steps_completed, steps_to_compute)
                
                # Update progress
                steps_completed += steps_to_compute
                progress = steps_completed / total_steps
                
                # Report progress if callback provided
                if callback:
                    await callback(progress)
                    
                # Periodically force garbage collection to prevent memory buildup
                current_time = time.time()
                if current_time - last_gc_time > 10:  # GC every 10 seconds
                    gc.collect()
                    last_gc_time = current_time
                    
                # Check if we should abort
                if self.status == "aborted":
                    logger.info("Simulation aborted by user")
                    break
                    
            # Complete the simulation
            self.status = "completed"
            elapsed = time.time() - start_time
            
            logger.info(f"Simulation completed in {elapsed:.2f} seconds")
            
            # Finalize results
            return self._finalize_results()
            
        except TimeoutError as e:
            self.status = "timeout"
            logger.error(f"Simulation timeout: {str(e)}")
            raise
            
        except Exception as e:
            self.status = "error"
            logger.error(f"Simulation error: {str(e)}\n{traceback.format_exc()}")
            raise
            
        finally:
            # Ensure we clean up resources
            self._cleanup_resources()

    @timeout_aware(timeout=30)  # Lower timeout for individual chunks
    async def _run_simulation_chunk(self, start_step, num_steps):
        """
        Run a chunk of simulation steps with timeout protection
        
        Args:
            start_step: Starting step index
            num_steps: Number of steps to compute
        """
        # Implementation depends on the specific simulation engine
        pass

    def _determine_optimal_chunk_size(self):
        """
        Determine optimal chunk size based on simulation complexity
        
        Returns:
            Number of steps to compute in each chunk
        """
        # Base chunk size
        base_chunk_size = 10
        
        # Adjust based on complexity factors
        complexity = self._estimate_complexity()
        
        if complexity > 0.8:  # Very complex simulation
            return max(1, base_chunk_size // 4)
        elif complexity > 0.5:  # Moderately complex
            return max(2, base_chunk_size // 2)
        else:  # Simple simulation
            return base_chunk_size
        
    def _estimate_complexity(self):
        """
        Estimate simulation complexity based on parameters
        
        Returns:
            Complexity factor between 0-1
        """
        # This is a simplified example - real implementation would be more sophisticated
        complexity = 0.0
        
        # Factor in grid size
        grid_size = self.parameters.get('grid_size', 10)
        if grid_size > 50:
            complexity += 0.4
        elif grid_size > 20:
            complexity += 0.2
        
        # Factor in time step
        time_step = self.parameters.get('time_step', 1.0)
        if time_step < 0.1:
            complexity += 0.3
        elif time_step < 0.5:
            complexity += 0.1
        
        # Factor in material complexity
        material = self.parameters.get('material', 'palladium')
        complex_materials = ['palladium-silver', 'nickel-titanium', 'complex-alloy']
        if material in complex_materials:
            complexity += 0.3
        
        return min(1.0, complexity)

    def _cleanup_resources(self):
        """
        Clean up resources to prevent memory leaks
        """
        # Release large data arrays
        if hasattr(self, 'temp_arrays'):
            del self.temp_arrays
        
        # Force garbage collection
        gc.collect()

    def _initialize_result_arrays(self):
        """
        Pre-allocate result arrays for better performance
        """
        import numpy as np
        
        # Example implementation - actual code would depend on specific simulation needs
        total_steps = self.parameters.get('simulation_duration', 100)
        grid_size = self.parameters.get('grid_size', 10)
        
        # Pre-allocate arrays
        self.results = {
            'temperature': np.zeros((total_steps, grid_size, grid_size, grid_size)),
            'reaction_rate': np.zeros((total_steps, grid_size, grid_size, grid_size)),
            'summary': []
        }

    def _finalize_results(self):
        """
        Finalize and format simulation results
        """
        # Process and return final results
        return {
            'simulation_id': self.simulation_id,
            'status': self.status,
            'results': self.results,
            'metadata': {
                'parameters': self.parameters,
                'completion_time': time.time()
            }
        } 