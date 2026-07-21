import { test, expect } from './fixtures.js';

/**
 * Smoke E2E: the SPA boots and mounts its React root.
 *
 * This is intentionally backend-independent (the app shell renders even when the
 * API at :8010 is unavailable) so it is a reliable first gate. Add flow-specific
 * specs (running a simulation, toggling theories, exporting) as page objects grow.
 */
test.describe('application shell', () => {
  test('loads the home page and mounts the React root', async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.page).toHaveTitle(/LENR/i);
    await expect(homePage.root()).not.toBeEmpty();
  });
});
