import { devices } from '@playwright/test';
import { test, expect } from './fixtures.js';

/**
 * #409 M5 — mobile viewport smoke for Unified Theory Visual tab.
 *
 * Acceptance: phone-class profile can open Visual, see a non-zero canvas,
 * move the scrubber, and avoid console WebGL / page errors.
 * Stub only the shell APIs other e2e specs stub (not a blanket /api catch-all).
 */

test.use({
  // Prefer explicit phone geometry over spreading devices['Pixel 5'] so we do
  // not fight LENR_CI_SYSTEM_CHROME channel / defaultBrowserType settings.
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  userAgent: devices['Pixel 5'].userAgent,
});

async function stubShellApis(page) {
  await page.route('**/api/health', async (route) => {
    await route.fulfill({
      json: { status: 'healthy', version: '0.4.1-beta', database: { connected: true } },
    });
  });
  await page.route('**/api/physics/theories', async (route) => {
    await route.fulfill({ json: [] });
  });
}

test.describe('mobile Visual tab smoke (#409 M5)', () => {
  test('canvas non-zero, scrubber moves, no WebGL page errors', async ({
    page,
    unifiedTheoryPage,
  }) => {
    test.setTimeout(90_000);

    const pageErrors = [];
    const webglConsoleErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (/webgl|THREE|WebGL/i.test(text)) {
        webglConsoleErrors.push(text);
      }
    });

    await stubShellApis(page);
    await unifiedTheoryPage.gotoVisualization();

    const vizTab = page.getByRole('tab', { name: /3d visualization/i });
    await expect(vizTab).toBeVisible({ timeout: 30_000 });
    await vizTab.scrollIntoViewIfNeeded();

    const canvas = unifiedTheoryPage.visualizationCanvas();
    await expect(canvas).toBeVisible({ timeout: 45_000 });
    const box = await canvas.boundingBox();
    expect(box, 'canvas should have a layout box').toBeTruthy();
    expect(box.width).toBeGreaterThan(40);
    expect(box.height).toBeGreaterThan(40);

    await expect(unifiedTheoryPage.timelineControls()).toBeVisible();
    await expect(unifiedTheoryPage.timelineControls()).toHaveAttribute('data-compact', 'true');
    await expect(unifiedTheoryPage.mobileTierChip()).toBeVisible();

    const scrubber = unifiedTheoryPage.scrubber();
    await expect(scrubber).toBeVisible();
    await scrubber.scrollIntoViewIfNeeded();

    const slider = scrubber.locator('input[type="range"]');
    await expect(slider).toBeVisible();
    const before = await slider.inputValue();
    await slider.fill('0.72');
    const after = await slider.inputValue();
    expect(Number(after)).toBeCloseTo(0.72, 2);
    expect(after).not.toEqual(before);

    expect(pageErrors, pageErrors.join('\n')).toEqual([]);
    expect(webglConsoleErrors, webglConsoleErrors.join('\n')).toEqual([]);
  });
});
