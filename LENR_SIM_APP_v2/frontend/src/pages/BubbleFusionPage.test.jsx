import {
  mapBubbleFusionApiResults,
  pickFiniteNumber,
  buildSchematicBubbleFusionPayload,
  BF_PROVENANCE,
} from './BubbleFusionPage';

describe('mapBubbleFusionApiResults', () => {
  it('does not invent 1e13 when the API omits enhancement_factor', () => {
    const mapped = mapBubbleFusionApiResults({
      peak_temperature_k: 12000,
      peak_pressure_bar: 800,
    });
    expect(mapped.enhancementFactor).toBeNull();
    expect(mapped.maxTemperature).toBe(12000);
    expect(mapped.isLocalFallback).toBe(false);
  });

  it('reads nested collapse peak_enhancement when present', () => {
    const mapped = mapBubbleFusionApiResults({
      collapse_results: { peak_enhancement: 1e5, max_temperature_k: 9000 },
    });
    expect(mapped.enhancementFactor).toBe(1e5);
    expect(mapped.maxTemperature).toBe(9000);
  });

  it('maps engine GPa pressure, compression_ratio, and peak_velocity_km_s', () => {
    const mapped = mapBubbleFusionApiResults({
      collapse_results: {
        max_temperature_k: 1e6,
        max_pressure_gpa: 12.5,
        min_radius_um: 0.4,
        collapse_time_ns: 12,
        compression_ratio: 25,
        peak_velocity_km_s: 1.5,
        fusion_probability: 1e-20,
      },
    });
    expect(mapped.maxPressureGpa).toBe(12.5);
    expect(mapped.maxPressure).toBe(12.5 * 1e4);
    expect(mapped.compressionRatio).toBe(25);
    expect(mapped.peakVelocityKmS).toBe(1.5);
    expect(mapped.isLocalFallback).toBe(false);
  });
});

describe('pickFiniteNumber', () => {
  it('skips null/undefined/NaN', () => {
    expect(pickFiniteNumber(null, undefined, Number.NaN, 3)).toBe(3);
    expect(pickFiniteNumber()).toBeNull();
  });
});


describe('buildSchematicBubbleFusionPayload', () => {
  it('marks schematic provenance and zero fusion probability', () => {
    const payload = buildSchematicBubbleFusionPayload(
      { initialRadius: 10, drivingPressureAmplitude: 1.2, frequency: 20 },
      {
        maxTemperature: 5000,
        minRadius: 0.5,
        collapseTime: 1e-6,
        maxPressureGpa: null,
        maxPressure: 800,
        compressionRatio: 20,
      },
    );
    expect(payload.provenance).toBe(BF_PROVENANCE.SCHEMATIC_FALLBACK);
    expect(payload.collapse_results.fusion_probability).toBe(0);
    expect(payload.schematic_note).toMatch(/Not POST/i);
  });
});

describe('mapBubbleFusionApiResults provenance', () => {
  it('tags physics_engine provenance', () => {
    const mapped = mapBubbleFusionApiResults({
      collapse_results: { max_temperature_k: 1e4 },
    });
    expect(mapped.provenance).toBe(BF_PROVENANCE.PHYSICS_ENGINE);
    expect(mapped.isLocalFallback).toBe(false);
  });
});
