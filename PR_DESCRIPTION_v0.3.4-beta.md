# Pull Request: v0.3.4-beta → main — Release for Public Launch

## Summary
Merges the LENR Simulation App v0.3.4-beta release into `main` for public deployment. This release includes the Theory Relevance Network, cross-theory coupling pipeline, 21 registered LENR theories, and extensive Relevance Map UI/UX improvements.

---

## Base & Compare
- **Base branch:** `main`
- **Compare branch:** `lenr_sim_app_v0.3.0-beta`

> **Note:** GitHub may show "nothing to compare" because `main` and this branch have unrelated histories (no common ancestor). Use the force-push workflow in [.github/MERGING_INSTRUCTIONS.md](.github/MERGING_INSTRUCTIONS.md) to publish to `main`.

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
- Lett's Laser, Phonon Coupling Legacy, Hydroton, Kim BEC, Swartz NANOR, Miles Heat-Helium
- Widom-Larsen, Casimir Confinement, Quantum Tunneling, Takahashi TSC, Bubble-MHD Confinement
- Iwamura Transmutation, Matsumoto ENC, Piantelli Ni-H, Non-Equilibrium Thermo

### Legacy Module Integration
- Rydberg Matter → Electron Screening
- Boundary Layers → Bubble-MHD
- Phonon-Nuclear Coupling, Non-Equilibrium Thermo as TheoryModule wrappers

### Other Improvements
- Broken link fix: `lenr.org` → `lenr-forum.com` (Theory Paper)
- Coupled Mode toggle in Theory Testbed with execution order and coupling arrows
- Advanced parameters: defect_density, grain_size, surface_roughness passed to pipeline

---

## Files Changed (High-Level)

| Area | Key Files |
|------|-----------|
| **Relevance Map** | `frontend/src/components/analytics/RelevanceMap.tsx`, `AnalyticsPage.jsx` |
| **Layout** | `frontend/src/components/AppLayoutFixed.jsx` |
| **Theory Engine** | `backend/app/physics_engine/theory_*.py`, `theories/*.py` |
| **API** | `backend/app/routers/analytics_routes.py` |
| **Version** | `config.py`, `version.js`, `package.json` → 0.3.4-beta |

---

## Pre-Merge Checklist

### Backend
- [x] All backend tests passing
- [x] No placeholder endpoints exposed in production
- [x] Physics calculations validated

### Frontend
- [x] Frontend builds without errors
- [x] Relevance Map loads and interacts correctly
- [x] No hover flicker on nodes

### Documentation
- [x] CHANGELOG.md updated (v0.3.4-beta)
- [x] Version strings consistent (0.3.4-beta)

### Testing
- [x] Theory pipeline tests (topological sort, coupled run, 21 theories)
- [x] Relevance Map manual QA

---

## Test Plan

1. **Backend:** `cd LENR_SIM_APP_v2/backend && python -m pytest tests/ -v --no-cov`
2. **Frontend:** `cd LENR_SIM_APP_v2/frontend && npm run build`
3. **Smoke test:** Start app, navigate to Analytics → Relevance Map, run scores, hover nodes, use zoom/pan

---

## Migration / Deployment Notes

- No database migrations required
- No new environment variables
- Docker images: rebuild with `docker-compose build` after merge

---

## Related
- Release: v0.3.4-beta
- Branch: `lenr_sim_app_v0.3.0-beta`
