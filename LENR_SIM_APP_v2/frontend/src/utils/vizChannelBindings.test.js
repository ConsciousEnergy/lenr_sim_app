import {
  BUBBLE_LATTICE_VIZ_CHANNELS,
  buildCollapseHudChannels,
  buildEnhancementBreakdownChannels,
  buildVizChannelsFromFrame,
  listGapChannels,
  resolveHudReadout,
} from './vizChannelBindings';

describe('vizChannelBindings', () => {
  test('refuses bare numbers without a channel binding', () => {
    expect(resolveHudReadout({ channel_id: 'invented.sigma_q', value: 5 })).toBeNull();
  });

  test('value readout always carries claim_tier + fidelity', () => {
    const readout = resolveHudReadout({
      channel_id: 'collapse.temperature_k',
      value: 1200,
      source: 'solver',
    });
    expect(readout.kind).toBe('value');
    expect(readout.claim_tier).toBeTruthy();
    expect(readout.fidelity).toBe('quantitative');
    expect(readout.display).toContain('K');
  });

  test('local fallback demotes claim tier to speculative', () => {
    const readout = resolveHudReadout({
      channel_id: 'enhancement.claim_tier_display',
      value: 1e5,
      source: 'local_fallback',
    });
    expect(readout.claim_tier).toBe('speculative_exploratory');
  });

  test('null melt / P_* channels show gap chips', () => {
    const gap = resolveHudReadout({
      channel_id: 'host.phase_fraction_liquid',
      value: null,
    });
    expect(gap.kind).toBe('gap');
    expect(listGapChannels().map((c) => c.channel_id)).toEqual(
      expect.arrayContaining([
        'host.phase_fraction_liquid',
        'heat.P_joule',
        'heat.P_resistive',
        'heat.P_photonic',
      ]),
    );
  });

  test('stream viz_channels map keeps melt null', () => {
    const channels = buildVizChannelsFromFrame({
      normalized_time: 0.7,
      phase: 'MINIMUM',
      radius_um: 1.2,
      temperature_k: 2000,
      electric_field_v_m: 1e8,
      enhancement: 1e4,
      proton_distribution: { NUCLEAR: 0.4 },
    });
    expect(channels['bubble.radius_um']).toBe(1.2);
    expect(channels['host.phase_fraction_liquid']).toBeNull();
    expect(channels['heat.P_photonic']).toBeNull();
    expect(BUBBLE_LATTICE_VIZ_CHANNELS['bubble.phase']).toBeTruthy();
  });

  test('VIZ-05 collapse HUD builds R/T/Mach/solver with ceiling meta', () => {
    const { channels, meta } = buildCollapseHudChannels({
      min_radius_um: 0.8,
      max_temperature_k: 2e6,
      bubble_dynamics: {
        peak_mach: 0.12,
        bounds_solver_used: 'keller_miksis',
        km_auto_selected: true,
        compressibility_regime: 'weakly_compressible',
      },
      limits: {
        temperature_k: {
          ceiling: 2e6,
          is_saturated: true,
          value_raw: 4.5e6,
        },
      },
    });
    const ids = channels.map((c) => c.channel_id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'bubble.radius_um',
        'collapse.temperature_k',
        'collapse.peak_mach',
        'collapse.solver',
      ]),
    );
    expect(meta.temperature_at_ceiling).toBe(true);
    expect(meta.km_auto_selected).toBe(true);
    expect(BUBBLE_LATTICE_VIZ_CHANNELS['collapse.peak_mach']).toBeTruthy();
    expect(BUBBLE_LATTICE_VIZ_CHANNELS['collapse.solver']).toBeTruthy();
    expect(
      resolveHudReadout({ channel_id: 'collapse.solver', value: 'rayleigh_plesset' }).display,
    ).toMatch(/Rayleigh–Plesset/);
  });

  test('VIZ-05 collapse HUD returns empty when collapse_results absent', () => {
    const { channels, meta } = buildCollapseHudChannels(null);
    expect(channels).toEqual([]);
    expect(meta.temperature_at_ceiling).toBe(false);
  });

  test('VIZ-05 collapse HUD stamps local_fallback sampleSource (route honesty)', () => {
    const { channels } = buildCollapseHudChannels(
      {
        min_radius_um: 0.5,
        max_temperature_k: 1200,
        bubble_dynamics: { peak_mach: 0.05, bounds_solver_used: 'rayleigh_plesset' },
      },
      { sampleSource: 'local_fallback' },
    );
    expect(channels.length).toBeGreaterThan(0);
    expect(channels.every((c) => c.source === 'local_fallback')).toBe(true);
    expect(
      resolveHudReadout({
        channel_id: 'collapse.solver',
        value: 'rayleigh_plesset',
        source: 'local_fallback',
      }).claim_tier,
    ).toBe('speculative_exploratory');
  });

  test('enhancement breakdown channels carry claim tiers (engine stack)', () => {
    const channels = buildEnhancementBreakdownChannels(
      {
        screening: 1e3,
        qed: 2,
        casimir: 3,
        rydberg: 4,
        compression: 10,
        phonon: 1.5,
        loading: 1.2,
      },
      { sampleSource: 'solver' },
    );
    expect(channels).toHaveLength(7);
    expect(channels.every((c) => c.source === 'solver')).toBe(true);
    const screening = resolveHudReadout(channels[0]);
    expect(screening.claim_tier).toBe('speculative_exploratory');
    const compression = resolveHudReadout(
      channels.find((c) => c.channel_id === 'enhancement.compression'),
    );
    expect(compression.claim_tier).toBe('empirical_lenr_correlation');
    expect(BUBBLE_LATTICE_VIZ_CHANNELS['enhancement.phonon']).toBeTruthy();
  });
});
