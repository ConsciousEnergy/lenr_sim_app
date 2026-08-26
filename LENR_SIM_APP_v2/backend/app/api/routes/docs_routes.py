"""
Docs API — serve markdown documentation from the project docs folder.
Maps URL slugs to filenames (e.g. issue-ledger -> ISSUE_LEDGER.md).

Adding a served document takes three steps, all of them required:

1. Place the markdown in the **repository-root** ``docs/`` directory, not
   ``LENR_SIM_APP_v2/docs/``. ``_get_docs_dir`` resolves six levels up from this
   file, so a doc placed under the v2 tree returns 404.
2. Add the slug here in ``SLUG_TO_FILENAME``.
3. Add the slug to ``SLUG_TO_TITLE`` in ``frontend/src/pages/DocViewerPage.tsx``
   and link it from ``DocumentationPage.jsx``, or the route stays unreachable.

Note the path collision hazard: FastAPI's Swagger UI is mounted at ``/api/docs``
and these markdown documents at ``/api/docs/{slug}``.
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
    "researcher-review-pack": "RESEARCHER_REVIEW_PACK.md",
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
    Slugs: issue-ledger, testable-predictions, reviewer-packets,
    researcher-review-pack.
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
