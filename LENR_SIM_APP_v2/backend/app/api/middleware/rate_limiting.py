"""
Rate Limiting Middleware

This module provides a rate limiting middleware for FastAPI.
The middleware limits the number of requests from a single client based on IP address.
"""

import time
from typing import Dict, Tuple, Callable, Optional
from fastapi import Request, Response, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("rate_limiting", "logs/security.log")


class RateLimitingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that limits the number of requests from a single client.
    
    The middleware uses a sliding window algorithm to track requests
    and limits them based on the configured rate limit.
    """
    
    def __init__(
        self, 
        app,
        rate_limit_per_minute: int = 60,
        whitelist_paths: Optional[list] = None,
        whitelist_ips: Optional[list] = None
    ):
        super().__init__(app)
        self.rate_limit = rate_limit_per_minute
        self.clients: Dict[str, Tuple[int, float]] = {}  # client_ip -> (request_count, timestamp)
        self.window_size = 60  # 1 minute in seconds
        self.whitelist_paths = whitelist_paths if whitelist_paths is not None else ["/api/docs", "/api/redoc", "/api/openapi.json", "/health"]
        self.whitelist_ips = whitelist_ips if whitelist_ips is not None else ["127.0.0.1", "::1"]
        
        logger.info(f"Rate limiting middleware initialized with {rate_limit_per_minute} requests per minute")
        logger.info(f"Whitelisted paths: {self.whitelist_paths}")
        logger.info(f"Whitelisted IPs: {self.whitelist_ips}")
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for whitelisted paths
        if any(request.url.path.startswith(path) for path in self.whitelist_paths):
            return await call_next(request)
        
        # Get client IP
        client_ip = self._get_client_ip(request)
        
        # Skip rate limiting for whitelisted IPs
        if client_ip in self.whitelist_ips:
            return await call_next(request)
        
        # Check rate limit
        current_time = time.time()
        if client_ip in self.clients:
            requests, timestamp = self.clients[client_ip]
            
            # Reset count if window has passed
            if current_time - timestamp >= self.window_size:
                self.clients[client_ip] = (1, current_time)
            # Increment count if within window and check limit
            else:
                if requests >= self.rate_limit:
                    logger.warning(f"Rate limit exceeded for IP: {client_ip}")
                    
                    # Return 429 Too Many Requests
                    return self._rate_limit_response(request)
                
                self.clients[client_ip] = (requests + 1, timestamp)
        else:
            # First request from this client
            self.clients[client_ip] = (1, current_time)
        
        # Clean up old entries periodically (every 100 requests)
        if sum(count for count, _ in self.clients.values()) % 100 == 0:
            self._cleanup_old_entries(current_time)
        
        # Process the request
        response = await call_next(request)
        
        # Add rate limit headers
        client_requests, _ = self.clients.get(client_ip, (0, current_time))
        remaining = max(0, self.rate_limit - client_requests)
        
        response.headers["X-RateLimit-Limit"] = str(self.rate_limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(current_time + self.window_size))
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Get the client IP address from the request."""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # X-Forwarded-For can contain multiple IPs, take the first one
            return forwarded.split(",")[0].strip()
        
        client_host = request.client.host if request.client else "unknown"
        return client_host
    
    def _cleanup_old_entries(self, current_time: float) -> None:
        """Remove expired entries from the clients dictionary."""
        expired_clients = [
            ip for ip, (_, timestamp) in self.clients.items()
            if current_time - timestamp >= self.window_size
        ]
        
        for ip in expired_clients:
            del self.clients[ip]
    
    def _rate_limit_response(self, request: Request) -> Response:
        """Create a rate limit exceeded response.
        
        Returns a JSONResponse instead of raising HTTPException because
        HTTPException raised in middleware isn't handled by FastAPI's exception handlers.
        """
        from starlette.responses import JSONResponse
        
        request_id = getattr(request.state, "request_id", "unknown")
        logger.warning(
            f"Rate limit exceeded | "
            f"RequestID: {request_id} | "
            f"{request.method} {request.url.path}"
        )
        
        # Calculate retry-after based on when the window will reset
        client_ip = self._get_client_ip(request)
        _, timestamp = self.clients.get(client_ip, (0, 0))
        retry_after = int(self.window_size - (time.time() - timestamp)) if timestamp else self.window_size
        
        return JSONResponse(
            status_code=429,
            content={"detail": "Too Many Requests - Rate limit exceeded"},
            headers={"Retry-After": str(max(1, retry_after))}
        ) 