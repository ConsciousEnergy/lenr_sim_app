"""
Frontend Logging API

This module handles logging from the frontend application.
"""

from fastapi import APIRouter, Body, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any, Union
import json
from datetime import datetime

# Import logging
from app.utils.logging import setup_logger

# Set up frontend logger
frontend_logger = setup_logger("frontend", "logs/frontend.log")

router = APIRouter()

class LogError(BaseModel):
    """Model for error details in a log entry"""
    name: str
    message: str
    stack: Optional[str] = None
    cause: Optional[str] = None

class LogClient(BaseModel):
    """Model for client details in a log entry"""
    url: Optional[str] = None
    userAgent: Optional[str] = None
    windowWidth: Optional[int] = None
    windowHeight: Optional[int] = None
    language: Optional[str] = None

class LogEntry(BaseModel):
    """Model for a single log entry from the frontend"""
    level: str
    message: str
    timestamp: Optional[str] = None
    application: Optional[str] = None
    environment: Optional[str] = None
    data: Optional[Any] = None
    error: Optional[LogError] = None
    client: Optional[LogClient] = None

class LogBatch(BaseModel):
    """Model for a batch of log entries"""
    logs: List[LogEntry]

@router.post("")
async def receive_logs(logs: LogBatch = Body(...)):
    """
    Receive logs from the frontend application
    
    Args:
        logs: Batch of log entries
        
    Returns:
        Dict with status information
    """
    try:
        for log in logs.logs:
            # Format log data for backend logger
            log_data = {}
            
            # Include data from log if present
            if log.data:
                if isinstance(log.data, dict):
                    log_data.update(log.data)
                else:
                    log_data["data"] = log.data
            
            # Include client info if present
            if log.client:
                log_data["client"] = log.client.dict(exclude_none=True)
            
            # Get timestamp
            timestamp = log.timestamp or datetime.now().isoformat()
            
            # Create log message with contextual information
            log_message = f"[FRONTEND] [{log.application}] [{log.environment}] {log.message}"
            
            # Log with the appropriate level
            if log.level == "debug":
                frontend_logger.debug(log_message, extra={"data": json.dumps(log_data)})
            elif log.level == "info":
                frontend_logger.info(log_message, extra={"data": json.dumps(log_data)})
            elif log.level == "warn":
                frontend_logger.warning(log_message, extra={"data": json.dumps(log_data)})
            elif log.level == "error" or log.level == "fatal":
                # For errors, include the error details
                if log.error:
                    error_info = log.error.dict(exclude_none=True)
                    log_data["error"] = error_info
                    
                    # Add stacktrace if available
                    if log.error.stack:
                        log_data["stacktrace"] = log.error.stack
                
                frontend_logger.error(log_message, extra={"data": json.dumps(log_data)})
        
        return {"status": "success", "count": len(logs.logs)}
    
    except Exception as e:
        # Log this error to the backend error logger
        frontend_logger.error(f"Error processing frontend logs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process logs: {str(e)}") 