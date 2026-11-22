"""Compact spacetime sample buffer for bubble-lattice viz playback (HIP-06 / VIZ-02).

Additive export: ``(normalized_time, R, T, E, enhancement, occupancy)`` rows so
the UnifiedBubbleLatticeVisualization can play engine samples rather than only
RAF-driven schematic motion. Does not invent melt / host-phase channels.
"""

from __future__ import annotations

from typing import Any, Dict, List, Mapping, Optional, Sequence

SPACETIME_SAMPLE_SCHEMA = "lenr-spacetime-sample-v1"

SPACETIME_CHANNELS: List[str] = [
    "normalized_time",
    "radius_um",
    "temperature_k",
    "electric_field_v_m",
    "enhancement",
    "occupancy_nuclear",
    "phase",
]


def _nuclear_occupancy(entry: Mapping[str, Any]) -> Optional[float]:
    dist = entry.get("proton_distribution") or entry.get("proton_phases")
    if not isinstance(dist, Mapping):
        return None
    value = dist.get("NUCLEAR")
    if isinstance(value, (int, float)) and value == value:  # not NaN
        return float(value)
    return None


def _finite_or_none(value: Any) -> Optional[float]:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    if number != number:  # NaN
        return None
    return number


def build_spacetime_sample_buffer(
    timeline: Sequence[Mapping[str, Any]],
    *,
    source: str = "enhancement_timeline",
) -> Dict[str, Any]:
    """Fold an enhancement_timeline into a compact scrubbable sample buffer.

    Returns an empty-but-shaped dict when timeline is empty so the response
    field stays additive and JSON-stable.
    """
    samples: List[Dict[str, Any]] = []
    for entry in timeline or []:
        t = _finite_or_none(entry.get("normalized_time"))
        if t is None:
            continue
        radius = _finite_or_none(entry.get("radius_um"))
        if radius is None:
            radius = _finite_or_none(entry.get("radius_factor"))
        temperature = _finite_or_none(entry.get("temperature_k"))
        if temperature is None:
            temperature = _finite_or_none(entry.get("temperature"))
        field = _finite_or_none(entry.get("electric_field_v_m"))
        if field is None:
            field = _finite_or_none(entry.get("electric_field"))
        enhancement = _finite_or_none(entry.get("enhancement"))
        samples.append(
            {
                "normalized_time": max(0.0, min(1.0, t)),
                "radius_um": radius,
                "temperature_k": temperature,
                "electric_field_v_m": field,
                "enhancement": enhancement,
                "occupancy_nuclear": _nuclear_occupancy(entry),
                "phase": entry.get("phase"),
            }
        )

    samples.sort(key=lambda row: row["normalized_time"])
    rows = [
        [
            s["normalized_time"],
            s["radius_um"],
            s["temperature_k"],
            s["electric_field_v_m"],
            s["enhancement"],
            s["occupancy_nuclear"],
            s["phase"],
        ]
        for s in samples
    ]
    return {
        "schema": SPACETIME_SAMPLE_SCHEMA,
        "source": source,
        "sample_count": len(samples),
        "channels": list(SPACETIME_CHANNELS),
        "clock": "acoustic_normalized_time",
        "samples": samples,
        "rows": rows,
    }


def build_viz_channels_from_sample(
    sample: Optional[Mapping[str, Any]],
) -> Dict[str, Any]:
    """Optional stream/HUD ``viz_channels`` map. Melt / P_* stay null (gap)."""
    if not sample:
        return {
            "host.phase_fraction_liquid": None,
            "heat.P_joule": None,
            "heat.P_resistive": None,
            "heat.P_photonic": None,
        }
    return {
        "bubble.cycle_fraction": sample.get("normalized_time"),
        "bubble.phase": sample.get("phase"),
        "bubble.radius_um": sample.get("radius_um"),
        "collapse.temperature_k": sample.get("temperature_k"),
        "collapse.electric_field_v_m": sample.get("electric_field_v_m"),
        "enhancement.claim_tier_display": sample.get("enhancement"),
        "proton.regime_nuclear_fraction": sample.get("occupancy_nuclear"),
        "host.phase_fraction_liquid": None,
        "heat.P_joule": None,
        "heat.P_resistive": None,
        "heat.P_photonic": None,
    }
