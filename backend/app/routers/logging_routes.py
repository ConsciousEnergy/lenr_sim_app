"""
Logging Routes for LENR_Sim_App

This module provides FastAPI routes for retrieving and managing logs.
"""

import os
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, Path
from pydantic import BaseModel, Field

from app.core.config import settings
from app.utils.logging import setup_logger

# Set up logger
log_logger = setup_logger("log_routes", "logs/log_routes.log")

# Create router instance
router = APIRouter()

# --- Models ---

class LogEntry(BaseModel):
    """Model for a single log entry"""
    timestamp: str = Field(..., description="Timestamp of the log entry")
    level: str = Field(..., description="Log level (INFO, WARNING, ERROR, etc.)")
    message: str = Field(..., description="Log message content")
    source: Optional[str] = Field(None, description="Source of the log (logger name)")
    
    class Config:
        schema_extra = {
            "example": {
                "timestamp": "2023-04-15T14:32:15.123",
                "level": "INFO",
                "message": "Application started successfully",
                "source": "app"
            }
        }

class LogFilter(BaseModel):
    """Model for filtering logs"""
    level: Optional[str] = Field(None, description="Filter by log level")
    start_time: Optional[datetime] = Field(None, description="Start time for log retrieval")
    end_time: Optional[datetime] = Field(None, description="End time for log retrieval")
    source: Optional[str] = Field(None, description="Filter by log source")
    keyword: Optional[str] = Field(None, description="Search for keyword in log messages")

# --- Helper Functions ---

def _parse_log_line(line: str) -> Optional[LogEntry]:
    """
    Parse a log line into a LogEntry object
    
    Args:
        line: Raw log line from file
        
    Returns:
        LogEntry object if parsing succeeds, None otherwise
    """
    # Simple regex pattern for parsing log lines
    # Assumes format like: 2023-04-08 12:34:56,789 - INFO - app - Log message
    pattern = r"(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) - (\w+) - (\w+) - (.+)"
    match = re.match(pattern, line)
    
    if match:
        timestamp_str, level, source, message = match.groups()
        # Convert timestamp format
        try:
            dt = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S,%f")
            iso_timestamp = dt.isoformat(timespec='milliseconds')
            return LogEntry(
                timestamp=iso_timestamp,
                level=level,
                message=message.strip(),
                source=source
            )
        except Exception:
            return None
    return None

def _get_log_file_path(log_name: str) -> str:
    """
    Get the absolute path to a log file
    
    Args:
        log_name: Name of the log file (without extension)
        
    Returns:
        Absolute path to the log file
    """
    # Ensure the name has .log extension
    if not log_name.endswith(".log"):
        log_name = f"{log_name}.log"
    
    # Get logs directory path
    logs_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "logs")
    
    # Return full path
    return os.path.join(logs_dir, log_name)

def _read_log_file(file_path: str, max_lines: int = 1000, 
                  filter_params: Optional[LogFilter] = None) -> List[LogEntry]:
    """
    Read and parse a log file
    
    Args:
        file_path: Path to the log file
        max_lines: Maximum number of lines to read (most recent)
        filter_params: Optional filtering parameters
        
    Returns:
        List of LogEntry objects
    """
    if not os.path.exists(file_path):
        return []
    
    entries = []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            # Read all lines but keep only the most recent ones
            lines = f.readlines()
            lines = lines[-max_lines:] if len(lines) > max_lines else lines
            
            for line in lines:
                entry = _parse_log_line(line)
                if entry and _passes_filter(entry, filter_params):
                    entries.append(entry)
        
        return entries
    except Exception as e:
        log_logger.error(f"Error reading log file {file_path}: {str(e)}")
        return []

def _passes_filter(entry: LogEntry, filter_params: Optional[LogFilter]) -> bool:
    """
    Check if a log entry passes the filter criteria
    
    Args:
        entry: Log entry to check
        filter_params: Filter parameters
        
    Returns:
        True if the entry passes all filters, False otherwise
    """
    if not filter_params:
        return True
    
    # Check level filter
    if filter_params.level and entry.level != filter_params.level.upper():
        return False
    
    # Check time range filter
    if filter_params.start_time:
        entry_time = datetime.fromisoformat(entry.timestamp)
        if entry_time < filter_params.start_time:
            return False
    
    if filter_params.end_time:
        entry_time = datetime.fromisoformat(entry.timestamp)
        if entry_time > filter_params.end_time:
            return False
    
    # Check source filter
    if filter_params.source and entry.source != filter_params.source:
        return False
    
    # Check keyword filter
    if filter_params.keyword and filter_params.keyword.lower() not in entry.message.lower():
        return False
    
    return True

# --- Endpoints ---

@router.get("/available", response_model=List[str])
async def get_available_logs():
    """
    Get a list of available log files
    """
    try:
        logs_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "logs")
        
        if not os.path.exists(logs_dir):
            log_logger.warning(f"Logs directory not found: {logs_dir}")
            return []
        
        log_files = []
        for file in os.listdir(logs_dir):
            if file.endswith(".log"):
                log_files.append(file.replace(".log", ""))
        
        return log_files
    except Exception as e:
        log_logger.error(f"Error listing log files: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error listing log files: {str(e)}")

@router.get("/{log_name}", response_model=List[LogEntry])
async def get_logs(
    log_name: str = Path(..., description="Name of the log file to retrieve"),
    max_lines: int = Query(100, description="Maximum number of log lines to retrieve"),
    level: Optional[str] = Query(None, description="Filter by log level"),
    hours: Optional[int] = Query(None, description="Retrieve logs from the last N hours"),
    keyword: Optional[str] = Query(None, description="Search for keyword in logs")
):
    """
    Get logs from a specific log file with optional filtering
    """
    try:
        # Build filter parameters
        filter_params = LogFilter(
            level=level.upper() if level else None,
            keyword=keyword
        )
        
        # Set time range if hours parameter is provided
        if hours is not None and hours > 0:
            filter_params.end_time = datetime.now()
            filter_params.start_time = filter_params.end_time - timedelta(hours=hours)
        
        # Get log file path
        log_file_path = _get_log_file_path(log_name)
        
        # Check if file exists
        if not os.path.exists(log_file_path):
            raise HTTPException(status_code=404, detail=f"Log file '{log_name}' not found")
        
        # Read and parse logs
        logs = _read_log_file(log_file_path, max_lines, filter_params)
        
        log_logger.info(f"Retrieved {len(logs)} log entries from {log_name}")
        return logs
    
    except HTTPException:
        raise
    except Exception as e:
        log_logger.error(f"Error retrieving logs from {log_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving logs: {str(e)}")

@router.post("/clear/{log_name}")
async def clear_log(log_name: str = Path(..., description="Name of the log file to clear")):
    """
    Clear a specific log file
    """
    try:
        log_file_path = _get_log_file_path(log_name)
        
        # Check if file exists
        if not os.path.exists(log_file_path):
            raise HTTPException(status_code=404, detail=f"Log file '{log_name}' not found")
        
        # Clear the file
        with open(log_file_path, "w") as f:
            pass
        
        log_logger.info(f"Cleared log file: {log_name}")
        return {"status": "success", "message": f"Log file '{log_name}' cleared successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        log_logger.error(f"Error clearing log file {log_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error clearing log file: {str(e)}") 