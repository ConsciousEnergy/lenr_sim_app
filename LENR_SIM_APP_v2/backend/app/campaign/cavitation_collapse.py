"""Designed cavitation / collapse–heavy campaign cells (not a cartesian).

Varies host, loading, acoustic drive, and bubble_dynamics_mode with
``include_uncertainty=true`` on the primary collapse cells. Literature anchors
(Taleyarkhan sonofusion contested) and null controls are included.

Model output only. Does not prove LENR. EQ-OPEN-* stay OPEN.
"""

from __future__ import annotations

from typing import Any, Dict, Iterator, List


def _bubble(
    *,
    initial_radius_um: float = 10.0,
    driving_pressure_bar: float = 1.5,
    frequency_khz: float = 20.0,
    ambient_temperature_k: float = 298.0,
    bubble_dynamics_mode: str = "rayleigh_plesset",
) -> Dict[str, Any]:
    return {
        "initial_radius_um": float(initial_radius_um),
        "driving_pressure_bar": float(driving_pressure_bar),
        "frequency_khz": float(frequency_khz),
        "ambient_temperature_k": float(ambient_temperature_k),
        "bubble_dynamics_mode": str(bubble_dynamics_mode),
    }


# Designed experiment: collapse-heavy bubble-lattice cells + controls.
# Keep count modest (UQ + ODE solve is expensive); pack builder may further
# reduce uncertainty_samples for the pinned JSON fixture.
CAVITATION_COLLAPSE_CASES: List[Dict[str, Any]] = [
    {
        "route": "bubble_lattice",
        "temperature": 298.0,
        "loading_ratio": 0.90,
        "host_material": "palladium",
        "reactant": "deuterium",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "include_uncertainty": True,
        "uncertainty_samples": 32,
        "random_seed": 21,
        "num_cycles": 2,
        "bubble": _bubble(
            driving_pressure_bar=1.5,
            frequency_khz=20.0,
            bubble_dynamics_mode="rayleigh_plesset",
        ),
        "tag": "cav:pd_d_rp_ambient",
        "open_question_ids": ["EQ-OPEN-RATE-01", "EQ-OPEN-MEV-01"],
        "claim_tag": "speculative",
    },
    {
        "route": "bubble_lattice",
        "temperature": 298.0,
        "loading_ratio": 0.90,
        "host_material": "palladium",
        "reactant": "deuterium",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "include_uncertainty": True,
        "uncertainty_samples": 32,
        "random_seed": 22,
        "num_cycles": 2,
        "bubble": _bubble(
            driving_pressure_bar=1.5,
            frequency_khz=20.0,
            bubble_dynamics_mode="keller_miksis",
        ),
        "tag": "cav:pd_d_km_ambient",
        "open_question_ids": ["EQ-OPEN-RATE-01", "EQ-OPEN-MEV-01"],
        "claim_tag": "speculative",
    },
    {
        "route": "bubble_lattice",
        "temperature": 298.0,
        "loading_ratio": 0.95,
        "host_material": "palladium",
        "reactant": "deuterium",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "include_uncertainty": True,
        "uncertainty_samples": 32,
        "random_seed": 23,
        "num_cycles": 2,
        "bubble": _bubble(
            driving_pressure_bar=3.0,
            frequency_khz=20.0,
            initial_radius_um=12.0,
            bubble_dynamics_mode="rayleigh_plesset",
        ),
        "tag": "cav:pd_d_rp_high_drive",
        "open_question_ids": ["EQ-OPEN-RATE-01", "EQ-OPEN-YIELD-01"],
        "claim_tag": "speculative",
    },
    {
        "route": "bubble_lattice",
        "temperature": 298.0,
        "loading_ratio": 0.90,
        "host_material": "palladium",
        "reactant": "deuterium",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "include_uncertainty": True,
        "uncertainty_samples": 32,
        "random_seed": 24,
        "num_cycles": 2,
        "bubble": _bubble(
            driving_pressure_bar=0.5,
            frequency_khz=20.0,
            bubble_dynamics_mode="rayleigh_plesset",
        ),
        "tag": "cav:pd_d_rp_low_drive",
        "open_question_ids": ["EQ-OPEN-RATE-01"],
        "claim_tag": "null",
    },
    {
        "route": "bubble_lattice",
        "temperature": 350.0,
        "loading_ratio": 0.85,
        "host_material": "nickel",
        "reactant": "hydrogen",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "include_uncertainty": True,
        "uncertainty_samples": 32,
        "random_seed": 25,
        "num_cycles": 2,
        "bubble": _bubble(
            ambient_temperature_k=350.0,
            driving_pressure_bar=2.0,
            frequency_khz=25.0,
            bubble_dynamics_mode="keller_miksis",
        ),
        "tag": "cav:ni_h_km_warm",
        "open_question_ids": ["EQ-OPEN-RATE-01", "EQ-OPEN-EC-01"],
        "claim_tag": "speculative",
    },
    {
        "route": "bubble_lattice",
        "temperature": 298.0,
        "loading_ratio": 0.90,
        "host_material": "palladium",
        "reactant": "deuterium",
        "rate_mode": "three_body",
        "use_theory_pipeline": True,
        "include_uncertainty": True,
        "uncertainty_samples": 32,
        "random_seed": 26,
        "num_cycles": 2,
        "bubble": _bubble(
            driving_pressure_bar=1.5,
            frequency_khz=20.0,
            bubble_dynamics_mode="rayleigh_plesset",
        ),
        "stimulation": {"acoustic_drive": True},
        "tag": "cav:pd_d_three_body_acoustic",
        "open_question_ids": ["EQ-OPEN-RATE-01", "EQ-OPEN-EC-01", "EQ-OPEN-RAD-01"],
        "claim_tag": "speculative",
    },
    {
        # Contested sonofusion literature anchor. API caps drive at 10 bar;
        # literature cites higher acoustic pressure — clamp + provenance note.
        "route": "bubble_lattice",
        "temperature": 273.0,
        "loading_ratio": 0.50,
        "host_material": "titanium",
        "reactant": "deuterium",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "include_uncertainty": True,
        "uncertainty_samples": 32,
        "random_seed": 27,
        "num_cycles": 2,
        "bubble": _bubble(
            ambient_temperature_k=273.0,
            driving_pressure_bar=10.0,
            frequency_khz=20.0,
            initial_radius_um=15.0,
            bubble_dynamics_mode="keller_miksis",
        ),
        "literature_id": "taleyarkhan-sonofusion-2002",
        "citation_key": "taleyarkhan2002",
        "tag": "cav:taleyarkhan_sonofusion_anchor",
        "open_question_ids": ["EQ-OPEN-RATE-01", "EQ-OPEN-RAD-01"],
        "claim_tag": "disputed",
    },
    {
        "route": "bubble_lattice",
        "temperature": 500.0,
        "loading_ratio": 0.90,
        "host_material": "titanium",
        "reactant": "deuterium",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "include_uncertainty": True,
        "uncertainty_samples": 32,
        "random_seed": 28,
        "num_cycles": 2,
        "bubble": _bubble(
            ambient_temperature_k=500.0,
            driving_pressure_bar=2.5,
            frequency_khz=30.0,
            bubble_dynamics_mode="rayleigh_plesset",
        ),
        "tag": "cav:ti_d_rp_hot",
        "open_question_ids": ["EQ-OPEN-RATE-01", "EQ-OPEN-YIELD-01"],
        "claim_tag": "speculative",
    },
    {
        "route": "bubble_lattice",
        "temperature": 298.0,
        "loading_ratio": 0.10,
        "host_material": "palladium",
        "reactant": "deuterium",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "num_cycles": 2,
        "bubble": _bubble(
            driving_pressure_bar=1.5,
            frequency_khz=20.0,
            bubble_dynamics_mode="rayleigh_plesset",
        ),
        "tag": "cav:pd_d_unloaded_control",
        "open_question_ids": ["EQ-OPEN-RATE-01"],
        "claim_tag": "null",
    },
    {
        "route": "bubble_lattice",
        "temperature": 298.0,
        "loading_ratio": 0.90,
        "host_material": "copper",
        "reactant": "hydrogen",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "num_cycles": 2,
        "bubble": _bubble(
            driving_pressure_bar=1.5,
            frequency_khz=20.0,
            bubble_dynamics_mode="rayleigh_plesset",
        ),
        "tag": "cav:copper_h_control",
        "claim_tag": "null",
        "open_question_ids": ["EQ-OPEN-RATE-01"],
    },
]


def iter_cavitation_collapse_cases() -> Iterator[Dict[str, Any]]:
    for case in CAVITATION_COLLAPSE_CASES:
        yield dict(case)


def cavitation_collapse_count() -> int:
    return len(CAVITATION_COLLAPSE_CASES)
