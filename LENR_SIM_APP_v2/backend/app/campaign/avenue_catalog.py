"""Lab-avenue catalog for campaign-level informativeness ranking.

Maps measurement avenues → EQ-OPEN-* stress targets and decision_oracle
``next_measurement`` observables. Ranking never closes OPEN rows.
"""

from __future__ import annotations

from typing import Any, Dict, List, Tuple

OPEN_IDS: Tuple[str, ...] = (
    "EQ-OPEN-MEV-01",
    "EQ-OPEN-RAD-01",
    "EQ-OPEN-RATE-01",
    "EQ-OPEN-EC-01",
    "EQ-OPEN-YIELD-01",
)

# Phase A pack id (PR #299). Preferred ranking seed when present on disk.
CAVITATION_PACK_ID = "cavitation_collapse_campaign"
FALLBACK_PACK_ID = "q_campaign_demo"

# Discovery order: prefer Phase A cavitation pack, else q_campaign_demo, else smoke.
DEFAULT_SEED_PACKS: Tuple[str, ...] = (
    CAVITATION_PACK_ID,
    FALLBACK_PACK_ID,
    "smoke",
)

#: Miles-class EMP heat–He conversion band (MeV/He4); decision_oracle twin.
MILES_Q_BAND_MEV: Tuple[float, float] = (20.0, 28.0)

#: Model-assumption rate band (reactions/m^3/s) for rate-UQ posterior weighting
#: when a pack cell lacks a cited rate. Labelled; not a lab posterior.
DEFAULT_RATE_BAND: Tuple[float, float] = (1e-20, 1e-10)


def avenue_definitions() -> List[Dict[str, Any]]:
    """Static catalog of lab avenues ranked for informativeness (RORO)."""
    return [
        {
            "id": "miles_heat_helium_q",
            "label": "Simultaneous heat + He-4 (Miles Q band)",
            "observable": "he4",
            "stresses_open_ids": ["EQ-OPEN-MEV-01", "EQ-OPEN-YIELD-01"],
            "oracle_next_rank": 1,
            "uq_layer": "rate_and_oracle",
            "ledger_rows": ["EQ-OPEN-MEV-01", "EQ-OPEN-YIELD-01", "WH-ENP-01"],
        },
        {
            "id": "gamma_ul_23p8",
            "label": "Efficiency-corrected 23.8 MeV γ upper limit",
            "observable": "gamma_ul",
            "stresses_open_ids": ["EQ-OPEN-RAD-01"],
            "oracle_next_rank": 2,
            "uq_layer": "oracle",
            "ledger_rows": ["EQ-OPEN-RAD-01", "ENG-BRANCH-01"],
        },
        {
            "id": "calorimetry_sigma_q",
            "label": "Calorimetry resolution (σ_Q / SNR)",
            "observable": "sigma_Q",
            "stresses_open_ids": ["EQ-OPEN-YIELD-01"],
            "oracle_next_rank": 3,
            "uq_layer": "oracle",
            "ledger_rows": ["EQ-OPEN-YIELD-01"],
        },
        {
            "id": "p4_occupation",
            "label": "p_4 occupation / trap occupancy probe",
            "observable": "p_4_occupation",
            "stresses_open_ids": ["EQ-OPEN-MEV-01", "EQ-OPEN-RATE-01"],
            "oracle_next_rank": 4,
            "uq_layer": "oracle",
            "ledger_rows": ["EQ-OPEN-MEV-01", "EQ-OPEN-RATE-01", "EQ-TSC-OCC-OPEN"],
        },
        {
            "id": "rate_budget_loading",
            "label": "Reaction-rate vs loading / host (rate UQ + band)",
            "observable": "reaction_rate",
            "stresses_open_ids": ["EQ-OPEN-RATE-01"],
            "oracle_next_rank": 5,
            "uq_layer": "reaction_rate_uq",
            "ledger_rows": ["EQ-OPEN-RATE-01", "ENG-RATE-2B"],
        },
        {
            "id": "electron_capture_threshold",
            "label": "Electron-capture / mass-renormalization threshold",
            "observable": "mass_renormalization",
            "stresses_open_ids": ["EQ-OPEN-EC-01"],
            "oracle_next_rank": 6,
            "uq_layer": "oracle",
            "ledger_rows": ["EQ-OPEN-EC-01"],
        },
        {
            "id": "cavitation_collapse_uq",
            "label": "Cavitation / collapse peak UQ (ENC bookkeeping)",
            "observable": "collapse_peak_conditions",
            "stresses_open_ids": ["EQ-OPEN-RATE-01", "EQ-OPEN-MEV-01"],
            "oracle_next_rank": 7,
            "uq_layer": "collapse_uq",
            "ledger_rows": ["ENG-BUBBLE-FUSION-01", "EQ-BBL-LIM-01", "EQ-OPEN-RATE-01"],
            "optional_pack_id": CAVITATION_PACK_ID,
        },
    ]
