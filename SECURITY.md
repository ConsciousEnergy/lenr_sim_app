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
- **JWT-based Authentication**: Framework for secure token-based authentication
- **Password Hashing**: Secure password handling with salt generation
- **CSRF Protection**: Protection against cross-site request forgery

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

## Supported Versions

Only the latest release line receives security fixes. Releases are `v*` tags on
`main` (see [`.github/BRANCHING.md`](.github/BRANCHING.md)).

| Version | Supported |
|---------|-----------|
| `v0.3.6-beta` (current, `main`) | Yes |
| `v0.3.5-beta` and earlier | No, upgrade to the current release |

## Security Reporting

**Do not open a public issue for a vulnerability.** Report it privately through
[GitHub private vulnerability reporting](https://github.com/ConsciousEnergy/lenr_sim_app/security/advisories/new)
(Security → Report a vulnerability). If that form is unavailable, email
`info@conscious.energy` with the subject `LENR_SIM_APP security report`.

Please include: affected version/commit, a reproduction or proof of concept,
and the impact you believe it has. You will receive an acknowledgement within
7 days. We follow coordinated disclosure: a fix is released before details are
published, and reporters are credited in the release notes unless they prefer
otherwise.

## Automated Security Controls in CI

These run in GitHub Actions and are required for merging to `main`:

| Control | Where | Cadence |
|---------|-------|---------|
| Backend dependency audit (`pip-audit`, documented residual ignores) | `test.yml` | every PR/push |
| Frontend dependency gate (`npm audit --audit-level=high`) | `test.yml` | every PR/push |
| Secret scan of full git history (gitleaks, [`.gitleaks.toml`](.gitleaks.toml)) | `security-scan.yml` | every PR + weekly |
| Scheduled re-audit of already-committed dependencies | `security-scan.yml` | weekly |
| Dependency Review of PR-introduced packages | `dependency-review.yml` | every PR |
| CodeQL static analysis (Python, JavaScript/TypeScript) | `codeql.yml` | every PR + weekly (active once the repo is public or GHAS is enabled) |
| Grouped Dependabot updates against `main` | `dependabot.yml` | weekly |

All third-party actions are pinned to full commit SHAs. Local equivalents are
available via [`.pre-commit-config.yaml`](.pre-commit-config.yaml).

## Future Security Roadmap

- Role-based access control
- API key management
- OAuth 2.0 integration
- Server-side request forgery protection
- Advanced rate limiting with token bucket algorithm