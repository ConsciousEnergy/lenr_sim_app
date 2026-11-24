import {
  getRecommendedQualitySettings,
  isCompactVisualViewport,
  isMobileDevice,
  MOBILE_VISUAL_MAX_WIDTH_PX,
} from './TouchControls';

describe('TouchControls mobile quality tier (#409)', () => {
  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: originalInnerWidth,
    });
  });

  test('compact viewport matches product-arm breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: MOBILE_VISUAL_MAX_WIDTH_PX,
    });
    expect(isCompactVisualViewport()).toBe(true);
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: MOBILE_VISUAL_MAX_WIDTH_PX + 1,
    });
    expect(isCompactVisualViewport()).toBe(false);
  });

  test('narrow viewport enables mobile quality preset without mobile UA', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 390,
    });
    expect(isMobileDevice()).toBe(true);
    const preset = getRecommendedQualitySettings();
    expect(preset.vortexVisualizationEnabled).toBe(false);
    expect(preset.skipOptionalQuantumLayers).toBe(true);
    expect(preset.maxFPS).toBe(30);
  });
});