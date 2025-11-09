"""
Mock HTTP client for testing API interactions.
"""
from typing import Any, Dict, Optional, Union
import json
import time
from dataclasses import dataclass
from http import HTTPStatus

@dataclass
class MockResponse:
    """Mock HTTP response."""
    status_code: int
    content: Union[str, bytes, Dict[str, Any]]
    headers: Dict[str, str] = None
    
    def json(self) -> Dict[str, Any]:
        """Get JSON content."""
        if isinstance(self.content, (str, bytes)):
            return json.loads(self.content)
        return self.content
        
    def raise_for_status(self):
        """Raise exception for error status codes."""
        if self.status_code >= 400:
            raise Exception(f"HTTP Error {self.status_code}")

class MockHTTPClient:
    """Mock HTTP client for testing API interactions."""
    
    def __init__(self, latency_ms: float = 0.0):
        """Initialize mock HTTP client.
        
        Args:
            latency_ms: Simulated latency in milliseconds
        """
        self._latency = latency_ms / 1000.0  # Convert to seconds
        self._responses: Dict[str, MockResponse] = {}
        self._request_history: list = []
        
    def _simulate_latency(self):
        """Simulate network latency."""
        if self._latency > 0:
            time.sleep(self._latency)
            
    def register_response(self, method: str, url: str, 
                         response: Union[Dict[str, Any], MockResponse],
                         status_code: int = HTTPStatus.OK):
        """Register a mock response for a specific request.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            url: Request URL
            response: Response data or MockResponse object
            status_code: HTTP status code
        """
        key = f"{method.upper()}:{url}"
        if isinstance(response, dict):
            response = MockResponse(
                status_code=status_code,
                content=response,
                headers={"Content-Type": "application/json"}
            )
        self._responses[key] = response
        
    def _get_response(self, method: str, url: str) -> MockResponse:
        """Get registered response for request."""
        key = f"{method.upper()}:{url}"
        if key not in self._responses:
            return MockResponse(
                status_code=HTTPStatus.NOT_FOUND,
                content={"error": "No mock response registered for request"},
                headers={"Content-Type": "application/json"}
            )
        return self._responses[key]
        
    def get(self, url: str, params: Optional[Dict[str, Any]] = None,
            headers: Optional[Dict[str, str]] = None) -> MockResponse:
        """Simulate GET request."""
        self._simulate_latency()
        self._request_history.append(("GET", url, params, headers))
        return self._get_response("GET", url)
        
    def post(self, url: str, data: Optional[Dict[str, Any]] = None,
             json: Optional[Dict[str, Any]] = None,
             headers: Optional[Dict[str, str]] = None) -> MockResponse:
        """Simulate POST request."""
        self._simulate_latency()
        self._request_history.append(("POST", url, data or json, headers))
        return self._get_response("POST", url)
        
    def put(self, url: str, data: Optional[Dict[str, Any]] = None,
            json: Optional[Dict[str, Any]] = None,
            headers: Optional[Dict[str, str]] = None) -> MockResponse:
        """Simulate PUT request."""
        self._simulate_latency()
        self._request_history.append(("PUT", url, data or json, headers))
        return self._get_response("PUT", url)
        
    def delete(self, url: str, headers: Optional[Dict[str, str]] = None) -> MockResponse:
        """Simulate DELETE request."""
        self._simulate_latency()
        self._request_history.append(("DELETE", url, None, headers))
        return self._get_response("DELETE", url)
        
    def patch(self, url: str, data: Optional[Dict[str, Any]] = None,
              json: Optional[Dict[str, Any]] = None,
              headers: Optional[Dict[str, str]] = None) -> MockResponse:
        """Simulate PATCH request."""
        self._simulate_latency()
        self._request_history.append(("PATCH", url, data or json, headers))
        return self._get_response("PATCH", url)
        
    def clear_history(self):
        """Clear request history."""
        self._request_history.clear()
        
    def get_request_history(self) -> list:
        """Get history of all requests made."""
        return self._request_history.copy()
        
    def clear_responses(self):
        """Clear all registered responses."""
        self._responses.clear() 