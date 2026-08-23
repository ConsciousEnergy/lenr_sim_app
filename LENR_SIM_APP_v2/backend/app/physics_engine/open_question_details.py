"""Pure computed details for the additive Q4/Q5 open-question ledger."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Mapping

from scipy import constants as const

from app.physics.weak_interaction import THRESHOLD_ELECTRON_MEV
from app.physics_engine.decision_oracle import MILES_MEV_MAX, MILES_MEV_MIN
from app.physics_engine.theories.miles_heat_helium import MILES_RATE_PER_WATT
from app.physics_engine.unified_lenr_model.reaction_rate_engine import (
    DEFAULT_MASS_RENORMALIZATION,
)

_ELECTRON_CAPTURE_MASS_THRESHOLD_RATIO = (
    const.m_n - const.m_p
) / const.m_e
_ELECTRON_REST_ENERGY_MEV = const.m_e * const.c**2 / (1e6 * const.e)
# Governed in LENR_FRAMEWORK_ISSUE_LEDGER and the unified-framework §5.2.2.
_REPORTED_INTEGRATED_YIELD_DISCREPANCY_BAND = (1e2, 1e4)


@dataclass(frozen=True)
class ElectronCaptureQuestionInput:
    """Inputs needed to compute the speculative electron-capture threshold row."""

    mode: str
    rate_provenance: Mapping[str, Any]


@dataclass(frozen=True)
class IntegratedYieldQuestionInput:
    """Inputs needed to compute Miles expected rate and integrated yield."""

    observations: Mapping[str, Any]
    total_time_s: float
    duty_fraction: float


def build_electron_capture_question(
    request: ElectronCaptureQuestionInput,
) -> Dict[str, Any]:
    """Return Q4 threshold bookkeeping without claiming capture occurrence."""
    provenance = request.rate_provenance
    from_provenance = provenance.get("mass_renormalization") is not None
    mass_ratio = float(
        provenance.get("mass_renormalization", DEFAULT_MASS_RENORMALIZATION)
    )
    threshold_ratio = float(_ELECTRON_CAPTURE_MASS_THRESHOLD_RATIO)
    threshold_gap = max(threshold_ratio - mass_ratio, 0.0)
    threshold_met = mass_ratio >= threshold_ratio
    energy_deficit_mev = threshold_gap * _ELECTRON_REST_ENERGY_MEV

    if not threshold_met:
        unmet_reason = (
            "The supplied m*/m_e is below the energy-conservation threshold; "
            "electron capture is not energetically available in this scenario."
        )
    elif request.mode != "three_body":
        unmet_reason = (
            "The mass gate is met only by an inactive speculative scenario; the "
            "active rate mode does not evaluate electron capture, and occurrence "
            "is not established."
        )
    else:
        unmet_reason = (
            "Meeting the speculative mass gate is necessary, not sufficient: "
            "the renormalization and electron-capture occurrence remain unvalidated."
        )

    return {
        "id": "EQ-OPEN-EC-01",
        "status": "OPEN",
        "claim_tier": "speculative_exploratory",
        "dimmed": True,
        "electron_capture_threshold_mev": float(THRESHOLD_ELECTRON_MEV),
        "mass_renormalization_threshold_mstar_over_me": threshold_ratio,
        "mass_renormalization_input_mstar_over_me": mass_ratio,
        "mass_renormalization_input_source": (
            "reaction_rate_engine.rate.provenance"
            if from_provenance
            else "reaction_rate_engine.DEFAULT_MASS_RENORMALIZATION"
        ),
        "mass_renormalization_active": request.mode == "three_body",
        "mass_renormalization_threshold_met": threshold_met,
        "mass_renormalization_gap_mstar_over_me": threshold_gap,
        "energy_deficit_mev": float(energy_deficit_mev),
        "unmet_reason": unmet_reason,
        "occurrence_claimed": False,
        "provenance": {
            "threshold_energy_source": (
                "app.physics.weak_interaction.THRESHOLD_ELECTRON_MEV"
            ),
            "mass_threshold_source": "scipy.constants CODATA masses",
            "validation_status": "open_speculative_threshold_only",
        },
        "references": ["widomlarsen2006", "tennfors2013"],
        "lean_theorems": ["EQ-3B-MASS-DOM-01"],
    }


def build_integrated_yield_question(
    request: IntegratedYieldQuestionInput,
) -> Dict[str, Any]:
    """Return Q5 expected yield without inventing an observed integrated yield."""
    power = request.observations.get("excess_power_W")
    power_w = float(power) if power is not None else None
    expected_active_rate = (
        power_w * MILES_RATE_PER_WATT if power_w is not None else None
    )
    active_duration_s = max(float(request.total_time_s), 0.0) * request.duty_fraction
    duty_adjusted_rate = (
        expected_active_rate * request.duty_fraction
        if expected_active_rate is not None
        else None
    )
    expected_yield = (
        expected_active_rate * active_duration_s
        if expected_active_rate is not None
        else None
    )
    supplied_he4_rate = request.observations.get("he4_atoms_per_s")

    return {
        "id": "EQ-OPEN-YIELD-01",
        "status": "OPEN",
        "claim_tier": "empirical_lenr_correlation",
        "dimmed": True,
        "supplied_excess_power_w": power_w,
        "duty_fraction": request.duty_fraction,
        "active_duration_s": active_duration_s,
        "miles_he4_atoms_per_s_per_w": float(MILES_RATE_PER_WATT),
        "miles_energy_band_mev_per_he4": [MILES_MEV_MIN, MILES_MEV_MAX],
        "expected_he4_rate_per_s": expected_active_rate,
        "duty_adjusted_expected_he4_rate_per_s": duty_adjusted_rate,
        "expected_integrated_he4_yield_atoms": expected_yield,
        "supplied_he4_rate_per_s": (
            float(supplied_he4_rate)
            if supplied_he4_rate is not None
            else None
        ),
        "observed_integrated_he4_yield_atoms": None,
        "observed_integrated_yield_note": (
            "No observed integrated yield was supplied; none is inferred from "
            "an instantaneous He-4 rate."
        ),
        "reported_integrated_yield_discrepancy": {
            "factor_band": list(_REPORTED_INTEGRATED_YIELD_DISCREPANCY_BAND),
            "label": "reported / known integrated-yield shortfall (factor)",
            "direction": "reported yields lower than Miles expectation",
            "governance": (
                "docs/LENR_FRAMEWORK_ISSUE_LEDGER.md and unified-framework §5.2.2"
            ),
        },
        "retention_time_resolved_caveat": (
            "The reported 10^2–10^4 integrated-yield discrepancy may reflect "
            "He-4 retention/collection loss, time-varying duty, or heat from "
            "other channels; simultaneous time-resolved heat–He accounting is required."
        ),
        "unmet_reason": (
            "Integrated observed He-4 yield and retention/time-resolved accounting "
            "are not supplied, so the expected yield cannot close this question."
        ),
        "occurrence_claimed": False,
        "provenance": {
            "conversion_source": (
                "app.physics_engine.theories.miles_heat_helium.MILES_RATE_PER_WATT"
            ),
            "validation_status": "open_empirical_accounting",
        },
        "references": ["miles1993"],
        "lean_theorems": ["EQ-MILES-CONV-01"],
    }
