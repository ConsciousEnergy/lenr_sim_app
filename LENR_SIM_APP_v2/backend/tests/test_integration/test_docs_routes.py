"""
Contract tests for the markdown docs endpoint.

Three slugs are served from the *repository-root* ``docs/`` directory, mirrored by
``SLUG_TO_TITLE`` in the frontend viewer. Nothing linked to the viewer route, so a
broken slug map would have gone unnoticed; and the resolver walks six directory
levels up, which silently breaks if this module ever moves.
"""

from fastapi.testclient import TestClient

from app.api.routes.docs_routes import SLUG_TO_FILENAME, _get_docs_dir


def _client() -> TestClient:
    from app.main import app

    return TestClient(app)


def test_docs_directory_resolves_to_a_usable_docs_tree():
    """Prefer repository-root docs/; fall back to app/served_docs for Docker images."""
    docs_dir = _get_docs_dir()
    assert docs_dir.name in {"docs", "served_docs"}
    assert docs_dir.is_dir(), f"resolved docs dir does not exist: {docs_dir}"


def test_every_mapped_slug_has_a_file_on_disk():
    docs_dir = _get_docs_dir()
    missing = [
        f"{slug} -> {filename}"
        for slug, filename in SLUG_TO_FILENAME.items()
        if not (docs_dir / filename).is_file()
    ]
    assert missing == [], f"mapped slugs with no file: {missing}"


def test_each_slug_serves_markdown():
    client = _client()
    for slug in SLUG_TO_FILENAME:
        response = client.get(f"/api/docs/{slug}")
        assert response.status_code == 200, slug
        assert response.text.strip(), f"{slug} served empty content"


def test_unknown_slug_returns_404_not_500():
    response = _client().get("/api/docs/not-a-real-document")
    assert response.status_code == 404


def test_swagger_ui_still_served_at_the_parent_path():
    """Swagger lives at /api/docs and the markdown docs at /api/docs/{slug}; the
    two must not shadow each other."""
    response = _client().get("/api/docs")
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "")


def test_frontend_title_map_covers_every_served_slug():
    """A slug served by the backend but absent from the viewer's title map renders
    without a heading, so the two maps must stay in step."""
    from pathlib import Path

    viewer = (
        Path(__file__).resolve().parents[3]
        / "frontend"
        / "src"
        / "pages"
        / "DocViewerPage.tsx"
    )
    assert viewer.is_file(), f"viewer not found at {viewer}"
    source = viewer.read_text()
    for slug in SLUG_TO_FILENAME:
        assert f"'{slug}'" in source, f"{slug} missing from DocViewerPage title map"


def test_documentation_page_links_to_every_served_slug():
    """The viewer route was unreachable because nothing linked to it."""
    from pathlib import Path

    page = (
        Path(__file__).resolve().parents[3]
        / "frontend"
        / "src"
        / "pages"
        / "DocumentationPage.jsx"
    )
    assert page.is_file(), f"documentation page not found at {page}"
    source = page.read_text()
    for slug in SLUG_TO_FILENAME:
        assert f"'{slug}'" in source, f"{slug} is served but not linked anywhere"


def test_bundled_served_docs_mirror_covers_every_slug():
    """Docker images ship app/served_docs; keep it in sync with SLUG_TO_FILENAME."""
    from pathlib import Path

    bundled = Path(__file__).resolve().parents[2] / "app" / "served_docs"
    assert bundled.is_dir(), f"missing bundled docs at {bundled}"
    missing = [
        filename
        for filename in SLUG_TO_FILENAME.values()
        if not (bundled / filename).is_file()
    ]
    assert missing == [], f"served_docs missing: {missing}"
