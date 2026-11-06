/**
 * Honesty contract for Theory Paper science-evidence config (Phase E).
 */
import {
  AVENUE_RANKING_SUMMARY,
  CAMPAIGN_EVIDENCE,
  EQ_OPEN_RUNWAY,
  FORMALIZATION_STATUS,
  OPEN_EQ_IDS,
  SCIENCE_EVIDENCE_HONESTY,
  assertScienceEvidenceHonesty,
} from './unifiedTheoryScienceEvidence';

describe('unifiedTheoryScienceEvidence honesty', () => {
  test('lenr_proved stays false and EQ-OPEN rows stay OPEN', () => {
    expect(SCIENCE_EVIDENCE_HONESTY.lenr_proved).toBe(false);
    expect(SCIENCE_EVIDENCE_HONESTY.kind).toBe('scenario_table_not_posterior');
    OPEN_EQ_IDS.forEach((id) => {
      expect(SCIENCE_EVIDENCE_HONESTY.open_status[id]).toBe('OPEN');
    });
    expect(() => assertScienceEvidenceHonesty()).not.toThrow();
  });

  test('campaign pointer names cavitation_collapse without claiming proof', () => {
    expect(CAMPAIGN_EVIDENCE.preset).toBe('cavitation_collapse');
    expect(CAMPAIGN_EVIDENCE.pack_path).toMatch(/cavitation_collapse_campaign/);
    expect(CAMPAIGN_EVIDENCE.hydro_label).toMatch(/contested hydro/i);
    expect(CAMPAIGN_EVIDENCE.note).toMatch(/model output only/i);
  });

  test('avenue ranking uses non-proof language and OPEN stress chips', () => {
    expect(AVENUE_RANKING_SUMMARY.kind).toBe('scenario_table_not_posterior');
    expect(AVENUE_RANKING_SUMMARY.non_proof).toMatch(/not a Bayesian posterior/i);
    expect(AVENUE_RANKING_SUMMARY.non_proof).toMatch(/never sets lenr_proved/i);
    expect(AVENUE_RANKING_SUMMARY.avenues.length).toBeGreaterThanOrEqual(5);
    AVENUE_RANKING_SUMMARY.avenues.forEach((avenue) => {
      avenue.stresses.forEach((oid) => {
        expect(OPEN_EQ_IDS).toContain(oid);
      });
    });
  });

  test('formalization distinguishes bounds from empirical closure', () => {
    expect(FORMALIZATION_STATUS.summary).toMatch(/does not prove LENR/i);
    expect(FORMALIZATION_STATUS.collapse_module).toMatch(/CollapseBounds\.lean/);
    const kinds = FORMALIZATION_STATUS.items.map((item) => item.kind);
    expect(kinds).toEqual(
      expect.arrayContaining(['bounds', 'non-closure', 'open']),
    );
  });

  test('EQ-OPEN runway keeps every obligation OPEN', () => {
    expect(EQ_OPEN_RUNWAY.status).toBe('OPEN');
    expect(EQ_OPEN_RUNWAY.note).toMatch(/no obligation is closed/i);
    expect(EQ_OPEN_RUNWAY.open_ids).toEqual([...OPEN_EQ_IDS]);
    expect(EQ_OPEN_RUNWAY.doc_path).toMatch(/EQ_OPEN_CLOSURE_RUNWAY\.md/);
  });
});
