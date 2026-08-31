# Wave 1-G — Docs and legal

**Date:** 2026-08-31
**HEAD reviewed:** `lenr_sim_app_v0.3.6-beta` / PR branch `consciousenergy/public-release-review-7a95`
**Scope:** LICENSE, SECURITY, CONTRIBUTING, CHANGELOG, About/Documentation UI, PostHog gating, `frontend/public/`, skill staleness, version headers. Review-first: no product-code edits.

**Seed hypothesis 6:** no `robots.txt` / privacy policy / cookie notice; PostHog wired and env-gated — **confirmed**.

## Summary

GPL-3.0 is present at the repo root and is shown in the drawer, About, and Documentation footer. No `phc_…` PostHog keys are committed. Product analytics is wired (`posthog-js`, `initAnalytics()` in `index.jsx`) and no-ops without a key, outside production, or when Do-Not-Track is set.

Public-launch legal gaps remain: there is no `robots.txt`, no privacy policy, no cookie notice, no `/privacy` or `/terms` route, and no in-app analytics opt-out. About’s disclaimer is weaker than the Theory Guide’s EMP / model-output language. OpenAPI still advertises **MIT**. Operator docs (`DEPLOYMENT.md`, `WORDPRESS_INTEGRATION.md`) still say **0.2.1-beta**. Agent skills still claim PostHog and Playwright are not installed.

No **blocker** if Pages ships with `VITE_POSTHOG_KEY` unset (analytics never cookies). **DOC-001** becomes a blocker the moment that key is set, or if counsel requires a privacy policy for any public API that logs client IPs.

## Seed hypothesis 6

| Claim | Result |
|---|---|
| No `robots.txt` | **Confirmed.** Neither `LENR_SIM_APP_v2/frontend/public/` nor `frontend/public/` contains one. Git `ls-files` of public assets: `index.html`, `favicon.svg`, `favicon.png`, `logo192.png`, `logo512.png`, `images/ce-logo.png`. |
| No privacy policy | **Confirmed.** No privacy markdown/HTML; `App.tsx` has no `/privacy` route. Dead `AppFooter.jsx` links to `/privacy` and `/terms` but is not mounted by v2 `App.tsx`. |
| No cookie notice | **Confirmed.** No cookie banner/consent UI. Settings has no analytics controls. PostHog uses `persistence: 'localStorage+cookie'` when it initializes. |
| PostHog present | **Confirmed.** `posthog-js` `^1.404.1` in `LENR_SIM_APP_v2/frontend/package.json`; `src/analytics/posthog.js` + `events.js`; `index.jsx` calls `initAnalytics()` and wraps `PostHogProvider`. |
| PostHog env-gated | **Confirmed.** Init returns unless `POSTHOG_KEY` is set **and** `NODE_ENV === 'production'` **and** `navigator.doNotTrack` is not `1`/`yes`. Key from `REACT_APP_POSTHOG_KEY` / `VITE_POSTHOG_KEY` only; default host `https://us.i.posthog.com`. |

Deployment docs do not mention `VITE_POSTHOG_KEY`. Whether production Pages will set it is **needs-operator**.

---

### DOC-001
- severity: major
- surface: legal
- status: confirmed
- evidence: No `robots.txt` in `LENR_SIM_APP_v2/frontend/public/` (Vite copies this directory as static assets). Repo-wide glob for `robots.txt`, `*privacy*`, and `*cookie*` returns no policy/notice pages. `App.tsx` public routes (Wave 0 inventory) omit `/privacy` and `/terms`. `posthog.js` sets `persistence: 'localStorage+cookie'` after passing the env/DNT gate. `SettingsPage.jsx` has no PostHog/opt-out controls. Skill `posthog-analytics` requires “Respect `navigator.doNotTrack`; expose an opt-out” — only DNT is implemented. `ANALYTICS_TRANSPARENCY.md` documents scientific Analytics honesty only; it does not mention product analytics, cookies, or PostHog, despite `CHANGELOG.md` and `VERIFICATION_GATE_REPORT.md` claiming that transparency lives there. `AppFooter.jsx` (v2 and legacy root) links Privacy/Terms and says “All rights reserved”; it is unused by `App.tsx` (only the legacy `frontend/src/components/AppLayout.jsx` imports it).
- recommendation: Before a public `conscious.energy` launch, publish a privacy policy covering API logs and (if enabled) PostHog; add a cookie/consent notice and an in-app opt-out if `VITE_POSTHOG_KEY` will be set; add `robots.txt` (allow or `noindex` as a product decision). Treat enabling PostHog without those surfaces as a **blocker**. Do not wire the dead footer’s Privacy/Terms links until the routes exist. Align “All rights reserved” with GPL-3.0 copyleft if that footer is ever remounted.

### DOC-002
- severity: accepted-residual
- surface: legal
- status: confirmed
- evidence: `git grep phc_` over the tree is empty. No PostHog key in `frontend/.env.development`, `.env.local`, `.env.local.backup`, `backend/.env.example`, or `frontend/env.example`. Tracked env files contain localhost API URLs only (`.env.local`: `REACT_APP_API_URL=http://localhost:8010`; `.env.local.backup`: `VITE_API_URL=http://localhost:8000`). `LENR_SIM_APP_v2/.gitignore` lists `frontend/.env.local` but the file remains tracked (committed before the ignore rule). `.env.local.backup` is tracked and not ignored. Root `.gitignore` only ignores the exact name `.env`.
- recommendation: `git rm --cached` the tracked `.env.local` and `.env.local.backup`; extend ignore to `.env.local.backup`. Keep committing only `*.example` / `.env.development` templates. No key rotation required from this scan.

### DOC-003
- severity: major
- surface: docs
- status: confirmed
- evidence: `AboutPage.jsx` Overview calls LENR a “fascinating field of LENR phenomena” and “cutting-edge physics models.” Disclaimer: “educational and research purposes only… theoretical models… may not perfectly represent real-world LENR phenomena… no claims regarding the accuracy or completeness of the simulations for predicting actual experimental outcomes.” It does not mention claim tiers, EMP vs SPEC, model output vs laboratory measurement, Miles heat-helium as EMP-not-proof, or `lenr_proved` remaining false. Contrast `TheoryPage.jsx` (“Claim-tier EMP, not proof that every excess-heat report is nuclear”; Huang as “contested EMP”). `TeamPage.jsx` mission: “advance the understanding and research of Low Energy Nuclear Reactions” / “this exciting field” with no EMP caveat. `CONTRIBUTING.md` already requires claim-tier chips and forbids treating Lean as proof that LENR occurs — stronger than the public About page.
- recommendation: Rewrite About (and Team mission) to match Theory Guide honesty: contested field, simulations are model outputs not experimental proof, EMP literature is claim-tiered not nuclear confirmation. Keep GPL + educational-use language.

### DOC-004
- severity: minor
- surface: docs
- status: confirmed
- evidence: `.cursor/skills/posthog-analytics/SKILL.md` Overview: “The app has no product analytics today”; Setup: “PostHog is not yet a dependency” / `npm install posthog-js`. Actual: `posthog-js` in `package.json`, `src/analytics/posthog.js` + `events.js` match the skill’s own `reference.md` templates, taxonomy events fired from Unified Theory, theory toggle, docs, viz. `.cursor/skills/playwright-e2e/SKILL.md` Overview: “The frontend currently has zero E2E coverage” / “Playwright is not yet a dependency.” Actual: `@playwright/test` `^1.61.1`, `playwright.config.js`, seven specs under `frontend/tests/e2e/` (`app-shell`, `dashboard-testbed`, `theory-round-trip`, etc.). Seed hypothesis 5 (E2E absent from CI) is Agent D’s; this finding is skill staleness only.
- recommendation: Update both skills to “already installed; follow existing modules/specs.” Point PostHog at `src/analytics/posthog.js` and Playwright at `frontend/tests/e2e/`. Do not re-run first-time `npm install` as if greenfield.

### DOC-005
- severity: major
- surface: docs
- status: confirmed
- evidence: Canonical four version markers are `0.3.6-beta` (Wave 0). Operator docs still header **0.2.1-beta** / January 2026: `docs/DEPLOYMENT.md`, `docs/WORDPRESS_INTEGRATION.md`, plus `TROUBLESHOOTING.md`, `INFRASTRUCTURE_SUMMARY.md`, `DEPLOYMENT_COMPLETE.md`. `PHASE4_DOCKER_SWARM_DEPLOYMENT.md` is **0.3.5-beta**. `CHANGELOG.md` section is `## [v0.3.6-beta] - 2026-04-18` while the first entries are dated 2026-08-27. In-app `DocumentationPage.jsx` install block clones the repo then `cd frontend` / `cd ../backend` (root mirrors, not `LENR_SIM_APP_v2/`), cites Node 16+ / Python 3.9+, and `start_app.bat`. Contribution button points at `blob/main/CONTRIBUTING.md` (seed 1: Pages `production_branch = main` while ship work is on `lenr_sim_app_v0.3.6-beta`). API accordion and “Open Swagger UI” target `${API_BASE_URL}/api/docs`; `CHANGELOG` / production hardening hide OpenAPI in production (seed 3, also `DEPLOYMENT_CHECKLIST.md` “`/api/docs` loads Swagger UI”). `DOCUMENTATION_UPDATES.md` claims `LENR_SIM_APP_v2/LICENSE`; git has root `LICENSE` and `LENR_SIM_APP_v1/LICENSE` only. `frontend/env.example` still uses `REACT_APP_API_URL=http://localhost:8000` (canonical local API is `:8010`).
- recommendation: Retitle operator docs to 0.3.6-beta or mark them superseded by `DEPLOYMENT_CHECKLIST.md` / `DEPLOYMENT_QUICK_REFERENCE.md`. Fix CHANGELOG date. Point in-app docs at `LENR_SIM_APP_v2/`, current runtimes, and the release-branch CONTRIBUTING URL. Remove or qualify Swagger links for production. Fix `env.example` port.

### DOC-006
- severity: major
- surface: legal
- status: confirmed
- evidence: Root `LICENSE` is GNU GPL-3.0 (29 June 2007). `CONTRIBUTING.md`, root `README.md`, `LENR_SIM_APP_v2/README.md`, `LENR_SIM_APP_v2/package.json` (`"license": "GPL-3.0"`), frontend `package.json`, About, Documentation footer, and drawer (`AppLayoutFixed.jsx` “GNU GPL-3.0 copyleft” → `LICENSE` on `lenr_sim_app_v0.3.6-beta`) all say GPL-3.0. `LENR_SIM_APP_v2/backend/app/api/openapi.py` sets OpenAPI `info.license` to `"MIT License"` / `https://opensource.org/licenses/MIT`. `main.py` assigns `app.openapi = lambda: custom_openapi(app)` (hidden in production, still wrong in source and in any non-prod `/api/docs`). Contact in that schema is `support@consciousenergy.io`; frontend `package.json` author is `info@conscious.energy`. `scripts/package.json` (task-master) is `"license": "MIT"` — third-party tooling, not the app license, but easy to misread. `LENR_SIM_APP_v1/README.md` still says MIT.
- recommendation: Change OpenAPI license to GPL-3.0 with `https://www.gnu.org/licenses/gpl-3.0`. Pick one public contact email. Leave v1 MIT text only if v1 is a separate historical license; otherwise add a one-line “v2+ is GPL-3.0” note. Drawer/About/Docs GPL notices are adequate GPL §5(d) Appropriate Legal Notices for the SPA.

### DOC-007
- severity: minor
- surface: docs
- status: confirmed
- evidence: Root and `LENR_SIM_APP_v2/SECURITY.md` are duplicates. Paths are layout-relative (`app/core/config.py`, `app/api/middleware/…`) without the `LENR_SIM_APP_v2/backend/` prefix. “Implemented” lists JWT authentication, password hashing, and CSRF protection. In v2 backend, JWT/CSRF appear as utilities (`app/security/utils.py` CSRF helper) rather than request-gated public routes; production hardening is secret-key boot, Analytics write token, and OpenAPI hide (see `CHANGELOG` 2026-08-26) — not described here. “Future roadmap” still lists “Automated security scanning in CI/CD” while `.github/workflows/security-scan.yml` exists. Reporting URL `https://github.com/ConsciousEnergy/lenr_sim_app/security/advisories/new` is the right GitHub advisory path.
- recommendation: Point SECURITY.md at v2 paths; describe what production actually enforces; move JWT/CSRF to “library present / not the public auth model” unless Agent E confirms they gate requests. Keep the advisory URL. Defer implementation verdicts to `05-security.md`.

### DOC-008
- severity: minor
- surface: docs
- status: confirmed
- evidence: Vite entry is `LENR_SIM_APP_v2/frontend/index.html` (description: “LENR Simulation Application for modeling Low Energy Nuclear Reactions”; favicon `/favicon.png`). `public/index.html` is a CRA leftover (`%PUBLIC_URL%/favicon.png`, `%PUBLIC_URL%/logo192.png`) and is not the Vite HTML shell. `public/` has logos/favicons and no `robots.txt` / `sitemap.xml` / `security.txt`. No cookie or privacy static files.
- recommendation: Either delete CRA `public/index.html` or stop treating it as the public shell. Add `robots.txt` with DOC-001. Favicon PNG is git-tracked; no legal defect in the asset set.

---

## Surfaces checked (no extra finding)

| Surface | Note |
|---|---|
| `LICENSE` | GPL-3.0 verbatim; warranty disclaimer §§15–16 present. |
| `CONTRIBUTING.md` | v0.3.6-beta tree, GPL, secret hygiene, scientific honesty, four version markers. |
| `CHANGELOG.md` (first 50 lines) | v0.3.6-beta content through 2026-08-27 (Miles EMP seed, `lenr_proved` false, OpenAPI hide). Date heading stale (DOC-005). |
| Documentation GPL footer | Present: “Licensed under GNU GPL-3.0” + GitHub link (`DocumentationPage.jsx`). |
| Drawer copyleft | `AppLayoutFixed.jsx` Version `{APP_VERSION}` + GNU GPL-3.0 link. |
| PostHog taxonomy | `events.js` dimensional-only; comment forbids PII / raw physics payloads. |

## Go / no-go (this slice)

- **Docs/legal:** no-go for enabling PostHog or claiming a complete public legal pack (DOC-001, DOC-003, DOC-006).
- **Ship without PostHog key:** residual majors remain (About honesty, MIT OpenAPI string, 0.2.1 operator docs, in-app install/Swagger). Wave 2 should not treat seed 6 as refuted.
