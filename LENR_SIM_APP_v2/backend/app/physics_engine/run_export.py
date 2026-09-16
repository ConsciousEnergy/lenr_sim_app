"""Reproducibility export envelope ``lenr-run-export-v1`` (Phase 10 / RR-017).

Builds a self-describing, reproducible run envelope that captures everything
needed to re-run and audit a simulation: schema version, environment, seeds,
full inputs, results, claim tiers, uncertainty summary, provenance, and a
**deduplicated per-run citation list** aggregated from every claim-bearing
output. Aligns with docs/v0.3.6-beta/REPRODUCIBILITY_EXPORT_SCHEMA.md and adds
the follow-up enhancements noted there (explicit seed + citations).

RORO: receives plain dicts, returns one envelope dict. Pure / side-effect free.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional

SCHEMA_VERSION = "lenr-run-export-v1"


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _collect_citations(*sources: Any) -> List[str]:
    """Recursively gather unique citation/reference strings from nested data."""
    seen: List[str] = []

    def _walk(obj: Any) -> None:
        if obj is None:
            return
        if isinstance(obj, str):
            return
        if isinstance(obj, dict):
            for key, value in obj.items():
                if key in ("references", "citations", "primary_sources") and isinstance(
                    value, (list, tuple)
                ):
                    for ref in value:
                        if isinstance(ref, str) and ref and ref not in seen:
                            seen.append(ref)
                else:
                    _walk(value)
        elif isinstance(obj, (list, tuple)):
            for item in obj:
                _walk(item)

    for src in sources:
        _walk(src)
    return seen


def _collect_claim_tiers(*sources: Any) -> List[str]:
    """Gather unique claim-tier labels present in the run outputs."""
    tiers: List[str] = []

    def _walk(obj: Any) -> None:
        if isinstance(obj, dict):
            for key, value in obj.items():
                if key == "claim_tier" and isinstance(value, str) and value not in tiers:
                    tiers.append(value)
                else:
                    _walk(value)
        elif isinstance(obj, (list, tuple)):
            for item in obj:
                _walk(item)

    for src in sources:
        _walk(src)
    return tiers


def build_run_export(
    *,
    simulation_parameters: Dict[str, Any],
    results: Dict[str, Any],
    environment: str = "development",
    system_preset: str = "custom",
    seed: Optional[int] = None,
    model_version: Optional[str] = None,
    extra_provenance: Optional[Dict[str, Any]] = None,
    extra_citations: Optional[Iterable[str]] = None,
    experiment_template_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Build a ``lenr-run-export-v1`` envelope (RORO).

    Parameters
    ----------
    simulation_parameters:
        The full, replayable input set (request/config as a dict).
    results:
        The full results object (e.g. the SimulationResponse payload).
    seed:
        Explicit RNG seed used for any stochastic/UQ step (None if deterministic).
    experiment_template_id:
        Optional experiment-template registry id (stub schema in v0.3.8).
    """
    citations = _collect_citations(results, simulation_parameters)
    for extra in extra_citations or []:
        if isinstance(extra, str) and extra and extra not in citations:
            citations.append(extra)

    claim_tiers = _collect_claim_tiers(results)

    # ARA P0: experiment template stub + enabled theories / seeds / Q audit.
    template_id = experiment_template_id
    if not template_id and isinstance(simulation_parameters, dict):
        template_id = simulation_parameters.get("experiment_template_id")
    if not template_id:
        template_id = "experiment_template_stub_v1"

    enabled_theories: List[str] = []
    if isinstance(simulation_parameters, dict):
        raw_enabled = simulation_parameters.get("enabled_theories")
        if isinstance(raw_enabled, (list, tuple)):
            enabled_theories = [str(x) for x in raw_enabled]
    if not enabled_theories and isinstance(results, dict):
        for key in ("enabled_theories", "per_theory"):
            block = results.get(key)
            if key == "enabled_theories" and isinstance(block, list):
                enabled_theories = [str(x) for x in block]
            elif key == "per_theory" and isinstance(block, list):
                enabled_theories = [
                    str(row.get("theory_id"))
                    for row in block
                    if isinstance(row, dict) and row.get("theory_id")
                ]

    conservation_q_audit: Dict[str, Any] = {
        "status": "stub",
        "note": (
            "v0.3.8 additive stub: conservation / Q-value audit summary placeholder. "
            "Does not close EQ-OPEN-*."
        ),
    }
    if isinstance(results, dict):
        if isinstance(results.get("conservation_audit"), dict):
            conservation_q_audit = results["conservation_audit"]
        elif isinstance(results.get("q_audit"), dict):
            conservation_q_audit = results["q_audit"]

    provenance: Dict[str, Any] = {
        "model_version": model_version,
        "schema_version": SCHEMA_VERSION,
        "seed": seed,
        "deterministic": seed is not None,
        "experiment_template_id": template_id,
        "enabled_theories": enabled_theories,
        "solver_seeds": {"random_seed": seed},
        "claim_tiers_present": claim_tiers,
        "conservation_q_audit": conservation_q_audit,
    }
    oq = results.get("open_questions") if isinstance(results, dict) else None
    if isinstance(oq, dict):
        ids = list(oq.get("open_ids") or [])
        if ids:
            provenance["open_questions_ids"] = ids
    if extra_provenance:
        provenance.update(extra_provenance)

    return {
        "schema_version": SCHEMA_VERSION,
        "exported_at": _iso_now(),
        "environment": environment,
        "system_preset": system_preset,
        "experiment_template_id": template_id,
        "simulation_parameters": simulation_parameters,
        "results": results,
        "reproducibility": {
            "seed": seed,
            "deterministic": seed is not None,
            "solver_seeds": {"random_seed": seed},
        },
        "claim_tiers_present": claim_tiers,
        "uncertainty": _extract_uncertainty(results),
        "provenance": provenance,
        "citations": citations,
        "conservation_q_audit": conservation_q_audit,
        "enabled_theories": enabled_theories,
    }


def _extract_uncertainty(results: Dict[str, Any]) -> Dict[str, Any]:
    """Pull a compact uncertainty summary from the results if present."""
    engine = results.get("reaction_rate_engine") if isinstance(results, dict) else None
    if isinstance(engine, dict) and isinstance(engine.get("uncertainty"), dict):
        uq = engine["uncertainty"]
        return {
            "interval_kind": uq.get("interval_kind"),
            "credible_interval": uq.get("credible_interval"),
            "n_samples": uq.get("n_samples"),
            "seed": uq.get("seed"),
        }
    if isinstance(results, dict) and isinstance(results.get("uncertainty_interval"), dict):
        return {"uncertainty_interval": results["uncertainty_interval"]}
    return {}


__all__ = ["build_run_export", "SCHEMA_VERSION"]
