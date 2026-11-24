"""Campaign pack index API — honesty locks, no proof claims."""

from __future__ import annotations

import json
from pathlib import Path

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


def test_string_lenr_proved_false_not_advertised(
    tmp_path: Path, monkeypatch
) -> None:
    """Non-boolean lenr_proved (e.g. string \"false\") must not be advertised."""
    bad = tmp_path / "string_false_pack"
    bad.mkdir()
    (bad / "manifest.json").write_text(
        json.dumps(
            {
                "schema": "lenr-reviewer-pack-v1",
                "preset": "string_false_pack",
                "n_experiments": 1,
                "n_theory_runs": 1,
                "lenr_proved": "false",
                "open_ids": list(REQUIRED_OPEN_IDS),
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(
        "app.services.campaign_pack_index._pack_root", lambda: tmp_path
    )
    payload = list_committed_pack_summaries()
    assert payload["packs"] == []
    assert payload["lenr_proved"] is False


def test_missing_lenr_proved_not_advertised(tmp_path: Path, monkeypatch) -> None:
    missing = tmp_path / "missing_proof_flag"
    missing.mkdir()
    (missing / "manifest.json").write_text(
        json.dumps(
            {
                "schema": "lenr-reviewer-pack-v1",
                "preset": "missing_proof_flag",
                "n_experiments": 1,
                "n_theory_runs": 1,
                "open_ids": list(REQUIRED_OPEN_IDS),
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(
        "app.services.campaign_pack_index._pack_root", lambda: tmp_path
    )
    assert list_committed_pack_summaries()["packs"] == []


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
        assert "v0.4.1-beta" in text
        assert "Do not conflate surfaces" in text
        # Prefer bundled 0.3.9 copy over root stub / historical 0.3.6 title as H1.
        assert text.lstrip().startswith("# Researcher review pack (v0.4.1-beta)")


def test_reviewer_packets_doc_disambiguates_surfaces() -> None:
    from app.main import app

    with TestClient(app) as client:
        resp = client.get("/api/docs/reviewer-packets")
        assert resp.status_code == 200
        assert "Do not conflate surfaces" in resp.text
        assert "Campaign JSON packs" in resp.text
