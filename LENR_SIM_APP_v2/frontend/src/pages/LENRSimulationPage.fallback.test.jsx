/**
 * Honesty: LENR legacy fallback must not present unconstrained screening
 * multipliers or synthetic series as experimental corroboration.
 */
import { generateFallbackResults } from './LENRSimulationPage';

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
});
