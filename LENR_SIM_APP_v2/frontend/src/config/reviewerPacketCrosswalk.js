/**
 * Packet A–E ↔ Issue Ledger (C/M/m) ↔ legacy IL-001…018 ↔ PRED ↔ EQ-OPEN crosswalk.
 *
 * Navigation / honesty aid only. Completing a packet checklist, mapping a row, or
 * seeing paper FIXED/ADDRESSED never discharges EQ-OPEN-* or sets lenr_proved.
 *
 * Dual ledger naming:
 *   - Served Issue Ledger (`/docs/issue-ledger`) uses severity IDs C1… / M1… / m1…
 *   - Legacy framework ledger (`docs/LENR_FRAMEWORK_ISSUE_LEDGER.md`) uses IL-001…018
 *   - Paper merge instructions historically cited IL-*; canonical in-app IDs are C/M/m
 */

import { OPEN_EQ_IDS } from './unifiedTheoryScienceEvidence';

/** @type {readonly string[]} */
export const CROSSWALK_OPEN_EQ_IDS = OPEN_EQ_IDS;

/**
 * Legacy IL-NNN → paper Issue Ledger C/M/m (and optional EQ-OPEN stress).
 * Incomplete aliases are still listed so reviewers see the naming drift explicitly.
 * @type {readonly Readonly<{
 *   il_id: string,
 *   ledger_ids: readonly string[],
 *   title: string,
 *   eq_open_ids: readonly string[],
 * }>[]}
 */
export const LEGACY_IL_TO_LEDGER = Object.freeze([
  {
    il_id: 'IL-001',
    ledger_ids: Object.freeze(['M2']),
    title: 'Casimir magnitude',
    eq_open_ids: Object.freeze([]),
  },
  {
    il_id: 'IL-002',
    ledger_ids: Object.freeze(['C4']),
    title: 'Tunneling enhancement band',
    eq_open_ids: Object.freeze(['EQ-OPEN-RATE-01']),
  },
  {
    il_id: 'IL-003',
    ledger_ids: Object.freeze(['C2']),
    title: 'Overlap probability / nuclear radius',
    eq_open_ids: Object.freeze([]),
  },
  {
    il_id: 'IL-004',
    ledger_ids: Object.freeze(['C1', 'M6']),
    title: 'Thomas–Fermi screening',
    eq_open_ids: Object.freeze([]),
  },
  {
    il_id: 'IL-005',
    ledger_ids: Object.freeze(['C5', 'M3']),
    title: 'QED vacuum polarization at ~10⁸ V/m',
    eq_open_ids: Object.freeze([]),
  },
  {
    il_id: 'IL-006',
    ledger_ids: Object.freeze(['M8']),
    title: 'Rayleigh–Plesset electric pressure',
    eq_open_ids: Object.freeze([]),
  },
  {
    il_id: 'IL-007',
    ledger_ids: Object.freeze(['C3']),
    title: 'Electron-capture energy / weak σ',
    eq_open_ids: Object.freeze(['EQ-OPEN-EC-01']),
  },
  {
    il_id: 'IL-008',
    ledger_ids: Object.freeze([]),
    title: 'D+D→He-4 γ suppression (obligation)',
    eq_open_ids: Object.freeze(['EQ-OPEN-RAD-01']),
  },
  {
    il_id: 'IL-009',
    ledger_ids: Object.freeze(['C6']),
    title: 'Multi-phonon coherence probability',
    eq_open_ids: Object.freeze(['EQ-OPEN-MEV-01']),
  },
  {
    il_id: 'IL-010',
    ledger_ids: Object.freeze(['M9']),
    title: 'He-4 yield vs heat',
    eq_open_ids: Object.freeze(['EQ-OPEN-YIELD-01']),
  },
  {
    il_id: 'IL-011',
    ledger_ids: Object.freeze(['M1']),
    title: 'BEC critical temperature',
    eq_open_ids: Object.freeze([]),
  },
  {
    il_id: 'IL-012',
    ledger_ids: Object.freeze(['M4']),
    title: 'Coherence length ξ',
    eq_open_ids: Object.freeze([]),
  },
  {
    il_id: 'IL-013',
    ledger_ids: Object.freeze([]),
    title: 'Phonon-nuclear coupling units',
    eq_open_ids: Object.freeze(['EQ-OPEN-MEV-01']),
  },
  {
    il_id: 'IL-014',
    ledger_ids: Object.freeze(['M7']),
    title: 'Bubble collapse temperature',
    eq_open_ids: Object.freeze(['EQ-OPEN-RATE-01']),
  },
  {
    il_id: 'IL-015',
    ledger_ids: Object.freeze(['m6']),
    title: 'Symbol overloading (E, σ, R)',
    eq_open_ids: Object.freeze([]),
  },
  {
    il_id: 'IL-016',
    ledger_ids: Object.freeze(['m4']),
    title: 'Gamow factor / units',
    eq_open_ids: Object.freeze([]),
  },
  {
    il_id: 'IL-017',
    ledger_ids: Object.freeze(['M5']),
    title: 'CM energy budget vs MeV gap',
    eq_open_ids: Object.freeze(['EQ-OPEN-MEV-01', 'EQ-OPEN-EC-01']),
  },
  {
    il_id: 'IL-018',
    ledger_ids: Object.freeze(['M2']),
    title: 'Casimir-induced pressure band',
    eq_open_ids: Object.freeze([]),
  },
]);

/**
 * Paper packets A–E → primary ledger / PRED / EQ-OPEN stresses (theme-level).
 * Checklist item numbers are themes, not auto-closed obligations.
 * @type {readonly Readonly<{
 *   packet_id: string,
 *   title: string,
 *   scope: string,
 *   ledger_ids: readonly string[],
 *   legacy_il_ids: readonly string[],
 *   pred_ids: readonly string[],
 *   eq_open_ids: readonly string[],
 *   note: string,
 * }>[]}
 */
export const PACKET_CROSSWALK_ROWS = Object.freeze([
  {
    packet_id: 'A',
    title: 'Mathematics and Units',
    scope: 'Formulas, constants, SI/Gaussian, symbol disambiguation',
    ledger_ids: Object.freeze(['C1', 'C2', 'C4', 'C6', 'M2', 'M6', 'm4', 'm6']),
    legacy_il_ids: Object.freeze([
      'IL-001',
      'IL-002',
      'IL-003',
      'IL-004',
      'IL-009',
      'IL-015',
      'IL-016',
    ]),
    pred_ids: Object.freeze([]),
    eq_open_ids: Object.freeze([]),
    note: 'Paper math hygiene. Pass criteria ≠ EQ-OPEN discharge.',
  },
  {
    packet_id: 'B',
    title: 'Nuclear Physics and Reaction Channels',
    scope: 'Thresholds, branching, yields, radiation signatures',
    ledger_ids: Object.freeze(['C3', 'M9', 'M10', 'm2']),
    legacy_il_ids: Object.freeze([
      'IL-007',
      'IL-008',
      'IL-010',
      'IL-017',
    ]),
    pred_ids: Object.freeze([
      'PRED-01',
      'PRED-02',
      'PRED-03',
      'PRED-04',
      'PRED-07',
    ]),
    eq_open_ids: Object.freeze([
      'EQ-OPEN-MEV-01',
      'EQ-OPEN-RAD-01',
      'EQ-OPEN-EC-01',
      'EQ-OPEN-YIELD-01',
    ]),
    note: 'Channel energetics + PREDs stress OPEN rows; checklist pass ≠ CLOSED.',
  },
  {
    packet_id: 'C',
    title: 'Condensed Matter Physics',
    scope: 'Screening, coherence, BEC, Rydberg, lattice',
    ledger_ids: Object.freeze(['C1', 'M1', 'M3', 'M4', 'M5', 'C5']),
    legacy_il_ids: Object.freeze([
      'IL-004',
      'IL-005',
      'IL-011',
      'IL-012',
      'IL-013',
      'IL-017',
    ]),
    pred_ids: Object.freeze(['PRED-05', 'PRED-06']),
    eq_open_ids: Object.freeze(['EQ-OPEN-MEV-01', 'EQ-OPEN-RATE-01', 'EQ-OPEN-EC-01']),
    note: 'CM paths remain speculative_exploratory until governed lab evidence.',
  },
  {
    packet_id: 'D',
    title: 'Cavitation and Bubble Physics',
    scope: 'Collapse T/P, RP/KM hydro, detector confounders',
    ledger_ids: Object.freeze(['M7', 'M8', 'm5']),
    legacy_il_ids: Object.freeze(['IL-006', 'IL-014', 'IL-018']),
    pred_ids: Object.freeze(['PRED-02', 'PRED-08', 'PRED-09', 'PRED-10']),
    eq_open_ids: Object.freeze(['EQ-OPEN-RAD-01', 'EQ-OPEN-RATE-01']),
    note: 'Pyyhtiä-class CR-39 cavitation confounders ≠ nuclear-rate proof.',
  },
  {
    packet_id: 'E',
    title: 'Statistics, Uncertainty, and Validation',
    scope: 'σ claims, MC/Sobol, rate-budget arithmetic, reproducibility',
    ledger_ids: Object.freeze(['C4', 'M9']),
    legacy_il_ids: Object.freeze(['IL-002', 'IL-010']),
    pred_ids: Object.freeze(['PRED-01', 'PRED-03', 'PRED-05']),
    eq_open_ids: Object.freeze([
      'EQ-OPEN-RATE-01',
      'EQ-OPEN-YIELD-01',
      'EQ-OPEN-RAD-01',
    ]),
    note: '≥5σ language needs cite-gated MoE; soft analytics chips ≠ discharge.',
  },
]);

/**
 * Static honesty contract for the crosswalk UI.
 */
export const PACKET_CROSSWALK_HONESTY = Object.freeze({
  schema: 'lenr-reviewer-packet-crosswalk-ui-v1',
  lenr_proved: false,
  eq_open_status: 'OPEN',
  open_ids: CROSSWALK_OPEN_EQ_IDS,
  open_status: Object.freeze(
    Object.fromEntries(CROSSWALK_OPEN_EQ_IDS.map((id) => [id, 'OPEN'])),
  ),
  claim_tier: 'speculative_exploratory',
  raises_claim_tier: false,
  discharges_eq_open: false,
  paper_fixed_ne_eq_open_discharge: true,
  mapping_is_navigation_only: true,
  disclaimer:
    'Crosswalk is a navigation aid. Paper Issue Ledger FIXED/ADDRESSED means a section ' +
    'exists — not that EQ-OPEN-* is discharged. Legacy IL-001…018 aliases map to C/M/m; ' +
    'PRED rows are falsifiers. Completing Packet A–E never sets lenr_proved or closes OPEN.',
  docs_issue_ledger: '/docs/issue-ledger',
  docs_testable_predictions: '/docs/testable-predictions',
  docs_reviewer_packets: '/docs/reviewer-packets',
  docs_eq_open_runway: '/docs/eq-open-closure-runway',
  docs_researcher_review_pack: '/docs/researcher-review-pack',
  legacy_framework_ledger_path: 'docs/LENR_FRAMEWORK_ISSUE_LEDGER.md',
  served_issue_ledger_path: 'LENR_SIM_APP_v2/backend/app/served_docs/ISSUE_LEDGER.md',
});

/** Assert honesty locks at module load (mirrors science-evidence pattern). */
export function assertPacketCrosswalkHonesty() {
  if (PACKET_CROSSWALK_HONESTY.lenr_proved !== false) {
    throw new Error('Packet crosswalk must keep lenr_proved false');
  }
  if (PACKET_CROSSWALK_HONESTY.eq_open_status !== 'OPEN') {
    throw new Error('Packet crosswalk must keep eq_open_status OPEN');
  }
  if (PACKET_CROSSWALK_HONESTY.raises_claim_tier !== false) {
    throw new Error('Packet crosswalk must not raise claim tiers');
  }
  if (PACKET_CROSSWALK_HONESTY.discharges_eq_open !== false) {
    throw new Error('Packet crosswalk must not discharge EQ-OPEN');
  }
  if (PACKET_CROSSWALK_HONESTY.paper_fixed_ne_eq_open_discharge !== true) {
    throw new Error('Packet crosswalk must keep paper FIXED ≠ EQ-OPEN discharge');
  }
  for (const id of CROSSWALK_OPEN_EQ_IDS) {
    if (PACKET_CROSSWALK_HONESTY.open_status[id] !== 'OPEN') {
      throw new Error(`Packet crosswalk must keep ${id} OPEN`);
    }
  }
  if (!Array.isArray(PACKET_CROSSWALK_ROWS) || PACKET_CROSSWALK_ROWS.length !== 5) {
    throw new Error('Packet crosswalk must list packets A–E (5 rows)');
  }
  if (!Array.isArray(LEGACY_IL_TO_LEDGER) || LEGACY_IL_TO_LEDGER.length !== 18) {
    throw new Error('Packet crosswalk must list IL-001…018 aliases (18)');
  }
  for (const row of PACKET_CROSSWALK_ROWS) {
    for (const oid of row.eq_open_ids) {
      if (!CROSSWALK_OPEN_EQ_IDS.includes(oid)) {
        throw new Error(`Packet ${row.packet_id} unknown EQ-OPEN ${oid}`);
      }
    }
  }
  for (const row of LEGACY_IL_TO_LEDGER) {
    for (const oid of row.eq_open_ids) {
      if (!CROSSWALK_OPEN_EQ_IDS.includes(oid)) {
        throw new Error(`Legacy ${row.il_id} unknown EQ-OPEN ${oid}`);
      }
    }
  }
}

assertPacketCrosswalkHonesty();
