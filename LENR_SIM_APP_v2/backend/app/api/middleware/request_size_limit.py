"""
Request Size Limit Middleware

Rejects request bodies that exceed a configurable maximum size.
Prevents abuse from arbitrarily large payloads.
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """Reject requests whose Content-Length exceeds max_body_size bytes."""

    def __init__(self, app, max_body_size: int = 10 * 1024 * 1024):
        super().__init__(app)
        self.max_body_size = max_body_size

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.max_body_size:
            return JSONResponse(
                status_code=413,
                content={
                    "detail": f"Request body too large. Maximum allowed: {self.max_body_size} bytes."
                },
            )
        return await call_next(request)
