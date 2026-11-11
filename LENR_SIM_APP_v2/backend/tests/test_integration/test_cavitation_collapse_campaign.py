"""Cavitation/collapse campaign: designed cells + pinned reviewer pack honesty."""

from __future__ import annotations

import json

from app.campaign.cavitation_collapse import (
    cavitation_collapse_count,
    iter_cavitation_collapse_cases,
)
from app.campaign.grid import campaign_size, describe_preset, iter_campaign_cases
from app.data.dataset_io import datasets_root
from app.services.reviewer_pack import PACK_SCHEMA


def test_cavitation_collapse_cells_carry_uncertainty_and_open_ids() -> None:
    cases = list(iter_cavitation_collapse_cases())
    assert len(cases) == cavitation_collapse_count() == campaign_size("cavitation_collapse")
    uq_cases = [case for case in cases if case.get("include_uncertainty")]
    assert len(uq_cases) >= 5
    for case in uq_cases:
        assert int(case.get("uncertainty_samples") or 0) >= 16
        assert case.get("random_seed") is not None
        assert case.get("open_question_ids"), case.get("tag")
    drives = {
        float((case.get("bubble") or {}).get("driving_pressure_bar") or 0.0)
        for case in cases
    }
    assert min(drives) < 1.0
    assert max(drives) >= 3.0
    described = describe_preset("cavitation_collapse")
    assert described["n_collapse_cells"] == len(cases)


def test_cavitation_collapse_pack_honesty_lock() -> None:
    root = datasets_root() / "reviewer_packs" / "cavitation_collapse_campaign"
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["schema"] == PACK_SCHEMA
    assert manifest["lenr_proved"] is False
    assert manifest["empirical_claim_tiers_raised"] is False
    assert manifest["preset"] == "cavitation_collapse"
    open_ids = set(manifest["open_ids"])
    assert {
        "EQ-OPEN-MEV-01",
        "EQ-OPEN-RAD-01",
        "EQ-OPEN-RATE-01",
        "EQ-OPEN-EC-01",
        "EQ-OPEN-YIELD-01",
    } <= open_ids
    assert manifest["n_experiments"] == cavitation_collapse_count()
    assert manifest["n_theory_runs"] == manifest["n_experiments"]
    assert "rayleigh_plesset" in manifest.get("dynamics_modes", [])
    assert "keller_miksis" in manifest.get("dynamics_modes", [])
    assert "taleyarkhan-sonofusion-2002" in manifest.get("literature_ids", [])
    assert "pyyhtia-cr39-cavitation-2026" in manifest.get("literature_ids", [])

    experiments = [
        json.loads(line)
        for line in (root / "experiments.jsonl").read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    assert len(experiments) == manifest["n_experiments"]
    assert all(row.get("type") == "bubble_fusion" for row in experiments)
    assert all(
        (row.get("results") or {}).get("lenr_proved") is False for row in experiments
    )
    assert any(
        row.get("literature_id") == "taleyarkhan-sonofusion-2002" for row in experiments
    )
    uq_rows = [
        row
        for row in experiments
        if ((row.get("results") or {}).get("collapse") or {})
        .get("collapse_uq", {})
        .get("n_samples")
    ]
    assert len(uq_rows) >= 5

    theory_runs = [
        json.loads(line)
        for line in (root / "theory_runs.jsonl").read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    assert len(theory_runs) == manifest["n_theory_runs"]
    assert all(run.get("is_empirical_confidence") is False for run in theory_runs)

    # Grid iterator and pack stay size-aligned.
    assert len(list(iter_campaign_cases("cavitation_collapse"))) == len(experiments)
