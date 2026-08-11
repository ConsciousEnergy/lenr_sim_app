"""
Remove broken NumPy / SciPy installs so a clean pip reinstall can succeed.

Windows venvs occasionally end up with a hybrid NumPy tree (``numpy.core`` from
1.x + ``numpy._core`` from 2.x). That breaks ``ndarray.__repr__`` and 500s
``/api/unified/bubble-lattice`` inside SciPy's BDF stepper.

Run from ``LENR_SIM_APP_v2/backend`` with the venv active:

    python repair_numeric_stack.py
    pip install --force-reinstall --no-cache-dir numpy==1.26.4 scipy==1.14.1
"""

from __future__ import annotations

import glob
import os
import shutil
import sys


def _site_packages() -> str:
    prefix = sys.prefix
    candidates = [
        os.path.join(prefix, "Lib", "site-packages"),
        os.path.join(prefix, "lib", "site-packages"),
        os.path.join(prefix, "lib64", "site-packages"),
    ]
    for path in candidates:
        if os.path.isdir(path):
            return path
    raise SystemExit(f"Could not find site-packages under {prefix}")


def _remove_path(path: str, removed: list[str]) -> None:
    if not os.path.exists(path):
        return
    try:
        if os.path.isdir(path) and not os.path.islink(path):
            shutil.rmtree(path)
        else:
            os.remove(path)
        removed.append(path)
        print("Removed:", path)
    except Exception as exc:
        raise SystemExit(f"Failed to remove {path}: {exc}") from exc


def main() -> int:
    site_packages = _site_packages()
    removed: list[str] = []

    for package in ("numpy", "scipy"):
        _remove_path(os.path.join(site_packages, package), removed)
        for dist_info in glob.glob(os.path.join(site_packages, f"{package}-*.dist-info")):
            _remove_path(dist_info, removed)
        for egg in glob.glob(os.path.join(site_packages, f"{package}-*.egg-info")):
            _remove_path(egg, removed)

    # Orphaned NumPy 2 shim packages sometimes left behind after partial upgrades.
    for orphan in ("numpy.libs", "scipy.libs"):
        _remove_path(os.path.join(site_packages, orphan), removed)

    if removed:
        print("Done. Reinstall with:")
        print(
            "  pip install --force-reinstall --no-cache-dir "
            "numpy==1.26.4 scipy==1.14.1"
        )
        print("  pip install -r requirements.txt")
    else:
        print("No numpy/scipy folders found. Try a force-reinstall anyway:")
        print(
            "  pip install --force-reinstall --no-cache-dir "
            "numpy==1.26.4 scipy==1.14.1"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
