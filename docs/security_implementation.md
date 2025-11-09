# Security Implementation Details

This document provides technical details about the security measures implemented in the LENR_SIM_APP application.

## 1. API Security Measures

### 1.1 Rate Limiting

The application implements a sliding window rate limiting algorithm to prevent abuse and DoS attacks.

Key features:
- Implemented in `RateLimitingMiddleware` class at `app/api/middleware/rate_limiting.py`
- Configurable rate limit (default: 60 requests per minute per IP)
- Whitelist for IPs and paths that bypass rate limiting
- Headers for limit tracking (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`)
- Automatic cleanup of expired entries

Implementation highlights:
```python
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
            return self._rate_limit_response(request)
        
        self.clients[client_ip] = (requests + 1, timestamp)
```

### 1.2 Content-Type Validation

Ensures that API endpoints receive properly formatted data by validating Content-Type headers:

- Implemented in `ContentTypeValidationMiddleware` class at `app/api/middleware/content_validation.py`
- Validates POST, PUT, and PATCH requests
- Configurable list of allowed content types
- Skips validation for specific paths and methods

Implementation highlights:
```python
# Extract the base content type (removing parameters)
base_content_type = content_type_header.split(";")[0].strip().lower()

if not base_content_type:
    # No Content-Type header, let's assume it's an empty body request
    return await call_next(request)

if base_content_type not in self.allowed_content_types:
    # Return 415 Unsupported Media Type
    raise HTTPException(status_code=415, detail="Unsupported media type")
```

### 1.3 Secure Error Handling

Prevents sensitive information leakage in error responses:

- Implemented in custom exception handlers at `app/api/errors/handlers.py`
- Different error detail levels based on environment
- Includes request ID for tracking and correlation
- Custom handlers for validation errors, HTTP exceptions, and internal errors

Implementation highlights:
```python
# In development mode, include more details
if settings.ENVIRONMENT == EnvironmentType.DEVELOPMENT:
    detail = {
        "message": str(exc),
        "exception_type": exc.__class__.__name__,
        "trace": trace.split("\n")
    }
else:
    # In production, don't expose internal details
    detail = "An internal server error occurred. Please try again later."
```

## 2. HTTP Security Headers

The application adds security-related HTTP headers to responses to protect against common web vulnerabilities:

- Implemented in `SecureHeadersMiddleware` class at `app/api/middleware/secure_headers.py`
- Configurable settings for Content-Security-Policy and HSTS
- Default secure headers for all responses

Headers implemented:
- **Content-Security-Policy**: Controls resources the user agent is allowed to load
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-Frame-Options**: Protects against clickjacking
- **X-XSS-Protection**: Adds XSS protection for older browsers
- **Strict-Transport-Security**: Enforces secure connections to the server
- **Referrer-Policy**: Controls referrer information that should be sent
- **Permissions-Policy**: Restricts browser features
- **Cache-Control**: Prevents storing sensitive responses

Default CSP policy:
```python
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
```

## 3. Security Utilities

The application includes utility functions for security-related operations:

- Implemented in `app/security/utils.py`
- Exported from `app/security/__init__.py` for easy imports

Available utilities:
- `generate_secure_token()`: Generates a secure random token
- `generate_secure_password()`: Generates a secure random password
- `generate_uuid()`: Generates a random UUID
- `hash_password()`: Hashes a password with a salt using SHA-256
- `verify_password()`: Verifies a password against a hashed password and salt
- `sanitize_input()`: Sanitizes input to prevent potential injection attacks
- `generate_csrf_token()`: Generates a CSRF token

Implementation highlights:
```python
def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    """
    Hash a password with a salt using SHA-256.
    If salt is not provided, a new one will be generated.
    """
    if salt is None:
        salt = secrets.token_hex(16)
    
    # Combine password and salt, then hash
    password_bytes = password.encode('utf-8')
    salt_bytes = salt.encode('utf-8')
    hash_obj = hashlib.sha256(password_bytes + salt_bytes)
    hashed_password = hash_obj.hexdigest()
    
    return hashed_password, salt
```

## 4. Configuration

Security settings are configured in `app/core/config.py` through the `Settings` class:

```python
# Security configuration
SECRET_KEY: Optional[str] = None
ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

# Rate limiting
ENABLE_RATE_LIMITING: bool = True
RATE_LIMIT_PER_MINUTE: int = 60
RATE_LIMIT_WHITELIST_IPS: List[str] = ["127.0.0.1", "::1"]

# Secure headers
ENABLE_SECURE_HEADERS: bool = True 
ENABLE_CSP: bool = True
ENABLE_HSTS: bool = True
CSP_REPORT_ONLY: bool = False

# HTTPS configuration
HTTPS_REDIRECT: bool = False  # Enforced in production

# Authentication (JWT)
JWT_ALGORITHM: str = "HS256"
JWT_SECRET_KEY: Optional[str] = None  # Set in environment

# Content validation
ENFORCE_CONTENT_TYPE: bool = True
```

## 5. Middleware Integration

All security middleware is integrated in `app/core/middleware.py` through the `setup_middlewares()` function:

```python
def setup_middlewares(app: FastAPI) -> None:
    # Register custom exception handlers
    register_exception_handlers(app)
    
    # Security middleware
    if settings.ENABLE_SECURE_HEADERS:
        app.add_middleware(
            SecureHeadersMiddleware,
            enable_csp=settings.ENABLE_CSP,
            enable_hsts=settings.ENABLE_HSTS,
            csp_report_only=settings.CSP_REPORT_ONLY
        )
    
    if settings.ENABLE_RATE_LIMITING:
        app.add_middleware(
            RateLimitingMiddleware,
            rate_limit_per_minute=settings.RATE_LIMIT_PER_MINUTE,
            whitelist_ips=settings.RATE_LIMIT_WHITELIST_IPS
        )
    
    if settings.ENFORCE_CONTENT_TYPE:
        app.add_middleware(ContentTypeValidationMiddleware)
```

## 6. Future Security Enhancements

Planned security enhancements include:

- JWT-based authentication with proper token validation
- Role-based access control for administrative functions
- API key management for third-party integrations
- OAuth 2.0 integration for single sign-on
- Automated security scanning in CI/CD pipeline
- Server-side request forgery protection
- Advanced rate limiting with token bucket algorithm
- Two-factor authentication for administrative access 