"""CLI: export SQL experiments + theory_runs as a reviewer pack.

Usage (from LENR_SIM_APP_v2/backend):
    python -m app.scripts.export_reviewer_pack --out ../datasets/reviewer_packs/local

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
from app.services.reviewer_pack import collect_pack_rows, write_pack


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export LENR_SIM_APP reviewer pack")
    parser.add_argument(
        "--out",
        required=True,
        help="Output directory for manifest.json + JSONL files",
    )
    parser.add_argument("--preset", default=None, help="Optional campaign preset label")
    return parser.parse_args(argv)


async def _async_main(args: argparse.Namespace) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    database_url = get_database_url()
    db_manager.initialize(database_url=database_url, echo=False)
    await db_manager.create_tables()
    async with db_manager.session() as session:
        experiments, runs = await collect_pack_rows(session)
    out_dir = Path(args.out)
    manifest_path = write_pack(out_dir, experiments, runs, preset=args.preset)
    logging.info("Wrote %s", manifest_path)
    print(json.dumps({"manifest": str(manifest_path), "lenr_proved": False}, indent=2))
    await db_manager.close()
    return 0


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    return asyncio.run(_async_main(args))


if __name__ == "__main__":
    raise SystemExit(main())
