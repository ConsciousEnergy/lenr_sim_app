"""CLI: run a model-output simulation campaign and persist to SQL.

Usage (from LENR_SIM_APP_v2/backend):
    python -m app.scripts.run_simulation_campaign --preset smoke
    python -m app.scripts.run_simulation_campaign --preset default
    python -m app.scripts.run_simulation_campaign --preset diverse
    python -m app.scripts.run_simulation_campaign --preset literature_grid
    python -m app.scripts.run_simulation_campaign --preset all_claims
    python -m app.scripts.run_simulation_campaign --preset association_screen
    python -m app.scripts.run_simulation_campaign --preset testbed_review

Does not prove LENR. EQ-OPEN-* stay OPEN.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys

from app.campaign.grid import PRESETS, describe_preset
from app.campaign.runner import run_campaign_from_cli
from app.core.database import db_manager, get_database_url
from app.models import database_models  # noqa: F401  register metadata


def _parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run LENR_SIM_APP model-output campaign")
    parser.add_argument(
        "--preset",
        choices=sorted(PRESETS.keys()),
        default="default",
        help=(
            "Grid size (smoke=4, default=48, full=288, diverse=~197 unified + "
            "theory-group runs, all_claims=6 unified + one run per registered theory, "
            "literature_grid=one cell per literature_id + negative controls, "
            "question_theories=Q-anchored isolated theories + ARPA-E nulls, "
            "testbed_review=one isolated cell per registered theory + 3 literature cells)"
        ),
    )
    parser.add_argument(
        "--skip-theory-pipeline",
        action="store_true",
        help="Do not add a representative /theories/run after the unified grid",
    )
    parser.add_argument(
        "--uq-samples",
        type=int,
        default=None,
        help=(
            "Opt-in Sobol samples for the first two cells only (max 512). "
            "Default remains UQ off. Does not prove LENR."
        ),
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="Print preset sizes and exit",
    )
    return parser.parse_args(argv)


async def _async_main(args: argparse.Namespace) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    if args.list:
        for name in PRESETS:
            print(json.dumps(describe_preset(name)))
        return 0

    database_url = get_database_url()
    db_manager.initialize(database_url=database_url, echo=False)
    await db_manager.create_tables()
    result = await run_campaign_from_cli(
        args.preset,
        include_theory_pipeline=not args.skip_theory_pipeline,
        uq_samples=args.uq_samples,
    )
    summary = {
        "preset": result["preset"],
        "n_unified_runs": result["n_unified_runs"],
        "n_theory_pipeline_runs": result["n_theory_pipeline_runs"],
        "invariants_passed": result["invariants"]["passed"],
        "n_attempted_runs": result.get("n_attempted_runs"),
        "n_exception_runs": result.get("n_exception_runs", 0),
        "n_failed_runs": result["invariants"].get("n_failed_runs", 0),
        "lenr_proved": False,
        "empirical_claim_tiers_raised": False,
        "persisted": sum(1 for row in result["persistence"] if row.get("experiment_id")),
    }
    print(json.dumps(summary, indent=2))
    return 0 if result["invariants"]["passed"] else 1


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv if argv is not None else sys.argv[1:])
    return asyncio.run(_async_main(args))


if __name__ == "__main__":
    raise SystemExit(main())
