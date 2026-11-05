"""Reviewer-pack IO helpers for campaign avenue ranking."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional, Sequence

from app.campaign.avenue_catalog import DEFAULT_SEED_PACKS, OPEN_IDS
from app.data.dataset_io import datasets_root
from app.physics_engine.unified_lenr_model.config import (
    MaterialProperties,
    ReactantProperties,
    SimulationConfig,
)


def pack_root(pack_id: str) -> Path:
    return datasets_root() / "reviewer_packs" / pack_id


def discover_seed_packs(
    pack_ids: Optional[Sequence[str]] = None,
) -> List[str]:
    """Return pack ids that exist on disk (Phase A pack soft-plugs when present)."""
    wanted = list(pack_ids) if pack_ids is not None else list(DEFAULT_SEED_PACKS)
    found: List[str] = []
    for pack_id in wanted:
        root = pack_root(pack_id)
        if (root / "manifest.json").is_file() and (root / "experiments.jsonl").is_file():
            found.append(pack_id)
    return found


def load_pack_experiments(pack_id: str) -> List[Dict[str, Any]]:
    """Load experiments.jsonl rows from a reviewer pack (empty if missing)."""
    path = pack_root(pack_id) / "experiments.jsonl"
    if not path.is_file():
        return []
    rows: List[Dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        rows.append(json.loads(line))
    return rows


def open_ids_from_row(row: Mapping[str, Any]) -> List[str]:
    params = row.get("parameters") or {}
    ids = list(params.get("open_question_ids") or [])
    results = row.get("results") or {}
    status = results.get("open_question_status") or {}
    for oid in status.get("open_ids") or []:
        if oid not in ids:
            ids.append(str(oid))
    return [str(x) for x in ids]


def pack_coverage(experiments: Sequence[Mapping[str, Any]]) -> Dict[str, float]:
    """Fraction of pack cells tagging each OPEN id (0 if none tagged)."""
    counts: Counter[str] = Counter()
    tagged = 0
    for row in experiments:
        ids = open_ids_from_row(row)
        if not ids:
            continue
        tagged += 1
        for oid in ids:
            counts[oid] += 1
    if tagged <= 0:
        return {oid: 0.0 for oid in OPEN_IDS}
    return {oid: counts.get(oid, 0) / float(tagged) for oid in OPEN_IDS}


def config_from_row(row: Mapping[str, Any]) -> SimulationConfig:
    params = row.get("parameters") or {}
    host = str(row.get("material") or params.get("host_material") or "palladium")
    reactant = str(params.get("reactant") or "deuterium").lower()
    reactant_props = (
        ReactantProperties.hydrogen()
        if reactant in {"hydrogen", "proton", "protium", "h"}
        else ReactantProperties.deuterium()
    )
    temp = float(row.get("temperature_k") or params.get("temperature") or 300.0)
    loading = float(row.get("loading_ratio") or params.get("loading_ratio") or 0.9)
    return SimulationConfig(
        host_material=MaterialProperties.from_name(host),
        reactant=reactant_props,
        temperature=temp,
        loading_ratio=loading,
    )


def representative_row(
    experiments: Sequence[Mapping[str, Any]],
    stresses: Sequence[str],
) -> Optional[Mapping[str, Any]]:
    for row in experiments:
        ids = set(open_ids_from_row(row))
        if ids.intersection(stresses):
            return row
    return experiments[0] if experiments else None
