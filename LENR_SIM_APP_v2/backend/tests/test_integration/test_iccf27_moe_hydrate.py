"""ICCF-27 / Celani pack hydrate: corpus MoE only; refuse fabricated σ."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.data.dataset_io import datasets_root
from app.scripts.build_iccf27_hydration_pack import (
    CITE_GATED_KASAGI_IDS,
    WANTED_ICCF_IDS,
    apply_corpus_moe_overlay,
)
from app.services.literature_moe_persistence import literature_moe_columns_from_record
from app.services.reviewer_pack import PACK_SCHEMA, import_pack_rows, read_pack

OPEN_IDS = {
    "EQ-OPEN-MEV-01",
    "EQ-OPEN-RAD-01",
    "EQ-OPEN-RATE-01",
    "EQ-OPEN-EC-01",
    "EQ-OPEN-YIELD-01",
}


def _load_iccf27_experiments() -> list[dict]:
    root = datasets_root() / "reviewer_packs" / "iccf27_hydration"
    return [
        json.loads(line)
        for line in (root / "experiments.jsonl").read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


def test_iccf27_hydration_covers_wanted_literature_ids() -> None:
    experiments = _load_iccf27_experiments()
    lit_ids = {row.get("literature_id") for row in experiments if row.get("literature_id")}
    assert WANTED_ICCF_IDS <= lit_ids
    assert CITE_GATED_KASAGI_IDS <= lit_ids


def test_iccf27_kasagi_dual_moe_envelope_from_corpus() -> None:
    experiments = _load_iccf27_experiments()
    by_id = {
        row["literature_id"]: row
        for row in experiments
        if row.get("literature_id") in CITE_GATED_KASAGI_IDS
    }
    assert set(by_id) == CITE_GATED_KASAGI_IDS

    expected_q = {
        "kasagi-nicu-radiant-2026": 1.1,
        "kasagi-ni-radiant-2026": 0.9,
    }
    expected_s = {
        "kasagi-nicu-radiant-2026": 13.75,
        "kasagi-ni-radiant-2026": 11.25,
    }
    for lit_id, row in by_id.items():
        assert row["excess_heat_watts"] == expected_q[lit_id]
        assert row["sigma_Q_W"] == 0.08
        assert row["moe_provenance"] == "literature_reported"
        assert row["moe_sigma_q_pairing_verified"] is True
        assert row["s_heat"] == expected_s[lit_id]
        assert row["discovery_grade_eligible"] is True
        assert row["results"]["lenr_proved"] is False
        assert row["results"]["discovery_grade_eligible"] is True
        assert set(row["results"]["open_ids"]) == OPEN_IDS
        # Overlay must match literature_moe_columns_from_record (no invent).
        columns = literature_moe_columns_from_record(
            {
                "literature_id": lit_id,
                "excess_heat_watts": expected_q[lit_id],
                "sigma_Q_W": 0.08,
                "moe_provenance": "literature_reported",
                "moe_citation_keys": row.get("moe_citation_keys"),
                "results": {"q_ex_w": expected_q[lit_id], "sigma_Q_W": 0.08},
            }
        )
        assert columns["sigma_q_w"] == row["sigma_Q_W"]
        assert columns["s_heat"] == row["s_heat"]


def test_iccf27_null_sigma_companions_stay_honest() -> None:
    experiments = _load_iccf27_experiments()
    null_ids = {
        "czerski-thermal-spike-zr-2024",
        "czerski-thermal-spike-tipd-2026",
        "hylenr-tamu-phase1-2026",
        "valat-heat-bursts-pd-2026",
    }
    by_id = {
        row["literature_id"]: row
        for row in experiments
        if row.get("literature_id") in null_ids
    }
    assert null_ids <= set(by_id)
    for lit_id, row in by_id.items():
        assert row.get("sigma_Q_W") in (None, )
        assert "sigma_Q_W" not in row or row["sigma_Q_W"] is None
        assert row.get("moe_provenance") in (None, )
        assert row.get("discovery_grade_eligible") in (None, False)
        assert row["results"]["lenr_proved"] is False


def test_overlay_refuses_to_invent_sigma_for_non_kasagi() -> None:
    thin = {
        "id": "x",
        "literature_id": "valat-heat-bursts-pd-2026",
        "excess_heat_watts": 0.0,
        "results": {"is_model_output": True, "lenr_proved": False, "open_ids": list(OPEN_IDS)},
    }
    out = apply_corpus_moe_overlay(thin)
    assert out.get("sigma_Q_W") is None
    assert out.get("moe_provenance") is None
    assert "discovery_grade_eligible" not in out or out.get("discovery_grade_eligible") in (
        None,
        False,
    )


def test_import_iccf27_pack_persists_kasagi_moe_columns() -> None:
    from app.core.database import db_manager
    from app.models.database_models import Experiment
    from sqlalchemy import select

    pack = datasets_root() / "reviewer_packs" / "iccf27_hydration"
    manifest, _experiments, _runs = read_pack(pack)
    assert manifest["schema"] == PACK_SCHEMA
    assert manifest["lenr_proved"] is False
    assert set(manifest["open_ids"]) == OPEN_IDS

    def _client() -> TestClient:
        from app.main import app

        return TestClient(app)

    with _client():
        async def _import_and_read() -> list[Experiment]:
            async with db_manager.session() as session:
                summary = await import_pack_rows(session, pack)
                assert summary["lenr_proved"] is False
                rows = (
                    await session.execute(
                        select(Experiment).where(
                            Experiment.literature_id.in_(
                                sorted(CITE_GATED_KASAGI_IDS)
                            )
                        )
                    )
                ).scalars().all()
                # Pack rows use iccf27-hyd-* ids (distinct from seed uuid5).
                return [row for row in rows if str(row.id).startswith("iccf27-hyd-")]

        rows = asyncio.run(_import_and_read())
        by_lit = {row.literature_id: row for row in rows}
        assert set(by_lit) >= CITE_GATED_KASAGI_IDS
        for lit_id in CITE_GATED_KASAGI_IDS:
            row = by_lit[lit_id]
            assert float(row.sigma_q_w) == 0.08
            assert row.moe_provenance == "literature_reported"
            assert row.moe_sigma_q_pairing_verified is True
            assert row.s_heat in (13.75, 11.25)
            # Pack import demotes discovery flag; MoE columns still land.
            assert row.discovery_grade_eligible is False
            assert (row.results_json or {}).get("lenr_proved") is False


def test_celani_exploratory_pack_gates_blocked() -> None:
    root = datasets_root() / "reviewer_packs" / "celani_exploratory_moe"
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["schema"] == PACK_SCHEMA
    assert manifest["lenr_proved"] is False
    assert manifest["preset"] == "celani_exploratory_moe"
    assert set(manifest["open_ids"]) == OPEN_IDS
    experiments = [
        json.loads(line)
        for line in (root / "experiments.jsonl").read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    assert len(experiments) == 1
    row = experiments[0]
    assert row["literature_id"] == "celani-constantan-2019"
    assert row["sigma_Q_W"] == 2.0
    assert row["moe_provenance"] == "literature_reported_instrument_precision"
    assert row["moe_sigma_q_pairing_verified"] is False
    assert row["discovery_grade_eligible"] is False
    assert row["s_heat"] == 6.0
    assert row["results"]["lenr_proved"] is False
    assert row["results"]["discovery_grade_eligible"] is False


def test_seed_cite_gated_kasagi_moe_preserves_discovery_analytics(
    tmp_path: Path,
) -> None:
    """Seed path (not pack import) keeps analytics discovery_grade_eligible."""
    from app.core.database import db_manager
    from app.models.database_models import Experiment
    from app.scripts.seed_database import seed_cite_gated_kasagi_moe
    from sqlalchemy import select

    def _client() -> TestClient:
        from app.main import app

        return TestClient(app)

    with _client():
        from app.data.dataset_io import stable_baseline_id

        async def _seed() -> list[Experiment]:
            async with db_manager.session() as session:
                n = await seed_cite_gated_kasagi_moe(session, force=True)
                assert n == 2
                seed_ids = [stable_baseline_id(lid) for lid in CITE_GATED_KASAGI_IDS]
                rows = (
                    await session.execute(
                        select(Experiment).where(Experiment.id.in_(seed_ids))
                    )
                ).scalars().all()
                return list(rows)

        rows = asyncio.run(_seed())
        by_lit = {row.literature_id: row for row in rows}
        nicu = by_lit["kasagi-nicu-radiant-2026"]
        ni = by_lit["kasagi-ni-radiant-2026"]
        assert float(nicu.sigma_q_w) == 0.08
        assert float(ni.sigma_q_w) == 0.08
        assert nicu.moe_provenance == "literature_reported"
        assert ni.moe_provenance == "literature_reported"
        assert float(nicu.s_heat) == 13.75
        assert float(ni.s_heat) == 11.25
        assert nicu.discovery_grade_eligible is True
        assert ni.discovery_grade_eligible is True
        assert nicu.is_baseline is False
        assert ni.is_baseline is False
        assert (nicu.results_json or {}).get("lenr_proved") is False
