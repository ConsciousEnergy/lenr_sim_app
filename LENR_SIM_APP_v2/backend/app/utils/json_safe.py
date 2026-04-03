"""
JSON-safe serialization helpers for API responses.

Converts numpy types (numpy.bool_, numpy.int64, numpy.float64, etc.)
to native Python types so responses serialize correctly.
"""

from __future__ import annotations

from typing import Any


def to_json_safe(obj: Any) -> Any:
    """
    Recursively convert numpy and other non-JSON-serializable types
    to native Python types.

    Handles: numpy.bool_, numpy.int*, numpy.float*, numpy.ndarray,
    and nested dicts/lists.
    """
    if obj is None:
        return None
    try:
        import numpy as np
        if isinstance(obj, np.bool_):
            return bool(obj)
        if isinstance(obj, (np.integer, np.int64, np.int32)):
            return int(obj)
        if isinstance(obj, (np.floating, np.float64, np.float32)):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
    except ImportError:
        pass

    if isinstance(obj, dict):
        return {k: to_json_safe(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [to_json_safe(v) for v in obj]
    return obj
