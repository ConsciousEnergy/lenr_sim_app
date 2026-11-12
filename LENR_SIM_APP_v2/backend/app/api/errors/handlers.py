"""
API Error Handlers

This module provides exception handlers for FastAPI that ensure API errors
are formatted consistently and securely.
"""

import traceback
import json
from typing import Any, Dict

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from pydantic import ValidationError

from app.core.config import settings, EnvironmentType
from app.utils.logging import setup_logger, request_log_extra

# Set up logger (level/format follow LENR_LOG_* — staging: INFO + JSON)
logger = setup_logger(
    "error_handlers",
    "logs/errors.log",
    level=settings.LOG_LEVEL,
    json_format=settings.LOG_JSON_FORMAT,
)


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unknown")


def _error_content(
    *,
    error: str,
    detail: Any,
    request_id: str,
) -> Dict[str, Any]:
    """Always include request_id so clients can correlate with staging logs."""
    return {
        "error": error,
        "detail": detail,
        "request_id": request_id,
    }


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
    error_id = _request_id(request)

    # Extract relevant error information (locs/types/msgs only — no bodies)
    errors = []
    for error in exc.errors():
        error_loc = " -> ".join([str(loc) for loc in error["loc"]])
        error_detail = {
            "location": error_loc,
            "type": error["type"],
            "message": error["msg"]
        }
        errors.append(error_detail)

    logger.error(
        f"Validation error | Path: {request.url.path} | Errors: {json.dumps(errors)}",
        extra=request_log_extra(error_id, path=request.url.path),
    )

    response_detail = {
        "type": "validation_error",
        "errors": errors
    }

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_error_content(
            error="Validation Error",
            detail=response_detail,
            request_id=error_id,
        ),
        headers={
            settings.REQUEST_ID_HEADER: error_id,
            settings.CORRELATION_ID_HEADER: error_id,
        },
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
    error_id = _request_id(request)

    # Log status/path/detail only — never Authorization, Cookie, or secret env.
    log_kwargs = {"extra": request_log_extra(error_id, path=request.url.path)}
    if exc.status_code >= 500:
        logger.error(
            f"HTTP {exc.status_code} error | Path: {request.url.path} | Details: {exc.detail}",
            **log_kwargs,
        )
    else:
        logger.warning(
            f"HTTP {exc.status_code} error | Path: {request.url.path} | Details: {exc.detail}",
            **log_kwargs,
        )

    headers = dict(exc.headers or {})
    headers[settings.REQUEST_ID_HEADER] = error_id
    headers[settings.CORRELATION_ID_HEADER] = error_id

    # Production/staging: never echo raw 5xx exception strings from
    # HTTPException(detail=str(e)) — log above already captured them.
    detail = exc.detail
    if (
        exc.status_code >= 500
        and settings.ENVIRONMENT != EnvironmentType.DEVELOPMENT
    ):
        detail = "An internal server error occurred. Please try again later."

    return JSONResponse(
        status_code=exc.status_code,
        headers=headers,
        content=_error_content(
            error=f"HTTP {exc.status_code}",
            detail=detail,
            request_id=error_id,
        ),
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
    error_id = _request_id(request)

    # Get full exception details for logging
    trace = traceback.format_exc()

    logger.error(
        f"Internal server error | Path: {request.url.path} | "
        f"Exception: {exc.__class__.__name__}: {exc}",
        extra=request_log_extra(error_id, path=request.url.path),
    )
    # Stack traces only at DEBUG; still omit request bodies / secrets.
    logger.debug(
        f"Stack trace for error {error_id}:\n{trace}",
        extra=request_log_extra(error_id, path=request.url.path),
    )

    # Create response with appropriate level of detail
    # In development mode, include more details
    if settings.ENVIRONMENT == EnvironmentType.DEVELOPMENT:
        detail = {
            "message": str(exc),
            "exception_type": exc.__class__.__name__,
            "trace": trace.split("\n")
        }
    else:
        # In production/staging/test, don't expose internal details
        detail = "An internal server error occurred. Please try again later."

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_error_content(
            error="Internal Server Error",
            detail=detail,
            request_id=error_id,
        ),
        headers={
            settings.REQUEST_ID_HEADER: error_id,
            settings.CORRELATION_ID_HEADER: error_id,
        },
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
