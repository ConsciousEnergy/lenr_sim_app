import { mapBubbleFusionApiResults, pickFiniteNumber } from './BubbleFusionPage';

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
});

describe('pickFiniteNumber', () => {
  it('skips null/undefined/NaN', () => {
    expect(pickFiniteNumber(null, undefined, Number.NaN, 3)).toBe(3);
    expect(pickFiniteNumber()).toBeNull();
  });
});
