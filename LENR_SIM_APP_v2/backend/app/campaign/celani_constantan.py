"""Celani constantan campaign preset (ENG-HS-06 / HIP-05).

Cite-gated metadata cells for Cu55Ni44Mn1 wire / air-flow AHE protocol.
Uses the first-class ``constantan`` host — not a Ni proxy.

Honesty locks:
- Exploratory instrument_precision MoE only (S_heat=6 arithmetic).
- Refuse fabricated discovery σ / discovery_grade flip.
- Never closes EQ-OPEN-* or flips ``lenr_proved``.
"""

from __future__ import annotations

from typing import Any, Dict, Iterator, List

CELANI_LITERATURE_ID = "celani-constantan-2019"
CELANI_CITATION_KEY = "celani2019"
CELANI_DOI = "10.70923/001c.72494"

# Designed (not cartesian) protocol cells.
CELANI_CONSTANTAN_CASES: List[Dict[str, Any]] = [
    {
        "temperature": 900.0,
        "loading_ratio": 0.50,
        "host_material": "constantan",
        "reactant": "deuterium",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "pressure": 101325.0,  # D2 ~1 bar
        "stimulation": {
            "heating_mode": "resistive",
            "p_resistive_watts": 90.0,
        },
        "tag": "celani:constantan_wire_airflow_pin90",
        "literature_id": CELANI_LITERATURE_ID,
        "citation_key": CELANI_CITATION_KEY,
        "doi": CELANI_DOI,
        "claim_tag": "contested",
        "open_question_ids": ["EQ-OPEN-YIELD-01"],
        "actual_host": "constantan_Cu55Ni44Mn1",
        "wire_diameter_um": 100,
        "input_power_W": 90,
        "atmosphere": "D2",
        "calorimetry": "air_flow",
        "moe_provenance": "literature_reported_instrument_precision",
        "discovery_refuse": "REFUSE_FABRICATED_SIGMA_Q",
        "note": (
            "Celani JCMNS 29 (2019) exploratory hydrate: AHE 12±2 W on 100 µm "
            "constantan wire, Pin 90 W, D2 1 bar. instrument_precision only — "
            "gates blocked; never discovery σ."
        ),
    },
    {
        "temperature": 900.0,
        "loading_ratio": 0.50,
        "host_material": "constantan",
        "reactant": "deuterium",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "pressure": 101325.0,
        "stimulation": {
            "heating_mode": "resistive",
            "p_resistive_watts": 90.0,
        },
        "tag": "celani:constantan_wire_200um_stable_alt",
        "literature_id": CELANI_LITERATURE_ID,
        "citation_key": CELANI_CITATION_KEY,
        "claim_tag": "contested",
        "open_question_ids": ["EQ-OPEN-YIELD-01"],
        "actual_host": "constantan_Cu55Ni44Mn1",
        "wire_diameter_um": 200,
        "atmosphere": "Xe-D2",
        "calorimetry": "air_flow",
        "moe_provenance": "literature_reported_instrument_precision",
        "discovery_refuse": "REFUSE_FABRICATED_SIGMA_Q",
        "note": (
            "Sibling stable 6–7 W episode (200 µm, Xe–D2) without published ±. "
            "Still exploratory / non-discovery."
        ),
    },
    {
        # Negative-ish control: same protocol labels on Ni host (legacy proxy).
        "temperature": 900.0,
        "loading_ratio": 0.50,
        "host_material": "nickel",
        "reactant": "deuterium",
        "rate_mode": "two_body",
        "use_theory_pipeline": True,
        "stimulation": {
            "heating_mode": "resistive",
            "p_resistive_watts": 90.0,
        },
        "tag": "celani:ni_proxy_control",
        "claim_tag": "null",
        "open_question_ids": ["EQ-OPEN-YIELD-01"],
        "note": (
            "Ni-host proxy control — constantan cells above are the scheduled "
            "Celani protocol; this row documents the pre-HIP-05 Ni fallback."
        ),
    },
]


def iter_celani_constantan_cases() -> Iterator[Dict[str, Any]]:
    for case in CELANI_CONSTANTAN_CASES:
        yield dict(case)


def celani_constantan_count() -> int:
    return len(CELANI_CONSTANTAN_CASES)
