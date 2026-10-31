# Security Measures in LENR_SIM_APP

This document outlines the security measures implemented in the LENR_SIM_APP application.

## API Security

### Rate Limiting

Rate limiting protects against abuse and DoS attacks:

- Implemented in `app/api/middleware/rate_limiting.py`
- Default limit: 60 requests per minute per IP
- Whitelisted paths (not rate limited): `/api/docs`, `/api/redoc`, `/api/openapi.json`, `/health`
- Whitelisted IPs (not rate limited): 127.0.0.1, ::1
- Headers: Returns `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers

### Content-Type Validation

Ensures requests have the correct Content-Type headers:

- Implemented in `app/api/middleware/content_validation.py`
- Validates POST, PUT, and PATCH requests
- Allowed Content-Types: `application/json`, `application/x-www-form-urlencoded`, `multipart/form-data`
- Skips validation for GET, HEAD, OPTIONS requests and certain paths

### Input Validation

All API inputs are validated using Pydantic models:

- Models defined in each route module
- Provides strong type checking and validation
- Returns clear validation error messages

### Secure Error Handling

Prevents sensitive information leakage in error responses:

- Implemented in `app/api/errors/handlers.py`
- Custom exception handlers for validation errors, HTTP exceptions, and internal errors
- Different error detail level based on environment (more details in development, limited in production)
- Every error JSON includes `request_id`; response also sets `X-Request-ID` / `X-Correlation-ID`
- Structured logs pass `request_id` via logging `extra=` (JSON field when `LENR_LOG_JSON_FORMAT=true`)
- Do **not** log Authorization, Cookie, bodies with tokens, `SECRET_KEY`, or DB passwords

### Request / correlation IDs

- `RequestIDMiddleware` (`app/core/middleware.py`) mints or accepts a safe inbound id
- Accepted inbound headers: `X-Request-ID`, `X-Correlation-ID` (8–128 chars `[A-Za-z0-9._-]`)
- Staging Swarm tip: `LENR_LOG_LEVEL=INFO` (short `DEBUG` triage only), `LENR_LOG_JSON_FORMAT=true`

## HTTP Security Headers

Implemented in `app/api/middleware/secure_headers.py`:

- **Content-Security-Policy**: Controls resources the user agent is allowed to load
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-Frame-Options**: Protects against clickjacking
- **X-XSS-Protection**: Adds XSS protection for older browsers
- **Strict-Transport-Security**: Enforces secure connections to the server
- **Referrer-Policy**: Controls referrer information that should be sent
- **Permissions-Policy**: Restricts browser features
- **Cache-Control**: Prevents storing sensitive responses

## Configuration

Security settings are configured in `app/core/config.py`:

```python
# Security configuration
SECRET_KEY: Optional[str] = None
ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

# New security settings
ENABLE_RATE_LIMITING: bool = True
RATE_LIMIT_PER_MINUTE: int = 60  # 60 requests per minute per IP
RATE_LIMIT_WHITELIST_IPS: List[str] = ["127.0.0.1", "::1"]

ENABLE_SECURE_HEADERS: bool = True 
ENABLE_CSP: bool = True
ENABLE_HSTS: bool = True
CSP_REPORT_ONLY: bool = False

HTTPS_REDIRECT: bool = False  # Redirect HTTP to HTTPS (enforced in production)

# Security features for authentication (future implementation)
JWT_ALGORITHM: str = "HS256"
JWT_SECRET_KEY: Optional[str] = None  # Should be set in env for production

# Content-type validation
ENFORCE_CONTENT_TYPE: bool = True  # Validate Content-Type headers
```

## Environment Variables

Security-sensitive values should be stored in environment variables:

```
LENR_SECRET_KEY=your-secret-key-here
LENR_JWT_SECRET_KEY=your-jwt-secret-key-here
LENR_ENVIRONMENT=production  # Forces certain security settings
```

## Production Considerations

In production environments:

- HTTPS is enforced
- Error responses contain minimal information
- JWT keys must be set via environment variables

## Future Security Improvements

Planned security enhancements:

- JWT-based authentication
- Role-based access control
- API key management
- OAuth 2.0 integration
- Automated security scanning in CI/CD

## Security Best Practices

For developers working on this project:

1. Always validate all inputs
2. Use parameterized queries for any database operations
3. Don't log sensitive information
4. Keep dependencies updated
5. Use environment variables for sensitive configuration
6. Never commit secrets to version control
7. Follow the principle of least privilege
8. Implement proper error handling that doesn't leak information 