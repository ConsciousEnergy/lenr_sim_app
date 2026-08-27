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


def test_q_campaign_demo_pack_size_lock() -> None:
    root = datasets_root() / "reviewer_packs" / "q_campaign_demo"
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["schema"] == PACK_SCHEMA
    assert manifest["lenr_proved"] is False
    assert manifest["preset"] == "q_campaign_demo"
    assert manifest["n_experiments"] == 126
    assert manifest["n_theory_runs"] == 108
    assert manifest["source_class_counts"]["Baseline"] == 17
    assert manifest["source_class_counts"]["Campaign"] == 109
    experiments = (root / "experiments.jsonl").read_text(encoding="utf-8").strip().splitlines()
    runs = (root / "theory_runs.jsonl").read_text(encoding="utf-8").strip().splitlines()
    assert len(experiments) == 126
    assert len(runs) == 108
    assert set(manifest["open_ids"]) == OPEN_IDS


def test_import_smoke_pack_is_idempotent_and_stays_unproved(tmp_path: Path) -> None:
    import asyncio

    from app.core.database import db_manager
    from app.models.database_models import Experiment
    from app.services.reviewer_pack import PackImportError, import_pack_rows, read_pack
    from sqlalchemy import func, select

    smoke = datasets_root() / "reviewer_packs" / "smoke"
    manifest, experiments, _runs = read_pack(smoke)
    assert manifest["lenr_proved"] is False
    assert len(experiments) == 1

    def _client() -> TestClient:
        from app.main import app

        return TestClient(app)

    with _client():
        async def _import_twice() -> tuple[dict, dict, int]:
            async with db_manager.session() as session:
                first = await import_pack_rows(session, smoke)
            async with db_manager.session() as session:
                second = await import_pack_rows(session, smoke)
                count = (
                    await session.execute(
                        select(func.count(Experiment.id)).where(
                            Experiment.id == "smoke-exp-1"
                        )
                    )
                ).scalar()
            return first, second, int(count or 0)

        first, second, count = asyncio.run(_import_twice())
        assert first["lenr_proved"] is False
        assert first["n_experiments"] == 1
        assert second["experiments_updated"] >= 1
        assert count == 1

    proved = tmp_path / "proved"
    proved.mkdir()
    (proved / "manifest.json").write_text(
        json.dumps({"schema": PACK_SCHEMA, "lenr_proved": True, "open_ids": list(OPEN_IDS)})
        + "\n",
        encoding="utf-8",
    )
    (proved / "experiments.jsonl").write_text("{}\n", encoding="utf-8")
    try:
        read_pack(proved)
        raise AssertionError("expected PackImportError")
    except PackImportError as exc:
        assert "lenr_proved" in str(exc)
