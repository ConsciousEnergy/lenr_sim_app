/**
 * Curated Theory Paper science-evidence pointers (Phase E).
 *
 * Mirrors honesty fields from:
 *   - LENR_SIM_APP_v2/docs/v0.3.7-beta/paper/simulation_evidence.json
 *   - LENR_SIM_APP_v2/docs/v0.3.9-beta/AVENUE_RANKING.md
 *   - LENR_SIM_APP_v2/docs/v0.3.9-beta/EQ_OPEN_CLOSURE_RUNWAY.md
 *   - docs/FORMALIZATION/FORMAL_PROOF_STATUS.md
 *
 * Read-only UI summary only. Never flips lenr_proved or closes EQ-OPEN-*.
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
    'and never set lenr_proved.',
});

/** Campaign / reviewer-pack evidence pointers (read-only). */
export const CAMPAIGN_EVIDENCE = Object.freeze({
  title: 'Campaign / reviewer-pack evidence',
  preset: 'cavitation_collapse',
  pack_path:
    'LENR_SIM_APP_v2/datasets/reviewer_packs/cavitation_collapse_campaign/',
  simulation_evidence_path:
    'LENR_SIM_APP_v2/docs/v0.3.7-beta/paper/simulation_evidence.json',
  n_experiments: 10,
  n_theory_runs: 10,
  literature_anchor: 'Taleyarkhan-class sonofusion (contested)',
  hydro_label: 'modelled enhancement / contested hydro',
  note:
    'Bubble-lattice host × loading × drive × dynamics_mode cells with include_uncertainty. ' +
    'Model output only; does not raise empirical claim tiers.',
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
    'It is not a Bayesian posterior that LENR is proved, and it never sets lenr_proved.',
  /** Stable catalog order (oracle next_measurement priority). */
  avenues: Object.freeze([
    {
      id: 'miles_heat_helium_q',
      label: 'Simultaneous heat + He-4 (Miles Q band)',
      stresses: Object.freeze(['EQ-OPEN-MEV-01', 'EQ-OPEN-YIELD-01']),
    },
    {
      id: 'gamma_ul_23p8',
      label: 'Efficiency-corrected 23.8 MeV γ upper limit',
      stresses: Object.freeze(['EQ-OPEN-RAD-01']),
    },
    {
      id: 'calorimetry_sigma_q',
      label: 'Calorimetry resolution (σ_Q / SNR)',
      stresses: Object.freeze(['EQ-OPEN-YIELD-01']),
    },
    {
      id: 'p4_occupation',
      label: 'p₄ occupation / trap occupancy probe',
      stresses: Object.freeze(['EQ-OPEN-MEV-01', 'EQ-OPEN-RATE-01']),
    },
    {
      id: 'rate_budget_loading',
      label: 'Reaction-rate vs loading / host (rate UQ + band)',
      stresses: Object.freeze(['EQ-OPEN-RATE-01']),
    },
    {
      id: 'electron_capture_threshold',
      label: 'Electron-capture / mass-renormalization threshold',
      stresses: Object.freeze(['EQ-OPEN-EC-01']),
    },
    {
      id: 'cavitation_collapse_uq',
      label: 'Cavitation / collapse peak UQ (ENC bookkeeping)',
      stresses: Object.freeze(['EQ-OPEN-RATE-01', 'EQ-OPEN-MEV-01']),
    },
  ]),
});

/** Lean / IR formalization status — bounds vs empirical closure. */
export const FORMALIZATION_STATUS = Object.freeze({
  title: 'Formalization / Lean status',
  status_doc: 'docs/FORMALIZATION/FORMAL_PROOF_STATUS.md',
  collapse_module: 'formalization/lean/LenrFormal/CollapseBounds.lean',
  summary:
    'Lean certifies clamp algebra, identities, and non-closure implications under stated ' +
    'definitions. It does not prove LENR occurs, and it does not discharge EQ-OPEN-* obligations.',
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

/** EQ-OPEN closure runway — criteria documented; rows still OPEN. */
export const EQ_OPEN_RUNWAY = Object.freeze({
  title: 'EQ-OPEN closure runway',
  doc_path: 'LENR_SIM_APP_v2/docs/v0.3.9-beta/EQ_OPEN_CLOSURE_RUNWAY.md',
  status: 'OPEN',
  note:
    'Draft discharge / falsification criteria are documented for each EQ-OPEN-* row. ' +
    'Criteria docs are linked for review; no obligation is closed in this UI.',
  open_ids: OPEN_EQ_IDS,
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
}
