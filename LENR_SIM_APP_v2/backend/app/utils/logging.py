"""
Logging utility for LENR_Sim_App
Provides consistent logging across the application
"""

import logging
from logging.handlers import RotatingFileHandler
import os
import sys
from typing import Literal, Optional

def setup_logger(
    name: str, 
    log_file: str, 
    level: Optional[Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] | int] = "INFO"
):
    """
    Set up a logger with file and console handlers
    
    Args:
        name: Logger name
        log_file: Path to log file
        level: Logging level
        
    Returns:
        Configured logger instance
    """
    # Convert string level to logging level
    if isinstance(level, str):
        numeric_level = getattr(logging, level)
    else:
        numeric_level = level if level is not None else logging.INFO
    
    # Create formatter
    formatter = logging.Formatter('%(asctime)s | %(levelname)s | %(message)s')
    
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
    # On Windows, console may not support UTF-8, so we use a safe handler
    if sys.platform == 'win32':
        # Create a custom handler that safely handles Unicode on Windows
        class SafeConsoleHandler(logging.StreamHandler):
            def emit(self, record):
                try:
                    # Try to encode the message, replacing problematic characters
                    msg = self.format(record)
                    # Replace Unicode characters that Windows console can't handle
                    msg = msg.replace('μ', 'u').replace('μm', 'um').replace('μs', 'us')
                    stream = self.stream
                    stream.write(msg + self.terminator)
                    self.flush()
                except UnicodeEncodeError:
                    # Fallback: replace all non-ASCII characters
                    msg = self.format(record)
                    msg = msg.encode('ascii', 'replace').decode('ascii')
                    stream = self.stream
                    stream.write(msg + self.terminator)
                    self.flush()
                except Exception:
                    self.handleError(record)
        
        console_handler = SafeConsoleHandler(sys.stdout)
    else:
        # On Unix-like systems, use standard handler
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