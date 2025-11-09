"""
Diagnostics API Routes

This module provides endpoints for viewing logs and diagnostic information.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Dict, Optional
import os
import glob
import json
from datetime import datetime

# Import logging
from app.utils.logging import setup_logger

# Import memory utilities
from app.utils.memory_monitor import get_memory_summary

# Set up logger
diagnostics_logger = setup_logger("diagnostics", "logs/diagnostics.log")

router = APIRouter()

class LogEntry(BaseModel):
    """Model for a log entry"""
    timestamp: str
    level: str
    message: str
    source: Optional[str] = None
    data: Optional[Dict] = None

class LogSummary(BaseModel):
    """Model for log summary"""
    name: str
    path: str
    size: int
    last_modified: str
    entries_count: int

@router.get("/logs")
async def list_logs():
    """
    Get a list of available log files
    
    Returns:
        Dict with list of log files and their metadata
    """
    try:
        # Get the logs directory
        logs_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "..", "logs")
        
        if not os.path.exists(logs_dir):
            diagnostics_logger.warning(f"Logs directory not found: {logs_dir}")
            return {"logs": []}
        
        # Get all log files
        log_files = glob.glob(os.path.join(logs_dir, "*.log"))
        
        logs = []
        for log_file in log_files:
            filename = os.path.basename(log_file)
            stats = os.stat(log_file)
            
            # Count number of entries
            try:
                with open(log_file, 'r') as f:
                    line_count = sum(1 for _ in f)
            except Exception as e:
                line_count = -1
                diagnostics_logger.error(f"Error counting lines in {log_file}: {str(e)}")
            
            logs.append({
                "name": filename,
                "path": log_file,
                "size": stats.st_size,
                "last_modified": datetime.fromtimestamp(stats.st_mtime).isoformat(),
                "entries_count": line_count
            })
        
        diagnostics_logger.info(f"Retrieved {len(logs)} log files")
        return {"logs": logs}
    
    except Exception as e:
        diagnostics_logger.error(f"Error listing log files: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error listing log files: {str(e)}")

@router.get("/logs/{log_name}")
async def get_log_contents(
    log_name: str,
    limit: int = Query(100, ge=1, le=1000),
    skip: int = Query(0, ge=0),
    level: Optional[str] = None
):
    """
    Get contents of a specific log file
    
    Args:
        log_name: Name of the log file
        limit: Maximum number of entries to return
        skip: Number of entries to skip
        level: Filter by log level
        
    Returns:
        Dict with log entries
    """
    try:
        # Validate log name to prevent directory traversal
        if ".." in log_name or "/" in log_name or "\\" in log_name:
            raise HTTPException(status_code=400, detail="Invalid log name")
        
        # Get the logs directory
        logs_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "..", "logs")
        log_path = os.path.join(logs_dir, log_name)
        
        if not os.path.exists(log_path):
            raise HTTPException(status_code=404, detail=f"Log file not found: {log_name}")
        
        entries = []
        
        # Read the log file
        with open(log_path, 'r') as f:
            for i, line in enumerate(f):
                if i < skip:
                    continue
                
                if len(entries) >= limit:
                    break
                
                try:
                    # Parse the log entry
                    # Format: 2023-04-01 12:34:56,789 | INFO | Message
                    parts = line.strip().split(" | ", 2)
                    if len(parts) >= 3:
                        timestamp, levelname, message = parts
                        
                        # Skip if level filter is set and doesn't match
                        if level and levelname.strip().lower() != level.lower():
                            continue
                        
                        # Parse data JSON if present
                        data = None
                        source = None
                        
                        if "[FRONTEND]" in message:
                            source = "frontend"
                            # Extract application name if present
                            if "[" in message and "]" in message:
                                parts = message.split("]", 2)
                                if len(parts) >= 3:
                                    # Extract the message after the source markers
                                    message = parts[2].strip()
                        
                        entries.append({
                            "timestamp": timestamp,
                            "level": levelname.strip(),
                            "message": message,
                            "source": source,
                            "data": data
                        })
                except Exception as e:
                    diagnostics_logger.warning(f"Error parsing log line: {str(e)}")
                    # Include raw line for debugging
                    entries.append({
                        "timestamp": datetime.now().isoformat(),
                        "level": "ERROR",
                        "message": f"Error parsing log line: {line}",
                        "source": "parser",
                        "data": None
                    })
        
        diagnostics_logger.info(f"Retrieved {len(entries)} log entries from {log_name}")
        return {
            "name": log_name,
            "count": len(entries),
            "entries": entries,
            "has_more": len(entries) >= limit
        }
    
    except HTTPException:
        raise
    except Exception as e:
        diagnostics_logger.error(f"Error reading log file {log_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error reading log file: {str(e)}")

@router.get("/health/detailed")
async def detailed_health_check():
    """
    Detailed health check endpoint
    
    Returns:
        Dict with detailed health information about the application
    """
    try:
        # Get system info
        import psutil
        import platform
        import sys
        
        cpu_count = psutil.cpu_count()
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Get Python info
        python_version = sys.version
        python_platform = platform.platform()
        
        # Get module versions
        import fastapi
        import numpy
        import scipy
        
        modules = {
            "fastapi": fastapi.__version__,
            "numpy": numpy.__version__,
            "scipy": scipy.__version__
        }
        
        # Get logs info
        logs_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "..", "logs")
        log_files = glob.glob(os.path.join(logs_dir, "*.log"))
        logs_size = sum(os.path.getsize(f) for f in log_files)
        
        # Get detailed memory info
        memory_summary = get_memory_summary()
        
        diagnostics_logger.info("Detailed health check performed")
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "system": {
                "cpu_count": cpu_count,
                "memory_total": memory.total,
                "memory_available": memory.available,
                "memory_percent": memory.percent,
                "disk_total": disk.total,
                "disk_free": disk.free,
                "disk_percent": disk.percent,
                "platform": python_platform
            },
            "python": {
                "version": python_version
            },
            "modules": modules,
            "logs": {
                "count": len(log_files),
                "total_size": logs_size
            },
            "memory_details": memory_summary
        }
    except Exception as e:
        diagnostics_logger.error(f"Error in detailed health check: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error in health check: {str(e)}")

@router.get("/memory")
async def memory_status():
    """
    Get current memory status
    
    Returns:
        Dict with memory usage information
    """
    try:
        memory_summary = get_memory_summary()
        diagnostics_logger.info("Memory status check performed")
        
        return {
            "timestamp": datetime.now().isoformat(),
            "memory": memory_summary
        }
    except Exception as e:
        diagnostics_logger.error(f"Error in memory status check: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error in memory status check: {str(e)}") 