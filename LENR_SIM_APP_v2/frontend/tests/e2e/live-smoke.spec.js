import { test, expect } from '@playwright/test';

const live = process.env.LIVE_BASE_URL;

test.describe('live VPS smoke', () => {
  test.skip(!live, 'Set LIVE_BASE_URL (e.g. https://beta.conscious.energy) to run against the deployed beta');

  test('GET /api/health returns 0.3.6-beta', async ({ request }) => {
    const res = await request.get(`${live}/api/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.version).toBe('0.3.6-beta');
  });

  test('production hides OpenAPI and metrics', async ({ request }) => {
    expect((await request.get(`${live}/api/docs`)).status()).toBe(404);
    expect((await request.get(`${live}/api/openapi.json`)).status()).toBe(404);
    expect((await request.get(`${live}/metrics`)).status()).toBe(404);
  });

  test('SPA deep link and beta banner', async ({ page }) => {
    await page.goto(`${live}/unified-theory`);
    await expect(page.getByTestId('beta-notice')).toBeVisible();
    await expect(page.getByTestId('beta-banner')).toBeVisible();
  });
});
