"""
Canonical bubble-cycle phase schedule for timeline / visualization labels.

Physical radius still comes from the Rayleigh–Plesset trajectory; phase *names*
follow a stable visual cycle so the UI does not flicker EXPANSION↔COLLAPSE when
the wall velocity changes sign during growth.

Order (then repeats):
  EXPANSION → COLLAPSE → MINIMUM → REBOUND → EXPANSION → …

``RECOVERY`` is retained only as a deprecated alias of ``EXPANSION`` for older
clients / cached payloads.
"""

from __future__ import annotations

from typing import List, Tuple

# (name, start_inclusive, end_exclusive) fractions of one acoustic / visual cycle.
PHASE_SCHEDULE: Tuple[Tuple[str, float, float], ...] = (
    ("EXPANSION", 0.00, 0.45),
    ("COLLAPSE", 0.45, 0.70),
    ("MINIMUM", 0.70, 0.80),
    ("REBOUND", 0.80, 1.00),
)

CANONICAL_PHASES = ("EXPANSION", "COLLAPSE", "MINIMUM", "REBOUND")

# Centre of the MINIMUM segment; the physical minimum-radius instant of an
# integrated trajectory is anchored here (see ``anchor_cycle_fraction``).
_MINIMUM_SEGMENT = next(seg for seg in PHASE_SCHEDULE if seg[0] == "MINIMUM")
MINIMUM_CENTER = (_MINIMUM_SEGMENT[1] + _MINIMUM_SEGMENT[2]) / 2.0


def normalize_phase_name(phase: str) -> str:
    """Map legacy labels onto the canonical four-phase cycle."""
    name = (phase or "EXPANSION").strip().upper()
    if name == "RECOVERY":
        return "EXPANSION"
    if name in CANONICAL_PHASES:
        return name
    return "EXPANSION"


def phase_from_cycle_fraction(cycle_fraction: float) -> str:
    """Return the phase name for a position in [0, 1) of one cycle."""
    frac = float(cycle_fraction) % 1.0
    if frac < 0.0:
        frac += 1.0
    for name, start, end in PHASE_SCHEDULE:
        if start <= frac < end:
            return name
    # frac == 1.0 after modulo is 0.0; keep rebound closed at the end.
    return "REBOUND"


def anchor_cycle_fraction(cycle_fraction: float, minimum_fraction: float) -> float:
    """Remap one cycle so the physical minimum lands at ``MINIMUM_CENTER``.

    The fixed schedule alone can label the trajectory's true minimum-radius
    instant as COLLAPSE or REBOUND when the integrated collapse does not sit
    at 75% of the acoustic period. This monotonic piecewise-linear map keeps
    the stable EXPANSION→COLLAPSE→MINIMUM→REBOUND order (0 maps to 0, 1 to 1)
    while guaranteeing ``minimum_fraction`` maps into the MINIMUM segment.

    Args:
        cycle_fraction: Position in [0, 1) of one acoustic cycle.
        minimum_fraction: Cycle fraction at which the trajectory radius is
            minimal.

    Returns:
        Remapped cycle fraction to feed ``phase_from_cycle_fraction``.
    """
    frac = float(cycle_fraction) % 1.0
    if frac < 0.0:
        frac += 1.0
    # Keep both linear pieces well-defined even for a minimum at a cycle edge.
    m = min(max(float(minimum_fraction) % 1.0, 1e-3), 1.0 - 1e-3)
    if frac <= m:
        return frac * (MINIMUM_CENTER / m)
    return MINIMUM_CENTER + (frac - m) * ((1.0 - MINIMUM_CENTER) / (1.0 - m))


def phase_progress_in_cycle(cycle_fraction: float) -> float:
    """0–1 progress within the current phase segment."""
    frac = float(cycle_fraction) % 1.0
    if frac < 0.0:
        frac += 1.0
    for _name, start, end in PHASE_SCHEDULE:
        if start <= frac < end:
            width = max(end - start, 1e-12)
            return (frac - start) / width
    return 1.0


def expected_phase_sequence(samples: int = 40) -> List[str]:
    """Unique phase order walking one full cycle (for tests / docs)."""
    sequence: List[str] = []
    for index in range(max(2, samples)):
        phase = phase_from_cycle_fraction(index / samples)
        if not sequence or sequence[-1] != phase:
            sequence.append(phase)
    return sequence
