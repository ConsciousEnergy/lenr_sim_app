/**
 * First-visit UBLV overlay chrome defaults.
 * Match the minimized 3D view (Layers tab right, Local Calc strip down,
 * Legend drawer collapsed, Enhancement Breakdown minimized).
 */
export const UBLV_OVERLAY_CHROME_DEFAULTS = Object.freeze({
  legendCollapsed: true,
  // Open so MHD / phonon / e⁻ mig toggles are discoverable on first visit
  layersCollapsed: false,
  metricsCollapsed: true,
  enhancementCollapsed: true,
});
