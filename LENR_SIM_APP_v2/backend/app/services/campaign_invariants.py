"""Evaluate campaign model-output invariants against a simulation payload.

Predictions describe the *model*. They do not claim LENR is proved.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional, Tuple
import json


def _default_invariants_path() -> Path:
    here = Path(__file__).resolve()
    for parent in here.parents:
        candidate = parent / "formalization" / "predictions" / "campaign_invariants.json"
        if candidate.is_file():
            return candidate
    raise FileNotFoundError("campaign_invariants.json not found")


DEFAULT_INVARIANTS_PATH = _default_invariants_path()


def load_invariants(path: Optional[Path] = None) -> Dict[str, Any]:
    """Load the campaign prediction registry."""
    target = path or DEFAULT_INVARIANTS_PATH
    with target.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def dig(payload: Any, dotted: str) -> Any:
    """Read a dotted path, treating missing keys as None."""
    current = payload
    for part in dotted.split("."):
        if current is None:
            return None
        if isinstance(current, Mapping):
            current = current.get(part)
            continue
        current = getattr(current, part, None)
    return current


def _matches_when(payload: Mapping[str, Any], when: Optional[Mapping[str, Any]]) -> bool:
    if not when:
        return True
    for key, expected in when.items():
        actual = dig(payload, key)
        if actual != expected:
            return False
    return True


def _check_one(payload: Mapping[str, Any], spec: Mapping[str, Any]) -> Tuple[bool, str]:
    ident = spec.get("id", "unknown")
    if not _matches_when(payload, spec.get("when")):
        return True, f"{ident}: skipped (when)"

    field = spec.get("field")
    actual = dig(payload, field) if field else None

    if "equals" in spec:
        expected = spec["equals"]
        if actual != expected:
            return False, f"{ident}: {field} expected {expected!r} got {actual!r}"
        return True, f"{ident}: ok"

    if "approx" in spec:
        expected = float(spec["approx"])
        abs_tol = float(spec.get("abs_tol", 0.0))
        rel_tol = float(spec.get("rel_tol", 0.0))
        try:
            value = float(actual)
        except (TypeError, ValueError):
            return False, f"{ident}: {field} not numeric ({actual!r})"
        ok = abs(value - expected) <= abs_tol + rel_tol * abs(expected)
        if not ok:
            return False, f"{ident}: {field} expected ~{expected} ±{abs_tol} got {value}"
        return True, f"{ident}: ok"

    if "contains" in spec:
        expected_items = list(spec["contains"])
        actual_list = list(actual or [])
        missing = [item for item in expected_items if item not in actual_list]
        if missing:
            return False, f"{ident}: {field} missing {missing}"
        return True, f"{ident}: ok"

    if spec.get("is_false"):
        if actual:
            return False, f"{ident}: {field} expected false got {actual!r}"
        return True, f"{ident}: ok"

    if spec.get("is_true"):
        if not actual:
            return False, f"{ident}: {field} expected true got {actual!r}"
        return True, f"{ident}: ok"

    return False, f"{ident}: no comparison operator"


def evaluate_invariants(
    payload: Mapping[str, Any],
    registry: Optional[Mapping[str, Any]] = None,
) -> Dict[str, Any]:
    """Return {passed, failed, results} for one simulation payload."""
    spec = registry or load_invariants()
    results: List[Dict[str, Any]] = []
    failed: List[str] = []
    for item in spec.get("invariants") or []:
        ok, message = _check_one(payload, item)
        results.append({"id": item.get("id"), "ok": ok, "message": message})
        if not ok:
            failed.append(message)
    return {
        "schema": spec.get("schema"),
        "passed": not failed,
        "n_checked": len(results),
        "n_failed": len(failed),
        "failed": failed,
        "results": results,
        "lenr_proved": False,
    }


def evaluate_campaign(
    payloads: List[Mapping[str, Any]],
    registry: Optional[Mapping[str, Any]] = None,
) -> Dict[str, Any]:
    """Evaluate every campaign payload; campaign fails if any run fails."""
    spec = registry or load_invariants()
    per_run = [evaluate_invariants(payload, spec) for payload in payloads]
    failed_runs = [idx for idx, row in enumerate(per_run) if not row["passed"]]
    return {
        "schema": spec.get("schema"),
        "disclaimer": spec.get("disclaimer"),
        "n_runs": len(payloads),
        "n_failed_runs": len(failed_runs),
        "passed": not failed_runs,
        "failed_run_indexes": failed_runs,
        "per_run": per_run,
        "lenr_proved": False,
        "empirical_claim_tiers_raised": False,
    }
