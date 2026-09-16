"""ARA P1 rebuild scaffolds — provenance markers only (no equation changes)."""

from __future__ import annotations

from app.physics_engine.theories.hagelstein_phonon import HagelsteinPhononTheory
from app.physics_engine.theories.nae_model import NAEModelTheory
from app.physics_engine.theories.takahashi_tsc import TakahashiTSCTheory
from app.physics_engine.theories.widom_larsen import WidomLarsenTheory

_STANDARD = {
    "temperature": 300.0,
    "loading_ratio": 0.9,
    "pressure": 1e5,
    "electron_density": 1e28,
}


def _assert_p1_started(theory_id: str, provenance: dict) -> None:
    assert provenance.get("p1_rebuild_status") == "started_scaffold", theory_id
    targets = provenance.get("p1_rebuild_targets")
    if theory_id != "widom_larsen":
        assert isinstance(targets, list) and targets, theory_id


def test_widom_p1_scaffold_marker() -> None:
    result = WidomLarsenTheory().calculate(_STANDARD, {})
    _assert_p1_started("widom_larsen", result.provenance or {})


def test_hagelstein_p1_scaffold_marker() -> None:
    result = HagelsteinPhononTheory().calculate(_STANDARD, {})
    assert result.is_applicable
    _assert_p1_started("hagelstein_phonon", result.provenance or {})


def test_storms_nae_p1_scaffold_marker() -> None:
    result = NAEModelTheory().calculate(_STANDARD, {})
    assert result.is_applicable
    _assert_p1_started("nae_model", result.provenance or {})


def test_takahashi_p1_scaffold_marker() -> None:
    result = TakahashiTSCTheory().calculate(_STANDARD, {})
    assert result.is_applicable
    _assert_p1_started("takahashi_tsc", result.provenance or {})
