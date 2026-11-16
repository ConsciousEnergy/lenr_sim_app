/**
 * Honesty contract for Theory Paper science-evidence config (Phase E).
 */
import {
  AVENUE_RANKING_SUMMARY,
  CAMPAIGN_EVIDENCE,
  CLOSURE_SURFACE_LINKS,
  DISCOVERY_GRADE_BAR,
  DISCOVERY_GRADE_MISSING,
  EQ_OPEN_RUNWAY,
  FORMALIZATION_STATUS,
  OPEN_EQ_IDS,
  SCIENCE_EVIDENCE_HONESTY,
  assertScienceEvidenceHonesty,
  avenuesForOpenId,
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
    expect(CAMPAIGN_EVIDENCE.n_experiments).toBeGreaterThanOrEqual(20);
    expect(CAMPAIGN_EVIDENCE.n_theory_runs).toBe(CAMPAIGN_EVIDENCE.n_experiments);
    expect(CAMPAIGN_EVIDENCE.uq_samples).toBe(32);
    expect(CAMPAIGN_EVIDENCE.literature_ids).toEqual(
      expect.arrayContaining([
        'taleyarkhan-sonofusion-2002',
        'pyyhtia-cr39-cavitation-2026',
      ]),
    );
  });

  test('discovery-grade ≥5σ bar stays not_met', () => {
    expect(DISCOVERY_GRADE_BAR.sigma_threshold).toBe(5);
    expect(DISCOVERY_GRADE_BAR.status).toBe('not_met');
    expect(DISCOVERY_GRADE_BAR.moe_pairing_status).toBe('unverified');
    expect(DISCOVERY_GRADE_BAR.cite_gated_sigma_q).toBe('required_not_met');
    expect(DISCOVERY_GRADE_BAR.gap_note).toMatch(/moe_sigma_q_pairing_verified/i);
    expect(DISCOVERY_GRADE_BAR.note).toMatch(/cite-gated/i);
    expect(DISCOVERY_GRADE_BAR.does_not_count.join(' ')).toMatch(/campaign/i);
    expect(DISCOVERY_GRADE_BAR.gap_helper_module).toMatch(/discovery_grade_gap/);
    expect(DISCOVERY_GRADE_MISSING.length).toBeGreaterThanOrEqual(6);
    DISCOVERY_GRADE_MISSING.forEach((req) => {
      expect(req.status).toBe('not_met');
      expect(req.id).toBeTruthy();
      expect(req.detail).toBeTruthy();
    });
    expect(DISCOVERY_GRADE_MISSING.map((r) => r.id)).toEqual(
      expect.arrayContaining([
        'cite_gated_sigma_q',
        'moe_pairing_verified',
        's_heat_ge_5',
        'eq_open_discharge',
        'governance_signoff',
      ]),
    );
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
      expect(typeof avenue.five_sigma_role).toBe('string');
    });
  });

  test('closure linkage maps EQ-OPEN rows to avenues without claiming discharge', () => {
    expect(CLOSURE_SURFACE_LINKS.avenue_doc_path).toMatch(/AVENUE_RANKING\.md/);
    expect(CLOSURE_SURFACE_LINKS.runway_doc_path).toMatch(/EQ_OPEN_CLOSURE_RUNWAY\.md/);
    expect(CLOSURE_SURFACE_LINKS.note).toMatch(/do not discharge/i);
    const yieldAvenues = avenuesForOpenId('EQ-OPEN-YIELD-01').map((a) => a.id);
    expect(yieldAvenues).toEqual(
      expect.arrayContaining(['miles_heat_helium_q', 'calorimetry_sigma_q']),
    );
    EQ_OPEN_RUNWAY.criteria.forEach((row) => {
      expect(row.related_avenues.length).toBeGreaterThan(0);
      expect(row.five_sigma_relevance).toBeTruthy();
      row.related_avenues.forEach((avenueId) => {
        const avenue = AVENUE_RANKING_SUMMARY.avenues.find((a) => a.id === avenueId);
        expect(avenue).toBeTruthy();
        expect(avenue.stresses).toContain(row.id);
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
    expect(EQ_OPEN_RUNWAY.criteria).toHaveLength(OPEN_EQ_IDS.length);
    EQ_OPEN_RUNWAY.criteria.forEach((row) => {
      expect(OPEN_EQ_IDS).toContain(row.id);
      expect(row.affirmative).toBeTruthy();
      expect(row.falsification).toBeTruthy();
      expect(row.does_not_count).toBeTruthy();
      expect(typeof row.claim_tier).toBe('string');
      expect(row.claim_tier.length).toBeGreaterThan(0);
      expect(Array.isArray(row.related_avenues)).toBe(true);
      expect(row.related_avenues.length).toBeGreaterThan(0);
    });
    const ec = EQ_OPEN_RUNWAY.criteria.find((r) => r.id === 'EQ-OPEN-EC-01');
    expect(ec.claim_tier).toBe('speculative_exploratory');
    expect(ec.citations).toEqual(expect.arrayContaining(['tennfors2013']));
    const yieldRow = EQ_OPEN_RUNWAY.criteria.find((r) => r.id === 'EQ-OPEN-YIELD-01');
    expect(yieldRow.claim_tier).toBe('empirical_lenr_correlation');
    expect(yieldRow.citations).toEqual(expect.arrayContaining(['miles1993']));
  });
});
