"""Parallel processing utilities for physics calculations."""
import numpy as np
from numba import jit, prange
from typing import Callable, Dict, List, Tuple, Any

@jit(nopython=True, parallel=True)
def parallel_array_operation(
    func: Callable[[float], float],
    array: np.ndarray,
    *args: Any
) -> np.ndarray:
    """Apply a function to array elements in parallel.
    
    Args:
        func: Function to apply to each element
        array: Input array
        args: Additional arguments for func
        
    Returns:
        Array of results
    """
    result = np.zeros_like(array)
    for i in prange(len(array)):
        result[i] = func(array[i], *args)
    return result

@jit(nopython=True)
def chunked_calculation(
    func: Callable[[np.ndarray], np.ndarray],
    data: np.ndarray,
    chunk_size: int = 1000
) -> np.ndarray:
    """Process large arrays in chunks to manage memory.
    
    Args:
        func: Function to apply to chunks
        data: Input data array
        chunk_size: Size of chunks to process
        
    Returns:
        Processed array
    """
    n_chunks = (len(data) + chunk_size - 1) // chunk_size
    results = []
    
    for i in range(n_chunks):
        start = i * chunk_size
        end = min(start + chunk_size, len(data))
        chunk = data[start:end]
        result = func(chunk)
        results.append(result)
        
    return np.concatenate(results)

@jit(nopython=True, parallel=True)
def parallel_grid_calculation(
    func: Callable[[float, float, float], float],
    x_range: Tuple[float, float],
    y_range: Tuple[float, float],
    z_range: Tuple[float, float],
    n_points: Tuple[int, int, int]
) -> np.ndarray:
    """Calculate function values on a 3D grid in parallel.
    
    Args:
        func: Function to evaluate at grid points
        x_range: (min_x, max_x)
        y_range: (min_y, max_y)
        z_range: (min_z, max_z)
        n_points: (nx, ny, nz) number of points
        
    Returns:
        3D array of function values
    """
    nx, ny, nz = n_points
    x = np.linspace(x_range[0], x_range[1], nx)
    y = np.linspace(y_range[0], y_range[1], ny)
    z = np.linspace(z_range[0], z_range[1], nz)
    
    result = np.zeros((nx, ny, nz))
    
    for i in prange(nx):
        for j in range(ny):
            for k in range(nz):
                result[i,j,k] = func(x[i], y[j], z[k])
                
    return result

def parallel_batch_process(
    func: Callable[[Dict], Dict],
    data_list: List[Dict],
    n_workers: int = -1
) -> List[Dict]:
    """Process a list of data dictionaries in parallel.
    
    Args:
        func: Function to apply to each dictionary
        data_list: List of input dictionaries
        n_workers: Number of worker processes (-1 for CPU count)
        
    Returns:
        List of processed dictionaries
    """
    from multiprocessing import Pool, cpu_count
    
    if n_workers == -1:
        n_workers = cpu_count()
    
    with Pool(n_workers) as pool:
        results = pool.map(func, data_list)
    
    return results 