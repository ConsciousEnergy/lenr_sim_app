import {
  BUBBLE_LATTICE_VIZ_CHANNELS,
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
});
