"""
Heating-mode trinity for stimulation gating (HIP-01 / ENG-HS-03).

Three mutually exclusive drive classes (research locks; no melt wiring):

- ``joule``     — electrolytic I²R along the electrode / electrolyte path
- ``resistive`` — separate ohmic heater / filament / hot-wire (gaseous cells)
- ``photonic``  — absorbed laser power (Letts dual-laser ≤30 mW class)

``radiant`` is a calorimetry / protocol tag (Kasagi BREMS-style), **not**
photonic laser stimulation. It must not arm ``letts_laser``.
"""

from __future__ import annotations

from typing import Any, Mapping, Optional

HEATING_MODES = frozenset({"joule", "resistive", "photonic", "radiant"})
PHOTONIC_ALIASES = frozenset({"photonic", "laser", "letts", "letts_laser", "p_photonic"})
RESISTIVE_ALIASES = frozenset({"resistive", "gaseous", "heater", "p_resistive", "hot_wire"})
JOULE_ALIASES = frozenset({"joule", "electrolytic", "p_joule", "electrolysis"})
RADIANT_ALIASES = frozenset({"radiant", "brems", "radiant_calorimetry"})


def _truthy(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on", "photonic", "laser"}
    return bool(value)


def _normalized_mode(raw: Any) -> Optional[str]:
    if raw is None:
        return None
    token = str(raw).strip().lower()
    if not token:
        return None
    if token in PHOTONIC_ALIASES:
        return "photonic"
    if token in RESISTIVE_ALIASES:
        return "resistive"
    if token in JOULE_ALIASES:
        return "joule"
    if token in RADIANT_ALIASES:
        return "radiant"
    if token in HEATING_MODES:
        return token
    return None


def resolve_heating_mode(conditions: Optional[Mapping[str, Any]] = None) -> str:
    """Resolve heating / stimulation mode from run conditions.

    Precedence:
    1. Explicit ``heating_mode`` / ``stimulation_mode``
    2. Explicit photonic arm (``letts_laser``, ``P_photonic`` > 0)
    3. Explicit resistive arm (``P_resistive`` > 0 / ``resistive_heater``)
    4. Radiant calorimetry protocol tag
    5. Default ``joule`` (electrolytic path)
    """
    bag = dict(conditions or {})
    explicit = _normalized_mode(bag.get("heating_mode", bag.get("stimulation_mode")))
    if explicit is not None:
        return explicit

    if (
        _truthy(bag.get("letts_laser"))
        or _truthy(bag.get("laser_stimulation"))
        or _truthy(bag.get("photonic_heating"))
        or float(bag.get("P_photonic", bag.get("p_photonic", 0.0)) or 0.0) > 0.0
    ):
        return "photonic"

    if (
        _truthy(bag.get("resistive_heater"))
        or float(bag.get("P_resistive", bag.get("p_resistive", 0.0)) or 0.0) > 0.0
    ):
        return "resistive"

    if _truthy(bag.get("radiant_calorimetry")):
        return "radiant"

    if float(bag.get("P_joule", bag.get("p_joule", 0.0)) or 0.0) > 0.0:
        return "joule"

    return "joule"


def is_photonic_stimulation(conditions: Optional[Mapping[str, Any]] = None) -> bool:
    """True only when dual-laser / photonic drive is explicitly armed."""
    return resolve_heating_mode(conditions) == "photonic"
