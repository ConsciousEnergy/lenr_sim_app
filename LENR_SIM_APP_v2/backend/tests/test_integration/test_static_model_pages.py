"""Smoke: static /models pages exist for every registered theory."""

from __future__ import annotations

from pathlib import Path

import pytest

PUBLIC = Path(__file__).resolve().parents[3] / "frontend" / "public"
MODELS = PUBLIC / "models"


@pytest.fixture(scope="module")
def theory_ids():
    from app.physics_engine.theory_pipeline import get_default_pipeline
    import app.physics_engine.theory_pipeline as tp

    tp._default_pipeline = None
    rows = get_default_pipeline().list_theories()
    return [r["theory_id"] for r in rows]


def test_static_shell_pages_exist_with_body() -> None:
    for rel in (
        "models/index.html",
        "methodology.html",
        "validation.html",
        "sources.html",
        "experiments/index.html",
    ):
        path = PUBLIC / rel
        assert path.is_file(), f"missing {rel} — run scripts/generate_static_model_pages.py"
        text = path.read_text(encoding="utf-8")
        assert "<body>" in text
        assert len(text) > 400
        assert "LENR-Sim" in text


def test_every_registered_theory_has_static_page(theory_ids) -> None:
    assert "schwinger_lattice" in theory_ids
    assert "nae_model" in theory_ids
    missing = []
    for tid in theory_ids:
        path = MODELS / f"{tid}.html"
        if not path.is_file():
            missing.append(tid)
            continue
        text = path.read_text(encoding="utf-8")
        assert tid in text
        assert "<body>" in text
        assert len(text.strip()) > 300
    assert not missing, f"missing static pages for: {missing}"


def test_model0_baselines_featured_on_index() -> None:
    text = (MODELS / "index.html").read_text(encoding="utf-8")
    for tid in ("quantum_tunneling", "electron_screening", "null_recombination"):
        assert tid in text
    assert "Model 0" in text
