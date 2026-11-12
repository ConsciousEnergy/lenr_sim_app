# LENR_SIM_APP Security Documentation

This document is the **source of truth** for security features, policies, and
reporting for this repository. (`LENR_SIM_APP_v2/SECURITY.md` is a short pointer
only — do not duplicate tables there.)

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
- **Edge body limit:** keep edge and app caps aligned at **10 MiB** so oversized
  POSTs return **413** before upstream (avoids Traefik/nginx **502** / disconnect).
  Compose: Caddy `request_body max_size 10MB`. Swarm: Traefik `backend-bodylimit`
  (`maxRequestBodyBytes: 10485760`). App: `REQUEST_MAX_BODY_SIZE`. SPA nginx also
  sets `client_max_body_size 10m`.
- **Edge rate limit (LP-H2 mitigate):** Traefik Swarm labels apply shared per-IP
  budgets (general 60/min, heavy mutate 10/min, save/share write 3/min) before
  API replicas (`backend-ratelimit(-heavy|-write)`, `ipStrategy.depth=1`). FastAPI
  process-local RL still dilutes with workers — keep replicas ≤2 until Redis or
  Cloudflare orange-cloud; LP-H2 not fully closed.
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

Security settings can be configured in `app/core/config.py`
(under `LENR_SIM_APP_v2/backend/`):

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

# HTTPS is terminated at the edge (Caddy / Traefik); the app does not redirect.
HTTPS_REDIRECT: bool = False

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

- HTTPS is enforced at the edge in production environments
- Error responses contain minimal information
- JWT keys must be set via environment variables if/when auth is wired
- Regular security audits should be performed
- Content-Security-Policy should be tuned for production assets

## Security Implementation Files

Paths relative to `LENR_SIM_APP_v2/backend/`:

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
| `v0.3.9-beta` (current, `main` / `dev`) | Yes |
| `v0.3.8-beta` and earlier | No, upgrade to the current release |

## Security Reporting

**Do not open a public issue for a vulnerability.** Report it privately through
[GitHub private vulnerability reporting](https://github.com/[REDACTED]/lenr_sim_app/security/advisories/new)
(Security → Report a vulnerability on this repository). If that form is
unavailable, email `info@conscious.energy` with the subject
`LENR_SIM_APP security report`.

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
| Grouped Dependabot updates against `dev` | `dependabot.yml` | weekly |

Self-hosted `lenr-ci` jobs route **fork** pull requests to `ubuntu-latest` (or
skip for `lenr-ci-smoke`) so untrusted PR code never executes on the dedicated
CI VM. `deploy.yml` stays on GitHub-hosted and is the only workflow that may
read `VPS_*` secrets.

All third-party actions are pinned to full commit SHAs. Local equivalents are
available via [`.pre-commit-config.yaml`](.pre-commit-config.yaml).

## Before flipping the repository public

Repo is **private today**. Org/repo setting toggles cannot be applied from this
docs PR — do these in GitHub UI (or confirm already on) **before** the B-flip:

- [ ] **Dependabot alerts** enabled (Dependency graph + Dependabot alerts; updates
      already configured in `.github/dependabot.yml` → `dev`).
- [ ] **Code scanning / GHAS** enabled so CodeQL runs (workflow currently skips
      when `repository.private`; see `codeql.yml` `if: !github.event.repository.private`).
- [ ] **Secret scanning** (+ push protection if available) confirmed on.
- [ ] **Fork → not on self-hosted** still present: `head.repo.full_name` guard from
      PR #368 in `test.yml`, `security-scan.yml`, `codeql.yml`,
      `dependency-review.yml`; `lenr-ci-smoke` skips fork PRs.
- [ ] Optional defense in depth: require approval for first-time contributors.
- [ ] After Dependency graph/GHAS: drop F13 `continue-on-error` on
      `dependency-review.yml` in a follow-up PR.

## Future Security Roadmap

- Role-based access control
- API key management
- OAuth 2.0 integration
- Server-side request forgery protection
- Advanced rate limiting with token bucket algorithm
