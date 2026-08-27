"""Additive experiment list contract: association fields, sort, source_class."""

from __future__ import annotations

import asyncio
import uuid

from fastapi.testclient import TestClient

from app.services.experiment_association import (
    association_from_scores,
    classify_source_class,
    enrich_experiment_dict,
)
from app.services.simulation_persistence import SOURCE_CAMPAIGN


def _client() -> TestClient:
    from app.main import app

    return TestClient(app)


def _insert_experiment(
    *,
    name: str,
    source: str,
    parameters: dict,
    results: dict,
    session_id: str | None = None,
    is_baseline: bool = False,
) -> str:
    from app.core.database import db_manager
    from app.models.database_models import Experiment

    async def _go() -> str:
        async with db_manager.session() as session:
            experiment = Experiment(
                id=str(uuid.uuid4()),
                name=name,
                experiment_type="lenr",
                status="completed",
                is_baseline=is_baseline,
                source=source,
                session_id=session_id,
                material="palladium",
                temperature_k=300.0,
                pressure_bar=1.0,
                enhancement_factor=1.0,
                excess_heat_watts=0.0,
                parameters_json=parameters,
                results_json=results,
            )
            session.add(experiment)
            await session.commit()
            return experiment.id

    return asyncio.run(_go())


def test_association_from_scores_prefers_final_score() -> None:
    mean, top = association_from_scores(
        {
            "electron_screening": {"score": 0.2, "final_score": 0.8},
            "widom_larsen": {"score": 0.9, "final_score": 0.1},
        }
    )
    assert mean == 0.45
    assert top == "electron_screening"
    empty_mean, empty_top = association_from_scores({})
    assert empty_mean is None
    assert empty_top is None


def test_enrich_experiment_dict_is_additive() -> None:
    row = enrich_experiment_dict(
        {
            "id": "x",
            "name": "seed",
            "is_baseline": True,
            "source": "Published Research",
            "parameters": {"literature_id": "miles-1993"},
            "results": {},
            "enhancement_factor": 12.0,
        }
    )
    assert row["sourceClass"] == "Baseline"
    assert row["literatureId"] == "miles-1993"
    assert row["meanFinalScore"] is None
    assert row["topTheoryId"] is None
    assert row["enhancement_factor"] == 12.0
    assert row["name"] == "seed"


def test_list_experiments_includes_association_fields_and_sort() -> None:
    session_id = f"assoc-list-{uuid.uuid4().hex}"
    with _client() as client:
        low_id = _insert_experiment(
            name="low association",
            source=SOURCE_CAMPAIGN,
            session_id=SOURCE_CAMPAIGN,
            parameters={"literature_id": "berlinguette-arpa-e-2019"},
            results={
                "is_model_output": True,
                "pipeline_scores": {
                    "electron_screening": {
                        "score": 0.2,
                        "final_score": 0.21,
                        "claim_tier": "speculative",
                        "is_applicable": True,
                    }
                },
            },
        )
        high_id = _insert_experiment(
            name="high association",
            source=SOURCE_CAMPAIGN,
            session_id=SOURCE_CAMPAIGN,
            parameters={"literature_id": "miles-1993"},
            results={
                "is_model_output": True,
                "pipeline_scores": {
                    "miles_heat_helium": {
                        "score": 0.4,
                        "final_score": 0.77,
                        "claim_tier": "validated_lenr_mechanism",
                        "is_applicable": True,
                    }
                },
            },
        )
        seedish = client.post(
            "/api/analytics/experiments",
            json={
                "name": "no pipeline scores",
                "experiment_type": "lenr",
                "session_id": session_id,
                "status": "completed",
                "material": "palladium",
                "temperature_k": 300.0,
                "results": {"is_model_output": True},
            },
        )
        assert seedish.status_code == 201
        created = seedish.json()
        assert "sourceClass" in created
        assert "meanFinalScore" in created
        assert "topTheoryId" in created
        assert created["meanFinalScore"] is None

        listed = client.get(
            "/api/analytics/experiments",
            params={
                "session_id": session_id,
                "include_baseline": False,
                "sort_by": "mean_final_score",
                "sort_order": "desc",
                "limit": 50,
            },
        )
        assert listed.status_code == 200
        rows = listed.json()["experiments"]
        by_id = {row["id"]: row for row in rows}
        assert high_id in by_id
        assert by_id[high_id]["meanFinalScore"] == 0.77
        assert by_id[high_id]["topTheoryId"] == "miles_heat_helium"
        assert by_id[high_id]["sourceClass"] == "Campaign"
        assert by_id[high_id]["literatureId"] == "miles-1993"
        assert by_id[seedish.json()["id"]]["meanFinalScore"] is None
        ranked = [row["name"] for row in rows if row.get("meanFinalScore") is not None]
        assert ranked[0] == "high association"
        assert "low association" in ranked
        assert "enhancement_factor" in rows[0]
        assert "type" in rows[0]

        campaign_only = client.get(
            "/api/analytics/experiments",
            params={
                "session_id": session_id,
                "include_baseline": False,
                "source_class": "Campaign",
                "limit": 50,
            },
        )
        campaign_ids = {row["id"] for row in campaign_only.json()["experiments"]}
        assert high_id in campaign_ids
        assert low_id in campaign_ids
        assert seedish.json()["id"] not in campaign_ids

        user_only = client.get(
            "/api/analytics/experiments",
            params={
                "session_id": session_id,
                "include_baseline": False,
                "source_class": "User",
                "limit": 50,
            },
        )
        user_ids = {row["id"] for row in user_only.json()["experiments"]}
        assert seedish.json()["id"] in user_ids
        assert high_id not in user_ids


def test_theory_run_history_ranked_ids_and_claim_tiers_not_raised() -> None:
    with _client() as client:
        scores = client.post(
            "/api/analytics/theory-scores",
            json={"conditions": {"temperature": 300.0, "loading_ratio": 0.9}},
        )
        assert scores.status_code == 200
        body = scores.json()
        assert body.get("claim_tiers_raised") is False

        history = client.get("/api/analytics/theory-run-history")
        assert history.status_code == 200
        overlay = history.json()
        assert overlay["is_empirical_confidence"] is False
        assert "ranked_theory_ids" in overlay
        assert isinstance(overlay["ranked_theory_ids"], list)
        if overlay["n_theories"] > 0:
            assert overlay["ranked_theory_ids"]
            first = overlay["ranked_theory_ids"][0]
            assert first in overlay["per_theory"]


def test_classify_source_class_reexport() -> None:
    assert classify_source_class(is_baseline=True, source=SOURCE_CAMPAIGN) == "Baseline"
    assert classify_source_class(is_baseline=False, source=SOURCE_CAMPAIGN) == "Campaign"
