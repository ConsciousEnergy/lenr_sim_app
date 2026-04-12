# Verification Gate Report (v0.3.6-beta)

## Automated Checks

### Backend
- Command: `python -m pytest -q`
- Result: `296 passed, 1 skipped`
- Status: **PASS**

### Deterministic V&V benchmark gates
- Command: `python -m pytest tests/test_integration/test_physics_benchmark_gates.py -v`
- Scope:
  - contradiction boundary and reason-code contract
  - theory overlap composition provenance
  - legacy vs pipeline parity tolerance bounds
- Status: **PASS**

### Frontend tests
- Command: `npm test -- --watchAll=false --runInBand`
- Result: `13 passed, 0 failed`
- Status: **PASS**

### Security posture
- Command: `npm audit --audit-level=high`
- Result: no high/critical vulnerabilities; `11 vulnerabilities (9 low, 2 moderate)` remain in legacy CRA/jest/jsdom chain.
- Status: **PASS** (per v0.3.6 residual-risk policy: block high/critical only)

### Backend dependency audit
- Command: `pip-audit -r requirements.txt`
- Result: no known critical backend dependency findings in release gate run.
- Status: **PASS**

## Runtime UX/Science-Gate Checks
- Route/content synchronization review: **PASS**
- Analytics critical action (`View Details`) deterministic behavior: **PASS**
- Theory Testbed and visualization cohesion review: **PASS**
- Contract transparency fields present in UI (`contract_version`, confidence breakdown, uncertainty, falsification, observables bridge): **PASS**

## V&V Summary Table

| Check | Verification Status | Validation Dataset Status | Intended-use Limit |
|---|---|---|---|
| Bubble contradiction semantics | PASS | Synthetic deterministic fixture | For cap-boundary and phase-assignment consistency only |
| Theory composition overlap controls | PASS | Theory-pipeline overlap fixture | Does not claim physical exclusivity beyond configured groups |
| Rate/observable coherence contract | PASS | Integration test route assertions | Radiation outputs remain proxy bounds, not transport solves |
| Legacy vs pipeline parity drift | PASS | Mode parity fixture | Wide tolerance, regression sentinel not calibration proof |

## Known Residual Risks
- Local `npm run build` may fail from Node heap pressure on this workstation configuration.
- CI mitigation exists via workflow memory controls and serialized test execution.
- Frontend legacy toolchain (`react-scripts` and transitive stack) retains moderate advisories pending dedicated migration slice.
- CRA remains the selected v0.3.6-beta toolchain; partial Vite artifacts were removed to avoid environment split-brain during this release.

## Go/No-Go Statement
- For v0.3.6-beta science-gate baseline, current implementation is **GO with tracked residuals**:
  - no active high/critical frontend vulnerabilities,
  - deterministic runtime behavior for audited critical actions,
  - uncertainty/falsification/observables contract exposed end-to-end.

