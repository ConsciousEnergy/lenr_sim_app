"""
Canonical electron-screening enhancement kernel.

Three incompatible screening models existed for the same physics:

============================  ==================================================
``bubble_lattice_interaction``  (legacy) ``exp(min(U_Debye / E_thermal, 9.2))``
``unified_lenr_model/screening``  (legacy) Gamow form capped at ``1e6``
``theories/electron_screening``   Thomas-Fermi with cited material ranges
============================  ==================================================

Both production callers above now route through this kernel.

The bubble-lattice form was the worst of the three: it derived its potential from
a Debye length rather than a measured screening potential, so
``LatticeParameters.screening_potential`` (800 eV for Pd, 300 eV for Li) was
stored and never read and every host screened identically. Its ``9.2`` exponent
cap was a magic number (``exp(9.2) ~ 1e4``) unrelated to the documented
``MAX_ENHANCEMENT_FACTOR`` governance ceiling of ``1e5``.

This module provides one kernel used by the bubble-lattice path, built on the
Assenbaum-Rolfs screened-cross-section form with the cited material potential
from :mod:`screening_data`:

.. math::

    f(E) = \\exp\\!\\left(\\frac{\\pi\\,\\eta\\,U_e}{E}\\right),
    \\qquad
    \\eta = Z_1 Z_2 \\alpha \\sqrt{\\frac{\\mu c^2}{2E}}

The exponent is capped at ``ln(ceiling)`` so the ceiling is the *only* limit and
it is the documented governance constant, not an unrelated magic number.
Saturation is reported rather than hidden. Downstream ``build_saturation_report``
receives the capped ``enhancement`` factor for display; the true uncapped magnitude
is ``log10_enhancement_raw`` and must be passed via ``mechanism_raw_log10`` overrides
so ``saturation.mechanisms.screening.log10_value_raw`` matches provenance.

References:
- Assenbaum, Langanke & Rolfs (1987) Z. Phys. A 327, 461 (screened cross-section).
- Raiola et al. (2002); Huke et al. (2008); Czerski et al. (2023) for the
  material-dependent potentials, collected in :mod:`screening_data`.
"""

from __future__ import annotations

import math
from typing import Any, Dict, Optional

from scipy import constants as const

from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR
from app.physics_engine.unified_lenr_model.screening_data import (
    ADIABATIC_LIMIT_EV,
    get_screening_potential_range,
)

#: Identifier recorded on responses so a client can tell which kernel produced a
#: value. Bump when the functional form changes.
SCREENING_MODEL_ID = "assenbaum_rolfs_gamow_cited_range_v1"

#: Legacy identifier, for provenance on any path still using the Debye form.
LEGACY_DEBYE_MODEL_ID = "debye_thermal_ratio_capped_9p2"

#: Default reactant pair: D + D.
DEFAULT_Z1 = 1
DEFAULT_Z2 = 1
DEFAULT_MASS_AMU = 2.014

#: Floor on thermal energy (eV) so the exponent cannot divide by zero.
_MIN_THERMAL_ENERGY_EV = 1e-6

#: Lean ``Assenbaum.thermal_not_applicable`` anchors (meV → eV).
#: U_e = 300000 meV (300 eV), E_kin = 100 meV (0.1 eV).
LEAN_THERMAL_U_E_EV = 300.0
LEAN_THERMAL_E_KIN_EV = 0.1


def assenbaum_applicable(u_e_ev: float, e_kin_ev: float) -> bool:
    """EQ-ASSEN-DOM-01 / Lean ``Assenbaum.applicable``: ``U_e < E_kin``.

    Strict ``<`` is the machine-checkable stand-in for the physical ≪ domain of
    the Assenbaum–Rolfs screened-cross-section expansion. Outside this
    predicate the formula is computed for sensitivity bookkeeping but is
    **not claimed** as a physical Assenbaum enhancement (see
    ``formula_claimed``).
    """
    return float(u_e_ev) < float(e_kin_ev)


def assenbaum_formula_claimed(u_e_ev: float, e_kin_ev: float) -> bool:
    """Lean ``Assenbaum.formulaClaimed`` — identical to ``assenbaum_applicable``."""
    return assenbaum_applicable(u_e_ev, e_kin_ev)


def thermal_energy_ev(temperature_k: float) -> float:
    """Mean thermal energy ``1.5 kT`` in eV, floored for numerical safety."""
    value = 1.5 * const.k * max(float(temperature_k), 0.0) / const.e
    return max(value, _MIN_THERMAL_ENERGY_EV)


def sommerfeld_parameter(
    energy_ev: float,
    *,
    z1: int = DEFAULT_Z1,
    z2: int = DEFAULT_Z2,
    mass_amu: float = DEFAULT_MASS_AMU,
) -> float:
    """Sommerfeld parameter ``eta = Z1 Z2 alpha sqrt(mu c^2 / 2E)``.

    Args:
        energy_ev: Centre-of-mass collision energy in eV.
        z1: Charge number of reactant 1.
        z2: Charge number of reactant 2.
        mass_amu: Mass of one reactant in amu; reduced mass is half of it for a
            symmetric pair.

    Returns:
        Dimensionless Sommerfeld parameter.
    """
    energy = max(float(energy_ev), _MIN_THERMAL_ENERGY_EV)
    reduced_mass_kg = 0.5 * float(mass_amu) * const.u
    rest_energy_ev = reduced_mass_kg * const.c**2 / const.e
    return float(z1 * z2 * const.alpha * math.sqrt(rest_energy_ev / (2.0 * energy)))


def compute_screening_enhancement(
    *,
    temperature_k: float,
    material: str = "palladium",
    screening_potential_ev: Optional[float] = None,
    z1: int = DEFAULT_Z1,
    z2: int = DEFAULT_Z2,
    mass_amu: float = DEFAULT_MASS_AMU,
    ceiling: float = MAX_ENHANCEMENT_FACTOR,
) -> Dict[str, Any]:
    """Screening enhancement with cited, material-dependent potential (RORO).

    Args:
        temperature_k: Local temperature in K.
        material: Host material key, used to look up the cited potential range.
        screening_potential_ev: Explicit potential override in eV. When ``None``
            the cited ``typical`` value for ``material`` is used.
        z1: Charge number of reactant 1.
        z2: Charge number of reactant 2.
        mass_amu: Reactant mass in amu.
        ceiling: Reporting ceiling; the exponent is capped at ``ln(ceiling)``.

    Returns:
        Dict with the enhancement plus every input and diagnostic needed to
        reproduce it: ``screening_potential_ev``, ``thermal_energy_ev``,
        ``sommerfeld_parameter``, ``exponent_raw``, ``exponent_applied``,
        ``is_saturated``, ``assenbaum_applicable`` / ``formula_claimed``
        (EQ-ASSEN-DOM-01), ``exceeds_adiabatic_limit`` (RR-007 anomalous
        metal vs gas-target adiabatic floor — distinct from Assenbaum domain),
        ``model`` and ``citations``.
    """
    potential_range = get_screening_potential_range(material)
    u_screen_ev = (
        float(screening_potential_ev)
        if screening_potential_ev is not None
        else float(potential_range.typical)
    )
    u_screen_ev = max(u_screen_ev, 0.0)

    energy_ev = thermal_energy_ev(temperature_k)
    eta = sommerfeld_parameter(energy_ev, z1=z1, z2=z2, mass_amu=mass_amu)

    exponent_raw = math.pi * eta * u_screen_ev / energy_ev
    # The ceiling is a claim-tier governance limit (MAX_ENHANCEMENT_FACTOR), so
    # cap the exponent at its logarithm instead of an unrelated magic number.
    exponent_cap = math.log(max(float(ceiling), 1.0 + 1e-12))
    exponent_applied = min(exponent_raw, exponent_cap)
    # exp(log(ceiling)) can round to just above the ceiling, so clamp explicitly:
    # the ceiling is a reporting contract and must be a hard bound.
    enhancement = min(math.exp(exponent_applied), float(ceiling))

    # exp(exponent_raw) overflows float64 well before the collapse peak (the
    # exponent reaches ~200 there), so the uncapped magnitude is reported in log
    # space. Without this the capped value is all a client sees and a saturated
    # screening term looks identical for every material.
    log10_enhancement_raw = exponent_raw / math.log(10.0)

    # Lean Assenbaum domain (EQ-ASSEN-DOM-01). Independent of the adiabatic
    # metal/gas floor (RR-007 / screening_data.ADIABATIC_LIMIT_EV).
    is_assenbaum_applicable = assenbaum_applicable(u_screen_ev, energy_ev)

    return {
        "enhancement": float(enhancement),
        "log10_enhancement_raw": float(log10_enhancement_raw),
        "screening_potential_ev": u_screen_ev,
        "screening_potential_range_ev": potential_range.as_uq_prior(),
        "thermal_energy_ev": float(energy_ev),
        "sommerfeld_parameter": float(eta),
        "exponent_raw": float(exponent_raw),
        "exponent_applied": float(exponent_applied),
        "exponent_cap": float(exponent_cap),
        "is_saturated": bool(exponent_raw > exponent_cap),
        "assenbaum_applicable": bool(is_assenbaum_applicable),
        "formula_claimed": bool(is_assenbaum_applicable),
        "domain_equation_id": "EQ-ASSEN-DOM-01",
        # Gas-target screening sits at the adiabatic limit; a metal-host value far
        # above it is the "anomalous screening" regime, which static Thomas-Fermi
        # theory does not explain. Flagged rather than silently assumed — and
        # must not be conflated with Assenbaum domain validity above.
        "exceeds_adiabatic_limit": bool(u_screen_ev > ADIABATIC_LIMIT_EV),
        "adiabatic_limit_ev": float(ADIABATIC_LIMIT_EV),
        "model": SCREENING_MODEL_ID,
        "citations": list(potential_range.citations),
    }
