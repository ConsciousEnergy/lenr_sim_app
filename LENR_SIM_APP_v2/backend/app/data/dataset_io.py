"""Load versioned JSON application datasets under LENR_SIM_APP_v2/datasets/."""

from __future__ import annotations

import json
import uuid
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List

SCHEMA = "lenr-app-dataset-v1"
BASELINE_NS = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")


def datasets_root() -> Path:
    """Return LENR_SIM_APP_v2/datasets, walking parents if layout differs."""
    here = Path(__file__).resolve()
    direct = here.parents[3] / "datasets"
    marker = "literature_baselines.v1.json"
    if (direct / marker).is_file():
        return direct
    for parent in here.parents:
        for candidate in (
            parent / "LENR_SIM_APP_v2" / "datasets",
            parent / "datasets",
        ):
            if (candidate / marker).is_file():
                return candidate
    raise FileNotFoundError(
        "Could not locate LENR_SIM_APP_v2/datasets/literature_baselines.v1.json"
    )


def load_dataset(name: str) -> Dict[str, Any]:
    """Load one JSON dataset file (``name`` includes the .json suffix)."""
    path = datasets_root() / name
    with path.open(encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return payload


def stable_baseline_id(literature_id: str) -> str:
    """Deterministic UUID so seeds do not change on every process start."""
    return str(uuid.uuid5(BASELINE_NS, f"lenr-baseline:{literature_id}"))


@lru_cache(maxsize=8)
def literature_baselines() -> Dict[str, Any]:
    return load_dataset("literature_baselines.v1.json")


@lru_cache(maxsize=8)
def screening_priors() -> Dict[str, Any]:
    return load_dataset("screening_priors.v1.json")


@lru_cache(maxsize=8)
def parkhomov_curated() -> Dict[str, Any]:
    return load_dataset("parkhomov_curated.v1.json")


@lru_cache(maxsize=8)
def open_question_register() -> Dict[str, Any]:
    return load_dataset("open_question_register.v1.json")


@lru_cache(maxsize=8)
def testable_predictions() -> Dict[str, Any]:
    return load_dataset("testable_predictions.v1.json")


@lru_cache(maxsize=8)
def literature_iccf27() -> Dict[str, Any]:
    return load_dataset("literature_iccf27.v1.json")


def iccf27_literature_records() -> List[Dict[str, Any]]:
    records = literature_iccf27().get("records") or []
    if not isinstance(records, list):
        raise ValueError("literature_iccf27.v1.json records must be a list")
    return records


def literature_records() -> List[Dict[str, Any]]:
    records = literature_baselines().get("records") or []
    if not isinstance(records, list):
        raise ValueError("literature_baselines.v1.json records must be a list")
    return records
