import {
  BUBBLE_VIS_RADIUS_FACTOR_MAX,
  BUBBLE_VIS_SCALE,
  clampBubbleRadiusFactor,
  getBubbleDisplayScale,
  getBubbleScaleFromPhase,
} from './bubbleVisualScale';

describe('bubbleVisualScale', () => {
  test('clamps oversized Rayleigh-Plesset expansions into the scene envelope', () => {
    expect(clampBubbleRadiusFactor(10)).toBe(BUBBLE_VIS_RADIUS_FACTOR_MAX);
    expect(clampBubbleRadiusFactor(0.01)).toBe(0.1);
    expect(clampBubbleRadiusFactor(1.0)).toBe(1.0);
  });

  test('expansion at compression 0.1x stays near FULL_SIZE, not 10x', () => {
    const scale = getBubbleDisplayScale({
      radiusFactor: 10, // Compression: 0.1x → R/R0 = 10
      phase: 'EXPANSION',
      phaseProgress: 1,
    });
    expect(scale).toBeLessThanOrEqual(BUBBLE_VIS_SCALE.FULL_SIZE * 1.01);
    expect(scale).toBeGreaterThan(0.5);
  });

  test('early expansion stays nucleation-small even if radius_factor is huge', () => {
    const scale = getBubbleDisplayScale({
      radiusFactor: 10,
      phase: 'EXPANSION',
      phaseProgress: 0,
    });
    expect(scale).toBeCloseTo(BUBBLE_VIS_SCALE.NUCLEATION, 5);
  });

  test('collapse follows the physical minimum once below schematic size', () => {
    const scale = getBubbleDisplayScale({
      radiusFactor: 0.12,
      phase: 'COLLAPSE',
      phaseProgress: 0.5,
    });
    expect(scale).toBeCloseTo(0.12, 5);
    expect(scale).toBeLessThan(getBubbleScaleFromPhase('COLLAPSE', 0.5));
  });
});
