"""Analytics stats: completion is not scientific-positive."""

import uuid

from fastapi.testclient import TestClient

from app.services.analytics_service import classify_source_class
from app.services.simulation_persistence import SOURCE_AUTO_PERSIST, SOURCE_CAMPAIGN


def _client() -> TestClient:
    from app.main import app
    return TestClient(app)


def test_classify_source_class_matches_history_chips() -> None:
    assert classify_source_class(is_baseline=True, source="anything") == "Baseline"
    assert classify_source_class(is_baseline=False, source=SOURCE_CAMPAIGN) == "Campaign"
    assert classify_source_class(is_baseline=False, source=SOURCE_AUTO_PERSIST) == "Auto"
    assert classify_source_class(is_baseline=False, source="User Simulation") == "User"


def test_mixed_outcomes_split_completion_and_scientific_positive() -> None:
    session_id = f"honest-metrics-{uuid.uuid4().hex}"
    with _client() as client:
        failed = client.post(
            "/api/analytics/experiments",
            json={
                "name": "failed run",
                "experiment_type": "unified_theory",
                "session_id": session_id,
                "status": "failed",
                "material": "palladium",
                "temperature_k": 300.0,
                "results": {"error": "boom", "is_model_output": True},
            },
        )
        null_row = client.post(
            "/api/analytics/experiments",
            json={
                "name": "null / ARPA-E-like",
                "experiment_type": "lenr",
                "session_id": session_id,
                "status": "completed",
                "material": "palladium",
                "temperature_k": 300.0,
                "enhancement_factor": 5.0,
                "excess_heat_watts": 0.0,
                "results": {"is_model_output": True},
            },
        )
        positive = client.post(
            "/api/analytics/experiments",
            json={
                "name": "positive heat",
                "experiment_type": "lenr",
                "session_id": session_id,
                "status": "completed",
                "material": "palladium",
                "temperature_k": 350.0,
                "excess_heat_watts": 2.5,
                "results": {"is_model_output": True},
            },
        )
        inapplicable = client.post(
            "/api/analytics/experiments",
            json={
                "name": "off-regime theories",
                "experiment_type": "unified_theory",
                "session_id": session_id,
                "status": "completed",
                "material": "palladium",
                "temperature_k": 77.0,
                "excess_heat_watts": 0.0,
                "results": {
                    "is_model_output": True,
                    "pipeline_scores": {
                        "electron_screening": {
                            "is_applicable": False,
                            "claim_tier": "speculative",
                        }
                    },
                },
            },
        )
        assert failed.status_code == 201
        assert null_row.status_code == 201
        assert positive.status_code == 201
        assert inapplicable.status_code == 201

        stats = client.get(
            "/api/analytics/stats",
            params={"session_id": session_id, "include_baseline": False},
        )
        assert stats.status_code == 200
        body = stats.json()
        assert "successRate" in body
        assert "completionRate" in body
        assert "scientificPositiveRate" in body
        assert "outcomeCounts" in body
        assert "claimTierCounts" in body
        assert body["successRate"] == body["completionRate"]
        assert body["totalSimulations"] == 4
        assert body["completionRate"] == 75.0
        assert body["scientificPositiveRate"] == 25.0
        assert body["outcomeCounts"]["failed"] == 1
        assert body["outcomeCounts"]["null"] == 1
        assert body["outcomeCounts"]["positive"] == 1
        assert body["outcomeCounts"]["inapplicable"] == 1
        assert body["claimTierCounts"].get("speculative") == 1


def test_stats_fields_are_additive_with_baseline() -> None:
    """New stats keys are additive; TEST DBs may have zero baseline rows."""
    session_id = f"additive-session-{uuid.uuid4().hex}"
    with _client() as client:
        empty = client.get(
            "/api/analytics/stats",
            params={"session_id": session_id, "include_baseline": True},
        )
        assert empty.status_code == 200
        empty_body = empty.json()
        for key in (
            "totalSimulations",
            "successRate",
            "completionRate",
            "scientificPositiveRate",
            "avgEnhancement",
            "totalEnergy",
            "maxEnhancement",
            "completedCount",
            "failedCount",
            "outcomeCounts",
            "claimTierCounts",
        ):
            assert key in empty_body
        assert empty_body["successRate"] == empty_body["completionRate"]
        assert set(empty_body["outcomeCounts"]) >= {"positive", "null", "inapplicable", "failed"}

        created = client.post(
            "/api/analytics/experiments",
            json={
                "name": "additive-contract row",
                "experiment_type": "lenr",
                "session_id": session_id,
                "status": "completed",
                "material": "palladium",
                "temperature_k": 300.0,
                "excess_heat_watts": 0.0,
                "results": {"is_model_output": True},
            },
        )
        assert created.status_code == 201
        stats = client.get(
            "/api/analytics/stats",
            params={"session_id": session_id, "include_baseline": True},
        )
        assert stats.status_code == 200
        body = stats.json()
        assert body["totalSimulations"] >= 1
        assert body["successRate"] == body["completionRate"]
        assert "scientificPositiveRate" in body
        assert "claimTierCounts" in body


def _insert_baseline_row(*, name: str, energy_kev: float, enhancement: float) -> str:
    import asyncio

    from app.core.database import db_manager
    from app.models.database_models import Experiment

    async def _go() -> str:
        async with db_manager.session() as session:
            experiment = Experiment(
                id=str(uuid.uuid4()),
                name=name,
                experiment_type="bubble_fusion",
                status="completed",
                is_baseline=True,
                source="Published Research",
                material="palladium",
                temperature_k=300.0,
                pressure_bar=1.0,
                enhancement_factor=enhancement,
                energy_output_kev=energy_kev,
                excess_heat_watts=0.0,
                results_json={"is_model_output": False},
            )
            session.add(experiment)
            await session.commit()
            return experiment.id

    return asyncio.run(_go())


def test_timeline_and_source_distribution_match_sql_fields() -> None:
    session_id = f"sql-charts-{uuid.uuid4().hex}"
    with _client() as client:
        created = client.post(
            "/api/analytics/experiments",
            json={
                "name": "user Pd-D cell",
                "experiment_type": "lenr",
                "session_id": session_id,
                "status": "completed",
                "material": "palladium",
                "temperature_k": 300.0,
                "enhancement_factor": 12.5,
                "energy_output_kev": 75.0,
                "excess_heat_watts": 0.0,
                "results": {"is_model_output": True},
            },
        )
        assert created.status_code == 201
        baseline_id = _insert_baseline_row(
            name="Taleyarkhan bubble fusion",
            energy_kev=2500.0,
            enhancement=5.0,
        )

        timeline = client.get(
            "/api/analytics/timeline",
            params={"session_id": session_id, "include_baseline": True, "limit": 100},
        )
        assert timeline.status_code == 200
        rows = timeline.json()
        assert rows
        for row in rows:
            assert "date" in row
            assert "name" in row
            assert "sourceClass" in row
            assert "enhancementFactor" in row
            assert "energyOutput" in row
        taleyarkhan = next(row for row in rows if row["name"] == "Taleyarkhan bubble fusion")
        assert taleyarkhan["energyOutput"] == 2500.0
        assert taleyarkhan["enhancementFactor"] == 5.0
        assert taleyarkhan["sourceClass"] == "Baseline"
        user_row = next(row for row in rows if row["name"] == "user Pd-D cell")
        assert user_row["energyOutput"] == 75.0
        assert user_row["sourceClass"] == "User"

        sources = client.get(
            "/api/analytics/distribution/source",
            params={"session_id": session_id, "include_baseline": True},
        )
        assert sources.status_code == 200
        source_names = {row["name"] for row in sources.json()}
        assert "Baseline" in source_names
        assert "User" in source_names

        hidden = client.get(
            "/api/analytics/timeline",
            params={"session_id": session_id, "include_baseline": False, "limit": 100},
        )
        assert hidden.status_code == 200
        hidden_names = {row["name"] for row in hidden.json()}
        assert "Taleyarkhan bubble fusion" not in hidden_names
        assert "user Pd-D cell" in hidden_names
        hidden_ids = {
            row["id"]
            for row in client.get(
                "/api/analytics/experiments",
                params={"session_id": session_id, "include_baseline": False, "limit": 100},
            ).json()["experiments"]
        }
        assert baseline_id not in hidden_ids
