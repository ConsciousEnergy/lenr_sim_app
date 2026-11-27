/**
 * Primary enhancement bars / radar — engine-bound presentation only.
 */
import {
  ENHANCEMENT_BARS_FIDELITY,
  ENHANCEMENT_BARS_SOURCE,
  ENHANCEMENT_BARS_CLAIM_TAG,
  ENHANCEMENT_PRIMARY_BAR_KEYS,
  enhancementFactorBarNorm,
  buildPrimaryEnhancementBars,
  enhancementRadarVertices,
  enhancementRadarPolygonPoints,
} from './enhancementBreakdownBars';

describe('enhancementBreakdownBars', () => {
  test('honesty tags stay schematic / speculative engine-bound', () => {
    expect(ENHANCEMENT_BARS_FIDELITY).toBe('schematic');
    expect(ENHANCEMENT_BARS_SOURCE).toBe('enhancement_breakdown');
    expect(ENHANCEMENT_BARS_CLAIM_TAG).toMatch(/speculative/i);
    expect(ENHANCEMENT_PRIMARY_BAR_KEYS).toEqual(['screening', 'phonon', 'loading']);
  });

  test('enhancementFactorBarNorm is log10-scaled and capped', () => {
    expect(enhancementFactorBarNorm(1)).toBeCloseTo(0, 5);
    expect(enhancementFactorBarNorm(1e3)).toBeCloseTo(0.5, 5);
    expect(enhancementFactorBarNorm(1e6)).toBeCloseTo(1, 5);
    expect(enhancementFactorBarNorm(1e9)).toBe(1);
    expect(enhancementFactorBarNorm(0.5)).toBeCloseTo(0, 5);
  });

  test('buildPrimaryEnhancementBars orders screening · phonon · loading', () => {
    const bars = buildPrimaryEnhancementBars(
      { screening: 1e3, phonon: 10, loading: 1.5, qed: 2 },
      { sampleSource: 'solver' },
    );
    expect(bars.map((b) => b.key)).toEqual(['screening', 'phonon', 'loading']);
    expect(bars[0].norm).toBeGreaterThan(bars[1].norm);
    expect(bars[1].norm).toBeGreaterThan(bars[2].norm);
    expect(bars.every((b) => b.isEngine)).toBe(true);
    expect(bars.every((b) => b.inventsLiquidFraction !== true)).toBe(true);
    expect(bars[0].claimTag).toMatch(/engine-bound/i);
    expect(bars.every((b) => b.claim_tier === 'speculative_exploratory')).toBe(true);
    expect(bars.every((b) => /speculative/i.test(b.claim_tier_label))).toBe(true);
  });

  test('missing factors stay at floor without inventing values', () => {
    const bars = buildPrimaryEnhancementBars(
      { phonon: 5 },
      { sampleSource: 'local_fallback' },
    );
    expect(bars[0].missing).toBe(true); // screening
    expect(bars[0].value).toBeNull();
    expect(bars[1].missing).toBe(false);
    expect(bars[1].value).toBe(5);
    expect(bars[2].isEngine).toBe(false);
  });

  test('radar vertices and polygon follow bar norms', () => {
    const bars = buildPrimaryEnhancementBars({
      screening: 1e6,
      phonon: 1,
      loading: 1e3,
    });
    const verts = enhancementRadarVertices(bars, { cx: 50, cy: 50, r: 40 });
    expect(verts).toHaveLength(3);
    // screening at top (angle -π/2) with full radius
    expect(verts[0].y).toBeCloseTo(10, 5);
    expect(verts[1].norm).toBeCloseTo(0, 5);
    const pts = enhancementRadarPolygonPoints(verts);
    expect(pts.split(' ')).toHaveLength(3);
  });
});
