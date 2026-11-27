/**
 * Shared Playwright helpers for turbulent-torus preview captures.
 * Require a rendered-preview ack before writing screenshots —
 * do not treat elapsed-time hooks or networkidle as proof of render.
 */

/**
 * Navigate to the preview and fail fast on non-OK HTTP or missing canvas.
 * @param {import('playwright').Page} page
 * @param {string} url
 * @param {{ timeout?: number }} [opts]
 */
export async function gotoPreview(page, url, { timeout = 60000 } = {}) {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
  if (!response) {
    throw new Error(`preview navigation returned no response: ${url}`);
  }
  const status = response.status();
  if (status < 200 || status >= 400) {
    throw new Error(`preview navigation failed HTTP ${status}: ${url}`);
  }
  await waitForPreviewReady(page, { timeout });
}

/**
 * Wait until the preview module has rendered at least one frame.
 * @param {import('playwright').Page} page
 * @param {{ timeout?: number }} [opts]
 */
export async function waitForPreviewReady(page, { timeout = 30000 } = {}) {
  await page.waitForFunction(
    () => {
      const canvas = document.querySelector('canvas#c');
      const state = window.__previewRenderState;
      return Boolean(
        canvas
        && canvas.width > 0
        && canvas.height > 0
        && state
        && state.ready === true
        && state.frameId > 0,
      );
    },
    null,
    { timeout },
  );
}

/**
 * Seek the patched performance clock and wait for a new rendered frame ack.
 * @param {import('playwright').Page} page
 * @param {number} elapsedSec
 * @param {{ timeout?: number }} [opts]
 */
export async function seekAndWaitForRender(page, elapsedSec, { timeout = 15000 } = {}) {
  const before = await page.evaluate(() => window.__previewRenderState?.frameId ?? 0);
  const hasSetter = await page.evaluate(() => typeof window.__setElapsedSec === 'function');
  if (!hasSetter) {
    throw new Error('__setElapsedSec missing — init script did not install seek clock');
  }
  await page.evaluate((sec) => window.__setElapsedSec(sec), elapsedSec);
  await page.waitForFunction(
    (prevFrameId) => {
      const state = window.__previewRenderState;
      return Boolean(
        state
        && state.ready === true
        && state.frameId > prevFrameId,
      );
    },
    before,
    { timeout },
  );
}
