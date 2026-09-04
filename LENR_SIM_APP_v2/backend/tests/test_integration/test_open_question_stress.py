"""Open-question stress report stays OPEN and does not claim LENR proof."""

from __future__ import annotations

import json
from types import SimpleNamespace

from app.data.dataset_io import datasets_root
from app.services.open_question_stress import (
    OPEN_IDS,
    STRESS_SCHEMA,
    build_stress_report,
    tally_open_question_counts,
)


def test_committed_smoke_stress_fixture_stays_open() -> None:
    root = datasets_root() / "reviewer_packs" / "smoke"
    report = json.loads((root / "open_question_stress.json").read_text(encoding="utf-8"))
    assert report["schema"] == STRESS_SCHEMA
    assert report["lenr_proved"] is False
    assert report["empirical_claim_tiers_raised"] is False
    assert report["open_ids"] == list(OPEN_IDS)
    assert all(row["status"] == "OPEN" for row in report["questions"])


def test_stress_report_from_tagged_rows_does_not_close_questions() -> None:
    experiment = SimpleNamespace(
        parameters_json={
            "campaign_preset": "question_theories",
            "tag": "question_theories:EQ-OPEN-YIELD-01:miles-1993:miles_heat_helium",
            "literature_id": "miles-1993",
            "claim_tag": "EMP",
            "open_question_ids": ["EQ-OPEN-YIELD-01", "EQ-OPEN-RAD-01"],
            "enabled_theories": ["miles_heat_helium"],
        },
        results_json={
            "is_model_output": True,
            "open_question_status": {"lenr_proved": False},
            "pipeline_scores": {
                "miles_heat_helium": {
                    "final_score": 0.4,
                    "claim_tier": "empirical_correlation",
                }
            },
        },
        temperature_k=300.0,
        loading_ratio=0.9,
    )
    report = build_stress_report([experiment], include_live_scores=False)
    assert report["schema"] == STRESS_SCHEMA
    assert report["lenr_proved"] is False
    assert report["empirical_claim_tiers_raised"] is False
    assert report["any_row_claimed_proved"] is False
    by_id = {row["id"]: row for row in report["questions"]}
    assert by_id["EQ-OPEN-YIELD-01"]["n"] == 1
    assert by_id["EQ-OPEN-RAD-01"]["n"] == 1
    assert by_id["EQ-OPEN-MEV-01"]["n"] == 0
    assert by_id["EQ-OPEN-YIELD-01"]["status"] == "OPEN"
    assert "miles_heat_helium" in by_id["EQ-OPEN-YIELD-01"]["theories"]
    counts = tally_open_question_counts([experiment])
    assert counts["EQ-OPEN-YIELD-01"] == 1
    assert counts["EQ-OPEN-RAD-01"] == 1
