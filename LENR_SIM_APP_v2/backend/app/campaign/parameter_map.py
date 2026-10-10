"""DeCapua/Metzler-style parameter-map cells (designed, not a full cartesian)."""

from __future__ import annotations

from typing import Any, Dict, Iterator, List

# loading × T × host, mixed H/D. Keep runnable.
PARAMETER_MAP_CASES: List[Dict[str, Any]] = [
    {
        "temperature": 300.0,
        "loading_ratio": 0.50,
        "host_material": "palladium",
        "reactant": "deuterium",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "tag": "pmap:pd_d_unloaded",
        "open_question_ids": ["EQ-OPEN-RATE-01"],
    },
    {
        "temperature": 300.0,
        "loading_ratio": 0.90,
        "host_material": "palladium",
        "reactant": "deuterium",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "tag": "pmap:pd_d_loaded",
        "open_question_ids": ["EQ-OPEN-RATE-01"],
    },
    {
        "temperature": 350.0,
        "loading_ratio": 0.90,
        "host_material": "nickel",
        "reactant": "hydrogen",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "tag": "pmap:ni_h_loaded",
    },
    {
        "temperature": 1100.0,
        "loading_ratio": 0.40,
        "host_material": "graphite",
        "reactant": "hydrogen",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "radiant_calorimetry": True,
        "tag": "pmap:graphite_h_hot",
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
        "tag": "pmap:sic_h",
        "claim_tag": "speculative",
    },
    {
        "temperature": 300.0,
        "loading_ratio": 0.90,
        "host_material": "zirconium",
        "reactant": "deuterium",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "beam_energy_kev": 2.0,
        "molecular_beam_species": "D1",
        "enabled_theories": ["czerski_thermal_spike", "electron_screening", "quantum_tunneling"],
        "tag": "pmap:zr_d_beam",
        "open_question_ids": ["EQ-OPEN-RATE-01"],
        "claim_tag": "EMP",
        "literature_id": "czerski-thermal-spike-zr-2024",
    },
]


def iter_parameter_map_cases() -> Iterator[Dict[str, Any]]:
    for case in PARAMETER_MAP_CASES:
        yield dict(case)


def parameter_map_count() -> int:
    return len(PARAMETER_MAP_CASES)
