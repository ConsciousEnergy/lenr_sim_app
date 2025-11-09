# LENR Simulation Application Tests

This directory contains automated tests for the LENR Simulation Application.

## Test Structure

The tests are organized by module:

- `test_advanced_physics.py`: Tests for advanced physics calculations.
- `test_unified_theory.py`: Tests for unified theory models.
- `test_tunneling_engine.py`: Tests for parallel tunneling calculations.
- `performance/`: Performance benchmarking tests:
  - `test_reaction_rate_performance.py`: Benchmarks for reaction rate calculations
  - `test_tunneling_performance.py`: Benchmarks for tunneling probability calculations
- `multi_physics/`: Tests for the multi-physics coupling interface:
  - `test_domain_interface.py`: Tests for the `DomainInterface` class.
  - `test_state_repository.py`: Tests for the `StateRepository` class.
  - `test_domain_coupler.py`: Tests for the `DomainCoupler` class.
  - `test_domain_manager.py`: Tests for the `PhysicsDomainManager` class.
  - `test_integration.py`: Integration tests for the multi-physics coupling framework.

## Running Tests

### Run All Tests

To run all tests, execute:

```bash
cd backend
python -m pytest
```

### Run Performance Tests

To run performance benchmarks:

```bash
cd backend
python -m pytest tests/performance/ --benchmark-only
```

### Run a Specific Test File

To run a specific test file, execute:

```bash
cd backend
python -m pytest tests/test_file_name.py
```

For example:

```bash
python -m pytest tests/test_tunneling_engine.py
```

### Run Multi-Physics Suite

To run all multi-physics coupling tests, execute:

```bash
cd backend
python -m pytest tests/multi_physics/
```

## Writing Tests

When writing tests:

1. Create a new test file in the appropriate directory.
2. Import `pytest` and the modules to be tested.
3. Use pytest fixtures for setup and teardown.
4. Write test functions that start with `test_`.
5. Use assertions to verify expected behavior.
6. For performance tests, use the `@pytest.mark.benchmark` decorator.

Example:

```python
import pytest
from app.module_to_test import function_to_test

@pytest.fixture
def setup_data():
    return {"test_input": "value"}

def test_function_name(setup_data):
    result = function_to_test(setup_data["test_input"])
    assert result == expected_value

@pytest.mark.benchmark
def test_performance(benchmark):
    result = benchmark(function_to_test, input_value)
    assert result == expected_value
```

## Performance Benchmarking

The project includes comprehensive performance benchmarking for critical calculations:

- Reaction rate calculations
- Tunneling probability computations
- Parallel processing efficiency
- Memory usage optimization

Benchmarks are automatically run as part of the CI pipeline to track performance metrics over time.

## CI Integration

Tests are automatically run as part of the CI pipeline on each commit to ensure code quality and prevent regressions. The pipeline includes:

1. Unit tests
2. Integration tests
3. Performance benchmarks
4. Code coverage reporting
5. Parallel execution optimization checks 