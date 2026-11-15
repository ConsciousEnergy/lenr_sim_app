"""
Pytest configuration and fixtures.
Sets LENR_LOG_FILE_DIR=__temp__ before any app imports so log files
go to the system temp directory (avoids PermissionError in sandboxed tests).
"""

import atexit
import os
import tempfile
import uuid
from pathlib import Path

# Set before any app imports -- must be first
os.environ.setdefault("LENR_LOG_FILE_DIR", "__temp__")
os.environ.setdefault("LENR_ENVIRONMENT", "test")

# Self-hosted CI reuses /tmp across runs. A fixed lenr_sim_pytest.db lets
# Base.metadata.create_all no-op on an old experiments table, so ORM columns
# from Alembic 003 (literature_id, MoE, bayesian_summary, …) are missing and
# analytics/persist tests explode. Always use a fresh per-session file.
_LEGACY_TEST_SQLITE = Path(tempfile.gettempdir()) / "lenr_sim_pytest.db"
if _LEGACY_TEST_SQLITE.exists():
    try:
        _LEGACY_TEST_SQLITE.unlink()
    except OSError:
        pass

_prior = os.environ.get("LENR_SQLITE_PATH") or os.environ.get("SQLITE_PATH")
if _prior:
    try:
        Path(_prior).unlink(missing_ok=True)
    except OSError:
        pass

_TEST_SQLITE = Path(tempfile.gettempdir()) / f"lenr_sim_pytest_{uuid.uuid4().hex}.db"
os.environ["LENR_SQLITE_PATH"] = str(_TEST_SQLITE)
# Prefer the pytest path if both SQLITE_PATH and LENR_SQLITE_PATH are set.
os.environ.pop("SQLITE_PATH", None)


def _cleanup_test_sqlite() -> None:
    try:
        _TEST_SQLITE.unlink(missing_ok=True)
    except OSError:
        pass


atexit.register(_cleanup_test_sqlite)
