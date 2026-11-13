"""Contract: avenue ranking never flips OPEN ids or sets lenr_proved."""

from __future__ import annotations

from app.campaign.avenue_catalog import (
    CAVITATION_PACK_ID,
    FALLBACK_PACK_ID,
    OPEN_IDS,
    avenue_definitions,
)
from app.campaign.avenue_ranking import (
    CAVITATION_PACK_BOOST,
    INFORM_W_COLLAPSE,
    INFORM_W_COVERAGE,
    INFORM_W_ORACLE_RANK,
    INFORM_W_SEPARATION,
    INFORM_W_UQ_SHRINK,
    SCHEMA,
    assert_ranking_honesty,
    discover_seed_packs,
    prefer_ranking_packs,
    rank_avenues,
)


def test_default_prefers_cavitation_pack_when_present() -> None:
    preferred = prefer_ranking_packs()
    assert preferred, "expected at least one seed pack"
    if CAVITATION_PACK_ID in discover_seed_packs():
        assert preferred == [CAVITATION_PACK_ID]
    else:
        assert preferred[0] == FALLBACK_PACK_ID


def test_ranking_from_preferred_pack_never_proves_or_closes() -> None:
    payload = rank_avenues(n_uq_samples=16, seed=7)
    assert_ranking_honesty(payload)
    assert payload["schema"] == SCHEMA
    assert payload["lenr_proved"] is False
    assert payload["kind"] == "scenario_table_not_posterior"
    assert set(payload["open_ids"]) == set(OPEN_IDS)
    assert all(payload["open_status"][oid] == "OPEN" for oid in OPEN_IDS)
    assert "LENR_PROVED" in payload["forbidden"]
    assert payload["n_experiments"] >= 1
    assert payload["preferred_pack"] in {
        CAVITATION_PACK_ID,
        FALLBACK_PACK_ID,
        "smoke",
    }
    assert payload["phase_a_pack_id"] == CAVITATION_PACK_ID
    if CAVITATION_PACK_ID in discover_seed_packs():
        assert payload["phase_a_pack_present"] is True
        assert payload["preferred_pack"] == CAVITATION_PACK_ID
        assert payload["pack_sources"] == [CAVITATION_PACK_ID]
    else:
        assert payload["phase_a_pack_present"] is False
        assert FALLBACK_PACK_ID in payload["pack_sources"] or "smoke" in payload[
            "pack_sources"
        ]

    avenues = payload["avenues"]
    assert len(avenues) == len(avenue_definitions())
    ranks = [row["rank"] for row in avenues]
    assert ranks == list(range(1, len(avenues) + 1))
    scores = [row["informativeness_score"] for row in avenues]
    assert scores == sorted(scores, reverse=True)

    for row in avenues:
        assert row["lenr_proved"] is False
        assert row["kind"] == "scenario_table_not_posterior"
        assert all(status == "OPEN" for status in row["open_status"].values())
        for oid in row["stresses_open_ids"]:
            assert oid in OPEN_IDS or oid.startswith("EQ-OPEN-")


def test_explicit_pack_ids_still_filtered_for_honesty() -> None:
    payload = rank_avenues(
        pack_ids=["smoke", FALLBACK_PACK_ID, CAVITATION_PACK_ID],
        n_uq_samples=8,
        seed=3,
    )
    assert_ranking_honesty(payload)
    assert payload["lenr_proved"] is False


def test_discover_seed_packs_skips_missing() -> None:
    found = discover_seed_packs(["smoke", CAVITATION_PACK_ID, "does_not_exist"])
    assert "smoke" in found
    assert "does_not_exist" not in found


def test_assert_ranking_honesty_rejects_proved_flip() -> None:
    payload = rank_avenues(pack_ids=["smoke"], n_uq_samples=8, seed=1)
    bad = dict(payload)
    bad["lenr_proved"] = True
    try:
        assert_ranking_honesty(bad)
    except AssertionError as exc:
        assert "lenr_proved" in str(exc)
    else:
        raise AssertionError("expected honesty guard to reject lenr_proved=True")


def test_assert_ranking_honesty_rejects_open_close() -> None:
    payload = rank_avenues(pack_ids=["smoke"], n_uq_samples=8, seed=1)
    bad = dict(payload)
    bad["open_status"] = {**payload["open_status"], "EQ-OPEN-RATE-01": "CLOSED"}
    try:
        assert_ranking_honesty(bad)
    except AssertionError as exc:
        assert "EQ-OPEN-RATE-01" in str(exc)
    else:
        raise AssertionError("expected honesty guard to reject CLOSED OPEN id")


def test_ranking_priors_are_scenario_aids_not_lenr_posterior() -> None:
    """A-C3: Miles-anchored oracle priors must not be readable as P(LENR)."""
    from app.physics_engine.decision_oracle import ANCHORED_PRIORS, DEFAULT_PRIORS

    payload = rank_avenues(pack_ids=["smoke"], n_uq_samples=8, seed=2)
    assert_ranking_honesty(payload)
    assert payload["kind"] == "scenario_table_not_posterior"
    assert payload["lenr_proved"] is False
    assert payload["priors"]["default_skeptical"] == dict(DEFAULT_PRIORS)
    assert payload["priors"]["occurrence_anchored"] == dict(ANCHORED_PRIORS)
    assert payload["claim_tier"] == "speculative_exploratory"
    assert "LENR_PROVED" in payload["forbidden"]
    # Anchored priors remain a scenario table; never discharge YIELD/EC.
    assert all(payload["open_status"][oid] == "OPEN" for oid in OPEN_IDS)


def test_informativeness_blend_coeffs_bounded_and_documented() -> None:
    """A-C4: informativeness blend stays Approximate / bounded (not lab proof)."""
    blend = (
        INFORM_W_ORACLE_RANK,
        INFORM_W_COVERAGE,
        INFORM_W_UQ_SHRINK,
        INFORM_W_SEPARATION,
        INFORM_W_COLLAPSE,
    )
    assert abs(sum(blend) - 1.0) < 1e-9
    assert all(0.0 < weight < 1.0 for weight in blend)
    assert CAVITATION_PACK_BOOST == 0.15
    assert 0.0 < CAVITATION_PACK_BOOST < 0.5


def test_cavitation_boost_only_with_cavitation_pack() -> None:
    """A-C4: +0.15 cavitation boost present only when cavitation pack is ranked."""
    without = rank_avenues(pack_ids=["smoke"], n_uq_samples=8, seed=5)
    assert_ranking_honesty(without)
    assert CAVITATION_PACK_ID not in without["pack_sources"]
    without_cav = next(
        row for row in without["avenues"] if row["id"] == "cavitation_collapse_uq"
    )
    assert without["phase_a_pack_present"] is False
    assert without_cav["optional_pack_present"] is False

    if CAVITATION_PACK_ID not in discover_seed_packs():
        return

    with_cav = rank_avenues(pack_ids=[CAVITATION_PACK_ID], n_uq_samples=8, seed=5)
    assert_ranking_honesty(with_cav)
    assert with_cav["phase_a_pack_present"] is True
    cav_row = next(
        row for row in with_cav["avenues"] if row["id"] == "cavitation_collapse_uq"
    )
    smoke_row = without_cav
    # Soft boost raises cavitation avenue informativeness vs smoke-only; still not proof.
    assert cav_row["informativeness_score"] >= smoke_row["informativeness_score"]
    assert with_cav["lenr_proved"] is False
    assert all(with_cav["open_status"][oid] == "OPEN" for oid in OPEN_IDS)


def test_dual_pack_rank_keeps_open_after_detector_weak_growth() -> None:
    """A-C4 / A-C7: OPEN status unchanged after smoke + detector_weak_screen rank."""
    payload = rank_avenues(
        pack_ids=["smoke", "detector_weak_screen"],
        n_uq_samples=8,
        seed=9,
    )
    assert_ranking_honesty(payload)
    assert payload["kind"] == "scenario_table_not_posterior"
    assert payload["lenr_proved"] is False
    assert set(payload["open_ids"]) == set(OPEN_IDS)
    assert all(payload["open_status"][oid] == "OPEN" for oid in OPEN_IDS)
    assert "detector_weak_screen" in payload["pack_sources"]
    assert "smoke" in payload["pack_sources"]
