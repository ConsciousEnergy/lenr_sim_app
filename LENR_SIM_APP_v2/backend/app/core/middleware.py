"""
Middleware module for the FastAPI application.

This module provides middleware components for:
- Request ID tracking
- Performance monitoring
- Logging
- CORS configuration
- Security (rate limiting, secure headers, content validation)
"""

import time
import uuid
import logging
from typing import Callable

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings, EnvironmentType
from app.api.middleware.rate_limiting import RateLimitingMiddleware
from app.api.middleware.secure_headers import SecureHeadersMiddleware
from app.api.middleware.content_validation import ContentTypeValidationMiddleware
from app.api.middleware.request_size_limit import RequestSizeLimitMiddleware
from app.api.errors.handlers import register_exception_handlers

# Configure logger
logger = logging.getLogger(__name__)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Middleware that adds a unique request ID to each request.
    
    The request ID is added to the request state and returned in the response headers.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        response = await call_next(request)
        response.headers[settings.REQUEST_ID_HEADER] = request_id
        
        return response


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that logs request and response information.
    
    Logs method, path, status code, and processing time for each request.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        # Process the request
        response = await call_next(request)
        
        # Calculate processing time
        process_time = (time.time() - start_time) * 1000
        formatted_process_time = f"{process_time:.2f}ms"
        
        # Get request ID if available
        request_id = getattr(request.state, "request_id", "unknown")
        
        # Log request details
        logger.info(
            f"RequestID: {request_id} | "
            f"{request.method} {request.url.path} | "
            f"Status: {response.status_code} | "
            f"Time: {formatted_process_time}"
        )
        
        return response


class PerformanceMiddleware(BaseHTTPMiddleware):
    """
    Middleware that tracks request performance.
    
    Adds processing time to response headers and logs slow requests.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        response = await call_next(request)
        
        # Calculate processing time
        process_time = (time.time() - start_time) * 1000
        formatted_process_time = f"{process_time:.2f}ms"
        
        # Add processing time to response headers
        response.headers[settings.PROCESS_TIME_HEADER] = formatted_process_time
        
        # Log slow requests
        if process_time > settings.SLOW_REQUEST_THRESHOLD:
            request_id = getattr(request.state, "request_id", "unknown")
            logger.warning(
                f"Slow request detected | "
                f"RequestID: {request_id} | "
                f"{request.method} {request.url.path} | "
                f"Time: {formatted_process_time}"
            )
        
        return response


def setup_middlewares(app: FastAPI) -> None:
    """
    Configure middleware components for the FastAPI application.
    
    Args:
        app: The FastAPI application instance.
    """
    # Register custom exception handlers
    register_exception_handlers(app)
    logger.info("Custom exception handlers registered")
    
    # Add request ID middleware (should be first for proper tracking)
    if settings.ENABLE_REQUEST_ID_MIDDLEWARE:
        app.add_middleware(RequestIDMiddleware)
        logger.info(f"Request ID middleware enabled with header: {settings.REQUEST_ID_HEADER}")
    
    # Add logging middleware
    if settings.ENABLE_LOGGING_MIDDLEWARE:
        app.add_middleware(LoggingMiddleware)
        logger.info("Logging middleware enabled")
    
    # Add performance middleware
    if settings.ENABLE_PERFORMANCE_MIDDLEWARE:
        app.add_middleware(PerformanceMiddleware)
        logger.info(f"Performance middleware enabled with slow request threshold: {settings.SLOW_REQUEST_THRESHOLD}ms")
    
    # Add secure headers middleware
    if settings.ENABLE_SECURE_HEADERS:
        app.add_middleware(
            SecureHeadersMiddleware,
            enable_csp=settings.ENABLE_CSP,
            enable_hsts=settings.ENABLE_HSTS,
            csp_report_only=settings.CSP_REPORT_ONLY
        )
        logger.info("Secure headers middleware enabled")
    
    # Add rate limiting middleware
    if settings.ENABLE_RATE_LIMITING:
        app.add_middleware(
            RateLimitingMiddleware,
            rate_limit_per_minute=settings.RATE_LIMIT_PER_MINUTE,
            whitelist_ips=settings.RATE_LIMIT_WHITELIST_IPS
        )
        logger.info(f"Rate limiting middleware enabled with limit: {settings.RATE_LIMIT_PER_MINUTE} requests/minute")
    
    # Add request size limit middleware
    app.add_middleware(
        RequestSizeLimitMiddleware,
        max_body_size=settings.REQUEST_MAX_BODY_SIZE,
    )
    logger.info(f"Request size limit middleware enabled: {settings.REQUEST_MAX_BODY_SIZE} bytes max")

    # Add content-type validation middleware
    if settings.ENFORCE_CONTENT_TYPE:
        app.add_middleware(ContentTypeValidationMiddleware)
        logger.info("Content-Type validation middleware enabled")
    
    # Add CORS middleware (should generally be last in the chain)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
        allow_methods=settings.CORS_ALLOW_METHODS,
        allow_headers=settings.CORS_ALLOW_HEADERS,
    )
    
    # Log CORS configuration
    logger.info(f"CORS middleware enabled with origins: {settings.CORS_ORIGINS}")

    logger.info(f"All middleware components have been set up for environment: {settings.ENVIRONMENT}") 