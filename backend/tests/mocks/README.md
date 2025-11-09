# LENR Simulation Mocking Framework

This directory contains mock implementations of external dependencies used in the LENR simulation application. The mocks are designed to provide deterministic, controllable behavior for testing purposes.

## Available Mocks

### Redis Mock (`redis_mock.py`)
Mock implementation of Redis for testing caching and data persistence:
- Simulates basic Redis operations (get, set, delete, etc.)
- Supports hash operations (hget, hset, hgetall)
- Configurable latency for simulating network delays
- JSON serialization/deserialization support

```python
from tests.mocks import MockRedis

# Create mock with 5ms latency
redis = MockRedis(latency_ms=5.0)

# Basic operations
redis.set("key", "value")
value = redis.get("key")  # Returns b"value"

# Hash operations
redis.hset("hash", "field", "value")
value = redis.hget("hash", "field")  # Returns b"value"
```

### VTK/PyVista Mock (`vtk_mock.py`)
Mock implementation of VTK/PyVista for testing visualization components:
- Simulates basic VTK dataset operations
- Supports point/cell data management
- Provides camera and renderer control
- Simulates common visualization operations

```python
from tests.mocks import MockVTK

# Create mock VTK instance
vtk = MockVTK()

# Create a grid dataset
grid = vtk.create_grid(dimensions=(10, 10, 10))

# Add data to the grid
grid.add_point_data("temperature", temperature_data)

# Set camera position
vtk.set_camera(position=(1, 1, 1), focal_point=(0, 0, 0), view_up=(0, 0, 1))
```

### NumPy Mock (`numpy_mock.py`)
Mock implementation of NumPy for testing physics calculations:
- Provides deterministic random number generation
- Implements common array operations
- Includes physics calculation helpers
- Configurable random seed for reproducibility

```python
from tests.mocks import MockNumPy

# Create mock with fixed seed
numpy = MockNumPy(seed=42)

# Array operations
arr = numpy.array([1, 2, 3, 4, 5])
mean = arr.mean()  # Returns 3

# Physics calculations
prob = numpy.calculate_tunneling_probability(
    barrier_height=1.0,
    barrier_width=0.1,
    particle_energy=0.5
)
```

### HTTP Mock (`http_mock.py`)
Mock implementation of HTTP client for testing API interactions:
- Simulates HTTP requests (GET, POST, PUT, DELETE, PATCH)
- Configurable responses and status codes
- Request history tracking
- Configurable latency

```python
from tests.mocks import MockHTTPClient

# Create mock with 10ms latency
http = MockHTTPClient(latency_ms=10.0)

# Register mock response
http.register_response(
    "GET",
    "http://api.example.com/data",
    {"status": "success", "data": [1, 2, 3]}
)

# Make request
response = http.get("http://api.example.com/data")
data = response.json()  # Returns {"status": "success", "data": [1, 2, 3]}
```

## Using Mocks in Tests

The mocks are available as pytest fixtures in `conftest.py`. To use them in your tests:

```python
def test_caching(mock_redis):
    """Test caching functionality."""
    mock_redis.set("key", "value")
    assert mock_redis.get("key") == b"value"

def test_visualization(mock_vtk, mock_visualization_data):
    """Test visualization functionality."""
    grid = mock_vtk.create_grid(dimensions=(20, 20, 20))
    grid.add_point_data("scalar_field", mock_visualization_data["fields"]["scalar"])
    assert len(mock_vtk.get_datasets()) > 0

def test_physics(mock_numpy, mock_physics_constants):
    """Test physics calculations."""
    prob = mock_numpy.calculate_tunneling_probability(
        barrier_height=1.0,
        barrier_width=0.1,
        particle_energy=0.5
    )
    assert 0 <= prob <= 1

def test_api(mock_http):
    """Test API interactions."""
    mock_http.register_response("GET", "/api/data", {"status": "success"})
    response = mock_http.get("/api/data")
    assert response.status_code == 200
```

## Best Practices

1. **Deterministic Behavior**: Always set a fixed seed for random operations to ensure reproducible tests.

2. **Latency Simulation**: Use appropriate latency values to simulate realistic conditions without slowing down tests too much.

3. **Error Cases**: Test both success and error scenarios using the mocks.

4. **Clean State**: Use fixture scoping appropriately to ensure a clean state for each test.

5. **Realistic Data**: Use the provided mock data fixtures (`mock_simulation_result`, `mock_visualization_data`, etc.) for realistic test data.

## Adding New Mocks

When adding new mock implementations:

1. Create a new file in the `mocks` directory
2. Add the mock class to `__init__.py`
3. Add corresponding fixtures to `conftest.py`
4. Add tests demonstrating usage
5. Update this README with documentation

## Testing the Mocks

The mocks themselves are tested in `test_mocking.py`. Run the tests using:

```bash
pytest tests/test_mocking.py -v
``` 