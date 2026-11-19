"""Contract: live literature corpus MoE coverage endpoint keeps honesty locks."""

from fastapi.testclient import TestClient


def _client() -> TestClient:
    from app.main import app

    return TestClient(app)


def test_literature_corpus_moe_coverage_endpoint_honesty_locks() -> None:
    with _client() as client:
        response = client.get("/api/analytics/literature-corpus-moe-coverage")
    assert response.status_code == 200
    body = response.json()
    assert body["schema"] == "lenr-moe-coverage-v1"
    assert body["n_records"] == 26
    assert body["with_sigma_q"] == 5
    assert body["with_literature_reported_cite_gated"] == 2
    assert body["with_moe_pairing_verified"] == 2
    assert body["discovery_grade_eligible_count"] == 2
    assert set(body["discovery_grade_eligible_ids"]) == {
        "kasagi-nicu-radiant-2026",
        "kasagi-ni-radiant-2026",
    }
    assert set(body["pairing_verified_ids"]) == {
        "kasagi-nicu-radiant-2026",
        "kasagi-ni-radiant-2026",
    }
    assert body["closes_eq_open"] is False
    assert body["lenr_proved"] is False
    assert all(v == "OPEN" for v in body["eq_open_status"].values())
    assert body["discovery_grade_eligible_count"] < body["n_records"]
    assert "exploratory_moe" in body["source"]
    assert body["live_endpoint"] == "GET /api/analytics/literature-corpus-moe-coverage"
