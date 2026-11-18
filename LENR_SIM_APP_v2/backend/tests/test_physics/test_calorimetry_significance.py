"""B1: S_heat / σ_Q MoE + discovery_grade_eligible honesty locks.

MoE from cite-gated hydrate (PR #406 tip ``0fa710e``): Miles ±0.02 is
``literature_reported_instrument_precision`` (follow-on calorimetric error;
peak+σ pairing unverified → exploratory S_heat only, not discovery).
De Ninno instrument_precision (exploratory); Kasagi NiCu + Ni control 0.08
with same-results ``q_ex_w`` + ``sigma_Q_W`` pairing; McKubre instrument floor
metadata only (no sigma_Q_W).
"""

from __future__ import annotations

from app.campaign.avenue_catalog import OPEN_IDS
from app.data.baseline_experiments import get_baseline_experiments
from app.data.dataset_io import (
    iccf27_literature_records,
    literature_records,
    open_question_register,
)
from app.physics_engine.calorimetry_significance import (
    ALLOWED_MOE_PROVENANCE,
    DISCOVERY_ELIGIBLE_PROVENANCE,
    DISCOVERY_GRADE_SIGMA,
    EXPLORATORY_NULL_FALSIFY_SNR,
    combine_sigma_q_w,
    discovery_grade_analytics,
    discovery_grade_from_literature_record,
    s_heat,
    validate_moe_provenance,
)
from app.physics_engine.discovery_grade_gap import (
    CLOSURE_REQUIREMENT_IDS,
    GAP_REQUIREMENT_IDS,
    attach_discovery_grade_envelopes,
    corpus_discovery_grade_gap,
    discovery_grade_gap_bookkeeping,
    honest_closure_bookkeeping,
)
from app.physics_engine.sigma_distance import (
    literature_corpus_moe_coverage,
    quantitative_distance_to_discovery,
)


def test_s_heat_is_signed_q_over_sigma() -> None:
    assert s_heat(excess_power_w=1.0, sigma_q_w=0.02) == 50.0
    assert s_heat(excess_power_w=0.08, sigma_q_w=0.02) == 4.0
    assert s_heat(excess_power_w=1.0, sigma_q_w=0.0) is None
    assert s_heat(excess_power_w=None, sigma_q_w=0.1) is None


def test_s_heat_preserves_sign_negative_q_not_discovery() -> None:
    """Regression: heat deficit must not abs() into discovery eligibility."""
    assert s_heat(excess_power_w=-0.1, sigma_q_w=0.02) == -5.0
    report = discovery_grade_analytics(
        excess_power_w=-0.1,
        sigma_q_w=0.02,
        moe_provenance="literature_reported",
        moe_citation_keys=["miles1993"],
    )
    assert report["s_heat"] == -5.0
    assert report["discovery_grade_eligible"] is False
    assert report["exploratory_snr_eligible"] is False
    assert report["lenr_proved"] is False


def test_combine_sigma_q_rss_and_explicit_total() -> None:
    assert combine_sigma_q_w(sigma_q_w=0.02) == 0.02
    rss = combine_sigma_q_w(
        sigma_q_statistical_w=0.03,
        sigma_q_systematic_w=0.04,
    )
    assert rss is not None
    assert abs(rss - 0.05) < 1e-12
    assert combine_sigma_q_w() is None


def test_discovery_grade_eligible_at_five_sigma_only() -> None:
    below = discovery_grade_analytics(
        excess_power_w=0.08,
        sigma_q_w=0.02,
        moe_provenance="literature_reported",
        moe_citation_keys=["miles1993"],
        moe_sigma_q_pairing_verified=True,
    )
    assert below["s_heat"] == 4.0
    assert below["discovery_grade_eligible"] is False
    assert below["exploratory_snr_eligible"] is True

    at_bar = discovery_grade_analytics(
        excess_power_w=0.1,
        sigma_q_w=0.02,
        moe_provenance="literature_reported",
        moe_citation_keys=["miles1993"],
        moe_sigma_q_pairing_verified=True,
    )
    assert at_bar["s_heat"] == 5.0
    assert at_bar["discovery_grade_eligible"] is True
    assert DISCOVERY_GRADE_SIGMA == 5.0
    assert EXPLORATORY_NULL_FALSIFY_SNR == 3.0


def test_unverified_pairing_blocks_discovery_even_when_s_heat_high() -> None:
    report = discovery_grade_analytics(
        excess_power_w=0.52,
        sigma_q_w=0.02,
        moe_provenance="literature_reported",
        moe_citation_keys=["miles1993"],
        moe_sigma_q_pairing_verified=False,
    )
    assert report["s_heat"] == 26.0
    assert report["exploratory_snr_eligible"] is True
    assert report["discovery_grade_eligible"] is False
    assert report["moe_sigma_q_pairing_verified"] is False
    assert report["lenr_proved"] is False


def test_refuse_fabricated_literature_reported_without_citations() -> None:
    gate = validate_moe_provenance(
        sigma_q_w=0.02,
        moe_provenance="literature_reported",
        moe_citation_keys=[],
    )
    assert gate["ok"] is False
    instrument_gate = validate_moe_provenance(
        sigma_q_w=0.02,
        moe_provenance="literature_reported_instrument_precision",
        moe_citation_keys=[],
    )
    assert instrument_gate["ok"] is False
    report = discovery_grade_analytics(
        excess_power_w=1.0,
        sigma_q_w=0.02,
        moe_provenance="literature_reported",
        moe_citation_keys=[],
    )
    assert report["discovery_grade_eligible"] is False
    assert report["moe_provenance_ok"] is False
    assert report["lenr_proved"] is False


def test_allowed_moe_provenance_includes_instrument_labels() -> None:
    assert "literature_reported" in ALLOWED_MOE_PROVENANCE
    assert "literature_reported_instrument_precision" in ALLOWED_MOE_PROVENANCE
    assert "literature_reported_instrument_floor" in ALLOWED_MOE_PROVENANCE
    assert "model_assumption" in ALLOWED_MOE_PROVENANCE
    assert DISCOVERY_ELIGIBLE_PROVENANCE == frozenset({"literature_reported"})


def test_instrument_precision_is_exploratory_not_discovery() -> None:
    report = discovery_grade_analytics(
        excess_power_w=5.0,
        sigma_q_w=0.02,
        moe_provenance="literature_reported_instrument_precision",
        moe_citation_keys=["deninno1995"],
    )
    assert report["s_heat"] == 250.0
    assert report["exploratory_snr_eligible"] is True
    assert report["discovery_grade_eligible"] is False
    assert report["discovery_provenance_ok"] is False
    assert report["lenr_proved"] is False


def test_seed_scale_q_blocks_discovery_even_with_literature_reported() -> None:
    report = discovery_grade_analytics(
        excess_power_w=1.0,
        sigma_q_w=0.02,
        moe_provenance="literature_reported",
        moe_citation_keys=["miles1993"],
        q_source="excess_heat_watts",
        q_is_seed_scale=True,
    )
    assert report["s_heat"] == 50.0
    assert report["discovery_grade_eligible"] is False
    assert report["q_is_seed_scale"] is True
    assert report["lenr_proved"] is False


def test_discovery_grade_never_sets_lenr_proved_or_closes_eq_open() -> None:
    report = discovery_grade_analytics(
        excess_power_w=0.52,
        sigma_q_w=0.02,
        moe_provenance="literature_reported",
        moe_citation_keys=["miles1993"],
        literature_id="miles-1993",
        q_source="literature_peak_excess_power_W",
        q_is_seed_scale=False,
        moe_sigma_q_pairing_verified=True,
    )
    assert report["s_heat"] == 26.0
    assert report["discovery_grade_eligible"] is True
    assert report["lenr_proved"] is False
    assert set(report["eq_open_status"]) == set(OPEN_IDS)
    assert all(status == "OPEN" for status in report["eq_open_status"].values())

    register = open_question_register()["questions"]
    assert all(row["status"] == "OPEN" for row in register)
    assert {row["id"] for row in register} == set(OPEN_IDS)


def test_miles_uses_literature_peak_not_seed_scale_q() -> None:
    """Miles: peak Q for exploratory S_heat; instrument_precision → not discovery.

    ±0.02 W is follow-on calorimetric error (miles_calorimetric_error_followon),
    not a verified total 1σ for the 1993 JEAC 0.52 W peak. Prefer peak over
    seed excess_heat_watts=1.0; discovery_grade_eligible stays False.
    """
    miles = next(
        row for row in literature_records() if row["literature_id"] == "miles-1993"
    )
    assert float(miles["sigma_Q_W"]) == 0.02
    assert float(miles["excess_heat_watts"]) == 1.0
    assert float(miles["parameters"]["literature_peak_excess_power_W"]) == 0.52
    assert miles["moe_provenance"] == "literature_reported_instrument_precision"
    assert "miles1993" in miles["moe_citation_keys"]
    assert "miles_calorimetric_error_followon" in miles["moe_citation_keys"]
    assert miles.get("moe_sigma_q_pairing_verified") is not True

    seeded = next(
        row
        for row in get_baseline_experiments()
        if row["literature_id"] == "miles-1993"
    )
    assert float(seeded["sigma_Q_W"]) == 0.02
    assert seeded["moe_provenance"] == "literature_reported_instrument_precision"
    assert seeded["parameters"]["moe_provenance"] == (
        "literature_reported_instrument_precision"
    )

    report = discovery_grade_from_literature_record(miles)
    assert report["q_source"] == "literature_peak_excess_power_W"
    assert report["q_is_seed_scale"] is False
    assert report["excess_power_w"] == 0.52
    assert report["s_heat"] == 26.0  # exploratory arithmetic only
    assert report["exploratory_snr_eligible"] is True
    assert report["moe_provenance"] == "literature_reported_instrument_precision"
    assert report["discovery_provenance_ok"] is False
    assert report["moe_sigma_q_pairing_verified"] is False
    assert report["discovery_grade_eligible"] is False
    assert report["lenr_proved"] is False
    assert all(v == "OPEN" for v in report["eq_open_status"].values())


def test_mckubre_peers_have_instrument_floor_metadata_not_sigma_q() -> None:
    """McKubre: floor + relative fraction only; no published sigma_Q_W for S_heat."""
    for lit_id in ("mckubre-sri-p13-p14-1992", "mckubre-high-loading-1998"):
        mck = next(
            row for row in literature_records() if row["literature_id"] == lit_id
        )
        assert "sigma_Q_W" not in mck or mck.get("sigma_Q_W") is None
        assert float(mck["sigma_Q_instrument_floor_W"]) == 0.01
        assert float(mck["sigma_Q_relative_fraction"]) == 0.001
        assert mck["moe_provenance"] == "literature_reported_instrument_floor"
        assert "mckubre2008" in mck["moe_citation_keys"]
        if lit_id == "mckubre-sri-p13-p14-1992":
            assert mck["results"]["excess_heat_reproducibility"] == 0.7

        seeded = next(
            row
            for row in get_baseline_experiments()
            if row["literature_id"] == lit_id
        )
        assert "sigma_Q_W" not in seeded
        assert "sigma_Q_W" not in seeded["parameters"]
        assert float(seeded["sigma_Q_instrument_floor_W"]) == 0.01
        assert float(seeded["parameters"]["sigma_Q_instrument_floor_W"]) == 0.01

        report = discovery_grade_from_literature_record(mck)
        assert report["sigma_q_w"] is None
        assert report["s_heat"] is None
        assert report["discovery_grade_eligible"] is False
        assert report["q_is_seed_scale"] is True
        assert report["lenr_proved"] is False
        assert all(v == "OPEN" for v in report["eq_open_status"].values())


def test_deninno_instrument_precision_exploratory_only() -> None:
    deninno = next(
        row
        for row in literature_records()
        if row["literature_id"] == "deninno-tid-1995"
    )
    assert float(deninno["sigma_Q_W"]) == 0.02
    assert deninno["moe_provenance"] == "literature_reported_instrument_precision"
    den_report = discovery_grade_from_literature_record(deninno)
    # Seed Q=5 W used only for exploratory S_heat; not discovery-grade
    assert den_report["q_is_seed_scale"] is True
    assert den_report["s_heat"] == 250.0
    assert den_report["exploratory_snr_eligible"] is True
    assert den_report["discovery_grade_eligible"] is False
    assert den_report["lenr_proved"] is False
    assert all(v == "OPEN" for v in den_report["eq_open_status"].values())


def test_kasagi_nicu_same_results_envelope_pairing_can_discover() -> None:
    """NiCu results carry q_ex_w + sigma_Q_W together → pairing verified."""
    nicu = next(
        row
        for row in iccf27_literature_records()
        if row["literature_id"] == "kasagi-nicu-radiant-2026"
    )
    assert float(nicu["sigma_Q_W"]) == 0.08
    assert nicu["moe_provenance"] == "literature_reported"
    report = discovery_grade_from_literature_record(nicu)
    assert report["q_source"] == "results.q_ex_w"
    assert report["q_is_seed_scale"] is False
    assert report["excess_power_w"] == 1.1
    assert report["s_heat"] == 1.1 / 0.08
    assert report["moe_sigma_q_pairing_verified"] is True
    assert report["discovery_grade_eligible"] is True
    assert report["lenr_proved"] is False
    assert all(v == "OPEN" for v in report["eq_open_status"].values())


def test_kasagi_ni_control_same_results_envelope_pairing_can_discover() -> None:
    """Ni control shares Kasagi radiant MoE; results envelope verifies Q↔σ pairing.

    Analytics discovery_grade_eligible may clear; honesty locks stay false/OPEN.
    """
    ni = next(
        row
        for row in iccf27_literature_records()
        if row["literature_id"] == "kasagi-ni-radiant-2026"
    )
    assert float(ni["sigma_Q_W"]) == 0.08
    assert ni["moe_provenance"] == "literature_reported"
    assert float(ni["results"]["q_ex_w"]) == 0.9
    assert float(ni["results"]["sigma_Q_W"]) == 0.08
    report = discovery_grade_from_literature_record(ni)
    assert report["q_source"] == "results.q_ex_w"
    assert report["q_is_seed_scale"] is False
    assert report["excess_power_w"] == 0.9
    assert report["s_heat"] == 0.9 / 0.08
    assert report["exploratory_snr_eligible"] is True
    assert report["moe_sigma_q_pairing_verified"] is True
    assert report["discovery_grade_eligible"] is True
    assert report["lenr_proved"] is False
    assert all(v == "OPEN" for v in report["eq_open_status"].values())

    gap = discovery_grade_gap_bookkeeping(report)
    assert gap["overall_status"] == "met"
    assert gap["lenr_proved"] is False
    closure = honest_closure_bookkeeping(gap)
    assert closure["overall_status"] == "not_met"
    assert closure["lenr_proved"] is False
    distance = quantitative_distance_to_discovery(report)
    assert distance["distance_status"] == "at_or_above_bar_gates_clear"
    assert distance["arithmetic_sigma_shortfall"] == 0.0
    assert distance["lenr_proved"] is False


def test_corpus_discovery_grade_gap_lists_not_met_gates() -> None:
    gap = corpus_discovery_grade_gap()
    assert gap["schema"] == "lenr-discovery-grade-gap-v1"
    assert gap["overall_status"] == "not_met"
    assert gap["discovery_grade_eligible"] is False
    assert gap["lenr_proved"] is False
    assert all(v == "OPEN" for v in gap["eq_open_status"].values())
    assert set(gap["eq_open_status"]) == set(OPEN_IDS)
    missing_ids = set(gap["missing_ids"])
    assert missing_ids >= set(GAP_REQUIREMENT_IDS)
    assert all(row["status"] == "not_met" for row in gap["missing_requirements"])
    assert "cite_gated_sigma_q" in missing_ids
    assert "moe_pairing_verified" in missing_ids
    assert "s_heat_ge_5" in missing_ids


def test_gap_bookkeeping_on_miles_keeps_not_met_and_open() -> None:
    miles = next(
        row for row in literature_records() if row["literature_id"] == "miles-1993"
    )
    report = discovery_grade_from_literature_record(miles)
    gap = discovery_grade_gap_bookkeeping(report)
    assert gap["overall_status"] == "not_met"
    assert gap["discovery_grade_eligible"] is False
    assert "moe_pairing_verified" in gap["missing_ids"]
    assert "discovery_provenance" in gap["missing_ids"]
    assert gap["lenr_proved"] is False
    assert all(v == "OPEN" for v in gap["eq_open_status"].values())


def test_gap_bookkeeping_clears_analytics_gates_without_closing_eq_open() -> None:
    """Kasagi NiCu can clear BDS-302 analytics gates; still never closes EQ-OPEN."""
    nicu = next(
        row
        for row in iccf27_literature_records()
        if row["literature_id"] == "kasagi-nicu-radiant-2026"
    )
    report = discovery_grade_from_literature_record(nicu)
    assert report["discovery_grade_eligible"] is True
    gap = discovery_grade_gap_bookkeeping(report)
    assert gap["overall_status"] == "met"
    assert gap["missing_ids"] == []
    assert gap["discovery_grade_eligible"] is True
    assert gap["lenr_proved"] is False
    assert all(v == "OPEN" for v in gap["eq_open_status"].values())
    assert "does not set lenr_proved" in gap["honesty"]

    closure = honest_closure_bookkeeping(gap)
    assert closure["overall_status"] == "not_met"
    assert closure["lenr_proved"] is False
    assert set(CLOSURE_REQUIREMENT_IDS).issubset(set(closure["missing_ids"]))
    assert all(v == "OPEN" for v in closure["eq_open_status"].values())

    attached = attach_discovery_grade_envelopes(report)
    assert attached["discovery_grade_gap"]["overall_status"] == "met"
    assert attached["honest_closure"]["overall_status"] == "not_met"
    assert attached["lenr_proved"] is False
    assert attached["quantitative_distance"]["distance_status"] == (
        "at_or_above_bar_gates_clear"
    )
    assert attached["quantitative_distance"]["arithmetic_sigma_shortfall"] == 0.0
    assert attached["quantitative_distance"]["lenr_proved"] is False


def test_quantitative_distance_corpus_default_undefined() -> None:
    distance = quantitative_distance_to_discovery(None)
    assert distance["schema"] == "lenr-sigma-distance-v1"
    assert distance["distance_status"] == "undefined"
    assert distance["s_heat"] is None
    assert distance["arithmetic_sigma_shortfall"] is None
    assert distance["lenr_proved"] is False
    assert all(v == "OPEN" for v in distance["eq_open_status"].values())


def test_quantitative_distance_below_bar_reports_shortfall() -> None:
    report = discovery_grade_analytics(
        excess_power_w=0.08,
        sigma_q_w=0.02,
        moe_provenance="literature_reported",
        moe_citation_keys=["miles1993"],
        moe_sigma_q_pairing_verified=True,
    )
    distance = quantitative_distance_to_discovery(report)
    assert distance["s_heat"] == 4.0
    assert distance["arithmetic_sigma_shortfall"] == 1.0
    assert distance["required_sigma_q_w_for_5"] == 0.016
    assert distance["sigma_tightening_factor_vs_5"] == 0.02 / 0.016
    assert distance["distance_status"] == "below_bar"
    assert distance["discovery_grade_eligible"] is False
    assert distance["lenr_proved"] is False


def test_quantitative_distance_miles_above_bar_gates_blocked() -> None:
    miles = next(
        row for row in literature_records() if row["literature_id"] == "miles-1993"
    )
    report = discovery_grade_from_literature_record(miles)
    gap = discovery_grade_gap_bookkeeping(report)
    distance = gap["quantitative_distance"]
    assert distance["s_heat"] == 26.0
    assert distance["moe_provenance"] == "literature_reported_instrument_precision"
    assert distance["moe_sigma_q_pairing_verified"] is False
    assert distance["arithmetic_sigma_shortfall"] == 0.0
    assert distance["distance_status"] == "at_or_above_bar_gates_blocked"
    assert distance["discovery_grade_eligible"] is False
    assert distance["stat_sys_composition"]["composition_mode"] == "explicit_total"
    assert gap["overall_status"] == "not_met"
    assert gap["lenr_proved"] is False
    assert "Never render bare S_heat" in distance["honesty"]


def test_quantitative_distance_rss_stat_sys_composition() -> None:
    report = discovery_grade_analytics(
        excess_power_w=0.1,
        sigma_q_statistical_w=0.03,
        sigma_q_systematic_w=0.04,
        moe_provenance="literature_reported",
        moe_citation_keys=["miles1993"],
        moe_sigma_q_pairing_verified=True,
    )
    distance = quantitative_distance_to_discovery(report)
    assert distance["sigma_q_w"] == 0.05
    assert distance["stat_sys_composition"]["composition_mode"] == "rss_stat_sys"
    assert distance["stat_sys_composition"]["sigma_q_rss_w"] == 0.05
    assert distance["s_heat"] == 2.0
    assert distance["arithmetic_sigma_shortfall"] == 3.0
    assert distance["distance_status"] == "below_bar"


def test_literature_corpus_moe_coverage_keeps_honesty_locks() -> None:
    coverage = literature_corpus_moe_coverage()
    assert coverage["schema"] == "lenr-moe-coverage-v1"
    assert coverage["n_records"] == 26
    assert coverage["with_sigma_q"] == 5
    assert coverage["with_literature_reported_cite_gated"] == 2
    assert coverage["with_moe_pairing_verified"] == 2
    assert coverage["discovery_grade_eligible_count"] == 2
    assert set(coverage["discovery_grade_eligible_ids"]) == {
        "kasagi-nicu-radiant-2026",
        "kasagi-ni-radiant-2026",
    }
    assert set(coverage["pairing_verified_ids"]) == {
        "kasagi-nicu-radiant-2026",
        "kasagi-ni-radiant-2026",
    }
    assert coverage["closes_eq_open"] is False
    assert coverage["lenr_proved"] is False
    assert all(v == "OPEN" for v in coverage["eq_open_status"].values())
    assert coverage["discovery_grade_eligible_count"] < coverage["n_records"]
    assert "exploratory_moe" in coverage["source"]


def test_miles_deninno_mckubre_stay_exploratory_not_discovery() -> None:
    """Instrument_precision / floor MoE never flips discovery_grade_eligible."""
    by_id = {
        row["literature_id"]: row
        for row in literature_records()
        if row["literature_id"]
        in {
            "miles-1993",
            "deninno-tid-1995",
            "mckubre-sri-p13-p14-1992",
            "mckubre-high-loading-1998",
        }
    }
    miles = discovery_grade_from_literature_record(by_id["miles-1993"])
    assert miles["moe_provenance"] == "literature_reported_instrument_precision"
    assert miles["moe_sigma_q_pairing_verified"] is False
    assert miles["discovery_grade_eligible"] is False
    assert miles["s_heat"] == 26.0
    assert quantitative_distance_to_discovery(miles)["distance_status"] == (
        "at_or_above_bar_gates_blocked"
    )

    deninno = discovery_grade_from_literature_record(by_id["deninno-tid-1995"])
    assert deninno["moe_provenance"] == "literature_reported_instrument_precision"
    assert deninno["discovery_grade_eligible"] is False
    assert deninno["q_is_seed_scale"] is True

    for lit_id in ("mckubre-sri-p13-p14-1992", "mckubre-high-loading-1998"):
        mckubre = discovery_grade_from_literature_record(by_id[lit_id])
        assert mckubre["moe_provenance"] == "literature_reported_instrument_floor"
        assert mckubre["sigma_q_w"] is None
        assert mckubre["discovery_grade_eligible"] is False
        assert mckubre["lenr_proved"] is False
        assert all(v == "OPEN" for v in mckubre["eq_open_status"].values())


def test_celani_exploratory_hydrate_stays_non_discovery() -> None:
    """Celani JCMNS 29 12±2 is exploratory instrument_precision — not discovery."""
    from app.data.dataset_io import exploratory_moe_literature_records

    celani = next(
        row
        for row in exploratory_moe_literature_records()
        if row["literature_id"] == "celani-constantan-2019"
    )
    assert float(celani["sigma_Q_W"]) == 2.0
    assert float(celani["parameters"]["literature_peak_excess_power_W"]) == 12.0
    assert celani["moe_provenance"] == "literature_reported_instrument_precision"
    assert celani.get("moe_sigma_q_pairing_verified") is False
    assert "celani2019" in celani["moe_citation_keys"]

    report = discovery_grade_from_literature_record(celani)
    assert report["q_source"] == "literature_peak_excess_power_W"
    assert report["q_is_seed_scale"] is False
    assert report["excess_power_w"] == 12.0
    assert report["s_heat"] == 6.0
    assert report["moe_provenance"] == "literature_reported_instrument_precision"
    assert report["discovery_provenance_ok"] is False
    assert report["moe_sigma_q_pairing_verified"] is False
    assert report["discovery_grade_eligible"] is False
    assert report["lenr_proved"] is False
    assert all(v == "OPEN" for v in report["eq_open_status"].values())
    assert quantitative_distance_to_discovery(report)["distance_status"] == (
        "at_or_above_bar_gates_blocked"
    )
