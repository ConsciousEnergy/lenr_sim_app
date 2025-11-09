"""
Unit tests for the content type validation middleware.
"""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.middleware.content_validation import ContentTypeValidationMiddleware


def create_test_app(allowed_content_types=None, skip_paths=None, skip_methods=None):
    """Create a test FastAPI application with content validation middleware."""
    app = FastAPI()
    
    app.add_middleware(
        ContentTypeValidationMiddleware,
        allowed_content_types=allowed_content_types,
        skip_paths=skip_paths,
        skip_methods=skip_methods
    )
    
    @app.post("/test")
    def test_endpoint(data: dict):
        return {"status": "ok", "received": data}
    
    @app.get("/get-endpoint")
    def get_endpoint():
        return {"status": "ok"}
    
    @app.post("/skipped")
    def skipped_endpoint(data: dict):
        return {"status": "ok", "received": data}
    
    return app


def test_valid_content_type():
    """Test that requests with valid content types are processed."""
    app = create_test_app()
    client = TestClient(app)
    
    # Test with application/json
    response = client.post(
        "/test", 
        json={"test": "data"},
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_invalid_content_type():
    """Test that requests with invalid content types are rejected."""
    app = create_test_app()
    client = TestClient(app)
    
    # Test with invalid content type
    response = client.post(
        "/test", 
        data="plain text data",
        headers={"Content-Type": "text/plain"}
    )
    assert response.status_code == 415  # Unsupported Media Type
    assert "Unsupported media type" in response.json()["detail"]


def test_content_type_with_parameters():
    """Test that Content-Type headers with parameters are properly parsed."""
    app = create_test_app()
    client = TestClient(app)
    
    # Test with application/json with charset parameter
    response = client.post(
        "/test", 
        json={"test": "data"},
        headers={"Content-Type": "application/json; charset=utf-8"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_missing_content_type():
    """Test behavior when Content-Type header is missing."""
    app = create_test_app()
    client = TestClient(app)
    
    # Send request without Content-Type header
    # FastAPI's TestClient will add application/json by default if using json param,
    # so we need to send raw data to truly test missing Content-Type
    response = client.post(
        "/test", 
        data="{}",
        headers={"Content-Type": ""}
    )
    
    # FastAPI will likely reject this before it gets to our middleware due to
    # its built-in validation, but our middleware should allow it to pass through
    # Since the middleware lets it through but FastAPI fails to parse it,
    # we might get a 422 or other error, but not a 415
    assert response.status_code != 415


def test_get_requests_not_validated():
    """Test that GET requests are not validated for Content-Type."""
    app = create_test_app()
    client = TestClient(app)
    
    # GET requests don't need Content-Type validation
    response = client.get("/get-endpoint")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    
    # Even with an invalid Content-Type, GET requests should work
    response = client.get(
        "/get-endpoint",
        headers={"Content-Type": "text/plain"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_skip_paths():
    """Test that paths in skip_paths bypass validation."""
    app = create_test_app(skip_paths=["/skipped"])
    client = TestClient(app)
    
    # Regular endpoint should validate Content-Type
    response = client.post(
        "/test", 
        data="plain text data",
        headers={"Content-Type": "text/plain"}
    )
    assert response.status_code == 415
    
    # Skipped path should bypass validation
    response = client.post(
        "/skipped", 
        json={"test": "data"},
        headers={"Content-Type": "text/plain"}  # Invalid but should be allowed
    )
    # Since the Content-Type is bypassed but the data is still JSON,
    # FastAPI should be able to parse it
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_skip_methods():
    """Test that methods in skip_methods bypass validation."""
    # Override the default skip_methods to only include HEAD and OPTIONS
    app = create_test_app(skip_methods=["HEAD", "OPTIONS"])
    client = TestClient(app)
    
    # GET requests should now be validated (they're skipped by default)
    response = client.get(
        "/get-endpoint",
        headers={"Content-Type": "text/plain"}  # Invalid
    )
    # Should still work because GET requests don't have a body to validate
    assert response.status_code == 200
    
    # POST requests should be validated as usual
    response = client.post(
        "/test", 
        data="plain text data",
        headers={"Content-Type": "text/plain"}
    )
    assert response.status_code == 415


def test_custom_allowed_types():
    """Test that custom allowed content types work correctly."""
    app = create_test_app(allowed_content_types=["application/json", "text/plain"])
    client = TestClient(app)
    
    # Test with text/plain (now allowed)
    response = client.post(
        "/test", 
        data='{"test": "data"}',  # JSON formatted as text
        headers={"Content-Type": "text/plain"}
    )
    
    # FastAPI will try to parse this as JSON since the endpoint expects dict
    # It might fail with 422 but should not be rejected by our middleware with 415
    assert response.status_code != 415
    
    # Test with application/xml (not allowed)
    response = client.post(
        "/test", 
        data="<test>data</test>",
        headers={"Content-Type": "application/xml"}
    )
    assert response.status_code == 415 