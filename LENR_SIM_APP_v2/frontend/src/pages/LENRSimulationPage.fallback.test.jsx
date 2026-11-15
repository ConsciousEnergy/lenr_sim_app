/**
 * Honesty: LENR legacy fallback must not present unconstrained screening
 * multipliers or synthetic series as experimental corroboration.
 */
import {
  generateFallbackResults,
  pickLenrReactionRate,
} from './LENRSimulationPage';

describe('LENRSimulationPage schematic fallback', () => {
  test('labels provenance and caps toy screening enhancement', () => {
    // T≈1 K → exp(20/√T) ≫ 1e5 governance ceiling
    const result = generateFallbackResults(
      { temperature: 1, loadingRatio: 0.9, defectDensity: 0.05 },
      { lattice_parameters: {} },
    );

    expect(result.provenance).toBe('schematic_fallback');
    expect(result.results.formula_claimed).toBe(false);
    expect(result.results.screening_model).toBe(
      'schematic_debye_toy_not_assenbaum',
    );
    expect(result.results.total_enhancement).toBeLessThanOrEqual(1e5);
    expect(result.results.enhancement_capped).toBe(true);
    expect(result.results.warnings.join(' ')).toMatch(/not Assenbaum/i);
    expect(result.timeSeriesData.provenance).toBe('schematic_fallback');
    // Modulated series must also respect the ceiling (export honesty)
    expect(Math.max(...result.timeSeriesData.enhancement)).toBeLessThanOrEqual(1e5);
    // LENRVisualization reads top-level summary/time
    expect(result.summary.provenance).toBe('schematic_fallback');
    expect(result.summary.excess_heat).toBeNull();
    expect(result.time).toBeGreaterThan(0);
  });

  test('still schematic below the ceiling', () => {
    const result = generateFallbackResults(
      { temperature: 1e6, loadingRatio: 0.5, defectDensity: 0 },
      { lattice_parameters: {} },
    );

    expect(result.provenance).toBe('schematic_fallback');
    expect(result.results.formula_claimed).toBe(false);
    expect(result.results.warnings.join(' ')).toMatch(/do not cite/i);
  });

  test('fallback series duration follows requested timeStepSize and totalSimulationTime', () => {
    const result = generateFallbackResults(
      {
        temperature: 300,
        loadingRatio: 0.5,
        defectDensity: 0,
        timeStepSize: 0.25,
        totalSimulationTime: 1,
      },
      { lattice_parameters: {} },
    );
    expect(result.timeSeriesData.time[0]).toBe(0);
    expect(result.timeSeriesData.time.at(-1)).toBeCloseTo(1, 5);
    expect(result.time).toBeCloseTo(1, 5);
    expect(result.timeSeriesData.time).toHaveLength(5); // 0, 0.25, 0.5, 0.75, 1
  });

  test('500-point cap still spans the full requested duration', () => {
    const result = generateFallbackResults(
      {
        temperature: 300,
        loadingRatio: 0.5,
        defectDensity: 0,
        timeStepSize: 0.01,
        totalSimulationTime: 100,
      },
      { lattice_parameters: {} },
    );
    expect(result.timeSeriesData.time).toHaveLength(500);
    expect(result.timeSeriesData.time.at(-1)).toBeCloseTo(100, 5);
    expect(result.time).toBeCloseTo(100, 5);
    expect(result.results.warnings.join(' ')).toMatch(/Sample count capped/i);
  });
});

describe('pickLenrReactionRate', () => {
  test('prefers total_reaction_rate_s and preserves zero', () => {
    expect(pickLenrReactionRate({ total_reaction_rate_s: 0, rate: 99 })).toBe(0);
    expect(pickLenrReactionRate({ total_reaction_rate_s: 1.5e4 })).toBe(1.5e4);
  });

  test('falls back to rate only when preferred fields are absent', () => {
    expect(pickLenrReactionRate({ rate: 42 })).toBe(42);
    expect(pickLenrReactionRate({})).toBeNull();
    expect(pickLenrReactionRate(null)).toBeNull();
  });
});
