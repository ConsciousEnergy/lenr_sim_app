"""B1: S_heat / σ_Q MoE hydrate + discovery_grade_eligible honesty locks."""

from __future__ import annotations

from app.campaign.avenue_catalog import OPEN_IDS
from app.data.baseline_experiments import get_baseline_experiments
from app.data.dataset_io import iccf27_literature_records, literature_records
from app.physics_engine.calorimetry_significance import (
    DISCOVERY_GRADE_SIGMA,
    EXPLORATORY_NULL_FALSIFY_SNR,
    combine_sigma_q_w,
    discovery_grade_analytics,
    discovery_grade_from_literature_record,
    s_heat,
    validate_moe_provenance,
)
from app.data.dataset_io import open_question_register


def test_s_heat_is_q_over_sigma() -> None:
    assert s_heat(excess_power_w=1.0, sigma_q_w=0.1) == 10.0
    assert s_heat(excess_power_w=0.4, sigma_q_w=0.1) == 4.0
    assert s_heat(excess_power_w=1.0, sigma_q_w=0.0) is None
    assert s_heat(excess_power_w=None, sigma_q_w=0.1) is None


def test_combine_sigma_q_rss_and_explicit_total() -> None:
    assert combine_sigma_q_w(sigma_q_w=0.2) == 0.2
    rss = combine_sigma_q_w(
        sigma_q_statistical_w=0.03,
        sigma_q_systematic_w=0.04,
    )
    assert rss is not None
    assert abs(rss - 0.05) < 1e-12
    assert combine_sigma_q_w() is None


def test_discovery_grade_eligible_at_five_sigma_only() -> None:
    below = discovery_grade_analytics(
        excess_power_w=0.4,
        sigma_q_w=0.1,
        moe_provenance="model_assumption",
    )
    assert below["s_heat"] == 4.0
    assert below["discovery_grade_eligible"] is False
    assert below["exploratory_snr_eligible"] is True

    at_bar = discovery_grade_analytics(
        excess_power_w=0.5,
        sigma_q_w=0.1,
        moe_provenance="model_assumption",
    )
    assert at_bar["s_heat"] == 5.0
    assert at_bar["discovery_grade_eligible"] is True
    assert DISCOVERY_GRADE_SIGMA == 5.0
    assert EXPLORATORY_NULL_FALSIFY_SNR == 3.0


def test_refuse_fabricated_literature_reported_without_citations() -> None:
    gate = validate_moe_provenance(
        sigma_q_w=0.05,
        moe_provenance="literature_reported",
        moe_citation_keys=[],
    )
    assert gate["ok"] is False
    report = discovery_grade_analytics(
        excess_power_w=1.0,
        sigma_q_w=0.05,
        moe_provenance="literature_reported",
        moe_citation_keys=[],
    )
    assert report["discovery_grade_eligible"] is False
    assert report["moe_provenance_ok"] is False
    assert report["lenr_proved"] is False


def test_discovery_grade_never_sets_lenr_proved_or_closes_eq_open() -> None:
    report = discovery_grade_analytics(
        excess_power_w=1.0,
        sigma_q_w=0.1,
        moe_provenance="model_assumption",
        literature_id="miles-1993",
    )
    assert report["s_heat"] == 10.0
    assert report["discovery_grade_eligible"] is True
    assert report["lenr_proved"] is False
    assert set(report["eq_open_status"]) == set(OPEN_IDS)
    assert all(status == "OPEN" for status in report["eq_open_status"].values())

    register = open_question_register()["questions"]
    assert all(row["status"] == "OPEN" for row in register)
    assert {row["id"] for row in register} == set(OPEN_IDS)


def test_miles_moe_hydrated_model_assumption_not_literature_fabricated() -> None:
    miles = next(
        row for row in literature_records() if row["literature_id"] == "miles-1993"
    )
    assert miles["moe_provenance"] == "model_assumption"
    assert miles["sigma_Q_W"] == 0.1
    assert "miles1993" in miles["moe_citation_keys"]
    assert "not" in miles["moe_notes"].lower() or "NOT" in miles["moe_notes"]
    assert "fabricat" in miles["moe_notes"].lower() or "model_assumption" in miles[
        "moe_notes"
    ]

    seeded = next(
        row
        for row in get_baseline_experiments()
        if row["literature_id"] == "miles-1993"
    )
    assert seeded["sigma_Q_W"] == 0.1
    assert seeded["moe_provenance"] == "model_assumption"

    report = discovery_grade_from_literature_record(miles)
    assert report["discovery_grade_eligible"] is True
    assert report["lenr_proved"] is False
    assert all(v == "OPEN" for v in report["eq_open_status"].values())


def test_mckubre_peers_hydrated_with_labelled_model_assumption() -> None:
    mck = next(
        row
        for row in literature_records()
        if row["literature_id"] == "mckubre-sri-p13-p14-1992"
    )
    assert mck["moe_provenance"] == "model_assumption"
    assert mck["sigma_Q_W"] == 0.1
    assert mck["results"]["excess_heat_reproducibility"] == 0.7
    report = discovery_grade_from_literature_record(mck)
    assert report["s_heat"] == 150.0
    assert report["discovery_grade_eligible"] is True
    assert report["lenr_proved"] is False


def test_deninno_and_kasagi_refuse_fabricated_sigma_q() -> None:
    deninno = next(
        row
        for row in literature_records()
        if row["literature_id"] == "deninno-tid-1995"
    )
    assert deninno.get("sigma_Q_W") is None
    assert "fabricat" in deninno["moe_notes"].lower()
    den_report = discovery_grade_from_literature_record(deninno)
    assert den_report["discovery_grade_eligible"] is False
    assert den_report["s_heat"] is None
    assert den_report["lenr_proved"] is False

    kasagi = next(
        row
        for row in iccf27_literature_records()
        if row["literature_id"] == "kasagi-nicu-radiant-2026"
    )
    assert kasagi.get("sigma_Q_W") is None
    assert "fabricat" in kasagi["moe_notes"].lower()
    kas_report = discovery_grade_from_literature_record(kasagi)
    assert kas_report["discovery_grade_eligible"] is False
    assert kas_report["lenr_proved"] is False
    assert all(v == "OPEN" for v in kas_report["eq_open_status"].values())
