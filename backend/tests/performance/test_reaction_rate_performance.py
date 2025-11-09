"""
Performance benchmarks for reaction rate calculations.

These tests measure the performance of fusion reaction rate calculations
under various conditions and with different enhancement mechanisms.
"""

import os
import sys
import pytest
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
from typing import Dict, Any, List

# Add the backend directory to the path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

# Import benchmark utilities
from tests.utils.benchmark_util import (
    benchmark_function,
    profile_function,
    create_scaling_analysis,
    plot_benchmark_comparison,
    plot_memory_usage
)

# Import physics modules to benchmark
from app.physics.reaction_rates import (
    calculate_fusion_rate,
    calculate_cross_section,
    calculate_maxwell_boltzmann_average
)
from app.physics.enhancement_factors import (
    calculate_electron_screening,
    calculate_lattice_effects,
    calculate_coherent_effects
)
from app.physics.integrated_mechanisms import simulate_reaction_chain

# Ensure output directory exists
BENCHMARK_OUTPUT_DIR = Path("benchmarks/performance/reaction_rates")
os.makedirs(BENCHMARK_OUTPUT_DIR, exist_ok=True)

@pytest.fixture
def reaction_parameters():
    """Return standard reaction parameters for benchmarking."""
    return {
        "reaction_name": "d-d",
        "temperature": 300.0,  # K
        "density": 1e22,      # cm^-3
        "pressure": 1e5,      # Pa
        "enhancement_factors": {
            "electron_screening": True,
            "lattice_effects": True,
            "coherent_effects": True
        }
    }

@pytest.mark.performance
def test_cross_section_calculation_performance():
    """Benchmark cross-section calculation performance."""
    # Test parameters
    energy_range = np.logspace(-2, 3, 20)  # 0.01 to 1000 eV
    reactions = ["d-d", "d-t", "d-he3"]
    
    results = {}
    for reaction in reactions:
        for energy in energy_range:
            args = (reaction, energy)
            result_key = f"{reaction}_{energy:.2e}eV"
            results[result_key] = benchmark_function(
                calculate_cross_section,
                args=args,
                iterations=1000,
                warmup=100
            )
    
    # Plot results
    plot_benchmark_comparison(
        results,
        metric='mean',
        title='Cross Section Calculation Performance',
        save_path=BENCHMARK_OUTPUT_DIR / 'cross_section_performance.png'
    )
    
    # Performance threshold check
    max_time = max(result['mean'] for result in results.values())
    assert max_time < 0.001, f"Cross section calculation too slow: {max_time:.6f}s per call"

@pytest.mark.performance
def test_maxwell_boltzmann_scaling():
    """Test how Maxwell-Boltzmann averaging performance scales with integration points."""
    
    def mb_average_with_n_points(n_points):
        """Calculate MB average with n integration points."""
        energy_range = np.logspace(-2, 2, n_points)
        temperature = 300.0
        return calculate_maxwell_boltzmann_average(energy_range, temperature)
    
    # Test scaling from 10 to 1000 points
    point_counts = [10, 20, 50, 100, 200, 500, 1000]
    
    create_scaling_analysis(
        mb_average_with_n_points,
        param_range=point_counts,
        param_name="Number of Integration Points",
        iterations=100,
        title="Maxwell-Boltzmann Average Scaling",
        save_path=BENCHMARK_OUTPUT_DIR / 'mb_average_scaling.png'
    )

@pytest.mark.performance
def test_enhancement_factor_performance():
    """Profile the performance of enhancement factor calculations."""
    # Test parameters
    temperature = 300.0
    density = 1e22
    pressure = 1e5
    
    # Benchmark individual enhancement mechanisms
    mechanisms = {
        "electron_screening": calculate_electron_screening,
        "lattice_effects": calculate_lattice_effects,
        "coherent_effects": calculate_coherent_effects
    }
    
    results = {}
    for name, func in mechanisms.items():
        args = (temperature, density, pressure)
        results[name] = benchmark_function(
            func,
            args=args,
            iterations=1000,
            warmup=100
        )
        
        # Profile the function
        profile_function(
            func,
            args=args,
            iterations=1000,
            output_file=str(BENCHMARK_OUTPUT_DIR / f'{name}_profile.prof')
        )
    
    # Plot comparison
    plot_benchmark_comparison(
        results,
        metric='mean',
        title='Enhancement Factor Calculation Performance',
        save_path=BENCHMARK_OUTPUT_DIR / 'enhancement_factors_performance.png'
    )

@pytest.mark.performance
@pytest.mark.slow
def test_reaction_chain_performance(reaction_parameters):
    """Test the performance of full reaction chain calculations."""
    # Test with different numbers of reaction steps
    step_counts = [1, 2, 3, 4, 5]
    
    results = {}
    memory_usage = {}
    
    for steps in step_counts:
        # Modify parameters for different chain lengths
        params = reaction_parameters.copy()
        params["chain_length"] = steps
        
        args = (params,)
        result_key = f"Steps_{steps}"
        
        # Benchmark execution time
        results[result_key] = benchmark_function(
            simulate_reaction_chain,
            args=args,
            iterations=5,
            warmup=1
        )
        
        # Monitor memory usage
        memory_usage[result_key] = profile_function(
            simulate_reaction_chain,
            args=args,
            iterations=1,
            track_memory=True
        )
    
    # Plot time performance
    plot_benchmark_comparison(
        results,
        metric='mean',
        title='Reaction Chain Calculation Performance',
        save_path=BENCHMARK_OUTPUT_DIR / 'reaction_chain_performance.png'
    )
    
    # Plot memory usage
    plot_memory_usage(
        memory_usage,
        title='Reaction Chain Memory Usage',
        save_path=BENCHMARK_OUTPUT_DIR / 'reaction_chain_memory.png'
    )

@pytest.mark.performance
def test_parallel_scaling():
    """Test how calculations scale with parallel processing."""
    from app.physics.parallel import parallel_reaction_simulation
    
    # Test parameters
    core_counts = [1, 2, 4, 8]  # Test with different numbers of cores
    problem_sizes = [100, 1000, 10000]  # Different workload sizes
    
    results = {}
    
    for size in problem_sizes:
        for cores in core_counts:
            params = {
                "size": size,
                "n_cores": cores,
                "reaction": "d-d",
                "temperature": 300.0
            }
            
            result_key = f"Size_{size}_Cores_{cores}"
            results[result_key] = benchmark_function(
                parallel_reaction_simulation,
                args=(params,),
                iterations=3,
                warmup=1
            )
    
    # Plot scaling results
    for size in problem_sizes:
        size_results = {k: v for k, v in results.items() if f"Size_{size}" in k}
        plot_benchmark_comparison(
            size_results,
            metric='mean',
            title=f'Parallel Scaling (Problem Size {size})',
            save_path=BENCHMARK_OUTPUT_DIR / f'parallel_scaling_size_{size}.png'
        )

@pytest.mark.performance
def test_optimization_strategies():
    """Test different optimization strategies for reaction calculations."""
    from app.physics.optimizations import (
        calculate_rate_basic,
        calculate_rate_vectorized,
        calculate_rate_cached,
        calculate_rate_approximated
    )
    
    # Test parameters
    test_cases = [
        {"temperature": 300.0, "density": 1e20},
        {"temperature": 1000.0, "density": 1e21},
        {"temperature": 5000.0, "density": 1e22}
    ]
    
    implementations = {
        "basic": calculate_rate_basic,
        "vectorized": calculate_rate_vectorized,
        "cached": calculate_rate_cached,
        "approximated": calculate_rate_approximated
    }
    
    results = {}
    
    for case_idx, params in enumerate(test_cases):
        for name, func in implementations.items():
            result_key = f"Case{case_idx+1}_{name}"
            results[result_key] = benchmark_function(
                func,
                args=(params,),
                iterations=1000,
                warmup=100
            )
    
    # Plot comparison
    plot_benchmark_comparison(
        results,
        metric='mean',
        title='Optimization Strategy Comparison',
        save_path=BENCHMARK_OUTPUT_DIR / 'optimization_comparison.png'
    )
    
    # Verify accuracy of optimized implementations
    for params in test_cases:
        base_result = calculate_rate_basic(params)
        for name, func in implementations.items():
            if name != "basic":
                optimized_result = func(params)
                relative_error = abs(optimized_result - base_result) / base_result
                assert relative_error < 0.01, f"{name} implementation error too large: {relative_error:.2%}"

if __name__ == "__main__":
    pytest.main(["-v", __file__]) 