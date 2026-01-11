"""
Secure Headers Middleware

This module provides middleware for adding security-related HTTP headers to responses.
These headers help protect against common web vulnerabilities such as XSS, clickjacking, etc.
"""

from typing import Callable, Dict
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings, EnvironmentType
from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("secure_headers", "logs/security.log")


class SecureHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware that adds security-related HTTP headers to responses.
    
    The middleware adds headers for:
    - Content-Security-Policy: Controls resources the user agent is allowed to load
    - X-Content-Type-Options: Prevents MIME type sniffing
    - X-Frame-Options: Protects against clickjacking
    - X-XSS-Protection: Adds XSS protection for older browsers
    - Strict-Transport-Security: Enforces secure connections to the server
    - Referrer-Policy: Controls referrer information that should be sent
    """
    
    def __init__(
        self, 
        app,
        enable_csp: bool = True,
        enable_hsts: bool = True,
        csp_policy: str = None,
        csp_report_only: bool = False,
        hsts_max_age: int = 31536000  # 1 year
    ):
        super().__init__(app)
        self.enable_csp = enable_csp
        self.enable_hsts = enable_hsts
        self.csp_policy = csp_policy or self._get_default_csp_policy()
        self.csp_report_only = csp_report_only
        self.hsts_max_age = hsts_max_age
        
        self.default_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()", 
            "Cache-Control": "no-store"
        }
        
        logger.info("Secure headers middleware initialized")
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Add default security headers
        for header_name, header_value in self.default_headers.items():
            response.headers[header_name] = header_value
        
        # Add Content-Security-Policy header if enabled
        if self.enable_csp:
            header_name = "Content-Security-Policy-Report-Only" if self.csp_report_only else "Content-Security-Policy"
            response.headers[header_name] = self.csp_policy
        
        # Add Strict-Transport-Security header if enabled and request is secure
        if self.enable_hsts and (request.url.scheme == "https" or settings.ENVIRONMENT == EnvironmentType.PRODUCTION):
            response.headers["Strict-Transport-Security"] = f"max-age={self.hsts_max_age}; includeSubDomains; preload"
        
        return response
    
    def _get_default_csp_policy(self) -> str:
        """Get the default Content-Security-Policy value."""
        return (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "  # 'unsafe-inline' needed for Swagger UI
            "style-src 'self' 'unsafe-inline'; "   # 'unsafe-inline' needed for Swagger UI
            "img-src 'self' data:; "
            "font-src 'self'; "
            "connect-src 'self'; "
            "frame-src 'self'; "
            "frame-ancestors 'none'; "
            "form-action 'self'; "
            "base-uri 'self'; "
            "object-src 'none'"
        ) 