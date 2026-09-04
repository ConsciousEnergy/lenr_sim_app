## Description

<!-- Target branch is `main` (trunk-based; see .github/BRANCHING.md). PRs are squash-merged. -->

<!-- Brief summary of changes and motivation -->

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Infrastructure / deployment change

## Pre-Merge Checklist

### Backend
- [ ] All backend tests passing: `cd LENR_SIM_APP_v2/backend && python -m pytest tests/ app/tests/ -v -o addopts="" --tb=short`
- [ ] No placeholder endpoints exposed in production
- [ ] Physics calculations return physically reasonable results
- [ ] No new linting errors introduced

### Frontend
- [ ] Frontend builds without errors: `cd LENR_SIM_APP_v2/frontend && npm ci && npm run build`
- [ ] No console errors in browser dev tools
- [ ] Dev/debug routes gated behind `IS_PRODUCTION` check
- [ ] All pages show loading/error states (no blank screens)

### Security
- [ ] CORS origins locked to `https://conscious.energy` in production config
- [ ] Debug endpoints (`/diagnostics`, `/logs`, `/mock`) gated behind non-production env
- [ ] No `.env` files, credentials, or secrets in committed files
- [ ] CSP headers configured in middleware

### Documentation
- [ ] CHANGELOG.md updated with all notable changes
- [ ] Version strings consistent across `config.py`, `package.json`, `version.js`, `Dockerfile.backend` (CI `version-consistency` enforces this)
- [ ] Deployment docs reference correct version and workflow filenames

### Deployment
- [ ] Docker images build successfully: `docker-compose build`
- [ ] Local smoke test passed: `/api/health`, `/api/docs`, basic simulation run
- [ ] API response times < 2s for standard calculations
- [ ] Lazy loading works correctly (no blocking initial load)

## Test Plan

<!-- Describe how you tested these changes -->

## Screenshots / Media (if applicable)

<!-- Add screenshots for UI changes. For releases, a short demonstration video may be used instead. -->
