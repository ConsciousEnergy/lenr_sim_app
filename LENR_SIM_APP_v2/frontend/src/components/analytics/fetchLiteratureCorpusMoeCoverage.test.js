/**
 * Live literature corpus MoE coverage fetch — honesty gates.
 */
import {
  fetchLiteratureCorpusMoeCoverage,
  isHonestLiteratureCorpusMoeCoverage,
  LITERATURE_CORPUS_MOE_COVERAGE_PATH,
} from './fetchLiteratureCorpusMoeCoverage';

const HONEST = Object.freeze({
  schema: 'lenr-moe-coverage-v1',
  n_records: 26,
  with_sigma_q: 5,
  with_literature_reported_cite_gated: 2,
  with_moe_pairing_verified: 2,
  discovery_grade_eligible_count: 2,
  discovery_grade_eligible_ids: ['kasagi-nicu-radiant-2026', 'kasagi-ni-radiant-2026'],
  closes_eq_open: false,
  lenr_proved: false,
  source: 'literature_records+iccf27_literature_records+exploratory_moe_literature_records',
});

describe('fetchLiteratureCorpusMoeCoverage honesty', () => {
  test('accepts honest live coverage and rejects lock violations', () => {
    expect(isHonestLiteratureCorpusMoeCoverage(HONEST)).toBe(true);
    expect(
      isHonestLiteratureCorpusMoeCoverage({ ...HONEST, closes_eq_open: true }),
    ).toBe(false);
    expect(
      isHonestLiteratureCorpusMoeCoverage({ ...HONEST, lenr_proved: true }),
    ).toBe(false);
    expect(
      isHonestLiteratureCorpusMoeCoverage({
        ...HONEST,
        discovery_grade_eligible_count: 26,
      }),
    ).toBe(false);
  });

  test('returns live payload on 200 honest JSON', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => HONEST,
    }));
    const row = await fetchLiteratureCorpusMoeCoverage({ fetchImpl });
    expect(row).toEqual(HONEST);
    expect(fetchImpl.mock.calls[0][0]).toContain(LITERATURE_CORPUS_MOE_COVERAGE_PATH);
  });

  test('returns null on network or dishonest payload', async () => {
    await expect(
      fetchLiteratureCorpusMoeCoverage({
        fetchImpl: jest.fn(async () => {
          throw new Error('offline');
        }),
      }),
    ).resolves.toBeNull();
    await expect(
      fetchLiteratureCorpusMoeCoverage({
        fetchImpl: jest.fn(async () => ({
          ok: true,
          json: async () => ({ ...HONEST, lenr_proved: true }),
        })),
      }),
    ).resolves.toBeNull();
  });

  test('returns null when no fetch implementation is available', async () => {
    // Explicit null fetchImpl simulates Jest/Node without ambient fetch.
    await expect(
      fetchLiteratureCorpusMoeCoverage({ fetchImpl: null }),
    ).resolves.toBeNull();
  });
});
