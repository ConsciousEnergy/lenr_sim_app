"""ENG-HS-08 / HIP-02 ranked-regime hygiene + S_heat ladder invariants."""

from __future__ import annotations

from app.physics_engine.calorimetry_significance import (
    DISCOVERY_GRADE_SIGMA,
    discovery_grade_analytics,
    discovery_grade_from_literature_record,
)
from app.physics_engine.ranked_regime_hygiene import (
    BAND_DEMOTED_SEED,
    BAND_DISCOVERY,
    BAND_EXPLORATORY,
    SCHEMA,
    build_s_heat_ladder,
    is_high_success_rankable,
    literature_s_heat_ladder,
    regime_band,
)
from app.data.dataset_io import curated_literature_corpus_records


def _by_id():
    rows = curated_literature_corpus_records()
    return {
        row["literature_id"]: discovery_grade_from_literature_record(row)
        for row in rows
    }


def test_seed_scale_deninno_demoted_not_high_success() -> None:
    by_id = _by_id()
    deninno = by_id["deninno-tid-1995"]
    assert deninno["q_is_seed_scale"] is True
    assert float(deninno["s_heat"]) == 250.0
    assert regime_band(deninno) == BAND_DEMOTED_SEED
    assert is_high_success_rankable(deninno) is False


def test_miles_exploratory_not_high_success_despite_s26() -> None:
    by_id = _by_id()
    miles = by_id["miles-1993"]
    assert float(miles["s_heat"]) == 26.0
    assert miles["moe_provenance"] == "literature_reported_instrument_precision"
    assert regime_band(miles) == BAND_EXPLORATORY
    assert is_high_success_rankable(miles) is False
    assert miles["discovery_grade_eligible"] is False


def test_kasagi_literature_reported_is_high_success() -> None:
    by_id = _by_id()
    nicu = by_id["kasagi-nicu-radiant-2026"]
    ni = by_id["kasagi-ni-radiant-2026"]
    assert regime_band(nicu) == BAND_DISCOVERY
    assert regime_band(ni) == BAND_DISCOVERY
    assert is_high_success_rankable(nicu) is True
    assert is_high_success_rankable(ni) is True
    assert float(nicu["s_heat"]) == 13.75
    assert float(ni["s_heat"]) == 11.25


def test_build_ladder_honest_order_beats_raw_s_heat_lie() -> None:
    by_id = _by_id()
    ladder = build_s_heat_ladder(list(by_id.values()))
    assert ladder["schema"] == SCHEMA
    assert ladder["discovery_grade_threshold_sigma"] == DISCOVERY_GRADE_SIGMA
    assert ladder["lenr_proved"] is False
    assert ladder["closes_eq_open"] is False
    assert all(v == "OPEN" for v in ladder["eq_open_status"].values())

    honest_ids = ladder["honest_high_success_order_ids"]
    assert honest_ids == [
        "kasagi-nicu-radiant-2026",
        "kasagi-ni-radiant-2026",
    ]
    # Raw arithmetic would put De Ninno (250) first — ENG-HS-08 catches the lie.
    assert ladder["raw_s_heat_order_ids"][0] == "deninno-tid-1995"
    assert ladder["eng_hs_08"]["raw_s_heat_would_lie"] is True

    demoted_ids = {
        row["literature_id"] for row in ladder["demoted_seed_scale"]
    }
    assert "deninno-tid-1995" in demoted_ids
    explor_ids = {
        row["literature_id"] for row in ladder["exploratory_band"]
    }
    assert "miles-1993" in explor_ids
    assert "celani-constantan-2019" in explor_ids
    assert "deninno-tid-1995" not in explor_ids

    # Seed outliers stay off the primary display scale.
    den_row = next(
        r
        for r in ladder["demoted_seed_scale"]
        if r["literature_id"] == "deninno-tid-1995"
    )
    assert den_row["display_s_heat"] is None
    assert den_row["s_heat"] == 250.0


def test_literature_s_heat_ladder_corpus_snapshot() -> None:
    ladder = literature_s_heat_ladder()
    assert ladder["n_records"] == 26
    assert ladder["n_high_success_rankable"] == 2
    assert ladder["n_seed_scale_demoted"] >= 1
    assert ladder["ranked_high_success"][0]["literature_id"] == (
        "kasagi-nicu-radiant-2026"
    )
    assert ladder["ranked_high_success"][0]["claim_tier"] == (
        "empirical_lenr_correlation"
    )
    assert ladder["ranked_high_success"][0]["high_success_rank"] == 1
    miles = next(
        r
        for r in ladder["exploratory_band"]
        if r["literature_id"] == "miles-1993"
    )
    assert miles["claim_tier"] == "speculative_exploratory"
    assert miles["high_success_rankable"] is False


def test_synthetic_seed_plus_instrument_precision_excluded() -> None:
    seed = discovery_grade_analytics(
        excess_power_w=5.0,
        sigma_q_w=0.02,
        moe_provenance="literature_reported_instrument_precision",
        moe_citation_keys=["deninno1995"],
        q_is_seed_scale=True,
        moe_sigma_q_pairing_verified=False,
        literature_id="synthetic-seed",
    )
    lit = discovery_grade_analytics(
        excess_power_w=1.1,
        sigma_q_w=0.08,
        moe_provenance="literature_reported",
        moe_citation_keys=["kasagi2026"],
        q_is_seed_scale=False,
        moe_sigma_q_pairing_verified=True,
        literature_id="synthetic-kasagi",
    )
    ladder = build_s_heat_ladder([seed, lit])
    assert ladder["honest_high_success_order_ids"] == ["synthetic-kasagi"]
    assert ladder["raw_s_heat_order_ids"][0] == "synthetic-seed"
    assert is_high_success_rankable(seed) is False
    assert is_high_success_rankable(lit) is True
