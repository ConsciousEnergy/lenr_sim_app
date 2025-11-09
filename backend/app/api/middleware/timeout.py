"""
Timeout Middleware for FastAPI
"""

import time
from typing import Callable, Dict, Optional
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp

from app.utils.logging import setup_logger
from app.core.config import settings

# Set up logger
timeout_logger = setup_logger("timeout", "logs/timeout.log")

class TimeoutMiddleware(BaseHTTPMiddleware):
    """
    Middleware that enforces a timeout for all requests
    If the request takes longer than the timeout, it will be aborted
    """
    
    def __init__(
        self, 
        app: ASGIApp, 
        timeout: float = settings.DEFAULT_TIMEOUT,
        exclude_paths: Optional[Dict[str, float]] = None
    ):
        """
        Initialize the middleware
        
        Args:
            app: The ASGI app
            timeout: The default timeout in seconds (defaults to settings.DEFAULT_TIMEOUT)
            exclude_paths: Optional dict of paths to exclude from timeout or use different timeouts
                           Format: {"/path": None} to exclude, {"/path": 60.0} for custom timeout
        """
        super().__init__(app)
        self.timeout = timeout
        self.exclude_paths = exclude_paths or {}
        timeout_logger.info(f"Timeout middleware initialized with {timeout}s default timeout")
    
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        """
        Process the request and enforce timeout
        
        Args:
            request: The incoming request
            call_next: The next middleware or endpoint
            
        Returns:
            The response
        """
        # Check if path should be excluded or has custom timeout
        path = request.url.path
        for exclude_pattern, custom_timeout in self.exclude_paths.items():
            if path.startswith(exclude_pattern):
                if custom_timeout is None:
                    # Path is excluded from timeout
                    timeout_logger.debug(f"Request to {path} excluded from timeout")
                    return await call_next(request)
                else:
                    # Path has custom timeout
                    timeout = custom_timeout
                    timeout_logger.debug(f"Request to {path} has custom timeout: {timeout}s")
                    break
        else:
            # Use default timeout
            timeout = self.timeout
        
        # Record start time
        start_time = time.time()
        
        # Set state in request to track remaining time
        request.state.timeout_start = start_time
        request.state.timeout_limit = timeout
        
        try:
            # Try to process the request with timeout
            response = await call_next(request)
            
            # Calculate response time
            process_time = time.time() - start_time
            
            # Log slow requests based on threshold from settings
            if process_time > timeout * 0.8:
                timeout_logger.warning(
                    f"Slow request: {request.method} {path} took {process_time:.2f}s "
                    f"(timeout: {timeout}s)"
                )
            elif process_time > timeout * 0.5:
                timeout_logger.info(
                    f"Moderately slow request: {request.method} {path} took {process_time:.2f}s "
                    f"(timeout: {timeout}s)"
                )
            
            # Add processing time header
            response.headers[settings.PROCESS_TIME_HEADER] = str(process_time)
            
            return response
            
        except Exception as e:
            # Log and handle timeout or other exceptions
            process_time = time.time() - start_time
            
            if "timeout" in str(e).lower() or process_time >= timeout:
                timeout_logger.error(
                    f"Request timeout: {request.method} {path} after {process_time:.2f}s "
                    f"(timeout: {timeout}s)"
                )
                
                return JSONResponse(
                    status_code=503,
                    content={
                        "detail": f"Request timeout after {process_time:.2f}s (limit: {timeout}s)",
                        "error": "timeout_error"
                    }
                )
            else:
                timeout_logger.error(f"Request error: {request.method} {path} - {str(e)}")
                raise 