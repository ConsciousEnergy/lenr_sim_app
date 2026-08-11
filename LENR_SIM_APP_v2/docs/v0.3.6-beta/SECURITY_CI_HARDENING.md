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
- Dependency Review targets high severity for PRs into `main`, `development`, and `lenr_sim_app_v0.3.6-beta`. It currently uses `continue-on-error: true` because Dependency graph / GitHub Advanced Security is not enabled on this repository (the action otherwise fails with "Dependency review is not supported"). Once Dependency graph + GHAS are enabled under Settings → Code security and analysis, remove `continue-on-error` so the check becomes a hard blocker again.
- Frontend `npm audit --audit-level=high` is a hard CI gate; residual **moderate** `react-router` / `react-router-dom` advisories are tracked for a coordinated upgrade.
- Pre-VPS API hardening (2026-07-22): WebSocket `num_cycles` capped at 10, concurrent stream budget, UQ samples max 512, generic client error messages, and a tighter `/export` per-IP rate limit.

## Pre-Public Hardening Update (2026-08-08)

Newly published advisories had re-broken the frontend high gate. Cleared via `npm audit fix`
(patch-level, no major upgrades):

| Package | Advisory | Change |
|---|---|---|
| `js-yaml` | GHSA-5p4m-2wfm-xmqj (high, quadratic CPU in `!!omap`) | `4.3.0 -> 4.3.1` |
| `dompurify` | GHSA-55q2-fjhq-7xh7 (moderate, detached-subtree XSS) | `3.4.12 -> 3.4.13` |

Post-fix posture: `npm audit --audit-level=high` -> **exit 0**, `2 moderate, 0 high`.

`frontend/package.json` `overrides` floors these packages (`@tootallnate/once`, `nth-check`,
`serialize-javascript`, `underscore`, `postcss`, `js-yaml`, `esbuild`, `brace-expansion`,
`nanoid`, `fast-uri`, `dompurify`) so older lockfiles cannot resolve vulnerable patch versions.
The Windows **"8 vulns (4 high)"** signature matches pre-`95bedd1` / `bd1684f` trees (stale
`node_modules` or a lockfile from before those fixes).

**Verify the gate by reading the exit code directly, never through a pipe.** `npm audit --audit-level=high | tail`
reports `tail`'s status and silently masks a failing gate:

```bash
npm audit --audit-level=high > /dev/null 2>&1; echo "gate exit: $?"
```

### Local `start_app.bat` / Vite terminal noise

`LENR_SIM_APP_v2/start_app.bat` opens a dedicated **LENR Frontend** window that
runs `frontend/start_dev.bat`. That script syncs `node_modules` to
`package-lock.json` via a SHA256 stamp (`node_modules\.lockfile-hash`), then
starts Vite. Fresh trees use `npm ci`; existing trees with a changed lockfile
use `npm install` (lower RAM than a full `npm ci` wipe). npm always prints a
funding line and an audit summary after install. That is **not** a Vite
failure — the next lines should be:

```text
> lenr-sim-frontend@0.3.6-beta start
> vite
```

On `development` tip (`bd1684f` / `32a8260` and later), a clean install reports
**2 moderate, 0 high** (react-router only). If a local Windows terminal still shows
**8 vulnerabilities (4 moderate, 4 high)**, the machine is on a pre-fix lockfile or a
stale `node_modules` tree. Fix:

```bat
git pull origin development
cd LENR_SIM_APP_v2\frontend
rmdir /s /q node_modules
npm ci --legacy-peer-deps
npm audit
```

Expect `2 moderate severity vulnerabilities` and `npm audit --audit-level=high` exit `0`.

### Accepted frontend residual

| Package | Advisories | Why not fixed now |
|---|---|---|
| `react-router`, `react-router-dom` | GHSA-wrjc-x8rr-h8h6, GHSA-337j-9hxr-rhxg, GHSA-jjmj-jmhj-qwj2 (all moderate) | Fixed only in `react-router >= 7.18.0`. We are on `6.x`, so this is a major-version migration touching every route in `frontend/src/App.tsx`. Deferred to a dedicated slice so it is not bundled with unrelated changes. |

Exposure is limited: both advisories require attacker-influenced navigation targets, and this
app builds its routes from a static table with no user-supplied redirect parameters and no SSR
hydration (Vite SPA), so `deserializeErrors()` is never reached.

### CI runtime parity

The backend test matrix now includes `3.12` to match the `python:3.12-slim` runtime in
`Dockerfile.backend`. `3.10`/`3.11` stay in the matrix to guard the documented
minimum-supported range.

