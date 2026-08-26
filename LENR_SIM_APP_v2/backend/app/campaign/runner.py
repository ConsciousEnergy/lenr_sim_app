"""Run a model-output simulation campaign and persist results to SQL.

Does not claim LENR is proved. Invariants in
formalization/predictions/campaign_invariants.json stay OPEN.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List

from app.api.routes.unified_simulation import SimulationRequest, run_unified_simulation
from app.api.routes.physics import TheoryConditions, TheoryRunRequest, run_theories
from app.campaign.grid import (
    campaign_size,
    describe_preset,
    iter_all_claims_single_theory_cases,
    iter_campaign_cases,
    iter_diverse_theory_group_cases,
)
from app.services.campaign_invariants import evaluate_campaign
from app.services.persist_runs import persist_failed_run
from app.services.simulation_persistence import SOURCE_CAMPAIGN

logger = logging.getLogger(__name__)

CAMPAIGN_SESSION = "simulation_campaign"


def _simulate_payload(
    case: Dict[str, Any],
    session_id: str,
    preset: str,
) -> SimulationRequest:
    environmental: Dict[str, Any] = {
        "temperature": min(max(float(case["temperature"]), 1.0), 2000.0)
    }
    if "electric_field" in case:
        environmental["electric_field"] = case["electric_field"]
    kwargs: Dict[str, Any] = dict(
        material={"host_material": case["host_material"], "reactant": case["reactant"]},
        environmental=environmental,
        lattice={"loading_ratio": min(max(float(case["loading_ratio"]), 0.0), 2.0)},
        rate_mode=case["rate_mode"],
        use_theory_pipeline=case["use_theory_pipeline"],
        time_steps=10,
        total_time=1.0,
        persist_session_id=session_id,
        persist_source=SOURCE_CAMPAIGN,
        campaign_preset=preset,
        campaign_tag=case.get("tag"),
        literature_id=case.get("literature_id"),
        claim_tag=case.get("claim_tag"),
        open_question_ids=list(case.get("open_question_ids") or []) or None,
    )
    if case.get("enabled_theories"):
        kwargs["enabled_theories"] = list(case["enabled_theories"])
    if case.get("electrolyte_family"):
        kwargs["electrolyte"] = {"family": case["electrolyte_family"]}
    if case.get("include_uncertainty"):
        kwargs["include_uncertainty"] = True
        kwargs["uncertainty_samples"] = int(case.get("uncertainty_samples") or 256)
        if case.get("random_seed") is not None:
            kwargs["random_seed"] = int(case["random_seed"])
    return SimulationRequest(**kwargs)


async def _run_unified_case(
    case: Dict[str, Any],
    session_id: str,
    index: int,
    total: int,
    preset: str,
) -> tuple[Dict[str, Any] | None, Dict[str, Any]]:
    request = _simulate_payload(case, session_id, preset)
    try:
        response = await run_unified_simulation(request)
        body = response.model_dump() if hasattr(response, "model_dump") else dict(response)
        body["rate_mode"] = case["rate_mode"]
        persist = (body.get("analytics_transparency") or {}).get("persistence") or {}
        logger.info(
            "campaign %s %s/%s %s T=%.0f pipeline=%s tag=%s",
            preset,
            index + 1,
            total,
            case["host_material"],
            case["temperature"],
            case["use_theory_pipeline"],
            case.get("tag"),
        )
        return body, persist
    except Exception as exc:
        logger.exception(
            "campaign %s case failed host=%s T=%.0f tag=%s",
            preset,
            case.get("host_material"),
            float(case.get("temperature") or 0.0),
            case.get("tag"),
        )
        failed_case = dict(case)
        failed_case["campaign_preset"] = preset
        persist = await persist_failed_run(
            failed_case,
            exc,
            session_id=session_id,
            source=SOURCE_CAMPAIGN,
        )
        return None, persist


async def run_campaign(
    preset: str = "smoke",
    *,
    include_theory_pipeline: bool = True,
    session_id: str = CAMPAIGN_SESSION,
    uq_samples: int | None = None,
) -> Dict[str, Any]:
    """Execute the named grid, persist via route auto-save, check invariants."""
    cases = list(iter_campaign_cases(preset))
    if preset == "diverse":
        cases.extend(iter_diverse_theory_group_cases())
    if preset == "all_claims":
        cases.extend(iter_all_claims_single_theory_cases())
    if uq_samples:
        # API contract: UQ stays opt-in; sample cap matches MAX_UNCERTAINTY_SAMPLES.
        samples = max(16, min(int(uq_samples), 512))
        for case in cases[:2]:
            case["include_uncertainty"] = True
            case["uncertainty_samples"] = samples
            case["random_seed"] = 5

    payloads: List[Dict[str, Any]] = []
    persist_ids: List[Dict[str, Any]] = []
    n_exception_runs = 0

    for index, case in enumerate(cases):
        body, persist = await _run_unified_case(
            case, session_id, index, len(cases), preset
        )
        persist_ids.append(persist)
        if body is None:
            n_exception_runs += 1
            continue
        payloads.append(body)

    theory_payloads: List[Dict[str, Any]] = []
    if include_theory_pipeline and preset not in {"diverse", "question_theories"}:
        representative = next(iter_campaign_cases(preset))
        loading = float(representative["loading_ratio"])
        theory_request = TheoryRunRequest(
            conditions=TheoryConditions(
                temperature=min(max(float(representative["temperature"]), 1.0), 2000.0),
                loading_ratio=min(max(float(representative.get("loading_ratio") or 0.9), 0.0), 1.0),
            ),
            persist_session_id=session_id,
            persist_source=SOURCE_CAMPAIGN,
            campaign_preset=preset,
            campaign_tag=representative.get("tag"),
            literature_id=representative.get("literature_id"),
            claim_tag=representative.get("claim_tag"),
            open_question_ids=list(representative.get("open_question_ids") or []) or None,
        )
        theory_body = await run_theories(theory_request)
        theory_payloads.append(theory_body)

    comparison = evaluate_campaign(payloads)
    comparison["n_exception_runs"] = n_exception_runs
    return {
        "preset": preset,
        "grid": describe_preset(preset),
        "n_unified_runs": len(payloads),
        "n_attempted_runs": len(cases),
        "n_exception_runs": n_exception_runs,
        "n_theory_pipeline_runs": len(theory_payloads),
        "session_id": session_id,
        "source": SOURCE_CAMPAIGN,
        "is_model_output": True,
        "lenr_proved": False,
        "empirical_claim_tiers_raised": False,
        "persistence": persist_ids,
        "invariants": comparison,
        "expected_size": campaign_size(preset),
    }


async def run_campaign_from_cli(
    preset: str = "default",
    include_theory_pipeline: bool = True,
    uq_samples: int | None = None,
) -> Dict[str, Any]:
    """CLI helper; caller must have initialized the database."""
    return await run_campaign(
        preset,
        include_theory_pipeline=include_theory_pipeline,
        uq_samples=uq_samples,
    )
