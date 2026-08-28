"""Unit tests for History honesty helpers (saturation + watts)."""

from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR
from app.services.enhancement_history import (
    compact_saturation_snippet,
    enhancement_is_saturated,
    prefer_heat_watts,
    wrap_attached_pipeline,
)


def test_enhancement_at_ceiling_is_saturated() -> None:
    assert enhancement_is_saturated(MAX_ENHANCEMENT_FACTOR) is True
    assert enhancement_is_saturated(12.0) is False
    assert enhancement_is_saturated(None) is False


def test_compact_snippet_prefers_bubble_saturation_report() -> None:
    snippet = compact_saturation_snippet(
        enhancement_factor=MAX_ENHANCEMENT_FACTOR,
        report={
            "any_saturated": True,
            "mechanisms": {
                "total": {
                    "is_saturated": True,
                    "log10_value_raw": 18.2,
                    "ceiling": MAX_ENHANCEMENT_FACTOR,
                }
            },
        },
    )
    assert snippet["is_saturated"] is True
    assert snippet["log10_value_raw"] == 18.2
    assert "not a physical prediction" in snippet["note"]


def test_prefer_heat_watts_copies_pipeline_when_observables_zero() -> None:
    class _Pipe:
        total_energy_watts = 0.0042

    assert prefer_heat_watts(0.0, _Pipe()) == 0.0042
    assert prefer_heat_watts(1.5, _Pipe()) == 1.5
    assert prefer_heat_watts(0.0, None) is None


def test_wrap_attached_pipeline_does_not_use_bubble_peak() -> None:
    wrapped = wrap_attached_pipeline(
        None,
        {"electron_screening": {"score": 0.4, "enhancement": 3.0, "final_score": 0.2}},
    )
    assert wrapped["combined_enhancement"] == 1.0
    assert wrapped["per_theory"][0]["theory_id"] == "electron_screening"
    assert wrap_attached_pipeline(None, {}) is None
    from_result = wrap_attached_pipeline(
        {
            "combined_enhancement": 12.0,
            "total_energy_watts": 0.003,
            "per_theory": [{"theory_id": "electron_screening", "enhancement_factor": 4.0}],
        },
        None,
    )
    assert from_result["combined_enhancement"] == 1.0
    assert from_result["total_energy_watts"] == 0.003
