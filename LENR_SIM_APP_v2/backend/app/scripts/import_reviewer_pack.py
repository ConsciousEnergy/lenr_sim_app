"""CLI: import a reviewer pack into SQL Analytics rows.

Usage (from LENR_SIM_APP_v2/backend):
    python -m app.scripts.import_reviewer_pack --in ../datasets/reviewer_packs/q_campaign_demo

Model outputs only. Does not prove LENR or close EQ-OPEN-*.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
from pathlib import Path

from app.core.database import db_manager, get_database_url
from app.data.dataset_io import datasets_root
from app.models import database_models  # noqa: F401
from app.services.reviewer_pack import PackImportError, import_pack_rows

DEMO_PACK = Path("reviewer_packs") / "q_campaign_demo"


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import LENR_SIM_APP reviewer pack")
    parser.add_argument(
        "--in",
        dest="pack_dir",
        default=None,
        help="Pack directory with manifest.json + JSONL (default: datasets/reviewer_packs/q_campaign_demo)",
    )
    return parser.parse_args(argv)


def _resolve_pack_dir(raw: str | None) -> Path:
    if raw:
        path = Path(raw)
        if path.is_dir():
            return path
        raise PackImportError(f"pack directory not found: {path}")
    default = datasets_root() / DEMO_PACK
    if default.is_dir():
        return default
    raise PackImportError(f"demo pack not found: {default}")


async def _async_main(args: argparse.Namespace) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    pack_dir = _resolve_pack_dir(args.pack_dir)
    database_url = get_database_url()
    db_manager.initialize(database_url=database_url, echo=False)
    await db_manager.create_tables()
    async with db_manager.session() as session:
        summary = await import_pack_rows(session, pack_dir)
    logging.info("Imported %s experiments / %s theory_runs", summary["n_experiments"], summary["n_theory_runs"])
    print(json.dumps(summary, indent=2))
    await db_manager.close()
    return 0


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    try:
        return asyncio.run(_async_main(args))
    except PackImportError as exc:
        logging.basicConfig(level=logging.ERROR, format="%(levelname)s %(message)s")
        logging.error("%s", exc)
        print(json.dumps({"error": str(exc), "lenr_proved": False}, indent=2))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
