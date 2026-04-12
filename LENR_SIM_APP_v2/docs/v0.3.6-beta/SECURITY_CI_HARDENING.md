# Security and CI Hardening (v0.3.6-beta)

## Baseline (before changes)
- `npm audit` in frontend: `12 vulnerabilities (9 low, 2 moderate, 1 high)`
- High issue source: `lodash` (`_.template` code injection advisory chain)

## Applied
- Upgraded `lodash` to latest (`npm install lodash@latest`).
- Added CI security gate in `.github/workflows/test.yml`:
  - `npm audit --audit-level=high`
- Added `lenr_sim_app_v0.3.6-beta` to test workflow branch triggers.

## Current Posture (after changes)
- `11 vulnerabilities (9 low, 2 moderate, 0 high)` in frontend audit.
- Remaining moderates are tied to legacy CRA `react-scripts` / `webpack-dev-server` path and require major toolchain migration for full removal.

## Residual Risk Policy
- Release-blocking: any high/critical vulnerability.
- Accepted temporarily (with tracking): moderate vulnerabilities in legacy dev-server toolchain until migration slice.
- Follow-up: migrate off `react-scripts` stack in dedicated breaking-change PR slice.

