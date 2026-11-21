"""
Miles excess-heat scale switch (HIP-04 / ENG-HS-04).

Two explicit watt scales — never silently swapped:

* ``definition`` — module seed scale **1.0 W** (historical default for the
  He/W rate definition). Tagged ``q_is_seed_scale=true``.
* ``literature_peak`` — JEAC 346 reported peak **0.52 W** (Miles et al. 1993).
  Tagged ``q_is_seed_scale=false``; pairing with follow-on ±0.02 W remains
  unverified, so this is exploratory literature peak, **not** discovery MoE.

Honesty: does not raise discovery claim tier, does not fabricate σ_Q, does not
close EQ-OPEN-*, does not flip ``lenr_proved``.
"""

from __future__ import annotations

from typing import Any, Dict, Mapping, Optional

# Definition / seed scale used historically by miles_heat_helium defaults.
MILES_DEFINITION_SCALE_W: float = 1.0

# JEAC 346 literature peak (Miles et al. 1993); same face as exploratory MoE
# S_heat=26 when paired with follow-on ±0.02 instrument error (pairing false).
MILES_LITERATURE_PEAK_W: float = 0.52

SCALE_DEFINITION = "definition"
SCALE_LITERATURE_PEAK = "literature_peak"
SCALE_EXPLICIT = "explicit_override"

KNOWN_SCALES = frozenset({SCALE_DEFINITION, SCALE_LITERATURE_PEAK, SCALE_EXPLICIT})

# Heat-scale claim vocabulary (additive; distinct from module claim_tier).
HEAT_SCALE_CLAIM_DEFINITION = "model_assumption_seed_scale"
HEAT_SCALE_CLAIM_LITERATURE_PEAK = "literature_reported_peak_exploratory"
HEAT_SCALE_CLAIM_EXPLICIT = "explicit_excess_heat_override"

# Module claim_tier for the heat–He *correlation* stays empirical. Episode Q
# scale never upgrades to discovery.
MODULE_CLAIM_TIER = "empirical_lenr_correlation"


def normalize_excess_heat_scale(raw: Any) -> Optional[str]:
    """Map user/config tokens onto a known scale id, or None if absent."""
    if raw is None:
        return None
    token = str(raw).strip().lower().replace("-", "_").replace(" ", "_")
    if not token:
        return None
    aliases = {
        "definition": SCALE_DEFINITION,
        "definition_scale": SCALE_DEFINITION,
        "seed": SCALE_DEFINITION,
        "seed_scale": SCALE_DEFINITION,
        "1w": SCALE_DEFINITION,
        "1_0": SCALE_DEFINITION,
        "literature_peak": SCALE_LITERATURE_PEAK,
        "literature": SCALE_LITERATURE_PEAK,
        "peak": SCALE_LITERATURE_PEAK,
        "jeac346": SCALE_LITERATURE_PEAK,
        "0_52": SCALE_LITERATURE_PEAK,
        "0.52": SCALE_LITERATURE_PEAK,
        "explicit": SCALE_EXPLICIT,
        "explicit_override": SCALE_EXPLICIT,
        "override": SCALE_EXPLICIT,
    }
    return aliases.get(token)


def resolve_miles_excess_heat(
    *,
    config: Optional[Mapping[str, Any]] = None,
    conditions: Optional[Mapping[str, Any]] = None,
) -> Dict[str, Any]:
    """Resolve excess-heat watts with an explicit, stamped scale switch (RORO).

    Precedence:
    1. Explicit ``excess_heat_W`` / ``excess_heat_watts`` → use value; stamp
       ``explicit_override`` unless ``excess_heat_scale`` names a known scale
       whose nominal watts match the supplied value (within 1e-9).
    2. ``excess_heat_scale`` / ``miles_heat_scale`` → definition or literature peak.
    3. Default → definition 1.0 W (backward compatible; **explicitly** stamped).
    """
    bag_config = dict(config or {})
    bag_cond = dict(conditions or {})

    scale_token = normalize_excess_heat_scale(
        bag_config.get(
            "excess_heat_scale",
            bag_config.get(
                "miles_heat_scale",
                bag_cond.get("excess_heat_scale", bag_cond.get("miles_heat_scale")),
            ),
        )
    )

    explicit = bag_config.get("excess_heat_W", bag_config.get("excess_heat_watts"))
    if explicit is None:
        explicit = bag_cond.get("excess_heat_W", bag_cond.get("excess_heat_watts"))

    if explicit is not None:
        watts = float(explicit)
        matched = _matching_nominal_scale(watts, scale_token)
        if matched is not None:
            return _stamp(matched, watts, source="explicit_matches_scale")
        # Explicit watts with no matching named scale — never silently relabel.
        return _stamp(
            SCALE_EXPLICIT if scale_token != SCALE_DEFINITION else SCALE_EXPLICIT,
            watts,
            source="explicit_excess_heat_W",
        )

    if scale_token == SCALE_LITERATURE_PEAK:
        return _stamp(
            SCALE_LITERATURE_PEAK,
            MILES_LITERATURE_PEAK_W,
            source="excess_heat_scale",
        )
    if scale_token == SCALE_DEFINITION:
        return _stamp(
            SCALE_DEFINITION,
            MILES_DEFINITION_SCALE_W,
            source="excess_heat_scale",
        )

    # Default: definition seed scale, stamped so operators see it is not peak Q.
    return _stamp(
        SCALE_DEFINITION,
        MILES_DEFINITION_SCALE_W,
        source="default_definition_scale",
    )


def _matching_nominal_scale(
    watts: float,
    scale_token: Optional[str],
) -> Optional[str]:
    if scale_token == SCALE_LITERATURE_PEAK and abs(watts - MILES_LITERATURE_PEAK_W) <= 1e-9:
        return SCALE_LITERATURE_PEAK
    if scale_token == SCALE_DEFINITION and abs(watts - MILES_DEFINITION_SCALE_W) <= 1e-9:
        return SCALE_DEFINITION
    if scale_token is None:
        if abs(watts - MILES_LITERATURE_PEAK_W) <= 1e-9:
            # Explicit 0.52 without scale token — still require explicit label;
            # treat as explicit_override so we never silently claim literature peak.
            return None
        if abs(watts - MILES_DEFINITION_SCALE_W) <= 1e-9:
            return None
    return None


def _stamp(scale: str, watts: float, *, source: str) -> Dict[str, Any]:
    is_seed = scale == SCALE_DEFINITION
    if scale == SCALE_LITERATURE_PEAK:
        heat_claim = HEAT_SCALE_CLAIM_LITERATURE_PEAK
        q_source = "literature_peak_excess_power_W"
    elif scale == SCALE_DEFINITION:
        heat_claim = HEAT_SCALE_CLAIM_DEFINITION
        q_source = "definition_scale_1W"
    else:
        heat_claim = HEAT_SCALE_CLAIM_EXPLICIT
        q_source = "explicit_excess_heat_W"

    return {
        "excess_heat_W": float(watts),
        "excess_heat_scale": scale,
        "q_is_seed_scale": bool(is_seed),
        "q_source": q_source,
        "heat_scale_claim_tier": heat_claim,
        "module_claim_tier": MODULE_CLAIM_TIER,
        "literature_peak_excess_power_W": float(MILES_LITERATURE_PEAK_W),
        "definition_scale_W": float(MILES_DEFINITION_SCALE_W),
        "moe_sigma_q_pairing_verified": False,
        "discovery_grade_eligible": False,
        "lenr_proved": False,
        "scale_resolution_source": source,
        "note": (
            "Miles heat scale is explicit: definition 1.0 W (seed) vs "
            "literature peak 0.52 W (JEAC 346). Literature peak is exploratory "
            "episode Q with unverified pairing — not discovery MoE, not EQ-OPEN "
            "discharge, and does not flip lenr_proved."
        ),
    }


def scale_summary_from_contribution_observables(
    observables: Optional[Mapping[str, Any]],
) -> Dict[str, Any]:
    """Compact scale stamp for pipeline / analytics surfaces."""
    bag = dict(observables or {})
    scale = str(bag.get("excess_heat_scale") or SCALE_DEFINITION)
    return {
        "excess_heat_scale": scale,
        "q_is_seed_scale": bool(bag.get("q_is_seed_scale", scale == SCALE_DEFINITION)),
        "q_source": bag.get("q_source"),
        "heat_scale_claim_tier": bag.get("heat_scale_claim_tier"),
        "literature_peak_excess_power_W": float(
            bag.get("literature_peak_excess_power_W", MILES_LITERATURE_PEAK_W)
        ),
        "definition_scale_W": float(
            bag.get("definition_scale_W", MILES_DEFINITION_SCALE_W)
        ),
        "moe_sigma_q_pairing_verified": False,
        "discovery_grade_eligible": False,
        "lenr_proved": False,
    }
