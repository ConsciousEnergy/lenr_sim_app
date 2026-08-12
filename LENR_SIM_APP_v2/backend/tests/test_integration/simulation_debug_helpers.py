"""Shared helpers for the ``simulation_debug`` HTTP smoke suite."""

from __future__ import annotations

import math
from typing import Any, Iterable

from fastapi.testclient import TestClient


def client() -> TestClient:
    from app.main import app

    return TestClient(app)


def assert_finite(value: Any, name: str) -> float:
    assert isinstance(value, (int, float)), f"{name} not numeric: {value!r}"
    number = float(value)
    assert math.isfinite(number), f"{name} not finite: {number}"
    return number


def assert_positive(value: Any, name: str) -> float:
    number = assert_finite(value, name)
    assert number > 0.0, f"{name} must be > 0, got {number}"
    return number


def assert_non_negative(value: Any, name: str) -> float:
    number = assert_finite(value, name)
    assert number >= 0.0, f"{name} must be >= 0, got {number}"
    return number


def assert_all_finite(values: Iterable[Any], name: str) -> None:
    for index, value in enumerate(values):
        assert_finite(value, f"{name}[{index}]")


def unified_payload() -> dict:
    return {
        "material": {"host_material": "palladium", "reactant": "deuterium"},
        "environmental": {"temperature": 320.0, "pressure": 101325.0},
        "lattice": {"loading_ratio": 0.9},
        "time_steps": 10,
        "total_time": 1.0,
    }


def bubble_payload() -> dict:
    """Matches the Windows start_app.bat reproduction payload."""
    return {
        "bubble": {
            "initial_radius_um": 9.99,
            "driving_pressure_bar": 1.5,
            "frequency_khz": 20.0,
            "ambient_temperature_k": 300.0,
        },
        "material": {"host_material": "palladium", "reactant": "deuterium"},
        "lattice": {
            "loading_ratio": 0.9,
            "defect_density": 1e16,
            "surface_roughness": 5e-9,
        },
        "num_cycles": 2,
    }


def theory_conditions() -> dict:
    return {
        "temperature": 300.0,
        "loading_ratio": 0.9,
        "pressure": 101325.0,
        "electron_density": 6.8e28,
    }
