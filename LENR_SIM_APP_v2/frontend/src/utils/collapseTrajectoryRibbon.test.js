import {
  COLLAPSE_RIBBON_FIDELITY,
  buildCollapseRibbonPositions,
  collapseRibbonPlayheadIndex,
} from './collapseTrajectoryRibbon';

describe('collapseTrajectoryRibbon', () => {
  const trajectory = {
    time_s: [0, 0.5e-5, 1e-5, 1.5e-5],
    radius_um: [10, 6, 1.2, 3],
    min_radius_sample_index: 2,
    source: 'rayleigh_plesset_trajectory',
  };

  test('builds positions from engine collapse_trajectory', () => {
    const built = buildCollapseRibbonPositions({
      trajectory,
      initialRadiusUm: 10,
      spanX: 4,
      nestY: -0.5,
      planeZ: 1.5,
    });
    expect(built).not.toBeNull();
    expect(built.sampleCount).toBe(4);
    expect(built.minIndex).toBe(2);
    expect(built.fidelity).toBe(COLLAPSE_RIBBON_FIDELITY);
    expect(built.positions).toHaveLength(12);
    // First sample at left of span
    expect(built.positions[0]).toBeCloseTo(-2);
    // Min-radius sample lower on Y than first (collapsed)
    expect(built.positions[2 * 3 + 1]).toBeLessThan(built.positions[1]);
  });

  test('returns null for empty / short trajectories', () => {
    expect(buildCollapseRibbonPositions({ trajectory: null })).toBeNull();
    expect(buildCollapseRibbonPositions({
      trajectory: { time_s: [0], radius_um: [10] },
    })).toBeNull();
  });

  test('playhead index tracks cycle fraction', () => {
    expect(collapseRibbonPlayheadIndex(5, 0)).toBe(0);
    expect(collapseRibbonPlayheadIndex(5, 1)).toBe(4);
    expect(collapseRibbonPlayheadIndex(5, 0.5)).toBe(2);
  });
});
