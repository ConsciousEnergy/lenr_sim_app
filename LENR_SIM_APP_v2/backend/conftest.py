"""Root pytest hooks shared by tests/ and app/tests/.

Self-hosted lenr-ci runners sometimes lack system DejaVu fonts and cannot
sudo apt-get. Register matplotlib's bundled DejaVu TTFs so Agg savefig in
app/tests/test_unified_theory.py does not ValueError.
"""

from __future__ import annotations


def pytest_configure(config) -> None:  # noqa: ARG001 - pytest hook signature
    _ensure_matplotlib_dejavu()


def _ensure_matplotlib_dejavu() -> None:
    from pathlib import Path

    import matplotlib

    matplotlib.use("Agg", force=False)
    from matplotlib import font_manager

    ttf_dir = Path(matplotlib.get_data_path()) / "fonts" / "ttf"
    bundled = ttf_dir / "DejaVuSans.ttf"
    if not bundled.is_file():
        return

    for stale in Path(matplotlib.get_cachedir()).glob("fontlist-*.json"):
        try:
            stale.unlink()
        except OSError:
            pass

    font_manager.fontManager = font_manager.FontManager()
    for ttf in sorted(ttf_dir.glob("DejaVu*.ttf")):
        try:
            font_manager.fontManager.addfont(str(ttf))
        except (OSError, RuntimeError, ValueError):
            continue

    matplotlib.rcParams["font.family"] = "sans-serif"
    matplotlib.rcParams["font.sans-serif"] = [
        "DejaVu Sans",
        *list(matplotlib.rcParams.get("font.sans-serif", [])),
    ]
