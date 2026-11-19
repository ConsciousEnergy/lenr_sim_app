/**
 * Curated Theory Paper science-evidence pointers (Phase E / BDS-322).
 *
 * Mirrors honesty fields from:
 *   - LENR_SIM_APP_v2/docs/v0.3.7-beta/paper/simulation_evidence.json
 *   - LENR_SIM_APP_v2/docs/v0.3.9-beta/AVENUE_RANKING.md
 *   - LENR_SIM_APP_v2/docs/v0.3.9-beta/EQ_OPEN_CLOSURE_RUNWAY.md
 *   - docs/FORMALIZATION/FORMAL_PROOF_STATUS.md
 *   - calorimetry_significance.py (BDS-302 ≥5σ discovery bar)
 *
 * Read-only UI summary only. Never flips lenr_proved or closes EQ-OPEN-*.
 * Never claims ≥5σ discovery without cite-gated σ_Q / verified pairing.
 */

/** @type {readonly string[]} */
export const OPEN_EQ_IDS = Object.freeze([
  'EQ-OPEN-MEV-01',
  'EQ-OPEN-RAD-01',
  'EQ-OPEN-RATE-01',
  'EQ-OPEN-EC-01',
  'EQ-OPEN-YIELD-01',
]);

/**
 * Static honesty contract for Theory Paper science-evidence surfaces.
 * @type {Readonly<{
 *   schema: string,
 *   lenr_proved: false,
 *   kind: string,
 *   open_ids: readonly string[],
 *   open_status: Readonly<Record<string, 'OPEN'>>,
 *   disclaimer: string,
 * }>}
 */
export const SCIENCE_EVIDENCE_HONESTY = Object.freeze({
  schema: 'lenr-theory-paper-science-evidence-ui-v1',
  lenr_proved: false,
  kind: 'scenario_table_not_posterior',
  open_ids: OPEN_EQ_IDS,
  open_status: Object.freeze(
    Object.fromEntries(OPEN_EQ_IDS.map((id) => [id, 'OPEN'])),
  ),
  disclaimer:
    'Model-output and formalization bookkeeping only. Not a laboratory proof of LENR. ' +
    'Campaign packs, avenue ranking, and Lean clamp/non-closure theorems do not close EQ-OPEN-* ' +
    'and never set lenr_proved. Discovery-grade ≥5σ language requires cite-gated MoE / verified ' +
    'significance machinery (BDS-302) and is not met by simulation runs alone.',
});

/**
 * Corpus-level BDS-302 missing gates for §5B / Analytics (always not_met here).
 * Mirrors backend discovery_grade_gap.corpus_discovery_grade_gap().
 */
export const DISCOVERY_GRADE_MISSING = Object.freeze([
  Object.freeze({
    id: 'cite_gated_sigma_q',
    label: 'Cite-gated literature_reported σ_Q',
    status: 'not_met',
    detail:
      'Campaign / §5B rows lack measurement-specific literature_reported total σ_Q. ' +
      'Instrument floor/precision MoE and UQ envelopes do not count.',
  }),
  Object.freeze({
    id: 'moe_citations',
    label: 'moe_citation_keys present',
    status: 'not_met',
    detail: 'No discovery-grade moe_citation_keys on campaign pack cells for σ_Q.',
  }),
  Object.freeze({
    id: 'discovery_provenance',
    label: 'Discovery-eligible MoE provenance',
    status: 'not_met',
    detail: 'Only literature_reported total σ_Q is discovery-eligible; pack MoE is absent/exploratory.',
  }),
  Object.freeze({
    id: 'moe_pairing_verified',
    label: 'moe_sigma_q_pairing_verified',
    status: 'not_met',
    detail:
      'Q↔σ_Q pairing unverified on campaign/UI rows (Miles peak + follow-on ±0.02 stays exploratory).',
  }),
  Object.freeze({
    id: 'non_seed_measured_q',
    label: 'Non-seed measured Q_excess',
    status: 'not_met',
    detail: 'Campaign cells are model-output; seed-scale / scenario Q does not underwrite discovery.',
  }),
  Object.freeze({
    id: 's_heat_ge_5',
    label: 'S_heat ≥ 5',
    status: 'not_met',
    detail: 'S_heat undefined or exploratory only without cite-gated σ_Q + verified pairing.',
  }),
  Object.freeze({
    id: 'eq_open_discharge',
    label: 'EQ-OPEN-* discharge under runway',
    status: 'not_met',
    detail: 'All five EQ-OPEN rows remain OPEN; runway criteria are documented, not met.',
  }),
  Object.freeze({
    id: 'governance_signoff',
    label: 'Governed lab evidence + human sign-off',
    status: 'not_met',
    detail: 'lenr_proved stays false until governed evidence + academic-review sign-off.',
  }),
]);

/**
 * Paper / BDS-302 discovery bar — analytics flag criteria only; unmet for closure.
 */
/**
 * Corpus MoE / pairing coverage snapshot (literature + ICCF27 hydrate).
 * Mirrors backend sigma_distance.literature_corpus_moe_coverage() counts.
 * Analytics flags on a subset of rows never imply EQ-OPEN discharge.
 */
export const CORPUS_MOE_COVERAGE = Object.freeze({
  title: 'Corpus MoE / Q↔σ_Q pairing coverage',
  helper_module: 'LENR_SIM_APP_v2/backend/app/physics_engine/sigma_distance.py',
  n_records: 26,
  with_sigma_q: 5,
  with_literature_reported_cite_gated: 2,
  with_moe_pairing_verified: 2,
  discovery_grade_eligible_count: 2,
  discovery_grade_eligible_ids: Object.freeze([
    'kasagi-nicu-radiant-2026',
    'kasagi-ni-radiant-2026',
  ]),
  pairing_verified_ids: Object.freeze([
    'kasagi-nicu-radiant-2026',
    'kasagi-ni-radiant-2026',
  ]),
  /** Miles peak arithmetic S_heat=26 under instrument_precision — gates blocked. */
  miles_exploratory_s_heat: 26,
  miles_moe_provenance: 'literature_reported_instrument_precision',
  miles_claim_tier: 'speculative_exploratory',
  miles_pairing_verified: false,
  miles_distance_status: 'at_or_above_bar_gates_blocked',
  miles_banner:
    'Miles S_heat=26 is exploratory arithmetic only (instrument_precision + unverified pairing) — not discovery. ' +
    'JEAC 346 peak 0.52 W pairs with same-paper ±0.04 W accuracy bound (still exploratory); ' +
    'follow-on ±0.020 W is cross-document — missing cite-gated total σ for discovery.',
  /** Celani JCMNS 29 12±2 exploratory arithmetic S_heat=6 — gates blocked. */
  celani_exploratory_s_heat: 6,
  celani_moe_provenance: 'literature_reported_instrument_precision',
  celani_pairing_verified: false,
  celani_distance_status: 'at_or_above_bar_gates_blocked',
  /** Kasagi NiCu + Ni control clear analytics gates; honest_closure stays not_met. */
  kasagi_nicu_s_heat: 13.75,
  kasagi_nicu_moe_provenance: 'literature_reported',
  kasagi_nicu_claim_tier: 'empirical_lenr_correlation',
  kasagi_nicu_distance_status: 'at_or_above_bar_gates_clear',
  kasagi_ni_s_heat: 11.25,
  kasagi_ni_moe_provenance: 'literature_reported',
  kasagi_ni_claim_tier: 'empirical_lenr_correlation',
  kasagi_ni_distance_status: 'at_or_above_bar_gates_clear',
  /** Instrument-precision / floor rows stay exploratory (never discovery-eligible). */
  exploratory_instrument_moe_ids: Object.freeze([
    'miles-1993',
    'deninno-tid-1995',
    'mckubre-sri-p13-p14-1992',
    'mckubre-high-loading-1998',
    'celani-constantan-2019',
  ]),
  /**
   * BDS-343 / BDS-360 / BDS-363: publishable literature_reported σ_Q + verified
   * pairing inventory remains exhausted (only Kasagi NiCu + Ni). Celani JCMNS 29
   * “12±2 W” is now an exploratory instrument_precision companion (corpus 26) —
   * still not discovery-grade (method indetermination / raw-uncorrected episode).
   * Do not invent discovery pairs for Iwamura / Mizuno / Arata / commercial Ni–H.
   */
  literature_moe_inventory_exhausted: true,
  inventory_exhausted_note:
    'No further publishable literature_reported total σ_Q + verified Q↔σ pairing rows ' +
    'remain without fabrication. Eligible analytics flags stay 2/26 ' +
    '(Kasagi NiCu + Ni). Celani 12±2 is exploratory instrument_precision only. Soft chip ' +
    'language: analytics_gates_clear — never “≥5σ met”. Refuse Iwamura/Mizuno/Arata ' +
    'discovery σ; Miles + Celani stay exploratory.',
  post_ship_moe_gap_map:
    'docs/science/post-ship-moe-gap-map.md + bds360-corpus-beyond-kasagi.md (store)',
  /**
   * Locked arithmetic S_heat = Q/σ_Q for cite-gated / exploratory rows (BDS-363).
   * Kasagi: literature_reported + same-results envelope. Miles / Celani:
   * instrument_precision exploratory only (gates blocked). Never invent discovery σ.
   */
  locked_s_heat: Object.freeze({
    'kasagi-nicu-radiant-2026': 13.75,
    'kasagi-ni-radiant-2026': 11.25,
    'miles-1993': 26,
    'celani-constantan-2019': 6,
  }),
  /**
   * Campaign / literature heat rows that must stay non-discovery for watt MoE
   * (no peer literature_reported total σ usable for discovery pairing).
   * Celani exploratory σ lives on the companion row — refuse object keeps
   * discovery σ_Q_W null.
   */
  refused_fabricated_moe_campaigns: Object.freeze([
    Object.freeze({
      id: 'iwamura-heat-2024',
      label: 'Iwamura 2024 nano-composite heat',
      corpus_status: 'absent_heat_row',
      related_literature_ids: Object.freeze([
        'iwamura-cs-pr-2002',
        'iwamura-sr-mo-2006',
      ]),
      published_peak_note:
        'JJAP 63 037001 reports few–~9 W / 0.76 MJ without author ± / GUM total σ_Q',
      sigma_Q_W: null,
      discovery_grade_eligible: false,
      decision: 'REFUSE_FABRICATED_SIGMA_Q',
    }),
    Object.freeze({
      id: 'mizuno-ni-pd-airflow',
      label: 'Mizuno Ni–Pd air-flow',
      corpus_status: 'absent',
      related_literature_ids: Object.freeze([]),
      published_peak_note:
        'ICCF-22 preprint claims ~250 W class excess without peer episode total σ_Q',
      sigma_Q_W: null,
      discovery_grade_eligible: false,
      decision: 'REFUSE_FABRICATED_SIGMA_Q',
    }),
    Object.freeze({
      id: 'arata-ds-cathode',
      label: 'Arata DS-cathode / Pd black',
      corpus_status: 'absent',
      related_literature_ids: Object.freeze([]),
      published_peak_note:
        'PJAB/JJAP heat+He narrative without author calorimetric σ_Q_W; SRI %≠Arata pair',
      sigma_Q_W: null,
      discovery_grade_eligible: false,
      decision: 'REFUSE_FABRICATED_SIGMA_Q',
    }),
    Object.freeze({
      id: 'celani-constantan',
      label: 'Celani Cu–Ni–Mn / constantan',
      corpus_status: 'exploratory_hydrated_instrument_precision',
      related_literature_ids: Object.freeze(['celani-constantan-2019']),
      published_peak_note:
        'JCMNS 29 12±2 W exploratory hydrate (instrument_precision); discovery σ still refused',
      sigma_Q_W: null,
      discovery_grade_eligible: false,
      decision: 'REFUSE_FABRICATED_SIGMA_Q',
    }),
  ]),
  /**
   * Avenue-ranking Miles-band oracle uses model-output σ_Q_W=0.1 (not literature MoE).
   * S_heat arithmetic under that σ never clears discovery_grade_eligible.
   */
  campaign_model_output_sigma_Q_W: 0.1,
  /** Model-oracle σ_Q optics only — never literature MoE / discovery. */
  campaign_model_output_claim_tier: 'speculative_exploratory',
  campaign_model_output_is_discovery_moe: false,
  /**
   * Analytics eligibility ≠ EQ-OPEN / lenr_proved (Lean EQ-HEAT-SIG-NC-01 + HeatDiscoveryProof).
   * BDS-344: dual Kasagi Lean binding + instrument_floor NC + soft-chip lock.
   */
  analytics_eligible_ne_eq_open: true,
  analytics_eligible_ne_lenr_proved: true,
  soft_chip_ne_scientific_discharge: true,
  lean_dual_kasagi_nc_bound: true,
  lean_instrument_floor_nc_bound: true,
  /** BDS-346: DiscoveryGradeAnalytics / dual Kasagi ⇏ any of Q1–Q5 (not Q5-only). */
  lean_all_eq_open_nc_bound: true,
  /**
   * BDS-348: LabAskProxies / all five NEXT_LAB_MOE_TARGETS notionally met ⇏
   * EQ-OPEN discharge / lenr_proved (lab_ask_proxies_do_not_discharge_eq_open).
   */
  lean_lab_ask_nc_bound: true,
  lab_ask_met_ne_eq_open_discharge: true,
  /**
   * Celani JCMNS 29 exploratory hydrate Lean NC (instrument_precision S_heat=6
   * ⇏ DiscoveryGradeAnalytics; corpus discovery stays Kasagi 2/26).
   */
  lean_celani_exploratory_nc_bound: true,
  /**
   * BDS-375: planned lenr-ara-daq-sample-v1 ingest ⇏ EQ-OPEN discharge /
   * lenr_proved (daq_sample_planned_is_not_eq_open_discharge).
   */
  lean_daq_planned_ne_discharge: true,
  daq_sample_ingest_planned_not_attested: true,
  /**
   * BDS-362: DiscoveryGradeAnalytics requires citationsNonempty + pairingVerified
   * + non-seed (empty citations / unverified pairing / seed-scale ⇏ discovery);
   * cite-gated flag still ⇏ EQ-OPEN-YIELD underwriting closure.
   */
  lean_citations_pairing_nc_bound: true,
  lean_cite_gated_ne_yield_closure: true,
  /**
   * BDS-344/BDS-346/BDS-348/BDS-362: literature MoE inventory + EMP UX Prefer-merge
   * levers are exhausted; Lean cite/pairing/YIELD NC densified. Remaining work is
   * scientific / governance — promote+ship prep when humans ask (no auto main/Path B).
   */
  software_honest_5sigma_runway_exhausted: true,
  promote_prep_recommended: true,
  remaining_scientific_blockers: Object.freeze([
    'cite_gated_discovery_moe_on_governed_lab_rows_underwriting_yield',
    'broader_corpus_beyond_two_kasagi_analytics_flags',
    'all_five_eq_open_discharged_under_runway_ir_lean_ledger_governance',
    'human_academic_review_signoff_for_lenr_proved',
    'live_sql_hydrate_of_tip_packs_operator_cli',
  ]),
  closes_eq_open: false,
  lenr_proved: false,
  note:
    'Only a minority of curated literature rows carry numeric σ_Q; fewer still have ' +
    'literature_reported cite-gated provenance + verified Q↔σ pairing. Never render bare ' +
    'S_heat without provenance. Clearing analytics discovery flags on Kasagi NiCu + Ni ' +
    'control does not set lenr_proved or close any EQ-OPEN-* (Lean ' +
    'dual_kasagi_analytics_does_not_close_any_eq_open_or_lenr / ' +
    'discovery_grade_analytics_does_not_close_any_eq_open). ' +
    'Even all five NEXT_LAB_MOE_TARGETS notionally met still ⇏ discharge (Lean ' +
    'lab_ask_proxies_do_not_discharge_eq_open). ' +
    'Empty citations / unverified pairing / seed-scale Q block DiscoveryGradeAnalytics ' +
    '(empty_citations_not_discovery_grade / unverified_pairing_not_discovery_grade); ' +
    'cite-gated discovery still ⇏ EQ-OPEN-YIELD (cite_gated_discovery_does_not_underwrite_q5_closure). ' +
    'Miles / De Ninno / McKubre stay exploratory (instrument_precision / floor; Lean instrument_floor NC). ' +
    'Soft chips: analytics_gates_clear — never “≥5σ met”. Literature MoE Prefer-merge runway ' +
    'exhausted; densified lab asks stay blocked_awaiting_lab — promote+ship prep when asked.',
});

/**
 * Planned LENR-ARA DAQ sample provenance (BDS-375).
 * Mirrors runway ingest sketch vs `lenr-ara-daq-sample-v1` — non-attested.
 * Surfaces trust-plane split + refuse-fabricated densification for UI / Analytics.
 * Never invents measurements; never flips EQ-OPEN / lenr_proved.
 */
export const DAQ_SAMPLE_PROVENANCE = Object.freeze({
  schema_id: 'lenr-ara-daq-sample-v1',
  sim_export_schema_id: 'lenr-run-export-v1',
  trust_plane: 'daq',
  ingest_status: 'planned_not_attested',
  hub_registry_status: 'planned',
  refuse_fabricated_samples: true,
  lenr_proved_default: false,
  private_extensions_stripped_required: true,
  calibration_fields: Object.freeze([
    'efficiency_refs',
    'retention_caveat',
    'citations',
  ]),
  public_observable_field_set: Object.freeze([
    'excess_power_W',
    'sigma_Q_W',
    'he4_atoms_per_s',
    'he4_atoms_integrated',
    'gamma_cps',
    'gamma_ul_log10',
  ]),
  honesty_note:
    'DAQ samples stay on the LENR-ARA trust plane (separate from Sim ' +
    'lenr-run-export-v1). Planned public fields only — refuse fabricated attested ' +
    'measurements, refuse inventing literature_reported σ_Q from DAQ sketches, and ' +
    'never auto-flip rate_mode / EQ-OPEN / lenr_proved. Lab-ask receipt via DAQ ≠ ' +
    'EQ-OPEN discharge (Lean lab_ask_proxies_do_not_discharge_eq_open).',
  runway_doc_path: 'LENR_SIM_APP_v2/docs/v0.3.9-beta/EQ_OPEN_CLOSURE_RUNWAY.md',
  docs_route: '/docs/eq-open-closure-runway',
});

/**
 * Concrete next lab / MoE targets after software Prefer-merge exhaust
 * (BDS-346 inventory; BDS-348 lab-ask precision densification; BDS-375 DAQ
 * provenance UX densification).
 * Decision aid only — never flips lenr_proved or closes EQ-OPEN-*.
 * Complements snake_case remaining_scientific_blockers with avenue-linked lab asks.
 * `lab_acceptance` = measurable ask gates; `still_does_not_discharge` = residual
 * after the ask is met; `daq_observables` maps to planned lenr-ara-daq-sample-v1
 * public fields (non-attested sketch). Lean LabAskProxies ⇏ discharge.
 * All rows stay `blocked_awaiting_lab` until real governed lab MoE lands.
 */
export const NEXT_LAB_MOE_TARGETS = Object.freeze([
  Object.freeze({
    id: 'governed_heat_he_cite_gated_moe',
    avenue_id: 'miles_heat_helium_q',
    eq_open_ids: Object.freeze(['EQ-OPEN-YIELD-01', 'EQ-OPEN-MEV-01']),
    target:
      'Governed lab simultaneous heat+He with cite-gated literature_reported σ_Q + verified ' +
      'Q↔σ pairing underwriting YIELD (not Miles exploratory instrument_precision arithmetic)',
    lab_acceptance:
      'Time-resolved excess_power_W + he4_atoms_per_s (or integrated) on governed rows with ' +
      'literature_reported total σ_Q_W, moe_sigma_q_pairing_verified=true, non-seed Q, S_heat≥5',
    still_does_not_discharge:
      'Integrated ΔN_4He must still close under IR/Lean + ledger/governance; analytics flag alone ' +
      'leaves EQ-OPEN-YIELD-01 / MEV-01 OPEN (lab_ask_proxies_do_not_discharge_eq_open)',
    corpus_gap_now:
      '0/26 governed simultaneous heat+He cite-gated MoE underwriting YIELD; Miles stays ' +
      'instrument_precision / pairing=false / gates_blocked',
    daq_observables: Object.freeze([
      'excess_power_W',
      'sigma_Q_W',
      'he4_atoms_per_s',
      'he4_atoms_integrated',
    ]),
    daq_schema: 'lenr-ara-daq-sample-v1',
    daq_trust_plane: 'daq',
    daq_ingest_status: 'planned_not_attested',
    daq_calibration_required: Object.freeze([
      'efficiency_refs',
      'retention_caveat',
      'citations',
    ]),
    daq_gap_note:
      'Heat+He observables are sketched on sample-v1 but no attested public export exists; ' +
      'refuse fabricating σ_Q / He rates from this UI.',
    claim_tier: 'speculative_exploratory',
    status: 'blocked_awaiting_lab',
    closes_eq_open: false,
  }),
  Object.freeze({
    id: 'calorimetry_resolution_beyond_kasagi',
    avenue_id: 'calorimetry_sigma_q',
    eq_open_ids: Object.freeze(['EQ-OPEN-YIELD-01']),
    target:
      'Broader corpus beyond Kasagi 2/26: measurement-specific total σ_Q with same-results ' +
      'envelope pairing on governed calorimetry rows (refuse Iwamura/Mizuno/Arata fabrication; ' +
      'Celani exploratory instrument_precision ≠ discovery)',
    lab_acceptance:
      '≥1 additional governed calorimetry row (non-Kasagi) with literature_reported σ_Q + ' +
      'verified Q↔σ pairing clearing discovery_grade_eligible without fabricated σ_Q',
    still_does_not_discharge:
      'Extra analytics-eligible rows still ≠ EQ-OPEN-YIELD discharge or lenr_proved ' +
      '(DiscoveryGradeAnalytics ⇏ any of Q1–Q5)',
    corpus_gap_now:
      'pairing verified 2/26 (Kasagi NiCu + Ni only); Celani exploratory hydrate does not flip discovery; ' +
      'publishable literature_reported MoE inventory exhausted',
    daq_observables: Object.freeze(['excess_power_W', 'sigma_Q_W']),
    daq_schema: 'lenr-ara-daq-sample-v1',
    daq_trust_plane: 'daq',
    daq_ingest_status: 'planned_not_attested',
    daq_calibration_required: Object.freeze(['efficiency_refs', 'citations']),
    daq_gap_note:
      'Calorimetry σ_Q on sample-v1 stays planned; refuse inventing literature_reported discovery ' +
      'σ beyond Kasagi (Celani exploratory ≠ discovery).',
    claim_tier: 'speculative_exploratory',
    status: 'blocked_awaiting_lab',
    closes_eq_open: false,
  }),
  Object.freeze({
    id: 'gamma_ul_efficiency_corrected',
    avenue_id: 'gamma_ul_23p8',
    eq_open_ids: Object.freeze(['EQ-OPEN-RAD-01']),
    target:
      'Efficiency-corrected 23.8 MeV γ upper limit with coincidence / efficiency provenance ' +
      '(not CR-39 pit counts; Pyyhtiä confounder stays detector-only)',
    lab_acceptance:
      'Calibrated gamma_cps / gamma_ul_log10 with efficiency_refs + coincidence geometry; ' +
      'heat-coincident interval when claiming suppression',
    still_does_not_discharge:
      'UL receipt alone ≠ lattice Γ_ph/Γ_γ ≥ 10^11 target or EQ-OPEN-RAD-01 affirmative/negative ' +
      'discharge under IR + ledger sign-off',
    corpus_gap_now:
      '0 curated rows with efficiency-corrected 23.8 MeV γ UL + coincidence provenance',
    daq_observables: Object.freeze(['gamma_cps', 'gamma_ul_log10']),
    daq_schema: 'lenr-ara-daq-sample-v1',
    daq_trust_plane: 'daq',
    daq_ingest_status: 'planned_not_attested',
    daq_calibration_required: Object.freeze(['efficiency_refs', 'citations']),
    daq_gap_note:
      'γ UL fields are sketched; efficiency + coincidence provenance still missing — refuse ' +
      'fabricating detector ULs as RAD discharge.',
    claim_tier: 'speculative_exploratory',
    status: 'blocked_awaiting_lab',
    closes_eq_open: false,
  }),
  Object.freeze({
    id: 'occupation_rate_caps_measured',
    avenue_id: 'p4_occupation',
    eq_open_ids: Object.freeze(['EQ-OPEN-RATE-01', 'EQ-OPEN-MEV-01']),
    target:
      'Measured p₄ / trap occupancy + collective caps that constrain rate_mode budgets ' +
      '(not free 10⁶ caps or campaign grids alone)',
    lab_acceptance:
      'Experimentally constrained n_occ / f_nuc (or equivalent) cited into named rate_mode; ' +
      'two-body log10 N = −40 reference retained beside any closing path',
    still_does_not_discharge:
      'Measured caps may still leave log10(N)<0 (¬Q3) or leave MeV remainder >0 (¬Q1); ' +
      'campaign grids / free 10⁶ caps never count',
    corpus_gap_now:
      '0 governed measured p₄ / collective-cap attestations; engine caps stay scenario-only',
    daq_observables: Object.freeze([]),
    daq_schema: 'lenr-ara-daq-sample-v1',
    daq_trust_plane: 'daq',
    daq_ingest_status: 'planned_not_attested',
    daq_calibration_required: Object.freeze(['citations']),
    daq_gap_note:
      'n_occ / f_nuc are not in sample-v1 public observables — occupation/rate caps are ' +
      'theory-domain attestations, not calorimetry/γ sample fields. Refuse fabricating DAQ ' +
      'occupation numbers.',
    claim_tier: 'speculative_exploratory',
    status: 'blocked_awaiting_lab',
    closes_eq_open: false,
  }),
  Object.freeze({
    id: 'ec_threshold_cm_path',
    avenue_id: 'electron_capture_threshold',
    eq_open_ids: Object.freeze(['EQ-OPEN-EC-01']),
    target:
      'Independent condensed-matter path ≥0.782 MeV in Tennfors-licensed regime with cited ' +
      'potentials/masses (deficit bookkeeping / Widom scaffold do not count)',
    lab_acceptance:
      'Cited E_available ≥ 0.782 MeV in licensed material/field regime with mass-renormalization ' +
      'domain gates met as physical claims (not UI gap-to-threshold cosmetics)',
    still_does_not_discharge:
      'Threshold reachability ≠ global lenr_proved; deficit-class paths may still falsify this ' +
      'EC-source form without closing other EQ-OPEN rows',
    corpus_gap_now:
      'CM budget still ≪ 0.782 MeV under stated double-layer / deficit identities; Widom scaffold ≠ path',
    daq_observables: Object.freeze([]),
    daq_schema: 'lenr-ara-daq-sample-v1',
    daq_trust_plane: 'daq',
    daq_ingest_status: 'planned_not_attested',
    daq_calibration_required: Object.freeze(['citations']),
    daq_gap_note:
      'E_available / mass-renormalization domain gates are condensed-matter path claims, not ' +
      'instrument sample observables in sample-v1. Refuse fabricating DAQ threshold numbers.',
    claim_tier: 'speculative_exploratory',
    status: 'blocked_awaiting_lab',
    closes_eq_open: false,
  }),
]);

/**
 * EMP / instrument-MoE rows that stay exploratory — structured “why not discovery”
 * reasons for Analytics / §5B runway UX (BDS-343). Soft honesty only; never flips locks.
 */
/**
 * Campaigns where primary-source hunt found no honest discovery-grade watt MoE
 * (post-ship MoE gap map). Soft refuse optics only — never invent σ_Q / flip eligible.
 */
export const REFUSED_FABRICATED_MOE_CAMPAIGNS = Object.freeze([
  Object.freeze({
    id: 'iwamura-heat-2024',
    label: 'Iwamura nano-multilayer H₂ heat (2024)',
    in_curated_25: false,
    decision: 'refuse',
    primary_cites: Object.freeze([
      'doi:10.35848/1347-4065/ad2622',
      'JJAP 63 037001 (2024)',
    ]),
    missing:
      'Author paper publishes no ± / error bars / coverage factor on watt excess; GUM reconstructions are not author MoE',
    honesty:
      'Refuse fabricated σ_Q — metadata-only null σ only; does not raise discovery_grade_eligible.',
  }),
  Object.freeze({
    id: 'mizuno-ni-pd-airflow',
    label: 'Mizuno Ni–Pd air-flow',
    in_curated_25: false,
    decision: 'refuse',
    primary_cites: Object.freeze([
      'CANR MizunoTincreasede.pdf (ICCF-22 preprint)',
    ]),
    missing:
      'No peer-reviewed episode total σ_Q on ~250 W claims; forum/secondary ~2 W bounds ≠ literature_reported',
    honesty:
      'Refuse fabricated σ_Q — contested heat without cite-gated discovery MoE.',
  }),
  Object.freeze({
    id: 'arata-ds-cathode',
    label: 'Arata–Zhang DS-cathode / Pd black',
    in_curated_25: false,
    decision: 'refuse',
    primary_cites: Object.freeze([
      'doi:10.2183/pjab.75.281',
      'doi:10.1143/JJAP.38.L774',
    ]),
    missing:
      'Author primaries state ~5–10 W narrative without σ_Q_W; SRI 9.9±1.3% is McKubre relative % — not Arata peak↔σ',
    honesty:
      'Refuse porting SRI % onto Arata Q as discovery MoE.',
  }),
  Object.freeze({
    id: 'celani-constantan-12pm2',
    label: 'Celani constantan (JCMNS 29 near-miss)',
    in_curated_25: true,
    literature_id: 'celani-constantan-2019',
    decision: 'refuse_discovery_near_miss',
    primary_cites: Object.freeze([
      'doi:10.70923/001c.72494',
      'JCMNS 29 (2019) 52–74 “12 ± 2 W”',
    ]),
    missing:
      'Same-sentence 12±2 is method-indetermination class (raw uncorrected air-flow; wire-break; sibling ±1–2 W indetermination) — not literature_reported total σ for discovery',
    honesty:
      'Exploratory hydrate landed (instrument_precision; pairing=false; S_heat=6 gates-blocked) — still refuse discovery_grade_eligible.',
  }),
]);

export const EMP_EXPLORATORY_WHY_NOT_DISCOVERY = Object.freeze([
  Object.freeze({
    literature_id: 'miles-1993',
    label: 'Miles 1993 heat–He',
    claim_type: 'EMP',
    distance_status: 'at_or_above_bar_gates_blocked',
    s_heat_exploratory: 26,
    moe_provenance: 'literature_reported_instrument_precision',
    pairing_verified: false,
    claim_tier: 'speculative_exploratory',
    discovery_grade_eligible: false,
    soft_chip: 'analytics_gates_clear',
    reasons: Object.freeze([
      'JEAC 346 peak 0.52 W is not a verified same-results envelope for follow-on ±0.020 W (MilesManomalouse / Dominguez)',
      'Same-paper JEAC accuracy bound ~±0.04 W / ±2% remains instrument accuracy class — not literature_reported total σ_Q',
      'moe_provenance is instrument_precision (exploratory); moe_sigma_q_pairing_verified stays false — arithmetic S_heat=26 (=0.52/0.02) gates-blocked',
      'Missing discovery cite: measurement-specific total σ_Q_W for the paired 0.52 W peak episode in a primary source',
      'Instantaneous EMP band ≠ integrated YIELD discharge; EQ-OPEN-YIELD-01 stays OPEN',
    ]),
    honesty:
      'Exploratory arithmetic only — not discovery; does not set lenr_proved or close EQ-OPEN-*.',
  }),
  Object.freeze({
    literature_id: 'deninno-tid-1995',
    label: 'De Ninno / ENEA Frascati flow',
    claim_type: 'EMP',
    distance_status: 'undefined',
    s_heat_exploratory: null,
    moe_provenance: 'literature_reported_instrument_precision',
    pairing_verified: false,
    claim_tier: 'speculative_exploratory',
    discovery_grade_eligible: false,
    soft_chip: 'not_met',
    reasons: Object.freeze([
      '20 mW is calorimeter instrument precision (0–20 W), not episode MoE for seed Q',
      'No cite-gated literature_reported total σ_Q on a paired measured Q_excess',
      'Seed / scenario Q does not underwrite discovery_grade_eligible',
    ]),
    honesty:
      'Instrument-precision bookkeeping only — exploratory; EQ-OPEN-* remain OPEN.',
  }),
  Object.freeze({
    literature_id: 'mckubre-sri-p13-p14-1992',
    label: 'McKubre SRI P13/P14',
    claim_type: 'EMP',
    distance_status: 'undefined',
    s_heat_exploratory: null,
    moe_provenance: 'literature_reported_instrument_floor',
    pairing_verified: false,
    claim_tier: 'speculative_exploratory',
    discovery_grade_eligible: false,
    soft_chip: 'not_met',
    reasons: Object.freeze([
      'Design floor max(10 mW, 0.1% Pin) — sigma_Q_W absent until Pin-resolved run MoE',
      'Instrument floor provenance is never discovery-eligible without measured pairing',
      'Illustrative EMP anchors ≠ discovery-grade calorimetry language',
    ]),
    honesty:
      'Floor-only MoE — exploratory; does not clear analytics discovery flags.',
  }),
  Object.freeze({
    literature_id: 'mckubre-high-loading-1998',
    label: 'McKubre high-loading 1998',
    claim_type: 'EMP',
    distance_status: 'undefined',
    s_heat_exploratory: null,
    moe_provenance: 'literature_reported_instrument_floor',
    pairing_verified: false,
    claim_tier: 'speculative_exploratory',
    discovery_grade_eligible: false,
    soft_chip: 'not_met',
    reasons: Object.freeze([
      'Same instrument-floor class as P13/P14 — no cite-gated total σ_Q',
      'Reproducibility field scores ≠ σ_Q / S_heat discovery machinery',
      'Refuse fabricating peak↔σ pairing from secondary notes',
    ]),
    honesty:
      'Floor-only MoE — exploratory; honest_closure stays not_met.',
  }),
  Object.freeze({
    literature_id: 'celani-constantan-2019',
    label: 'Celani constantan JCMNS 29 (12±2)',
    claim_type: 'contested',
    distance_status: 'at_or_above_bar_gates_blocked',
    s_heat_exploratory: 6,
    moe_provenance: 'literature_reported_instrument_precision',
    pairing_verified: false,
    claim_tier: 'speculative_exploratory',
    discovery_grade_eligible: false,
    soft_chip: 'analytics_gates_clear',
    reasons: Object.freeze([
      'JCMNS 29 DOI 10.70923/001c.72494 same-sentence “AHE was over 12 ± 2 W” is method-indetermination / raw uncorrected air-flow — not literature_reported total σ_Q',
      'moe_provenance is instrument_precision (exploratory); moe_sigma_q_pairing_verified stays false — arithmetic S_heat=6 (=12/2) gates-blocked',
      'Wire broke within ~1 day; sibling JCMNS 19 indetermination ±1–2 W; MFMP replication flags calorimetry concerns',
      'Stable 6–7 W Xe–D2 episode lacks published ± — do not invent discovery MoE from that branch',
      'EQ-OPEN-YIELD-01 stays OPEN; discovery_grade_eligible stays false',
    ]),
    honesty:
      'Exploratory near-miss hydrate only — not discovery; does not set lenr_proved or close EQ-OPEN-*.',
  }),
]);

/**
 * Corpus-default quantitative distance (S_heat undefined on §5B campaign surfaces).
 * Per-row envelopes attach live distance via discovery_grade_gap.quantitative_distance.
 */
export const QUANTITATIVE_DISTANCE_DEFAULT = Object.freeze({
  schema: 'lenr-sigma-distance-v1',
  discovery_grade_threshold_sigma: 5,
  s_heat: null,
  moe_provenance: null,
  moe_sigma_q_pairing_verified: false,
  arithmetic_sigma_shortfall: null,
  required_sigma_q_w_for_5: null,
  sigma_tightening_factor_vs_5: null,
  distance_status: 'undefined',
  discovery_grade_eligible: false,
  note:
    'Campaign / §5B default: S_heat undefined without cite-gated Q and σ_Q. ' +
    'Never render bare S_heat without moe_provenance / pairing. When arithmetic S_heat ≥ 5 ' +
    'but gates stay blocked (e.g. Miles instrument_precision), distance_status is ' +
    'at_or_above_bar_gates_blocked — still not discovery.',
});

export const DISCOVERY_GRADE_BAR = Object.freeze({
  title: 'Discovery-grade significance bar (≥5σ)',
  sigma_threshold: 5,
  status: 'not_met',
  helper_module: 'LENR_SIM_APP_v2/backend/app/physics_engine/calorimetry_significance.py',
  gap_helper_module: 'LENR_SIM_APP_v2/backend/app/physics_engine/discovery_grade_gap.py',
  distance_helper_module: 'LENR_SIM_APP_v2/backend/app/physics_engine/sigma_distance.py',
  heat_formula: 'S_heat = Q_excess / σ_Q',
  /** Explicit gap vs BDS-302 discovery_grade_eligible (still unmet). */
  moe_pairing_status: 'unverified',
  cite_gated_sigma_q: 'required_not_met',
  quantitative_distance: QUANTITATIVE_DISTANCE_DEFAULT,
  corpus_moe_coverage: CORPUS_MOE_COVERAGE,
  note:
    'Prefer ≥5σ for discovery-grade calorimetry language. Oracle B null-falsify SNR≥3 is ' +
    'exploratory only. Cite-gated σ_Q required; instrument precision/floor MoE stays exploratory; ' +
    'verified Q↔σ_Q pairing required for discovery_grade_eligible. Campaign / avenue / Lean ' +
    'outputs never claim 5σ discovery or flip lenr_proved.',
  gap_note:
    'Gap: moe_sigma_q_pairing_verified is false on campaign/UI rows; cite-gated σ_Q is not ' +
    'supplied for discovery_grade_eligible. More UQ samples deepen model envelopes only — ' +
    'they do not close the ≥5σ bar. Quantitative distance defaults to undefined on corpus ' +
    'campaign surfaces; literature hydrate may show arithmetic ≥5σ with gates blocked.',
  missing_requirements: DISCOVERY_GRADE_MISSING,
  does_not_count: Object.freeze([
    'Simulation campaign N alone',
    'UQ sample count / Sobol envelopes alone',
    'Avenue ranking informativeness scores',
    'Lean clamp / non-closure identities',
    'Exploratory S_heat under instrument_precision without verified pairing',
    'Arithmetic S_heat ≥ 5 with blocked MoE gates',
  ]),
});

/** Campaign / reviewer-pack evidence pointers (read-only). */
export const CAMPAIGN_EVIDENCE = Object.freeze({
  title: 'Campaign / reviewer-pack evidence',
  preset: 'cavitation_collapse',
  pack_path:
    'LENR_SIM_APP_v2/datasets/reviewer_packs/cavitation_collapse_campaign/',
  simulation_evidence_path:
    'LENR_SIM_APP_v2/docs/v0.3.7-beta/paper/simulation_evidence.json',
  n_experiments: 22,
  n_theory_runs: 22,
  /** Pinned pack Sobol depth (build_cavitation_collapse_pack.PACK_UQ_SAMPLES). */
  uq_samples: 32,
  hosts: Object.freeze(['copper', 'nickel', 'palladium', 'titanium']),
  dynamics_modes: Object.freeze(['keller_miksis', 'rayleigh_plesset']),
  literature_ids: Object.freeze([
    'taleyarkhan-sonofusion-2002',
    'pyyhtia-cr39-cavitation-2026',
  ]),
  /** Asymmetric roles — avoid false-balance co-listing (BDS-334). */
  literature_roles: Object.freeze([
    Object.freeze({
      id: 'taleyarkhan-sonofusion-2002',
      role: 'contested_positive_claim',
      label: 'Taleyarkhan-class sonofusion (contested positive claim)',
    }),
    Object.freeze({
      id: 'pyyhtia-cr39-cavitation-2026',
      role: 'detector_confounder_peer',
      label: 'Pyyhtiä 2026 CR-39 cavitation (detector confounder peer)',
    }),
  ]),
  literature_anchor:
    'Taleyarkhan-class = contested positive claim; Pyyhtiä 2026 = detector-confounder peer (not LENR-rate proof)',
  hydro_label: 'modelled enhancement / contested hydro',
  densification_note:
    'Pack N and UQ sample depth are model-grid densification only — not weight-of-numbers ' +
    'toward ≥5σ discovery or EQ-OPEN discharge.',
  /** Theory-score bins from pack manifest — not lab corroboration counts (BDS-334 P2). */
  claim_tier_histogram: Object.freeze({
    speculative_exploratory: 528,
    empirical_lenr_correlation: 44,
  }),
  claim_tier_histogram_note:
    'Pack claim_tier_histogram EMP counts are theory-score bins on model rows — not lab ' +
    'corroboration or discovery weight. Separate from N/UQ densification chips.',
  note:
    'Bubble-lattice host × loading × drive × frequency × dynamics_mode cells with include_uncertainty. ' +
    'Model output only; does not raise empirical claim tiers or meet ≥5σ discovery-grade closure. '
    + 'UQ sample deepen (32) widens model envelopes only — not cite-gated σ_Q / not discovery. '
    + 'BDS-329 adds EC/MEV avenue-stress cells; pack rows stamp discovery_grade_gap + '
    + 'honest_closure overall_status not_met. '
    + 'Pyyhtiä et al. 2026 (DOI 10.1016/j.jelechem.2026.120104) is an electrolytic CR-39 '
    + 'cavitation / detector-confounder peer — not LENR-rate proof. '
    + 'N/UQ growth is densification, not discovery weight.',
});

/**
 * Avenue ranking summary (decision aid). Rank order follows decision_oracle
 * next_measurement priority; scores are not a posterior over “LENR is true.”
 */
export const AVENUE_RANKING_SUMMARY = Object.freeze({
  title: 'Scenario-table avenue ranking (not a posterior)',
  kind: 'scenario_table_not_posterior',
  doc_path: 'LENR_SIM_APP_v2/docs/v0.3.9-beta/AVENUE_RANKING.md',
  claim_tier: 'speculative_exploratory',
  preferred_pack: 'cavitation_collapse_campaign',
  non_proof:
    'Ranking is a lab-design decision aid over campaign packs + UQ/oracle layers. ' +
    'It is not a Bayesian posterior that LENR is proved, and it never sets lenr_proved. ' +
    'Informativeness scores are not ≥5σ discovery claims. Title leads with scenario-table ' +
    'honesty so skimmers cannot read “Bayesian” as a lab posterior.',
  runway_doc_path: 'LENR_SIM_APP_v2/docs/v0.3.9-beta/EQ_OPEN_CLOSURE_RUNWAY.md',
  /** Stable catalog order (oracle next_measurement priority). */
  avenues: Object.freeze([
    {
      id: 'miles_heat_helium_q',
      label: 'Simultaneous heat + He-4 (Miles Q band)',
      stresses: Object.freeze(['EQ-OPEN-MEV-01', 'EQ-OPEN-YIELD-01']),
      five_sigma_role: 'primary_heat_yield',
    },
    {
      id: 'gamma_ul_23p8',
      label: 'Efficiency-corrected 23.8 MeV γ upper limit',
      stresses: Object.freeze(['EQ-OPEN-RAD-01']),
      five_sigma_role: 'orthogonal_rad_ul',
    },
    {
      id: 'calorimetry_sigma_q',
      label: 'Calorimetry resolution (σ_Q / SNR)',
      stresses: Object.freeze(['EQ-OPEN-YIELD-01']),
      five_sigma_role: 'primary_heat_moe',
    },
    {
      id: 'p4_occupation',
      label: 'p₄ occupation / trap occupancy probe',
      stresses: Object.freeze(['EQ-OPEN-MEV-01', 'EQ-OPEN-RATE-01']),
      five_sigma_role: 'supporting_rate_mev',
    },
    {
      id: 'rate_budget_loading',
      label: 'Reaction-rate vs loading / host (rate UQ + band)',
      stresses: Object.freeze(['EQ-OPEN-RATE-01']),
      five_sigma_role: 'supporting_rate',
    },
    {
      id: 'electron_capture_threshold',
      label: 'Electron-capture / mass-renormalization threshold',
      stresses: Object.freeze(['EQ-OPEN-EC-01']),
      five_sigma_role: 'orthogonal_ec',
    },
    {
      id: 'cavitation_collapse_uq',
      label: 'Cavitation / collapse peak UQ (ENC bookkeeping)',
      stresses: Object.freeze(['EQ-OPEN-RATE-01', 'EQ-OPEN-MEV-01']),
      five_sigma_role: 'model_uq_not_discovery',
    },
  ]),
});

/** Doc / route pointers linking Analytics ↔ avenue ranking ↔ EQ-OPEN runway. */
export const CLOSURE_SURFACE_LINKS = Object.freeze({
  title: 'Analytics ↔ avenue ranking ↔ EQ-OPEN runway',
  note:
    'Cross-links only. Avenue informativeness scores and runway criteria docs do not ' +
    'discharge EQ-OPEN-* or meet ≥5σ discovery; lenr_proved stays false. Affirmative / ' +
    'Falsification / Does-not-count excerpts are decision aids — status stays OPEN.',
  analytics_route: '/analytics',
  theory_paper_route: '/theory-paper',
  avenue_doc_path: 'LENR_SIM_APP_v2/docs/v0.3.9-beta/AVENUE_RANKING.md',
  runway_doc_path: 'LENR_SIM_APP_v2/docs/v0.3.9-beta/EQ_OPEN_CLOSURE_RUNWAY.md',
  docs_eq_open_runway: '/docs/eq-open-closure-runway',
  docs_reviewer_packets: '/docs/reviewer-packets',
  docs_issue_ledger: '/docs/issue-ledger',
  docs_testable_predictions: '/docs/testable-predictions',
  docs_researcher_review_pack: '/docs/researcher-review-pack',
});

/**
 * Avenues that stress a given EQ-OPEN id (read-only linkage helper).
 * @param {string} openId
 */
export function avenuesForOpenId(openId) {
  return AVENUE_RANKING_SUMMARY.avenues.filter((avenue) =>
    avenue.stresses.includes(openId),
  );
}

/** Lean / IR formalization status — bounds vs empirical closure. */
export const FORMALIZATION_STATUS = Object.freeze({
  title: 'Formalization / Lean status',
  status_doc: 'docs/FORMALIZATION/FORMAL_PROOF_STATUS.md',
  collapse_module: 'formalization/lean/LenrFormal/CollapseBounds.lean',
  calorimetry_module: 'formalization/lean/LenrFormal/CalorimetrySignificance.lean',
  summary:
    'Lean certifies clamp algebra, identities, and non-closure implications under stated ' +
    'definitions. It does not prove LENR occurs, does not discharge EQ-OPEN-* obligations, ' +
    'and does not establish ≥5σ laboratory significance. EQ-HEAT-SIG-01 locks the analytics ' +
    'bar at 5σ; EQ-HEAT-SIG-NC-01 proves DiscoveryGradeAnalytics never closes any of Q1–Q5 ' +
    '(MEV/RAD/RATE/EC/YIELD) under open witnesses, and high arithmetic S_heat alone never ' +
    'closes Q5. EQ-BBL-NR-01 / EQ-BBL-RP-DOM-01 are honesty / domain locks — not nature proofs. ' +
    'EQ-RATE-CAP-GAP-01 marks SPEC-input gaps, not channel evidence.',
  items: Object.freeze([
    {
      id: 'EQ-BBL-LIM-01',
      label: 'CollapseBounds clamp algebra',
      kind: 'bounds',
      note: 'Pointwise min(raw, bound); reported T/P under calculated ceilings — not empirical closure.',
    },
    {
      id: 'EQ-BBL-BOUND-01',
      label: 'Emission / Moss / shock ceilings',
      kind: 'bounds',
      note: 'ENG-BUBBLE-FUSION-01 scaffold ceilings + Mach×10 regime selector (definitions).',
    },
    {
      id: 'EQ-BBL-RP-DOM-01',
      label: 'RP domain ≠ dynamics proof',
      kind: 'bounds',
      note: 'Mach×10 RP/KM domain predicate only — not ODE existence or nuclear-rate validity.',
    },
    {
      id: 'EQ-BBL-UQ-01',
      label: 'Collapse UQ percentile keys',
      kind: 'definitions',
      note: 'Percentile keys and CR/γ tolerance percents as definitions — model bookkeeping only.',
    },
    {
      id: 'EQ-BBL-NR-01',
      label: 'Hydro ≠ nuclear-rate proof',
      kind: 'non-closure',
      note: 'PROVED honesty implications over AX-tagged provenance kinds; labConstrained empty in-repo.',
    },
    {
      id: 'EQ-HEAT-SIG-01',
      label: 'Calorimetry ≥5σ analytics bar lock',
      kind: 'bounds',
      note: 'discoveryGradeSigma=5; exploratory SNR=3; milli-σ shortfall identities — not lab proof.',
    },
    {
      id: 'EQ-HEAT-SIG-NC-01',
      label: 'Heat significance non-closure',
      kind: 'non-closure',
      note:
        'Empty citations / unverified pairing / seed-scale / Miles+Celani instrument-precision / ' +
        'floor ⇏ discovery; cite-gated DiscoveryGradeAnalytics ⇏ YIELD; dual Kasagi ⇏ any of ' +
        'Q1–Q5 or lenr_proved; LabAskProxies + planned DAQ sample-v1 ⇏ discharge ' +
        '(BDS-346/BDS-360/BDS-362/BDS-375).',
    },
    {
      id: 'EQ-BBL-HEAT-NC-01',
      label: 'Collapse UQ ≠ cite-gated heat MoE',
      kind: 'non-closure',
      note: 'Collapse UQ / hydro / campaign MoE kinds never supply discovery-grade heat MoE; UQ percentiles do not close Q5.',
    },
    {
      id: 'EQ-RATE-CAP-GAP-01',
      label: '25 pm / ULM CAP-GAP (SPEC inputs)',
      kind: 'non-closure',
      note: 'Engine caps do not certify non-closure for 25 pm TSC / ULM three_body — SPEC-input gaps, not evidence those channels close.',
    },
    {
      id: 'EQ-WH-NONCLOSE-01',
      label: 'WH non-closure',
      kind: 'non-closure',
      note: 'WorkingHypothesis proves partition / non-closure only; does not close Q1–Q3.',
    },
    {
      id: 'OpenObligations',
      label: 'EQ-OPEN predicates undischarged',
      kind: 'open',
      note: 'OpenObligations / OpenQuestionBounds: would-close-if lemmas are bookkeeping, not nature proof.',
    },
  ]),
});

/**
 * EQ-OPEN closure runway — draft criteria + falsifiers; every row still OPEN.
 * Mirror of EQ_OPEN_CLOSURE_RUNWAY.md (UI summary only).
 */
export const EQ_OPEN_RUNWAY = Object.freeze({
  title: 'EQ-OPEN closure runway',
  doc_path: 'LENR_SIM_APP_v2/docs/v0.3.9-beta/EQ_OPEN_CLOSURE_RUNWAY.md',
  status: 'OPEN',
  note:
    'Draft discharge / falsification criteria are documented for each EQ-OPEN-* row. ' +
    'Criteria docs are linked for review; no obligation is closed in this UI. ' +
    'Simulation, avenue ranking, and Lean alone never discharge. Prefer ≥5σ cite-gated ' +
    'significance where heat/yield claims underwrite closure.',
  open_ids: OPEN_EQ_IDS,
  criteria: Object.freeze([
    {
      id: 'EQ-OPEN-MEV-01',
      label: 'MeV energy-partition channel',
      claim_tier: 'speculative_exploratory',
      related_avenues: Object.freeze([
        'miles_heat_helium_q',
        'p4_occupation',
        'cavitation_collapse_uq',
      ]),
      five_sigma_relevance: 'supporting_partition_not_heat_moe',
      affirmative:
        'Governed experiment/corpus zeros open MeV remainder under a named mechanism + cited bounds.',
      falsification:
        'Remainder stays strictly positive across the licensed domain, or the named channel is ruled out.',
      does_not_count: 'WH partition theorems; campaign scenario tables; UI chips.',
    },
    {
      id: 'EQ-OPEN-RAD-01',
      label: 'Radiation / γ suppression',
      claim_tier: 'speculative_exploratory',
      related_avenues: Object.freeze(['gamma_ul_23p8']),
      five_sigma_relevance: 'orthogonal_to_heat_5sigma_uses_ul',
      affirmative:
        'Calibrated heat+γ (or UL) with efficiency meets IR bound + lattice absorption target.',
      falsification:
        'Calibrated γ above licensed UL while heat stays in-band; absorption unattainable under microphysics.',
      does_not_count:
        'Harmonic Lean alone; UL without efficiency/coincidence; CR-39 pits (Pyyhtiä confounder).',
    },
    {
      id: 'EQ-OPEN-RATE-01',
      label: 'Lattice rate budget',
      claim_tier: 'speculative_exploratory',
      related_avenues: Object.freeze([
        'p4_occupation',
        'rate_budget_loading',
        'cavitation_collapse_uq',
      ]),
      five_sigma_relevance: 'orthogonal_to_heat_5sigma_rate_caps',
      affirmative:
        'Named rate_mode closes log10(N) with experimentally constrained occupancy/collective factors.',
      falsification:
        'All licensed paths remain below closure after capping factors at measured/literature bounds.',
      does_not_count: 'UI BUDGET_DOES_NOT_CLOSE; free 10^6 cap assumptions; campaign grids alone.',
    },
    {
      id: 'EQ-OPEN-EC-01',
      label: 'Electron-capture energy path',
      claim_tier: 'speculative_exploratory',
      related_avenues: Object.freeze(['electron_capture_threshold']),
      five_sigma_relevance: 'orthogonal_to_heat_5sigma_threshold',
      /** Sourced threshold / domain critique (AuthorYear keys). */
      citations: Object.freeze(['tennfors2013', 'widomlarsen2006']),
      affirmative:
        'Independent CM path supplies ≥0.782 MeV in the licensed material/field regime (Tennfors domain).',
      falsification:
        'Stated CM paths remain orders of magnitude below threshold under measured potentials/masses.',
      does_not_count: 'UI gap-to-threshold cosmetics; ARA Widom scaffold.',
    },
    {
      id: 'EQ-OPEN-YIELD-01',
      label: 'Integrated heat–helium yield',
      claim_tier: 'empirical_lenr_correlation',
      related_avenues: Object.freeze(['miles_heat_helium_q', 'calorimetry_sigma_q']),
      five_sigma_relevance: 'requires_cite_gated_heat_moe_ge_5sigma',
      citations: Object.freeze(['miles1993']),
      affirmative:
        'Time-resolved heat+He with recovery efficiency closes integrated ΔN; prefer ≥5σ heat MoE where claimed.',
      falsification:
        'Integrated discrepancy stays in the open remainder band after efficiency corrections.',
      does_not_count: 'Instantaneous Miles EMP band membership alone; exploratory S_heat without verified pairing.',
    },
  ]),
});

/**
 * Guard used by unit tests: UI config must never claim proof or closure.
 * @param {typeof SCIENCE_EVIDENCE_HONESTY} [honesty]
 */
export function assertScienceEvidenceHonesty(honesty = SCIENCE_EVIDENCE_HONESTY) {
  if (honesty.lenr_proved !== false) {
    throw new Error('Science evidence UI must keep lenr_proved === false');
  }
  if (honesty.kind !== 'scenario_table_not_posterior') {
    throw new Error('Science evidence UI must be scenario_table_not_posterior');
  }
  for (const id of OPEN_EQ_IDS) {
    if (honesty.open_status[id] !== 'OPEN') {
      throw new Error(`Science evidence UI must keep ${id} OPEN`);
    }
  }
  if (DISCOVERY_GRADE_BAR.status !== 'not_met') {
    throw new Error('Science evidence UI must keep discovery-grade ≥5σ status not_met');
  }
  if (CORPUS_MOE_COVERAGE.closes_eq_open !== false) {
    throw new Error('Science evidence UI must keep CORPUS_MOE_COVERAGE.closes_eq_open false');
  }
  if (CORPUS_MOE_COVERAGE.lenr_proved !== false) {
    throw new Error('Science evidence UI must keep CORPUS_MOE_COVERAGE.lenr_proved false');
  }
  if (CORPUS_MOE_COVERAGE.literature_moe_inventory_exhausted !== true) {
    throw new Error(
      'Science evidence UI must mark literature_moe_inventory_exhausted true (no fabricated pairs)',
    );
  }
  if (
    !CORPUS_MOE_COVERAGE.locked_s_heat ||
    CORPUS_MOE_COVERAGE.locked_s_heat['kasagi-nicu-radiant-2026'] !== 13.75 ||
    CORPUS_MOE_COVERAGE.locked_s_heat['kasagi-ni-radiant-2026'] !== 11.25 ||
    CORPUS_MOE_COVERAGE.locked_s_heat['miles-1993'] !== 26 ||
    CORPUS_MOE_COVERAGE.locked_s_heat['celani-constantan-2019'] !== 6
  ) {
    throw new Error(
      'Science evidence UI must lock Kasagi/Miles/Celani S_heat arithmetic (13.75 / 11.25 / 26 / 6)',
    );
  }
  if (CORPUS_MOE_COVERAGE.n_records !== 26 || CORPUS_MOE_COVERAGE.with_sigma_q !== 5) {
    throw new Error(
      'Science evidence UI must keep corpus coverage at 26 records / 5 with σ_Q after Celani exploratory hydrate',
    );
  }
  if (CORPUS_MOE_COVERAGE.discovery_grade_eligible_count !== 2) {
    throw new Error(
      'Science evidence UI must keep discovery_grade_eligible_count at 2 (Kasagi only)',
    );
  }
  if (
    !Array.isArray(CORPUS_MOE_COVERAGE.refused_fabricated_moe_campaigns) ||
    CORPUS_MOE_COVERAGE.refused_fabricated_moe_campaigns.length < 4
  ) {
    throw new Error(
      'Science evidence UI must list refused_fabricated_moe_campaigns (Iwamura/Mizuno/Arata/Celani)',
    );
  }
  for (const row of CORPUS_MOE_COVERAGE.refused_fabricated_moe_campaigns) {
    if (row.sigma_Q_W != null || row.discovery_grade_eligible !== false) {
      throw new Error(
        `Refused campaign ${row.id} must keep sigma_Q_W null and discovery_grade_eligible false`,
      );
    }
    if (row.decision !== 'REFUSE_FABRICATED_SIGMA_Q') {
      throw new Error(`Refused campaign ${row.id} must keep REFUSE_FABRICATED_SIGMA_Q`);
    }
  }
  if (
    CORPUS_MOE_COVERAGE.campaign_model_output_sigma_Q_W !== 0.1 ||
    CORPUS_MOE_COVERAGE.campaign_model_output_is_discovery_moe !== false
  ) {
    throw new Error(
      'Science evidence UI must keep campaign model-output σ_Q=0.1 non-discovery',
    );
  }
  if (CORPUS_MOE_COVERAGE.analytics_eligible_ne_eq_open !== true) {
    throw new Error(
      'Science evidence UI must keep analytics_eligible_ne_eq_open true',
    );
  }
  if (CORPUS_MOE_COVERAGE.analytics_eligible_ne_lenr_proved !== true) {
    throw new Error(
      'Science evidence UI must keep analytics_eligible_ne_lenr_proved true',
    );
  }
  if (CORPUS_MOE_COVERAGE.soft_chip_ne_scientific_discharge !== true) {
    throw new Error(
      'Science evidence UI must keep soft_chip_ne_scientific_discharge true',
    );
  }
  if (CORPUS_MOE_COVERAGE.lean_dual_kasagi_nc_bound !== true) {
    throw new Error('Science evidence UI must keep lean_dual_kasagi_nc_bound true');
  }
  if (CORPUS_MOE_COVERAGE.lean_instrument_floor_nc_bound !== true) {
    throw new Error(
      'Science evidence UI must keep lean_instrument_floor_nc_bound true',
    );
  }
  if (CORPUS_MOE_COVERAGE.lean_all_eq_open_nc_bound !== true) {
    throw new Error(
      'Science evidence UI must keep lean_all_eq_open_nc_bound true (BDS-346)',
    );
  }
  if (CORPUS_MOE_COVERAGE.lean_lab_ask_nc_bound !== true) {
    throw new Error(
      'Science evidence UI must keep lean_lab_ask_nc_bound true (BDS-348)',
    );
  }
  if (CORPUS_MOE_COVERAGE.lab_ask_met_ne_eq_open_discharge !== true) {
    throw new Error(
      'Science evidence UI must keep lab_ask_met_ne_eq_open_discharge true (BDS-348)',
    );
  }
  if (CORPUS_MOE_COVERAGE.lean_celani_exploratory_nc_bound !== true) {
    throw new Error(
      'Science evidence UI must keep lean_celani_exploratory_nc_bound true (Celani exploratory NC)',
    );
  }
  if (
    CORPUS_MOE_COVERAGE.lean_daq_planned_ne_discharge !== true ||
    CORPUS_MOE_COVERAGE.daq_sample_ingest_planned_not_attested !== true
  ) {
    throw new Error(
      'Science evidence UI must keep lean_daq_planned_ne_discharge + planned_not_attested true (BDS-375)',
    );
  }
  if (CORPUS_MOE_COVERAGE.lean_citations_pairing_nc_bound !== true) {
    throw new Error(
      'Science evidence UI must keep lean_citations_pairing_nc_bound true (BDS-362)',
    );
  }
  if (CORPUS_MOE_COVERAGE.lean_cite_gated_ne_yield_closure !== true) {
    throw new Error(
      'Science evidence UI must keep lean_cite_gated_ne_yield_closure true (BDS-362)',
    );
  }
  if (CORPUS_MOE_COVERAGE.software_honest_5sigma_runway_exhausted !== true) {
    throw new Error(
      'Science evidence UI must mark software_honest_5sigma_runway_exhausted true',
    );
  }
  if (CORPUS_MOE_COVERAGE.promote_prep_recommended !== true) {
    throw new Error('Science evidence UI must mark promote_prep_recommended true');
  }
  if (
    !Array.isArray(CORPUS_MOE_COVERAGE.remaining_scientific_blockers) ||
    CORPUS_MOE_COVERAGE.remaining_scientific_blockers.length < 5
  ) {
    throw new Error(
      'Science evidence UI must list remaining_scientific_blockers (≥5 scientific/governance)',
    );
  }
  if (
    !DAQ_SAMPLE_PROVENANCE ||
    DAQ_SAMPLE_PROVENANCE.schema_id !== 'lenr-ara-daq-sample-v1' ||
    DAQ_SAMPLE_PROVENANCE.trust_plane !== 'daq' ||
    DAQ_SAMPLE_PROVENANCE.ingest_status !== 'planned_not_attested' ||
    DAQ_SAMPLE_PROVENANCE.refuse_fabricated_samples !== true ||
    DAQ_SAMPLE_PROVENANCE.lenr_proved_default !== false ||
    DAQ_SAMPLE_PROVENANCE.private_extensions_stripped_required !== true
  ) {
    throw new Error(
      'Science evidence UI must lock DAQ_SAMPLE_PROVENANCE (sample-v1 / daq / planned / refuse / lenr_proved false)',
    );
  }
  if (!Array.isArray(NEXT_LAB_MOE_TARGETS) || NEXT_LAB_MOE_TARGETS.length < 5) {
    throw new Error(
      'Science evidence UI must list NEXT_LAB_MOE_TARGETS (≥5 concrete lab/MoE asks)',
    );
  }
  for (const target of NEXT_LAB_MOE_TARGETS) {
    if (target.status !== 'blocked_awaiting_lab') {
      throw new Error(
        `Science evidence UI must keep NEXT_LAB_MOE_TARGETS ${target.id} blocked_awaiting_lab`,
      );
    }
    if (target.closes_eq_open !== false) {
      throw new Error(
        `Science evidence UI must keep NEXT_LAB_MOE_TARGETS ${target.id} closes_eq_open false`,
      );
    }
    if (
      !target.avenue_id ||
      !Array.isArray(target.eq_open_ids) ||
      !target.target ||
      !target.lab_acceptance ||
      !target.still_does_not_discharge ||
      !target.corpus_gap_now
    ) {
      throw new Error(
        `Science evidence UI NEXT_LAB_MOE_TARGETS ${target.id} missing precision fields ` +
          '(avenue/eq_open/target/lab_acceptance/still_does_not_discharge/corpus_gap_now)',
      );
    }
    if (!Array.isArray(target.daq_observables)) {
      throw new Error(
        `Science evidence UI NEXT_LAB_MOE_TARGETS ${target.id} must list daq_observables array`,
      );
    }
    if (!target.claim_tier || typeof target.claim_tier !== 'string') {
      throw new Error(
        `Science evidence UI NEXT_LAB_MOE_TARGETS ${target.id} must declare claim_tier`,
      );
    }
    if (
      target.daq_schema !== DAQ_SAMPLE_PROVENANCE.schema_id ||
      target.daq_trust_plane !== DAQ_SAMPLE_PROVENANCE.trust_plane ||
      target.daq_ingest_status !== DAQ_SAMPLE_PROVENANCE.ingest_status ||
      !Array.isArray(target.daq_calibration_required) ||
      !target.daq_gap_note
    ) {
      throw new Error(
        `Science evidence UI NEXT_LAB_MOE_TARGETS ${target.id} missing DAQ provenance densification ` +
          '(daq_schema/trust_plane/ingest_status/calibration_required/daq_gap_note)',
      );
    }
    for (const field of target.daq_observables) {
      if (!DAQ_SAMPLE_PROVENANCE.public_observable_field_set.includes(field)) {
        throw new Error(
          `Science evidence UI NEXT_LAB_MOE_TARGETS ${target.id} daq_observable ` +
            `${field} not in sample-v1 public field set (refuse inventing fields)`,
        );
      }
    }
    for (const oid of target.eq_open_ids) {
      if (!OPEN_EQ_IDS.includes(oid)) {
        throw new Error(
          `Science evidence UI NEXT_LAB_MOE_TARGETS ${target.id} unknown EQ-OPEN ${oid}`,
        );
      }
    }
  }
  if (
    !Array.isArray(EMP_EXPLORATORY_WHY_NOT_DISCOVERY) ||
    EMP_EXPLORATORY_WHY_NOT_DISCOVERY.length < 1
  ) {
    throw new Error('Science evidence UI must list EMP_EXPLORATORY_WHY_NOT_DISCOVERY rows');
  }
  for (const row of EMP_EXPLORATORY_WHY_NOT_DISCOVERY) {
    if (row.discovery_grade_eligible !== false) {
      throw new Error(
        `Science evidence UI must keep EMP exploratory ${row.literature_id} non-discovery`,
      );
    }
    if (row.soft_chip === 'met' || /≥5σ.*met/i.test(String(row.soft_chip || ''))) {
      throw new Error(
        `Science evidence UI must not use ≥5σ met soft chips on ${row.literature_id}`,
      );
    }
  }
  if (
    !Array.isArray(REFUSED_FABRICATED_MOE_CAMPAIGNS) ||
    REFUSED_FABRICATED_MOE_CAMPAIGNS.length < 4
  ) {
    throw new Error(
      'Science evidence UI must list REFUSED_FABRICATED_MOE_CAMPAIGNS (≥4 refuse rows)',
    );
  }
  for (const row of REFUSED_FABRICATED_MOE_CAMPAIGNS) {
    if (!row.decision || !String(row.decision).startsWith('refuse')) {
      throw new Error(
        `Science evidence UI must keep refused MoE campaign ${row.id} decision=refuse*`,
      );
    }
    if (!row.missing || String(row.missing).length < 20) {
      throw new Error(
        `Science evidence UI must document missing MoE cite for refused campaign ${row.id}`,
      );
    }
    if (/discovery_grade_eligible\s*[:=]\s*true/i.test(String(row.honesty || ''))) {
      throw new Error(
        `Science evidence UI must not claim discovery on refused MoE campaign ${row.id}`,
      );
    }
  }
  if (QUANTITATIVE_DISTANCE_DEFAULT.distance_status !== 'undefined') {
    throw new Error(
      'Science evidence UI must keep corpus quantitative_distance status undefined',
    );
  }
  if (!DISCOVERY_GRADE_BAR.missing_requirements?.length) {
    throw new Error('Science evidence UI must list discovery-grade missing_requirements');
  }
  for (const req of DISCOVERY_GRADE_BAR.missing_requirements) {
    if (req.status !== 'not_met') {
      throw new Error(`Science evidence UI must keep gap ${req.id} status not_met`);
    }
  }
  const missingIds = new Set(
    DISCOVERY_GRADE_BAR.missing_requirements.map((req) => req.id),
  );
  for (const requiredId of [
    'cite_gated_sigma_q',
    'moe_pairing_verified',
    's_heat_ge_5',
    'eq_open_discharge',
    'governance_signoff',
  ]) {
    if (!missingIds.has(requiredId)) {
      throw new Error(
        `Science evidence UI must keep corpus gap id ${requiredId} not_met`,
      );
    }
  }
  if (EQ_OPEN_RUNWAY.status !== 'OPEN') {
    throw new Error('Science evidence UI must keep EQ_OPEN_RUNWAY.status OPEN');
  }
  for (const row of EQ_OPEN_RUNWAY.criteria) {
    if (!row.claim_tier || typeof row.claim_tier !== 'string') {
      throw new Error(`Science evidence runway ${row.id} must declare claim_tier`);
    }
    if (!Array.isArray(row.related_avenues) || row.related_avenues.length < 1) {
      throw new Error(`Science evidence runway ${row.id} must link related_avenues`);
    }
  }
}
