"""Opt-in literature likelihood does not replace five-factor scoring or raise tiers."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.physics_engine.literature_likelihood import (
    SCORE_MODE_FIVE_FACTOR,
    SCORE_MODE_PLUS_LITERATURE,
)
from app.physics_engine.theory_scoring import compute_theory_scores
from app.services.simulation_persistence import SOURCE_AUTO_PERSIST

_CONDITIONS = {
    "temperature": 300.0,
    "loading_ratio": 0.9,
    "pressure": 101325.0,
    "electron_density": 6.8e28,
}
_THEORIES = ["miles_heat_helium", "electron_screening"]


def _client() -> TestClient:
    from app.main import app

    return TestClient(app)


def test_default_score_mode_matches_five_factor() -> None:
    default = compute_theory_scores(
        _CONDITIONS, enabled_theories=_THEORIES, skip_sensitivity=True
    )
    explicit = compute_theory_scores(
        _CONDITIONS,
        enabled_theories=_THEORIES,
        skip_sensitivity=True,
        score_mode=SCORE_MODE_FIVE_FACTOR,
    )
    assert default.keys() == explicit.keys()
    for theory_id in default:
        assert default[theory_id]["final_score"] == explicit[theory_id]["final_score"]
        assert default[theory_id]["claim_tier"] == explicit[theory_id]["claim_tier"]
        assert default[theory_id]["score_mode"] == SCORE_MODE_FIVE_FACTOR


def test_literature_mode_does_not_raise_claim_tier() -> None:
    baseline = compute_theory_scores(
        _CONDITIONS, enabled_theories=_THEORIES, skip_sensitivity=True
    )
    literature = compute_theory_scores(
        _CONDITIONS,
        enabled_theories=_THEORIES,
        skip_sensitivity=True,
        score_mode=SCORE_MODE_PLUS_LITERATURE,
    )
    for theory_id in baseline:
        assert literature[theory_id]["claim_tier"] == baseline[theory_id]["claim_tier"]
        assert literature[theory_id]["score_mode"] == SCORE_MODE_PLUS_LITERATURE
        # Literature blend may move experimental_agreement / final_score but
        # cannot invent proof or erase dual score honesty.
        assert "final_score" in literature[theory_id]
        assert literature[theory_id].get("lenr_proved") is not True


def test_theory_scores_endpoint_default_is_additive() -> None:
    with _client() as client:
        resp = client.post("/api/analytics/theory-scores", json={"enabled_theories": _THEORIES})
        assert resp.status_code == 200
        body = resp.json()
        assert body["score_mode"] == SCORE_MODE_FIVE_FACTOR
        assert body["claim_tiers_raised"] is False
        assert "scores" in body
        plus = client.post(
            "/api/analytics/theory-scores",
            json={
                "enabled_theories": _THEORIES,
                "score_mode": SCORE_MODE_PLUS_LITERATURE,
            },
        )
        assert plus.status_code == 200
        plus_body = plus.json()
        assert plus_body["score_mode"] == SCORE_MODE_PLUS_LITERATURE
        assert plus_body["claim_tiers_raised"] is False
        for theory_id in body["scores"]:
            assert (
                plus_body["scores"][theory_id]["claim_tier"]
                == body["scores"][theory_id]["claim_tier"]
            )


def test_testbed_persist_records_auto_source_class() -> None:
    with _client() as client:
        resp = client.post(
            "/api/physics/theories/run",
            json={
                "conditions": _CONDITIONS,
                "enabled_theories": _THEORIES,
                "persist_session_id": "literature-likelihood-auto",
                "persist_source": SOURCE_AUTO_PERSIST,
            },
        )
        assert resp.status_code == 200
        assert resp.json().get("open_questions", {}).get("lenr_proved") is False
        history = client.get("/api/analytics/theory-run-history").json()
        assert history["schema"] == "lenr-theory-run-history-v1"
        assert history["n_runs"] >= 1
        assert history["by_source_class"].get("Auto", 0) >= 1
        assert history["is_empirical_confidence"] is False
