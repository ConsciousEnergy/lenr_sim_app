/**
 * Honesty contract for Theory Paper science-evidence config (Phase E).
 */
import fs from 'fs';
import path from 'path';
import {
  AVENUE_RANKING_SUMMARY,
  CAMPAIGN_EVIDENCE,
  CLOSURE_SURFACE_LINKS,
  CORPUS_MOE_COVERAGE,
  DISCOVERY_GRADE_BAR,
  DISCOVERY_GRADE_MISSING,
  EMP_EXPLORATORY_WHY_NOT_DISCOVERY,
  EQ_OPEN_RUNWAY,
  FORMALIZATION_STATUS,
  NEXT_LAB_MOE_TARGETS,
  OPEN_EQ_IDS,
  QUANTITATIVE_DISTANCE_DEFAULT,
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
    expect(CAMPAIGN_EVIDENCE.densification_note).toMatch(/not weight-of-numbers/i);
    expect(CAMPAIGN_EVIDENCE.n_experiments).toBeGreaterThanOrEqual(22);
    expect(CAMPAIGN_EVIDENCE.n_theory_runs).toBe(CAMPAIGN_EVIDENCE.n_experiments);
    expect(CAMPAIGN_EVIDENCE.uq_samples).toBe(32);
    expect(CAMPAIGN_EVIDENCE.literature_ids).toEqual(
      expect.arrayContaining([
        'taleyarkhan-sonofusion-2002',
        'pyyhtia-cr39-cavitation-2026',
      ]),
    );
    const roles = Object.fromEntries(
      CAMPAIGN_EVIDENCE.literature_roles.map((row) => [row.id, row.role]),
    );
    expect(roles['taleyarkhan-sonofusion-2002']).toBe('contested_positive_claim');
    expect(roles['pyyhtia-cr39-cavitation-2026']).toBe('detector_confounder_peer');
    expect(CAMPAIGN_EVIDENCE.claim_tier_histogram_note).toMatch(/not lab/i);
    expect(CAMPAIGN_EVIDENCE.claim_tier_histogram.empirical_lenr_correlation).toBe(44);
  });

  test('CAMPAIGN_EVIDENCE n_* mirrors cavitation_collapse pack manifest', () => {
    const manifestPath = path.resolve(
      __dirname,
      '../../../datasets/reviewer_packs/cavitation_collapse_campaign/manifest.json',
    );
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(CAMPAIGN_EVIDENCE.n_experiments).toBe(manifest.n_experiments);
    expect(CAMPAIGN_EVIDENCE.n_theory_runs).toBe(manifest.n_theory_runs);
    expect(CAMPAIGN_EVIDENCE.preset).toBe(manifest.preset);
    expect(CAMPAIGN_EVIDENCE.claim_tier_histogram).toEqual(manifest.claim_tier_histogram);
    expect(manifest.lenr_proved).toBe(false);
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
    expect(DISCOVERY_GRADE_BAR.distance_helper_module).toMatch(/sigma_distance/);
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

  test('quantitative distance + MoE coverage stay non-closure', () => {
    expect(QUANTITATIVE_DISTANCE_DEFAULT.distance_status).toBe('undefined');
    expect(QUANTITATIVE_DISTANCE_DEFAULT.s_heat).toBeNull();
    expect(QUANTITATIVE_DISTANCE_DEFAULT.discovery_grade_eligible).toBe(false);
    expect(CORPUS_MOE_COVERAGE.closes_eq_open).toBe(false);
    expect(CORPUS_MOE_COVERAGE.lenr_proved).toBe(false);
    expect(CORPUS_MOE_COVERAGE.n_records).toBeGreaterThanOrEqual(20);
    expect(CORPUS_MOE_COVERAGE.discovery_grade_eligible_count).toBeLessThan(
      CORPUS_MOE_COVERAGE.n_records,
    );
    expect(CORPUS_MOE_COVERAGE.with_moe_pairing_verified).toBe(2);
    expect(CORPUS_MOE_COVERAGE.discovery_grade_eligible_count).toBe(2);
    expect(CORPUS_MOE_COVERAGE.discovery_grade_eligible_ids).toEqual(
      expect.arrayContaining([
        'kasagi-nicu-radiant-2026',
        'kasagi-ni-radiant-2026',
      ]),
    );
    expect(CORPUS_MOE_COVERAGE.pairing_verified_ids).toEqual(
      expect.arrayContaining([
        'kasagi-nicu-radiant-2026',
        'kasagi-ni-radiant-2026',
      ]),
    );
    expect(CORPUS_MOE_COVERAGE.kasagi_ni_s_heat).toBe(11.25);
    expect(CORPUS_MOE_COVERAGE.kasagi_ni_distance_status).toBe(
      'at_or_above_bar_gates_clear',
    );
    expect(CORPUS_MOE_COVERAGE.miles_distance_status).toBe(
      'at_or_above_bar_gates_blocked',
    );
    expect(CORPUS_MOE_COVERAGE.miles_moe_provenance).toMatch(/instrument_precision/);
    expect(CORPUS_MOE_COVERAGE.miles_pairing_verified).toBe(false);
    expect(CORPUS_MOE_COVERAGE.miles_banner).toMatch(/exploratory/i);
    expect(CORPUS_MOE_COVERAGE.exploratory_instrument_moe_ids).toEqual(
      expect.arrayContaining(['miles-1993', 'deninno-tid-1995']),
    );
    expect(CORPUS_MOE_COVERAGE.literature_moe_inventory_exhausted).toBe(true);
    expect(CORPUS_MOE_COVERAGE.analytics_eligible_ne_eq_open).toBe(true);
    expect(CORPUS_MOE_COVERAGE.analytics_eligible_ne_lenr_proved).toBe(true);
    expect(CORPUS_MOE_COVERAGE.soft_chip_ne_scientific_discharge).toBe(true);
    expect(CORPUS_MOE_COVERAGE.lean_dual_kasagi_nc_bound).toBe(true);
    expect(CORPUS_MOE_COVERAGE.lean_instrument_floor_nc_bound).toBe(true);
    expect(CORPUS_MOE_COVERAGE.lean_all_eq_open_nc_bound).toBe(true);
    expect(CORPUS_MOE_COVERAGE.lean_lab_ask_nc_bound).toBe(true);
    expect(CORPUS_MOE_COVERAGE.lab_ask_met_ne_eq_open_discharge).toBe(true);
    expect(CORPUS_MOE_COVERAGE.software_honest_5sigma_runway_exhausted).toBe(true);
    expect(CORPUS_MOE_COVERAGE.promote_prep_recommended).toBe(true);
    expect(CORPUS_MOE_COVERAGE.remaining_scientific_blockers.length).toBeGreaterThanOrEqual(5);
    expect(CORPUS_MOE_COVERAGE.remaining_scientific_blockers.join(' ')).toMatch(
      /eq_open|lenr_proved|governed_lab/i,
    );
    expect(CORPUS_MOE_COVERAGE.inventory_exhausted_note).toMatch(/2\/25|exhausted/i);
    expect(CORPUS_MOE_COVERAGE.note).toMatch(
      /lab_ask_proxies_do_not_discharge|does_not_close_any_eq_open|dual_kasagi_analytics_does_not_close/i,
    );
    expect(NEXT_LAB_MOE_TARGETS.length).toBeGreaterThanOrEqual(5);
    NEXT_LAB_MOE_TARGETS.forEach((row) => {
      expect(row.status).toBe('blocked_awaiting_lab');
      expect(row.closes_eq_open).toBe(false);
      expect(row.avenue_id).toBeTruthy();
      expect(row.target.length).toBeGreaterThan(20);
      expect(row.lab_acceptance.length).toBeGreaterThan(20);
      expect(row.still_does_not_discharge.length).toBeGreaterThan(20);
      expect(row.corpus_gap_now.length).toBeGreaterThan(10);
      expect(Array.isArray(row.daq_observables)).toBe(true);
      row.eq_open_ids.forEach((oid) => expect(OPEN_EQ_IDS).toContain(oid));
    });
    const coveredOpens = new Set(
      NEXT_LAB_MOE_TARGETS.flatMap((row) => row.eq_open_ids),
    );
    OPEN_EQ_IDS.forEach((oid) => expect(coveredOpens.has(oid)).toBe(true));
    expect(
      NEXT_LAB_MOE_TARGETS.find((row) => row.id === 'governed_heat_he_cite_gated_moe')
        ?.daq_observables,
    ).toEqual(
      expect.arrayContaining(['excess_power_W', 'sigma_Q_W', 'he4_atoms_per_s']),
    );
    expect(EMP_EXPLORATORY_WHY_NOT_DISCOVERY.length).toBeGreaterThanOrEqual(4);
    EMP_EXPLORATORY_WHY_NOT_DISCOVERY.forEach((row) => {
      expect(row.discovery_grade_eligible).toBe(false);
      expect(row.reasons.length).toBeGreaterThanOrEqual(2);
      expect(String(row.soft_chip)).not.toMatch(/≥5σ.*met/i);
      expect(row.soft_chip).not.toBe('met');
    });
    const milesWhy = EMP_EXPLORATORY_WHY_NOT_DISCOVERY.find(
      (row) => row.literature_id === 'miles-1993',
    );
    expect(milesWhy.distance_status).toBe('at_or_above_bar_gates_blocked');
    expect(milesWhy.s_heat_exploratory).toBe(26);
    expect(DISCOVERY_GRADE_BAR.does_not_count.join(' ')).toMatch(
      /Arithmetic S_heat/i,
    );
  });

  test('avenue ranking uses non-proof language and OPEN stress chips', () => {
    expect(AVENUE_RANKING_SUMMARY.kind).toBe('scenario_table_not_posterior');
    expect(AVENUE_RANKING_SUMMARY.title).toMatch(/scenario-table/i);
    expect(AVENUE_RANKING_SUMMARY.title).toMatch(/not a posterior/i);
    expect(AVENUE_RANKING_SUMMARY.title).not.toMatch(/^Bayesian/i);
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
    expect(FORMALIZATION_STATUS.calorimetry_module).toMatch(
      /CalorimetrySignificance\.lean/,
    );
    expect(FORMALIZATION_STATUS.summary).toMatch(/EQ-HEAT-SIG/i);
    const ids = FORMALIZATION_STATUS.items.map((item) => item.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'EQ-HEAT-SIG-01',
        'EQ-HEAT-SIG-NC-01',
        'EQ-BBL-HEAT-NC-01',
        'EQ-BBL-NR-01',
        'EQ-BBL-RP-DOM-01',
        'EQ-RATE-CAP-GAP-01',
      ]),
    );
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
