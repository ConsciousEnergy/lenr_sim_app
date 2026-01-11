"""
Error handling module for LENR Sim App

This module defines exception handlers and error response models for the application.
"""

import sys
import traceback
from typing import Any, Dict, List, Optional, Union

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("errors", "logs/errors.log")


class ErrorDetail(BaseModel):
    """Detailed error information."""
    loc: Optional[List[str]] = None
    msg: str
    type: str


class ErrorResponse(BaseModel):
    """Standardized error response model."""
    status_code: int
    message: str
    error_type: str
    details: Optional[List[ErrorDetail]] = None
    request_id: Optional[str] = None


class AppException(Exception):
    """
    Base exception class for application-specific exceptions.
    
    Includes status code and error details.
    """
    def __init__(
        self,
        status_code: int,
        message: str,
        error_type: str = "application_error",
        details: Optional[List[Dict[str, Any]]] = None
    ):
        self.status_code = status_code
        self.message = message
        self.error_type = error_type
        self.details = details
        super().__init__(self.message)


class PhysicsValidationError(AppException):
    """Exception for physics validation errors."""
    def __init__(self, message: str, details: Optional[List[Dict[str, Any]]] = None):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            message=message,
            error_type="physics_validation_error",
            details=details
        )


class ResourceNotFoundError(AppException):
    """Exception for resource not found errors."""
    def __init__(self, resource_type: str, resource_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            message=f"{resource_type} with ID {resource_id} not found",
            error_type="resource_not_found"
        )


class CalculationError(AppException):
    """Exception for calculation errors."""
    def __init__(self, message: str, details: Optional[List[Dict[str, Any]]] = None):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            message=message,
            error_type="calculation_error",
            details=details
        )


class SimulationError(AppException):
    """Exception for simulation errors."""
    def __init__(self, message: str, details: Optional[List[Dict[str, Any]]] = None):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=message,
            error_type="simulation_error",
            details=details
        )


# Exception handlers
async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle application-specific exceptions."""
    error_details = None
    if exc.details:
        error_details = [
            ErrorDetail(loc=detail.get("loc"), msg=detail.get("msg"), type=detail.get("type"))
            for detail in exc.details
        ]
    
    # Log the error
    logger.error(
        f"AppException: {exc.error_type} - {exc.message}",
        extra={
            "status_code": exc.status_code,
            "error_type": exc.error_type,
            "request_path": request.url.path,
            "request_method": request.method,
        }
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            status_code=exc.status_code,
            message=exc.message,
            error_type=exc.error_type,
            details=error_details,
            request_id=request.state.request_id if hasattr(request.state, "request_id") else None
        ).model_dump()
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle request validation errors."""
    error_details = []
    for error in exc.errors():
        error_details.append(
            ErrorDetail(
                loc=[str(loc) for loc in error["loc"]],
                msg=error["msg"],
                type=error["type"]
            )
        )
    
    # Log the error
    logger.warning(
        f"Validation error: {exc}",
        extra={
            "request_path": request.url.path,
            "request_method": request.method,
        }
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            message="Request validation error",
            error_type="validation_error",
            details=error_details,
            request_id=request.state.request_id if hasattr(request.state, "request_id") else None
        ).model_dump()
    )


async def http_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle generic exceptions."""
    # Get the exception traceback
    exc_type, exc_value, exc_traceback = sys.exc_info()
    traceback_details = traceback.format_exception(exc_type, exc_value, exc_traceback)
    
    # Log the error with traceback
    logger.error(
        f"Unhandled exception: {exc.__class__.__name__} - {str(exc)}",
        extra={
            "traceback": "".join(traceback_details),
            "request_path": request.url.path,
            "request_method": request.method,
        }
    )
    
    # Don't expose detailed exception info in production
    from app.core.config import settings
    if settings.ENVIRONMENT == "production":
        error_message = "An unexpected error occurred"
    else:
        error_message = str(exc)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=error_message,
            error_type="server_error",
            request_id=request.state.request_id if hasattr(request.state, "request_id") else None
        ).model_dump()
    )


def setup_exception_handlers(app: FastAPI) -> None:
    """Set up exception handlers for the FastAPI application."""
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, http_exception_handler) 