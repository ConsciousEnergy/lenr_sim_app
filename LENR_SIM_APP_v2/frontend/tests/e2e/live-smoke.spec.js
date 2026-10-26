import { test, expect } from '@playwright/test';

const live = process.env.LIVE_BASE_URL;
/**
 * Expected API/SPA version string. Defaults to the current Compose share train
 * so `LIVE_BASE_URL=https://lenr-sim-beta.conscious.energy npm run e2e:live`
 * keeps working without edits. Override for staging/cutover:
 *   EXPECT_VERSION=0.3.9-beta LIVE_BASE_URL=https://app-staging.conscious.energy …
 */
const expectVersion = process.env.EXPECT_VERSION || '0.3.8-beta';

test.describe('live VPS smoke', () => {
  test.skip(!live, 'Set LIVE_BASE_URL (e.g. https://lenr-sim-beta.conscious.energy or https://app-staging.conscious.energy) to run against a deployed surface');

  test(`GET /api/health returns ${expectVersion}`, async ({ request }) => {
    const res = await request.get(`${live}/api/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('healthy');
    expect(body.version).toBe(expectVersion);
    expect(body.database?.connected).toBe(true);
  });

  test('production hides OpenAPI and metrics', async ({ request }) => {
    expect((await request.get(`${live}/api/docs`)).status()).toBe(404);
    expect((await request.get(`${live}/api/openapi.json`)).status()).toBe(404);
    expect((await request.get(`${live}/metrics`)).status()).toBe(404);
  });

  test('SPA deep link and beta banner', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    await page.goto(`${live}/unified-theory`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('beta-notice')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('beta-banner')).toBeVisible();
    expect(pageErrors, pageErrors.join('\n')).toEqual([]);
  });
});
