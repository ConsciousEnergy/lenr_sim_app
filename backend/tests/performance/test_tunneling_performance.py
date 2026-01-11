"""
Performance benchmarks for quantum tunneling calculations.

These tests measure the performance of critical tunneling calculations
to identify bottlenecks and provide baseline metrics for optimization efforts.
"""

import os
import sys
import pytest
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
import multiprocessing

# Add the backend directory to the path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

# Import benchmark utilities
from tests.utils.benchmark_util import (
    benchmark_function, 
    profile_function,
    create_scaling_analysis,
    plot_benchmark_comparison,
    measure_memory_usage
)

# Import physics modules to benchmark
from app.physics.quantum_tunneling import (
    calculate_tunneling_probability,
    calculate_gamow_factor,
    calculate_enhanced_tunneling
)
from app.physics.tunneling_engine import (
    calculate_integrated_tunneling,
    parallel_tunneling_calculation,
    parallel_phonon_calculation
)
from app.physics.integrated_mechanisms import simulate_reaction_at_energy
from app.physics.phonon_modes import (
    calculate_phonon_assisted_tunneling,
    calculate_coherent_phonon_tunneling
)

# Ensure output directory exists
BENCHMARK_OUTPUT_DIR = Path("benchmarks/performance")
os.makedirs(BENCHMARK_OUTPUT_DIR, exist_ok=True)

@pytest.fixture
def simulation_parameters():
    """Return simulation parameters for benchmarking."""
    from app.physics.integrated_mechanisms import IntegratedSimulationParameters
    
    return IntegratedSimulationParameters(
        reaction_name="d-d",
        projectile_z=1,
        projectile_a=2,
        target_z=1,
        target_a=2,
        temperature=300,
        pressure=1e5,
        electric_field=0,
        lattice_constant=4e-10,
        debye_temperature=300,
        loading_ratio=0.8
    )

@pytest.fixture
def lattice_parameters():
    """Return lattice parameters for benchmarking."""
    from app.physics.phonon_modes import LatticeParameters
    
    return LatticeParameters(
        lattice_type="fcc",
        lattice_constant=4e-10,
        debye_temperature=300,
        temperature=300,
        has_loading=True,
        loading_element="H",
        loading_ratio=0.8
    )

@pytest.mark.performance
def test_basic_tunneling_performance():
    """Benchmark basic tunneling probability calculations."""
    # Test parameters
    energy_range = np.linspace(1, 100, 10)  # eV
    potential_barrier = 100.0  # eV
    barrier_width = 1e-10  # m
    
    # Benchmark function with different energies
    results = {}
    for energy in energy_range:
        args = (energy, potential_barrier, barrier_width)
        result_key = f"Energy_{energy:.1f}eV"
        results[result_key] = benchmark_function(
            calculate_tunneling_probability, 
            args=args,
            iterations=1000,
            warmup=100
        )
    
    # Plot results
    plot_benchmark_comparison(
        results, 
        metric='mean',
        title='Tunneling Probability Calculation Performance',
        save_path=BENCHMARK_OUTPUT_DIR / 'basic_tunneling_performance.png'
    )
    
    # Check if performance is within acceptable range
    # We use max time as a simple performance threshold
    max_time = max(result['mean'] for result in results.values())
    assert max_time < 0.001, f"Tunneling calculation too slow: {max_time:.6f}s per call"

@pytest.mark.performance
def test_enhanced_tunneling_scaling():
    """Test how enhanced tunneling calculation performance scales with the number of enhancement factors."""
    
    def create_enhancement_factors(n):
        """Create a dict with n enhancement factors."""
        return {f"factor_{i}": 1.5 for i in range(n)}
    
    # Function to benchmark with varying enhancement factor counts
    def tunneling_with_n_factors(n):
        standard_prob = 1e-20
        factors = create_enhancement_factors(n)
        return calculate_enhanced_tunneling(standard_prob, factors)
    
    # Create scaling analysis
    factor_counts = list(range(1, 21))  # Test with 1 to 20 factors
    
    create_scaling_analysis(
        tunneling_with_n_factors,
        param_range=factor_counts,
        param_name="Number of Enhancement Factors",
        iterations=1000,
        title="Enhanced Tunneling Scaling with Factor Count",
        save_path=BENCHMARK_OUTPUT_DIR / 'enhanced_tunneling_scaling.png'
    )

@pytest.mark.performance
def test_gamow_factor_performance():
    """Profile the Gamow factor calculation performance."""
    import scipy.constants as const
    
    # Test parameters
    z1, z2 = 1, 1
    reduced_mass = const.m_p / 2  # d-d reduced mass
    energy = 10.0  # eV
    
    args = (z1, z2, reduced_mass, energy)
    
    # Run profiling
    profile_function(
        calculate_gamow_factor,
        args=args,
        iterations=10000,
        output_file=str(BENCHMARK_OUTPUT_DIR / 'gamow_factor_profile.prof')
    )
    
    # Benchmark performance
    result = benchmark_function(
        calculate_gamow_factor,
        args=args,
        iterations=10000,
        warmup=1000
    )
    
    print(f"Gamow factor calculation: {result['mean']:.6f}s average")
    assert result['mean'] < 0.0001, f"Gamow factor calculation too slow: {result['mean']:.6f}s"

@pytest.mark.performance
@pytest.mark.slow
def test_phonon_assisted_tunneling_performance(lattice_parameters):
    """Benchmark phonon-assisted tunneling calculations."""
    
    # Test parameters
    incident_energy_range = np.logspace(-1, 2, 5)  # 0.1 to 100 eV
    barrier_height = 100.0  # eV
    barrier_width = 1e-10  # m
    
    # Benchmark function with different energies
    results = {}
    for energy in incident_energy_range:
        args = (
            lattice_parameters,
            energy,
            barrier_height,
            barrier_width
        )
        result_key = f"Energy_{energy:.2e}eV"
        results[result_key] = benchmark_function(
            calculate_phonon_assisted_tunneling,
            args=args,
            iterations=10,  # Reduced iterations as this is more expensive
            warmup=2
        )
    
    # Plot results
    plot_benchmark_comparison(
        results,
        metric='mean',
        title='Phonon-Assisted Tunneling Performance',
        save_path=BENCHMARK_OUTPUT_DIR / 'phonon_tunneling_performance.png'
    )

@pytest.mark.performance
@pytest.mark.slow
def test_integrated_simulation_performance(simulation_parameters):
    """Profile the performance of the integrated simulation."""
    
    # Create different energy levels to test
    energy_levels = np.logspace(-2, 2, 5)  # 0.01 to 100 eV
    
    # Benchmark results for each energy
    results = {}
    for energy in energy_levels:
        args = (simulation_parameters, energy)
        result_key = f"Energy_{energy:.2e}eV"
        results[result_key] = benchmark_function(
            simulate_reaction_at_energy,
            args=args,
            iterations=5,  # Reduced as this is the most expensive calculation
            warmup=1
        )
    
    # Plot results
    plot_benchmark_comparison(
        results,
        metric='mean', 
        title='Integrated Simulation Performance by Energy',
        save_path=BENCHMARK_OUTPUT_DIR / 'integrated_simulation_performance.png'
    )
    
    # Run detailed profile on one representative case
    profile_function(
        simulate_reaction_at_energy,
        args=(simulation_parameters, 1.0),  # 1 eV case
        output_file=str(BENCHMARK_OUTPUT_DIR / 'integrated_simulation_profile.prof')
    )

@pytest.mark.performance
def test_parallel_tunneling_scaling():
    """Test how parallel tunneling calculation performance scales with input size and CPU cores."""
    
    # Test parameters
    energy_ranges = [
        np.linspace(1, 100, size) 
        for size in [100, 1000, 10000]
    ]
    max_cores = multiprocessing.cpu_count()
    core_counts = list(range(1, max_cores + 1))
    
    # Results dictionary
    results = {}
    
    # Test scaling with input size
    for energies in energy_ranges:
        size = len(energies)
        barrier_params = {
            'height': 100.0,  # eV
            'width': 1e-10,   # m
            'mass': 3.3435837724e-27  # kg (deuteron mass)
        }
        
        args = (calculate_tunneling_probability, energies, barrier_params)
        result_key = f"Size_{size}"
        results[result_key] = benchmark_function(
            parallel_tunneling_calculation,
            args=args,
            iterations=5,
            warmup=1
        )
        
        # Also measure memory usage
        mem_usage = measure_memory_usage(
            parallel_tunneling_calculation,
            args=args
        )
        results[f"{result_key}_memory"] = mem_usage
    
    # Plot input size scaling results
    plot_benchmark_comparison(
        {k: v for k, v in results.items() if 'memory' not in k},
        metric='mean',
        title='Parallel Tunneling Scaling with Input Size',
        save_path=BENCHMARK_OUTPUT_DIR / 'parallel_tunneling_input_scaling.png'
    )
    
    # Plot memory usage
    memory_results = {k: v for k, v in results.items() if 'memory' in k}
    plt.figure(figsize=(10, 6))
    sizes = [100, 1000, 10000]
    memories = [memory_results[f"Size_{s}_memory"] for s in sizes]
    plt.plot(sizes, memories, marker='o')
    plt.xlabel('Input Size')
    plt.ylabel('Memory Usage (MB)')
    plt.title('Memory Usage vs Input Size')
    plt.savefig(BENCHMARK_OUTPUT_DIR / 'parallel_tunneling_memory.png')
    plt.close()
    
    # Test scaling with number of cores
    test_size = 10000
    energies = np.linspace(1, 100, test_size)
    core_results = {}
    
    for cores in core_counts:
        os.environ['OPENBLAS_NUM_THREADS'] = str(cores)
        os.environ['MKL_NUM_THREADS'] = str(cores)
        
        args = (calculate_tunneling_probability, energies, barrier_params)
        result_key = f"Cores_{cores}"
        core_results[result_key] = benchmark_function(
            parallel_tunneling_calculation,
            args=args,
            iterations=5,
            warmup=1
        )
    
    # Plot core scaling results
    plot_benchmark_comparison(
        core_results,
        metric='mean',
        title='Parallel Tunneling Scaling with CPU Cores',
        save_path=BENCHMARK_OUTPUT_DIR / 'parallel_tunneling_core_scaling.png'
    )
    
    # Calculate speedup and efficiency
    base_time = core_results['Cores_1']['mean']
    speedups = []
    efficiencies = []
    
    for cores in core_counts:
        time = core_results[f'Cores_{cores}']['mean']
        speedup = base_time / time
        efficiency = speedup / cores
        speedups.append(speedup)
        efficiencies.append(efficiency)
    
    # Plot speedup and efficiency
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
    
    ax1.plot(core_counts, speedups, marker='o')
    ax1.plot(core_counts, core_counts, '--', label='Linear Speedup')
    ax1.set_xlabel('Number of Cores')
    ax1.set_ylabel('Speedup')
    ax1.set_title('Parallel Speedup')
    ax1.legend()
    
    ax2.plot(core_counts, efficiencies, marker='o')
    ax2.set_xlabel('Number of Cores')
    ax2.set_ylabel('Efficiency')
    ax2.set_title('Parallel Efficiency')
    
    plt.tight_layout()
    plt.savefig(BENCHMARK_OUTPUT_DIR / 'parallel_tunneling_metrics.png')
    plt.close()

@pytest.mark.performance
def test_parallel_phonon_performance(lattice_parameters):
    """Benchmark parallel phonon-assisted tunneling calculations."""
    
    # Test parameters
    energy_range = np.logspace(-1, 2, 1000)  # 0.1 to 100 eV
    phonon_modes = [
        {'energy': 0.1, 'coupling': 0.01},
        {'energy': 0.2, 'coupling': 0.02},
        {'energy': 0.3, 'coupling': 0.015}
    ]
    barrier_params = {
        'height': 100.0,  # eV
        'width': 1e-10,   # m
        'mass': 3.3435837724e-27  # kg (deuteron mass)
    }
    
    # Benchmark parallel vs sequential calculation
    args_parallel = (calculate_phonon_assisted_tunneling, energy_range, phonon_modes, barrier_params)
    result_parallel = benchmark_function(
        parallel_phonon_calculation,
        args=args_parallel,
        iterations=5,
        warmup=1
    )
    
    # Sequential calculation for comparison
    def sequential_calculation(energy_range, phonon_modes, barrier_params):
        results = []
        for energy in energy_range:
            total = 0
            for mode in phonon_modes:
                prob = calculate_phonon_assisted_tunneling(
                    energy, mode, barrier_params
                )
                total += prob
            results.append(total)
        return np.array(results)
    
    args_sequential = (energy_range, phonon_modes, barrier_params)
    result_sequential = benchmark_function(
        sequential_calculation,
        args=args_sequential,
        iterations=5,
        warmup=1
    )
    
    # Compare and plot results
    comparison = {
        'Parallel': result_parallel,
        'Sequential': result_sequential
    }
    
    plot_benchmark_comparison(
        comparison,
        metric='mean',
        title='Parallel vs Sequential Phonon-Assisted Tunneling',
        save_path=BENCHMARK_OUTPUT_DIR / 'parallel_phonon_comparison.png'
    )
    
    # Calculate and print speedup
    speedup = result_sequential['mean'] / result_parallel['mean']
    print(f"Parallel phonon calculation speedup: {speedup:.2f}x")
    
    # Memory usage comparison
    mem_parallel = measure_memory_usage(parallel_phonon_calculation, args=args_parallel)
    mem_sequential = measure_memory_usage(sequential_calculation, args=args_sequential)
    
    plt.figure(figsize=(8, 6))
    plt.bar(['Parallel', 'Sequential'], [mem_parallel, mem_sequential])
    plt.ylabel('Memory Usage (MB)')
    plt.title('Memory Usage Comparison')
    plt.savefig(BENCHMARK_OUTPUT_DIR / 'parallel_phonon_memory.png')
    plt.close()

if __name__ == "__main__":
    # This allows running just this test file directly
    pytest.main(["-v", __file__]) 