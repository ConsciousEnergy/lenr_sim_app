"""Tests for KG-RP harmonic-locking diagnostics and coupled field (Phase 6)."""

import numpy as np
import pytest

from app.physics_engine.cavitation_kgrp import (
    compute_kgrp_diagnostics,
    integrate_coupled_kg_field,
)


def _trace(freq_hz: float, n_cycles: int = 8, n_per_cycle: int = 256):
    period = 1.0 / freq_hz
    t = np.linspace(0.0, n_cycles * period, n_cycles * n_per_cycle)
    # Radius oscillation at the drive frequency (idealised RP response).
    r = 10e-6 * (1.0 + 0.5 * np.sin(2 * np.pi * freq_hz * t))
    return t, r


def test_diagnostics_detect_one_to_one_lock() -> None:
    f = 20_000.0
    t, r = _trace(f)
    diag = compute_kgrp_diagnostics(t, r, drive_frequency_hz=f)
    assert diag.nearest_integer_harmonic == 1
    assert diag.detuning <= 0.1
    assert diag.is_locked is True
    assert diag.claim_tier == "speculative_exploratory"
    assert "mulnix2026" in diag.references


def test_diagnostics_report_detuning_when_unlocked() -> None:
    f = 20_000.0
    t, r = _trace(f)
    # Drive at a frequency far from the response -> large locking ratio, detuned.
    diag = compute_kgrp_diagnostics(t, r, drive_frequency_hz=f * 2.7)
    assert diag.is_locked is False
    assert diag.detuning > 0.0


def test_diagnostics_handle_short_input_gracefully() -> None:
    diag = compute_kgrp_diagnostics(np.array([0.0]), np.array([1e-6]), 1e4)
    assert diag.is_locked is False
    assert diag.collapse_frequency_hz == 0.0


def test_coupled_field_resonant_gain_exceeds_offresonance() -> None:
    """Energy localises near the collapse harmonic (P2 falsifiable prediction)."""
    f = 20_000.0
    t, r = _trace(f)
    res = integrate_coupled_kg_field(t, r, kg_frequency_hz=f)
    assert res.resonant_gain > 1.0
    assert res.claim_tier == "speculative_exploratory"
    assert np.isfinite(res.field_energy_max)


def test_coupled_field_off_resonance_has_low_gain() -> None:
    f = 20_000.0
    t, r = _trace(f)
    res = integrate_coupled_kg_field(t, r, kg_frequency_hz=f * 5.0)
    assert res.detuning > 0.5
