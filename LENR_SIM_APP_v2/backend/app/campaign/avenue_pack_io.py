"""Reviewer-pack IO helpers for campaign avenue ranking."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional, Sequence

from app.campaign.avenue_catalog import (
    CAVITATION_PACK_ID,
    DEFAULT_SEED_PACKS,
    FALLBACK_PACK_ID,
    OPEN_IDS,
)
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


def prefer_ranking_packs(
    pack_ids: Optional[Sequence[str]] = None,
) -> List[str]:
    """Prefer Phase A cavitation pack; else ``q_campaign_demo``; else discovered.

    Explicit ``pack_ids`` still go through existence filtering only.
    """
    found = discover_seed_packs(pack_ids)
    if pack_ids is not None:
        return found
    if CAVITATION_PACK_ID in found:
        return [CAVITATION_PACK_ID]
    if FALLBACK_PACK_ID in found:
        return [FALLBACK_PACK_ID]
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
    """Collect stress OPEN ids from parameters or Phase A results shape."""
    params = row.get("parameters") or {}
    results = row.get("results") or {}
    ids: List[str] = []
    for source in (
        params.get("open_question_ids"),
        results.get("open_question_ids"),
    ):
        for oid in source or []:
            text = str(oid)
            if text not in ids:
                ids.append(text)
    # Full ledger open_ids are not stress tags; only use when nothing else tagged.
    if not ids:
        status = results.get("open_question_status") or {}
        for oid in status.get("open_ids") or results.get("open_ids") or []:
            text = str(oid)
            if text not in ids:
                ids.append(text)
    return ids


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


def _infer_reactant(row: Mapping[str, Any], params: Mapping[str, Any]) -> str:
    results = row.get("results") or {}
    explicit = params.get("reactant") or results.get("reactant")
    if explicit:
        return str(explicit).lower()
    tag = str(results.get("tag") or row.get("name") or "").lower()
    if "_h_" in tag or tag.endswith("_h") or ":ni_h" in tag or "copper_h" in tag:
        return "hydrogen"
    host = str(row.get("material") or params.get("host_material") or "").lower()
    if host in {"nickel", "copper"}:
        return "hydrogen"
    return "deuterium"


def config_from_row(row: Mapping[str, Any]) -> SimulationConfig:
    params = row.get("parameters") or {}
    results = row.get("results") or {}
    host = str(row.get("material") or params.get("host_material") or "palladium")
    reactant = _infer_reactant(row, params)
    reactant_props = (
        ReactantProperties.hydrogen()
        if reactant in {"hydrogen", "proton", "protium", "h"}
        else ReactantProperties.deuterium()
    )
    temp = float(
        row.get("temperature_k")
        or params.get("temperature")
        or results.get("temperature")
        or 300.0
    )
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
