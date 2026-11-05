"""
Literature-anchored collapse reporting bounds.

Each limit distinguishes:

- ``value_raw`` — adiabatic closed-form (or integrated peak) from the active solver
- ``calculated_bound`` — literature- or trajectory-derived upper bound
- ``value`` — reported quantity, ``min(value_raw, calculated_bound)``
- ``is_saturated`` — ``value_raw`` exceeds the calculated bound

See ``PHYSICS_EQUATION_VERIFICATION.md`` §9A.5 and IR ``EQ-BBL-LIM-01``.
"""

from __future__ import annotations

from typing import Any, Dict

from app.physics.bubble_collapse import REGIME_TEMPERATURE_PROVENANCE

# Flannigan & Suslick Nature 2005 emission band upper (K)
_EMISSION_BAND_UPPER_K = 1.5e4
# Moss et al. JASA 1996 peak ion temperature (K)
_MOSS_ION_CEILING_K = 2.0e6
# Sonoluminescence shock-pressure literature bound (Pa)
_SHOCK_PRESSURE_CEILING_PA = 1.0e10

_COMPRESSIBILITY_MACH_THRESHOLD = 0.3

# Public Nat-scale anchors for Lean ↔ Python agreement (EQ-BBL-BOUND-01).
EMISSION_BAND_UPPER_K = _EMISSION_BAND_UPPER_K
MOSS_ION_CEILING_K = _MOSS_ION_CEILING_K
SHOCK_PRESSURE_CEILING_PA = _SHOCK_PRESSURE_CEILING_PA
COMPRESSIBILITY_MACH_THRESHOLD = _COMPRESSIBILITY_MACH_THRESHOLD


def temperature_calculated_bound_k(
    *,
    peak_mach: float,
    dynamics_mode: str,
) -> Dict[str, Any]:
    """Select a temperature bound from compressibility regime and solver mode."""
    mode = str(dynamics_mode or "rayleigh_plesset").lower()
    if peak_mach < _COMPRESSIBILITY_MACH_THRESHOLD and mode == "rayleigh_plesset":
        return {
            "calculated_bound_k": float(_EMISSION_BAND_UPPER_K),
            "basis": "emission_band",
            "citation": REGIME_TEMPERATURE_PROVENANCE["single_bubble"]["measured_citation"],
        }
    basis = (
        "moss_ion_ceiling"
        if peak_mach >= _COMPRESSIBILITY_MACH_THRESHOLD
        else "km_compressibility"
    )
    return {
        "calculated_bound_k": float(_MOSS_ION_CEILING_K),
        "basis": basis,
        "citation": REGIME_TEMPERATURE_PROVENANCE["single_bubble"]["simulation_citation"],
    }


def pressure_calculated_bound_pa(*, pressure_raw_pa: float) -> Dict[str, Any]:
    """Adiabatic pressure at hard core, capped at the shock literature limit."""
    raw = float(pressure_raw_pa)
    saturated = raw > _SHOCK_PRESSURE_CEILING_PA
    return {
        "calculated_bound_pa": min(raw, _SHOCK_PRESSURE_CEILING_PA),
        "basis": "sonoluminescence_shock_limit" if saturated else "adiabatic_at_hard_core",
        "citation": "Brenner, Hilgenfeldt & Lohse, Rev. Mod. Phys. 74, 425 (2002)",
        "is_saturated": saturated,
    }


def build_reporting_limits(
    *,
    temperature_raw_k: float,
    pressure_raw_pa: float,
    compression_ratio: float,
    max_compression_ratio: float,
    peak_mach: float,
    dynamics_mode: str,
) -> Dict[str, Any]:
    """Build the ``limits`` block for ``simulate_collapse`` / API responses."""
    temp_meta = temperature_calculated_bound_k(
        peak_mach=peak_mach,
        dynamics_mode=dynamics_mode,
    )
    t_bound = temp_meta["calculated_bound_k"]
    t_value = min(float(temperature_raw_k), t_bound)

    p_meta = pressure_calculated_bound_pa(pressure_raw_pa=pressure_raw_pa)
    p_bound = p_meta["calculated_bound_pa"]
    p_value = min(float(pressure_raw_pa), p_bound)

    compression_saturated = float(compression_ratio) >= float(max_compression_ratio)

    return {
        "temperature_k": {
            "value": float(t_value),
            "value_raw": float(temperature_raw_k),
            "calculated_bound_k": float(t_bound),
            "ceiling": float(t_bound),
            "is_saturated": bool(float(temperature_raw_k) > t_bound),
            "basis": temp_meta["basis"],
            "citation": temp_meta["citation"],
        },
        "pressure_pa": {
            "value": float(p_value),
            "value_raw": float(pressure_raw_pa),
            "calculated_bound_pa": float(p_bound),
            "ceiling": float(_SHOCK_PRESSURE_CEILING_PA),
            "is_saturated": bool(p_meta["is_saturated"]),
            "basis": p_meta["basis"],
            "citation": p_meta["citation"],
        },
        "compression_ratio": {
            "value": float(compression_ratio),
            "calculated_bound": float(max_compression_ratio),
            "ceiling": float(max_compression_ratio),
            "is_saturated": bool(compression_saturated),
            "basis": "van der Waals hard-core radius floor on R_min",
        },
    }
