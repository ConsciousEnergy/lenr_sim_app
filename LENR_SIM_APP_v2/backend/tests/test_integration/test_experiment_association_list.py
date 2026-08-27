"""Additive experiment list contract: association fields, sort, source_class."""

from __future__ import annotations

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


def _all_experiments(client: TestClient, **params) -> list:
    offset = 0
    rows: list = []
    while True:
        listed = client.get(
            "/api/analytics/experiments",
            params={**params, "limit": 200, "offset": offset},
        )
        assert listed.status_code == 200
        payload = listed.json()
        batch = payload.get("experiments") or []
        rows.extend(batch)
        total = int(payload.get("total") or 0)
        offset += 200
        if not batch or offset >= total:
            return rows


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
        low = client.post(
            "/api/analytics/experiments",
            json={
                "name": "low association",
                "experiment_type": "lenr",
                "session_id": session_id,
                "status": "completed",
                "material": "palladium",
                "temperature_k": 300.0,
                "source": SOURCE_CAMPAIGN,
                "parameters": {"literature_id": "berlinguette-arpa-e-2019"},
                "results": {
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
            },
        )
        high = client.post(
            "/api/analytics/experiments",
            json={
                "name": "high association",
                "experiment_type": "lenr",
                "session_id": session_id,
                "status": "completed",
                "material": "palladium",
                "temperature_k": 350.0,
                "source": SOURCE_CAMPAIGN,
                "parameters": {"literature_id": "miles-1993"},
                "results": {
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
        assert low.status_code == 201
        assert high.status_code == 201
        assert seedish.status_code == 201
        created = high.json()
        assert "sourceClass" in created
        assert "meanFinalScore" in created
        assert "topTheoryId" in created
        assert created["literatureId"] == "miles-1993"
        assert created["sourceClass"] == "Campaign"
        low_id, high_id, seed_id = low.json()["id"], high.json()["id"], seedish.json()["id"]

        rows = _all_experiments(
            client,
            session_id=session_id,
            include_baseline=False,
            sort_by="mean_final_score",
            sort_order="desc",
        )
        by_id = {row["id"]: row for row in rows}
        assert by_id[high_id]["meanFinalScore"] == 0.77
        assert by_id[high_id]["topTheoryId"] == "miles_heat_helium"
        assert by_id[high_id]["sourceClass"] == "Campaign"
        assert by_id[high_id]["literatureId"] == "miles-1993"
        assert by_id[seed_id]["meanFinalScore"] is None
        ours = [row for row in rows if row["id"] in {low_id, high_id, seed_id}]
        ranked = [row["name"] for row in ours if row.get("meanFinalScore") is not None]
        assert ranked[0] == "high association"
        assert ranked[1] == "low association"
        assert "enhancement_factor" in rows[0]
        assert "type" in rows[0]

        campaign_rows = _all_experiments(
            client,
            session_id=session_id,
            include_baseline=False,
            source_class="Campaign",
        )
        campaign_ids = {row["id"] for row in campaign_rows}
        assert high_id in campaign_ids
        assert low_id in campaign_ids
        assert seed_id not in campaign_ids

        user_rows = _all_experiments(
            client,
            session_id=session_id,
            include_baseline=False,
            source_class="User",
        )
        user_ids = {row["id"] for row in user_rows}
        assert seed_id in user_ids
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
