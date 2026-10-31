# Verification Gate Report (v0.3.6-beta)

## v0.3.9-beta pre-launch RQG (2026-10-26) — H2c promote pack

Train: `dev` tip `64d0157` (markers **`0.3.9-beta`**). Live Compose share /
`main` remain **0.3.8-beta**. **`CONFIRM_SWARM_0_3_9` unset** — this section is
governance evidence for a future promote, not a cutover arm.

Science claim text / `EQ-OPEN-*` rows were **not** rewritten in this ops pack.

### Version consistency
- Four markers: `config.py`, `frontend/package.json`, `version.js`,
  `Dockerfile.backend` → all `0.3.9-beta`
- Status: **PASS**

### Backend dependency audit
- Command: `pip-audit -r requirements.txt` with the `test.yml` /
  `security-scan.yml` ignore list
- Result: `No known vulnerabilities found, 13 ignored`
- Raw (unignored) residuals: `starlette 0.49.1` (PYSEC-2026-161/248/249/2280/2281),
  `python-jose 3.5.0` (`CVE-2026-85394` / alias `PYSEC-2026-4298`),
  `ecdsa 0.19.2` (PYSEC-2026-1325). Triaged in `SECURITY_CI_HARDENING.md`
  (upstream-constrained; not waived silently).
- Status: **PASS** (CI-aligned ignores)

### Release-blocking science gates
- `test_physics_benchmark_gates.py`: **3 passed**
- Experiment-anchored set (`test_experiment_anchored_gates`, `test_rate_engine_api`,
  `test_reaction_rate_engine`, `test_cavitation_kgrp`, `test_shell_pairing_prior`,
  `test_run_export`): **53 passed**
- Combined: **56 passed**; none skipped / xfailed
- Status: **PASS**

### Backend unit
- Command: `pytest tests/ app/tests/ -q -o addopts=""`
- Result: **1170 passed, 9 skipped** (~24 min)
- Status: **PASS**

### Frontend
- `npm audit --audit-level=high`: **exit 0** (4 moderate residuals: `fast-uri`,
  `postcss-selector-parser`, `react-router` / `react-router-dom`)
- `npm run lint`: **0 errors** / 506 warnings
- `npm test`: **42 suites / 264 tests passed**
- `npm run build`: **PASS**
- Status: **PASS**

### Reproducibility contract
- Export envelope remains `schema_version: lenr-run-export-v1`
  (`test_run_export.py` **5 passed**). No non-additive `contract_version` change
  in this pack.
- Status: **PASS**

### Cutover / share posture
- Do **not** arm `CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9` from this evidence alone.
- Public Compose share stays **0.3.8-beta** until an announced cutover window.

---

## Public beta VPS slice (2026-09-02)

Ship branch `consciousenergy/vps-public-beta-e822`. Topology:
same-origin Compose (Caddy + nginx SPA + FastAPI + Postgres) on
`185.211.4.66`. Intended name `https://lenr-simp-app.conscious.energy` is a
CNAME to WordPress apex (not this VPS). Live A record:
`lenr-sim-beta.conscious.energy`. Interim TLS: `https://srv1280333.hstgr.cloud`.
Health must be `"status":"healthy"` (not merely HTTP 200) — `env_file` fallback
to `.env.production.example` caused `password authentication failed` until
compose interpolated `/opt/lenr-sim/.env`.

### Version consistency
- Four markers still `0.3.6-beta`. Status: **PASS**

### Backend
- Science gates (experiment-anchored + V&V): **55 passed**
- Full `pytest tests/ app/tests/` after compute-guard slice: **1095 passed, 9 skipped**
- New: `tests/test_integration/test_compute_guard.py` (18) — semaphore 503,
  multi-physics 422/503, WS `duration_steps` cap, export envelope
  `schema_version: lenr-run-export-v1` unchanged
- Status: **PASS**

### Frontend
- `npm run lint`: 0 errors
- `npm audit --audit-level=high`: 0 high (3 moderate residuals)
- `vite build`: PASS
- Jest: `src/config/api.test.js` + `BetaNotice.test.jsx` **8 passed**
- Status: **PASS** (full `npm test` / Playwright CI on the PR)

### Production contract (must hold after cutover)
- `GET /api/health` 200 `version: 0.3.6-beta`
- `GET /api/docs`, `/api/openapi.json`, `/metrics` **404**
- SPA `/unified-theory` 200; beta banner visible
- Live probe results: recorded in this section after first deploy

---

## Public release readiness review (2026-08-31)

Re-ran gates on product HEAD `d6be618` (`lenr_sim_app_v0.3.6-beta`). Specialist ledgers: [review-2026-08/](review-2026-08/). Synthesis: [PUBLIC_RELEASE_REVIEW_2026-08.md](PUBLIC_RELEASE_REVIEW_2026-08.md).

**Public cutover: NO-GO.** Pytest/npm/pip-audit/IR gates are green. Pages branch, GHCR `:latest`, live WordPress.com DNS, Traefik dashboard placeholder auth, and `/bubble-fusion` `1e13` chip fail the go-live rubric.

### Version consistency
- Markers: `config.py`, `frontend/package.json`, `version.js`, `Dockerfile.backend`
- Result: all `0.3.6-beta`
- Status: **PASS**

### Backend security audit
- Command: `pip-audit -r requirements.txt` with the `test.yml` ignore list
- Result: `No known vulnerabilities found, 11 ignored`
- Unfiltered: 11 findings in starlette 0.49.1, vtk 9.4.2, ecdsa 0.19.2 (accepted residual; no new IDs)
- Status: **PASS** (residuals in `SECURITY_CI_HARDENING.md`)

### Release-blocking science gates
- V&V `test_physics_benchmark_gates.py`: **3 passed**
- Experiment-anchored set: **52 passed**
- Combined: **55 passed** (matches 08-23)
- Status: **PASS**

### Backend unit
- Command: `pytest tests/ app/tests/` (coverage on)
- Result: **1077 passed, 9 skipped**
- Status: **PASS** (new recorded baseline)

### Formalization
- `check_ir.py`: IR 51, taxonomy 75, **PASS**
- `diff_code_literals.py`: **PASS**
- Local `lake build`: skipped (elan absent on this VM)
- CI `formalization` job on `d6be618`: **success** (run `33132075488`, 2026-08-28), includes `lake build`
- Status: **PASS** (CI is the lake oracle)

### Frontend security / quality
- `npm audit --audit-level=high` → **0 high/critical** (2 moderate `react-router`)
- `npm run lint` → **0 errors**, 506 warnings (unchanged vs 08-23)
- `npm test -- --watchAll=false --runInBand` → **210 passed** (32 suites; 08-23 was 201 / 30)
- `CI=true npm run build` → **PASS**
- Playwright: **25 passed, 2 failed**, not in `test.yml`
- Status: **PASS** for Jest/lint/audit/build; **HOLD** for E2E-in-CI

### Analytics honesty
- `test_production_hardening.py` + honest-metrics + history-honesty + pack size lock: **20 passed**
- Demo pack: 150 experiments / 132 theory_runs; `lenr_proved: false`
- Status: **PASS**

### Public deployment (Wave 2 snapshot)
- Code/infra at review HEAD: **NOT READY** to apply as committed
- Live Cloudflare/Hostinger cutover: **operator PENDING** and blocked on WordPress.com DNS
- Science honesty at review HEAD: **NO-GO** until `/bubble-fusion` stops fabricating `1e13`

## Wave 3 code cutover fixes (2026-08-31, same branch)

Implemented confirmed code blockers on `consciousenergy/public-release-review-7a95`. Live DNS remains **NO-GO**.

| Check | Result |
|---|---|
| SCI-001 bubble-fusion no `1e13` default | **PASS** — Jest `BubbleFusionPage.test.jsx`; UI chip `Enhancement: not provided` on local fallback |
| Pages `production_branch` + `BUILD_VERSION=0.3.6-beta` | **PASS** in Terraform + `deploy.yml` |
| Traefik dashboard / placeholder auth | **PASS** — dashboard off |
| Dual Traefik CORS | **PASS** — `backend-cors` removed |
| Playwright Chromium | **27 passed** in 35.1s; job `frontend-e2e` in `test.yml` |
| Science + production-hardening quiet pytest | **64 passed** in 6.99s |
| `CI=true npm run build` | **PASS** — `dist/` contains `_headers`, `_redirects`, `robots.txt` |

### What this review did not discharge
- `EQ-OPEN-MEV-01` … `EQ-OPEN-YIELD-01` remain OPEN (accepted residual)
- FastAPI/Starlette majors, vtk via PyVista, React Router 7
- Live `terraform apply` / Hostinger / GHAS enablement
- `--preset full` / full `diverse`

---

## Public release readiness review (2026-08-23)

### Version consistency
- Markers: `config.py`, `frontend/package.json`, `version.js`, `Dockerfile.backend`
- Result: all `0.3.6-beta`
- Status: **PASS**

### Backend security audit
- Command: `pip-audit -r requirements.txt` with CI ignore list
  (`PYSEC-2026-161`, `PYSEC-2026-248`, `PYSEC-2026-249`, `PYSEC-2026-2280`,
  `PYSEC-2026-2281`, `PYSEC-2025-224`, `PYSEC-2025-225`, `PYSEC-2025-226`,
  `PYSEC-2026-1325`)
- Result: `No known vulnerabilities found, 11 ignored`
- Status: **PASS** (residuals documented in `SECURITY_CI_HARDENING.md`)

### Release-blocking science gates
- Command: pytest on experiment-anchored gates, rate-engine API, reaction rate
  engine, cavitation KGRP, shell-pairing prior, run-export, physics benchmark gates
- Result: **55 passed**
- Status: **PASS**

### Frontend security / quality
- `npm audit --audit-level=high` → **0 high/critical** (2 moderate `react-router`
  advisories remain as documented residual; gate is high+)
- `npm run lint` → **0 errors**, 506 warnings (legacy residual)
- `npm test -- --watchAll=false --runInBand` → **201 passed** (30 suites)
- `CI=true npm run build` → **PASS** (Vite `dist/`)
- Status: **PASS**

### Docker images
- `Dockerfile.backend` → `lenr-sim-backend:0.3.6-beta` **PASS**
- `Dockerfile.frontend` → `lenr-sim-frontend:0.3.6-beta` **PASS**
  (fixes: Vite `dist/` path, `.npmrc` before `npm ci`, `.dockerignore` allows
  `frontend/` sources)
- Status: **PASS**

### UX slice
- Primary LENR theories **All** / **None** on `TheoryTogglePanel` (primary-scoped)
- Unit tests: `TheoryTogglePanel.test.jsx` **3 passed**

### Public deployment
- Code/infra: READY
- Live Cloudflare/Hostinger cutover: still **operator PENDING**
  (`PUBLIC_DEPLOYMENT_TRACKER.md`)

---

## Automated Checks

### Backend
- Command: `python -m pytest -q`
- Result: `93 passed, 1 skipped` (`tests/test_theory_modules.py`)
- Status: **PASS**

### Deterministic V&V benchmark gates
- Command: `python -m pytest tests/test_scientific_guardrails.py tests/test_integration/test_simulation_pipeline.py -q`
- Scope:
  - electrolyte support-level and bounded-guardrail behavior
  - canonical bubble-lattice response contract fields
  - top-level electrolyte override and observables bridge propagation
- Status: **PASS**

### Frontend tests
- Command: `npm test -- src/pages/UnifiedTheoryPage.test.jsx`
- Result: `4 passed, 0 failed`
- Status: **PASS**

### Frontend build + dev runtime
- Command: `npm run build`
- Result: Vite build succeeds and produces optimized assets under `dist/`.
- Command: `npm run dev -- --host --port 3001 --strictPort`
- Result: server starts; proxy warns when backend is unavailable (`/api/health` ECONNREFUSED).
- Status: **PASS** (expected proxy warning when backend is offline)

### Security posture (frontend, refreshed 2026-06-18)
- Command: `npm audit`
- Context: a fresh `npm install --legacy-peer-deps` (as run by `start_app.bat`) re-resolved
  the tree and newly published advisories raised the count to `30 (5 low, 22 moderate, 3 high)`.
- Remediation (no production-runtime breakage):
  - `npm audit fix` (non-breaking) cleared the production-relevant highs/moderates:
    `form-data` (CRLF injection, high), `ws` (DoS, high), `@babel/core` (arbitrary file read),
    `qs` (DoS), and `react-router`/`react-router-dom` (open redirect).
  - `overrides` bumped to forward-fixed versions: `@tootallnate/once ^2.0.1` (cleared the
    dev/test jsdom chain), `js-yaml ^4.2.0` (cleared the dev/test jest+eslint chain), and
    `esbuild ^0.25.0` (cleared the dev-server esbuild advisory).
- Result: `1 vulnerability (0 critical, 1 high, 0 moderate, 0 low)`.
- Remaining: `vite` high — `server.fs.deny` bypass on Windows alternate paths. This is a
  **dev-server-only** issue (no impact on the production static build). npm's only fix is
  `vite@8` (semver-major), which **requires Node >=20.19** while this project pins Node `20.12`,
  so the upgrade is deferred to a coordinated Node + Vite bump. Mitigation: do not expose the
  Vite dev server beyond localhost.
- Verification: `npm run build`, `npm run lint` (0 errors), and `npm test -- src/pages/UnifiedTheoryPage.test.jsx`
  (4 passed) all green after the overrides.
- Status: **PASS** (per v0.3.6 residual-risk policy: block high/critical for production; the
  single residual high is dev-server-only and toolchain-version-blocked).

### Backend dependency audit
- Command: `pip-audit -r requirements.txt`
- Result: reduced to 4 findings (`pytest`, transitive `pyasn1`, transitive `starlette`), no critical.
- Status: **PASS**

## Runtime UX/Science-Gate Checks
- Route/content synchronization review: **PASS**
- Analytics critical action (`View Details`) deterministic behavior: **PASS**
- Theory Testbed and visualization cohesion review: **PASS**
- Contract transparency fields present in UI (`contract_version`, confidence breakdown, uncertainty, falsification, observables bridge): **PASS**
- Duplicate zoom stack removed (mobile controls now only on mobile), adaptive scale transition tuned against orbit-target distance: **PASS**

## V&V Summary Table

| Check | Verification Status | Validation Dataset Status | Intended-use Limit |
|---|---|---|---|
| Bubble contradiction semantics | PASS | Synthetic deterministic fixture | For cap-boundary and phase-assignment consistency only |
| Theory composition overlap controls | PASS | Theory-pipeline overlap fixture | Does not claim physical exclusivity beyond configured groups |
| Rate/observable coherence contract | PASS | Integration test route assertions | Radiation outputs remain proxy bounds, not transport solves |
| Legacy vs pipeline parity drift | PASS | Mode parity fixture | Wide tolerance, regression sentinel not calibration proof |

## Known Residual Risks
- ~~Vite on Node `20.12.0` emits a CJS deprecation warning~~ **RESOLVED (2026-07-18)**: Vite 6.4.3 drops the CJS Node API, so no deprecation warning is emitted on Node 20.12.
- `npm run lint` currently reports a high warning count (`567 warnings`) in legacy files; this is non-blocking but should be reduced.
- Python residual advisories require major-version movement (`pytest`) or framework transitive upgrades (`starlette`); out of beta scope.
- ~~Frontend bundle size warnings remain (`index` and `three.module` chunks exceed 500 kB)~~ **RESOLVED (2026-07-18)**: `manualChunks` splits three/mui/charts/markdown/react-vendor; entry `index` ~90 kB (gzip ~26 kB), no build size warning. (`three`/`vendor` chunks are inherently large for a 3D viz app.)
- ~~Dual UI libraries (antd + MUI) increase bundle weight; antd removal deferred to v0.3.7~~ **RESOLVED (2026-07-18)**: antd fully removed this release; app is now single-UI-library (MUI) and `antd` no longer appears in the production bundle.

## 2026 Scientific Rigor Review & Remediation (RR-001..RR-020)

Tracked in `docs/REVIEW_2026/` (SCIENTIFIC_RIGOR_REVIEW.md, TRACEABILITY_MATRIX.md,
REFERENCES_AUDIT.md, MEV_GAP_HYPOTHESIS.md, CITATION_STANDARD.md).

### New automated coverage
- Command: `python -m pytest tests/test_integration/test_experiment_anchored_gates.py tests/test_integration/test_rate_engine_api.py tests/test_physics/test_reaction_rate_engine.py tests/test_physics/test_cavitation_kgrp.py tests/test_physics/test_shell_pairing_prior.py tests/test_physics/test_run_export.py -q`
- Result: **30 passed**
- Command (broad regression): `python -m pytest tests/test_integration tests/test_physics -q`
- Result: **149 passed**
- Status: **PASS**

### Findings closed (20/20)
- Severity A: RR-001, RR-002, RR-003, RR-006 (paper reconciliation + rate engine).
- Severity B: RR-004, RR-005, RR-007, RR-008, RR-009, RR-010, RR-011, RR-012,
  RR-013, RR-020 (citations, screening range, validation gates, MeV-gap
  hypothesis, KG-RP coupling, shell-pairing prior, canonical bibliography).
- Severity C: RR-014, RR-015, RR-016, RR-017, RR-018, RR-019 (model
  canonicalization, Hydroton deprecation, UI governance, run export, CI gates,
  UQ performance).

### New capabilities (all claim-tier gated, additive, backward-compatible)
- Reaction-rate engine: `two_body` (validated) + `trapped_state` (speculative)
  modes with Sobol + Bayesian UQ credible intervals (`reaction_rate_engine.py`,
  `reaction_rate_uq.py`).
- KG-RP harmonic-locking diagnostics + coupled field (`cavitation_kgrp.py`).
- Shell-structure nucleon-pairing branching prior (`shell_pairing_prior.py`),
  branching-only (no rate-magnitude change).
- `lenr-run-export-v1` reproducibility envelope (`run_export.py`, `/export`).
- UI: `ReactionRateGovernancePanel.tsx` surfaces rate CI + KG-RP + claim tiers.

### Known test-isolation note (pre-existing, NOT a regression)
- `app/tests/test_api_integration.py::TestPhysicsCalculations` (2 tests) pass in
  isolation and as a class but can return 429 under full-suite request flooding
  (rate-limiting middleware, 60 req/min). Unrelated to the 2026 additive changes;
  tracked for a CI test-isolation fix (e.g. disable rate limiting in `test` env
  or split request-heavy suites).

## Bubble-Lattice Reaction-Rate Engine E2E Integration (2026-06-07)

Verifies the additive `reaction_rate_engine` block surfaced through
`/api/unified/bubble-lattice` and the matching `UnifiedTheoryPage` controls.

### Backend
- Command: `python -m pytest tests/test_integration/test_rate_engine_api.py -q`
- Result: **8 passed** (5 existing + 3 new `/bubble-lattice` gates).
- New gates:
  - `test_bubble_lattice_default_includes_rate_and_kgrp`: default response carries a
    `two_body` rate block and a KG-RP diagnostics block; UQ is opt-in (absent by default).
  - `test_bubble_lattice_trapped_state_with_uncertainty`: `trapped_state` + UQ returns a
    speculative-tier rate with an ordered credible interval, seeded for reproducibility.
  - `test_bubble_lattice_response_is_backward_compatible`: legacy response fields are
    unchanged; the new block is purely additive.
- Command (regression): `python -m pytest tests/test_integration tests/test_theory_modules.py tests/test_scientific_guardrails.py app/physics_engine/unified_lenr_model -q`
- Result: **159 passed, 1 skipped**.
- Status: **PASS**

### Frontend
- Command: `npm run lint`
- Result: `0 errors, 566 warnings` (legacy-file warnings only; no errors from the new
  rate/UQ controls, panel, or glossary wiring).
- Command: `npm run build`
- Result: Vite build succeeds. A duplicate `glossaryOpen`/state-block declaration was
  caught by the build, de-duplicated in `UnifiedTheoryPage.jsx`, and the rebuild is clean.
- Status: **PASS**

## Ship-Prep Hardening (2026-07-18)

Final release-preparation pass on branch `ux-ui-v0.3.6-beta-scale-calibration`; committed in seven reviewable slices.

### Dependency / security hardening
- **Vite 5 -> 6.4.3** (with `@vitejs/plugin-react` 4.7.0): clears the dev-server `server.fs.deny` bypass advisory **without** the semver-major Vite 8 jump, so it **supersedes** the earlier "blocked until Node 20.19 / Vite 8" residual. No Node bump required (project stays on Node 20.12).
- `npm audit --audit-level=high` -> **0 vulnerabilities** (was 1 residual high).
- Added scheduled `security-scan.yml` (weekly `pip-audit` + `npm audit`), `dependabot.yml`, and a PR `dependency-review` gate.
- Aligned the backend web stack to pinned `fastapi==0.128.0`, `starlette==0.49.1`, `pydantic==2.10.3` for reproducible local + CI test runs.

### Build / performance
- `vite.config.js` `manualChunks` vendor splitting (three / mui / charts / markdown / react-vendor / vendor; the `antd` branch was removed once antd was retired below). Entry `index` chunk reduced to ~90 kB (gzip ~26 kB), resolving the prior bundle-size warning.

### Correctness
- Fixed `contract_version` on `/api/unified/bubble-lattice` and the physics-update websocket to the canonical `v0.3.6-beta-science-gate-1` (the computed value was missing the `v` prefix), matching `/simulate`, `theory_pipeline`, and `DATA_CONTRACT_LOCK.md`.

### Analytics
- Env-gated PostHog instrumentation (no-op without key / outside production / when `doNotTrack`), wired into simulation, theory-toggle, export, visualization, and docs flows. Transparency documented in `ANALYTICS_TRANSPARENCY.md`.

### Full local CI mirror (2026-07-18)
- Backend: `python -m pytest tests/` -> **354 passed, 1 skipped**.
- Frontend: `npm test` -> **103 passed** (15 suites); `npm run lint` -> **0 errors** (567 legacy warnings); `CI=true npm run build` -> **PASS** (chunk-split, no size warning); `npm audit --audit-level=high` -> **0 vulnerabilities**.
- Status: **PASS**

### UI library consolidation (antd -> MUI, 2026-07-18)
- Migrated the remaining active-route Ant Design views to Material-UI (`NewSimulation`, `SimulationDetail`, `ParameterControls`, `SimulationResults`, `VisualizationStream`, `VisualizationTest`, `layout/AppLayout`, `common/ErrorBoundary`); `ParameterControls` moved from antd `Form`/`useForm` to controlled state with equivalent range/required validation, and `SimulationResults` from antd `Table`/`Radio.Group`/`Tabs` to MUI `Table` (sortable + paginated) / `ToggleButtonGroup` / `Tabs`.
- Import-graph-gated and deleted the unrouted legacy antd cluster (`SimulationDashboard`, `SimulationMonitor`, `SimulationStatusPanel`, `SimulationVisualizer`, `VisualizationDashboard`, both `MainLayout` variants, root `AppLayout`/`AppHeader`/`AppSidebar`, `results/SimulationDetails`) plus their orphaned tests.
- Removed `utils/antdPatch.js` (+ its `index.jsx` init), the `antd` vite `manualChunks` branch, and the `antd` + `@ant-design/icons` dependencies (`npm install` removed 65 packages).
- App is now single-UI-library (MUI); `antd` no longer appears in the production bundle.
- Refactor-delta CI mirror: `npm run lint` -> **0 errors** (567 legacy warnings); `CI=true npm run build` -> **PASS** (no `antd` chunk; entry `index` ~90 kB / gzip ~26 kB); `npm test` -> **90 passed** (13 suites, after removing the 2 orphaned cluster tests); `npm audit --audit-level=high` -> **0 vulnerabilities**.
- Status: **PASS**

## Go/No-Go Statement
- For v0.3.6-beta science-gate baseline, current implementation is **GO with tracked residuals**:
  - no active high/critical frontend vulnerabilities,
  - deterministic runtime behavior for audited critical actions,
  - Vite migration validated (build/test/dev smoke),
  - uncertainty/falsification/observables contract exposed end-to-end,
  - 2026 rigor-review findings RR-001..RR-020 closed with 30 new passing gates,
  - ship-prep hardening (2026-07-18): Vite 6.4.3 (0 high vulns), bundle chunk-splitting, `contract_version` consistency fix; full local CI mirror green (backend 354 passed/1 skipped, frontend 103 passed).
  - UI consolidation (2026-07-18): antd fully removed in favor of MUI (single UI library, no `antd` in bundle); refactor-delta CI mirror green (lint 0 errors, build PASS, frontend 90 passed, 0 high vulns).


---

## Pre-Public Hardening Gate (2026-08-08)

Scope: PR #68 (`development` -> `main`). Physics accuracy, reporting honesty, UX
coherence, and the frontend security gate. Full command log in
`RELEASE_EVIDENCE_PACK.md`.

### Gate results

| Gate | Result |
|---|---|
| Version consistency (4 markers) | **PASS** - all `0.3.6-beta` |
| Backend `pip-audit` (9 documented ignores) | **PASS** - no known vulnerabilities |
| Backend `pytest tests/ app/tests/` | **PASS** - 749 passed, 9 skipped |
| Experiment-anchored science gates | **PASS** - 52 passed, none skipped/xfailed |
| Physics benchmark gates | **PASS** - 3 passed (assertions strengthened) |
| Bubble-dynamics reduction limits (new) | **PASS** - 18 passed |
| Frontend `npm audit --audit-level=high` | **PASS** - exit 0 (2 moderate, 0 high) |
| Frontend lint / test / build | **PASS** - 0 errors / 110 passed / build OK |
| Playwright E2E | **PASS** - 7 passed, stable over 3 runs |
| Export envelope | **PASS** - `lenr-run-export-v1` intact, changes additive |

### What this gate now additionally refuses to accept

The previous benchmark gate asserted only `enhancement_factor <= 1e5`, which a
silently flattened breakdown satisfies. It now also requires that saturated
mechanisms declare themselves and expose their uncapped magnitude, that peak
conditions name the ceilings bounding them, that proton phases form a normalised
distribution, and that every timeline point names its collapse model.

Three new reduction-limit gates assert agreement with results that do not depend on
this implementation at all (Rayleigh collapse time, Minnaert frequency, Blake
threshold, and Keller-Miksis reducing to Rayleigh-Plesset as `c -> infinity`). A
solver can pass every unit test and still be wrong; these fail when the physics is
wrong rather than merely inconsistent.

### Status: **PASS**

### Go/No-Go

**GO with tracked residuals** for the public release candidate, unchanged from the
prior baseline plus:

- moderate `react-router` / `react-router-dom` advisories remain; the fix requires a
  `react-router 7.18` major migration touching every route, deliberately deferred to
  its own slice rather than bundled here (rationale in `SECURITY_CI_HARDENING.md`)
- `ProtonPhaseModel.calculate_overlap_probability` needs renormalising; excluded from
  the proton-phase cascade in the meantime
- `solve_keller_miksis` is validated but not yet the default for the bubble-lattice
  route
- CI has not re-run on the pushed commits from this agent's token; a maintainer needs
  to re-trigger `Test and Benchmark` so PR #68 reflects the current HEAD

## Math-Accuracy Hardening Slice (2026-08-10)

Scope: pre-public math-accuracy pass (branch `cursor/math-accuracy-f130`,
PR #71 into `development`). Every command below was run locally on that
branch after the changes.

### Backend
- Command: `python -m pytest tests/ app/tests/ -q -o addopts=""`
- Result: `942 passed, 9 skipped` (was `918 passed, 4 failed` on the
  development tip in CI; the 4 bubble-collapse phase failures are fixed and
  20 new absolute numeric gates were added)
- Status: **PASS**

### Release-blocking science gates
- Command: `python -m pytest tests/test_integration/test_physics_benchmark_gates.py -q` -> `3 passed`
- Command: `python -m pytest tests/test_integration/test_experiment_anchored_gates.py tests/test_integration/test_rate_engine_api.py tests/test_physics/test_reaction_rate_engine.py tests/test_physics/test_cavitation_kgrp.py tests/test_physics/test_shell_pairing_prior.py tests/test_physics/test_run_export.py -q` -> `52 passed`
- No gate was re-baselined: the canonical `physics_engine` rate path was not
  numerically altered by this slice (fixes landed in legacy `app/physics`
  paths, phase labelling, and additive stream fields).
- Status: **PASS**

### New absolute numeric gates
- File: `tests/test_physics/test_absolute_numeric_gates.py` (20 tests)
- Pins: E_G(D,D) ~986 keV across all three implementations; D+D contact
  barrier 0.3-0.6 MeV; mean thermal speed ~2.5 km/s at 300 K; Assenbaum
  enhancement analytic in its validity regime, applied exactly once, capped
  at 1e5; Q-value consistency vs the MHD S-factor tables; <sigma*v> within
  2.5x of Bosch & Hale D(d,n)He3 at 2-10 keV; Casimir classical 1/d^3
  limit; Widom-Larsen 2.531 m_e threshold.
- Status: **PASS**

### Frontend
- Command: `npm test -- --watchAll=false --passWithNoTests --runInBand`
  -> `24 suites, 168 tests passed` (before the new dataFormatter suite)
- Command: `npm run lint` -> `0 errors` (506 pre-existing warnings)
- Command: `npm run build` -> Vite build succeeds
- Command: `npm audit --audit-level=high` -> no high/critical findings
  (2 moderate, pre-existing)
- Status: **PASS**

### Backend dependency audit
- Command: `pip-audit -r requirements.txt`
- Result: pre-existing advisories in pinned dependencies (starlette 0.49.1,
  vtk 9.4.2, ecdsa 0.19.2). These pins were not introduced or changed by
  this slice; upgrading them is tracked as an operator follow-up because the
  starlette pin is coupled to the FastAPI version.
- Status: **PASS WITH NOTES** (no new findings introduced)

## Formal proof status (Lean consistency pilot)

Sibling oracle to Wolfram numeric verification and pytest empirical gates.
**Scope:** mathematical consistency of adopted `THM`/`DEF` identities — **not**
a proof that LENR occurs or that §5A open problems are closed.

- Taxonomy / audit: `docs/FORMALIZATION/CLAIM_TAXONOMY.md`, `MATH_AUDIT_2026.md`
- Status ledger: `docs/FORMALIZATION/FORMAL_PROOF_STATUS.md`
- Equation IR: `formalization/ir/equations/*.yaml`
- Commands:
  - `python formalization/scripts/check_ir.py`
  - `python formalization/scripts/diff_code_literals.py`
  - `cd formalization/lean && lake build`
- CI job: `formalization` in `.github/workflows/test.yml`
- Proved pilot IDs: EQ-RYD-01, EQ-FIELD-01, EQ-CAS-01/02, EQ-GAMOW-01,
  EQ-ASSEN-DOM-01, EQ-COMP-01/02, EQ-QDD-01, EQ-MILES-CONV-01
- Open obligations (unchanged): EQ-OPEN-MEV-01, EQ-OPEN-RAD-01, EQ-OPEN-RATE-01,
  EQ-OPEN-EC-01, EQ-OPEN-YIELD-01
- Status: **PASS** (local `lake build` + IR checks, 2026-08-22)
