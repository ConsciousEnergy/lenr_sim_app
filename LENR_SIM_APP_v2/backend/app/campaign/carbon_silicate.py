"""Designed carbon / silicate host UQ cells (not a cartesian blow-up).

Users inspect probabilistic outcomes on Pd/Ni metals and graphite / SiC hosts.
Does not prove LENR. EQ-OPEN-* stay OPEN.
"""

from __future__ import annotations

from typing import Any, Dict, Iterator, List

CARBON_SILICATE_UQ_CASES: List[Dict[str, Any]] = [
    {
        "temperature": 300.0,
        "loading_ratio": 0.90,
        "host_material": "palladium",
        "reactant": "deuterium",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "include_uncertainty": True,
        "uncertainty_samples": 64,
        "random_seed": 11,
        "tag": "uq:pd_d_ambient",
        "open_question_ids": ["EQ-OPEN-RATE-01"],
    },
    {
        "temperature": 350.0,
        "loading_ratio": 0.90,
        "host_material": "nickel",
        "reactant": "hydrogen",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "include_uncertainty": True,
        "uncertainty_samples": 64,
        "random_seed": 12,
        "tag": "uq:ni_h_warm",
        "open_question_ids": ["EQ-OPEN-RATE-01"],
    },
    {
        "temperature": 1100.0,
        "loading_ratio": 0.40,
        "host_material": "graphite",
        "reactant": "hydrogen",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "include_uncertainty": True,
        "uncertainty_samples": 64,
        "random_seed": 13,
        "radiant_calorimetry": True,
        "h2_absorb_pressure_pa": 250.0,
        "tag": "uq:graphite_h_desorption",
        "open_question_ids": ["EQ-OPEN-YIELD-01"],
        "claim_tag": "speculative",
    },
    {
        "temperature": 1100.0,
        "loading_ratio": 0.40,
        "host_material": "graphite",
        "reactant": "deuterium",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "include_uncertainty": True,
        "uncertainty_samples": 64,
        "random_seed": 14,
        "tag": "uq:graphite_d_desorption",
        "open_question_ids": ["EQ-OPEN-YIELD-01"],
        "claim_tag": "speculative",
    },
    {
        "temperature": 500.0,
        "loading_ratio": 0.30,
        "host_material": "silicon_carbide",
        "reactant": "hydrogen",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "include_uncertainty": True,
        "uncertainty_samples": 64,
        "random_seed": 15,
        "tag": "uq:sic_h",
        "open_question_ids": ["EQ-OPEN-RATE-01"],
        "claim_tag": "speculative",
    },
    {
        "temperature": 500.0,
        "loading_ratio": 0.30,
        "host_material": "silicon_carbide",
        "reactant": "deuterium",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "include_uncertainty": True,
        "uncertainty_samples": 64,
        "random_seed": 16,
        "tag": "uq:sic_d",
        "open_question_ids": ["EQ-OPEN-RATE-01"],
        "claim_tag": "speculative",
    },
    {
        "temperature": 300.0,
        "loading_ratio": 0.10,
        "host_material": "palladium",
        "reactant": "deuterium",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "tag": "uq:pd_d_unloaded_control",
        "claim_tag": "null",
        "open_question_ids": ["EQ-OPEN-RATE-01"],
    },
    {
        "temperature": 300.0,
        "loading_ratio": 0.90,
        "host_material": "copper",
        "reactant": "hydrogen",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "tag": "uq:copper_h_control",
        "claim_tag": "null",
    },
]


def iter_carbon_silicate_uq_cases() -> Iterator[Dict[str, Any]]:
    for case in CARBON_SILICATE_UQ_CASES:
        yield dict(case)


def carbon_silicate_uq_count() -> int:
    return len(CARBON_SILICATE_UQ_CASES)
