"""
Pytest configuration and fixtures.
Sets LENR_LOG_FILE_DIR=__temp__ before any app imports so log files
go to the system temp directory (avoids PermissionError in sandboxed tests).
"""

import os

# Set before any app imports -- must be first
os.environ.setdefault("LENR_LOG_FILE_DIR", "__temp__")
os.environ.setdefault("LENR_ENVIRONMENT", "test")
