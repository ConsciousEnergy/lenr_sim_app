---
name: playwright-e2e
description: >-
  Author and run Playwright end-to-end tests for the LENR_SIM_APP React/Vite
  frontend using page objects, role-based locators, and fixtures. Use when adding
  or updating browser E2E coverage for user flows (running a simulation, toggling
  theories, viewing analytics), or when the user asks for Playwright/E2E tests.
---

# Playwright E2E

## Overview

The Vite/React frontend already has Playwright coverage. `@playwright/test` is
in `LENR_SIM_APP_v2/frontend/package.json`. Specs live under
`LENR_SIM_APP_v2/frontend/tests/e2e/` with page objects in `tests/e2e/pages/`.
Config: `playwright.config.js` (Chromium, Vite `:3000`, proxy `:8010`).
Run with `npm run e2e`. CI job `frontend-e2e` in `.github/workflows/test.yml`
installs Chromium and runs the same command. Specs stub `/api/**` via
`page.route` and do not need a live production API.

## Setup status

Already installed. Do not re-run first-time `npm install -D @playwright/test`
as if this were greenfield. Browsers: `npx playwright install chromium` (CI uses
`--with-deps`).

Current specs:

- `app-shell.spec.js`
- `composition-provenance.spec.js`
- `dashboard-testbed.spec.js`
- `enhancement-charts.spec.js`
- `open-questions-virtual-lab.spec.js`
- `prediction-waterfall.spec.js`
- `theory-round-trip.spec.js`

## When to Use

- Adding/maintaining E2E coverage for a user flow.
- Verifying a change end-to-end in a real browser (not a jsdom unit test).

## Process

```
- [ ] 1. Identify the user flow + its success signal (visible text/role/URL)
- [ ] 2. Add/extend a page object in tests/e2e/pages/
- [ ] 3. Write the spec using role-based locators + web-first assertions
- [ ] 4. Run headed while developing, headless for the gate
- [ ] 5. Keep it deterministic (no arbitrary sleeps; mock/seed backend as needed)
```

Run:

```bash
cd LENR_SIM_APP_v2/frontend
npx playwright test                 # headless
npx playwright test --ui            # interactive
npx playwright test --headed --project=chromium
```

## Locator + assertion rules

```js
// ✅ DO: user-facing, role-based locators + web-first assertions (auto-wait)
await page.getByRole('button', { name: /run simulation/i }).click();
await expect(page.getByText(/simulation complete/i)).toBeVisible();

// ❌ DON'T: brittle CSS/XPath or fixed sleeps
await page.locator('.btn-primary.css-1x2y3z').click();
await page.waitForTimeout(3000);
```

- Prefer `getByRole`, `getByLabel`, `getByText`; add `data-testid` only when no accessible handle exists.
- Use web-first assertions (`await expect(locator).toBeVisible()`) - they auto-retry; never assert on a snapshotted value.

## Page object pattern

```js
// tests/e2e/pages/SimulationPage.js
export class SimulationPage {
  constructor(page) { this.page = page; }
  async goto() { await this.page.goto('/simulation'); }
  runButton() { return this.page.getByRole('button', { name: /run simulation/i }); }
  async run() { await this.runButton().click(); }
  result() { return this.page.getByRole('region', { name: /result/i }); }
}
```

## Backend dependency

The app talks to the backend (`:8010`) via the Vite proxy. For deterministic E2E,
either (a) run the backend in `test` env alongside the dev server, or (b) stub
network with `page.route('**/api/**', ...)`. Do not point E2E at production.

## Rationalizations (excuses -> rebuttal)

- "Unit tests already cover this." -> jsdom cannot catch routing, proxy, WebSocket, or real-render regressions; E2E does.
- "I'll use CSS selectors, they're quick." -> They break on styling changes; role-based locators encode intent and survive refactors.
- "Add a sleep to fix the flake." -> Sleeps hide races; use web-first assertions and proper wait conditions.

## Red Flags

- `waitForTimeout` / arbitrary sleeps, or `.css-*` hashed selectors.
- Tests depending on execution order or shared mutable state.
- E2E hitting a real/production backend or non-seeded data.

## Verification

- New specs pass headless (`npx playwright test`) and are deterministic across 3 runs.
- Locators are role/label/text-based; assertions are web-first.
- Flows assert a real user-visible success signal.

See [reference.md](reference.md) for the config, fixtures, directory layout, and npm scripts to add.
