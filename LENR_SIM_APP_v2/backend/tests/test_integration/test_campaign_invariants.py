"""Campaign prediction registry vs live model outputs."""

from fastapi.testclient import TestClient

from app.campaign.grid import campaign_size, iter_campaign_cases
from app.services.campaign_invariants import evaluate_invariants, load_invariants


def _client() -> TestClient:
    from app.main import app
    return TestClient(app)


def test_smoke_grid_size() -> None:
    cases = list(iter_campaign_cases("smoke"))
    assert len(cases) == campaign_size("smoke") == 4


def test_invariants_registry_does_not_claim_lenr() -> None:
    spec = load_invariants()
    assert spec["schema"] == "lenr-campaign-predictions-v1"
    assert spec["lenr_proved"] is False
    ids = {item["id"] for item in spec["invariants"]}
    assert "INV-LENR-NOT-PROVED" in ids
    assert "INV-Q4-OPEN" in ids
    assert "INV-Q5-OPEN" in ids


def test_live_simulate_matches_campaign_invariants() -> None:
    with _client() as client:
        resp = client.post(
            "/api/unified/simulate",
            json={
                "material": {"host_material": "palladium", "reactant": "deuterium"},
                "environmental": {"temperature": 300.0},
                "lattice": {"loading_ratio": 0.9},
                "rate_mode": "two_body",
                "time_steps": 10,
                "total_time": 1.0,
            },
        )
        assert resp.status_code == 200
        payload = resp.json()
        payload["rate_mode"] = "two_body"
        report = evaluate_invariants(payload)
        assert report["passed"], report["failed"]
        assert payload["open_questions"]["lenr_proved"] is False
        assert payload["open_questions"]["q_electron_capture"]["status"] == "OPEN"
        assert payload["open_questions"]["q_integrated_yield"]["status"] == "OPEN"
