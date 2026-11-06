"""Request size middleware: Content-Length gate + chunked rejection."""

import asyncio

from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.testclient import TestClient
from starlette.applications import Starlette
from starlette.routing import Route

from app.api.middleware.request_size_limit import RequestSizeLimitMiddleware


async def _echo(request: Request):
    body = await request.body()
    return JSONResponse({"n": len(body)})


def _app(max_body: int = 100):
    app = Starlette(routes=[Route("/echo", _echo, methods=["POST", "GET"])])
    app.add_middleware(RequestSizeLimitMiddleware, max_body_size=max_body)
    return app


def test_rejects_oversize_content_length():
    client = TestClient(_app(max_body=10))
    response = client.post("/echo", content=b"x" * 20)
    assert response.status_code == 413


def test_allows_small_body():
    client = TestClient(_app(max_body=100))
    response = client.post("/echo", content=b"ok")
    assert response.status_code == 200
    assert response.json()["n"] == 2


def test_rejects_chunked_without_content_length():
    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "POST",
        "scheme": "http",
        "path": "/echo",
        "raw_path": b"/echo",
        "query_string": b"",
        "headers": [(b"transfer-encoding", b"chunked")],
        "client": ("127.0.0.1", 123),
        "server": ("test", 80),
    }

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def run():
        middleware = RequestSizeLimitMiddleware(_app(), max_body_size=100)
        request = Request(scope, receive)

        async def call_next(_req):
            return JSONResponse({"ok": True})

        return await middleware.dispatch(request, call_next)

    response = asyncio.run(run())
    assert response.status_code == 411
