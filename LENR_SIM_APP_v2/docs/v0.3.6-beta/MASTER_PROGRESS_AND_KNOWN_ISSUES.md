# v0.3.6-beta Master Progress and Known Issues

## Progress Snapshot (2026-08-23 public readiness)
- Theory Testbed primary **All / None** shipped on `TheoryTogglePanel`.
- Frontend Docker image builds again (Vite `dist/`, `.npmrc`, `.dockerignore`).
- Release quality gate re-run locally: science gates 55 passed; frontend 201 tests;
  npm high audit clean; pip-audit clean under documented ignores.
- Live cloud deploy remains operator PENDING.

## Progress Snapshot
- Contract canonicalization is complete for unified bubble-lattice payloads (`contract_version`, canonical timeline aliases, observables bridge).
- Frontend parity is aligned to backend-authoritative fields in Unified Theory views and Three.js consumers.
- Electrolyte phase-1 model is integrated end-to-end with bounded diagnostics and regime flags.
- Duplicate zoom/home controls were reduced by limiting touch control buttons to mobile only; adaptive scale transitions are tuned by orbit-target distance.
- Frontend build toolchain migrated from CRA to Vite (`start/dev/build/preview` scripts and proxy/websocket behavior validated).

## Verification Snapshot (2026-08-23 public readiness)
- Version markers: all `0.3.6-beta`.
- Backend science gates: **55 passed**.
- Frontend suite: `npm test` -> **201 passed** (30 suites).
- Frontend lint: `npm run lint` -> `0 errors, 506 warnings`.
- Frontend build: `CI=true npm run build` -> PASS.
- Frontend audit: `npm audit --audit-level=high` -> **0 vulnerabilities** (2 moderate react-router residuals).
- Backend audit: `pip-audit` -> clean under CI ignore list (11 ignored).
- Docker: backend + frontend images build locally.

## Verification Snapshot (2026-07-18 ship-prep, full local CI mirror)
- Backend full suite: `python -m pytest tests/` -> **354 passed, 1 skipped** (pinned web stack fastapi 0.128.0 / starlette 0.49.1 / pydantic 2.10.3).
- Backend science/contract gates: **39 passed** (rate-engine API, benchmark gates, simulation pipeline, run-export, experiment-anchored gates).
- Frontend suite: `npm test` -> **103 passed** (15 suites).
- Frontend lint: `npm run lint` -> `0 errors, 567 warnings`.
- Frontend build: `CI=true npm run build` -> PASS (chunk-split, no size warning).
- Frontend audit: `npm audit --audit-level=high` -> **0 vulnerabilities**.

## Security Snapshot
- Frontend `npm audit --audit-level=high` -> **0 vulnerabilities** (2026-08-23); 2 moderate `react-router` advisories remain outside the high gate.
- Backend `pip-audit` clean under documented CI ignores (2026-08-23).

## Known Issues
- ~~Frontend Docker image failed (CRA `build/` path + missing `.npmrc` during `npm ci`)~~ **RESOLVED (2026-08-23)**.
- Lint warning backlog remains high in legacy frontend modules; cleanup is recommended before GA hardening.
- Backend advisory residue requires wider version movement than this beta scope (notably transitive lines behind documented pip-audit ignores).
- Moderate `react-router` advisories remain; upgrade path tracked for a post-beta maintenance slice (high gate still clean).
- Live public VPS cutover still operator PENDING.

## Next Recommended Actions
- Execute operator public deployment runbook (`PUBLIC_DEPLOYMENT_TRACKER.md`).
- Run a targeted lint cleanup pass on high-churn visualization and context modules first.
- Revisit Python transitive advisory remediation and react-router moderate advisories in the post-beta maintenance slice.
