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

2 moderate severity vulnerabilities
```

Those lines come from npm, not from Vite. The next lines are the ones that tell
you the dev server actually started:

```text
> lenr-sim-frontend@0.3.6-beta start
> vite

  VITE v6.4.3  ready in 261 ms
  ➜  Local:   http://localhost:3000/
```

The funding line is unconditional noise; it has nothing to do with security.

## 2. Current audit posture

On `development` tip a clean install reports **2 moderate, 0 high**:

| Package | Advisories | Why not fixed |
|---|---|---|
| `react-router`, `react-router-dom` | GHSA-wrjc-x8rr-h8h6, GHSA-337j-9hxr-rhxg, GHSA-jjmj-jmhj-qwj2 (all moderate) | Fixed only in `react-router >= 7.18.0`. This is a major-version migration touching every route, deferred to its own slice. |

The CI gate is `npm audit --audit-level=high`, which exits `0`. Read it by exit
code, never through a pipe:

```bash
npm audit --audit-level=high > /dev/null 2>&1; echo "gate exit: $?"
```

Exposure from the residual moderates is limited: both advisories need an
attacker-influenced navigation target, and this app builds routes from a static
table with no user-supplied redirect parameters and no SSR hydration.

### If you see high vulnerabilities

You are on a stale lockfile or a stale `node_modules`. The "8 vulnerabilities
(4 moderate, 4 high)" signature specifically matches a tree from before the
`brace-expansion`, `fast-uri`, `nanoid` and `js-yaml` bumps:

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
