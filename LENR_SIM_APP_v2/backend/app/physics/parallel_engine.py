"""
Parallel processing engine for compute-intensive physics calculations.

This module provides utilities for parallel processing of computationally
intensive physics calculations using multiprocessing and vectorization.
"""

import numpy as np
from typing import Dict, List, Tuple, Any, Optional, Union, Callable
import multiprocessing as mp
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
import logging
from functools import partial
import time

from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("parallel_engine", "logs/physics.log")

def get_optimal_chunk_size(total_size: int, n_cores: int) -> int:
    """
    Calculate optimal chunk size for parallel processing.
    
    Args:
        total_size: Total size of the data to process
        n_cores: Number of CPU cores to use
        
    Returns:
        Optimal chunk size
    """
    min_chunk = 1000  # Minimum chunk size to avoid overhead
    return max(min_chunk, total_size // (n_cores * 4))

def parallel_map(
    func: Callable,
    data: np.ndarray,
    n_cores: Optional[int] = None,
    chunk_size: Optional[int] = None,
    use_threads: bool = False
) -> np.ndarray:
    """
    Apply a function to data in parallel using either processes or threads.
    
    Args:
        func: Function to apply
        data: Input data array
        n_cores: Number of cores to use (default: CPU count)
        chunk_size: Size of data chunks (default: auto-calculated)
        use_threads: Whether to use threads instead of processes
        
    Returns:
        Array of results
    """
    if n_cores is None:
        n_cores = mp.cpu_count()
    
    if chunk_size is None:
        chunk_size = get_optimal_chunk_size(len(data), n_cores)
    
    # Split data into chunks
    chunks = np.array_split(data, max(1, len(data) // chunk_size))
    
    # Choose executor based on use_threads flag
    executor_class = ThreadPoolExecutor if use_threads else ProcessPoolExecutor
    
    with executor_class(max_workers=n_cores) as executor:
        results = list(executor.map(func, chunks))
    
    return np.concatenate(results)

def parallel_grid_operation(
    func: Callable,
    grid_shape: Tuple[int, ...],
    n_cores: Optional[int] = None,
    **kwargs
) -> np.ndarray:
    """
    Apply a function over a grid in parallel.
    
    Args:
        func: Function to apply at each grid point
        grid_shape: Shape of the grid
        n_cores: Number of cores to use
        **kwargs: Additional arguments for the function
        
    Returns:
        Array of results with same shape as grid
    """
    if n_cores is None:
        n_cores = mp.cpu_count()
    
    # Flatten indices for parallel processing
    indices = np.array(np.ndindex(*grid_shape))
    
    # Create partial function with fixed kwargs
    partial_func = partial(func, **kwargs)
    
    # Process in parallel
    with ProcessPoolExecutor(max_workers=n_cores) as executor:
        results = list(executor.map(partial_func, indices))
    
    # Reshape results back to grid
    return np.array(results).reshape(grid_shape)

def parallel_reaction_rate_calculation(
    calculator: Callable,
    temperature: np.ndarray,
    concentrations: Dict[str, np.ndarray],
    n_cores: Optional[int] = None
) -> np.ndarray:
    """
    Calculate reaction rates in parallel across a 3D grid.
    
    Args:
        calculator: Reaction rate calculator function
        temperature: Temperature grid
        concentrations: Dictionary of concentration grids
        n_cores: Number of cores to use
        
    Returns:
        Array of reaction rates
    """
    def process_point(idx: Tuple[int, ...]) -> float:
        i, j, k = idx
        temp = temperature[i, j, k]
        conc = {name: grid[i, j, k] for name, grid in concentrations.items()}
        return calculator(temp, conc)
    
    return parallel_grid_operation(
        process_point,
        temperature.shape,
        n_cores=n_cores
    )

def parallel_tunneling_calculation(
    calculator: Callable,
    energy_range: np.ndarray,
    n_cores: Optional[int] = None,
    **kwargs
) -> np.ndarray:
    """
    Calculate tunneling probabilities in parallel across energy range.
    
    Args:
        calculator: Tunneling probability calculator function
        energy_range: Array of energies
        n_cores: Number of cores to use
        **kwargs: Additional arguments for calculator
        
    Returns:
        Array of tunneling probabilities
    """
    def process_chunk(energies: np.ndarray) -> np.ndarray:
        return np.array([calculator(e, **kwargs) for e in energies])
    
    return parallel_map(
        process_chunk,
        energy_range,
        n_cores=n_cores
    )

def parallel_force_calculation(
    positions: np.ndarray,
    types: np.ndarray,
    force_func: Callable,
    cutoff: float,
    n_cores: Optional[int] = None
) -> np.ndarray:
    """
    Calculate forces between particles in parallel.
    
    Args:
        positions: Array of particle positions
        types: Array of particle types
        force_func: Function to calculate force between two particles
        cutoff: Cutoff distance for force calculation
        n_cores: Number of cores to use
        
    Returns:
        Array of forces on each particle
    """
    def calculate_forces_for_particle(idx: int) -> np.ndarray:
        force = np.zeros(3)
        pos_i = positions[idx]
        type_i = types[idx]
        
        for j in range(len(positions)):
            if j != idx:
                pos_j = positions[j]
                type_j = types[j]
                
                r_ij = pos_i - pos_j
                dist = np.linalg.norm(r_ij)
                
                if dist < cutoff:
                    force += force_func(r_ij, dist, type_i, type_j)
        
        return force
    
    # Process particles in parallel
    with ProcessPoolExecutor(max_workers=n_cores) as executor:
        forces = list(executor.map(
            calculate_forces_for_particle,
            range(len(positions))
        ))
    
    return np.array(forces)

def parallel_phonon_calculation(
    calculator: Callable,
    phonon_energies: np.ndarray,
    n_cores: Optional[int] = None,
    **kwargs
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Calculate phonon-assisted processes in parallel.
    
    Args:
        calculator: Function to calculate phonon contribution
        phonon_energies: Array of phonon energies
        n_cores: Number of cores to use
        **kwargs: Additional arguments for calculator
        
    Returns:
        Tuple of (absorption_contributions, emission_contributions)
    """
    def process_chunk(energies: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        abs_contribs = np.zeros_like(energies)
        em_contribs = np.zeros_like(energies)
        
        for i, energy in enumerate(energies):
            abs_contribs[i], em_contribs[i] = calculator(energy, **kwargs)
        
        return abs_contribs, em_contribs
    
    # Process in parallel
    with ProcessPoolExecutor(max_workers=n_cores) as executor:
        chunks = np.array_split(phonon_energies, n_cores)
        results = list(executor.map(process_chunk, chunks))
    
    # Combine results
    abs_results = np.concatenate([r[0] for r in results])
    em_results = np.concatenate([r[1] for r in results])
    
    return abs_results, em_results 