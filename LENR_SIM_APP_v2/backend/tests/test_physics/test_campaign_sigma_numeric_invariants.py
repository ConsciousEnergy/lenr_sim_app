"""BDS-363: lock verified campaign / corpus σ_Q · S_heat numeric invariants.

Prefer-merge honesty lock — no fabricated literature MoE for Iwamura / Mizuno /
Arata / Celani; Kasagi cite-gated S_heat and Miles exploratory arithmetic stay
exact; campaign model-output σ_Q never clears discovery_grade_eligible.
"""

from __future__ import annotations

from decimal import Decimal

import pytest

from app.campaign.avenue_ranking import _score_oracle_separation
from app.data.dataset_io import iccf27_literature_records, literature_records
from app.physics_engine.calorimetry_significance import (
    DISCOVERY_GRADE_SIGMA,
    combine_sigma_q_w,
    discovery_grade_analytics,
    discovery_grade_from_literature_record,
    s_heat,
)
from app.physics_engine.sigma_distance import (
    literature_corpus_moe_coverage,
    quantitative_distance_to_discovery,
)


#: Exact locked arithmetic (Decimal-verified; never invent literature MoE).
KASAGI_NICU_Q_W = Decimal("1.1")
KASAGI_NICU_SIGMA_W = Decimal("0.08")
KASAGI_NICU_S_HEAT = Decimal("13.75")
KASAGI_NI_Q_W = Decimal("0.9")
KASAGI_NI_SIGMA_W = Decimal("0.08")
KASAGI_NI_S_HEAT = Decimal("11.25")
MILES_PEAK_Q_W = Decimal("0.52")
MILES_INSTRUMENT_SIGMA_W = Decimal("0.02")
MILES_EXPLORATORY_S_HEAT = Decimal("26")
CAMPAIGN_MODEL_OUTPUT_SIGMA_Q_W = 0.1

REFUSED_FABRICATED_MOE_IDS = (
    "iwamura-heat-2024",
    "mizuno-ni-pd-airflow",
    "arata-ds-cathode",
    "celani-constantan",
)


def test_s_heat_formula_exact_decimal_invariants() -> None:
    """S_heat = Q/σ_Q locks (Decimal) — independent of float UI mirrors."""
    assert KASAGI_NICU_Q_W / KASAGI_NICU_SIGMA_W == KASAGI_NICU_S_HEAT
    assert KASAGI_NI_Q_W / KASAGI_NI_SIGMA_W == KASAGI_NI_S_HEAT
    assert MILES_PEAK_Q_W / MILES_INSTRUMENT_SIGMA_W == MILES_EXPLORATORY_S_HEAT
    assert float(KASAGI_NICU_S_HEAT) == 13.75
    assert float(KASAGI_NI_S_HEAT) == 11.25
    assert float(MILES_EXPLORATORY_S_HEAT) == 26.0
    assert DISCOVERY_GRADE_SIGMA == 5.0
    assert s_heat(excess_power_w=1.1, sigma_q_w=0.08) == 13.75
    assert s_heat(excess_power_w=0.9, sigma_q_w=0.08) == 11.25
    assert s_heat(excess_power_w=0.52, sigma_q_w=0.02) == 26.0


def test_rss_stat_sys_composition_is_exact() -> None:
    """√(0.03² + 0.04²) = 0.05 — RSS total used when explicit σ absent."""
    combined = combine_sigma_q_w(
        sigma_q_statistical_w=0.03,
        sigma_q_systematic_w=0.04,
    )
    assert combined == pytest.approx(0.05)
    assert Decimal("0.03") ** 2 + Decimal("0.04") ** 2 == Decimal("0.0025")
    assert (Decimal("0.03") ** 2 + Decimal("0.04") ** 2).sqrt() == Decimal("0.05")


def test_kasagi_cite_gated_s_heat_and_eligibility_locked() -> None:
    by_id = {row["literature_id"]: row for row in iccf27_literature_records()}
    nicu = discovery_grade_from_literature_record(by_id["kasagi-nicu-radiant-2026"])
    ni = discovery_grade_from_literature_record(by_id["kasagi-ni-radiant-2026"])

    assert nicu["s_heat"] == 13.75
    assert nicu["moe_provenance"] == "literature_reported"
    assert nicu["moe_sigma_q_pairing_verified"] is True
    assert nicu["discovery_grade_eligible"] is True
    assert nicu["lenr_proved"] is False
    assert all(v == "OPEN" for v in nicu["eq_open_status"].values())
    assert quantitative_distance_to_discovery(nicu)["distance_status"] == (
        "at_or_above_bar_gates_clear"
    )

    assert ni["s_heat"] == 11.25
    assert ni["moe_provenance"] == "literature_reported"
    assert ni["moe_sigma_q_pairing_verified"] is True
    assert ni["discovery_grade_eligible"] is True
    assert ni["lenr_proved"] is False
    assert all(v == "OPEN" for v in ni["eq_open_status"].values())
    assert quantitative_distance_to_discovery(ni)["distance_status"] == (
        "at_or_above_bar_gates_clear"
    )


def test_miles_exploratory_s_heat_gates_blocked() -> None:
    miles = next(
        row for row in literature_records() if row["literature_id"] == "miles-1993"
    )
    report = discovery_grade_from_literature_record(miles)
    assert report["excess_power_w"] == 0.52
    assert report["sigma_q_w"] == 0.02
    assert report["s_heat"] == 26.0
    assert report["moe_provenance"] == "literature_reported_instrument_precision"
    assert report["moe_sigma_q_pairing_verified"] is False
    assert report["discovery_grade_eligible"] is False
    assert report["lenr_proved"] is False
    # JEAC ±0.04 accuracy bound is a different document face — if misused as σ,
    # arithmetic would be 13, still exploratory without literature_reported + pairing.
    assert float(MILES_PEAK_Q_W / Decimal("0.04")) == 13.0
    jeac_misuse = discovery_grade_analytics(
        excess_power_w=0.52,
        sigma_q_w=0.04,
        moe_provenance="literature_reported_instrument_precision",
        moe_citation_keys=["miles1993"],
        moe_sigma_q_pairing_verified=False,
    )
    assert jeac_misuse["s_heat"] == 13.0
    assert jeac_misuse["discovery_grade_eligible"] is False


def test_iwamura_rows_have_null_sigma_and_stay_ineligible() -> None:
    by_id = {row["literature_id"]: row for row in literature_records()}
    for lid in ("iwamura-cs-pr-2002", "iwamura-sr-mo-2006"):
        report = discovery_grade_from_literature_record(by_id[lid])
        assert report["sigma_q_w"] is None
        assert report["s_heat"] is None
        assert report["discovery_grade_eligible"] is False
        assert report["lenr_proved"] is False
        assert quantitative_distance_to_discovery(report)["distance_status"] == (
            "undefined"
        )


def test_mizuno_arata_absent_celani_exploratory_only() -> None:
    """Mizuno/Arata stay absent; Celani may exist as exploratory companion only."""
    from app.data.dataset_io import (
        curated_literature_corpus_records,
        exploratory_moe_literature_records,
    )

    baseline_iccf_ids = {
        row["literature_id"]
        for row in list(literature_records()) + list(iccf27_literature_records())
    }
    for needle in ("mizuno", "arata"):
        assert not any(needle in lid.lower() for lid in baseline_iccf_ids)
    assert not any("celani" in lid.lower() for lid in baseline_iccf_ids)

    exploratory = exploratory_moe_literature_records()
    assert any(
        row["literature_id"] == "celani-constantan-2019" for row in exploratory
    )
    celani = next(
        row
        for row in curated_literature_corpus_records()
        if row["literature_id"] == "celani-constantan-2019"
    )
    assert celani["moe_provenance"] == "literature_reported_instrument_precision"
    assert celani.get("moe_sigma_q_pairing_verified") is False
    report = discovery_grade_from_literature_record(celani)
    assert report["discovery_grade_eligible"] is False
    assert report["s_heat"] == 6.0
    assert report["lenr_proved"] is False


def test_refused_fabricated_moe_ids_documented() -> None:
    """Soft lock: refused campaign ids stay named so UI/tests agree with gap map."""
    assert set(REFUSED_FABRICATED_MOE_IDS) == {
        "iwamura-heat-2024",
        "mizuno-ni-pd-airflow",
        "arata-ds-cathode",
        "celani-constantan",
    }


def test_campaign_model_output_sigma_is_not_discovery_moe() -> None:
    """Avenue Miles-band oracle uses σ_Q=0.1 model-output — never literature MoE."""
    oracle = _score_oracle_separation()
    assert oracle["miles_band_mev"]
    # Same numeric used in avenue_ranking observations; treat as model_assumption.
    model = discovery_grade_analytics(
        excess_power_w=1.0,
        sigma_q_w=CAMPAIGN_MODEL_OUTPUT_SIGMA_Q_W,
        moe_provenance="model_assumption",
        moe_citation_keys=[],
        moe_sigma_q_pairing_verified=False,
        q_is_seed_scale=True,
    )
    assert model["s_heat"] == 10.0
    assert model["discovery_grade_eligible"] is False
    assert model["lenr_proved"] is False
    assert all(v == "OPEN" for v in model["eq_open_status"].values())


def test_corpus_coverage_counts_two_eligible_after_celani_exploratory() -> None:
    coverage = literature_corpus_moe_coverage()
    assert coverage["n_records"] == 26
    assert coverage["with_sigma_q"] == 5
    assert coverage["with_literature_reported_cite_gated"] == 2
    assert coverage["with_moe_pairing_verified"] == 2
    assert coverage["discovery_grade_eligible_count"] == 2
    assert set(coverage["discovery_grade_eligible_ids"]) == {
        "kasagi-nicu-radiant-2026",
        "kasagi-ni-radiant-2026",
    }
    assert coverage["closes_eq_open"] is False
    assert coverage["lenr_proved"] is False
