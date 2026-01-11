"""
Parallel processing utilities for optimizing computation-intensive tasks.

This module provides tools for parallelizing calculations across multiple
cores and processes to improve performance of physics simulations.
"""

import os
import math
import logging
import concurrent.futures
from typing import Callable, List, Dict, Any, TypeVar, Generic, Iterable, Optional, Tuple, Union
import multiprocessing
import numpy as np
from functools import partial

# Type variables for generic functions
T = TypeVar('T')  # Input type
R = TypeVar('R')  # Result type

# Setup logging
logger = logging.getLogger(__name__)

def get_optimal_chunk_size(total_items: int, min_chunk_size: int = 100) -> int:
    """Calculate optimal chunk size for parallel processing.
    
    Args:
        total_items: Total number of items to process
        min_chunk_size: Minimum chunk size to avoid excessive overhead
        
    Returns:
        Optimal chunk size based on CPU count and item count
    """
    cpu_count = multiprocessing.cpu_count()
    
    # Special case for small workloads
    if total_items <= min_chunk_size * 2:
        return total_items
    
    # Calculate chunk size based on CPU count
    chunk_size = max(min_chunk_size, total_items // (cpu_count * 2))
    
    return chunk_size

def parallel_map(
    func: Callable[[T], R], 
    items: List[T], 
    max_workers: Optional[int] = None,
    chunk_size: Optional[int] = None,
    use_processes: bool = False,
    show_progress: bool = False
) -> List[R]:
    """Execute a function across multiple items in parallel.
    
    Args:
        func: Function to execute on each item
        items: List of items to process
        max_workers: Maximum number of worker threads/processes (default: CPU count)
        chunk_size: Size of chunks for task distribution (default: auto-calculated)
        use_processes: If True, use ProcessPoolExecutor, otherwise ThreadPoolExecutor
        show_progress: If True, log progress during execution
        
    Returns:
        List of results in the same order as input items
    """
    if not items:
        return []
    
    if max_workers is None:
        max_workers = multiprocessing.cpu_count()
    
    if chunk_size is None:
        chunk_size = get_optimal_chunk_size(len(items))
    
    # Create chunks
    chunks = [items[i:i+chunk_size] for i in range(0, len(items), chunk_size)]
    
    # Function to process a chunk of items
    def process_chunk(chunk):
        return [func(item) for item in chunk]
    
    # Choose executor based on use_processes flag
    executor_class = (
        concurrent.futures.ProcessPoolExecutor if use_processes
        else concurrent.futures.ThreadPoolExecutor
    )
    
    # Process chunks in parallel
    results = []
    with executor_class(max_workers=max_workers) as executor:
        futures = [executor.submit(process_chunk, chunk) for chunk in chunks]
        
        # Process results as they complete
        for i, future in enumerate(concurrent.futures.as_completed(futures)):
            if show_progress:
                logger.info(f"Completed chunk {i+1}/{len(chunks)}")
            try:
                chunk_results = future.result()
                results.extend(chunk_results)
            except Exception as e:
                logger.error(f"Error processing chunk: {e}")
                raise
    
    # Ensure results are in the same order as input
    item_indices = {id(item): idx for idx, item in enumerate(items)}
    results_with_indices = [(item_indices.get(id(result), i), result) for i, result in enumerate(results)]
    return [result for _, result in sorted(results_with_indices)]

def parallel_numpy_operation(
    func: Callable[[np.ndarray], np.ndarray],
    array: np.ndarray,
    axis: int = 0,
    max_workers: Optional[int] = None,
    use_processes: bool = False
) -> np.ndarray:
    """Apply a function to a NumPy array in parallel along a specified axis.
    
    Args:
        func: Function to apply to each slice of the array
        array: Input NumPy array
        axis: Axis along which to apply the function
        max_workers: Maximum number of worker threads/processes
        use_processes: If True, use ProcessPoolExecutor
        
    Returns:
        NumPy array with the function applied
    """
    if max_workers is None:
        max_workers = multiprocessing.cpu_count()
    
    # Create slices along the specified axis
    slices = [np.take(array, i, axis=axis) for i in range(array.shape[axis])]
    
    # Process slices in parallel
    processed_slices = parallel_map(
        func,
        slices,
        max_workers=max_workers,
        use_processes=use_processes
    )
    
    # Combine results along the original axis
    return np.stack(processed_slices, axis=axis)

def parallel_parameter_sweep(
    func: Callable[..., R],
    param_grid: Dict[str, List[Any]],
    fixed_params: Dict[str, Any] = None,
    max_workers: Optional[int] = None,
    use_processes: bool = True,
    show_progress: bool = True
) -> List[Tuple[Dict[str, Any], R]]:
    """Run a parameter sweep in parallel.
    
    Args:
        func: Function to evaluate
        param_grid: Dictionary of parameter names to lists of values
        fixed_params: Dictionary of fixed parameters to pass to the function
        max_workers: Maximum number of worker threads/processes
        use_processes: If True, use ProcessPoolExecutor
        show_progress: If True, log progress
        
    Returns:
        List of (parameters, result) tuples
    """
    if fixed_params is None:
        fixed_params = {}
    
    # Generate all parameter combinations
    import itertools
    param_names = list(param_grid.keys())
    param_values = list(itertools.product(*(param_grid[name] for name in param_names)))
    
    # Create parameter dictionaries for each combination
    param_dicts = []
    for values in param_values:
        param_dict = {**fixed_params}
        for name, value in zip(param_names, values):
            param_dict[name] = value
        param_dicts.append(param_dict)
    
    # Function to evaluate a single parameter set
    def evaluate_params(params):
        try:
            result = func(**params)
            return params, result
        except Exception as e:
            logger.error(f"Error evaluating parameters {params}: {e}")
            raise
    
    # Run evaluations in parallel
    results = parallel_map(
        evaluate_params,
        param_dicts,
        max_workers=max_workers,
        use_processes=use_processes,
        show_progress=show_progress
    )
    
    return results

class TaskManager:
    """Manager for parallelized task execution with dependency tracking."""
    
    def __init__(self, max_workers: Optional[int] = None, use_processes: bool = False):
        """Initialize the task manager.
        
        Args:
            max_workers: Maximum number of worker threads/processes
            use_processes: If True, use ProcessPoolExecutor
        """
        self.max_workers = max_workers or multiprocessing.cpu_count()
        self.use_processes = use_processes
        self.results = {}
        self.tasks = {}
        self.dependencies = {}
    
    def add_task(
        self, 
        task_id: str, 
        func: Callable[..., R], 
        args: tuple = (), 
        kwargs: dict = None, 
        dependencies: List[str] = None
    ) -> None:
        """Add a task to the execution queue.
        
        Args:
            task_id: Unique identifier for the task
            func: Function to execute
            args: Positional arguments
            kwargs: Keyword arguments
            dependencies: List of task IDs that must complete before this task
        """
        if kwargs is None:
            kwargs = {}
        
        if dependencies is None:
            dependencies = []
        
        self.tasks[task_id] = (func, args, kwargs)
        self.dependencies[task_id] = dependencies
    
    def execute(self) -> Dict[str, Any]:
        """Execute all tasks respecting dependencies.
        
        Returns:
            Dictionary mapping task IDs to results
        """
        # Find tasks with no dependencies
        ready_tasks = {
            task_id: (func, args, kwargs)
            for task_id, (func, args, kwargs) in self.tasks.items()
            if not self.dependencies[task_id]
        }
        
        # Keep track of remaining tasks
        remaining_tasks = {
            task_id: (func, args, kwargs)
            for task_id, (func, args, kwargs) in self.tasks.items()
            if task_id not in ready_tasks
        }
        
        # Execute tasks in dependency order
        while ready_tasks:
            # Execute all ready tasks in parallel
            with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                futures = {
                    executor.submit(func, *args, **kwargs): task_id
                    for task_id, (func, args, kwargs) in ready_tasks.items()
                }
                
                # Process results
                for future in concurrent.futures.as_completed(futures):
                    task_id = futures[future]
                    try:
                        result = future.result()
                        self.results[task_id] = result
                    except Exception as e:
                        logger.error(f"Error executing task {task_id}: {e}")
                        self.results[task_id] = e
            
            # Find next set of ready tasks
            completed_task_ids = set(ready_tasks.keys())
            ready_tasks = {}
            
            remaining_task_ids = list(remaining_tasks.keys())
            for task_id in remaining_task_ids:
                dependencies = self.dependencies[task_id]
                if all(dep in self.results for dep in dependencies):
                    ready_tasks[task_id] = remaining_tasks.pop(task_id)
        
        return self.results

# Memoization with parallel computation support
def parallel_memoize(func: Callable[..., R]) -> Callable[..., R]:
    """Decorator for memoizing function results with parallel computation support.
    
    This is particularly useful for expensive physics calculations that are
    called multiple times with the same parameters.
    
    Args:
        func: Function to memoize
        
    Returns:
        Memoized function
    """
    cache = {}
    lock = multiprocessing.RLock()  # Thread-safe and process-safe lock
    
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        # Create a cache key from arguments
        key_args = args
        key_kwargs = frozenset(sorted(kwargs.items()))
        cache_key = hash((key_args, key_kwargs))
        
        # Check cache with lock to avoid race conditions
        with lock:
            if cache_key in cache:
                return cache[cache_key]
        
        # Compute result and update cache
        result = func(*args, **kwargs)
        
        with lock:
            cache[cache_key] = result
        
        return result
    
    # Add method to clear cache
    def clear_cache():
        with lock:
            cache.clear()
    
    wrapper.clear_cache = clear_cache
    
    return wrapper 