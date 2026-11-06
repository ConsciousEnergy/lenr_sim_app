"""
Logging utility for LENR_Sim_App
Provides consistent logging across the application.
Supports structured JSON format for production (log aggregation).
Log directory is configurable via LENR_LOG_FILE_DIR (use __temp__ in tests).
"""

import json
import logging
from logging.handlers import RotatingFileHandler
import os
import sys
import tempfile
from typing import Any, Dict, Literal, Optional


class JsonFormatter(logging.Formatter):
    """Format log records as JSON for production log aggregation."""

    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
        request_id = getattr(record, "request_id", None)
        if request_id:
            log_obj["request_id"] = request_id
        path = getattr(record, "path", None)
        if path:
            log_obj["path"] = path
        return json.dumps(log_obj, default=str)


def request_log_extra(request_id: str, *, path: Optional[str] = None) -> Dict[str, Any]:
    """
    Structured extras for API logs. Pass via logger.*(..., extra=...).

    Puts request_id on the LogRecord so JsonFormatter emits a top-level field
    (not only embedded in the message string). Do not put secrets here.
    """
    extra: Dict[str, Any] = {"request_id": request_id}
    if path is not None:
        extra["path"] = path
    return extra


def setup_logger(
    name: str,
    log_file: str,
    level: Optional[Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] | int] = "INFO",
    json_format: bool = False,
):
    """
    Set up a logger with file and console handlers
    
    Args:
        name: Logger name
        log_file: Path to log file
        level: Logging level
        json_format: Use JSON format (enable in production for log aggregation)
        
    Returns:
        Configured logger instance
    """
    # Convert string level to logging level.
    # Uppercase first: getattr(logging, "info") returns the logging.info
    # *function*, not the INFO int constant — that crashes setLevel.
    if isinstance(level, str):
        resolved = getattr(logging, level.upper(), None)
        numeric_level = (
            resolved
            if isinstance(resolved, int)
            else logging.INFO
        )
    else:
        numeric_level = level if level is not None else logging.INFO
    
    # Create formatter (JSON for production, text for development)
    formatter = (
        JsonFormatter()
        if json_format
        else logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")
    )

    # Resolve log path: use temp dir when LENR_LOG_FILE_DIR="__temp__" (tests)
    log_file_dir = os.getenv("LENR_LOG_FILE_DIR")
    if log_file_dir == "__temp__":
        log_file = os.path.join(tempfile.gettempdir(), os.path.basename(log_file))
    elif log_file_dir:
        log_file = os.path.join(log_file_dir, os.path.basename(log_file))

    # Ensure log directory exists
    os.makedirs(os.path.dirname(log_file), exist_ok=True)
    
    # File handler with rotation and UTF-8 encoding
    file_handler = RotatingFileHandler(
        log_file, 
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=5,
        encoding='utf-8'  # Ensure UTF-8 encoding for log files
    )
    file_handler.setFormatter(formatter)
    
    # Console handler with UTF-8 safe encoding for Windows
    if sys.platform == 'win32':
        class SafeConsoleHandler(logging.StreamHandler):
            def emit(self, record):
                try:
                    msg = self.format(record)
                    msg = msg.replace('\u03bc', 'u').replace('\u03bcm', 'um').replace('\u03bcs', 'us')
                    stream = self.stream
                    stream.write(msg + self.terminator)
                    self.flush()
                except UnicodeEncodeError:
                    msg = self.format(record)
                    msg = msg.encode('ascii', 'replace').decode('ascii')
                    stream = self.stream
                    stream.write(msg + self.terminator)
                    self.flush()
                except Exception:
                    self.handleError(record)
        
        console_handler = SafeConsoleHandler(sys.stdout)
    else:
        console_handler = logging.StreamHandler(sys.stdout)
    
    console_handler.setFormatter(formatter)
    
    # Configure logger
    logger = logging.getLogger(name)
    logger.setLevel(numeric_level)
    
    # Remove existing handlers if any
    if logger.hasHandlers():
        logger.handlers.clear()
        
    # Add handlers
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger

def get_logger(name: str) -> logging.Logger:
    """
    Get a configured logger by name
    
    Args:
        name: Logger name
        
    Returns:
        Logger instance
    """
    return logging.getLogger(name)
