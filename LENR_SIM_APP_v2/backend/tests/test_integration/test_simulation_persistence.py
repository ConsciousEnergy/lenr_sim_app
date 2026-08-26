"""Contract tests: auto-persist simulation runs into SQL analytics tables."""

from fastapi.testclient import TestClient

from app.services.simulation_persistence import DISCLAIMER, SOURCE_AUTO_PERSIST


def _client() -> TestClient:
    from app.main import app
    return TestClient(app)


def _base_payload() -> dict:
    return {
        "material": {"host_material": "palladium", "reactant": "deuterium"},
        "environmental": {"temperature": 320.0, "pressure": 101325.0},
        "lattice": {"loading_ratio": 0.9},
        "time_steps": 10,
        "total_time": 1.0,
        "persist_session_id": "test-persist-session",
        "persist_source": SOURCE_AUTO_PERSIST,
    }


def test_simulate_auto_persists_and_keeps_locked_contract() -> None:
    with _client() as client:
        resp = client.post("/api/unified/simulate", json=_base_payload())
        assert resp.status_code == 200
        data = resp.json()
        assert data["contract_version"].endswith("-science-gate-1")
        assert data["open_questions"]["lenr_proved"] is False
        persistence = (data.get("analytics_transparency") or {}).get("persistence") or {}
        assert persistence.get("experiment_id")
        assert persistence.get("is_model_output") is True
        assert persistence.get("source") == SOURCE_AUTO_PERSIST

        listed = client.get(
            "/api/analytics/experiments",
            params={"session_id": "other-session", "include_baseline": True, "limit": 50},
        )
        assert listed.status_code == 200
        experiments = listed.json()["experiments"]
        match = next(e for e in experiments if e["id"] == persistence["experiment_id"])
        assert match["source"] == SOURCE_AUTO_PERSIST
        assert match["results"]["is_model_output"] is True
        assert match["results"]["open_question_status"]["lenr_proved"] is False
        assert DISCLAIMER in (match.get("description") or "")

        stats = client.get(
            "/api/analytics/stats",
            params={"session_id": "other-session", "include_baseline": True},
        )
        assert stats.status_code == 200
        stats_body = stats.json()
        assert stats_body["totalSimulations"] >= 1
        assert stats_body["successRate"] == stats_body["completionRate"]
        assert "scientificPositiveRate" in stats_body
        assert match["results"]["scientific_outcome"] in {
            "positive",
            "null",
            "inapplicable",
            "failed",
        }


def test_theories_run_persists_theory_run_history() -> None:
    with _client() as client:
        resp = client.post(
            "/api/physics/theories/run",
            json={
                "conditions": {"temperature": 300.0, "loading_ratio": 0.9},
                "persist_session_id": "test-persist-session",
                "persist_source": SOURCE_AUTO_PERSIST,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["contract_version"].endswith("-science-gate-1")
        persistence = (data.get("analytics_transparency") or {}).get("persistence") or {}
        assert persistence.get("experiment_id")
        assert persistence.get("theory_run_id")

        history = client.get("/api/analytics/theory-run-history")
        assert history.status_code == 200
        body = history.json()
        assert body["schema"] == "lenr-theory-run-history-v1"
        assert body["is_empirical_confidence"] is False
        assert body["curated_edge_strength_unchanged"] is True
        assert body["n_runs"] >= 1
        assert body["per_theory"]
        assert body["score_field"] == "final_score_preferred"
        listed = client.get(
            "/api/analytics/experiments",
            params={"session_id": "other-session", "include_baseline": True, "limit": 50},
        )
        match = next(
            row
            for row in listed.json()["experiments"]
            if row["id"] == persistence["experiment_id"]
        )
        scores = (match.get("results") or {}).get("pipeline_scores") or {}
        assert scores
        sample = next(iter(scores.values()))
        assert sample.get("final_score") is not None
        assert sample.get("score") is not None
        assert sample.get("score_formula") == "five_factor_gm_x_claim_tier"
        assert sample.get("parameter_sensitivity") == 0.5
        theory_id = next(iter(scores))
        overlay = body["per_theory"][theory_id]
        assert "mean_final_score" in overlay
        assert "mean_weighted_score" in overlay
        assert "ci_lo" in overlay
        assert "ci_hi" in overlay
        assert overlay["ci_method"] == "percentile_2.5_97.5"
        assert body["score_formula"] == "five_factor_gm_x_claim_tier"
        assert "by_source_class" in body
        assert body["skip_sensitivity_note"]


def test_coupled_run_persists_experiment_and_final_score() -> None:
    with _client() as client:
        resp = client.post(
            "/api/analytics/theories/run-coupled",
            json={
                "conditions": {"temperature": 300.0, "loading_ratio": 0.9},
                "enabled_theories": ["electron_screening"],
                "persist_session_id": "test-coupled-persist",
                "persist_source": SOURCE_AUTO_PERSIST,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "contributions" in data
        assert "combined_enhancement" in data
        persistence = (data.get("analytics_transparency") or {}).get("persistence") or {}
        assert persistence.get("experiment_id")
        assert persistence.get("theory_run_id")

        listed = client.get(
            "/api/analytics/experiments",
            params={"session_id": "other-session", "include_baseline": True, "limit": 50},
        )
        match = next(
            row
            for row in listed.json()["experiments"]
            if row["id"] == persistence["experiment_id"]
        )
        scores = (match.get("results") or {}).get("pipeline_scores") or {}
        assert "electron_screening" in scores
        assert scores["electron_screening"].get("final_score") is not None
        assert scores["electron_screening"].get("score_formula") == "five_factor_gm_x_claim_tier"


def test_theory_graph_edges_unchanged_by_history() -> None:
    with _client() as client:
        graph = client.get("/api/analytics/theory-graph")
        history = client.get("/api/analytics/theory-run-history")
        assert graph.status_code == 200
        assert history.status_code == 200
        graph_body = graph.json()
        history_body = history.json()
        assert "edges" in graph_body
        assert history_body["curated_edge_strength_unchanged"] is True
        for edge in graph_body["edges"]:
            assert "strength" in edge
