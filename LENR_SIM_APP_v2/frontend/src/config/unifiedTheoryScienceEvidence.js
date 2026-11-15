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
 * Paper / BDS-302 discovery bar — analytics flag criteria only; unmet for closure.
 */
export const DISCOVERY_GRADE_BAR = Object.freeze({
  title: 'Discovery-grade significance bar (≥5σ)',
  sigma_threshold: 5,
  status: 'not_met',
  helper_module: 'LENR_SIM_APP_v2/backend/app/physics_engine/calorimetry_significance.py',
  heat_formula: 'S_heat = Q_excess / σ_Q',
  note:
    'Prefer ≥5σ for discovery-grade calorimetry language. Oracle B null-falsify SNR≥3 is ' +
    'exploratory only. Cite-gated σ_Q required; instrument precision/floor MoE stays exploratory; ' +
    'verified Q↔σ_Q pairing required for discovery_grade_eligible. Campaign / avenue / Lean ' +
    'outputs never claim 5σ discovery or flip lenr_proved.',
  does_not_count: Object.freeze([
    'Simulation campaign N alone',
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
  n_experiments: 18,
  n_theory_runs: 18,
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
  if (EQ_OPEN_RUNWAY.status !== 'OPEN') {
    throw new Error('Science evidence UI must keep EQ_OPEN_RUNWAY.status OPEN');
  }
  for (const row of EQ_OPEN_RUNWAY.criteria) {
    if (!row.claim_tier || typeof row.claim_tier !== 'string') {
      throw new Error(`Science evidence runway ${row.id} must declare claim_tier`);
    }
  }
}
