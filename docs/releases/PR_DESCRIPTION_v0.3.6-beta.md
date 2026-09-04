# Release v0.3.6-beta - Unified Contract, Electrolyte Guardrails, and Vite Hardening

## What this release does
- Finalizes canonical backend/frontend contract alignment for Unified Theory and bubble-lattice payloads (`contract_version`, canonical timeline aliases, observables bridge).
- Completes phase-1 electrolyte propagation with bounded diagnostics and regime flags across API responses, websocket streams, frontend payloads, and theory execution context.
- Resolves visualization UI overlap by moving desktop zoom controls into the right-side control stack under layer/legend toggles.
- Migrates frontend toolchain from CRA to Vite within `v0.3.6-beta` scope, including scripts, proxy/websocket behavior, and compatibility shims for existing `REACT_APP_*` usage.
- Refreshes release evidence, verification, and known-issues documents to reflect the post-migration security/test posture.

## Branching
- Base: `main`
- Compare: `lenr_sim_app_v0.3.6-beta`

## Key technical highlights
- **Contract canonicalization**
  - Unified bubble-lattice response includes stable aliases (`radius_um`, `temperature_k`, `electric_field_v_m`, `pressure_bar`).
  - Canonical top-level `electrolyte` request contract is supported with backward-compatible lattice fallback.
  - `observables_bridge`, `electrolyte_diagnostics`, and regime-validity flags now carry bounded electrolyte context consistently.
- **Electrolyte phase-1**
  - Added bounded proxy fields: `solvent_type`, `ph_proxy`, `ionic_strength_proxy`.
  - Added integration assertion for canonical top-level electrolyte override behavior.
- **Frontend migration**
  - Replaced `react-scripts` workflow with Vite (`start/dev/build/preview`).
  - Added `vite.config.js` with API + websocket proxying and env compatibility defines.
  - Migrated root entry to `src/index.jsx`; restored explicit Jest/Babel/ESLint dependency tooling.
- **Security continuation**
  - Frontend safe upgrades include Axios + Vite patch-line updates.
  - Backend safe upgrades include `python-multipart`, `python-jose`, `python-dotenv`, and `jinja2`.

## Verification snapshot (latest local)
- Backend theory suite: `pytest tests/test_theory_modules.py -q` -> `93 passed, 1 skipped`
- Backend guardrails/integration: `pytest tests/test_scientific_guardrails.py tests/test_integration/test_simulation_pipeline.py -q` -> `23 passed`
- Frontend targeted tests: `npm test -- src/pages/UnifiedTheoryPage.test.jsx` -> `4 passed`
- Frontend build: `npm run build` (Vite) -> PASS
- Frontend lint: `npm run lint` -> PASS (warnings only)
- Frontend audit: `npm audit` -> `6 vulnerabilities (4 low, 2 moderate, 0 high/critical)`
- Backend audit: `pip-audit -r requirements.txt` -> `4 findings` (no critical)

## Release gates
- [ ] Backend unit/integration tests green
- [ ] Frontend lint/test/build green
- [ ] Frontend high/critical vulnerability gate green
- [ ] Backend dependency audit green
- [ ] Verification gate report + release evidence pack updated
