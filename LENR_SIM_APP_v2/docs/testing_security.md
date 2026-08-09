# Testing Security Components

This document provides guidance on testing the security components implemented in the LENR_SIM_APP application.

## Unit Tests

The security components have comprehensive unit tests in the `backend/app/tests/api/middleware/` directory:

- `test_rate_limiting.py`: Tests for the rate limiting middleware
- `test_secure_headers.py`: Tests for the secure headers middleware
- `test_content_validation.py`: Tests for the content type validation middleware

### Running the Tests

To run the security-specific tests:

```bash
cd backend
pytest app/tests/api/middleware/ -v
```

To run all tests with code coverage:

```bash
cd backend
pytest --cov=app app/tests/
```

## Test Setup Pattern

The security middleware tests follow a common pattern:

1. Create a test FastAPI application with the middleware under test
2. Configure the middleware with specific parameters
3. Add test endpoints to the application
4. Use FastAPI's TestClient to make requests
5. Assert that the responses contain the expected headers or status codes

Example test setup:

```python
def create_test_app(enable_csp=True, enable_hsts=True):
    """Create a test FastAPI application with secure headers middleware."""
    app = FastAPI()
    
    app.add_middleware(
        SecureHeadersMiddleware,
        enable_csp=enable_csp,
        enable_hsts=enable_hsts
    )
    
    @app.get("/test")
    def test_endpoint():
        return {"status": "ok"}
    
    return app

def test_default_headers():
    app = create_test_app()
    client = TestClient(app)
    
    response = client.get("/test")
    assert response.status_code == 200
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    # More assertions...
```

## Test Coverage Report

The security tests cover:

1. **Rate Limiting**:
   - Basic rate limiting functionality
   - Whitelisted paths and IPs
   - Rate limit headers
   - Rate limit expiration
   - Cleanup of expired entries

2. **Secure Headers**:
   - Default security headers
   - Content-Security-Policy configuration
   - HSTS header configuration
   - Custom CSP policies
   - Header override behavior

3. **Content-Type Validation**:
   - Valid and invalid content types
   - Content types with parameters
   - Handling missing Content-Type headers
   - Path and method whitelist behavior
   - Custom allowed content types

## Manual Testing

In addition to automated tests, you should perform manual testing of security features:

### Rate Limiting Testing

1. Configure a low rate limit (e.g., 5 requests per minute)
2. Use a tool like curl or Postman to make multiple requests
3. Verify that after the rate limit is exceeded, you receive a 429 response
4. Check that rate limit headers are present in the responses

Example curl command:
```bash
for i in {1..10}; do 
  curl -i http://localhost:8010/api/test
  sleep 1
done
```

### Secure Headers Testing

Use browser developer tools to check security headers:

1. Run the application
2. Open the application in a browser
3. Open developer tools (F12)
4. Go to the Network tab
5. Click on a request
6. Check the Response Headers section for security headers

You can also use online security header scanners:
- [SecurityHeaders.com](https://securityheaders.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)

### Content-Type Validation Testing

Test with various content types using curl:

```bash
# Valid content type
curl -X POST -H "Content-Type: application/json" -d '{"test":"data"}' http://localhost:8010/api/test

# Invalid content type
curl -X POST -H "Content-Type: text/plain" -d 'plain text' http://localhost:8010/api/test
```

## Security Scanning

For comprehensive security testing, set up the following tools:

1. **Dependency scanning**: Use tools like `safety` or `npm audit` to check for vulnerabilities in dependencies
2. **SAST (Static Application Security Testing)**: Use tools like Bandit (Python) to check for security issues in code
3. **DAST (Dynamic Application Security Testing)**: Use tools like OWASP ZAP to test the running application

### Example Commands

Python dependency scanning:
```bash
pip install safety
safety check
```

JavaScript dependency scanning:
```bash
npm audit
```

Python static analysis:
```bash
pip install bandit
bandit -r app/
```

## Continuous Integration

Configure your CI pipeline to run security tests automatically:

```yaml
# Example GitHub Actions workflow
security-tests:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.10'
    - name: Install dependencies
      run: |
        pip install -r requirements.txt
        pip install pytest pytest-cov safety bandit
    - name: Run security tests
      run: |
        pytest app/tests/api/middleware/ -v
    - name: Check dependencies
      run: |
        safety check
    - name: Static security analysis
      run: |
        bandit -r app/
```

## Additional Testing Resources

- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [FastAPI Testing Documentation](https://fastapi.tiangolo.com/tutorial/testing/)
- [Mozilla Web Security Guidelines](https://infosec.mozilla.org/guidelines/web_security) 