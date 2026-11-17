"""Campaign pack index API — honesty locks, no proof claims."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.services.campaign_pack_index import (
    FIXTURE_PACK_IDS,
    INDEX_SCHEMA,
    REQUIRED_OPEN_IDS,
    list_committed_pack_summaries,
)


def test_list_committed_pack_summaries_honesty() -> None:
    payload = list_committed_pack_summaries()
    assert payload["schema"] == INDEX_SCHEMA
    assert payload["lenr_proved"] is False
    assert payload["eq_open_status"] == "OPEN"
    assert set(payload["required_open_ids"]) == set(REQUIRED_OPEN_IDS)
    packs = payload["packs"]
    assert len(packs) >= 5
    ids = {p["pack_id"] for p in packs}
    assert "smoke" in ids
    assert "q_campaign_demo" in ids
    assert "cavitation_collapse_campaign" in ids
    for pack in packs:
        assert pack["lenr_proved"] is False
        assert pack["schema"] == "lenr-reviewer-pack-v1"
        assert pack["open_ids_all_present"] is True
        assert set(REQUIRED_OPEN_IDS) <= set(pack["open_ids"])
        if pack["pack_id"] in FIXTURE_PACK_IDS:
            assert pack["fixture"] is True
            assert pack["role"] == "fixture"


def test_campaign_packs_api_endpoint() -> None:
    from app.main import app

    with TestClient(app) as client:
        resp = client.get("/api/docs/campaign-packs")
        assert resp.status_code == 200
        data = resp.json()
        assert data["lenr_proved"] is False
        assert data["eq_open_status"] == "OPEN"
        assert data["n_packs"] == len(data["packs"])
        assert data["surfaces"]["paper_packets_a_e"] == "/docs/reviewer-packets"
        smoke = next(p for p in data["packs"] if p["pack_id"] == "smoke")
        assert smoke["fixture"] is True


def test_researcher_review_pack_doc_is_039_branded() -> None:
    from app.main import app

    with TestClient(app) as client:
        resp = client.get("/api/docs/researcher-review-pack")
        assert resp.status_code == 200
        text = resp.text
        assert "v0.3.9-beta" in text
        assert "Do not conflate surfaces" in text
        # Prefer bundled 0.3.9 copy over root stub / historical 0.3.6 title as H1.
        assert text.lstrip().startswith("# Researcher review pack (v0.3.9-beta)")


def test_reviewer_packets_doc_disambiguates_surfaces() -> None:
    from app.main import app

    with TestClient(app) as client:
        resp = client.get("/api/docs/reviewer-packets")
        assert resp.status_code == 200
        assert "Do not conflate surfaces" in resp.text
        assert "Campaign JSON packs" in resp.text
