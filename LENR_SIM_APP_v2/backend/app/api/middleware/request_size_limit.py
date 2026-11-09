"""
Request Size Limit Middleware

Rejects request bodies that exceed a configurable maximum size.
Prevents abuse from arbitrarily large payloads.
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

_BODY_METHODS = frozenset({"POST", "PUT", "PATCH"})


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """Reject oversized bodies; require Content-Length for body methods."""

    def __init__(self, app, max_body_size: int = 10 * 1024 * 1024):
        super().__init__(app)
        self.max_body_size = max_body_size

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        transfer_encoding = (request.headers.get("transfer-encoding") or "").lower()

        if content_length is not None:
            try:
                length = int(content_length)
            except ValueError:
                return JSONResponse(
                    status_code=400,
                    content={"detail": "Invalid Content-Length header."},
                )
            if length > self.max_body_size:
                return JSONResponse(
                    status_code=413,
                    content={
                        "detail": (
                            f"Request body too large. Maximum allowed: "
                            f"{self.max_body_size} bytes."
                        )
                    },
                )
            return await call_next(request)

        # Chunked / missing length can bypass a Content-Length-only gate until
        # the ASGI server buffers the full body — reject for body methods.
        if request.method in _BODY_METHODS and (
            "chunked" in transfer_encoding or transfer_encoding
        ):
            return JSONResponse(
                status_code=411,
                content={
                    "detail": (
                        "Content-Length required. Chunked transfer encoding "
                        "is not accepted for this endpoint."
                    )
                },
            )
        return await call_next(request)
