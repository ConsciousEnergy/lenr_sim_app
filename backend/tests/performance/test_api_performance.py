"""
Performance benchmarks for API endpoints.

These tests measure the performance of critical API endpoints
to identify bottlenecks and provide baseline metrics for optimization efforts.
"""

import os
import sys
import pytest
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
import time
import concurrent.futures
import json
from typing import Dict, Any, List, Callable

# Add the backend directory to the path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

# Import benchmark utilities
from tests.utils.benchmark_util import (
    benchmark_function, 
    profile_function,
    create_scaling_analysis,
    plot_benchmark_comparison
)

from fastapi.testclient import TestClient
from app.main import app

# Ensure output directory exists
BENCHMARK_OUTPUT_DIR = Path("benchmarks/performance")
os.makedirs(BENCHMARK_OUTPUT_DIR, exist_ok=True)


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


@pytest.fixture
def auth_token(client):
    """Get an authentication token for API calls."""
    # Create a test user
    username = f"perf_test_user_{int(time.time())}"
    user_data = {
        "username": username,
        "password": "testpassword123",
        "email": f"{username}@example.com",
    }
    
    try:
        client.post("/api/users/register", json=user_data)
    except Exception:
        # User might already exist, that's fine
        pass
    
    # Get a token
    response = client.post(
        "/api/users/token",
        data={
            "username": user_data["username"],
            "password": user_data["password"],
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    
    if response.status_code != 200:
        pytest.skip("Could not get authentication token")
        
    return response.json()["access_token"]


@pytest.fixture
def auth_headers(auth_token):
    """Return headers with authentication token."""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture
def test_simulation_request():
    """Return a test simulation request."""
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


def benchmark_endpoint(client: TestClient, method: str, url: str, 
                      headers: Dict = None, json_data: Dict = None, 
                      expected_status: int = 200,
                      iterations: int = 10, warmup: int = 2) -> Dict[str, float]:
    """Benchmark an API endpoint.
    
    Args:
        client: TestClient instance
        method: HTTP method (GET, POST, etc.)
        url: Endpoint URL
        headers: HTTP headers
        json_data: JSON data for request body
        expected_status: Expected HTTP status code
        iterations: Number of benchmark iterations
        warmup: Number of warmup iterations
        
    Returns:
        Dictionary with benchmark results
    """
    # Initialize default values
    headers = headers or {}
    
    # Create request function
    def make_request():
        if method.upper() == "GET":
            response = client.get(url, headers=headers)
        elif method.upper() == "POST":
            response = client.post(url, headers=headers, json=json_data)
        elif method.upper() == "PUT":
            response = client.put(url, headers=headers, json=json_data)
        elif method.upper() == "DELETE":
            response = client.delete(url, headers=headers)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")
            
        assert response.status_code == expected_status, f"Expected status {expected_status}, got {response.status_code}: {response.text}"
        return response
    
    # Warmup phase
    for _ in range(warmup):
        make_request()
    
    # Measurement phase
    times = []
    for _ in range(iterations):
        start = time.perf_counter()
        make_request()
        times.append(time.perf_counter() - start)
    
    return {
        "mean": np.mean(times),
        "median": np.median(times),
        "min": np.min(times),
        "max": np.max(times),
        "p95": np.percentile(times, 95),
        "std_dev": np.std(times)
    }


def run_load_test(client: TestClient, method: str, url: str, 
                headers: Dict = None, json_data: Dict = None,
                concurrent_users: int = 10, requests_per_user: int = 10) -> Dict[str, float]:
    """Run a load test on an API endpoint.
    
    Args:
        client: TestClient instance
        method: HTTP method (GET, POST, etc.)
        url: Endpoint URL
        headers: HTTP headers
        json_data: JSON data for request body
        concurrent_users: Number of concurrent users to simulate
        requests_per_user: Number of requests per user
        
    Returns:
        Dictionary with load test results
    """
    # Initialize default values
    headers = headers or {}
    
    # Create request function
    def make_requests(user_id: int):
        user_times = []
        user_client = TestClient(app)  # Create a new client for each user
        
        for i in range(requests_per_user):
            # Add user and request identifiers to avoid caching
            user_headers = headers.copy()
            user_headers["X-User-ID"] = str(user_id)
            user_headers["X-Request-ID"] = str(i)
            
            user_url = f"{url}?user={user_id}&request={i}" if "?" not in url else f"{url}&user={user_id}&request={i}"
            
            start = time.perf_counter()
            
            if method.upper() == "GET":
                response = user_client.get(user_url, headers=user_headers)
            elif method.upper() == "POST":
                # Make a copy of json_data to avoid race conditions
                user_data = json.loads(json.dumps(json_data)) if json_data else None
                response = user_client.post(user_url, headers=user_headers, json=user_data)
            elif method.upper() == "PUT":
                user_data = json.loads(json.dumps(json_data)) if json_data else None
                response = user_client.put(user_url, headers=user_headers, json=user_data)
            elif method.upper() == "DELETE":
                response = user_client.delete(user_url, headers=user_headers)
                
            elapsed = time.perf_counter() - start
            user_times.append((elapsed, response.status_code))
            
        return user_times
    
    # Run concurrent requests
    all_times = []
    status_codes = {}
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrent_users) as executor:
        future_to_user = {executor.submit(make_requests, user_id): user_id 
                         for user_id in range(concurrent_users)}
        
        for future in concurrent.futures.as_completed(future_to_user):
            user_id = future_to_user[future]
            try:
                user_times = future.result()
                for elapsed, status_code in user_times:
                    all_times.append(elapsed)
                    status_codes[status_code] = status_codes.get(status_code, 0) + 1
            except Exception as e:
                print(f"User {user_id} generated an exception: {e}")
    
    # Calculate statistics
    all_times = np.array(all_times)
    total_requests = len(all_times)
    total_time = np.sum(all_times)
    
    return {
        "requests": total_requests,
        "total_time": total_time,
        "throughput": total_requests / total_time if total_time > 0 else 0,
        "mean": np.mean(all_times),
        "median": np.median(all_times),
        "min": np.min(all_times),
        "max": np.max(all_times),
        "p95": np.percentile(all_times, 95),
        "p99": np.percentile(all_times, 99),
        "std_dev": np.std(all_times),
        "status_codes": status_codes
    }


@pytest.mark.performance
def test_physics_api_endpoints(client: TestClient):
    """Benchmark performance of physics API endpoints."""
    # Define the endpoints to test
    endpoints = [
        ("GET", "/api/physics/available-reactions", None),
        ("POST", "/api/physics/calculate/rate", {
            "reaction_name": "d-d",
            "conditions": {
                "temperature": 10.0,  # keV
                "density": 1.0e20,    # particles/m^3
                "confinement_time": 1.0  # seconds
            },
            "enhancement_factors": {
                "electron_screening": 1.5
            }
        }),
        ("POST", "/api/physics/calculate/temperature-scan", {
            "reaction_name": "d-d",
            "temperatures": [1.0, 5.0, 10.0],  # keV
            "density": 1.0e20,  # particles/m^3
            "enhancement_factors": {
                "electron_screening": 1.5
            }
        }),
        ("POST", "/api/physics/quantum-tunneling", {
            "temperature": 300.0,
            "potential_type": "coulomb",
            "barrier_width": 1.0e-10,
            "z1": 1,
            "z2": 1,
            "energy_min_ev": 0.1,
            "energy_max_ev": 10.0,
            "energy_points": 5,
            "electron_screening": True
        })
    ]
    
    # Benchmark each endpoint
    results = {}
    for method, url, data in endpoints:
        endpoint_name = url.split("/")[-1]
        print(f"Benchmarking {method} {url}...")
        
        try:
            result = benchmark_endpoint(
                client=client,
                method=method,
                url=url,
                json_data=data,
                iterations=5,
                warmup=1
            )
            results[f"{method} {endpoint_name}"] = result
            print(f"  Mean: {result['mean']:.4f}s, P95: {result['p95']:.4f}s")
        except Exception as e:
            print(f"  Failed: {e}")
    
    # Plot results
    plot_benchmark_comparison(
        results,
        metric='mean',
        title='Physics API Endpoint Performance',
        save_path=BENCHMARK_OUTPUT_DIR / 'physics_api_performance.png'
    )
    
    # Plot p95 latencies
    p95_results = {k: {"mean": v["p95"]} for k, v in results.items()}
    plot_benchmark_comparison(
        p95_results,
        metric='mean',
        title='Physics API Endpoint P95 Latency',
        save_path=BENCHMARK_OUTPUT_DIR / 'physics_api_p95_latency.png'
    )


@pytest.mark.performance
def test_simulation_api_performance(client: TestClient, test_simulation_request: Dict[str, Any]):
    """Benchmark performance of simulation API endpoints."""
    # Test simulation creation performance
    creation_result = benchmark_endpoint(
        client=client,
        method="POST",
        url="/api/multi-physics/simulations",
        json_data=test_simulation_request,
        iterations=3,
        warmup=1
    )
    
    print(f"Simulation creation: Mean={creation_result['mean']:.4f}s, P95={creation_result['p95']:.4f}s")
    
    # Create a simulation for subsequent tests
    response = client.post("/api/multi-physics/simulations", json=test_simulation_request)
    simulation_id = response.json()["simulation_id"]
    
    # Wait for simulation to complete
    start_time = time.time()
    max_wait = 30  # seconds
    
    while time.time() - start_time < max_wait:
        status_response = client.get(f"/api/multi-physics/simulations/{simulation_id}/status")
        assert status_response.status_code == 200
        
        if status_response.json()["status"] in ["completed", "failed"]:
            break
            
        time.sleep(2)
    
    # Test subsequent endpoints
    endpoints = [
        ("GET", f"/api/multi-physics/simulations/{simulation_id}/status", None),
        ("GET", f"/api/multi-physics/simulations/{simulation_id}/results", None),
        ("GET", "/api/multi-physics/simulations", None)
    ]
    
    results = {"POST simulations": creation_result}
    for method, url, data in endpoints:
        endpoint_name = url.split("/")[-1]
        if endpoint_name == simulation_id:
            endpoint_name = url.split("/")[-2]
            
        print(f"Benchmarking {method} {endpoint_name}...")
        
        try:
            result = benchmark_endpoint(
                client=client,
                method=method,
                url=url,
                json_data=data,
                iterations=5,
                warmup=1
            )
            results[f"{method} {endpoint_name}"] = result
            print(f"  Mean: {result['mean']:.4f}s, P95: {result['p95']:.4f}s")
        except Exception as e:
            print(f"  Failed: {e}")
    
    # Plot results
    plot_benchmark_comparison(
        results,
        metric='mean',
        title='Simulation API Endpoint Performance',
        save_path=BENCHMARK_OUTPUT_DIR / 'simulation_api_performance.png'
    )


@pytest.mark.performance
def test_results_api_performance(client: TestClient, test_simulation_request: Dict[str, Any]):
    """Benchmark performance of results API endpoints."""
    # Create and run a simulation first
    response = client.post("/api/multi-physics/simulations", json=test_simulation_request)
    simulation_id = response.json()["simulation_id"]
    
    # Wait for simulation to complete
    start_time = time.time()
    max_wait = 30  # seconds
    
    while time.time() - start_time < max_wait:
        status_response = client.get(f"/api/multi-physics/simulations/{simulation_id}/status")
        assert status_response.status_code == 200
        
        if status_response.json()["status"] in ["completed", "failed"]:
            break
            
        time.sleep(2)
    
    # Save the simulation results
    save_response = client.post(f"/api/results/simulations/{simulation_id}/save")
    assert save_response.status_code == 200
    
    # Define endpoints to test
    endpoints = [
        ("GET", "/api/results/simulations", None),
        ("GET", f"/api/results/simulations/{simulation_id}", None),
        ("GET", f"/api/results/simulations/{simulation_id}/results", None),
        ("GET", f"/api/results/simulations/{simulation_id}/export?format=json", None),
        ("POST", f"/api/results/simulations/{simulation_id}/analyze", {
            "method": "time_series_analysis",
            "parameters": {
                "data_field": "temperature",
                "position": [0.5, 0.5, 0.5],
                "time_range": [0, 0.001]
            }
        })
    ]
    
    # Benchmark each endpoint
    results = {}
    for method, url, data in endpoints:
        endpoint_parts = url.split("/")
        endpoint_name = endpoint_parts[-1]
        if endpoint_name == simulation_id or endpoint_name.startswith(simulation_id):
            endpoint_name = endpoint_parts[-2]
            
        print(f"Benchmarking {method} {endpoint_name}...")
        
        try:
            result = benchmark_endpoint(
                client=client,
                method=method,
                url=url,
                json_data=data,
                iterations=5,
                warmup=1
            )
            results[f"{method} {endpoint_name}"] = result
            print(f"  Mean: {result['mean']:.4f}s, P95: {result['p95']:.4f}s")
        except Exception as e:
            print(f"  Failed: {e}")
    
    # Plot results
    plot_benchmark_comparison(
        results,
        metric='mean',
        title='Results API Endpoint Performance',
        save_path=BENCHMARK_OUTPUT_DIR / 'results_api_performance.png'
    )


@pytest.mark.performance
def test_api_throughput(client: TestClient):
    """Test API throughput under load."""
    # Select a simple endpoint for throughput testing
    url = "/api/physics/available-reactions"
    
    # Test different concurrency levels
    concurrency_levels = [1, 5, 10, 20]
    throughput_results = {}
    latency_results = {}
    
    for concurrency in concurrency_levels:
        print(f"Testing with {concurrency} concurrent users...")
        
        result = run_load_test(
            client=client,
            method="GET",
            url=url,
            concurrent_users=concurrency,
            requests_per_user=5
        )
        
        throughput_results[f"{concurrency} users"] = {"mean": result["throughput"]}
        latency_results[f"{concurrency} users"] = {"mean": result["p95"]}
        
        print(f"  Throughput: {result['throughput']:.2f} req/s, P95 latency: {result['p95']:.4f}s")
        print(f"  Status codes: {result['status_codes']}")
    
    # Plot throughput results
    plt.figure(figsize=(10, 6))
    users = [int(k.split()[0]) for k in throughput_results.keys()]
    throughputs = [v["mean"] for v in throughput_results.values()]
    
    plt.plot(users, throughputs, marker='o')
    plt.xlabel("Concurrent Users")
    plt.ylabel("Throughput (requests/second)")
    plt.title("API Throughput Scaling")
    plt.grid(True)
    plt.savefig(BENCHMARK_OUTPUT_DIR / 'api_throughput_scaling.png')
    
    # Plot latency results
    plt.figure(figsize=(10, 6))
    latencies = [v["mean"] for v in latency_results.values()]
    
    plt.plot(users, latencies, marker='o')
    plt.xlabel("Concurrent Users")
    plt.ylabel("P95 Latency (seconds)")
    plt.title("API Latency Scaling")
    plt.grid(True)
    plt.savefig(BENCHMARK_OUTPUT_DIR / 'api_latency_scaling.png')


if __name__ == "__main__":
    # This allows running just this test file directly
    pytest.main(["-v", __file__]) 