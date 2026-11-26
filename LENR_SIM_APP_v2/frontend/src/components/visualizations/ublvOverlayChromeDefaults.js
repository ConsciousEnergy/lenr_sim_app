/**
 * First-visit UBLV overlay chrome defaults.
 * Match the minimized 3D view (Layers tab right, Local Calc strip down,
 * Legend drawer collapsed, Enhancement Breakdown minimized).
 */
export const UBLV_OVERLAY_CHROME_DEFAULTS = Object.freeze({
  legendCollapsed: true,
  // Closed on first visit — tap Layers tab to expand (Diadon HSE)
  layersCollapsed: true,
  metricsCollapsed: true,
  enhancementCollapsed: true,
});
