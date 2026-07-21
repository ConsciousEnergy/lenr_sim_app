"""Klein-Gordon / Rayleigh-Plesset (KG-RP) harmonic-locking coupling.

Implements the cavitation-field coupling explored by Mulnix, *Structural Theory
of Sonoluminescence via Klein-Gordon / Rayleigh-Plesset Harmonic Locking*
(2026, doi:10.5281/zenodo.19079074, key ``mulnix2026``), as a **diagnostic and
hypothesis layer** on top of the existing Rayleigh-Plesset (RP) solver. It is
deliberately non-invasive: nothing here changes the RP dynamics or the
reaction-rate magnitude. Outputs are explicitly tagged
``claim_tier = "speculative_exploratory"``.

Two layers (plan Phase 6):
- **6a diagnostics** (`compute_kgrp_diagnostics`): given an RP radius trace and
  the acoustic drive frequency, compute dimensionless invariants, the dominant
  collapse harmonic, the harmonic-locking ratio, and the detuning. These are
  read-only diagnostics of an already-computed RP solution.
- **6b coupled field** (`integrate_coupled_kg_field`): a single driven
  Klein-Gordon mode forced by the bubble-wall acceleration, integrated to
  estimate energy localised in the field. This is the falsifiable
  MeV-gap-down-conversion *hypothesis*, not an established result.

See docs/REVIEW_2026/MEV_GAP_HYPOTHESIS.md for the falsifiable predictions.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

import numpy as np
from scipy import constants as const
from scipy.integrate import odeint

CLAIM_TIER = "speculative_exploratory"
REFERENCES = ["mulnix2026", "hagelstein2025"]


@dataclass(frozen=True)
class KGRPDiagnostics:
    """Harmonic-locking diagnostics for an RP collapse trace."""

    drive_frequency_hz: float
    collapse_frequency_hz: float
    locking_ratio: float          # collapse_freq / drive_freq
    nearest_integer_harmonic: int
    detuning: float               # fractional distance to nearest integer lock
    is_locked: bool
    compression_invariant: float  # R0 / R_min (dimensionless)
    mach_invariant: float         # |R_dot|_max / c_sound
    claim_tier: str = CLAIM_TIER
    references: List[str] = field(default_factory=lambda: list(REFERENCES))
    notes: str = ""

    def as_dict(self) -> Dict[str, object]:
        return {
            "drive_frequency_hz": float(self.drive_frequency_hz),
            "collapse_frequency_hz": float(self.collapse_frequency_hz),
            "locking_ratio": float(self.locking_ratio),
            "nearest_integer_harmonic": int(self.nearest_integer_harmonic),
            "detuning": float(self.detuning),
            "is_locked": bool(self.is_locked),
            "compression_invariant": float(self.compression_invariant),
            "mach_invariant": float(self.mach_invariant),
            "claim_tier": self.claim_tier,
            "references": list(self.references),
            "notes": self.notes,
        }


def _dominant_frequency(signal: np.ndarray, dt: float) -> float:
    """Return the dominant non-DC frequency (Hz) of a real signal via rFFT."""
    if signal.size < 4 or dt <= 0:
        return 0.0
    detrended = signal - np.mean(signal)
    spectrum = np.abs(np.fft.rfft(detrended))
    freqs = np.fft.rfftfreq(signal.size, d=dt)
    if spectrum.size <= 1:
        return 0.0
    peak = int(np.argmax(spectrum[1:]) + 1)  # skip DC
    return float(freqs[peak])


def compute_kgrp_diagnostics(
    time_series: np.ndarray,
    radius_series: np.ndarray,
    drive_frequency_hz: float,
    *,
    sound_speed_m_s: float = 1500.0,
    lock_tolerance: float = 0.1,
) -> KGRPDiagnostics:
    """Compute harmonic-locking diagnostics for an RP collapse trace (6a, RORO).

    Locking is reported when the collapse response sits within ``lock_tolerance``
    of an integer multiple of the drive frequency (n:1 sub/super-harmonic lock).
    """
    t = np.asarray(time_series, dtype=float)
    r = np.asarray(radius_series, dtype=float)
    if t.size < 4 or r.size != t.size:
        return KGRPDiagnostics(
            drive_frequency_hz=float(drive_frequency_hz),
            collapse_frequency_hz=0.0, locking_ratio=0.0,
            nearest_integer_harmonic=0, detuning=1.0, is_locked=False,
            compression_invariant=1.0, mach_invariant=0.0,
            notes="Insufficient samples for diagnostics.",
        )

    dt = float(np.mean(np.diff(t)))
    collapse_freq = _dominant_frequency(r, dt)
    drive = max(float(drive_frequency_hz), 1e-30)
    locking_ratio = collapse_freq / drive
    nearest = int(round(locking_ratio)) if locking_ratio > 0 else 0
    detuning = abs(locking_ratio - nearest) if nearest > 0 else 1.0
    is_locked = nearest >= 1 and detuning <= lock_tolerance

    r_min = max(float(np.min(r)), 1e-30)
    compression = float(np.max(r)) / r_min
    r_dot = np.gradient(r, dt)
    mach = float(np.max(np.abs(r_dot))) / max(sound_speed_m_s, 1e-30)

    return KGRPDiagnostics(
        drive_frequency_hz=drive,
        collapse_frequency_hz=collapse_freq,
        locking_ratio=locking_ratio,
        nearest_integer_harmonic=nearest,
        detuning=detuning,
        is_locked=is_locked,
        compression_invariant=compression,
        mach_invariant=mach,
        notes=(
            "Harmonic-locking diagnostics (Mulnix KG-RP). Speculative: locking "
            "is a necessary-not-sufficient condition for the MeV-gap hypothesis."
        ),
    )


@dataclass(frozen=True)
class KGFieldResult:
    """Outcome of integrating a driven Klein-Gordon mode (6b)."""

    field_energy_max: float       # arbitrary (model) units
    field_energy_final: float
    resonant_gain: float          # energy gain vs unforced baseline
    detuning: float
    claim_tier: str = CLAIM_TIER
    references: List[str] = field(default_factory=lambda: list(REFERENCES))
    notes: str = ""

    def as_dict(self) -> Dict[str, object]:
        return {
            "field_energy_max": float(self.field_energy_max),
            "field_energy_final": float(self.field_energy_final),
            "resonant_gain": float(self.resonant_gain),
            "detuning": float(self.detuning),
            "claim_tier": self.claim_tier,
            "references": list(self.references),
            "notes": self.notes,
        }


def integrate_coupled_kg_field(
    time_series: np.ndarray,
    radius_series: np.ndarray,
    *,
    kg_frequency_hz: float,
    coupling_strength: float = 1.0,
    damping: float = 0.05,
) -> KGFieldResult:
    """Integrate one driven, damped Klein-Gordon mode forced by RP dynamics (6b).

    Model: ``phi'' + 2*damping*omega*phi' + omega^2 phi = g * a_wall(t)`` where
    ``a_wall`` is the bubble-wall acceleration. This is a *minimal* coupled
    oscillator used to test the harmonic-locking energy-localisation hypothesis;
    it does not assert a physical down-conversion magnitude.
    """
    t = np.asarray(time_series, dtype=float)
    r = np.asarray(radius_series, dtype=float)
    if t.size < 4 or r.size != t.size:
        return KGFieldResult(0.0, 0.0, 1.0, 1.0, notes="Insufficient samples.")

    dt = float(np.mean(np.diff(t)))
    omega = 2.0 * np.pi * max(kg_frequency_hz, 1e-30)
    r_dot = np.gradient(r, dt)
    a_wall = np.gradient(r_dot, dt)
    # Normalise forcing so the result is a dimensionless model gain.
    scale = np.max(np.abs(a_wall)) or 1.0
    forcing = a_wall / scale

    def _interp_force(tau: float) -> float:
        return float(np.interp(tau, t, forcing))

    def _rhs(y, tau):
        phi, phi_dot = y
        f = coupling_strength * _interp_force(tau)
        phi_ddot = f - 2.0 * damping * omega * phi_dot - omega**2 * phi
        return [phi_dot, phi_ddot]

    sol = odeint(_rhs, [0.0, 0.0], t, rtol=1e-6, atol=1e-9)
    phi, phi_dot = sol[:, 0], sol[:, 1]
    energy = 0.5 * (phi_dot**2 + (omega * phi) ** 2)

    # Baseline: same forcing far off-resonance (10x higher KG frequency).
    omega_off = 10.0 * omega

    def _rhs_off(y, tau):
        p, pd = y
        f = coupling_strength * _interp_force(tau)
        return [pd, f - 2.0 * damping * omega_off * pd - omega_off**2 * p]

    sol_off = odeint(_rhs_off, [0.0, 0.0], t, rtol=1e-6, atol=1e-9)
    energy_off = 0.5 * (sol_off[:, 1] ** 2 + (omega_off * sol_off[:, 0]) ** 2)
    gain = float(np.max(energy) / max(np.max(energy_off), 1e-30))

    collapse_freq = _dominant_frequency(r, dt)
    detuning = abs(kg_frequency_hz - collapse_freq) / max(kg_frequency_hz, 1e-30)

    return KGFieldResult(
        field_energy_max=float(np.max(energy)),
        field_energy_final=float(energy[-1]),
        resonant_gain=gain,
        detuning=detuning,
        notes=(
            "Driven KG mode forced by bubble-wall acceleration (Mulnix KG-RP). "
            "Resonant_gain>1 indicates energy localisation near harmonic lock; "
            "this is a falsifiable hypothesis, NOT a validated down-conversion."
        ),
    )


__all__ = [
    "KGRPDiagnostics",
    "KGFieldResult",
    "compute_kgrp_diagnostics",
    "integrate_coupled_kg_field",
]
