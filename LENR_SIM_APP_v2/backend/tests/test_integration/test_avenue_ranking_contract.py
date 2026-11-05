"""Contract: avenue ranking never flips OPEN ids or sets lenr_proved."""

from __future__ import annotations

from app.campaign.avenue_catalog import CAVITATION_PACK_ID, OPEN_IDS, avenue_definitions
from app.campaign.avenue_ranking import (
    SCHEMA,
    assert_ranking_honesty,
    discover_seed_packs,
    rank_avenues,
)


def test_ranking_from_smoke_and_q_demo_never_proves_or_closes() -> None:
    payload = rank_avenues(
        pack_ids=["smoke", "q_campaign_demo", CAVITATION_PACK_ID],
        n_uq_samples=16,
        seed=7,
    )
    assert_ranking_honesty(payload)
    assert payload["schema"] == SCHEMA
    assert payload["lenr_proved"] is False
    assert payload["kind"] == "scenario_table_not_posterior"
    assert set(payload["open_ids"]) == set(OPEN_IDS)
    assert all(payload["open_status"][oid] == "OPEN" for oid in OPEN_IDS)
    assert "LENR_PROVED" in payload["forbidden"]
    assert payload["n_experiments"] >= 1
    assert "smoke" in payload["pack_sources"]
    assert "q_campaign_demo" in payload["pack_sources"]
    # Phase A pack soft-plugs; absence must not break honesty.
    assert payload["phase_a_pack_id"] == CAVITATION_PACK_ID
    assert isinstance(payload["phase_a_pack_present"], bool)

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


def test_discover_seed_packs_skips_missing_phase_a() -> None:
    found = discover_seed_packs(["smoke", CAVITATION_PACK_ID, "does_not_exist"])
    assert "smoke" in found
    assert "does_not_exist" not in found
    # cavitation pack may or may not be present; discovery must not raise.
    assert CAVITATION_PACK_ID in found or CAVITATION_PACK_ID not in found


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
