"""Unit checks for Phase B avenue ranking scores and UQ reuse."""

from __future__ import annotations

from app.campaign.avenue_catalog import avenue_definitions
from app.campaign.avenue_ranking import rank_avenues


def test_catalog_covers_open_ids_and_cavitation_slot() -> None:
    defs = avenue_definitions()
    ids = {row["id"] for row in defs}
    assert "miles_heat_helium_q" in ids
    assert "cavitation_collapse_uq" in ids
    assert "rate_budget_loading" in ids
    stressed = {oid for row in defs for oid in row["stresses_open_ids"]}
    for oid in (
        "EQ-OPEN-MEV-01",
        "EQ-OPEN-RAD-01",
        "EQ-OPEN-RATE-01",
        "EQ-OPEN-EC-01",
        "EQ-OPEN-YIELD-01",
    ):
        assert oid in stressed


def test_rate_uq_layer_applies_experimental_band() -> None:
    payload = rank_avenues(pack_ids=["smoke", "q_campaign_demo"], n_uq_samples=16, seed=3)
    rate_rows = [
        row for row in payload["avenues"]
        if row["uq_layer"] in {"reaction_rate_uq", "rate_and_oracle"}
    ]
    assert rate_rows
    applied = [row for row in rate_rows if row["rate_uq"].get("applied")]
    assert applied
    sample = applied[0]["rate_uq"]
    assert sample["interval_kind_prior"] == "predictive"
    assert sample["interval_kind_posterior"] in {"posterior_credible", "predictive"}
    assert len(sample["experimental_band"]) == 2


def test_collapse_uq_summary_is_predictive_scenario() -> None:
    payload = rank_avenues(pack_ids=["smoke"], n_uq_samples=16, seed=5)
    summary = payload["collapse_uq_summary"]
    assert summary["interval_kind"] == "predictive"
    assert summary["kind"] == "scenario_table_not_posterior"
    assert summary["peak_temperature_width_k"] > 0.0
    cav = next(row for row in payload["avenues"] if row["id"] == "cavitation_collapse_uq")
    assert cav["collapse_uq"] is not None
    assert cav["optional_pack_present"] is False


def test_oracle_priors_are_surfaced() -> None:
    payload = rank_avenues(pack_ids=["smoke"], n_uq_samples=8, seed=9)
    assert "chemical_null" in payload["priors"]["default_skeptical"]
    assert "trapped_state" in payload["priors"]["occurrence_anchored"]
    assert payload["oracle_summary"]["miles_band_mev"] == [20.0, 28.0]
    assert payload["oracle_summary"]["next_measurement"]
