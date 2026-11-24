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

``GET /api/docs/campaign-packs`` is a JSON index of committed campaign JSON packs
under ``datasets/reviewer_packs/`` — distinct from paper Packet A–E markdown.
"""

from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, PlainTextResponse, Response

from app.services.campaign_pack_index import (
    build_campaign_pack_zip,
    list_committed_pack_summaries,
)

router = APIRouter(prefix="/docs", tags=["Docs"])

# Prefer served_docs for these slugs when the root docs/ copy is a stub/pointer.
_PREFER_BUNDLED_SLUGS = frozenset({"researcher-review-pack"})

# Slug -> filename mapping for known doc files
SLUG_TO_FILENAME = {
    "issue-ledger": "ISSUE_LEDGER.md",
    "testable-predictions": "TESTABLE_PREDICTIONS.md",
    "reviewer-packets": "REVIEWER_PACKETS.md",
    "researcher-review-pack": "RESEARCHER_REVIEW_PACK.md",
    "eq-open-closure-runway": "EQ_OPEN_CLOSURE_RUNWAY.md",
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


def _resolve_doc_path(slug: str, filename: str) -> Path:
    """Resolve markdown path; prefer bundled for stub-prone slugs."""
    bundled = _BUNDLED_DOCS_DIR / filename
    repo = _repo_root_docs_dir() / filename
    if slug in _PREFER_BUNDLED_SLUGS and bundled.is_file():
        return bundled
    docs_dir = _get_docs_dir()
    preferred = docs_dir / filename
    if preferred.is_file():
        return preferred
    if bundled.is_file():
        return bundled
    if repo.is_file():
        return repo
    return preferred


@router.get("/campaign-packs")
async def get_campaign_pack_index() -> JSONResponse:
    """
    Read-only index of committed campaign JSON packs (lenr-reviewer-pack-v1).

    Honesty: ``lenr_proved`` stays false; EQ-OPEN ids stay OPEN; packs are
    model-output hydrate/export — not paper Packet A–E and not LENR proof.
    """
    try:
        payload = list_committed_pack_summaries()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if payload.get("lenr_proved") is True:
        raise HTTPException(
            status_code=500,
            detail="campaign pack index must keep lenr_proved false",
        )
    return JSONResponse(payload)


@router.get("/campaign-packs/{pack_id}/download")
async def download_campaign_pack(pack_id: str, request: Request) -> Response:
    """Zip download of a committed campaign JSON pack (model output only)."""
    # request reserved for future IP budgeting parity with benchmark packs
    _ = request
    try:
        data = build_campaign_pack_zip(pack_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return Response(
        content=data,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{pack_id}.zip"',
            "X-LENR-Proved": "false",
            "X-EQ-Open-Status": "OPEN",
        },
    )


@router.get("/{slug}", response_class=PlainTextResponse)
async def get_doc(slug: str) -> str:
    """
    Return raw markdown for a doc by slug.
    Slugs: issue-ledger, testable-predictions, reviewer-packets,
    researcher-review-pack, eq-open-closure-runway.
    Returns 404 if slug unknown or file missing.
    """
    if slug not in SLUG_TO_FILENAME:
        raise HTTPException(status_code=404, detail=f"Unknown doc slug: {slug}")

    filename = SLUG_TO_FILENAME[slug]
    file_path = _resolve_doc_path(slug, filename)

    if not file_path.is_file():
        raise HTTPException(status_code=404, detail=f"Doc file not found: {filename}")

    return file_path.read_text(encoding="utf-8")
