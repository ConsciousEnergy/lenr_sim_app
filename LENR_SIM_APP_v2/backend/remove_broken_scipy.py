"""
Backward-compatible wrapper around ``repair_numeric_stack``.

Historically this only deleted SciPy; the Windows failure mode now also
corrupts NumPy, so the repair removes both.
"""

from repair_numeric_stack import main


if __name__ == "__main__":
    raise SystemExit(main())
