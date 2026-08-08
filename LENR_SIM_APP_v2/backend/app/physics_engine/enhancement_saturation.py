"""
Enhancement Saturation Reporting
=================================

The enhancement breakdown returned by
:meth:`BubbleLatticeInteraction._calculate_enhancement_breakdown` is reported to
clients under a theory-level display ceiling (``MAX_ENHANCEMENT_FACTOR``). Simply
clamping every mechanism to that ceiling makes physically unrelated mechanisms
print the identical number: at a compression ratio of 1000 and a peak field of
1e14 V/m, the QED, Casimir, Rydberg and compression terms all overshoot 1e5, so a
naive clamp renders them all as ``1.0000e+5`` and the breakdown stops carrying
any information.

This module keeps the ceiling (it is a claim-tier governance limit, not a physics
result) but reports honestly against it: each mechanism carries the clamped
value actually displayed, the raw uncapped value, and an explicit
``is_saturated`` flag so a UI can label a saturated cell as a display ceiling
rather than a prediction.

The raw combined total is accumulated in log10 space. The product of all
mechanisms reaches ~1e37 under peak conditions and can overflow float64 in
extreme parameter corners, so ``log10_value_raw`` stays finite where
``value_raw`` cannot.
"""

import math
from typing import Any, Dict, Tuple

from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR

# Mechanisms whose product forms the combined "total" enhancement. Order matches
# the multiplication in _calculate_enhancement_breakdown.
MECHANISM_KEYS: Tuple[str, ...] = (
    "screening",
    "phonon",
    "qed",
    "casimir",
    "rydberg",
    "compression",
    "loading",
)

TOTAL_KEY = "total"

# Relative tolerance when deciding whether a value sits at the ceiling. A value
# computed as exactly the ceiling is reported as saturated, since it is
# indistinguishable from a clamped one.
_SATURATION_RTOL = 1e-9


def _is_saturated(raw: float, ceiling: float) -> bool:
    if not math.isfinite(raw):
        return True
    return raw >= ceiling * (1.0 - _SATURATION_RTOL)


def _safe_log10(value: float) -> float:
    """log10 that tolerates zero/negative/non-finite mechanism values."""
    if not math.isfinite(value):
        return math.inf
    if value <= 0.0:
        return 0.0
    return math.log10(value)


def build_saturation_report(
    raw_breakdown: Dict[str, Any],
    ceiling: float = MAX_ENHANCEMENT_FACTOR,
) -> Tuple[Dict[str, float], Dict[str, Any]]:
    """Split a raw enhancement breakdown into displayed values plus provenance.

    Args:
        raw_breakdown: Output of ``_calculate_enhancement_breakdown``. Individual
            mechanisms are uncapped; ``total`` is already clamped there, so the
            raw total is recomputed here from the mechanism product.
        ceiling: Display ceiling applied to every reported value.

    Returns:
        ``(capped, report)`` where ``capped`` preserves the original flat
        ``{mechanism: float}`` shape for existing clients, and ``report``
        describes what was clamped.
    """
    capped: Dict[str, float] = {}
    mechanisms: Dict[str, Dict[str, Any]] = {}

    # Raw total is the mechanism product, accumulated in log space so it survives
    # parameter corners where the linear product overflows.
    log10_total_raw = 0.0
    for key in MECHANISM_KEYS:
        log10_total_raw += _safe_log10(float(raw_breakdown.get(key, 1.0) or 1.0))

    total_raw_linear = math.inf
    if log10_total_raw < 300.0:
        total_raw_linear = 10.0 ** log10_total_raw

    for key, raw_value in raw_breakdown.items():
        if not isinstance(raw_value, (int, float)) or isinstance(raw_value, bool):
            # Pass non-numeric entries through untouched.
            capped[key] = raw_value
            continue

        raw_float = float(raw_value)
        if key == TOTAL_KEY:
            # _calculate_enhancement_breakdown already clamped total; use the
            # recomputed product as the raw value.
            raw_float = total_raw_linear
            log10_raw = log10_total_raw
        else:
            log10_raw = _safe_log10(raw_float)

        saturated = _is_saturated(raw_float, ceiling)
        display = float(ceiling) if saturated else raw_float

        capped[key] = display
        mechanisms[key] = {
            "value": display,
            "value_raw": raw_float if math.isfinite(raw_float) else None,
            "log10_value_raw": log10_raw if math.isfinite(log10_raw) else None,
            "is_saturated": saturated,
            "ceiling": float(ceiling),
        }

    saturated_keys = sorted(k for k, m in mechanisms.items() if m["is_saturated"])
    report: Dict[str, Any] = {
        "ceiling": float(ceiling),
        "any_saturated": bool(saturated_keys),
        "saturated_mechanisms": saturated_keys,
        "mechanisms": mechanisms,
        "note": (
            "Saturated entries are reported at the claim-tier display ceiling and "
            "are not physical predictions; read log10_value_raw for the "
            "uncapped model output."
        ),
    }
    return capped, report
