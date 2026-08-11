"""Guard the NumPy/SciPy health check used by start_app / fix_scipy_venv."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

pytestmark = [pytest.mark.physics, pytest.mark.simulation_debug]

_BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from check_numeric_stack import check_numeric_stack  # noqa: E402


def test_numeric_stack_is_healthy_in_this_environment() -> None:
    ok, detail = check_numeric_stack()
    assert ok, detail
    assert "numpy=" in detail and "scipy=" in detail


def test_solve_collapse_maps_broken_numpy_repr_to_actionable_error(monkeypatch) -> None:
    """Reproduce the Windows RuntimeError fingerprint and require a repair hint."""
    import app.physics_engine.bubble_lattice_interaction as bli
    from app.physics_engine.bubble_lattice_interaction import BubbleLatticeInteraction

    def broken_solve_ivp(*_args, **_kwargs):
        raise RuntimeError("Unable to configure default ndarray.__repr__")

    monkeypatch.setattr(bli, "solve_ivp", broken_solve_ivp)
    monkeypatch.setattr(bli.sys, "platform", "win32")

    with pytest.raises(RuntimeError, match="fix_scipy_venv|numpy==1.26.4"):
        BubbleLatticeInteraction().simulate_collapse(num_cycles=1)
