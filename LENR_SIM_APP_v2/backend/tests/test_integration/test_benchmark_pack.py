"""UMLENR benchmark pack + campaign zip download contract tests."""

from __future__ import annotations

import io
import json
import zipfile

from fastapi.testclient import TestClient

from app.services.benchmark_pack import (
    DEFAULT_PACK_ID,
    PACK_SCHEMA_ID,
    PROVENANCE_SCHEMA_ID,
    REQUIRED_OPEN_IDS,
    build_benchmark_pack_zip,
    build_provenance,
    list_benchmark_packs,
)


def _client() -> TestClient:
    from app.main import app

    return TestClient(app)


def test_list_benchmark_packs_honesty() -> None:
    payload = list_benchmark_packs()
    assert payload["lenr_proved"] is False
    assert payload["eq_open_status"] == "all_five_OPEN"
    assert set(payload["required_open_ids"]) == set(REQUIRED_OPEN_IDS)
    assert payload["n_packs"] == 1
    pack = payload["packs"][0]
    assert pack["pack_id"] == DEFAULT_PACK_ID
    assert pack["schema_id"] == PACK_SCHEMA_ID
    assert pack["lenr_proved"] is False


def test_provenance_inventory_has_no_delivered_without_files() -> None:
    prov = build_provenance()
    assert prov["schema_id"] == PROVENANCE_SCHEMA_ID
    assert prov["lenr_proved"] is False
    assert prov["eq_open_status"] == "all_five_OPEN"
    for row in prov["inventory"]:
        assert row["status"] in {"delivered", "partial", "unavailable"}
        assert row.get("files")
        if row["status"] == "delivered":
            assert "unavailable" not in row["files"]


def test_build_zip_locks_honesty_and_export_schema() -> None:
    raw = build_benchmark_pack_zip(pack_id=DEFAULT_PACK_ID)
    with zipfile.ZipFile(io.BytesIO(raw)) as zf:
        names = set(zf.namelist())
        assert f"{DEFAULT_PACK_ID}/PROVENANCE.json" in names
        assert f"{DEFAULT_PACK_ID}/json/lenr-run-export-v1_default.json" in names
        assert f"{DEFAULT_PACK_ID}/json/unavailable_bao_2023.json" in names
        assert f"{DEFAULT_PACK_ID}/json/unavailable_kasagi_2002_raw.json" in names
        prov = json.loads(zf.read(f"{DEFAULT_PACK_ID}/PROVENANCE.json"))
        assert prov["lenr_proved"] is False
        export_env = json.loads(
            zf.read(f"{DEFAULT_PACK_ID}/json/lenr-run-export-v1_default.json")
        )
        assert export_env["schema_version"] == "lenr-run-export-v1"
        bao = json.loads(zf.read(f"{DEFAULT_PACK_ID}/json/unavailable_bao_2023.json"))
        assert bao["status"] == "unavailable"
        assert bao["numerics"] is None


def test_benchmark_pack_api_index_and_download() -> None:
    with _client() as client:
        idx = client.get("/api/benchmark-packs")
        assert idx.status_code == 200
        body = idx.json()
        assert body["lenr_proved"] is False
        assert body["packs"][0]["pack_id"] == DEFAULT_PACK_ID

        resp = client.get(f"/api/benchmark-packs/{DEFAULT_PACK_ID}/download")
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("application/zip")
        assert resp.headers.get("X-LENR-Proved") == "false"
        with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
            prov = json.loads(zf.read(f"{DEFAULT_PACK_ID}/PROVENANCE.json"))
            assert prov["pack_schema_id"] == PACK_SCHEMA_ID


def test_unknown_benchmark_pack_404() -> None:
    with _client() as client:
        resp = client.get("/api/benchmark-packs/not-a-real-pack/download")
        assert resp.status_code == 404


def test_campaign_pack_zip_download_smoke() -> None:
    with _client() as client:
        resp = client.get("/api/docs/campaign-packs/smoke/download")
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("application/zip")
        with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
            names = zf.namelist()
            assert any(n.endswith("manifest.json") for n in names)
            assert "smoke/DOWNLOAD_PROVENANCE.json" in names
            honesty = json.loads(zf.read("smoke/DOWNLOAD_PROVENANCE.json"))
            assert honesty["lenr_proved"] is False


def test_campaign_pack_zip_unknown_404() -> None:
    with _client() as client:
        resp = client.get("/api/docs/campaign-packs/definitely-missing/download")
        assert resp.status_code == 404


def test_unified_export_envelope_still_locked() -> None:
    """Regression: SPA now depends on this contract for JSON export."""
    payload = {
        "material": {"host_material": "palladium", "reactant": "deuterium"},
        "environmental": {"temperature": 320.0, "pressure": 101325.0},
        "lattice": {"loading_ratio": 0.9},
        "time_steps": 10,
        "total_time": 1.0,
        "include_uncertainty": True,
        "uncertainty_samples": 32,
        "random_seed": 5,
    }
    with _client() as client:
        resp = client.post("/api/unified/export", json=payload)
        assert resp.status_code == 200
        env = resp.json()
        assert env["schema_version"] == "lenr-run-export-v1"
        assert env["reproducibility"]["seed"] == 5
        assert env["reproducibility"]["deterministic"] is True
        assert isinstance(env["citations"], list)
