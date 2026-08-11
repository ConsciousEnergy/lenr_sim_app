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
