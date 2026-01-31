"""
Content Type Validation Middleware

This module provides middleware for validating Content-Type headers
to ensure API endpoints receive properly formatted data.
"""

from typing import Callable, Dict, List, Optional, Set
from fastapi import Request, Response, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.config import settings
from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("content_validation", "logs/security.log")


class ContentTypeValidationMiddleware(BaseHTTPMiddleware):
    """
    Middleware that validates the Content-Type header of incoming requests.
    
    This helps prevent content-type related attacks and ensures that the API
    receives data in the format it expects.
    """
    
    def __init__(
        self,
        app: ASGIApp,
        allowed_content_types: Optional[List[str]] = None,
        skip_paths: Optional[List[str]] = None,
        skip_methods: Optional[List[str]] = None
    ):
        super().__init__(app)
        self.allowed_content_types = set(allowed_content_types or [
            "application/json",
            "application/x-www-form-urlencoded",
            "multipart/form-data"
        ])
        self.skip_paths = set(skip_paths or [
            "/api/docs",
            "/api/redoc",
            "/api/openapi.json",
            "/health",
            "/static"
        ])
        self.skip_methods = set(skip_methods or ["GET", "HEAD", "OPTIONS"])
        
        logger.info(f"Content Type Validation middleware initialized")
        logger.info(f"Allowed content types: {self.allowed_content_types}")
        logger.info(f"Skip paths: {self.skip_paths}")
        logger.info(f"Skip methods: {self.skip_methods}")
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process the request and validate Content-Type if required.
        
        Args:
            request: The incoming request
            call_next: The next middleware in the chain
            
        Returns:
            The response from downstream middleware
        """
        # Skip validation for certain paths and methods
        if (
            any(request.url.path.startswith(path) for path in self.skip_paths) or
            request.method in self.skip_methods
        ):
            return await call_next(request)
        
        # Check if the request has a body
        if request.method not in ["POST", "PUT", "PATCH"]:
            return await call_next(request)
        
        # Validate Content-Type header
        content_type_header = request.headers.get("Content-Type", "")
        
        # Extract the base content type (removing parameters)
        base_content_type = content_type_header.split(";")[0].strip().lower()
        
        if not base_content_type:
            # No Content-Type header, let's assume it's an empty body request
            return await call_next(request)
        
        if base_content_type not in self.allowed_content_types:
            from starlette.responses import JSONResponse
            
            request_id = getattr(request.state, "request_id", "unknown")
            logger.warning(
                f"Invalid Content-Type | RequestID: {request_id} | "
                f"Path: {request.url.path} | "
                f"Method: {request.method} | "
                f"Content-Type: {content_type_header}"
            )
            
            # Return JSONResponse instead of raising HTTPException
            # because HTTPException raised in middleware isn't handled by FastAPI's exception handlers
            return JSONResponse(
                status_code=415,
                content={
                    "detail": f"Unsupported media type: {content_type_header}. Supported types: {', '.join(self.allowed_content_types)}"
                }
            )
        
        return await call_next(request) 