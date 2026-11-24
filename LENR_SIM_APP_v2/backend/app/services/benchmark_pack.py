"""UMLENR benchmark pack builder (``umlenr-benchmark-pack-v1``).

Assembles an honesty-gated zip for in-app download: PROVENANCE + P1–P6
inventory, explicit unavailable stubs (Bao 2023 / Kasagi 2002 raw), and one
atomic ``lenr-run-export-v1`` envelope. Never flips ``lenr_proved`` or closes
EQ-OPEN-*. Null/stub beats fabrication.
"""

from __future__ import annotations

import io
import json
import os
import zipfile
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.physics_engine.run_export import SCHEMA_VERSION as RUN_EXPORT_SCHEMA
from app.physics_engine.run_export import build_run_export

PACK_SCHEMA_ID = "umlenr-benchmark-pack-v1"
PROVENANCE_SCHEMA_ID = "umlenr-benchmark-pack-provenance-v1"
DEFAULT_PACK_ID = "umlenr-p1-p6-v1"

REQUIRED_OPEN_IDS = (
    "EQ-OPEN-MEV-01",
    "EQ-OPEN-RAD-01",
    "EQ-OPEN-RATE-01",
    "EQ-OPEN-EC-01",
    "EQ-OPEN-YIELD-01",
)


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _tip_dev_sha() -> Optional[str]:
    """Best-effort tip SHA from env; never invent one."""
    for key in ("LENR_TIP_DEV_SHA", "GIT_COMMIT", "SOURCE_COMMIT", "GITHUB_SHA"):
        value = (os.getenv(key) or "").strip()
        if value:
            return value[:40]
    return None


def inventory_rows() -> List[Dict[str, Any]]:
    """P1–P6 delivery inventory (honest statuses for the in-app pack)."""
    return [
        {
            "priority": "P1",
            "item": "Cavitation / bubble hydrodynamics",
            "status": "partial",
            "files": "priority-slices/P1_cavitation_descriptor.json; json/lenr-run-export-v1_default.json",
            "note": (
                "In-app pack ships descriptor + unified export envelope. "
                "Full BF/UBLV live pulls remain via /api/physics/bubble-fusion "
                "and /api/unified/bubble-lattice. UI 1 µs BF slider is not an "
                "engine input — see cavitation repro doc."
            ),
            "honesty_class": "model_output_exploratory",
            "eq_open_stress": ["EQ-OPEN-RATE-01", "EQ-OPEN-MEV-01"],
        },
        {
            "priority": "P2",
            "item": "Quantum tunneling",
            "status": "partial",
            "files": "priority-slices/P2_tunneling_descriptor.json; json/lenr-run-export-v1_default.json",
            "note": (
                "WKB + theory single remain on /api/physics/quantum-tunneling; "
                "pack includes export envelope for replayable unified path."
            ),
            "honesty_class": "model_output_exploratory",
            "eq_open_stress": ["EQ-OPEN-RATE-01"],
        },
        {
            "priority": "P3",
            "item": "Heat / calorimetry",
            "status": "partial",
            "files": "priority-slices/P3_heat_descriptor.json; json/lenr-run-export-v1_default.json",
            "note": "Unified observables often 0 on default path — not lab heat.",
            "honesty_class": "model_output_hypothetical",
            "eq_open_stress": ["EQ-OPEN-MEV-01", "EQ-OPEN-YIELD-01"],
        },
        {
            "priority": "P4",
            "item": "Radiation",
            "status": "partial",
            "files": "priority-slices/P4_radiation_descriptor.json",
            "note": "Theory module / corpus MoE only — no lab spectrum series.",
            "honesty_class": "speculative_exploratory",
            "eq_open_stress": ["EQ-OPEN-RAD-01"],
        },
        {
            "priority": "P5",
            "item": "Reaction rates",
            "status": "partial",
            "files": "priority-slices/P5_reaction_rate_descriptor.json; json/lenr-run-export-v1_default.json",
            "note": "Rate engine block on unified export; physics rate API still available.",
            "honesty_class": "model_output_exploratory",
            "eq_open_stress": ["EQ-OPEN-RATE-01"],
        },
        {
            "priority": "P6",
            "item": "Yield / He correlation (Miles module)",
            "status": "partial",
            "files": "priority-slices/P6_yield_descriptor.json",
            "note": "Module scale ≠ lab yield closure; EQ-OPEN-YIELD stays OPEN.",
            "honesty_class": "empirical_lenr_correlation",
            "eq_open_stress": ["EQ-OPEN-YIELD-01", "EQ-OPEN-EC-01"],
        },
        {
            "priority": "P6",
            "item": "Bao 2023 experimental series",
            "status": "unavailable",
            "files": "json/unavailable_bao_2023.json",
            "note": "Not present in app corpus; do not fabricate.",
            "honesty_class": "unavailable",
            "eq_open_stress": [],
        },
        {
            "priority": "P6",
            "item": "Kasagi 2002 raw DAQ/time series",
            "status": "unavailable",
            "files": "json/unavailable_kasagi_2002_raw.json",
            "note": (
                "App holds kasagi-*-radiant-2026 MoE metadata only "
                "(literature_reported); raw 2002 series unavailable."
            ),
            "honesty_class": "unavailable",
            "eq_open_stress": [],
        },
        {
            "priority": "universal",
            "item": "lenr-run-export-v1 server envelope",
            "status": "delivered",
            "files": "json/lenr-run-export-v1_default.json",
            "note": "Built via server build_run_export (same contract as POST /api/unified/export).",
            "honesty_class": "model_output_exploratory",
            "eq_open_stress": list(REQUIRED_OPEN_IDS),
        },
        {
            "priority": "universal",
            "item": "lenr-ara-daq-sample-v1",
            "status": "unavailable",
            "files": "json/unavailable_lenr_ara_daq_sample_v1.json",
            "note": "Planned schema; not live on public Sim.",
            "honesty_class": "unavailable",
            "eq_open_stress": [],
        },
    ]


def build_provenance(*, pack_id: str = DEFAULT_PACK_ID) -> Dict[str, Any]:
    """Universal provenance block required in every pack."""
    return {
        "schema_id": PROVENANCE_SCHEMA_ID,
        "pack_id": pack_id,
        "pack_schema_id": PACK_SCHEMA_ID,
        "app_version_live": settings.APP_VERSION,
        "tip_dev_sha": _tip_dev_sha(),
        "live_api_base": "https://api.conscious.energy",
        "exported_at": _iso_now(),
        "lenr_proved": False,
        "eq_open_status": "all_five_OPEN",
        "required_open_ids": list(REQUIRED_OPEN_IDS),
        "honesty_class_default": "model_output_not_laboratory",
        "inventory": inventory_rows(),
        "cavitation_repro_ref": (
            "LENR_SIM_APP_v2/docs/v0.4.1-beta/UMLENR_BENCHMARK_PACK_DOWNLOAD.md"
        ),
        "disclaimer": (
            "Simulation model output ≠ laboratory proof. "
            "All five EQ-OPEN-* remain OPEN. lenr_proved stays false."
        ),
    }


def _unavailable_stub(*, reason: str, corpus_note: str) -> Dict[str, Any]:
    return {
        "schema_id": "umlenr-unavailable-slice-v1",
        "status": "unavailable",
        "honesty_class": "unavailable",
        "lenr_proved": False,
        "eq_open_status": "all_five_OPEN",
        "reason": reason,
        "corpus_note": corpus_note,
        "numerics": None,
        "note": "Explicit stub — null beats fabrication.",
    }


def _priority_descriptor(
    *,
    priority: str,
    title: str,
    status: str,
    honesty_class: str,
    endpoints: List[str],
    note: str,
) -> Dict[str, Any]:
    return {
        "schema_id": "umlenr-priority-slice-descriptor-v1",
        "priority": priority,
        "title": title,
        "status": status,
        "honesty_class": honesty_class,
        "lenr_proved": False,
        "eq_open_status": "all_five_OPEN",
        "api_endpoints": endpoints,
        "note": note,
    }


def _default_export_envelope() -> Dict[str, Any]:
    """Atomic ``lenr-run-export-v1`` without re-running heavy ODE.

    Uses a compact, claim-tier-bearing results stub so the pack always
    carries the locked schema. Live SPA Export JSON still hits
    ``POST /api/unified/export`` for a full simulate+envelope.
    """
    results = {
        "contract_version": f"{settings.APP_VERSION}-science-gate-1",
        "open_questions": {
            "open_ids": list(REQUIRED_OPEN_IDS),
            "status": "OPEN",
            "lenr_proved": False,
        },
        "observables": {
            "excess_heat_watts": 0.0,
            "note": "Default unified path often reports zero heat — not lab calorimetry.",
        },
        "reaction_rate_engine": {
            "rate": {
                "mode": "two_body",
                "claim_tier": "validated_lenr_mechanism",
                "references": ["raiola2002"],
            }
        },
        "provenance": {
            "pack_slice": "umlenr-p1-p6-v1/default-export",
            "note": "Pack-embedded envelope; SPA Export JSON uses live /api/unified/export.",
        },
    }
    params = {
        "material": {"host_material": "palladium", "reactant": "deuterium"},
        "environmental": {"temperature": 300.0, "pressure": 101325.0},
        "lattice": {"loading_ratio": 0.9},
        "time_steps": 10,
        "total_time": 1.0,
        "rate_mode": "two_body",
        "include_uncertainty": False,
        "random_seed": 5,
    }
    envelope = build_run_export(
        simulation_parameters=params,
        results=results,
        environment=getattr(settings.ENVIRONMENT, "value", str(settings.ENVIRONMENT)),
        system_preset="palladium_deuterium",
        seed=5,
        model_version=settings.APP_VERSION,
        extra_provenance={
            "pack_id": DEFAULT_PACK_ID,
            "honesty_class": "model_output_not_laboratory",
            "lenr_proved": False,
        },
    )
    assert envelope["schema_version"] == RUN_EXPORT_SCHEMA
    return envelope


def list_benchmark_packs() -> Dict[str, Any]:
    """Read-only index of downloadable UMLENR benchmark packs."""
    return {
        "schema": "umlenr-benchmark-pack-index-v1",
        "lenr_proved": False,
        "eq_open_status": "all_five_OPEN",
        "required_open_ids": list(REQUIRED_OPEN_IDS),
        "disclaimer": (
            "Benchmark packs are simulation model-output bundles "
            f"({PACK_SCHEMA_ID}). Not laboratory datasets; EQ-OPEN stay OPEN."
        ),
        "n_packs": 1,
        "packs": [
            {
                "pack_id": DEFAULT_PACK_ID,
                "schema_id": PACK_SCHEMA_ID,
                "title": "UMLENR P1–P6 benchmark pack",
                "role": "benchmark",
                "lenr_proved": False,
                "download_path": f"/api/benchmark-packs/{DEFAULT_PACK_ID}/download",
            }
        ],
    }


def build_benchmark_pack_zip(*, pack_id: str = DEFAULT_PACK_ID) -> bytes:
    """Build ``umlenr-benchmark-pack-v1`` zip bytes (RORO-ish)."""
    if pack_id != DEFAULT_PACK_ID:
        raise FileNotFoundError(f"Unknown benchmark pack: {pack_id}")

    provenance = build_provenance(pack_id=pack_id)
    if provenance.get("lenr_proved") is True:
        raise RuntimeError("benchmark pack must keep lenr_proved false")

    files: Dict[str, str] = {}
    root = f"{pack_id}/"

    files[f"{root}PROVENANCE.json"] = json.dumps(provenance, indent=2, sort_keys=True)
    files[f"{root}PACK.json"] = json.dumps(
        {
            "schema_id": PACK_SCHEMA_ID,
            "pack_id": pack_id,
            "lenr_proved": False,
            "eq_open_status": "all_five_OPEN",
            "atomic_run_schema": RUN_EXPORT_SCHEMA,
            "honesty_class_default": "model_output_not_laboratory",
        },
        indent=2,
        sort_keys=True,
    )
    files[f"{root}README.md"] = (
        f"# {pack_id}\n\n"
        f"Schema: `{PACK_SCHEMA_ID}`.\n\n"
        "This pack is **simulation model output**, not laboratory proof.\n"
        "`lenr_proved` stays **false**; all five `EQ-OPEN-*` stay **OPEN**.\n\n"
        "See `PROVENANCE.json` and `INVENTORY-P1-P6.md`.\n"
    )
    inv_lines = [
        "# P1–P6 inventory (in-app pack)",
        "",
        f"**App version:** {settings.APP_VERSION}  ",
        f"**Exported:** {provenance['exported_at']}",
        "",
        "| Priority | Item | Status | Honesty |",
        "|----------|------|--------|---------|",
    ]
    for row in provenance["inventory"]:
        inv_lines.append(
            f"| {row['priority']} | {row['item']} | **{row['status']}** | "
            f"`{row.get('honesty_class', '')}` |"
        )
    inv_lines.extend(
        [
            "",
            "**Honesty:** delivered/partial rows are model output, not lab datasets.",
            "",
        ]
    )
    files[f"{root}INVENTORY-P1-P6.md"] = "\n".join(inv_lines) + "\n"

    export_env = _default_export_envelope()
    files[f"{root}json/lenr-run-export-v1_default.json"] = json.dumps(
        export_env, indent=2, sort_keys=True
    )
    files[f"{root}json/unavailable_bao_2023.json"] = json.dumps(
        _unavailable_stub(
            reason="Bao 2023 experimental time series not in app corpus",
            corpus_note="No Bao 2023 corpus id located; refuse synthesis.",
        ),
        indent=2,
        sort_keys=True,
    )
    files[f"{root}json/unavailable_kasagi_2002_raw.json"] = json.dumps(
        _unavailable_stub(
            reason="Kasagi 2002 raw DAQ/time series not shipped",
            corpus_note=(
                "Corpus has kasagi-ni-radiant-2026 / kasagi-nicu-radiant-2026 "
                "MoE metadata only."
            ),
        ),
        indent=2,
        sort_keys=True,
    )
    files[f"{root}json/unavailable_lenr_ara_daq_sample_v1.json"] = json.dumps(
        _unavailable_stub(
            reason="lenr-ara-daq-sample-v1 planned, not live on public Sim",
            corpus_note="Private ARA plane; public fields only later.",
        ),
        indent=2,
        sort_keys=True,
    )

    descriptors = [
        _priority_descriptor(
            priority="P1",
            title="Cavitation / bubble hydrodynamics",
            status="partial",
            honesty_class="model_output_exploratory",
            endpoints=[
                "/api/physics/bubble-fusion",
                "/api/unified/bubble-lattice",
            ],
            note=(
                "Descriptor only in this pack zip. Collapse time is ODE-defined; "
                "BF 1 µs UI slider is not sent to the engine."
            ),
        ),
        _priority_descriptor(
            priority="P2",
            title="Quantum tunneling",
            status="partial",
            honesty_class="model_output_exploratory",
            endpoints=[
                "/api/physics/quantum-tunneling",
                "/api/unified/export",
            ],
            note="Use physics WKB + unified export for full slice.",
        ),
        _priority_descriptor(
            priority="P3",
            title="Heat / calorimetry",
            status="partial",
            honesty_class="model_output_hypothetical",
            endpoints=["/api/unified/simulate", "/api/unified/export"],
            note="excess_heat often 0 — not laboratory calorimetry.",
        ),
        _priority_descriptor(
            priority="P4",
            title="Radiation",
            status="partial",
            honesty_class="speculative_exploratory",
            endpoints=["/api/analytics/theories/run"],
            note="Theory slice only; no lab spectrum series.",
        ),
        _priority_descriptor(
            priority="P5",
            title="Reaction rates",
            status="partial",
            honesty_class="model_output_exploratory",
            endpoints=[
                "/api/physics/lenr-reaction-rate",
                "/api/unified/export",
            ],
            note="Rate engine on export envelope; physics rate API for dedicated row.",
        ),
        _priority_descriptor(
            priority="P6",
            title="Yield / He correlation",
            status="partial",
            honesty_class="empirical_lenr_correlation",
            endpoints=["/api/analytics/theories/run"],
            note="Miles heat–helium module scale ≠ lab yield closure.",
        ),
    ]
    name_map = {
        "P1": "P1_cavitation_descriptor.json",
        "P2": "P2_tunneling_descriptor.json",
        "P3": "P3_heat_descriptor.json",
        "P4": "P4_radiation_descriptor.json",
        "P5": "P5_reaction_rate_descriptor.json",
        "P6": "P6_yield_descriptor.json",
    }
    for desc in descriptors:
        fname = name_map[desc["priority"]]
        files[f"{root}priority-slices/{fname}"] = json.dumps(
            desc, indent=2, sort_keys=True
        )

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for path, content in sorted(files.items()):
            zf.writestr(path, content.encode("utf-8"))
    return buf.getvalue()


__all__ = [
    "PACK_SCHEMA_ID",
    "PROVENANCE_SCHEMA_ID",
    "DEFAULT_PACK_ID",
    "REQUIRED_OPEN_IDS",
    "inventory_rows",
    "build_provenance",
    "list_benchmark_packs",
    "build_benchmark_pack_zip",
]
