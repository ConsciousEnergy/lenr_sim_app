import {
  BENCHMARK_PACK_ID,
  UNIFIED_EXPORT_ENDPOINT,
  buildUnifiedExportPayload,
} from './unifiedExportPayload';

describe('buildUnifiedExportPayload', () => {
  const baseParams = {
    hostMaterial: 'palladium',
    reactant: 'deuterium',
    temperature: 300,
    loadingRatio: 0.9,
    defectDensity: 1e16,
    surfaceRoughness: 5e-9,
    grainSize: 50e-9,
    electrolyteFamily: 'li',
    electrolyteSpecies: 'lioh',
    electrolyteMolarityMolL: 0.3,
  };

  test('nests SimulationRequest fields for /api/unified/export', () => {
    const payload = buildUnifiedExportPayload(baseParams, {
      rateMode: 'two_body',
      includeUncertainty: true,
      uncertaintySamples: 32,
      randomSeed: 5,
    });
    expect(payload.material.host_material).toBe('palladium');
    expect(payload.material.reactant).toBe('deuterium');
    expect(payload.environmental.temperature).toBe(300);
    expect(payload.lattice.loading_ratio).toBe(0.9);
    expect(payload.rate_mode).toBe('two_body');
    expect(payload.include_uncertainty).toBe(true);
    expect(payload.uncertainty_samples).toBe(32);
    expect(payload.random_seed).toBe(5);
    expect(UNIFIED_EXPORT_ENDPOINT).toBe('/api/unified/export');
    expect(BENCHMARK_PACK_ID).toBe('umlenr-p1-p6-v1');
  });

  test('empty randomSeed becomes null', () => {
    const payload = buildUnifiedExportPayload(baseParams, { randomSeed: '' });
    expect(payload.random_seed).toBeNull();
  });
});
