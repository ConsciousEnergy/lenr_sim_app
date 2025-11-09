"""
Utility functions for performance benchmarking and analysis.

This module provides tools for measuring execution time, memory usage,
and creating performance visualizations.
"""

import time
import cProfile
import pstats
import memory_profiler
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
import psutil
import os
from typing import Any, Callable, Dict, List, Optional, Tuple, Union
from functools import wraps

def benchmark_function(
    func: Callable,
    args: tuple = (),
    kwargs: dict = None,
    iterations: int = 1000,
    warmup: int = 100
) -> Dict[str, float]:
    """
    Benchmark a function's execution time over multiple iterations.
    
    Args:
        func: Function to benchmark
        args: Positional arguments for the function
        kwargs: Keyword arguments for the function
        iterations: Number of iterations to run
        warmup: Number of warmup iterations
        
    Returns:
        Dict containing timing statistics (mean, std, min, max)
    """
    kwargs = kwargs or {}
    times = []
    
    # Warmup runs
    for _ in range(warmup):
        func(*args, **kwargs)
    
    # Timed runs
    for _ in range(iterations):
        start = time.perf_counter()
        func(*args, **kwargs)
        end = time.perf_counter()
        times.append(end - start)
    
    times = np.array(times)
    return {
        'mean': np.mean(times),
        'std': np.std(times),
        'min': np.min(times),
        'max': np.max(times),
        'median': np.median(times)
    }

def profile_function(
    func: Callable,
    args: tuple = (),
    kwargs: dict = None,
    iterations: int = 1,
    output_file: Optional[str] = None,
    track_memory: bool = False
) -> Union[pstats.Stats, Dict[str, List[float]]]:
    """
    Profile a function's execution using cProfile and optionally memory_profiler.
    
    Args:
        func: Function to profile
        args: Positional arguments for the function
        kwargs: Keyword arguments for the function
        iterations: Number of iterations to profile
        output_file: File to save profiling results
        track_memory: Whether to track memory usage
        
    Returns:
        Profiling statistics or memory usage data
    """
    kwargs = kwargs or {}
    
    if track_memory:
        # Track memory usage
        memory_usage = []
        for _ in range(iterations):
            usage = memory_profiler.memory_usage(
                (func, args, kwargs),
                interval=0.1,
                timeout=None
            )
            memory_usage.append(usage)
        
        return {
            'peak': max(max(usage) for usage in memory_usage),
            'mean': np.mean([np.mean(usage) for usage in memory_usage]),
            'timeline': memory_usage
        }
    else:
        # CPU profiling
        profiler = cProfile.Profile()
        for _ in range(iterations):
            profiler.enable()
            func(*args, **kwargs)
            profiler.disable()
        
        if output_file:
            stats = pstats.Stats(profiler)
            stats.sort_stats('cumulative')
            stats.dump_stats(output_file)
        
        return pstats.Stats(profiler)

def create_scaling_analysis(
    func: Callable,
    param_range: List[Any],
    param_name: str,
    iterations: int = 100,
    warmup: int = 10,
    title: str = "Scaling Analysis",
    save_path: Optional[Path] = None
) -> Dict[Any, Dict[str, float]]:
    """
    Analyze how a function's performance scales with a parameter.
    
    Args:
        func: Function that takes the scaling parameter
        param_range: List of parameter values to test
        param_name: Name of the parameter being varied
        iterations: Number of iterations per parameter value
        warmup: Number of warmup iterations
        title: Plot title
        save_path: Path to save the plot
        
    Returns:
        Dict mapping parameter values to timing statistics
    """
    results = {}
    
    for param in param_range:
        results[param] = benchmark_function(
            func,
            args=(param,),
            iterations=iterations,
            warmup=warmup
        )
    
    # Create scaling plot
    plt.figure(figsize=(10, 6))
    
    means = [results[p]['mean'] for p in param_range]
    stds = [results[p]['std'] for p in param_range]
    
    plt.errorbar(param_range, means, yerr=stds, fmt='o-', capsize=5)
    plt.xlabel(param_name)
    plt.ylabel('Execution Time (s)')
    plt.title(title)
    plt.grid(True)
    
    if save_path:
        plt.savefig(save_path)
        plt.close()
    else:
        plt.show()
    
    return results

def plot_benchmark_comparison(
    results: Dict[str, Dict[str, float]],
    metric: str = 'mean',
    title: str = "Performance Comparison",
    save_path: Optional[Path] = None
) -> None:
    """
    Create a bar plot comparing benchmark results.
    
    Args:
        results: Dict mapping test cases to timing statistics
        metric: Which timing metric to plot ('mean', 'median', etc.)
        title: Plot title
        save_path: Path to save the plot
    """
    plt.figure(figsize=(12, 6))
    
    cases = list(results.keys())
    values = [results[case][metric] for case in cases]
    
    plt.bar(range(len(cases)), values)
    plt.xticks(range(len(cases)), cases, rotation=45, ha='right')
    plt.ylabel(f'Execution Time ({metric})')
    plt.title(title)
    plt.grid(True, axis='y')
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path)
        plt.close()
    else:
        plt.show()

def plot_memory_usage(
    memory_data: Dict[str, Dict[str, Union[float, List[float]]]],
    title: str = "Memory Usage Analysis",
    save_path: Optional[Path] = None
) -> None:
    """
    Create plots analyzing memory usage patterns.
    
    Args:
        memory_data: Dict mapping test cases to memory usage data
        title: Plot title
        save_path: Path to save the plot
    """
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 10))
    
    # Plot peak memory usage
    cases = list(memory_data.keys())
    peaks = [memory_data[case]['peak'] for case in cases]
    
    ax1.bar(range(len(cases)), peaks)
    ax1.set_xticks(range(len(cases)))
    ax1.set_xticklabels(cases, rotation=45, ha='right')
    ax1.set_ylabel('Peak Memory Usage (MB)')
    ax1.set_title('Peak Memory Usage by Test Case')
    ax1.grid(True, axis='y')
    
    # Plot memory timeline for each case
    for case in cases:
        timeline = memory_data[case]['timeline'][0]  # First iteration
        ax2.plot(timeline, label=case)
    
    ax2.set_xlabel('Time Step')
    ax2.set_ylabel('Memory Usage (MB)')
    ax2.set_title('Memory Usage Timeline')
    ax2.grid(True)
    ax2.legend()
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path)
        plt.close()
    else:
        plt.show()

def measure_memory_usage(
    func: Callable,
    args: tuple = (),
    kwargs: dict = None,
    iterations: int = 1
) -> float:
    """
    Measure the peak memory usage of a function.
    
    Args:
        func: Function to measure
        args: Positional arguments for the function
        kwargs: Keyword arguments for the function
        iterations: Number of iterations to run
        
    Returns:
        Peak memory usage in MB
    """
    kwargs = kwargs or {}
    process = psutil.Process(os.getpid())
    peak_memory = 0
    
    for _ in range(iterations):
        # Get baseline memory
        baseline = process.memory_info().rss / 1024 / 1024  # Convert to MB
        
        # Run function
        func(*args, **kwargs)
        
        # Get peak memory
        current = process.memory_info().rss / 1024 / 1024  # Convert to MB
        peak_memory = max(peak_memory, current - baseline)
    
    return peak_memory

def benchmark_decorator(
    iterations: int = 1000,
    warmup: int = 100,
    profile: bool = False,
    track_memory: bool = False
) -> Callable:
    """
    Decorator for benchmarking functions.
    
    Args:
        iterations: Number of iterations to run
        warmup: Number of warmup iterations
        profile: Whether to profile the function
        track_memory: Whether to track memory usage
        
    Returns:
        Decorated function that includes benchmarking
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Tuple[Any, Dict[str, Any]]:
            # Run the actual function
            result = func(*args, **kwargs)
            
            # Collect performance metrics
            metrics = {}
            
            if profile:
                metrics['profile'] = profile_function(
                    func,
                    args=args,
                    kwargs=kwargs,
                    iterations=1
                )
            
            if track_memory:
                metrics['memory'] = profile_function(
                    func,
                    args=args,
                    kwargs=kwargs,
                    iterations=1,
                    track_memory=True
                )
            
            # Always include timing
            metrics['timing'] = benchmark_function(
                func,
                args=args,
                kwargs=kwargs,
                iterations=iterations,
                warmup=warmup
            )
            
            return result, metrics
        
        return wrapper
    
    return decorator 