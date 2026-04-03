"""
Docs API — serve markdown documentation from the project docs folder.
Maps URL slugs to filenames (e.g. issue-ledger -> ISSUE_LEDGER.md).
"""

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

router = APIRouter(prefix="/docs", tags=["Docs"])

# Slug -> filename mapping for known doc files
SLUG_TO_FILENAME = {
    "issue-ledger": "ISSUE_LEDGER.md",
    "testable-predictions": "TESTABLE_PREDICTIONS.md",
    "reviewer-packets": "REVIEWER_PACKETS.md",
}


def _get_docs_dir() -> Path:
    """Resolve docs directory: workspace_root/docs (where ISSUE_LEDGER etc. live)."""
    # api/routes -> api -> app -> backend -> LENR_SIM_APP_v2 -> LENR_SIM_APP (6 levels)
    p = Path(__file__).resolve()
    workspace_root = p.parent.parent.parent.parent.parent.parent
    return workspace_root / "docs"


@router.get("/{slug}", response_class=PlainTextResponse)
async def get_doc(slug: str) -> str:
    """
    Return raw markdown for a doc by slug.
    Slugs: issue-ledger, testable-predictions, reviewer-packets.
    Returns 404 if slug unknown or file missing.
    """
    if slug not in SLUG_TO_FILENAME:
        raise HTTPException(status_code=404, detail=f"Unknown doc slug: {slug}")

    filename = SLUG_TO_FILENAME[slug]
    docs_dir = _get_docs_dir()
    file_path = docs_dir / filename

    if not file_path.is_file():
        raise HTTPException(status_code=404, detail=f"Doc file not found: {filename}")

    return file_path.read_text(encoding="utf-8")
