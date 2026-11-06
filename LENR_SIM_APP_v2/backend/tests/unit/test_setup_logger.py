"""Unit tests for setup_logger level resolution (case-insensitive strings)."""

import logging

import pytest

from app.utils.logging import setup_logger


@pytest.mark.parametrize(
    ("level", "expected"),
    [
        ("info", logging.INFO),
        ("INFO", logging.INFO),
        ("debug", logging.DEBUG),
        ("DEBUG", logging.DEBUG),
        ("warning", logging.WARNING),
        ("not-a-level", logging.INFO),
    ],
)
def test_setup_logger_accepts_case_insensitive_levels(
    level: str, expected: int, tmp_path
) -> None:
    log_file = str(tmp_path / "test.log")
    logger = setup_logger(f"test_logger_{level}", log_file, level=level)
    assert logger.level == expected
