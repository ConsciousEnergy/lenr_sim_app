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
export const DISCOVERY_GRADE_BAR = Object.freeze({
  title: 'Discovery-grade significance bar (≥5σ)',
  sigma_threshold: 5,
  status: 'not_met',
  helper_module: 'LENR_SIM_APP_v2/backend/app/physics_engine/calorimetry_significance.py',
  gap_helper_module: 'LENR_SIM_APP_v2/backend/app/physics_engine/discovery_grade_gap.py',
  heat_formula: 'S_heat = Q_excess / σ_Q',
  /** Explicit gap vs BDS-302 discovery_grade_eligible (still unmet). */
  moe_pairing_status: 'unverified',
  cite_gated_sigma_q: 'required_not_met',
  note:
    'Prefer ≥5σ for discovery-grade calorimetry language. Oracle B null-falsify SNR≥3 is ' +
    'exploratory only. Cite-gated σ_Q required; instrument precision/floor MoE stays exploratory; ' +
    'verified Q↔σ_Q pairing required for discovery_grade_eligible. Campaign / avenue / Lean ' +
    'outputs never claim 5σ discovery or flip lenr_proved.',
  gap_note:
    'Gap: moe_sigma_q_pairing_verified is false on campaign/UI rows; cite-gated σ_Q is not ' +
    'supplied for discovery_grade_eligible. More UQ samples deepen model envelopes only — ' +
    'they do not close the ≥5σ bar.',
  missing_requirements: DISCOVERY_GRADE_MISSING,
  does_not_count: Object.freeze([
    'Simulation campaign N alone',
    'UQ sample count / Sobol envelopes alone',
    'Avenue ranking informativeness scores',
    'Lean clamp / non-closure identities',
    'Exploratory S_heat under instrument_precision without verified pairing',
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
  n_experiments: 20,
  n_theory_runs: 20,
  /** Pinned pack Sobol depth (build_cavitation_collapse_pack.PACK_UQ_SAMPLES). */
  uq_samples: 32,
  hosts: Object.freeze(['copper', 'nickel', 'palladium', 'titanium']),
  dynamics_modes: Object.freeze(['keller_miksis', 'rayleigh_plesset']),
  literature_ids: Object.freeze([
    'taleyarkhan-sonofusion-2002',
    'pyyhtia-cr39-cavitation-2026',
  ]),
  literature_anchor:
    'Taleyarkhan-class sonofusion (contested); Pyyhtiä 2026 CR-39 cavitation confounder',
  hydro_label: 'modelled enhancement / contested hydro',
  note:
    'Bubble-lattice host × loading × drive × frequency × dynamics_mode cells with include_uncertainty. ' +
    'Model output only; does not raise empirical claim tiers or meet ≥5σ discovery-grade closure. '
    + 'UQ sample deepen (32) widens model envelopes only — not cite-gated σ_Q / not discovery. '
    + 'Pyyhtiä et al. 2026 (DOI 10.1016/j.jelechem.2026.120104) is an electrolytic CR-39 '
    + 'cavitation / detector-confounder peer — not LENR-rate proof.',
});

/**
 * Avenue ranking summary (decision aid). Rank order follows decision_oracle
 * next_measurement priority; scores are not a posterior over “LENR is true.”
 */
export const AVENUE_RANKING_SUMMARY = Object.freeze({
  title: 'Bayesian / UQ avenue ranking',
  kind: 'scenario_table_not_posterior',
  doc_path: 'LENR_SIM_APP_v2/docs/v0.3.9-beta/AVENUE_RANKING.md',
  claim_tier: 'speculative_exploratory',
  preferred_pack: 'cavitation_collapse_campaign',
  non_proof:
    'Ranking is a lab-design decision aid over campaign packs + UQ/oracle layers. ' +
    'It is not a Bayesian posterior that LENR is proved, and it never sets lenr_proved. ' +
    'Informativeness scores are not ≥5σ discovery claims.',
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
    'discharge EQ-OPEN-* or meet ≥5σ discovery; lenr_proved stays false.',
  analytics_route: '/analytics',
  theory_paper_route: '/theory-paper',
  avenue_doc_path: 'LENR_SIM_APP_v2/docs/v0.3.9-beta/AVENUE_RANKING.md',
  runway_doc_path: 'LENR_SIM_APP_v2/docs/v0.3.9-beta/EQ_OPEN_CLOSURE_RUNWAY.md',
  docs_reviewer_packets: '/docs/reviewer-packets',
  docs_issue_ledger: '/docs/issue-ledger',
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
  summary:
    'Lean certifies clamp algebra, identities, and non-closure implications under stated ' +
    'definitions. It does not prove LENR occurs, does not discharge EQ-OPEN-* obligations, ' +
    'and does not establish ≥5σ laboratory significance.',
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
      id: 'EQ-BBL-UQ-01',
      label: 'Collapse UQ percentile keys',
      kind: 'definitions',
      note: 'Percentile keys and CR/γ tolerance percents as definitions — model bookkeeping only.',
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
