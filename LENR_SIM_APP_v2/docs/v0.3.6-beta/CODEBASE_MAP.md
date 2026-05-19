# Codebase Map (v0.3.6-beta)

## Backend entry

- FastAPI app: `backend/app/main.py`
- Primary unified routes: `backend/app/api/routes/unified_simulation.py`
  - `POST /api/unified/simulate`
  - `POST /api/unified/bubble-lattice`
- Theory pipeline registration: `backend/app/physics_engine/theory_pipeline.py`
- Parkhomov-style validation helper: `backend/app/physics_engine/parkhomov_validation.py`

## Frontend entry

- CRA app shell: `frontend/src/App.tsx` (routes and lazy pages)
- Unified theory UI: `frontend/src/pages/UnifiedTheoryPage.jsx`
- Primary 3D scene: `frontend/src/components/visualizations/UnifiedBubbleLatticeVisualization.jsx`
- Theory ↔ legend map: `frontend/src/config/theoryVisualizationMap.js`
- API base URL: `frontend/src/config/api.js` (and `frontend/src/setupProxy.js` for dev proxy target)

## Tests

- Backend integration / gates: `backend/tests/` and `backend/app/tests/` (both listed in `backend/pytest.ini` `testpaths`)
- Frontend: Jest tests colocated under `frontend/src` (e.g. `*.test.jsx`)

## Removed in this beta hygiene pass

- Unmounted routers under `backend/app/routers/` (legacy simulation/preset/parameters duplicates)
- Unmounted API route stubs: `backend/app/api/routes/visualizations.py`, `test_physics.py`
- Duplicate `PhysicsModelRegistry.tsx`, stub `VisualizationTest.tsx`, duplicate `ErrorBoundary.jsx`, unused `utils/ErrorBoundary.js`, unused `ProtonPhaseSystem.js`
