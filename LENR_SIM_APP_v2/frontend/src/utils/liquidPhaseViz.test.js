import {
  HEATING_MODE_GLYPHS,
  HOST_MELTING_POINT_K,
  extractLiquidPhaseChannels,
  parsePhaseFractionLiquid,
  resolveHostMeltMeta,
  resolveLiquidPhaseHostKey,
  resolveLiquidPhaseOverlayState,
} from './liquidPhaseViz';

describe('liquidPhaseViz (VIZ-07 / VIZ-12 scaffold)', () => {
  test('Pd XOR Ni melting points match literature locks', () => {
    expect(HOST_MELTING_POINT_K.palladium).toBe(1828);
    expect(HOST_MELTING_POINT_K.nickel).toBe(1728);
    expect(resolveHostMeltMeta('palladium').meltingPointK).toBe(1828);
    expect(resolveHostMeltMeta('Ni-H').meltingPointK).toBe(1728);
    expect(resolveLiquidPhaseHostKey('titanium')).toBe('unsupported');
    expect(resolveHostMeltMeta('copper').meltingPointK).toBeNull();
  });

  test('heating-mode trinity is locked to three source terms', () => {
    expect(HEATING_MODE_GLYPHS.map((g) => g.mode)).toEqual([
      'P_joule',
      'P_resistive',
      'P_photonic',
    ]);
  });

  test('never invents f_L from temperature — null stays gap', () => {
    expect(parsePhaseFractionLiquid(undefined)).toBeNull();
    expect(parsePhaseFractionLiquid(Number.NaN)).toBeNull();
    expect(parsePhaseFractionLiquid(1.5)).toBeNull();
    const gap = resolveLiquidPhaseOverlayState({
      hostMaterial: 'palladium',
      phaseFractionLiquid: null,
    });
    expect(gap.mode).toBe('gap');
    expect(gap.filmScale).toBe(0);
    expect(gap.message).toMatch(/not in contract/i);
  });

  test('schematic local film only when finite f_L on Pd or Ni', () => {
    const film = resolveLiquidPhaseOverlayState({
      hostMaterial: 'nickel',
      phaseFractionLiquid: 0.25,
    });
    expect(film.mode).toBe('schematic_film');
    expect(film.claimTier).toBe('speculative_exploratory');
    expect(film.fidelity).toBe('schematic');
    expect(film.filmScale).toBeGreaterThan(0);
    expect(film.message).toMatch(/Local film/i);

    const unsupported = resolveLiquidPhaseOverlayState({
      hostMaterial: 'titanium',
      phaseFractionLiquid: 0.9,
    });
    expect(unsupported.mode).toBe('gap');
  });

  test('extractLiquidPhaseChannels refuses inventing heat / melt', () => {
    const empty = extractLiquidPhaseChannels({ temperature_k: 2000 });
    expect(empty.phaseFractionLiquid).toBeNull();
    expect(empty.heat.P_joule).toBeNull();

    const withChannels = extractLiquidPhaseChannels({
      viz_channels: {
        'host.phase_fraction_liquid': 0.4,
        'heat.P_joule': 12.5,
      },
    });
    expect(withChannels.phaseFractionLiquid).toBe(0.4);
    expect(withChannels.heat.P_joule).toBe(12.5);
    expect(withChannels.heat.P_photonic).toBeNull();
  });
});
