# Release v0.3.5-beta — Pre-PR Quality Sweep: Math accuracy, UX fixes, doc cleanup

## Summary

Merges the LENR Simulation App **v0.3.5-beta** release into `main`. This Pre-PR Quality Sweep addresses math/physics accuracy, UX stability, documentation consistency, and CI build hardening.
This document now consolidates the cumulative scope already tracked on PR #23 with the latest fixes in this branch.

**Base branch:** `main`  
**Compare branch:** `lenr_sim_app_v0.3.5-beta`

---

## A: Math / Physics

### Peak Temperature Capping (Critical Fix)
- **REGIME_MAX_TEMPERATURE capping**: Unified Theory page previously showed unrealistic peak temperatures (e.g. 4.5e9 K). Applied physics caps from `bubble_collapse.py` Phase 1.9:
  - `single_bubble` ~1e4 K
  - `multi_bubble` ~5e3 K
  - `laser_driven` ~1e5 K
- **bubble_lattice_interaction.py**: Cap T_max at REGIME_MAX_TEMPERATURE["single_bubble"] (1e4 K) after adiabatic rise calculation
- **bubble_collapse.py**: Cap `enhanced_temperature` in `calculate_surface_enhanced_collapse` at regime max
- **UnifiedTheoryPage.jsx**: Cap local fallback `max_temperature_k` and `peak_conditions.temperature_k` at 1e4 K when API is unavailable

### Physics Engine Overhaul (Phase 1–2 Verification)
- **electron_screening.py**: strong/anomalous models, `classify_screening_regime`, `calculate_gamow_integral_screened`
- **casimir_forces.py**: `calculate_casimir_force_with_metadata`, DOMAIN_VALIDITY_THRESHOLD_M (2e-9 m)
- **bubble_collapse.py**: REGIME_MAX_TEMPERATURE, `calculate_collapse_temperature_regime`
- **non_equilibrium_thermo.py**: MILES_HE_RATE (2.63e11 atoms/s/W), `calculate_miles_heat_helium_correlation`
- **proton_phase_model.py**: weak interaction import, `get_weak_neutron_formation_params`
- **unified_lenr_model**: `get_material_work_function`, `get_double_layer_potential`
- **TheoryDocumentationPanel**: P_overlap 8.5e-16, "Delocalized Interface Electrons", r_n 5 fm
- **UnifiedTheoryPage**: ENHANCEMENT_THRESHOLDS observable=1e5, measurable=1e3, screening=1e1

---

## B: UX

### ESLint Compliance — CI Build Hardening
- Resolved all ESLint warnings across 61 frontend source files so the production build passes with `CI=true`
- Unused imports removed; intentionally unused variables prefixed with `_`
- React hooks `exhaustive-deps` fixes; ref cleanup patterns (TestCube, ThreeJsTest, PhysicsVisualEffects)
- Static object extraction (DashboardControlsPanel `DEFAULT_FILTERS`); Unicode BOM stripped from .tsx files

### Result
- Frontend build and tests run cleanly without `CI: false` workaround
- 75 tests across 9 suites — all passing

---

## C: Docs

- **CHANGELOG.md**: Full v0.3.5-beta section with all changes
- **LENR_SIM_APP_v2/docs/**: ARCHITECTURE.md, DEPLOYMENT_CHECKLIST.md, MHD_NANO_CONFINEMENT_PHYSICS.md, MHD_PROTON_DYNAMICS.md, PAPER_CORRECTIONS_APPLIED.md, PHASE4_DOCKER_SWARM_DEPLOYMENT.md, PHYSICS_MODULE_GUIDE.md, THEORY_OVERVIEW.md, UNIFIED_BUBBLE_LATTICE_SIMULATION.md, VISUALIZATION_ALIGNMENT_AND_PROTON_CONFINEMENT.md
- **.github/**: MERGING_INSTRUCTIONS.md, workflows/test.yml
- **docs/**: Unified theoretical framework paper (path with spaces)

---

## Key Files Changed

| Area | Key Files |
|------|-----------|
| **Physics** | `bubble_collapse.py`, `bubble_lattice_interaction.py`, `electron_screening.py`, `casimir_forces.py`, `non_equilibrium_thermo.py`, `proton_phase_model.py` |
| **Physics engine** | `unified_lenr_model.py`, `theory_pipeline.py`, `constants.py`, `quantum_effects_solver.py`, theories (casimir_confinement, electron_screening, hagelstein_phonon, kim_bec, widom_larsen) |
| **Frontend** | `UnifiedTheoryPage.jsx`, `TheoryDocumentationPanel.jsx`, `TheoryTogglePanel.tsx`, 60+ component/page files for ESLint |
| **API** | `physics.py`, `unified_simulation.py`, `analytics_routes.py` |
| **Config** | `config.py`, `main.py`, `docker-compose.yml` |
| **Docs** | CHANGELOG.md, LENR_SIM_APP_v2/docs/*.md, .github/MERGING_INSTRUCTIONS.md, .github/workflows/test.yml |

---

## Testing / Verification

```powershell
# Backend
cd LENR_SIM_APP_v2/backend; python -m pytest tests/ app/tests/ -v -o addopts="" --tb=short

# Frontend (strict CI mode)
cd LENR_SIM_APP_v2/frontend
$env:CI="true"; npm run build
npx react-scripts test --watchAll=false
```

- Backend tests: passing
- Frontend build with CI=true: succeeds
- Frontend tests: 75/75 passing
- Frontend dependency audit reduced to 2 moderate vulnerabilities (react-scripts/webpack-dev-server path)
- UnifiedTheoryPage `react-hooks/exhaustive-deps` warning fixed (`runSimulation` dependency list)
- Unified Bubble-Lattice WebGL warning fixed (`texImage3D` unpack flag conflict during renderer initialization)
- Backend test sweep re-run completed: `605 passed, 8 skipped` (with existing non-blocking warnings)
- FastAPI smoke checks passed with `TestClient`: `/api/health`, `/api/docs`, `/api/physics/status`, `/api/physics/theories`, `/api/physics/enhancement`
- Security middleware regression check passed: `app/tests/api/middleware/test_secure_headers.py` (`8 passed`)
- Repository secret-pattern scan returned no matches for common key/token/private-key signatures
- Added startup preloading for physics singletons to remove first-request cold-start latency spikes
- Standard API calculations now measure <2s after startup (`/api/physics/status` ~0.005-0.007s, `/api/physics/enhancement` ~0.006s in warmed checks)
- Docker compose build verified in WSL after Docker daemon startup (`docker compose build` + `docker compose up -d`)
- CI frontend test regression fixed by pinning `@tootallnate/once` to `2.0.0` (avoids Jest `ERR_REQUIRE_ESM` through `react-scripts`/`http-proxy-agent`)
- CI workflow cleanup applied: removed permanently disabled benchmark-analysis job and stabilized frontend tests with `--runInBand` and explicit Node memory limits
- Lazy-loading wiring verified in `frontend/src/App.tsx` (route-level `React.lazy` + `Suspense` with shared loading fallback)
- Browser route sweep completed (`/`, `/unified-theory`, `/advanced-analysis`, `/analytics`, `/documentation`, `/theory-paper`, `/lenr-simulation`, `/fusion-simulation`, `/quantum-tunneling`) with no blank screens observed
- Quantum tunneling fallback logging adjusted; follow-up browser check now reports 0 console errors on `/quantum-tunneling` (warnings only)
- Physics reasonableness cross-check completed (code + benchmark math + external references):
  - WolframAlpha MCP benchmark: `k_B*300 K = 0.02585 eV`
  - WolframAlpha MCP benchmark: Coulomb energy at `5 fm` = `287.99 keV`
  - `k_B T` at 300 K = `0.02585 eV` (expected thermal scale)
  - Coulomb scale at nuclear radius (`r=5 fm`) computes to `~288 keV` (within published D-D barrier order of magnitude range)
  - Gamow behavior is physically monotonic/suppressive: `G(300 K-equivalent)` underflows to ~0, `G(10 keV)=5.04e-5` (<<1)
  - Miles correlation constant in code yields `2.63e11 He-4 atoms/s/W` at 1 W, matching cited experimental range (`10^11–10^12`)
  - Bubble-collapse regime capping enforces `single_bubble <= 1e4 K` (extreme compression test returns exactly `10000 K`)
  - API enhancement output remains finite and positive (`total_enhancement ~236.65`, no NaN/Inf)
- Added automated backend guardrail tests in `app/tests/test_physics_reasonableness.py` (5 checks passing) to keep these benchmarks CI-enforced
- Docker stack validated in WSL: `docker compose build` + `docker compose up -d` succeeded after compose/env fixes; backend and postgres report healthy
- Compose/Docker hygiene updates: removed obsolete `version` key from `docker-compose.yml`; aligned backend image default `BUILD_VERSION` to `0.3.5-beta`

---

## Pre-Merge Checklist (from PULL_REQUEST_TEMPLATE)

### Backend
- [x] All backend tests passing
- [x] No placeholder endpoints exposed in production
- [x] Physics calculations return physically reasonable results
- [x] No new linting errors introduced

### Frontend
- [x] Frontend builds without errors: `cd frontend && npm ci && npm run build`
- [x] Unified Bubble-Lattice WebGL console warning fixed (`texImage3D: FLIP_Y or PREMULTIPLY_ALPHA`)
- [x] No console errors in browser dev tools
- [x] Dev/debug routes gated behind `IS_PRODUCTION` check
- [x] All pages show loading/error states (no blank screens)

### Security
- [x] CORS origins locked to `https://conscious.energy` in production config
- [x] Debug endpoints gated behind non-production env
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
- [x] Lazy loading works correctly

---

## Post-Merge

- Tag: `git tag v0.3.5-beta && git push origin v0.3.5-beta`
- Rebuild and deploy from `main`
- Smoke test production
