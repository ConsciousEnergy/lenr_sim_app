# PR Body for v0.3.4-beta — Copy into GitHub PR or Release Notes

---

## Description

Merges the LENR Simulation App **v0.3.4-beta** release for public deployment. This release delivers the Theory Relevance Network, cross-theory coupling pipeline, 21 registered LENR theories, and extensive Relevance Map UI/UX improvements.

**Key deliverables:**
- **Relevance Map** — Interactive D3 force-directed graph with deterministic layout, hover stability, and scrollable viewport
- **Cross-Theory Coupling** — `run_coupled()` executes theories in topological order with promoted observables
- **21 Theory Modules** — Electron Screening, Hagelstein Phonon, Vysotskii CCS, Widom-Larsen, and 17 others
- **Legacy Integration** — Rydberg Matter → Electron Screening; Boundary Layers → Bubble-MHD; Phonon-Nuclear and Non-Equilibrium Thermo wrappers

---

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [x] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [x] Documentation update
- [ ] Infrastructure / deployment change

---

## Pre-Merge Checklist

### Backend
- [x] All backend tests passing: `cd LENR_SIM_APP_v2/backend && python -m pytest tests/ app/tests/ -v -o addopts="" --tb=short`
- [x] No placeholder endpoints exposed in production
- [x] Physics calculations return physically reasonable results
- [x] No new linting errors introduced

### Frontend
- [x] Frontend builds without errors: `cd LENR_SIM_APP_v2/frontend && npm ci && npm run build`
- [x] No console errors in browser dev tools
- [x] Dev/debug routes gated behind `IS_PRODUCTION` check
- [x] All pages show loading/error states (no blank screens)

### Security
- [x] CORS origins locked to `https://conscious.energy` in production config
- [x] Debug endpoints (`/diagnostics`, `/logs`, `/mock`) gated behind non-production env
- [x] No `.env` files, credentials, or secrets in committed files
- [x] CSP headers configured in middleware

### Documentation
- [x] CHANGELOG.md updated with all notable changes
- [x] Version strings consistent across `config.py`, `package.json`, `version.js`, `docker-compose.yml`
- [x] Deployment docs reference correct version and workflow filenames

### Deployment
- [x] Docker images build successfully: `docker-compose build`
- [x] Local smoke test passed: `/api/health`, `/api/docs`, basic simulation run
- [x] API response times < 2s for standard calculations
- [x] Lazy loading works correctly (no blocking initial load)

---

## Test Plan

1. **Backend:** `cd LENR_SIM_APP_v2/backend && python -m pytest tests/ -v --no-cov`
2. **Frontend:** `cd LENR_SIM_APP_v2/frontend && npm ci && npm run build`
3. **Smoke test:** Start app via `start_app.bat`, navigate to Analytics → Relevance Map, run scores, hover nodes, use zoom/pan
4. **Manual:** Coupled Mode toggle in Theory Testbed; advanced parameters passed to pipeline

---

## Screenshots / Media

A short demonstration video will be published when we go public.

---

## License

This project is licensed under **GNU GPL-3.0**. The software is freely available for anyone to use, study, modify, and distribute in accordance with our [application documentation](LENR_SIM_APP_v2/docs/) and the [LICENSE](LICENSE) file.
