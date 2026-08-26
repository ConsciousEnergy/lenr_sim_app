"""Reviewer-pack envelope: schema, OPEN ids, no LENR proof."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.data.dataset_io import datasets_root
from app.services.reviewer_pack import PACK_SCHEMA, build_manifest
from app.services.simulation_persistence import SOURCE_AUTO_PERSIST

OPEN_IDS = {
    "EQ-OPEN-MEV-01",
    "EQ-OPEN-RAD-01",
    "EQ-OPEN-RATE-01",
    "EQ-OPEN-EC-01",
    "EQ-OPEN-YIELD-01",
}


def test_committed_smoke_fixture_stays_open() -> None:
    root = datasets_root() / "reviewer_packs" / "smoke"
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["schema"] == PACK_SCHEMA
    assert manifest["lenr_proved"] is False
    assert set(manifest["open_ids"]) == OPEN_IDS
    experiments = (root / "experiments.jsonl").read_text(encoding="utf-8").strip().splitlines()
    assert len(experiments) == 1
    assert json.loads(experiments[0])["sourceClass"] == "Campaign"


def test_exporter_writes_envelope_from_persisted_runs(tmp_path: Path) -> None:
    from app.core.database import db_manager
    from app.services.reviewer_pack import collect_pack_rows, write_pack

    def _client() -> TestClient:
        from app.main import app

        return TestClient(app)

    with _client() as client:
        resp = client.post(
            "/api/physics/theories/run",
            json={
                "conditions": {"temperature": 300.0, "loading_ratio": 0.9},
                "persist_session_id": "reviewer-pack-test",
                "persist_source": SOURCE_AUTO_PERSIST,
            },
        )
        assert resp.status_code == 200
        assert resp.json().get("open_questions", {}).get("lenr_proved") is False

        async def _write() -> Path:
            async with db_manager.session() as session:
                experiments, runs = await collect_pack_rows(session)
            return write_pack(tmp_path / "pack", experiments, runs, preset="smoke")

        import asyncio

        manifest_path = asyncio.run(_write())
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        assert manifest["schema"] == PACK_SCHEMA
        assert manifest["lenr_proved"] is False
        assert manifest["empirical_claim_tiers_raised"] is False
        assert set(manifest["open_ids"]) == OPEN_IDS
        assert manifest["n_theory_runs"] >= 1
        assert (tmp_path / "pack" / "experiments.jsonl").is_file()
        assert (tmp_path / "pack" / "theory_runs.jsonl").is_file()


def test_empty_manifest_never_claims_proof() -> None:
    manifest = build_manifest([], [], preset="smoke")
    assert manifest["lenr_proved"] is False
    assert set(manifest["open_ids"]) == OPEN_IDS
