"""Export and import persisted experiments and theory_runs as a reviewer pack.

Model outputs only. Does not prove LENR or close EQ-OPEN-*.
"""

from __future__ import annotations

import json
import subprocess
import uuid
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database_models import Experiment, TheoryRun
from app.services.analytics_service import classify_source_class
from app.services.simulation_persistence import DISCLAIMER

PACK_SCHEMA = "lenr-reviewer-pack-v1"
INVARIANTS_PATH = (
    Path(__file__).resolve().parents[4]
    / "formalization"
    / "predictions"
    / "campaign_invariants.json"
)


def _git_sha() -> Optional[str]:
    try:
        root = Path(__file__).resolve().parents[4]
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=root,
            check=True,
            capture_output=True,
            text=True,
        )
        return result.stdout.strip() or None
    except Exception:
        return None


def _load_invariants() -> Dict[str, Any]:
    if not INVARIANTS_PATH.is_file():
        return {"schema": "lenr-campaign-predictions-v1", "lenr_proved": False}
    with INVARIANTS_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


def _claim_tiers(experiments: List[Experiment], runs: List[TheoryRun]) -> Dict[str, int]:
    counts: Counter[str] = Counter()
    for run in runs:
        for rec in (run.theory_scores or {}).values():
            if isinstance(rec, dict) and rec.get("claim_tier"):
                counts[str(rec["claim_tier"])] += 1
    for exp in experiments:
        results = exp.results_json or {}
        scores = results.get("pipeline_scores") or {}
        if isinstance(scores, dict):
            for rec in scores.values():
                if isinstance(rec, dict) and rec.get("claim_tier"):
                    counts[str(rec["claim_tier"])] += 1
    return dict(counts)


def build_manifest(
    experiments: List[Experiment],
    runs: List[TheoryRun],
    *,
    preset: Optional[str] = None,
) -> Dict[str, Any]:
    source_counts: Counter[str] = Counter()
    for exp in experiments:
        source_counts[
            classify_source_class(is_baseline=bool(exp.is_baseline), source=exp.source)
        ] += 1
    invariants = _load_invariants()
    return {
        "schema": PACK_SCHEMA,
        "disclaimer": DISCLAIMER,
        "lenr_proved": False,
        "empirical_claim_tiers_raised": False,
        "git_sha": _git_sha(),
        "preset": preset,
        "n_experiments": len(experiments),
        "n_theory_runs": len(runs),
        "claim_tier_histogram": _claim_tiers(experiments, runs),
        "source_class_counts": dict(source_counts),
        "open_ids": [
            "EQ-OPEN-MEV-01",
            "EQ-OPEN-RAD-01",
            "EQ-OPEN-RATE-01",
            "EQ-OPEN-EC-01",
            "EQ-OPEN-YIELD-01",
        ],
        "campaign_invariants": invariants,
        "score_formula": "five_factor_gm_x_claim_tier",
        "skip_sensitivity_note": (
            "Persisted parameter_sensitivity is 0.5 unless live scores are computed."
        ),
    }


async def collect_pack_rows(
    session: AsyncSession,
) -> tuple[List[Experiment], List[TheoryRun]]:
    experiments = list((await session.execute(select(Experiment))).scalars().all())
    runs = list((await session.execute(select(TheoryRun))).scalars().all())
    return experiments, runs


def write_pack(
    out_dir: Path,
    experiments: List[Experiment],
    runs: List[TheoryRun],
    *,
    preset: Optional[str] = None,
) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest = build_manifest(experiments, runs, preset=preset)
    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    with (out_dir / "experiments.jsonl").open("w", encoding="utf-8") as handle:
        for exp in experiments:
            row = exp.to_dict()
            row["sourceClass"] = classify_source_class(
                is_baseline=bool(exp.is_baseline), source=exp.source
            )
            handle.write(json.dumps(row) + "\n")
    with (out_dir / "theory_runs.jsonl").open("w", encoding="utf-8") as handle:
        for run in runs:
            handle.write(json.dumps(run.to_dict()) + "\n")
    return out_dir / "manifest.json"


class PackImportError(ValueError):
    """Raised when a reviewer pack is missing, malformed, or claims proof."""


def _read_jsonl(path: Path) -> List[Dict[str, Any]]:
    if not path.is_file():
        return []
    rows: List[Dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        text = line.strip()
        if not text:
            continue
        payload = json.loads(text)
        if isinstance(payload, dict):
            rows.append(payload)
    return rows


def read_pack(pack_dir: Path) -> Tuple[Dict[str, Any], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Load manifest + JSONL from a reviewer-pack directory."""
    pack_dir = Path(pack_dir)
    manifest_path = pack_dir / "manifest.json"
    if not manifest_path.is_file():
        raise PackImportError(f"missing manifest.json in {pack_dir}")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if not isinstance(manifest, dict):
        raise PackImportError("manifest.json must be a JSON object")
    if manifest.get("schema") != PACK_SCHEMA:
        raise PackImportError(
            f"unsupported pack schema {manifest.get('schema')!r}; expected {PACK_SCHEMA}"
        )
    if manifest.get("lenr_proved") is True:
        raise PackImportError("refusing pack with lenr_proved=true")
    experiments = _read_jsonl(pack_dir / "experiments.jsonl")
    runs = _read_jsonl(pack_dir / "theory_runs.jsonl")
    return manifest, experiments, runs


def _parse_dt(value: Any) -> Optional[datetime]:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value
    text = str(value).replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def _stamp_model_output(parameters: Dict[str, Any], results: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    params = dict(parameters or {})
    params["imported_from_pack"] = True
    payload = dict(results or {})
    payload["is_model_output"] = True
    payload["lenr_proved"] = False
    return params, payload


def _experiment_fields(row: Dict[str, Any]) -> Dict[str, Any]:
    parameters, results = _stamp_model_output(
        row.get("parameters") if isinstance(row.get("parameters"), dict) else {},
        row.get("results") if isinstance(row.get("results"), dict) else {},
    )
    fields: Dict[str, Any] = {
        "name": row.get("name") or "Imported pack row",
        "description": row.get("description"),
        "experiment_type": row.get("type") or row.get("experiment_type") or "unified_theory",
        "status": row.get("status") or "completed",
        "session_id": row.get("session_id"),
        "is_baseline": bool(row.get("is_baseline")),
        "source": row.get("source"),
        "source_url": row.get("source_url"),
        "material": row.get("material") or "palladium",
        "temperature_k": float(row.get("temperature_k") or 300.0),
        "pressure_bar": float(row.get("pressure_bar") or 1.0),
        "loading_ratio": row.get("loading_ratio"),
        "defect_density": row.get("defect_density"),
        "driving_frequency_khz": row.get("driving_frequency_khz"),
        "parameters_json": parameters,
        "enhancement_factor": row.get("enhancement_factor"),
        "fusion_rate": row.get("fusion_rate"),
        "energy_output_kev": row.get("energy_output_kev"),
        "excess_heat_watts": row.get("excess_heat_watts"),
        "duration_seconds": row.get("duration_seconds"),
        "results_json": results,
    }
    created_at = _parse_dt(row.get("created_at"))
    updated_at = _parse_dt(row.get("updated_at"))
    if created_at is not None:
        fields["created_at"] = created_at
    if updated_at is not None:
        fields["updated_at"] = updated_at
    return fields


def _theory_run_fields(row: Dict[str, Any]) -> Dict[str, Any]:
    fields: Dict[str, Any] = {
        "session_id": row.get("session_id"),
        "temperature_k": float(row.get("temperature_k") or 300.0),
        "loading_ratio": float(row.get("loading_ratio") or 0.9),
        "pressure_pa": float(row.get("pressure_pa") or 101325.0),
        "electron_density": float(row.get("electron_density") or 6.8e28),
        "conditions": row.get("conditions") if isinstance(row.get("conditions"), dict) else {},
        "enabled_theories": row.get("enabled_theories") if isinstance(row.get("enabled_theories"), list) else [],
        "theory_scores": row.get("theory_scores") if isinstance(row.get("theory_scores"), dict) else {},
        "combined_enhancement": float(row.get("combined_enhancement") or 1.0),
        "total_energy_watts": float(row.get("total_energy_watts") or 0.0),
        "top_theory_id": row.get("top_theory_id"),
        "top_theory_score": float(row.get("top_theory_score") or 0.0),
        "validation_summary": row.get("validation_summary") if isinstance(row.get("validation_summary"), dict) else {},
    }
    created_at = _parse_dt(row.get("created_at"))
    if created_at is not None:
        fields["created_at"] = created_at
    return fields


async def _upsert(session: AsyncSession, model, row_id: str, fields: Dict[str, Any]) -> str:
    existing = await session.get(model, row_id)
    if existing is None:
        session.add(model(id=row_id, **fields))
        return "inserted"
    for key, value in fields.items():
        setattr(existing, key, value)
    return "updated"


async def import_pack_rows(
    session: AsyncSession,
    pack_dir: Path,
) -> Dict[str, Any]:
    """Upsert pack JSONL into SQL. Idempotent on row id. Does not prove LENR."""
    manifest, experiments, runs = read_pack(pack_dir)
    inserted = 0
    updated = 0
    for row in experiments:
        row_id = str(row.get("id") or uuid.uuid4())
        action = await _upsert(session, Experiment, row_id, _experiment_fields(row))
        if action == "inserted":
            inserted += 1
        else:
            updated += 1
    run_inserted = 0
    run_updated = 0
    for row in runs:
        row_id = str(row.get("id") or uuid.uuid4())
        action = await _upsert(session, TheoryRun, row_id, _theory_run_fields(row))
        if action == "inserted":
            run_inserted += 1
        else:
            run_updated += 1
    await session.commit()
    return {
        "schema": PACK_SCHEMA,
        "lenr_proved": False,
        "pack": str(Path(pack_dir)),
        "n_experiments": len(experiments),
        "n_theory_runs": len(runs),
        "experiments_inserted": inserted,
        "experiments_updated": updated,
        "theory_runs_inserted": run_inserted,
        "theory_runs_updated": run_updated,
        "preset": manifest.get("preset"),
        "disclaimer": DISCLAIMER,
    }
