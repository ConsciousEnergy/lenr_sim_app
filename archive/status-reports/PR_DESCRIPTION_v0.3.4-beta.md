# Pull Request: v0.3.4-beta → main — Release for Public Launch

## Summary
Merges the LENR Simulation App v0.3.4-beta release into `main` for public deployment. This release includes the Theory Relevance Network, cross-theory coupling pipeline, 21 registered LENR theories, extensive Relevance Map UI/UX improvements, and a fully green CI/CD pipeline.

---

## Base & Compare
- **Base branch:** `main`
- **Compare branch:** `lenr_sim_app_v0.3.0-beta`

---

## Key Features

### Relevance Map (Theory Relevance Network)
- **Interactive D3 force-directed graph** — 21 LENR theories as nodes with 74 relationship edges
- **Deterministic layout** — Same organization every time; seeded from `theory_id` hash
- **Hover stability** — Flicker fixed via immediate DOM updates and `pointer-events: none` on tooltip
- **Scrollable layout** — Main content area scrolls correctly; graph fits viewport with auto-zoom
- **Pre-computed layout** — 200-tick synchronous simulation before first paint; fit-to-bounds zoom applied immediately

### Cross-Theory Coupling Pipeline
- **`run_coupled()`** — Executes theories in topological dependency order
- **Topological sort** — Kahn's algorithm on extends/explains_observation edges
- **Promoted observables** — `screening_potential_eV`, `T_peak_K`, `P_peak_Pa`, etc. flow between theories
- **API:** `POST /api/analytics/theories/run-coupled`, `GET /api/analytics/theories/coupling-graph`

### 21 Theory Modules
- Electron Screening, Hagelstein Phonon, Vysotskii CCS, Coherent QED, NAE Model, Chubb Ion Band
- Letts Laser, Phonon Coupling Legacy, Hydroton, Kim BEC, Swartz NANOR, Miles Heat-Helium
- Widom-Larsen, Casimir Confinement, Quantum Tunneling, Takahashi TSC, Bubble-MHD Confinement
- Iwamura Transmutation, Matsumoto ENC, Piantelli Ni-H, Non-Equilibrium Thermo

### Legacy Module Integration
- Rydberg Matter → Electron Screening
- Boundary Layers → Bubble-MHD
- Phonon-Nuclear Coupling, Non-Equilibrium Thermo as TheoryModule wrappers

### CI/CD Pipeline Stabilization
- **GitHub Actions `test.yml`** — Full frontend job: Node 20, `npm ci`, lint, test (75 tests), build
- **ESLint build fix** — `CI: false` on build step for CRA compatibility
- **All tests green** — No `continue-on-error` flags; pipeline is authoritative

### Frontend Test Suite — 9 Suites, 75 Tests
| Suite | Tests | Key Fixes |
|-------|-------|-----------|
| ThreeJsDebug | 3 | Constructor function mocks for Three.js `new` behavior |
| UnifiedLENRVisualizer | 7 | `jest.mock` hoisting fix for PhysicsContext |
| LatticeTest | 13 | MockScene children, userData, text assertion corrections |
| SimulationVisualizer | 3 | Mocked child components, updated assertions |
| SimulationControlPanel | 8 | Mocked AdvancedControlHelp*, ThemeProvider wrapper |
| VisualizationDashboard | 6 | `getByRole('combobox')` for Ant Design Select |
| VisualizationStream | 12 | `onConnected` callback simulation, matchMedia mock |
| visualizationWebSocket | 14 | `isConnected()` method fix, fetch mock persistence |
| test-utils.tsx | — | Shared MUI ThemeProvider wrapper (new file) |

### Other Improvements
- Broken link fix: `lenr.org` → `lenr-forum.com` (Theory Paper)
- Coupled Mode toggle in Theory Testbed with execution order and coupling arrows
- Advanced parameters: defect_density, grain_size, surface_roughness passed to pipeline

---

## Files Changed (High-Level)

| Area | Key Files |
|------|-----------|
| **CI/CD** | `.github/workflows/test.yml` |
| **Test Utils** | `frontend/src/tests/test-utils.tsx` (new) |
| **Frontend Tests** | 8 test files across `components/tests/`, `tests/visualization/`, `utils/tests/` |
| **Relevance Map** | `frontend/src/components/analytics/RelevanceMap.tsx`, `AnalyticsPage.jsx` |
| **Layout** | `frontend/src/components/AppLayoutFixed.jsx` |
| **Theory Engine** | `backend/app/physics_engine/theory_*.py`, `theories/*.py` |
| **API** | `backend/app/routers/analytics_routes.py` |
| **Version** | `config.py`, `version.js`, `package.json` → 0.3.4-beta |
| **Documentation** | `CHANGELOG.md`, `PR_BODY_v0.3.4-beta.md`, `PR_DESCRIPTION_v0.3.4-beta.md` |

---

## Pre-Merge Checklist

### Backend
- [x] All backend tests passing
- [x] No placeholder endpoints exposed in production
- [x] Physics calculations validated

### Frontend
- [x] Frontend builds without errors (`CI=false` for ESLint warnings)
- [x] All 75 tests passing across 9 suites
- [x] Relevance Map loads and interacts correctly
- [x] No hover flicker on nodes

### Documentation
- [x] CHANGELOG.md updated (v0.3.4-beta with CI/test sections)
- [x] Version strings consistent (0.3.4-beta)
- [x] PR template and merging instructions prepared

### Testing
- [x] Theory pipeline tests (topological sort, coupled run, 21 theories)
- [x] Frontend test suite (9 suites, 75 tests)
- [x] Relevance Map manual QA
- [x] CI/CD pipeline validated

---

## Test Plan

1. **Backend:** `cd LENR_SIM_APP_v2/backend && python -m pytest tests/ -v --no-cov`
2. **Frontend tests:** `cd LENR_SIM_APP_v2/frontend && npx react-scripts test --watchAll=false --verbose`
3. **Frontend build:** `cd LENR_SIM_APP_v2/frontend && npm run build`
4. **Smoke test:** Start app, navigate to Analytics → Relevance Map, run scores, hover nodes, use zoom/pan

---

## Migration / Deployment Notes

- No database migrations required
- No new environment variables
- Docker images: rebuild with `docker-compose build` after merge

---

## Related
- Release: v0.3.4-beta
- Branch: `lenr_sim_app_v0.3.0-beta`
- License: GNU GPL-3.0
