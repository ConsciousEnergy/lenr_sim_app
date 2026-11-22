# Development Warnings Explained

What the frontend prints while running, and which of it matters.

**Toolchain:** Vite 6.4.3 with `@vitejs/plugin-react`. The frontend migrated off
Create React App during v0.3.6-beta, so anything you read elsewhere about
`react-scripts`, `webpack-dev-server`, `@svgr/webpack`, ejecting, or "9
vulnerabilities" is describing a stack this project no longer uses.

---

## 1. The npm install summary is not a Vite error

`start_app.bat` runs `npm ci` before `npm start`, and npm always prints a funding
line and an audit summary afterwards:

```text
262 packages are looking for funding
  run `npm fund` for details

… severity vulnerabilities
```

Those lines come from npm, not from Vite (counts drift with the lockfile). The
next lines are the ones that tell you the dev server actually started:

```text
> lenr-sim-frontend@0.3.6-beta start
> vite

  VITE v6.4.3  ready in 261 ms
  ➜  Local:   http://localhost:3000/
```

The funding line is unconditional noise; it has nothing to do with security.

## 2. Current audit posture

On tip a clean install reports **0 moderate** plus **allowlisted highs**
(transitive tree noise under Jest / Tailwind / micromatch). Lockfile pins
`react-router` / `react-router-dom` at **7.18.5**, which clears
GHSA-wrjc-x8rr-h8h6 / GHSA-337j-9hxr-rhxg / GHSA-jjmj-jmhj-qwj2 — no deferred
router migration remains for those advisories.

| Package | Advisories | Why not fixed |
|---|---|---|
| `react-router`, `react-router-dom` | (none on tip) | Cleared at lockfile **7.18.5** (was moderate under `<7.18.0`). |
| `braces` (via `micromatch` / `chokidar` / Tailwind 3 / Jest) | GHSA-vfj7-8cjw-p6xm (high) | No patched `braces` release (`first_patched_version` null). Clearing it needs Tailwind v4 / chokidar v4 (or an upstream braces fix). Allowlisted in `scripts/audit-high-gate.js` until then. |
| `picomatch` (via Jest / Vite / Tailwind / micromatch) | GHSA-fc5q-39xc-vjpf (high, CVE-2026-112366) | ReDoS via single-branch repeated extglobs; advisory patched versions **None** (npm latest still 4.0.7). Allowlisted in `scripts/audit-high-gate.js` until upstream publishes a fix (micromatch/picomatch#194). |
| `source-map-js` | GHSA-68fv-2mgg-jv7q (high, `<1.2.2`) | **Fixed** via `package.json` `overrides` pin `^1.2.2` (2026-10-06). |

The CI gate is `node scripts/audit-high-gate.js` (high/critical, with the
explicit allowlist above). Read it by exit code, never through a pipe:

```bash
node scripts/audit-high-gate.js > /dev/null 2>&1; echo "gate exit: $?"
```

No residual router moderates remain on tip. Allowlisted highs are transitive
dev-tooling (`braces` / `picomatch`) with no production SSR redirect surface.

### If you see unexpected highs / moderates outside the allowlist

You are on a stale lockfile or a stale `node_modules`. Historical signatures
(e.g. "8 vulnerabilities (4 moderate, 4 high)" or "2 moderate" with
pre-7.18 router) match trees from before the `brace-expansion`, `fast-uri`,
`nanoid`, `js-yaml`, and router bumps:

```bat
git pull origin development
cd LENR_SIM_APP_v2\frontend
rmdir /s /q node_modules
npm ci --legacy-peer-deps
npm audit
```

`package.json` `overrides` now pin minimum safe versions for those packages, so a
fresh resolve cannot pick a vulnerable patch release.

## 3. Deprecation warnings during install

`npm ci` prints deprecation notices for transitive packages (`inflight`, old
`glob`, several `@babel/plugin-proposal-*`, `eslint@8`). These are upstream
notices about packages other dependencies pull in. They do not affect the build.
`eslint@8` and `recharts@2` are the two worth tracking, since both have a major
version available and are on the post-beta maintenance list.

## 4. The CJS Node API notice

```text
The CJS build of Vite's Node API is deprecated.
```

Emitted because the Vite config is loaded through the CommonJS entry point. It is
informational and resolves when the config moves to ESM. It does not affect the
dev server or the production build.

## 5. Source map warnings from third-party libraries

Some prebuilt dependencies (notably `@mediapipe/tasks-vision`, pulled in via
`@react-three/drei`) ship without source maps:

```text
Failed to parse source map from 'vision_bundle_mjs.js.map'
```

Cosmetic. You lose step-through debugging inside that one library. Suppress with
`GENERATE_SOURCEMAP=false`, which `frontend/start-clean.bat` sets for you.

---

## Summary

| Message | Source | Action |
|---|---|---|
| "N packages are looking for funding" | npm install | None; unconditional noise |
| "2 moderate severity vulnerabilities" | npm audit | None; tracked react-router migration |
| Any **high** vulnerability | stale lockfile or `node_modules` | Pull and reinstall (section 2) |
| Deprecation notices for transitive packages | npm install | None; upstream |
| "CJS build of Vite's Node API is deprecated" | Vite config loader | None |
| Source map parse failures | third-party prebuilt bundles | Optional: `GENERATE_SOURCEMAP=false` |

Anything that stops the dev server from reaching `VITE v6.4.3 ready` is a real
error and should be investigated rather than matched against this list.

---

**Last Updated:** August 2026
**App Version:** 0.3.6-beta
**Toolchain:** Vite 6.4.3 (migrated off react-scripts)

See also `docs/v0.3.6-beta/SECURITY_CI_HARDENING.md` for the audit-gate policy and
`docs/v0.3.6-beta/PORT_TOPOLOGY_POLICY.md` for the dev port topology.
