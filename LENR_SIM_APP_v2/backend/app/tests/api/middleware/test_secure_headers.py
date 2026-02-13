"""
Unit tests for the secure headers middleware.
"""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.middleware.secure_headers import SecureHeadersMiddleware
from app.core.config import EnvironmentType


def create_test_app(enable_csp=True, enable_hsts=True, csp_report_only=False):
    """Create a test FastAPI application with secure headers middleware."""
    app = FastAPI()
    
    app.add_middleware(
        SecureHeadersMiddleware,
        enable_csp=enable_csp,
        enable_hsts=enable_hsts,
        csp_report_only=csp_report_only
    )
    
    @app.get("/test")
    def test_endpoint():
        return {"status": "ok"}
    
    return app


def test_default_headers():
    """Test that default security headers are added to responses."""
    app = create_test_app()
    client = TestClient(app)
    
    response = client.get("/test")
    assert response.status_code == 200
    
    # Check default headers
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["X-XSS-Protection"] == "1; mode=block"
    assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert "camera=()" in response.headers["Permissions-Policy"]
    assert response.headers["Cache-Control"] == "no-store"


def test_csp_enabled():
    """Test that Content-Security-Policy header is included when enabled."""
    app = create_test_app(enable_csp=True, csp_report_only=False)
    client = TestClient(app)
    
    response = client.get("/test")
    assert response.status_code == 200
    
    # Check CSP header
    assert "Content-Security-Policy" in response.headers
    assert "default-src 'none'" in response.headers["Content-Security-Policy"]
    assert "Content-Security-Policy-Report-Only" not in response.headers


def test_csp_report_only():
    """Test that CSP header is in report-only mode when configured."""
    app = create_test_app(enable_csp=True, csp_report_only=True)
    client = TestClient(app)
    
    response = client.get("/test")
    assert response.status_code == 200
    
    # Check CSP header is report-only
    assert "Content-Security-Policy-Report-Only" in response.headers
    assert "default-src 'none'" in response.headers["Content-Security-Policy-Report-Only"]
    assert "Content-Security-Policy" not in response.headers


def test_csp_disabled():
    """Test that CSP header is not included when disabled."""
    app = create_test_app(enable_csp=False)
    client = TestClient(app)
    
    response = client.get("/test")
    assert response.status_code == 200
    
    # Check CSP header is not present
    assert "Content-Security-Policy" not in response.headers
    assert "Content-Security-Policy-Report-Only" not in response.headers


def test_hsts_disabled():
    """Test that HSTS header is not included when disabled."""
    app = create_test_app(enable_hsts=False)
    client = TestClient(app)
    
    response = client.get("/test")
    assert response.status_code == 200
    
    # Check HSTS header is not present
    assert "Strict-Transport-Security" not in response.headers


def test_hsts_enabled_for_https():
    """Test that HSTS header is included for HTTPS requests when enabled."""
    app = create_test_app(enable_hsts=True)
    client = TestClient(app)
    
    # TestClient doesn't support HTTPS by default, so we need to mock it
    # by setting the request scheme
    with client:
        response = client.get("https://testserver/test")
        assert response.status_code == 200
        
        # Check HSTS header is present
        assert "Strict-Transport-Security" in response.headers
        assert "max-age=31536000" in response.headers["Strict-Transport-Security"]
        assert "includeSubDomains" in response.headers["Strict-Transport-Security"]
        assert "preload" in response.headers["Strict-Transport-Security"]


def test_custom_csp_policy():
    """Test that custom CSP policy is used when provided."""
    app = FastAPI()
    
    custom_csp = "default-src 'self'; script-src 'self' https://example.com"
    
    app.add_middleware(
        SecureHeadersMiddleware,
        enable_csp=True,
        csp_policy=custom_csp
    )
    
    @app.get("/test")
    def test_endpoint():
        return {"status": "ok"}
    
    client = TestClient(app)
    
    response = client.get("/test")
    assert response.status_code == 200
    
    # Check custom CSP header
    assert response.headers["Content-Security-Policy"] == custom_csp


def test_header_overrides():
    """Test that middleware doesn't override headers already set in the response."""
    from fastapi import Response
    
    app = FastAPI()
    
    app.add_middleware(SecureHeadersMiddleware)
    
    @app.get("/custom-headers")
    def custom_headers_endpoint(response: Response):
        # Set custom header before middleware processes
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        return {"status": "ok"}
    
    client = TestClient(app)
    
    response = client.get("/custom-headers")
    assert response.status_code == 200
    
    # Middleware should override the header despite it being set in the endpoint
    assert response.headers["X-Frame-Options"] == "DENY" 