"""
Coupled heat/He observables bridge (HIP-01 / ENG-HS-01/02).

Bridges theory-pipeline ``total_energy_watts`` into unified simulate heat and
He-4 rates under Miles correlation, stamped as ``model_output`` — never a
discovery claim upgrade, never fabricated σ_Q, never ``lenr_proved``.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from app.physics_engine.constants import MILES_HEAT_HELIUM_RATE

# LENR-like He-dominant branching (paper §5.2.2); neutron ≲ 10⁻¹¹ of He channel.
_LENR_NEUTRON_TO_HE4 = 1e-11

HONESTY_CLASS_MODEL_OUTPUT = "model_output"
CLAIM_TIER_MODEL_OUTPUT = "model_output_hypothetical"


def couple_pipeline_heat_he(
    *,
    pipeline_total_energy_watts: Optional[float],
    volumetric_excess_heat_watts: float,
    volumetric_helium4_rate: float,
    volumetric_neutron_rate: float,
    heating_mode: str,
    letts_applicable: Optional[bool] = None,
) -> Dict[str, Any]:
    """Return coupled heat/He rates plus honesty metadata (RORO).

    When a theory-pipeline total is available, it becomes the canonical
    predictive heat; He-4 follows Miles (atoms/s per watt). Volumetric
    Gamow-rate heat is retained as a diagnostic only.
    """
    if pipeline_total_energy_watts is not None:
        heat = float(pipeline_total_energy_watts)
        helium4_rate = heat * float(MILES_HEAT_HELIUM_RATE)
        neutron_rate = helium4_rate * _LENR_NEUTRON_TO_HE4
        source = "theory_pipeline.total_energy_watts"
        bridged = True
    else:
        heat = float(volumetric_excess_heat_watts)
        helium4_rate = float(volumetric_helium4_rate)
        neutron_rate = float(volumetric_neutron_rate)
        source = "volumetric_reaction_rate"
        bridged = False

    return {
        "excess_heat_watts": heat,
        "helium4_rate": helium4_rate,
        "neutron_rate": neutron_rate,
        "bridge": {
            "bridged": bridged,
            "source": source,
            "heating_mode": heating_mode,
            "honesty_class": HONESTY_CLASS_MODEL_OUTPUT,
            "claim_tier": CLAIM_TIER_MODEL_OUTPUT,
            "is_model_output": True,
            "not_discovery_claim": True,
            "lenr_proved": False,
            "letts_gated_off_non_laser": (
                heating_mode != "photonic" if letts_applicable is None else (not letts_applicable)
            ),
            "volumetric_excess_heat_watts": float(volumetric_excess_heat_watts),
            "volumetric_helium4_rate": float(volumetric_helium4_rate),
            "miles_he4_per_watt": float(MILES_HEAT_HELIUM_RATE),
            "note": (
                "Coupled heat/He is model_output for ranking and Lab Ask; "
                "does not raise claim tier, close EQ-OPEN-*, or flip lenr_proved."
            ),
        },
    }
