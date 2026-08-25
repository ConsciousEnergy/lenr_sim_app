"""
Pytest configuration and fixtures.
Sets LENR_LOG_FILE_DIR=__temp__ before any app imports so log files
go to the system temp directory (avoids PermissionError in sandboxed tests).
"""

import os
import tempfile
from pathlib import Path

# Set before any app imports -- must be first
os.environ.setdefault("LENR_LOG_FILE_DIR", "__temp__")
os.environ.setdefault("LENR_ENVIRONMENT", "test")

_TEST_SQLITE = Path(tempfile.gettempdir()) / "lenr_sim_pytest.db"
os.environ.setdefault("LENR_SQLITE_PATH", str(_TEST_SQLITE))
