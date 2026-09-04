"""CLI: write an open-question stress report from SQL experiments.

Usage (from LENR_SIM_APP_v2/backend):
    python -m app.scripts.report_open_question_stress --out ../datasets/reviewer_packs/local

Does not prove LENR. EQ-OPEN-* stay OPEN.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
from pathlib import Path

from app.core.database import db_manager, get_database_url
from app.models import database_models  # noqa: F401
from app.services.open_question_stress import (
    build_stress_report,
    collect_stress_experiments,
    write_stress_report,
)


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export open-question stress report")
    parser.add_argument(
        "--out",
        required=True,
        help="Output directory for open_question_stress.json",
    )
    parser.add_argument(
        "--live-scores",
        action="store_true",
        help="Include a small live five-factor vs literature-likelihood sample",
    )
    return parser.parse_args(argv)


async def _async_main(args: argparse.Namespace) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    database_url = get_database_url()
    db_manager.initialize(database_url=database_url, echo=False)
    await db_manager.create_tables()
    async with db_manager.session() as session:
        experiments = await collect_stress_experiments(session)
    report = build_stress_report(
        experiments,
        include_live_scores=bool(args.live_scores),
    )
    path = write_stress_report(Path(args.out), report)
    logging.info("Wrote %s", path)
    print(
        json.dumps(
            {
                "report": str(path),
                "schema": report["schema"],
                "n_experiments": report["n_experiments"],
                "lenr_proved": False,
                "open_ids": report["open_ids"],
            },
            indent=2,
        )
    )
    await db_manager.close()
    return 0 if report["lenr_proved"] is False else 1


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    return asyncio.run(_async_main(args))


if __name__ == "__main__":
    raise SystemExit(main())
