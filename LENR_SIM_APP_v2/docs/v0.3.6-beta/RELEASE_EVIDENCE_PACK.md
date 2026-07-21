# Release Evidence Pack (v0.3.6-beta)

## Runtime Parity Evidence
- Unified Theory route tested at `http://localhost:3000/unified-theory`.
- Successful simulation run confirmed with `POST /api/unified/bubble-lattice` status `200`.
- UI state transition observed: controls lock during calculation and re-enable on completion; export/save actions enabled after run.

## Contract Evidence
- Theory pipeline responses include `contract_version: v0.3.6-beta-science-gate-1`.
- Unified simulate responses include:
  - `contract_version`
  - `validation.route_mode`
  - `analytics_transparency.electrolyte_family`
  - `analytics_transparency.electrolyte_species`
  - `analytics_transparency.electrolyte_diagnostics`
  - `observables_bridge`
- Bubble-lattice responses include bounded electrolyte flags:
  - `regime_validity_flags`
  - `unsupported_extrapolation_flags`
  - `electrolyte_diagnostics`
  - `validation.contradiction_reason_code`
- Theory-pipeline responses include composition provenance:
  - `composition_provenance.combination_rule`
  - `composition_provenance.applied_groups`
  - `composition_provenance.excluded_theories`

## Reproducible Contradiction Traces
- **Non-contradictory reference trace**
  - Endpoint: `POST /api/unified/bubble-lattice`
  - Expectation: `validation.contradiction=false`, `validation.contradiction_reason_code=none`
  - Condition: peak enhancement at/near cap still yields `proton_phases.NUCLEAR > 0`
- **Contradictory-classified trace**
  - Endpoint: `POST /api/unified/bubble-lattice`
  - Expectation: contradiction reason from taxonomy (`threshold_boundary`, `missing_phase_data`, `inconsistent_mode`) when applicable
  - Contract requirement: reason code always present, machine-readable

## Security and CI Evidence
- Frontend gate: `npm audit --audit-level=high` retained as blocker for high/critical vulnerabilities.
- Backend gate: `pip-audit -r requirements.txt` runs before the test matrix.
- Workflow includes explicit least-privilege permissions (`contents: read`) at both workflow and job scope.
- CI-level `version-consistency` job fails fast on mismatched version markers between
  `backend/core/config.py APP_VERSION`, `frontend/package.json`, `frontend/src/config/version.js`,
  and `Dockerfile.backend BUILD_VERSION`.
- `.github/dependabot.yml` enables weekly pip/npm updates and monthly github-actions and
  docker updates, grouped to minimise PR churn (mui, react-three, testing).
- Frontend safe security upgrades applied in this pass:
  - `axios` upgraded to latest available release,
  - Vite upgraded to `6.4.3` (with `@vitejs/plugin-react` 4.7.0), which clears the dev-server `server.fs.deny` advisory on Node 20.12 **without** the semver-major Vite 8 jump; `npm audit --audit-level=high` now reports **0 vulnerabilities**.
- Added a scheduled `security-scan.yml` (weekly `pip-audit` + `npm audit`) and a PR `dependency-review` gate alongside the existing audit blockers.
- Hostinger VPS deployment readiness is tracked in `PUBLIC_DEPLOYMENT_TRACKER.md` with explicit phase mapping (4.1-4.5) and operator-owned blockers.

## Ship-Prep Evidence (2026-07-18)
- Release body committed in seven reviewable, conventional-commit slices on `ux-ui-v0.3.6-beta-scale-calibration` (physics engine + tests; route consolidation + contract fix; frontend Vite/governance/analytics; infra/CI; docs/evidence; `.cursor` rules/skills; gitignore).
- Correctness: `contract_version` on `/api/unified/bubble-lattice` and the physics-update websocket fixed to the canonical `v0.3.6-beta-science-gate-1` (matches `/simulate`, `theory_pipeline`, and `DATA_CONTRACT_LOCK.md`).
- Performance: `vite.config.js` `manualChunks` vendor splitting; entry `index` chunk ~88 kB (gzip ~26 kB).
- Full local CI mirror (Node 20.12, pinned backend web stack):
  - Backend `python -m pytest tests/` -> **354 passed, 1 skipped**.
  - Frontend `npm test` -> **103 passed** (15 suites); `npm run lint` -> **0 errors** (567 legacy warnings); `CI=true npm run build` -> **PASS**; `npm audit --audit-level=high` -> **0 vulnerabilities**.

## UI Library Consolidation Evidence (antd -> MUI, 2026-07-18)
- Migrated the remaining active-route antd views to MUI (`NewSimulation`, `SimulationDetail`, `ParameterControls`, `SimulationResults`, `VisualizationStream`, `VisualizationTest`, `layout/AppLayout`, `common/ErrorBoundary`) with behavior-preserving equivalents (controlled-state form validation; sortable/paginated MUI `Table`; `ToggleButtonGroup`; MUI `Tabs`).
- Import-graph-gated and deleted the unrouted legacy antd cluster and orphaned tests; removed `utils/antdPatch.js` (+ `index.jsx` init) and the `antd` vite chunk branch.
- Dropped `antd` + `@ant-design/icons` (and the unused `lodash`); `npm install` pruned 65 packages. App is now single-UI-library (MUI); `antd` is absent from the production bundle.
- Refactor-delta CI mirror (Node 20.12):
  - Backend `python -m pytest tests/ app/tests/` -> **667 passed, 9 skipped** (unchanged; backend untouched).
  - Frontend `npm run lint` -> **0 errors** (567 legacy warnings); `CI=true npm run build` -> **PASS** (no `antd` chunk; entry `index` ~90 kB / gzip ~26 kB); `npm test` -> **90 passed** (13 suites); `npm audit --audit-level=high` -> **0 vulnerabilities**.

## Scoring and Governance Evidence
- `claim_tier` and `evidence_class` chips rendered in `TheoryTogglePanel.tsx` with
  hover explanations so operators see the orthogonal axes at a glance.
- Scoring engine applies `CLAIM_TIER_MULTIPLIER` to both applicable and inapplicable
  paths; cross-regime lines are visible in output but cannot silently dominate
  LENR-grounded tracks.  See `RUBRIC_GOVERNANCE.md` for the semantics tables.
- Stellar-scaling MHD context line registered as `stellar_scaling_mhd` with:
  - strict astrophysical applicability gate (T ≥ 1e6 K, B ≥ 1e4 T, n ≥ 1e24 /m³),
  - isolated composition group `context_line` so it never multiplies into LENR-
    grounded `screening`/`confinement`/`coherence` groups,
  - explicit falsification criteria and transparency fields
    (`extrapolation_penalty`, `stellar_contribution_log10`).

## Automated-Test Evidence (v0.3.6-beta)
- Backend: `python -m pytest tests/test_theory_modules.py -q` → **93 passed, 1 skipped**.
- Backend integration: `python -m pytest tests/test_scientific_guardrails.py tests/test_integration/test_simulation_pipeline.py -q` → **23 passed**.
- Frontend targeted: `npm test -- src/pages/UnifiedTheoryPage.test.jsx` → **1 suite / 4 tests passed**.
- Frontend build: `npm run build` (Vite) → **PASS**.
- Coverage of stellar-scaling guardrails: `tests/test_theory_modules.py::TestStellarScalingMHD` (6 tests).
- Coverage of scientific guardrails / electrolyte species: `tests/test_scientific_guardrails.py` (7 tests).
- Coverage of physics benchmark gates: `tests/test_integration/test_physics_benchmark_gates.py`.
- Coverage of simulation-pipeline contract: `tests/test_integration/test_simulation_pipeline.py` (includes canonical top-level electrolyte propagation assertion).

## Residual Risk Statement
- Vite is now the selected frontend build tool for v0.3.6-beta.
- Residual frontend advisories are low/moderate only and currently concentrated in dev-tool chains (`vite`/`esbuild`, `jest-environment-jsdom` lineage).
- Advanced electrochemistry (full speciation and transport) is out of scope for this beta
  and remains deferred; Phase-1 salt modifiers are bounded to the [0.7, 1.2] activity window.
- Legacy/experimental websocket consumers still require long-term convergence, but base URL
  and connection generation are now centralized through `resolveApiUrl`.
- Stellar-scaling track is intentionally included only as a *context line*; operators must
  interpret its output as comparative and not as an LENR mechanism claim.

## Branch Governance Evidence (2026-05-19)
- Merge order frozen for this cycle:
  1. `ux-ui-v0.3.6-beta-scale-calibration` visualization updates
  2. refactor/security hardening deltas on top
  3. release validation gate before Hostinger execution
- Branch topology verified from origin:
  - release: `lenr_sim_app_v0.3.6-beta`
  - UX/UI: `ux-ui-v0.3.6-beta-scale-calibration`
  - refactor integration: `cursor/v0.3.6-beta-refactor-viz-physics-3122`
- Conflict/risk mapping recorded in `PR26_CONFLICT_MAP.md`.

## Refactor Audit Delta (2026-05-19)
- Verified still-complete from refactor plan:
  - dead routers/API dead routes removed
  - `PhysicsModelRegistry.tsx` removed, `.ts` canonical
  - `theoryVisualizationMap.js` present
  - `parkhomov_validation.py` present
  - `docs/v0.3.6-beta/CODEBASE_MAP.md` present
  - `transmutation_validation` contract fields wired in unified routes
- No regressions detected in those completion markers.

## Frontend Aggregation/Proxy Root-Cause + Fix Evidence
- Root cause observed:
  - Vite proxy `/api/health` produced `ECONNREFUSED` when backend process was not bound to expected local port.
  - Startup scripts and environment routing were not consistently propagating dev API target.
- Fixes applied:
  - `frontend/vite.config.js` now resolves proxy target from `VITE_API_URL` then `REACT_APP_API_URL`, falling back to `http://127.0.0.1:8010`.
  - `frontend/src/config/api.js` now supports both Vite and legacy env keys with Jest-safe env detection.
  - `frontend/src/api/simulationApi.js` defers health probing until first real API call (prevents startup-time proxy spam).
  - `start_app.bat` and `start_local.ps1` now set both `REACT_APP_API_URL` and `VITE_API_URL` to `http://localhost:8010`.
- Verification:
  - `GET http://127.0.0.1:8010/api/health` -> 200
  - `GET http://127.0.0.1:3000/api/health` (via proxy) -> 200
  - `POST http://127.0.0.1:8010/api/unified/bubble-lattice` -> 200
  - `GET http://127.0.0.1:3000/unified-theory` -> 200

## Security Triage Evidence (2026-05-19)
- Backend (`pip-audit`) before patch: 5 vulnerabilities in 4 packages.
- Backend dependency updates applied in `backend/requirements.txt`:
  - `fastapi==0.128.0`
  - `starlette==0.49.1`
  - `python-multipart==0.0.29`
  - `pytest==9.0.3`
  - `pytest-asyncio==1.3.0`
  - `python-jose[cryptography]==3.5.0`
- Backend (`pip-audit`) after patch: **No known vulnerabilities found**.
- Frontend (`npm audit`) after non-breaking fix:
  - **0 high / 0 critical**
  - remaining: 4 low, 2 moderate (requires breaking major upgrades to `vite@8` and `jest-environment-jsdom@30`).
- CI security gate policy remains `npm audit --audit-level=high` (blocks high+ only), now satisfied.
- Added `.github/workflows/dependency-review.yml` using `actions/dependency-review-action@v4` with `fail-on-severity: high`.

## DevOps Hardening Evidence
- `docker-compose.yml` backend service now includes:
  - active healthcheck on `/api/health`
  - `restart: unless-stopped`
- Existing backend container hardening remains in `Dockerfile.backend`:
  - non-root runtime user (`appuser`)
  - image-level healthcheck
  - minimal runtime packages.

## Validation Matrix Update (2026-05-19)
- Frontend:
  - `npm run build` -> PASS
  - `npm test -- src/components/tests/QuantumFluxScaleBar.test.js --watchAll=false --runInBand` -> PASS (3/3)
  - `npm test -- src/pages/UnifiedTheoryPage.test.jsx --watchAll=false --runInBand` -> PASS (4/4)
  - `npm run lint` -> PASS with warnings only (no errors)
- Backend:
  - `python -m pytest tests/test_scientific_guardrails.py tests/test_integration/test_simulation_pipeline.py -q` -> PASS (24 passed)
  - `python -m pytest tests/test_theory_modules.py -q` -> PASS (93 passed, 1 skipped)

## Hostinger Go/No-Go Precheck
- Current state vs deployment prerequisites:
  - PR conflict/risk map: complete (`PR26_CONFLICT_MAP.md`)
  - security gates (high/critical): passing
  - E2E smoke + targeted matrix: passing
  - release evidence: updated
- Remaining operator-owned steps before Hostinger execution:
  - merge PR #26 in GitHub UI
  - execute external Terraform/Ansible/cloud actions per `hostinger_deployment_execution_0d3b6ed5.plan.md`.
