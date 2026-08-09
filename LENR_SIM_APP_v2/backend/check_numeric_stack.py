"""
Health-check NumPy + SciPy for the bubble-lattice integrator.

A corrupted Windows venv (partial NumPy 1.x/2.x hybrid) surfaces as:

    AttributeError: module 'numpy.core.multiarray' has no attribute 'complexfloating'
    RuntimeError: Unable to configure default ndarray.__repr__

during ``scipy.integrate.solve_ivp(BDF)``. Catch that before uvicorn starts.

Exit codes:
  0 - stack is usable
  1 - stack is broken / unusable
"""

from __future__ import annotations

import sys


def check_numeric_stack() -> tuple[bool, str]:
    try:
        import numpy as np
    except Exception as exc:  # pragma: no cover - import failure is rare in CI
        return False, f"numpy import failed: {exc!r}"

    try:
        # Broken hybrid installs fail while configuring ndarray repr.
        sample = repr(np.asarray([1.0, 2.0], dtype=float))
        if "Unable to configure" in sample:
            return False, "numpy ndarray.__repr__ is broken"
    except Exception as exc:
        return False, f"numpy ndarray.__repr__ failed: {exc!r}"

    # NumPy 2 moved internals to ``numpy._core``. A half-upgraded tree often has
    # both ``numpy.core`` (1.x) and ``numpy._core`` (2.x) and then dies on
    # ``getattr(multiarray, 'complexfloating')`` inside ``_type_aliases``.
    # Detect that by forcing the same import chain the Windows traceback shows.
    try:
        import numpy._core.numerictypes  # noqa: F401
    except ModuleNotFoundError:
        pass  # NumPy 1.26 has no _core package — healthy for our pin.
    except Exception as exc:
        return False, f"numpy._core.numerictypes import failed (hybrid install): {exc!r}"

    try:
        import scipy
        from scipy.integrate import solve_ivp
    except Exception as exc:
        return False, f"scipy import failed: {exc!r}"

    try:
        solution = solve_ivp(
            fun=lambda t, y: -y,
            t_span=(0.0, 1e-3),
            y0=[1.0],
            method="BDF",
            rtol=1e-6,
            atol=1e-9,
        )
        if not solution.success:
            return False, f"BDF smoke solve failed: {solution.message}"
    except Exception as exc:
        return False, f"BDF smoke solve raised: {exc!r}"

    return True, f"ok numpy={np.__version__} scipy={scipy.__version__}"


def main() -> int:
    ok, detail = check_numeric_stack()
    if ok:
        print(f"[numeric-stack] {detail}")
        return 0
    print(f"[numeric-stack] BROKEN: {detail}", file=sys.stderr)
    print(
        "Repair with: backend\\fix_scipy_venv.bat "
        "(or: python repair_numeric_stack.py && "
        "pip install --force-reinstall --no-cache-dir numpy==1.26.4 scipy==1.14.1)",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
