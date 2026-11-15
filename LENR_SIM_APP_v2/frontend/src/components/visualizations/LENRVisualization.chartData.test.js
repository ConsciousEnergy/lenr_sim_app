/**
 * Regression: shared rateScale + enhancement×1e-3 must not round away
 * valid low-amplitude primary/comparison curves (Copilot omitted finding).
 */
import { buildLenrChartData } from './lenrChartData';

describe('buildLenrChartData precision', () => {
  test('preserves low-amplitude comparison rate under shared scale', () => {
    const primary = {
      timeSeriesData: {
        time: [0, 1],
        temperature: [400, 400],
        reactionRate: [1e10, 1e10],
        enhancement: [1e5, 1e5],
      },
    };
    const comparison = {
      timeSeriesData: {
        time: [0, 1],
        temperature: [300, 300],
        reactionRate: [1e5, 1e5],
        enhancement: [3, 3],
      },
    };

    const rows = buildLenrChartData(primary, comparison);
    expect(rows).toHaveLength(2);
    // Formerly Number((1e5/1e10).toFixed(4)) === 0
    expect(rows[0].comparisonRate).toBeCloseTo(1e-5, 12);
    expect(rows[0].comparisonRate).not.toBe(0);
    expect(rows[0].reactionRate).toBeCloseTo(1, 12);
  });

  test('preserves low enhancement energy after ×1e-3 scale', () => {
    const primary = {
      timeSeriesData: {
        time: [0, 1],
        temperature: [400, 400],
        reactionRate: [1, 1],
        enhancement: [3, 3],
      },
    };

    const rows = buildLenrChartData(primary, null);
    // Formerly Number((3 * 1e-3).toFixed(2)) === 0
    expect(rows[0].energyOutput).toBeCloseTo(0.003, 12);
    expect(rows[0].energyOutput).not.toBe(0);
  });
});
