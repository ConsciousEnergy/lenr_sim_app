import {
  SPACETIME_SAMPLE_SCHEMA,
  buildSpacetimeSampleBuffer,
  nearestSampleIndex,
  resolveSpacetimeSampleBuffer,
  sampleSpacetimeBuffer,
} from './spacetimeSampleBuffer';

const TIMELINE = [
  {
    normalized_time: 0,
    phase: 'EXPANSION',
    radius_um: 10,
    temperature_k: 300,
    electric_field_v_m: 1e6,
    enhancement: 2,
    proton_distribution: { NUCLEAR: 0.01 },
  },
  {
    normalized_time: 0.5,
    phase: 'COLLAPSE',
    radius_um: 4,
    temperature_k: 800,
    electric_field_v_m: 5e7,
    enhancement: 100,
    proton_distribution: { NUCLEAR: 0.2 },
  },
  {
    normalized_time: 1,
    phase: 'REBOUND',
    radius_um: 8,
    temperature_k: 400,
    electric_field_v_m: 2e6,
    enhancement: 10,
    proton_distribution: { NUCLEAR: 0.05 },
  },
];

describe('spacetimeSampleBuffer', () => {
  test('builds compact buffer with R/T/E/enhancement/occupancy rows', () => {
    const buffer = buildSpacetimeSampleBuffer(TIMELINE);
    expect(buffer.schema).toBe(SPACETIME_SAMPLE_SCHEMA);
    expect(buffer.sample_count).toBe(3);
    expect(buffer.rows[1][1]).toBe(4);
    expect(buffer.rows[1][2]).toBe(800);
    expect(buffer.rows[1][4]).toBe(100);
    expect(buffer.rows[1][5]).toBe(0.2);
  });

  test('samples interpolate between engine frames', () => {
    const buffer = buildSpacetimeSampleBuffer(TIMELINE);
    const mid = sampleSpacetimeBuffer(buffer, 0.25);
    expect(mid.source).toBe('interpolated');
    expect(mid.radius_um).toBeCloseTo(7, 5);
    expect(mid.temperature_k).toBeCloseTo(550, 5);
  });

  test('resolve prefers explicit payload buffer', () => {
    const explicit = buildSpacetimeSampleBuffer(TIMELINE, { source: 'api' });
    const resolved = resolveSpacetimeSampleBuffer({
      spacetime_sample_buffer: explicit,
      enhancement_timeline: [],
    });
    expect(resolved.source).toBe('api');
    expect(nearestSampleIndex(resolved, 0.6)).toBe(1);
  });

  test('resolve folds stream frames when POST buffer missing', () => {
    const resolved = resolveSpacetimeSampleBuffer(null, TIMELINE);
    expect(resolved.source).toBe('bubble_lattice_stream');
    expect(resolved.sample_count).toBe(3);
  });
});
