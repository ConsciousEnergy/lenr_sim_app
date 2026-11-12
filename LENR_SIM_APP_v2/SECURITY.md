# LENR_SIM_APP Security Documentation

This document outlines the security features, policies, and best practices implemented in the LENR_SIM_APP application.

## Implemented Security Measures

### API Security
- **Rate Limiting**: Protects against abuse and DoS attacks with a default of 60 requests per minute per IP
- **Content-Type Validation**: Ensures requests have the correct Content-Type headers
- **Input Validation**: All API inputs are validated using Pydantic models
- **Secure Error Handling**: Prevents sensitive information leakage in error responses

### HTTP Security Headers
- **Content-Security-Policy**: Controls resources the user agent is allowed to load
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-Frame-Options**: Protects against clickjacking
- **X-XSS-Protection**: Adds XSS protection for older browsers
- **Strict-Transport-Security**: Enforces secure connections to the server
- **Referrer-Policy**: Controls referrer information that should be sent
- **Permissions-Policy**: Restricts browser features

### Authentication & Authorization
- **No end-user login on the public beta.** Simulation, export, and WebSocket
  endpoints are unauthenticated and protected by per-IP rate limits, reverse-proxy
  body size limits, and a heavy-compute semaphore (503 when saturated).
- **Analytics writes** (POST/PUT/DELETE) require the `X-LENR-Write-Token` header
  in production (`LENR_ANALYTICS_WRITE_TOKEN`, falling back to `LENR_SECRET_KEY`).
  GET/stats stay public.
- **Shared-simulation writes** (`POST /api/simulations/save`, `POST /api/simulations/share`)
  use the same production write-token gate (fail-closed). Public browse/search
  stay available. The SPA does not currently call these persist routes; treat
  them as operator-only. Payloads are capped (~64 KiB JSON) and hit a tighter
  write rate-limit tier (default 3/min/IP, process-local).
- **JWT settings exist in config** (`LENR_JWT_SECRET_KEY`) for a future auth
  layer; they are **not** wired to routes. Do not describe the API as
  JWT-authenticated.
- Shared-simulation `session_id` is an unguessable client string, not a
  cryptographic credential — it does **not** authorize writes in production.
- Password-hash helpers exist in `app/security/utils.py` but are unused on the
  live beta surface; prefer argon2/bcrypt if wiring login later.
- **SPA framing:** CSP `frame-ancestors` allowlists WordPress apex/www. The SPA
  edge must **not** emit `X-Frame-Options: DENY` (Traefik `spa-security-headers`
  keeps `frameDeny: false`; nginx/Caddy omit/strip XFO).

### Environment & Configuration Security
- **Environment Variables**: Secure configuration using environment variables
- **Development vs Production**: Different security profiles per environment
- **Secure Defaults**: Secure default settings with ability to customize

## Security Configuration

Security settings can be configured in `app/core/config.py`:

```python
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
HTTPS_REDIRECT: bool = False  # Automatically enforced in production

# Authentication (JWT)
JWT_ALGORITHM: str = "HS256"
JWT_SECRET_KEY: Optional[str] = None  # Set in environment

# Content validation
ENFORCE_CONTENT_TYPE: bool = True
```

## Environment Variables

Security-sensitive values should be stored in environment variables:

```
LENR_SECRET_KEY=your-secret-key-here
LENR_JWT_SECRET_KEY=your-jwt-secret-key-here
LENR_ENVIRONMENT=production
```

## Best Practices for Developers

1. **Input Validation**: Always validate all inputs using Pydantic models
2. **Database Safety**: Use parameterized queries for database operations
3. **Sensitive Data**: Don't log sensitive information
4. **Dependencies**: Keep dependencies updated regularly
5. **Environment Variables**: Use environment variables for sensitive configuration
6. **Version Control**: Never commit secrets to version control
7. **Principle of Least Privilege**: Implement granular permissions
8. **Error Handling**: Implement proper error handling that doesn't leak information

## Production Security Considerations

- HTTPS is enforced in production environments
- Error responses contain minimal information
- JWT keys must be set via environment variables
- Regular security audits should be performed
- Content-Security-Policy should be tuned for production assets

## Security Implementation Files

- **Rate Limiting**: `app/api/middleware/rate_limiting.py`
- **Secure Headers**: `app/api/middleware/secure_headers.py`
- **Content Validation**: `app/api/middleware/content_validation.py`
- **Error Handling**: `app/api/errors/handlers.py`
- **Security Utilities**: `app/security/utils.py`
- **Configuration**: `app/core/config.py`
- **Middleware Setup**: `app/core/middleware.py`

## Security Reporting

If you discover a security vulnerability within LENR_SIM_APP, please report it through our [GitHub Security Advisory](https://github.com/ConsciousEnergy/lenr_sim_app/security/advisories/new). All security vulnerabilities will be promptly addressed.

## Future Security Roadmap

- Role-based access control
- API key management
- OAuth 2.0 integration
- Automated security scanning in CI/CD
- Server-side request forgery protection
- Advanced rate limiting with token bucket algorithm 