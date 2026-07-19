# v0.3.6-beta Master Progress and Known Issues

## Progress Snapshot
- Contract canonicalization is complete for unified bubble-lattice payloads (`contract_version`, canonical timeline aliases, observables bridge).
- Frontend parity is aligned to backend-authoritative fields in Unified Theory views and Three.js consumers.
- Electrolyte phase-1 model is integrated end-to-end with bounded diagnostics and regime flags.
- Duplicate zoom/home controls were reduced by limiting touch control buttons to mobile only; adaptive scale transitions are tuned by orbit-target distance.
- Frontend build toolchain migrated from CRA to Vite (`start/dev/build/preview` scripts and proxy/websocket behavior validated).

## Verification Snapshot (Latest Local)
- Backend theory suite: `pytest tests/test_theory_modules.py -q` -> `93 passed, 1 skipped`.
- Backend integration guardrail suite: `pytest tests/test_scientific_guardrails.py tests/test_integration/test_simulation_pipeline.py -q` -> `23 passed`.
- Frontend targeted suite: `npm test -- src/pages/UnifiedTheoryPage.test.jsx` -> `1 suite, 4 passed`.
- Frontend production build: `npm run build` -> PASS (Vite output in `dist/`).
- Frontend lint gate: `npm run lint` -> PASS with warnings (`564 warnings`, `0 errors`).

## Security Snapshot
- Frontend `npm audit` reduced to `6` findings (`4 low`, `2 moderate`, `0 high/critical`) after safe upgrades.
- Backend `pip-audit -r requirements.txt` reduced to `4` findings in `pytest`, transitive `pyasn1`, and transitive `starlette`.
- Safe backend dependency upgrades completed for:
  - `python-multipart` -> `0.0.26`
  - `python-jose[cryptography]` -> `3.4.0`
  - `python-dotenv` -> `1.2.2`
  - `jinja2` -> `3.1.6`

## Known Issues
- Vite emits a CJS Node API deprecation warning on current Node runtime (`20.12.0`); non-blocking but upgrade is recommended.
- Bundle-size warnings remain for large chunks (`index` and `three.module`) and should be reduced via code splitting/manual chunks.
- Lint warning backlog remains high in legacy frontend modules; cleanup is recommended before GA hardening.
- Backend advisory residue requires wider version movement than this beta scope (notably `pytest` major and `starlette` transitive line).

## Next Recommended Actions
- Add `manualChunks` strategy in `vite.config.js` for Three.js and analytics-heavy routes.
- Run a targeted lint cleanup pass on high-churn visualization and context modules first.
- Execute full backend + frontend regression matrix once final docs and evidence pack are frozen.
- Revisit Python transitive advisory remediation in the post-beta maintenance slice.
