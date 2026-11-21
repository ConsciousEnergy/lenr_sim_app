"""Unit tests for HIP-06 / VIZ-02 spacetime sample buffer export."""

from app.physics_engine.spacetime_sample_buffer import (
    SPACETIME_SAMPLE_SCHEMA,
    build_spacetime_sample_buffer,
    build_viz_channels_from_sample,
)


def test_build_spacetime_sample_buffer_compact_rows():
    timeline = [
        {
            "normalized_time": 0.0,
            "phase": "EXPANSION",
            "radius_um": 10.0,
            "temperature_k": 300.0,
            "electric_field_v_m": 1.0e6,
            "enhancement": 2.0,
            "proton_distribution": {"NUCLEAR": 0.01},
        },
        {
            "normalized_time": 0.7,
            "phase": "MINIMUM",
            "radius_um": 1.0,
            "temperature_k": 2.0e4,
            "electric_field_v_m": 1.0e8,
            "enhancement": 1.0e4,
            "proton_distribution": {"NUCLEAR": 0.35},
        },
    ]
    buffer = build_spacetime_sample_buffer(timeline)
    assert buffer["schema"] == SPACETIME_SAMPLE_SCHEMA
    assert buffer["sample_count"] == 2
    assert buffer["rows"][1][1] == 1.0
    assert buffer["rows"][1][4] == 1.0e4
    assert buffer["rows"][1][5] == 0.35


def test_viz_channels_keep_melt_and_heat_null():
    sample = {
        "normalized_time": 0.7,
        "phase": "MINIMUM",
        "radius_um": 1.0,
        "temperature_k": 2.0e4,
        "electric_field_v_m": 1.0e8,
        "enhancement": 1.0e4,
        "occupancy_nuclear": 0.35,
    }
    channels = build_viz_channels_from_sample(sample)
    assert channels["bubble.radius_um"] == 1.0
    assert channels["host.phase_fraction_liquid"] is None
    assert channels["heat.P_joule"] is None
    assert channels["heat.P_resistive"] is None
    assert channels["heat.P_photonic"] is None


def test_empty_timeline_returns_shaped_empty_buffer():
    buffer = build_spacetime_sample_buffer([])
    assert buffer["schema"] == SPACETIME_SAMPLE_SCHEMA
    assert buffer["sample_count"] == 0
    assert buffer["samples"] == []
