"""
Performance benchmarks for Redis caching implementation.

This module contains benchmarks to measure the performance improvements 
achieved by different caching strategies, focusing on Redis-based caching
for simulation data.
"""

import pytest
import os
import sys
import time
import random
import uuid
import asyncio
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple

# Add the project root to path so we can import from backend
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# Import the benchmark utilities
from tests.utils.benchmark_util import (
    async_benchmark, 
    benchmark_concurrent,
    plot_benchmark_comparison,
    create_scaling_analysis,
    BENCHMARK_OUTPUT_DIR
)

# Create a specific output directory for caching benchmarks
CACHE_BENCHMARK_DIR = BENCHMARK_OUTPUT_DIR / "caching"
os.makedirs(CACHE_BENCHMARK_DIR, exist_ok=True)


class MockRedis:
    """Mock Redis implementation for benchmarking."""
    
    def __init__(self, latency_ms: float = 5.0):
        """
        Initialize mock Redis.
        
        Args:
            latency_ms: Simulated network latency in milliseconds
        """
        self.store = {}
        self.latency = latency_ms / 1000  # Convert to seconds
    
    async def get(self, key: str) -> Optional[bytes]:
        """Simulate Redis get operation with network latency."""
        await asyncio.sleep(self.latency)
        return self.store.get(key)
    
    async def set(self, key: str, value: bytes, ex: Optional[int] = None) -> bool:
        """Simulate Redis set operation with network latency."""
        await asyncio.sleep(self.latency)
        self.store[key] = value
        return True
    
    async def delete(self, key: str) -> int:
        """Simulate Redis delete operation with network latency."""
        await asyncio.sleep(self.latency)
        if key in self.store:
            del self.store[key]
            return 1
        return 0
    
    async def exists(self, key: str) -> int:
        """Simulate Redis exists operation with network latency."""
        await asyncio.sleep(self.latency)
        return 1 if key in self.store else 0
    
    async def expire(self, key: str, time_seconds: int) -> int:
        """Simulate Redis expire operation with network latency."""
        await asyncio.sleep(self.latency)
        # In a real implementation, we would set expiry
        # Here we just check if the key exists
        return 1 if key in self.store else 0
    
    async def keys(self, pattern: str) -> List[bytes]:
        """Simulate Redis keys operation with network latency."""
        await asyncio.sleep(self.latency)
        # Simple pattern matching (only supports *)
        if pattern == "*":
            return list(self.store.keys())
        
        pattern = pattern.replace("*", "")
        return [k for k in self.store.keys() if pattern in k]


class MockDB:
    """Mock database for benchmarking."""
    
    def __init__(self, query_latency_ms: float = 20.0):
        """
        Initialize mock database.
        
        Args:
            query_latency_ms: Simulated query latency in milliseconds
        """
        self.simulations = {}
        self.results = {}
        self.query_latency = query_latency_ms / 1000  # Convert to seconds
    
    async def get_simulation(self, simulation_id: str) -> Optional[Dict[str, Any]]:
        """Simulate fetching a simulation with database latency."""
        await asyncio.sleep(self.query_latency)
        return self.simulations.get(simulation_id)
    
    async def get_simulation_results(self, simulation_id: str) -> Optional[Dict[str, Any]]:
        """Simulate fetching simulation results with database latency."""
        await asyncio.sleep(self.query_latency)
        return self.results.get(simulation_id)
    
    async def create_simulation(self, simulation_data: Dict[str, Any]) -> str:
        """Simulate creating a simulation with database latency."""
        await asyncio.sleep(self.query_latency)
        simulation_id = str(uuid.uuid4())
        self.simulations[simulation_id] = simulation_data
        return simulation_id
    
    async def create_simulation_results(self, simulation_id: str, results_data: Dict[str, Any]) -> bool:
        """Simulate creating simulation results with database latency."""
        await asyncio.sleep(self.query_latency)
        self.results[simulation_id] = results_data
        return True


class SimulationService:
    """Simulation service with optional caching."""
    
    def __init__(self, db: MockDB, redis: Optional[MockRedis] = None, cache_ttl: int = 3600):
        """
        Initialize simulation service.
        
        Args:
            db: Mock database instance
            redis: Optional mock Redis instance for caching
            cache_ttl: Cache TTL in seconds
        """
        self.db = db
        self.redis = redis
        self.cache_ttl = cache_ttl
        self.cache_hits = 0
        self.cache_misses = 0
    
    async def get_simulation(self, simulation_id: str) -> Optional[Dict[str, Any]]:
        """
        Get simulation by ID.
        
        If Redis is available, try to get from cache first.
        If not in cache, get from DB and cache the result.
        
        Args:
            simulation_id: Simulation ID
        
        Returns:
            Simulation data or None if not found
        """
        # If no Redis, directly fetch from DB
        if not self.redis:
            return await self.db.get_simulation(simulation_id)
        
        # Try to get from cache
        cache_key = f"simulation:{simulation_id}"
        cached_data = await self.redis.get(cache_key)
        
        if cached_data:
            self.cache_hits += 1
            # In a real implementation, we would deserialize the data
            # For this mock, we'll assume it's already in the right format
            return self.simulations[simulation_id]
        
        self.cache_misses += 1
        
        # If not in cache, get from DB
        simulation = await self.db.get_simulation(simulation_id)
        
        if simulation:
            # Cache the result
            # In a real implementation, we would serialize the data
            await self.redis.set(
                cache_key, 
                str(simulation).encode(), 
                ex=self.cache_ttl
            )
        
        return simulation
    
    async def get_simulation_results(self, simulation_id: str) -> Optional[Dict[str, Any]]:
        """
        Get simulation results by simulation ID.
        
        If Redis is available, try to get from cache first.
        If not in cache, get from DB and cache the result.
        
        Args:
            simulation_id: Simulation ID
        
        Returns:
            Simulation results data or None if not found
        """
        # If no Redis, directly fetch from DB
        if not self.redis:
            return await self.db.get_simulation_results(simulation_id)
        
        # Try to get from cache
        cache_key = f"results:{simulation_id}"
        cached_data = await self.redis.get(cache_key)
        
        if cached_data:
            self.cache_hits += 1
            # In a real implementation, we would deserialize the data
            return self.results[simulation_id]
        
        self.cache_misses += 1
        
        # If not in cache, get from DB
        results = await self.db.get_simulation_results(simulation_id)
        
        if results:
            # Cache the result
            # In a real implementation, we would serialize the data
            await self.redis.set(
                cache_key, 
                str(results).encode(), 
                ex=self.cache_ttl
            )
        
        return results
    
    async def create_simulation(self, simulation_data: Dict[str, Any]) -> str:
        """
        Create a new simulation.
        
        Args:
            simulation_data: Simulation data to create
        
        Returns:
            ID of created simulation
        """
        simulation_id = await self.db.create_simulation(simulation_data)
        
        # Store in simulations for mock retrieval
        self.simulations[simulation_id] = simulation_data
        
        return simulation_id
    
    async def create_simulation_results(self, simulation_id: str, results_data: Dict[str, Any]) -> bool:
        """
        Create simulation results.
        
        Args:
            simulation_id: Simulation ID
            results_data: Results data to create
        
        Returns:
            True if creation successful
        """
        success = await self.db.create_simulation_results(simulation_id, results_data)
        
        # Store in results for mock retrieval
        if success:
            self.results[simulation_id] = results_data
            
            # Invalidate any cached results if Redis is available
            if self.redis:
                await self.redis.delete(f"results:{simulation_id}")
        
        return success
    
    def get_cache_hit_ratio(self) -> float:
        """Get the cache hit ratio."""
        total = self.cache_hits + self.cache_misses
        if total == 0:
            return 0.0
        return self.cache_hits / total
    
    async def invalidate_cache(self, simulation_id: str) -> None:
        """
        Invalidate cache for a simulation and its results.
        
        Args:
            simulation_id: Simulation ID to invalidate cache for
        """
        if not self.redis:
            return
        
        await self.redis.delete(f"simulation:{simulation_id}")
        await self.redis.delete(f"results:{simulation_id}")


@pytest.fixture
def mock_db():
    """Create a mock database with default latency."""
    return MockDB(query_latency_ms=20.0)


@pytest.fixture
def mock_redis():
    """Create a mock Redis with default latency."""
    return MockRedis(latency_ms=5.0)


@pytest.fixture
def service_with_cache(mock_db, mock_redis):
    """Create a simulation service with cache."""
    service = SimulationService(mock_db, mock_redis)
    
    # Create sample data
    service.simulations = {
        "sim1": {"id": "sim1", "name": "Test Simulation 1", "params": {"temp": 300}},
        "sim2": {"id": "sim2", "name": "Test Simulation 2", "params": {"temp": 400}},
    }
    
    service.results = {
        "sim1": {"simulation_id": "sim1", "data": [1, 2, 3, 4, 5]},
        "sim2": {"simulation_id": "sim2", "data": [5, 6, 7, 8, 9]},
    }
    
    return service


@pytest.fixture
def service_without_cache(mock_db):
    """Create a simulation service without cache."""
    service = SimulationService(mock_db, None)
    
    # Create sample data (same as with cache)
    service.simulations = {
        "sim1": {"id": "sim1", "name": "Test Simulation 1", "params": {"temp": 300}},
        "sim2": {"id": "sim2", "name": "Test Simulation 2", "params": {"temp": 400}},
    }
    
    service.results = {
        "sim1": {"simulation_id": "sim1", "data": [1, 2, 3, 4, 5]},
        "sim2": {"simulation_id": "sim2", "data": [5, 6, 7, 8, 9]},
    }
    
    return service


async def benchmark_get_simulation(service, simulation_id, iterations=100):
    """
    Benchmark get_simulation method.
    
    Args:
        service: SimulationService instance
        simulation_id: ID of simulation to fetch
        iterations: Number of iterations
    
    Returns:
        Benchmark metrics
    """
    return await async_benchmark(
        service.get_simulation,
        simulation_id,
        iterations=iterations
    )


@pytest.mark.asyncio
async def test_compare_caching_performance(service_with_cache, service_without_cache):
    """Test to compare performance with and without caching."""
    # Benchmark without cache
    no_cache_metrics = await benchmark_get_simulation(
        service_without_cache, 
        "sim1", 
        iterations=50
    )
    
    # Benchmark with cache (first run to warm up cache)
    await service_with_cache.get_simulation("sim1")
    
    # Now benchmark with warm cache
    cache_metrics = await benchmark_get_simulation(
        service_with_cache, 
        "sim1", 
        iterations=50
    )
    
    # Print results
    print("\nPerformance Comparison:")
    print(f"Without Cache: {no_cache_metrics['mean']*1000:.2f}ms mean, "
          f"{no_cache_metrics['p95']*1000:.2f}ms p95")
    print(f"With Cache: {cache_metrics['mean']*1000:.2f}ms mean, "
          f"{cache_metrics['p95']*1000:.2f}ms p95")
    print(f"Speedup: {no_cache_metrics['mean']/cache_metrics['mean']:.2f}x")
    
    # Plot comparison
    plot_benchmark_comparison(
        ["Without Cache", "With Cache"],
        [no_cache_metrics, cache_metrics],
        title="Redis Cache Performance Comparison",
        output_path=CACHE_BENCHMARK_DIR / "cache_performance_comparison.png"
    )
    
    # Verify that caching provides significant improvement
    assert cache_metrics['mean'] < no_cache_metrics['mean'], \
        "Caching should provide better performance"
    
    # Verify that cache hit ratio is positive
    assert service_with_cache.get_cache_hit_ratio() > 0, \
        "Cache hit ratio should be positive"


@pytest.mark.asyncio
async def test_cache_latency_impact():
    """Test the impact of cache latency on overall performance."""
    # Create services with different Redis latencies
    latencies = [1, 5, 10, 20]
    services = []
    
    db = MockDB(query_latency_ms=30.0)  # Fixed DB latency
    
    for latency in latencies:
        redis = MockRedis(latency_ms=latency)
        service = SimulationService(db, redis)
        
        # Add test data
        service.simulations = {"sim1": {"id": "sim1", "name": "Test"}}
        service.results = {"sim1": {"simulation_id": "sim1", "data": [1, 2, 3]}}
        
        services.append(service)
    
    # Run benchmarks
    metrics = []
    for service in services:
        # Warm up cache
        await service.get_simulation("sim1")
        
        # Run benchmark
        result = await benchmark_get_simulation(service, "sim1", iterations=30)
        metrics.append(result)
    
    # Create scaling analysis
    create_scaling_analysis(
        latencies,
        metrics,
        title="Cache Latency Impact on Performance",
        xlabel="Redis Latency (ms)",
        output_path=CACHE_BENCHMARK_DIR / "cache_latency_impact.png"
    )
    
    # Log results
    print("\nCache Latency Impact:")
    for i, latency in enumerate(latencies):
        print(f"Redis latency {latency}ms: {metrics[i]['mean']*1000:.2f}ms mean response time")


@pytest.mark.asyncio
async def test_cache_hit_ratio_analysis(service_with_cache):
    """Test to analyze cache hit ratio impact on performance."""
    # Prepare simulation IDs (5 exist in cache, 5 don't)
    cached_ids = ["sim1", "sim2"]
    uncached_ids = [f"uncached{i}" for i in range(3)]
    
    # Add uncached simulation data
    for sim_id in uncached_ids:
        service_with_cache.simulations[sim_id] = {
            "id": sim_id, 
            "name": f"Uncached Simulation {sim_id}",
            "params": {"temp": random.randint(300, 500)}
        }
        
        service_with_cache.results[sim_id] = {
            "simulation_id": sim_id,
            "data": [random.random() for _ in range(5)]
        }
    
    # Create different ratios of cached vs uncached access patterns
    hit_ratios = [0.0, 0.25, 0.5, 0.75, 1.0]
    metrics = []
    actual_hit_ratios = []
    
    for target_ratio in hit_ratios:
        # Reset cache stats
        service_with_cache.cache_hits = 0
        service_with_cache.cache_misses = 0
        
        # Warm up cache for cached IDs
        for sim_id in cached_ids:
            await service_with_cache.get_simulation(sim_id)
        
        # Create mixed access pattern based on target hit ratio
        access_pattern = []
        n_iterations = 40
        n_cache_hits = int(n_iterations * target_ratio)
        
        for _ in range(n_cache_hits):
            access_pattern.append(random.choice(cached_ids))
        
        for _ in range(n_iterations - n_cache_hits):
            access_pattern.append(random.choice(uncached_ids))
        
        random.shuffle(access_pattern)
        
        # Execute the access pattern
        start_time = time.perf_counter()
        for sim_id in access_pattern:
            await service_with_cache.get_simulation(sim_id)
        end_time = time.perf_counter()
        
        avg_time = (end_time - start_time) / n_iterations
        
        # Record metrics
        metrics.append({
            "mean": avg_time,
            "hit_ratio": service_with_cache.get_cache_hit_ratio()
        })
        
        actual_hit_ratios.append(service_with_cache.get_cache_hit_ratio())
    
    # Plot the results
    plt.figure(figsize=(10, 6))
    plt.plot(actual_hit_ratios, [m["mean"]*1000 for m in metrics], 
             marker='o', linestyle='-', linewidth=2)
    
    plt.title("Impact of Cache Hit Ratio on Average Response Time")
    plt.xlabel("Cache Hit Ratio")
    plt.ylabel("Average Response Time (ms)")
    plt.grid(True, alpha=0.3)
    
    # Add linear regression
    z = np.polyfit(actual_hit_ratios, [m["mean"]*1000 for m in metrics], 1)
    p = np.poly1d(z)
    x_range = np.linspace(min(actual_hit_ratios), max(actual_hit_ratios), 100)
    plt.plot(x_range, p(x_range), "r--", alpha=0.7, 
             label=f"Trend: {z[0]:.2f}x + {z[1]:.2f}")
    
    plt.legend()
    plt.savefig(CACHE_BENCHMARK_DIR / "cache_hit_ratio_impact.png")
    plt.close()
    
    # Log results
    print("\nCache Hit Ratio Impact:")
    for i, ratio in enumerate(actual_hit_ratios):
        print(f"Hit ratio {ratio:.2f}: {metrics[i]['mean']*1000:.2f}ms mean response time")


@pytest.mark.asyncio
async def test_cache_under_concurrent_load(service_with_cache):
    """Test cache performance under concurrent load."""
    # First ensure sim1 is in cache
    await service_with_cache.get_simulation("sim1")
    
    # Benchmark different concurrency levels
    concurrency_levels = [1, 5, 10, 20, 50]
    metrics = []
    
    for concurrency in concurrency_levels:
        result = await benchmark_concurrent(
            service_with_cache.get_simulation,
            "sim1",
            concurrency=concurrency,
            total_operations=100
        )
        metrics.append(result)
    
    # Create scaling analysis
    create_scaling_analysis(
        concurrency_levels,
        metrics,
        title="Cache Performance Under Concurrent Load",
        xlabel="Concurrent Requests",
        output_path=CACHE_BENCHMARK_DIR / "cache_concurrent_performance.png"
    )
    
    # Plot operations per second vs concurrency
    plt.figure(figsize=(10, 6))
    ops_per_sec = [m["operations_per_second"] for m in metrics]
    plt.plot(concurrency_levels, ops_per_sec, marker='o', linestyle='-', linewidth=2)
    
    plt.title("Throughput Under Concurrent Load")
    plt.xlabel("Concurrent Requests")
    plt.ylabel("Operations per Second")
    plt.grid(True, alpha=0.3)
    plt.savefig(CACHE_BENCHMARK_DIR / "cache_throughput.png")
    plt.close()
    
    # Log results
    print("\nConcurrent Load Performance:")
    for i, concurrency in enumerate(concurrency_levels):
        print(f"Concurrency {concurrency}: {metrics[i]['operations_per_second']:.2f} ops/sec, "
              f"{metrics[i]['mean']*1000:.2f}ms mean")


@pytest.mark.asyncio
async def test_cache_expiry_strategies():
    """Test different cache expiry strategies."""
    db = MockDB(query_latency_ms=20.0)
    
    # Create services with different TTLs
    ttls = [60, 300, 600, 1800, 3600]
    services = []
    
    for ttl in ttls:
        redis = MockRedis(latency_ms=5.0)
        service = SimulationService(db, redis, cache_ttl=ttl)
        
        # Add test data
        service.simulations = {"sim1": {"id": "sim1", "name": "Test Simulation"}}
        services.append(service)
    
    # Simulate access patterns over time
    # For each service, we'll track:
    # - Total DB queries (lower is better)
    # - Average response time
    
    # Simulation parameters
    simulation_period_hours = 24
    access_interval_minutes = 10  # How often the data is accessed
    
    # Results storage
    results = []
    
    # Convert to simulation time units
    simulation_period = simulation_period_hours * 60 * 60  # in seconds
    access_interval = access_interval_minutes * 60  # in seconds
    
    for i, service in enumerate(services):
        # Reset stats
        db_queries = 0
        total_response_time = 0
        access_count = 0
        
        # Run simulation
        for t in range(0, simulation_period, access_interval):
            start = time.perf_counter()
            
            # If the data has expired in cache, this will trigger a DB query
            # We'll detect this by checking cache hit/miss stats before and after
            misses_before = service.cache_misses
            
            await service.get_simulation("sim1")
            
            misses_after = service.cache_misses
            if misses_after > misses_before:
                db_queries += 1
            
            end = time.perf_counter()
            total_response_time += (end - start)
            access_count += 1
        
        avg_response_time = total_response_time / access_count
        
        results.append({
            "ttl": ttls[i],
            "db_queries": db_queries,
            "avg_response_time": avg_response_time,
            "cache_efficiency": 1 - (db_queries / access_count)
        })
    
    # Plot results
    plt.figure(figsize=(10, 6))
    
    # Plot DB queries vs TTL
    plt.subplot(2, 1, 1)
    plt.bar([str(ttl) for ttl in ttls], [r["db_queries"] for r in results], alpha=0.7)
    plt.title("Impact of Cache TTL on Database Load")
    plt.xlabel("Cache TTL (seconds)")
    plt.ylabel("Total DB Queries")
    plt.grid(axis='y', linestyle='--', alpha=0.3)
    
    # Plot cache efficiency vs TTL
    plt.subplot(2, 1, 2)
    plt.bar([str(ttl) for ttl in ttls], [r["cache_efficiency"] * 100 for r in results], alpha=0.7)
    plt.title("Cache Efficiency by TTL")
    plt.xlabel("Cache TTL (seconds)")
    plt.ylabel("Cache Efficiency (%)")
    plt.grid(axis='y', linestyle='--', alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(CACHE_BENCHMARK_DIR / "cache_ttl_strategies.png")
    plt.close()
    
    # Log results
    print("\nCache TTL Strategy Analysis:")
    for r in results:
        print(f"TTL {r['ttl']}s: {r['db_queries']} DB queries, "
              f"{r['cache_efficiency']*100:.1f}% cache efficiency, "
              f"{r['avg_response_time']*1000:.2f}ms avg response")


def run_benchmarks():
    """Run all benchmarks with pytest."""
    pytest.main(["-xvs", __file__])


if __name__ == "__main__":
    run_benchmarks() 