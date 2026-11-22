"""HIP-04 / ENG-HS-04/05: Miles scale honesty + non-saturating margins.

Locks:
- Explicit scale switch (definition 1.0 W vs literature peak 0.52 W)
- No silent switch; seed vs peak stamped with claim-tier metadata
- Non-saturating margins discriminate when enhancement hits 1e5
- No discovery upgrade / EQ-OPEN close / lenr_proved / fabricated σ_Q
"""

from __future__ import annotations

import math

import pytest

from app.campaign.association_screen import iter_association_screen_cases
from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR
from app.physics_engine.miles_heat_scale import (
    HEAT_SCALE_CLAIM_DEFINITION,
    HEAT_SCALE_CLAIM_LITERATURE_PEAK,
    MILES_DEFINITION_SCALE_W,
    MILES_LITERATURE_PEAK_W,
    MODULE_CLAIM_TIER,
    resolve_miles_excess_heat,
)
from app.physics_engine.success_odds_margins import (
    build_success_odds_margins,
    margins_discriminate,
)
from app.physics_engine.theories.miles_heat_helium import (
    MILES_RATE_PER_WATT,
    MilesHeatHeliumTheory,
)
from app.physics_engine.theory_pipeline import get_default_pipeline


STANDARD = {
    "temperature": 300.0,
    "loading_ratio": 0.95,
    "pressure": 101325.0,
    "electric_field": 1e6,
    "defect_density": 1e16,
    "grain_size": 50e-9,
    "surface_roughness": 5e-9,
    "host_material": "palladium",
}


# ---------------------------------------------------------------------------
# ENG-HS-04 — Miles scale switch
# ---------------------------------------------------------------------------


def test_default_scale_is_definition_1w_stamped() -> None:
    resolved = resolve_miles_excess_heat()
    assert resolved["excess_heat_W"] == pytest.approx(MILES_DEFINITION_SCALE_W)
    assert resolved["excess_heat_scale"] == "definition"
    assert resolved["q_is_seed_scale"] is True
    assert resolved["heat_scale_claim_tier"] == HEAT_SCALE_CLAIM_DEFINITION
    assert resolved["discovery_grade_eligible"] is False
    assert resolved["lenr_proved"] is False
    assert resolved["moe_sigma_q_pairing_verified"] is False


def test_literature_peak_scale_is_0_52_stamped() -> None:
    resolved = resolve_miles_excess_heat(
        config={"excess_heat_scale": "literature_peak"}
    )
    assert resolved["excess_heat_W"] == pytest.approx(MILES_LITERATURE_PEAK_W)
    assert resolved["excess_heat_scale"] == "literature_peak"
    assert resolved["q_is_seed_scale"] is False
    assert resolved["heat_scale_claim_tier"] == HEAT_SCALE_CLAIM_LITERATURE_PEAK
    assert resolved["q_source"] == "literature_peak_excess_power_W"
    assert resolved["discovery_grade_eligible"] is False
    assert resolved["lenr_proved"] is False


def test_explicit_watts_without_scale_is_override_not_silent_peak() -> None:
    """Supplying 0.52 W alone must not silently claim literature_peak."""
    resolved = resolve_miles_excess_heat(config={"excess_heat_W": 0.52})
    assert resolved["excess_heat_W"] == pytest.approx(0.52)
    assert resolved["excess_heat_scale"] == "explicit_override"
    assert resolved["q_is_seed_scale"] is False


def test_miles_module_default_emits_definition_scale() -> None:
    theory = MilesHeatHeliumTheory()
    contrib = theory.calculate(STANDARD)
    assert contrib.energy_output_watts == pytest.approx(1.0)
    assert contrib.observables["excess_heat_scale"] == "definition"
    assert contrib.observables["q_is_seed_scale"] is True
    assert contrib.claim_tier == MODULE_CLAIM_TIER
    assert contrib.provenance.get("lenr_proved") is False
    assert contrib.observables["discovery_grade_eligible"] is False


def test_miles_module_literature_peak_emits_0_52() -> None:
    theory = MilesHeatHeliumTheory()
    contrib = theory.calculate(
        STANDARD, {"excess_heat_scale": "literature_peak"}
    )
    assert contrib.energy_output_watts == pytest.approx(0.52)
    assert contrib.observables["excess_heat_scale"] == "literature_peak"
    assert contrib.observables["q_is_seed_scale"] is False
    assert contrib.observables["heat_scale_claim_tier"] == HEAT_SCALE_CLAIM_LITERATURE_PEAK
    rate = contrib.observables["expected_he4_rate_per_s"]
    assert rate == pytest.approx(0.52 * MILES_RATE_PER_WATT)
    # Still exploratory — pairing unverified, not discovery.
    assert contrib.observables["moe_sigma_q_pairing_verified"] is False
    assert contrib.observables["discovery_grade_eligible"] is False
    assert contrib.provenance.get("not_discovery_claim") is True


def test_pipeline_miles_scale_appears_in_validation() -> None:
    pipeline = get_default_pipeline()
    result = pipeline.run(
        conditions=STANDARD,
        enabled_theories=["miles_heat_helium"],
        theory_configs={
            "miles_heat_helium": {"excess_heat_scale": "literature_peak"}
        },
    )
    payload = result.to_dict()
    miles_v = payload["validation"]["miles_heat_helium"]
    assert miles_v["excess_heat_scale"] == "literature_peak"
    assert miles_v["q_is_seed_scale"] is False
    assert miles_v["module_energy_output_watts"] == pytest.approx(0.52)
    miles_row = next(
        r for r in payload["per_theory"] if r["theory_id"] == "miles_heat_helium"
    )
    assert miles_row["energy_output_watts"] == pytest.approx(0.52)
    assert miles_row["claim_tier"] == MODULE_CLAIM_TIER


def test_association_screen_miles_requests_literature_peak() -> None:
    miles_cases = [
        c for c in iter_association_screen_cases() if c["literature_id"] == "miles-1993"
    ]
    assert miles_cases
    for case in miles_cases:
        configs = case.get("theory_configs") or {}
        assert configs["miles_heat_helium"]["excess_heat_scale"] == "literature_peak"

    other = [
        c
        for c in iter_association_screen_cases()
        if c["literature_id"] != "miles-1993"
    ]
    assert other
    assert all(not c.get("theory_configs") for c in other)


# ---------------------------------------------------------------------------
# ENG-HS-05 — non-saturating margins
# ---------------------------------------------------------------------------


def test_margins_expose_rate_space_and_loading() -> None:
    margins = build_success_odds_margins(
        reaction_rate=1e12,
        helium4_rate=0.52 * 2.63e11,
        excess_heat_watts=0.52,
        loading_ratio=0.95,
        enhancement_factor=MAX_ENHANCEMENT_FACTOR,
        log10_enhancement_raw=18.4,
        enhancement_is_saturated=True,
        literature_id="miles-1993",
        confidence=0.57,
    )
    assert margins["schema"] == "lenr-success-odds-margins-v1"
    assert margins["is_model_output"] is True
    assert margins["lenr_proved"] is False
    assert margins["not_discovery_claim"] is True
    assert margins["rate_space"]["log10_helium4_rate"] == pytest.approx(
        math.log10(0.52 * 2.63e11)
    )
    assert margins["loading_sensitivity"]["loading_sensitivity_01"] == pytest.approx(1.0)
    assert margins["enhancement_residual"]["is_saturated"] is True
    assert margins["enhancement_residual"]["log10_residual_above_ceiling"] == pytest.approx(
        18.4 - math.log10(MAX_ENHANCEMENT_FACTOR)
    )
    assert margins["oracle_separation"]["sigma_q_is_literature_moe"] is False
    assert margins["discrimination_score"] > 0.0


def test_margins_discriminate_high_l_association_anchors() -> None:
    """At L=0.95, capped enhancement alone cannot separate anchors; margins can."""
    saturated = MAX_ENHANCEMENT_FACTOR
    miles = build_success_odds_margins(
        reaction_rate=1e12,
        helium4_rate=0.52 * 2.63e11,
        excess_heat_watts=0.52,
        loading_ratio=0.95,
        enhancement_factor=saturated,
        log10_enhancement_raw=18.0,
        enhancement_is_saturated=True,
        literature_id="miles-1993",
    )
    mckubre = build_success_odds_margins(
        reaction_rate=1e10,
        helium4_rate=1e8,
        excess_heat_watts=0.05,
        loading_ratio=0.95,
        enhancement_factor=saturated,
        log10_enhancement_raw=16.5,
        enhancement_is_saturated=True,
        literature_id="mckubre-sri-p13-p14-1992",
    )
    arpae = build_success_odds_margins(
        reaction_rate=1e6,
        helium4_rate=1.0,
        excess_heat_watts=0.0,
        loading_ratio=0.95,
        enhancement_factor=saturated,
        log10_enhancement_raw=15.0,
        enhancement_is_saturated=True,
        literature_id="berlinguette-arpa-e-2019",
    )
    # Display enhancement identical...
    assert miles["enhancement_residual"]["enhancement_factor_display"] == saturated
    assert mckubre["enhancement_residual"]["enhancement_factor_display"] == saturated
    assert arpae["enhancement_residual"]["enhancement_factor_display"] == saturated
    # ...but uncapped margins still discriminate.
    assert margins_discriminate(miles, mckubre)
    assert margins_discriminate(miles, arpae)
    assert margins_discriminate(mckubre, arpae)
    assert miles["discrimination_score"] > arpae["discrimination_score"]


def test_loading_sensitivity_separates_0_85_from_0_95() -> None:
    low = build_success_odds_margins(
        reaction_rate=1e9,
        helium4_rate=1e9,
        excess_heat_watts=0.1,
        loading_ratio=0.85,
        enhancement_factor=MAX_ENHANCEMENT_FACTOR,
        enhancement_is_saturated=True,
        log10_enhancement_raw=12.0,
    )
    high = build_success_odds_margins(
        reaction_rate=1e9,
        helium4_rate=1e9,
        excess_heat_watts=0.1,
        loading_ratio=0.95,
        enhancement_factor=MAX_ENHANCEMENT_FACTOR,
        enhancement_is_saturated=True,
        log10_enhancement_raw=12.0,
    )
    assert low["loading_sensitivity"]["loading_sensitivity_01"] == pytest.approx(0.0)
    assert high["loading_sensitivity"]["loading_sensitivity_01"] == pytest.approx(1.0)
    assert margins_discriminate(low, high)
