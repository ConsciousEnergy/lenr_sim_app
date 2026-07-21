# Playwright E2E - Reference

Drop-in setup for the Vite/React frontend. Workflow is in [SKILL.md](SKILL.md).
Everything here is a one-time scaffold; installing `@playwright/test` needs
confirmation first.

## Directory layout

```
LENR_SIM_APP_v2/frontend/
  playwright.config.js
  tests/e2e/
    pages/            # page objects (SimulationPage.js, ...)
    fixtures.js       # custom fixtures
    *.spec.js         # specs
```

## playwright.config.js (matches vite.config.js: port 3000, strictPort)

```js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
  ],
  // Auto-start the Vite dev server (proxies /api and /ws to backend :8010).
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

The backend must be reachable at the proxy target (default `http://127.0.0.1:8010`,
overridable via `VITE_API_URL`). For deterministic runs, start the backend in
`test` env or stub `**/api/**` with `page.route`.

## fixtures.js

```js
import { test as base } from '@playwright/test';
import { SimulationPage } from './pages/SimulationPage.js';

export const test = base.extend({
  simulationPage: async ({ page }, use) => { await use(new SimulationPage(page)); },
});
export { expect } from '@playwright/test';
```

## Example spec

```js
import { test, expect } from './fixtures.js';

test('user runs a simulation and sees a result', async ({ simulationPage, page }) => {
  await simulationPage.goto();
  await simulationPage.run();
  await expect(page.getByText(/simulation complete/i)).toBeVisible({ timeout: 30_000 });
});
```

## package.json scripts to add

```json
{
  "scripts": {
    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui",
    "e2e:headed": "playwright test --headed"
  }
}
```

## CI wiring (optional, add to .github/workflows/test.yml frontend job)

```yaml
      - name: Install Playwright browsers
        run: cd LENR_SIM_APP_v2/frontend && npx playwright install --with-deps chromium
      - name: E2E tests
        run: cd LENR_SIM_APP_v2/frontend && npx playwright test --project=chromium
```

## Notes

- `.gitignore`: add `LENR_SIM_APP_v2/frontend/playwright-report/`, `test-results/`, and `blob-report/`.
- Keep specs off production; never seed real data.
- The pack's `test-driven-development` skill (`references/testing-patterns.md`) has additional E2E/anti-flake guidance.
