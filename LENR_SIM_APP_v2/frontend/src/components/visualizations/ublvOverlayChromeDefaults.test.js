import { UBLV_OVERLAY_CHROME_DEFAULTS } from './ublvOverlayChromeDefaults';

describe('UBLV_OVERLAY_CHROME_DEFAULTS', () => {
  test('first visit keeps metrics/legend minimized; Layers open for MHD toggles', () => {
    expect(UBLV_OVERLAY_CHROME_DEFAULTS).toEqual({
      legendCollapsed: true,
      layersCollapsed: false,
      metricsCollapsed: true,
      enhancementCollapsed: true,
    });
  });
});
