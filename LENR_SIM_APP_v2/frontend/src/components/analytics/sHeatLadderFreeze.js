/**
 * SPA freeze for HIP-02 S_heat / σ ladder (offline / honesty-fail fallback).
 * Mirrors locked corpus arithmetic — never invents σ_Q.
 */
import { CORPUS_MOE_COVERAGE, DISCOVERY_GRADE_BAR } from '../../config/unifiedTheoryScienceEvidence';

export const S_HEAT_LADDER_FREEZE = Object.freeze({
  schema: 'lenr-s-heat-ladder-v1',
  discovery_grade_threshold_sigma: DISCOVERY_GRADE_BAR.sigma_threshold || 5,
  ladder_display_max_s: 30,
  n_records: CORPUS_MOE_COVERAGE.n_records,
  n_high_success_rankable: 2,
  n_exploratory_demoted: 3,
  n_seed_scale_demoted: 1,
  n_null_sigma: CORPUS_MOE_COVERAGE.n_records - 5,
  ranked_high_success: Object.freeze([
    Object.freeze({
      literature_id: 'kasagi-nicu-radiant-2026',
      s_heat: CORPUS_MOE_COVERAGE.kasagi_nicu_s_heat,
      display_s_heat: CORPUS_MOE_COVERAGE.kasagi_nicu_s_heat,
      success_margin_vs_5: CORPUS_MOE_COVERAGE.kasagi_nicu_s_heat - 5,
      moe_provenance: CORPUS_MOE_COVERAGE.kasagi_nicu_moe_provenance,
      claim_tier: CORPUS_MOE_COVERAGE.kasagi_nicu_claim_tier,
      band: 'discovery_analytics_clear',
      distance_status: CORPUS_MOE_COVERAGE.kasagi_nicu_distance_status,
      high_success_rankable: true,
      high_success_rank: 1,
      q_is_seed_scale: false,
      discovery_grade_eligible: true,
      demotion_reason: null,
      lenr_proved: false,
    }),
    Object.freeze({
      literature_id: 'kasagi-ni-radiant-2026',
      s_heat: CORPUS_MOE_COVERAGE.kasagi_ni_s_heat,
      display_s_heat: CORPUS_MOE_COVERAGE.kasagi_ni_s_heat,
      success_margin_vs_5: CORPUS_MOE_COVERAGE.kasagi_ni_s_heat - 5,
      moe_provenance: CORPUS_MOE_COVERAGE.kasagi_ni_moe_provenance,
      claim_tier: CORPUS_MOE_COVERAGE.kasagi_ni_claim_tier,
      band: 'discovery_analytics_clear',
      distance_status: CORPUS_MOE_COVERAGE.kasagi_ni_distance_status,
      high_success_rankable: true,
      high_success_rank: 2,
      q_is_seed_scale: false,
      discovery_grade_eligible: true,
      demotion_reason: null,
      lenr_proved: false,
    }),
  ]),
  exploratory_band: Object.freeze([
    Object.freeze({
      literature_id: 'miles-1993',
      s_heat: CORPUS_MOE_COVERAGE.miles_exploratory_s_heat,
      display_s_heat: CORPUS_MOE_COVERAGE.miles_exploratory_s_heat,
      success_margin_vs_5: CORPUS_MOE_COVERAGE.miles_exploratory_s_heat - 5,
      moe_provenance: CORPUS_MOE_COVERAGE.miles_moe_provenance,
      claim_tier: CORPUS_MOE_COVERAGE.miles_claim_tier,
      band: 'exploratory_gates_blocked',
      distance_status: CORPUS_MOE_COVERAGE.miles_distance_status,
      high_success_rankable: false,
      q_is_seed_scale: false,
      discovery_grade_eligible: false,
      demotion_reason:
        'moe_provenance=literature_reported_instrument_precision is not literature_reported — exploratory arithmetic only; excluded from high-success ranking',
      lenr_proved: false,
    }),
    Object.freeze({
      literature_id: 'celani-constantan-2019',
      s_heat: CORPUS_MOE_COVERAGE.celani_exploratory_s_heat,
      display_s_heat: CORPUS_MOE_COVERAGE.celani_exploratory_s_heat,
      success_margin_vs_5: CORPUS_MOE_COVERAGE.celani_exploratory_s_heat - 5,
      moe_provenance: CORPUS_MOE_COVERAGE.celani_moe_provenance,
      claim_tier: CORPUS_MOE_COVERAGE.celani_claim_tier,
      band: 'exploratory_gates_blocked',
      distance_status: CORPUS_MOE_COVERAGE.celani_distance_status,
      high_success_rankable: false,
      q_is_seed_scale: false,
      discovery_grade_eligible: false,
      demotion_reason:
        'moe_provenance=literature_reported_instrument_precision is not literature_reported — exploratory arithmetic only; excluded from high-success ranking',
      lenr_proved: false,
    }),
  ]),
  demoted_seed_scale: Object.freeze([
    Object.freeze({
      literature_id: 'deninno-tid-1995',
      s_heat: 250,
      display_s_heat: null,
      success_margin_vs_5: 245,
      moe_provenance: 'literature_reported_instrument_precision',
      claim_tier: 'speculative_exploratory',
      band: 'demoted_seed_scale',
      high_success_rankable: false,
      q_is_seed_scale: true,
      discovery_grade_eligible: false,
      demotion_reason:
        'q_is_seed_scale — seed Q ÷ instrument_precision must not outrank cite-gated literature_reported MoE (ENG-HS-08)',
      lenr_proved: false,
    }),
  ]),
  honest_high_success_order_ids: Object.freeze([
    'kasagi-nicu-radiant-2026',
    'kasagi-ni-radiant-2026',
  ]),
  raw_s_heat_order_ids: Object.freeze([
    'deninno-tid-1995',
    'miles-1993',
    'kasagi-nicu-radiant-2026',
    'kasagi-ni-radiant-2026',
    'celani-constantan-2019',
  ]),
  eng_hs_08: Object.freeze({
    rule:
      'Exclude q_is_seed_scale and non-literature_reported from high-success / success-margin ranking before UI sort',
    raw_s_heat_would_lie: true,
  }),
  closes_eq_open: false,
  lenr_proved: false,
  source: 'spa_freeze',
  honesty:
    'SPA freeze of HIP-02 ladder. High-success ranking filters seed-scale Q and non-literature_reported MoE (ENG-HS-08). Never invent σ_Q; never set lenr_proved; never close EQ-OPEN-*.',
});
