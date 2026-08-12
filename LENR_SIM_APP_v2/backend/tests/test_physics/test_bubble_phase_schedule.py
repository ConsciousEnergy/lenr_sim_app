"""Tests for the stable bubble-cycle phase schedule."""

from app.physics_engine.bubble_phase_schedule import (
    CANONICAL_PHASES,
    expected_phase_sequence,
    normalize_phase_name,
    phase_from_cycle_fraction,
)


def test_canonical_order_is_expansion_collapse_minimum_rebound():
    assert expected_phase_sequence(80) == [
        "EXPANSION",
        "COLLAPSE",
        "MINIMUM",
        "REBOUND",
    ]


def test_recovery_aliases_to_expansion():
    assert normalize_phase_name("RECOVERY") == "EXPANSION"
    assert normalize_phase_name("recovery") == "EXPANSION"


def test_cycle_wraps_to_expansion():
    assert phase_from_cycle_fraction(0.0) == "EXPANSION"
    assert phase_from_cycle_fraction(0.999) == "REBOUND"
    assert phase_from_cycle_fraction(1.0) == "EXPANSION"


def test_all_schedule_samples_are_canonical():
    for i in range(100):
        assert phase_from_cycle_fraction(i / 100) in CANONICAL_PHASES
