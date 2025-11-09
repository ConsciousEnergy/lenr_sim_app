"""Test all imports to ensure they are working correctly."""

def test_core_imports():
    """Test core module imports."""
    from app.core import logging
    assert logging is not None

def test_physics_imports():
    """Test physics module imports."""
    from app.physics import enhancement_factors, parallel
    assert enhancement_factors is not None
    assert parallel is not None

def test_visualization_imports():
    """Test visualization module imports."""
    from app.visualization import field_visualizer
    assert field_visualizer is not None

def test_services_imports():
    """Test services module imports."""
    from app.services import cache_service, http_service
    assert cache_service is not None
    assert http_service is not None

def test_package_imports():
    """Test external package imports."""
    import numpy as np
    import numba
    import memory_profiler
    assert np is not None
    assert numba is not None
    assert memory_profiler is not None

if __name__ == "__main__":
    test_core_imports()
    test_physics_imports()
    test_visualization_imports()
    test_services_imports()
    test_package_imports()
    print("All import tests passed!") 