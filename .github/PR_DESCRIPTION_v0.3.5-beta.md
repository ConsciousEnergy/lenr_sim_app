# Release v0.3.5-beta — Pre-PR Quality Sweep: Math accuracy, UX fixes, doc cleanup

## Summary

Merges the LENR Simulation App **v0.3.5-beta** release into `main`. This Pre-PR Quality Sweep addresses math/physics accuracy, UX stability, documentation consistency, and CI build hardening.

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

---

## Pre-Merge Checklist (from PULL_REQUEST_TEMPLATE)

### Backend
- [ ] All backend tests passing
- [ ] No placeholder endpoints exposed in production
- [ ] Physics calculations return physically reasonable results
- [ ] No new linting errors introduced

### Frontend
- [ ] Frontend builds without errors: `cd frontend && npm ci && npm run build`
- [ ] No console errors in browser dev tools
- [ ] Dev/debug routes gated behind `IS_PRODUCTION` check
- [ ] All pages show loading/error states (no blank screens)

### Security
- [ ] CORS origins locked to `https://conscious.energy` in production config
- [ ] Debug endpoints gated behind non-production env
- [ ] No `.env` files, credentials, or secrets in committed files
- [ ] CSP headers configured in middleware

### Documentation
- [ ] CHANGELOG.md updated with all notable changes
- [ ] Version strings consistent across `config.py`, `package.json`, `version.js`, `docker-compose.yml`
- [ ] Deployment docs reference correct version and workflow filenames

### Deployment
- [ ] Docker images build successfully: `docker-compose build`
- [ ] Local smoke test passed: `/api/health`, `/api/docs`, basic simulation run
- [ ] API response times < 2s for standard calculations
- [ ] Lazy loading works correctly

---

## Post-Merge

- Tag: `git tag v0.3.5-beta && git push origin v0.3.5-beta`
- Rebuild and deploy from `main`
- Smoke test production
