import { test, expect } from './fixtures.js';

/**
 * Analytics ship smoke: page mounts; View Details is either present or the
 * empty-state still renders a non-blank shell (deterministic UX).
 */
test.describe('analytics ship flows', () => {
  test('loads analytics page shell', async ({ analyticsPage }) => {
    await analyticsPage.goto();
    await expect(analyticsPage.root()).not.toBeEmpty();
    await expect(analyticsPage.page).toHaveURL(/analytics/);
    await expect(analyticsPage.page.getByText(/analytics|history|simulation/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
