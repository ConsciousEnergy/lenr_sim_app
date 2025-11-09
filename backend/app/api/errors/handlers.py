"""
API Error Handlers

This module provides exception handlers for FastAPI that ensure API errors
are formatted consistently and securely.
"""

import traceback
import json
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from pydantic import ValidationError

from app.core.config import settings, EnvironmentType
from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("error_handlers", "logs/errors.log")


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handle validation errors from FastAPI and Pydantic.
    Returns a clean JSON response with error details.
    
    Args:
        request: The request that caused the exception
        exc: The validation exception
        
    Returns:
        JSONResponse with error details
    """
    # Log the error with request details
    error_id = request.state.request_id if hasattr(request.state, "request_id") else "unknown"
    
    # Extract relevant error information
    errors = []
    for error in exc.errors():
        error_loc = " -> ".join([str(loc) for loc in error["loc"]])
        error_detail = {
            "location": error_loc,
            "type": error["type"],
            "message": error["msg"]
        }
        errors.append(error_detail)
    
    # Log detailed error for debugging
    logger.error(
        f"Validation error | RequestID: {error_id} | "
        f"Path: {request.url.path} | "
        f"Errors: {json.dumps(errors)}"
    )
    
    # Create response with appropriate level of detail
    response_detail = {
        "type": "validation_error",
        "errors": errors
    }
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "detail": response_detail
        }
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """
    Handle HTTP exceptions.
    Returns a clean JSON response with error details.
    
    Args:
        request: The request that caused the exception
        exc: The HTTP exception
        
    Returns:
        JSONResponse with error details
    """
    error_id = request.state.request_id if hasattr(request.state, "request_id") else "unknown"
    
    # Log the error (level depends on status code)
    if exc.status_code >= 500:
        logger.error(
            f"HTTP {exc.status_code} error | RequestID: {error_id} | "
            f"Path: {request.url.path} | "
            f"Details: {exc.detail}"
        )
    else:
        logger.warning(
            f"HTTP {exc.status_code} error | RequestID: {error_id} | "
            f"Path: {request.url.path} | "
            f"Details: {exc.detail}"
        )
    
    # Create response
    content = {
        "error": f"HTTP {exc.status_code}",
        "detail": exc.detail
    }
    
    # Include request ID for tracking
    if hasattr(request.state, "request_id"):
        content["request_id"] = request.state.request_id
    
    return JSONResponse(
        status_code=exc.status_code,
        headers=exc.headers or {},
        content=content
    )


async def internal_exception_handler(request: Request, exc: Exception):
    """
    Handle all other exceptions.
    Returns a clean JSON response without exposing internal details.
    
    Args:
        request: The request that caused the exception
        exc: The exception
        
    Returns:
        JSONResponse with error details
    """
    error_id = request.state.request_id if hasattr(request.state, "request_id") else "unknown"
    
    # Get full exception details for logging
    trace = traceback.format_exc()
    
    # Log the full error
    logger.error(
        f"Internal server error | RequestID: {error_id} | "
        f"Path: {request.url.path} | "
        f"Exception: {str(exc)}"
    )
    
    # Log the stack trace separately
    logger.debug(f"Stack trace for error {error_id}:\n{trace}")
    
    # Create response with appropriate level of detail
    # In development mode, include more details
    if settings.ENVIRONMENT == EnvironmentType.DEVELOPMENT:
        detail = {
            "message": str(exc),
            "exception_type": exc.__class__.__name__,
            "trace": trace.split("\n")
        }
    else:
        # In production, don't expose internal details
        detail = "An internal server error occurred. Please try again later."
    
    content = {
        "error": "Internal Server Error",
        "detail": detail
    }
    
    # Include request ID for tracking
    if hasattr(request.state, "request_id"):
        content["request_id"] = request.state.request_id
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=content
    )


def register_exception_handlers(app: FastAPI):
    """
    Register all exception handlers with a FastAPI application.
    
    Args:
        app: The FastAPI application instance
    """
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(ValidationError, validation_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(Exception, internal_exception_handler)
    
    logger.info("Exception handlers registered with FastAPI application") 