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

## Ship-Prep Update (2026-07-18)
- Frontend: Vite `5` -> `6.4.3` (with `@vitejs/plugin-react` 4.7.0) cleared the last dev-server high; `npm audit --audit-level=high` -> **0 vulnerabilities**. The prior `react-scripts`/`webpack-dev-server` moderates are gone with the completed Vite migration.
- Added scheduled `security-scan.yml` (weekly `pip-audit` + `npm audit`) and a PR `dependency-review` gate.
- Backend `pip-audit -r requirements.txt`: bumped the one cleanly-fixable direct dependency `python-multipart` `0.0.29 -> 0.0.31`.

### Backend `pip-audit` accepted residuals (out-of-beta-scope, ignored in CI)
The CI `Backend dependency audit` step keeps `pip-audit` strict but ignores the following
documented, upstream-constrained transitive advisories. Any *new* or *fixable* advisory still
fails the build. Revisit each in the post-beta maintenance slice.

| Package | Advisory IDs | Why not fixed in v0.3.6-beta |
|---|---|---|
| `starlette 0.49.1` | PYSEC-2026-161, PYSEC-2026-248, PYSEC-2026-249, PYSEC-2026-2280, PYSEC-2026-2281 | Fix only in starlette `1.x`; blocked by `fastapi==0.128.0` pin (`starlette<0.51.0`). Requires a coordinated FastAPI major upgrade. |
| `vtk 9.4.2` | PYSEC-2025-224, PYSEC-2025-225, PYSEC-2025-226 | Transitive via `pyvista`; fix in `vtk 9.5.1`. Deferred pending PyVista rendering revalidation. |
| `ecdsa 0.19.2` | PYSEC-2026-1325 | Transitive via `python-jose[cryptography]`; no upstream fix released. Track `python-jose` replacement. |

## Residual Risk Policy
- Release-blocking: any high/critical vulnerability, and any *new* or *fixable* backend advisory.
- Accepted temporarily (with tracking): the backend transitive advisories tabled above (upstream-constrained), documented and ignored explicitly in the CI `pip-audit` step.
- Follow-up: coordinated FastAPI/Starlette major upgrade, `vtk 9.5.1` via PyVista revalidation, and `python-jose` replacement in a dedicated post-beta maintenance slice.
- Dependency Review is **blocking** on high severity for PRs into `main`, `development`, and `lenr_sim_app_v0.3.6-beta`. Enable Dependency graph under repo Settings → Code security and analysis or the workflow cannot run.
- Pre-VPS API hardening (2026-07-22): WebSocket `num_cycles` capped at 10, concurrent stream budget, UQ samples max 512, generic client error messages, and a tighter `/export` per-IP rate limit.

