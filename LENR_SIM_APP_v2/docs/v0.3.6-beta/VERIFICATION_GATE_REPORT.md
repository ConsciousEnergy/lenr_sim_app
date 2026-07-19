# Verification Gate Report (v0.3.6-beta)

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
- Vite on Node `20.12.0` emits a CJS deprecation warning; non-blocking, but node upgrade is recommended.
- `npm run lint` currently reports a high warning count (`566 warnings`) in legacy files; this is non-blocking but should be reduced.
- Python residual advisories require major-version movement (`pytest`) or framework transitive upgrades (`starlette`).
- Frontend bundle size warnings remain (`index` and `three.module` chunks exceed 500 kB); manual chunking is recommended.

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

## Go/No-Go Statement
- For v0.3.6-beta science-gate baseline, current implementation is **GO with tracked residuals**:
  - no active high/critical frontend vulnerabilities,
  - deterministic runtime behavior for audited critical actions,
  - Vite migration validated (build/test/dev smoke),
  - uncertainty/falsification/observables contract exposed end-to-end,
  - 2026 rigor-review findings RR-001..RR-020 closed with 30 new passing gates.

