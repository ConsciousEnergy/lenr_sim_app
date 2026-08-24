"""Smoke campaign: persist many model-output runs and keep EQ-OPEN OPEN."""

import asyncio

from fastapi.testclient import TestClient

from app.campaign.runner import run_campaign


def test_smoke_campaign_persists_and_invariants_pass() -> None:
    from app.main import app

    with TestClient(app) as client:
        result = asyncio.run(run_campaign("smoke", include_theory_pipeline=True))
        assert result["n_unified_runs"] == 4
        assert result["lenr_proved"] is False
        assert result["empirical_claim_tiers_raised"] is False
        assert result["invariants"]["passed"], result["invariants"]["failed_run_indexes"]
        persisted = [row for row in result["persistence"] if row.get("experiment_id")]
        assert len(persisted) == 4

        stats = client.get(
            "/api/analytics/stats",
            params={"session_id": "ui-session", "include_baseline": True},
        )
        assert stats.status_code == 200
        stats_body = stats.json()
        assert stats_body["totalSimulations"] >= 4
        assert "completionRate" in stats_body
        assert "scientificPositiveRate" in stats_body
        assert "outcomeCounts" in stats_body
        assert stats_body["successRate"] == stats_body["completionRate"]

        history = client.get("/api/analytics/theory-run-history").json()
        assert history["n_runs"] >= 1
        assert history["is_empirical_confidence"] is False
