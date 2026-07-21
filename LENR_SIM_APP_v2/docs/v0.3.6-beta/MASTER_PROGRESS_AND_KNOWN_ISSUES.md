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

## Verification Snapshot (2026-07-18 ship-prep, full local CI mirror)
- Backend full suite: `python -m pytest tests/` -> **354 passed, 1 skipped** (pinned web stack fastapi 0.128.0 / starlette 0.49.1 / pydantic 2.10.3).
- Backend science/contract gates: **39 passed** (rate-engine API, benchmark gates, simulation pipeline, run-export, experiment-anchored gates).
- Frontend suite: `npm test` -> **103 passed** (15 suites).
- Frontend lint: `npm run lint` -> `0 errors, 567 warnings`.
- Frontend build: `CI=true npm run build` -> PASS (chunk-split, no size warning).
- Frontend audit: `npm audit --audit-level=high` -> **0 vulnerabilities**.

## Verification Snapshot (2026-07-18 antd -> MUI consolidation, refactor delta)
- Backend full suite: `python -m pytest tests/ app/tests/` -> **667 passed, 9 skipped** (unchanged; backend not touched by the refactor).
- Frontend suite: `npm test` -> **90 passed** (13 suites; the 2 legacy antd-cluster test files were removed with their components).
- Frontend lint: `npm run lint` -> `0 errors, 567 warnings`.
- Frontend build: `CI=true npm run build` -> PASS; **no `antd` chunk**, entry `index` ~90 kB (gzip ~26 kB).
- Frontend audit: `npm audit --audit-level=high` -> **0 vulnerabilities** (65 packages pruned after dropping `antd`/`@ant-design/icons`/`lodash`).
- Result: app is now single-UI-library (MUI); `antd` no longer appears in the production bundle.

## Security Snapshot
- Frontend `npm audit --audit-level=high` -> **0 vulnerabilities** (2026-07-18) after the Vite 5 -> 6.4.3 upgrade cleared the last dev-server high; previously `6` low/moderate findings after safe upgrades.
- Backend `pip-audit -r requirements.txt` reduced to `4` findings in `pytest`, transitive `pyasn1`, and transitive `starlette`.
- Safe backend dependency upgrades completed for:
  - `python-multipart` -> `0.0.26`
  - `python-jose[cryptography]` -> `3.4.0`
  - `python-dotenv` -> `1.2.2`
  - `jinja2` -> `3.1.6`

## Known Issues
- ~~Vite emits a CJS Node API deprecation warning on current Node runtime (`20.12.0`)~~ **RESOLVED (2026-07-18)**: Vite 6.4.3 drops the CJS Node API; no deprecation warning on Node 20.12.
- ~~Bundle-size warnings remain for large chunks (`index` and `three.module`)~~ **RESOLVED (2026-07-18)**: `manualChunks` in `vite.config.js` splits three/mui/charts/markdown/react-vendor; entry `index` ~90 kB. (`three`/`vendor` remain inherently large for a 3D viz app.)
- ~~Dual UI libraries (antd + MUI) inflate the bundle; antd removal deferred to v0.3.7~~ **RESOLVED (2026-07-18)**: antd fully removed this release (single-UI-library MUI; no `antd` in the bundle).
- Lint warning backlog remains high in legacy frontend modules; cleanup is recommended before GA hardening.
- Backend advisory residue requires wider version movement than this beta scope (notably `pytest` major and `starlette` transitive line).

## Next Recommended Actions
- ~~Add `manualChunks` strategy in `vite.config.js` for Three.js and analytics-heavy routes.~~ **DONE (2026-07-18)**: vendor splitting implemented (three/mui/charts/markdown/react-vendor).
- ~~Retire Ant Design in favor of MUI to drop the dual-UI-library overhead.~~ **DONE (2026-07-18)**: antd + `@ant-design/icons` removed; all routes on MUI.
- Run a targeted lint cleanup pass on high-churn visualization and context modules first.
- Execute full backend + frontend regression matrix once final docs and evidence pack are frozen.
- Revisit Python transitive advisory remediation in the post-beta maintenance slice.
