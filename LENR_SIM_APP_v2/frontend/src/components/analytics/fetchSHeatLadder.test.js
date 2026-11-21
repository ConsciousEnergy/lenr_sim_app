import {
  fetchSHeatLadder,
  isHonestSHeatLadder,
  S_HEAT_LADDER_PATH,
} from './fetchSHeatLadder';

describe('fetchSHeatLadder', () => {
  const honest = {
    schema: 'lenr-s-heat-ladder-v1',
    n_records: 26,
    discovery_grade_threshold_sigma: 5,
    ranked_high_success: [{ literature_id: 'kasagi-nicu-radiant-2026' }],
    honest_high_success_order_ids: ['kasagi-nicu-radiant-2026'],
    demoted_seed_scale: [
      { literature_id: 'deninno-tid-1995', high_success_rankable: false },
    ],
    closes_eq_open: false,
    lenr_proved: false,
  };

  it('accepts honest ladder payloads', () => {
    expect(isHonestSHeatLadder(honest)).toBe(true);
  });

  it('rejects lenr_proved or EQ-OPEN flips', () => {
    expect(isHonestSHeatLadder({ ...honest, lenr_proved: true })).toBe(false);
    expect(isHonestSHeatLadder({ ...honest, closes_eq_open: true })).toBe(false);
  });

  it('rejects seed rows marked high_success_rankable', () => {
    expect(
      isHonestSHeatLadder({
        ...honest,
        demoted_seed_scale: [
          { literature_id: 'deninno-tid-1995', high_success_rankable: true },
        ],
      }),
    ).toBe(false);
  });

  it('returns null on network failure and honest payload on success', async () => {
    const ok = await fetchSHeatLadder({
      fetchImpl: async () => ({
        ok: true,
        json: async () => honest,
      }),
    });
    expect(ok?.schema).toBe('lenr-s-heat-ladder-v1');
    expect(S_HEAT_LADDER_PATH).toBe('/api/analytics/s-heat-ladder');

    const fail = await fetchSHeatLadder({
      fetchImpl: async () => {
        throw new Error('offline');
      },
    });
    expect(fail).toBeNull();
  });
});
