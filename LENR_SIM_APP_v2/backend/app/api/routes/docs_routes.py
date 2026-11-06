"""
Docs API — serve markdown documentation from the project docs folder.
Maps URL slugs to filenames (e.g. issue-ledger -> ISSUE_LEDGER.md).

Adding a served document takes three steps, all of them required:

1. Place the markdown in the **repository-root** ``docs/`` directory *and*
   mirror it under ``backend/app/served_docs/`` (Docker images only copy
   ``backend/app``; they do not include repository-root ``docs/``).
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

# backend/app/served_docs — shipped inside the container with COPY backend/app
_BUNDLED_DOCS_DIR = Path(__file__).resolve().parents[2] / "served_docs"


def _repo_root_docs_dir() -> Path:
    """Resolve repository-root docs/ (six levels up from this module)."""
    # api/routes -> api -> app -> backend -> LENR_SIM_APP_v2 -> LENR_SIM_APP (6 levels)
    p = Path(__file__).resolve()
    workspace_root = p.parent.parent.parent.parent.parent.parent
    return workspace_root / "docs"


def _get_docs_dir() -> Path:
    """Prefer repository-root docs/ when present; else bundled served_docs (Docker)."""
    repo_docs = _repo_root_docs_dir()
    if repo_docs.is_dir() and any(
        (repo_docs / filename).is_file() for filename in SLUG_TO_FILENAME.values()
    ):
        return repo_docs
    if _BUNDLED_DOCS_DIR.is_dir():
        return _BUNDLED_DOCS_DIR
    return repo_docs


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
