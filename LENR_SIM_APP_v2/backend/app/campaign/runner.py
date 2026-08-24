"""Run a model-output simulation campaign and persist results to SQL.

Does not claim LENR is proved. Invariants in
formalization/predictions/campaign_invariants.json stay OPEN.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List

from app.api.routes.unified_simulation import SimulationRequest, run_unified_simulation
from app.api.routes.physics import TheoryConditions, TheoryRunRequest, run_theories
from app.campaign.grid import campaign_size, describe_preset, iter_campaign_cases
from app.services.campaign_invariants import evaluate_campaign
from app.services.simulation_persistence import SOURCE_CAMPAIGN

logger = logging.getLogger(__name__)

CAMPAIGN_SESSION = "simulation_campaign"


def _simulate_payload(case: Dict[str, Any], session_id: str) -> SimulationRequest:
    return SimulationRequest(
        material={"host_material": case["host_material"], "reactant": case["reactant"]},
        environmental={"temperature": case["temperature"]},
        lattice={"loading_ratio": case["loading_ratio"]},
        rate_mode=case["rate_mode"],
        use_theory_pipeline=case["use_theory_pipeline"],
        time_steps=10,
        total_time=1.0,
        persist_session_id=session_id,
        persist_source=SOURCE_CAMPAIGN,
    )


async def run_campaign(
    preset: str = "smoke",
    *,
    include_theory_pipeline: bool = True,
    session_id: str = CAMPAIGN_SESSION,
) -> Dict[str, Any]:
    """Execute the named grid, persist via route auto-save, check invariants."""
    cases = list(iter_campaign_cases(preset))
    payloads: List[Dict[str, Any]] = []
    persist_ids: List[Dict[str, Any]] = []

    for index, case in enumerate(cases):
        request = _simulate_payload(case, session_id)
        response = await run_unified_simulation(request)
        body = response.model_dump() if hasattr(response, "model_dump") else dict(response)
        body["rate_mode"] = case["rate_mode"]
        payloads.append(body)
        persist_ids.append(
            (body.get("analytics_transparency") or {}).get("persistence") or {}
        )
        logger.info(
            "campaign %s %s/%s %s T=%.0f pipeline=%s",
            preset,
            index + 1,
            len(cases),
            case["host_material"],
            case["temperature"],
            case["use_theory_pipeline"],
        )

    theory_payloads: List[Dict[str, Any]] = []
    if include_theory_pipeline:
        representative = cases[0]
        theory_request = TheoryRunRequest(
            conditions=TheoryConditions(
                temperature=representative["temperature"],
                loading_ratio=representative["loading_ratio"],
            ),
            persist_session_id=session_id,
            persist_source=SOURCE_CAMPAIGN,
        )
        theory_body = await run_theories(theory_request)
        theory_payloads.append(theory_body)

    comparison = evaluate_campaign(payloads)
    return {
        "preset": preset,
        "grid": describe_preset(preset),
        "n_unified_runs": len(payloads),
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
) -> Dict[str, Any]:
    """CLI helper; caller must have initialized the database."""
    return await run_campaign(
        preset,
        include_theory_pipeline=include_theory_pipeline,
    )
