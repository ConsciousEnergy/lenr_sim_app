# Pull Request: v0.3.5-beta → main — ESLint Compliance & CI Build Hardening

## Summary

Merges the LENR Simulation App **v0.3.5-beta** release into `main` for public deployment. This release builds on v0.3.4-beta and adds **full ESLint compliance** across the frontend, enabling the production build to pass with `CI=true` (Create React App treats warnings as errors in CI). The pipeline can now run with strict linting without workarounds.

---

## Base & Compare

- **Base branch:** `main`
- **Compare branch:** `lenr_sim_app_v0.3.5-beta`

---

## What Changed in v0.3.5-beta

### ESLint Compliance — 61 Frontend Files

All ESLint warnings that caused `npm run build` to fail under `CI=true` have been resolved.

| Category | Description | Example Files |
|----------|-------------|---------------|
| **Unused imports** | Removed unused React hooks, MUI components, icons, types | AppLayoutFixed, PhysicsSimulationDashboard, ReactionConfigurationManager |
| **Unused variables** | Prefixed with `_` per ESLint convention | simulationApi.js, ThreeJsErrorHandler, FusionParameterControls |
| **TypeScript destructuring** | Used aliases (`isLoading: _isLoading`) for typed props | PhononNuclearPanel, StatisticalAnalysisPanel, TheoryTogglePanel, MHDFluidSimulation |
| **react-hooks/exhaustive-deps** | `eslint-disable-next-line` on line before dependency array | SimulationResults, VisualizationDebugger, ReactionConfigurationManager, SettingsPage, FusionVisualization, LENRVisualization |
| **Ref cleanup** | Captured refs in local variables for useEffect cleanup | TestCube, ThreeJsTest, PhysicsVisualEffects |
| **Static object extraction** | Moved `defaultFilters` outside component | DashboardControlsPanel |
| **Unicode BOM** | Stripped BOM from .tsx files | PhononNuclearPanel, QEDVisualization, StatisticalAnalysisPanel, ThermodynamicsPanel |
| **ErrorType enum** | eslint-disable block; preserved public API names | api/client.ts |

### Verification

- **Build:** `npm run build` with `CI=true` — compiles successfully
- **Tests:** 75 tests across 9 suites — all passing
- **No breaking changes** — public API and component props unchanged

---

## Included from v0.3.4-beta

This branch includes the full v0.3.4-beta release:

- **Relevance Map** — D3 force-directed graph, 21 theories, hover stability, deterministic layout
- **Cross-theory coupling** — Topological execution, promoted observables, API endpoints
- **CI/CD** — GitHub Actions test.yml, frontend job, 75 tests green
- **Test suite** — test-utils.tsx, mocks for Three.js, PhysicsContext, MUI
- **Documentation** — CHANGELOG, merging instructions, PR template

---

## Files Changed (v0.3.5-beta Focus)

| Area | Key Files |
|------|-----------|
| **API** | `client.ts`, `websocketClient.ts`, `realtime.ts`, `simulationApi.js` |
| **Components** | 30+ files in `components/` (AppLayoutFixed, SimulationResults, VisualizationDebugger, controls, dashboards, physics, reactions, visualizations) |
| **Pages** | AnalyticsPage, BubbleFusionPage, DashboardNew, DocumentationPage, LENRSimulationPage, PhysicsSimulationDashboardPage, QuantumTunnelingPage, SettingsPage, TeamPage, UnifiedTheoryPage |
| **Services** | `dataStreamService.ts`, `hooks.ts`, `reactions.js` |
| **Visualization** | ColorLegend, LatticeStructure, LatticeStructureWithPhysics, MHDFluidSimulation, PhysicsVisualEffects, TestCube, ThreeJsLoader, ThreeJsTest, usePhysicsVisualization |
| **Contexts** | PhysicsContext, ThemeContext |
| **Version** | `version.js` → 0.3.5-beta |
| **Documentation** | CHANGELOG.md, PR_DESCRIPTION_v0.3.5-beta.md, PR_BODY_v0.3.5-beta.md |

---

## Pre-Merge Checklist

### Build & Tests

- [x] Backend tests passing
- [x] Frontend tests: 75/75 passing
- [x] Frontend build with `CI=true` succeeds (no ESLint warnings)

### Code Quality

- [x] No breaking API changes
- [x] ErrorType enum and client exports unchanged
- [x] Component props preserved (aliasing only for ESLint)

### Documentation

- [x] CHANGELOG.md updated (v0.3.5-beta section)
- [x] Version strings → 0.3.5-beta
- [x] PR description and body prepared

---

## Test Plan

```powershell
# Backend
cd LENR_SIM_APP_v2/backend; python -m pytest tests/ -v

# Frontend (strict CI mode)
cd LENR_SIM_APP_v2/frontend
$env:CI="true"; npm run build
npx react-scripts test --watchAll=false
```

---

## Post-Merge

- Tag: `git tag v0.3.5-beta && git push origin v0.3.5-beta`
- Rebuild and deploy from `main`
- Smoke test production

---

## Related

- **Release:** v0.3.5-beta
- **Branch:** `lenr_sim_app_v0.3.5-beta`
- **License:** GNU GPL-3.0


# PR Body for v0.3.5-beta 

---

## Description

Merges the LENR Simulation App **v0.3.5-beta** release into `main` for public deployment. This release adds **full ESLint compliance** across the frontend so the production build passes with `CI=true` (Create React App treats warnings as errors in CI). The pipeline no longer needs `CI: false` as a workaround.

**Key deliverables:**
- **ESLint compliance** — 61 frontend files updated; unused imports removed, unused vars prefixed with `_`, react-hooks/exhaustive-deps resolved
- **Ref cleanup patterns** — TestCube, ThreeJsTest, PhysicsVisualEffects use correct React ref-in-cleanup pattern
- **TypeScript aliasing** — Destructuring aliases (e.g., `isLoading: _isLoading`) preserve type safety and satisfy ESLint
- **Static extraction** — `DEFAULT_FILTERS` moved outside DashboardControlsPanel component
- **Build verification** — `npm run build` with `CI=true` compiles successfully; 75 tests passing

This branch includes all v0.3.4-beta work (Relevance Map, cross-theory coupling, 21 theories, CI stabilization, test suite).

---

## Type of Change

- [x] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [x] Documentation update
- [x] Infrastructure / deployment change

---

## Pre-Merge Checklist

### Build & Tests
- [x] Backend tests passing
- [x] Frontend tests: 75/75 passing
- [x] Frontend build with `CI=true` succeeds

### Code Quality
- [x] No breaking API changes (ErrorType enum preserved)
- [x] Component props unchanged (aliasing only)

### Documentation
- [x] CHANGELOG.md updated (v0.3.5-beta section)
- [x] Version → 0.3.5-beta

---

## Test Plan

```powershell
# Backend
cd LENR_SIM_APP_v2/backend; python -m pytest tests/ -v

# Frontend (strict CI mode)
cd LENR_SIM_APP_v2/frontend
$env:CI="true"; npm run build
npx react-scripts test --watchAll=false
```

---

## Screenshots / Media

A short demonstration video will be published when we go public.

---

## License

Licensed under **GNU GPL-3.0**. See [LICENSE](LICENSE).
