import { MINIMUM_CENTER } from './bubblePhaseSchedule';
import {
  COLLAPSE_RIBBON_DEFAULT_ORIGIN,
  COLLAPSE_RIBBON_FIDELITY,
  buildCollapseRibbonPositions,
  collapseRibbonCollapsePunch,
  collapseRibbonPlayheadIndex,
} from './collapseTrajectoryRibbon';

describe('collapseTrajectoryRibbon', () => {
  const trajectory = {
    time_s: [0, 0.5e-5, 1e-5, 1.5e-5],
    radius_um: [10, 6, 1.2, 3],
    min_radius_sample_index: 2,
    source: 'rayleigh_plesset_trajectory',
  };

  test('builds positions near scale-bar defaults (below lattice floor)', () => {
    const built = buildCollapseRibbonPositions({
      trajectory,
      initialRadiusUm: 10,
    });
    expect(built).not.toBeNull();
    expect(built.sampleCount).toBe(4);
    expect(built.minIndex).toBe(2);
    expect(built.fidelity).toBe(COLLAPSE_RIBBON_FIDELITY);
    expect(built.positions).toHaveLength(12);
    // Left edge near scale-bar originX
    expect(built.positions[0]).toBeCloseTo(COLLAPSE_RIBBON_DEFAULT_ORIGIN.originX);
    // All Y stay near nestY (small amp — not mid-lattice)
    for (let i = 0; i < 4; i += 1) {
      const y = built.positions[i * 3 + 1];
      expect(y).toBeGreaterThanOrEqual(COLLAPSE_RIBBON_DEFAULT_ORIGIN.nestY - 0.01);
      expect(y).toBeLessThanOrEqual(
        COLLAPSE_RIBBON_DEFAULT_ORIGIN.nestY + COLLAPSE_RIBBON_DEFAULT_ORIGIN.yAmp + 0.01,
      );
    }
    // Min-radius sample lower on Y than first (collapsed)
    expect(built.positions[2 * 3 + 1]).toBeLessThan(built.positions[1]);
  });

  test('returns null for empty / short trajectories', () => {
    expect(buildCollapseRibbonPositions({ trajectory: null })).toBeNull();
    expect(buildCollapseRibbonPositions({
      trajectory: { time_s: [0], radius_um: [10] },
    })).toBeNull();
  });

  test('playhead dual-clock: visual MINIMUM maps near acoustic minIndex', () => {
    expect(collapseRibbonPlayheadIndex(5, 0)).toBe(0);
    expect(collapseRibbonPlayheadIndex(5, 1)).toBe(4);
    // With min at index 2 of 5 → m=0.5; visual MINIMUM_CENTER → acoustic ~0.5 → idx 2
    expect(collapseRibbonPlayheadIndex(5, MINIMUM_CENTER, 2)).toBe(2);
  });

  test('collapse punch peaks near min-R / MINIMUM window', () => {
    const atMin = collapseRibbonCollapsePunch({
      sampleCount: 5,
      visualCycleFraction: MINIMUM_CENTER,
      minIndex: 2,
    });
    const away = collapseRibbonCollapsePunch({
      sampleCount: 5,
      visualCycleFraction: 0.1,
      minIndex: 2,
    });
    expect(atMin).toBeGreaterThan(away);
    expect(atMin).toBeGreaterThan(0.5);
  });
});
