"""Contract: live S_heat ladder endpoint keeps ENG-HS-08 + honesty locks."""

from fastapi.testclient import TestClient


def _client() -> TestClient:
    from app.main import app

    return TestClient(app)


def test_s_heat_ladder_endpoint_honesty_and_eng_hs_08() -> None:
    with _client() as client:
        response = client.get("/api/analytics/s-heat-ladder")
    assert response.status_code == 200
    body = response.json()
    assert body["schema"] == "lenr-s-heat-ladder-v1"
    assert body["n_records"] == 26
    assert body["n_high_success_rankable"] == 2
    assert body["discovery_grade_threshold_sigma"] == 5.0
    assert body["closes_eq_open"] is False
    assert body["lenr_proved"] is False
    assert all(v == "OPEN" for v in body["eq_open_status"].values())
    assert body["honest_high_success_order_ids"] == [
        "kasagi-nicu-radiant-2026",
        "kasagi-ni-radiant-2026",
    ]
    assert body["raw_s_heat_order_ids"][0] == "deninno-tid-1995"
    assert body["eng_hs_08"]["raw_s_heat_would_lie"] is True
    assert body["live_endpoint"] == "GET /api/analytics/s-heat-ladder"
    assert "exploratory_moe" in body["source"]

    demoted = {row["literature_id"] for row in body["demoted_seed_scale"]}
    assert "deninno-tid-1995" in demoted
    explor = {row["literature_id"] for row in body["exploratory_band"]}
    assert "miles-1993" in explor
    assert "celani-constantan-2019" in explor

    top = body["ranked_high_success"][0]
    assert top["s_heat"] == 13.75
    assert top["claim_tier"] == "empirical_lenr_correlation"
    assert top["band"] == "discovery_analytics_clear"
