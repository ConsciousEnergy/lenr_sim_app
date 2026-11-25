import { UBLV_OVERLAY_CHROME_DEFAULTS } from './ublvOverlayChromeDefaults';

describe('UBLV_OVERLAY_CHROME_DEFAULTS', () => {
  test('first visit starts with overlays minimized', () => {
    expect(UBLV_OVERLAY_CHROME_DEFAULTS).toEqual({
      legendCollapsed: true,
      layersCollapsed: true,
      metricsCollapsed: true,
      enhancementCollapsed: true,
    });
  });
});
