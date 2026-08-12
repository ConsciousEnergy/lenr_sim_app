import {
  buildBubbleLatticePayload,
  framesToStreamPreview,
} from './bubbleLatticePayload';

describe('buildBubbleLatticePayload', () => {
  const parameters = {
    hostMaterial: 'palladium',
    reactant: 'deuterium',
    temperature: 300,
    loadingRatio: 0.9,
    initialBubbleRadius: 10.0,
    drivingPressure: 1.5,
    frequency: 20,
    defectDensity: 1e16,
    surfaceRoughness: 5e-9,
    grainSize: 50e-9,
    numCycles: 2,
    electrolyteFamily: 'li',
    electrolyteSpecies: 'lioh',
    electrolyteMolarityMolL: 0.3,
  };

  it('nests the UI bag into the bubble/material/lattice contract', () => {
    const payload = buildBubbleLatticePayload(parameters, {
      rateMode: 'two_body',
      includeUncertainty: false,
      uncertaintySamples: 256,
      randomSeed: '',
    });
    // The slider value is true micrometres and must be sent unmodified.
    expect(payload.bubble.initial_radius_um).toBe(10.0);
    expect(payload.material.host_material).toBe('palladium');
    expect(payload.lattice.loading_ratio).toBe(0.9);
    expect(payload.electrolyte.family).toBe('li');
    expect(payload.rate_mode).toBe('two_body');
    expect(payload.random_seed).toBeNull();
  });
});

describe('framesToStreamPreview', () => {
  it('folds stream frames into a timeline the charts understand', () => {
    const preview = framesToStreamPreview([
      {
        type: 'physics_update',
        normalized_time: 0.1,
        phase: 'EXPANSION',
        enhancement: 10,
        radius_um: 9,
        temperature_k: 320,
        pressure_bar: 2,
        electric_field_v_m: 1e8,
        proton_distribution: { FREE: 1, SCREENED: 0, CAPTURE_READY: 0, NUCLEAR: 0 },
        enhancement_breakdown: { total: 10, screening: 10, electrolyte: 1 },
        conditions: { radius_factor: 0.9 },
      },
      {
        type: 'physics_update',
        normalized_time: 0.5,
        phase: 'MINIMUM',
        enhancement: 1e5,
        radius_um: 1.5,
        temperature_k: 2500,
        pressure_bar: 1800,
        electric_field_v_m: 1e12,
        proton_distribution: { FREE: 0.1, SCREENED: 0.2, CAPTURE_READY: 0.3, NUCLEAR: 0.4 },
        enhancement_breakdown: { total: 1e5, screening: 1e5, electrolyte: 1.05 },
        conditions: { radius_factor: 0.15 },
      },
    ]);
    expect(preview.source).toBe('bubble_lattice_stream');
    expect(preview.enhancement_timeline).toHaveLength(2);
    expect(preview.collapse_results.min_radius_um).toBe(1.5);
    expect(preview.peak_conditions.enhancement_factor).toBe(1e5);
  });
});
