"""Analytics stats: completion is not scientific-positive."""

import uuid

from fastapi.testclient import TestClient


def _client() -> TestClient:
    from app.main import app
    return TestClient(app)


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
