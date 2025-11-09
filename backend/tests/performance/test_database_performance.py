"""
Performance benchmarks for database operations.

These tests measure the performance of critical database operations
to identify bottlenecks and provide baseline metrics for optimization efforts.
"""

import os
import sys
import pytest
import numpy as np
import matplotlib.pyplot as plt
import time
import asyncio
from pathlib import Path
from typing import Dict, Any, List, Optional, Callable

# Add the backend directory to the path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

# Import benchmark utilities
from tests.utils.benchmark_util import (
    benchmark_function, 
    profile_function,
    create_scaling_analysis,
    plot_benchmark_comparison
)

# Import database modules
from app.db.session import get_db
from app.db.base import Base
from app.models.user import User
from app.models.simulation import Simulation
from app.models.simulation_config import SimulationConfig
from app.models.simulation_result import SimulationResult
from app.core.security import get_password_hash

# Ensure output directory exists
BENCHMARK_OUTPUT_DIR = Path("benchmarks/performance")
os.makedirs(BENCHMARK_OUTPUT_DIR, exist_ok=True)


async def async_benchmark(func, *args, iterations=10, warmup=2):
    """Benchmark an async function.
    
    Args:
        func: Async function to benchmark
        args: Arguments to pass to the function
        iterations: Number of iterations
        warmup: Number of warmup iterations
        
    Returns:
        Dictionary with benchmark results
    """
    # Warmup phase
    for _ in range(warmup):
        await func(*args)
    
    # Measurement phase
    times = []
    for _ in range(iterations):
        start = time.perf_counter()
        await func(*args)
        elapsed = time.perf_counter() - start
        times.append(elapsed)
    
    times_array = np.array(times)
    return {
        "mean": np.mean(times_array),
        "median": np.median(times_array),
        "min": np.min(times_array),
        "max": np.max(times_array),
        "p95": np.percentile(times_array, 95),
        "std_dev": np.std(times_array)
    }


@pytest.fixture
async def db_session():
    """Create an async database session for testing."""
    from app.db.session import get_db
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    
    # Use SQLite for testing
    SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
    engine = create_async_engine(SQLALCHEMY_DATABASE_URL, echo=False)
    
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    # Create session
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        yield session


@pytest.fixture
async def test_user(db_session):
    """Create a test user in the database."""
    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password=get_password_hash("password123"),
        is_active=True,
        is_superuser=False
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
def simulation_data():
    """Return test simulation data."""
    return {
        "domain_size": [0.005, 0.005, 0.005],
        "resolution": [5, 5, 5],
        "simulation_time": 0.001,
        "time_step": 1.0e-4,
        "reactions": ["d-d"],
        "mechanisms": ["electron_screening"],
        "initial_temperature": 300.0,
        "species_densities": {"d": 1.0e28},
        "thermal_conductivity": 10.0,
        "heat_capacity": 500.0,
        "material_density": 1000.0
    }


@pytest.mark.asyncio
@pytest.mark.performance
async def test_user_crud_performance(db_session):
    """Benchmark user CRUD operations."""
    
    # Create user function
    async def create_user(index):
        user = User(
            email=f"user{index}@example.com",
            username=f"user{index}",
            hashed_password=get_password_hash(f"password{index}"),
            is_active=True,
            is_superuser=False
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user.id
    
    # Read user function
    async def get_user(user_id):
        user = await db_session.get(User, user_id)
        return user
    
    # Update user function
    async def update_user(user_id):
        user = await db_session.get(User, user_id)
        user.full_name = f"Updated User {user_id}"
        await db_session.commit()
        await db_session.refresh(user)
        return user
    
    # Delete user function
    async def delete_user(user_id):
        user = await db_session.get(User, user_id)
        await db_session.delete(user)
        await db_session.commit()
    
    # Benchmark create operation
    print("Benchmarking user creation...")
    create_result = await async_benchmark(create_user, 1, iterations=20)
    print(f"  User creation: Mean={create_result['mean']:.6f}s, P95={create_result['p95']:.6f}s")
    
    # Create a batch of users for read benchmarking
    user_ids = []
    for i in range(10):
        user_id = await create_user(i + 100)
        user_ids.append(user_id)
    
    # Benchmark read operation
    print("Benchmarking user retrieval...")
    read_result = await async_benchmark(get_user, user_ids[0], iterations=100)
    print(f"  User retrieval: Mean={read_result['mean']:.6f}s, P95={read_result['p95']:.6f}s")
    
    # Benchmark update operation
    print("Benchmarking user update...")
    update_result = await async_benchmark(update_user, user_ids[0], iterations=20)
    print(f"  User update: Mean={update_result['mean']:.6f}s, P95={update_result['p95']:.6f}s")
    
    # Benchmark delete operation
    print("Benchmarking user deletion...")
    delete_result = await async_benchmark(delete_user, user_ids[0], iterations=1)  # Only one delete possible
    print(f"  User deletion: Mean={delete_result['mean']:.6f}s, P95={delete_result['p95']:.6f}s")
    
    # Plot results
    results = {
        "Create": create_result,
        "Read": read_result,
        "Update": update_result,
        "Delete": delete_result
    }
    
    plot_benchmark_comparison(
        results,
        metric='mean',
        title='User CRUD Operation Performance',
        save_path=BENCHMARK_OUTPUT_DIR / 'user_crud_performance.png'
    )


@pytest.mark.asyncio
@pytest.mark.performance
async def test_batch_insert_performance(db_session):
    """Test performance of batch inserts vs individual inserts."""
    
    # Individual insert function
    async def insert_users_individually(count):
        for i in range(count):
            user = User(
                email=f"batch{i}@example.com",
                username=f"batchuser{i}",
                hashed_password=get_password_hash(f"password{i}"),
                is_active=True,
                is_superuser=False
            )
            db_session.add(user)
            await db_session.commit()
    
    # Batch insert function
    async def insert_users_batch(count):
        users = [
            User(
                email=f"batch{i}@example.com",
                username=f"batchuser{i}",
                hashed_password=get_password_hash(f"password{i}"),
                is_active=True,
                is_superuser=False
            )
            for i in range(count)
        ]
        db_session.add_all(users)
        await db_session.commit()
    
    # Test with different batch sizes
    batch_sizes = [1, 10, 50, 100]
    individual_results = {}
    batch_results = {}
    
    for size in batch_sizes:
        print(f"Testing with batch size {size}...")
        
        # Clean up before test
        await db_session.execute("DELETE FROM users")
        await db_session.commit()
        
        # Time individual inserts
        start = time.perf_counter()
        await insert_users_individually(size)
        individual_time = time.perf_counter() - start
        individual_results[f"{size} records"] = {"mean": individual_time}
        
        # Clean up before next test
        await db_session.execute("DELETE FROM users")
        await db_session.commit()
        
        # Time batch insert
        start = time.perf_counter()
        await insert_users_batch(size)
        batch_time = time.perf_counter() - start
        batch_results[f"{size} records"] = {"mean": batch_time}
        
        print(f"  Individual: {individual_time:.4f}s, Batch: {batch_time:.4f}s")
        print(f"  Improvement: {individual_time / batch_time:.1f}x")
    
    # Plot individual vs batch performance
    plt.figure(figsize=(12, 6))
    
    sizes = [int(k.split()[0]) for k in individual_results.keys()]
    individual_times = [v["mean"] for v in individual_results.values()]
    batch_times = [v["mean"] for v in batch_results.values()]
    
    plt.plot(sizes, individual_times, marker='o', label="Individual Inserts")
    plt.plot(sizes, batch_times, marker='s', label="Batch Insert")
    plt.xlabel("Number of Records")
    plt.ylabel("Time (seconds)")
    plt.title("Individual vs Batch Insert Performance")
    plt.legend()
    plt.grid(True)
    plt.savefig(BENCHMARK_OUTPUT_DIR / 'batch_insert_performance.png')


@pytest.mark.asyncio
@pytest.mark.performance
async def test_query_performance(db_session, test_user):
    """Test performance of different query patterns."""
    
    # Populate the database with simulations
    simulation_count = 100
    for i in range(simulation_count):
        sim = Simulation(
            user_id=test_user.id,
            parameters={
                "domain_size": [0.005, 0.005, 0.005],
                "resolution": [5, 5, 5],
                "temperature": 300 + i,
                "pressure": 1e5,
                "reactions": ["d-d"],
                "name": f"Simulation {i}"
            },
            status="completed" if i % 3 == 0 else "pending",
            start_time=time.time() - (i * 3600),  # hours ago
            end_time=time.time() - (i * 3600) + 1800 if i % 3 == 0 else None  # 30 minutes later
        )
        db_session.add(sim)
    
    await db_session.commit()
    
    # Different query patterns to test
    
    # 1. Simple query by ID
    async def query_by_id():
        result = await db_session.execute("SELECT * FROM simulations WHERE id = 1")
        return result.first()
    
    # 2. Query with filtering
    async def query_with_filter():
        result = await db_session.execute(
            "SELECT * FROM simulations WHERE status = 'completed'"
        )
        return result.all()
    
    # 3. Query with join
    async def query_with_join():
        result = await db_session.execute(
            "SELECT s.*, u.username FROM simulations s JOIN users u ON s.user_id = u.id"
        )
        return result.all()
    
    # 4. Query with sorting
    async def query_with_sort():
        result = await db_session.execute(
            "SELECT * FROM simulations ORDER BY start_time DESC"
        )
        return result.all()
    
    # 5. Query with filtering and sorting
    async def query_with_filter_and_sort():
        result = await db_session.execute(
            "SELECT * FROM simulations WHERE status = 'completed' ORDER BY start_time DESC"
        )
        return result.all()
    
    # 6. Complex query with JSON extraction (SQLite doesn't support this well, so this is SQLite-specific)
    async def query_with_json_filter():
        result = await db_session.execute(
            "SELECT * FROM simulations WHERE parameters LIKE '%\"temperature\":3%'"
        )
        return result.all()
    
    # Benchmark all query patterns
    queries = {
        "Query by ID": query_by_id,
        "Query with Filter": query_with_filter,
        "Query with Join": query_with_join, 
        "Query with Sort": query_with_sort,
        "Query with Filter & Sort": query_with_filter_and_sort,
        "Query with JSON Filter": query_with_json_filter
    }
    
    results = {}
    for name, query_func in queries.items():
        print(f"Benchmarking {name}...")
        result = await async_benchmark(query_func, iterations=50, warmup=5)
        results[name] = result
        print(f"  Mean: {result['mean']:.6f}s, P95: {result['p95']:.6f}s")
    
    # Plot results
    plot_benchmark_comparison(
        results,
        metric='mean',
        title='Database Query Performance',
        save_path=BENCHMARK_OUTPUT_DIR / 'query_performance.png'
    )
    
    # Plot p95 latency
    p95_results = {k: {"mean": v["p95"]} for k, v in results.items()}
    plot_benchmark_comparison(
        p95_results,
        metric='mean',
        title='Database Query P95 Latency',
        save_path=BENCHMARK_OUTPUT_DIR / 'query_p95_latency.png'
    )


@pytest.mark.asyncio
@pytest.mark.performance
async def test_connection_pool_performance(test_user):
    """Test performance with different database connection pool settings."""
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    
    # Base database URL
    SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
    
    # Test with different pool sizes
    pool_sizes = [1, 5, 10, 20]
    results = {}
    
    for pool_size in pool_sizes:
        print(f"Testing with pool size {pool_size}...")
        
        # Create engine with specific pool size
        engine = create_async_engine(
            SQLALCHEMY_DATABASE_URL,
            echo=False,
            pool_size=pool_size,
            max_overflow=0
        )
        
        # Create tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        # Create session factory
        async_session = sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )
        
        # Create a user first
        async with async_session() as session:
            user = User(
                email=f"pool_test@example.com",
                username="pool_test_user",
                hashed_password=get_password_hash("password123"),
                is_active=True,
                is_superuser=False
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            user_id = user.id
        
        # Concurrent query function
        async def concurrent_queries(user_id, query_count=50):
            # Run multiple queries in parallel
            async def single_query(i):
                async with async_session() as session:
                    start = time.perf_counter()
                    result = await session.get(User, user_id)
                    elapsed = time.perf_counter() - start
                    return elapsed
            
            # Run queries in parallel
            tasks = [single_query(i) for i in range(query_count)]
            times = await asyncio.gather(*tasks)
            
            return {
                "mean": np.mean(times),
                "median": np.median(times),
                "min": np.min(times),
                "max": np.max(times),
                "p95": np.percentile(times, 95),
                "total": sum(times)
            }
        
        # Run the test
        result = await concurrent_queries(user_id)
        results[f"Pool size {pool_size}"] = result
        
        print(f"  Mean query time: {result['mean']:.6f}s")
        print(f"  P95 query time: {result['p95']:.6f}s")
        print(f"  Total time: {result['total']:.6f}s")
        
        # Clean up
        await engine.dispose()
    
    # Plot results
    plt.figure(figsize=(10, 6))
    
    sizes = [int(k.split()[2]) for k in results.keys()]
    means = [v["mean"] for v in results.values()]
    p95s = [v["p95"] for v in results.values()]
    
    plt.plot(sizes, means, marker='o', label="Mean Query Time")
    plt.plot(sizes, p95s, marker='s', label="P95 Query Time")
    plt.xlabel("Connection Pool Size")
    plt.ylabel("Time (seconds)")
    plt.title("Database Connection Pool Performance")
    plt.legend()
    plt.grid(True)
    plt.savefig(BENCHMARK_OUTPUT_DIR / 'connection_pool_performance.png')


if __name__ == "__main__":
    # This allows running just this test file directly
    pytest.main(["-v", __file__]) 