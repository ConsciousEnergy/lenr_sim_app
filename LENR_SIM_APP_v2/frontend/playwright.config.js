import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config for the LENR Simulation Platform frontend.
 * Aligns with vite.config.js (dev server on port 3000, strictPort, proxy of
 * /api and /ws to the backend at :8010). See .cursor/skills/playwright-e2e.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.LIVE_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Add more browsers once their binaries are installed:
    //   npx playwright install firefox webkit
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  // Auto-start the Vite dev server. It proxies /api and /ws to the backend
  // (default http://127.0.0.1:8010, overridable via VITE_API_URL).
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
