"""Tests for literature-anchored collapse reporting bounds (EQ-BBL-LIM-01)."""

from app.physics_engine.collapse_calculated_bounds import (
    build_reporting_limits,
    temperature_calculated_bound_k,
)


def test_low_mach_rp_uses_emission_band_bound() -> None:
    meta = temperature_calculated_bound_k(peak_mach=0.1, dynamics_mode="rayleigh_plesset")
    assert meta["calculated_bound_k"] == 1.5e4
    assert meta["basis"] == "emission_band"
    assert "Flannigan" in meta["citation"]


def test_high_mach_uses_moss_ion_ceiling() -> None:
    meta = temperature_calculated_bound_k(peak_mach=0.5, dynamics_mode="rayleigh_plesset")
    assert meta["calculated_bound_k"] == 2.0e6
    assert meta["basis"] == "moss_ion_ceiling"


def test_km_mode_uses_moss_even_at_low_mach() -> None:
    meta = temperature_calculated_bound_k(peak_mach=0.1, dynamics_mode="keller_miksis")
    assert meta["calculated_bound_k"] == 2.0e6


def test_reporting_limits_include_calculated_bound_fields() -> None:
    limits = build_reporting_limits(
        temperature_raw_k=1.17e6,
        pressure_raw_pa=1.0e10,
        compression_ratio=1000.0,
        max_compression_ratio=1000.0,
        peak_mach=0.22,
        dynamics_mode="rayleigh_plesset",
    )
    temp = limits["temperature_k"]
    assert "calculated_bound_k" in temp
    assert temp["value"] == min(temp["value_raw"], temp["calculated_bound_k"])
    assert temp["is_saturated"] == (temp["value_raw"] > temp["calculated_bound_k"])
    assert temp["citation"]

    pressure = limits["pressure_pa"]
    assert "calculated_bound_pa" in pressure
    assert pressure["value"] <= pressure["calculated_bound_pa"]

    compression = limits["compression_ratio"]
    assert compression["calculated_bound"] == 1000.0


def test_km_peak_t_below_adiabatic_raw_at_high_cr() -> None:
    """KM trajectory should not overshoot Moss ceiling when raw adiabatic does."""
    limits = build_reporting_limits(
        temperature_raw_k=3.0e8,
        pressure_raw_pa=5.0e10,
        compression_ratio=1000.0,
        max_compression_ratio=1000.0,
        peak_mach=0.5,
        dynamics_mode="keller_miksis",
    )
    assert limits["temperature_k"]["calculated_bound_k"] == 2.0e6
    assert limits["temperature_k"]["value"] == 2.0e6
    assert limits["temperature_k"]["is_saturated"] is True
