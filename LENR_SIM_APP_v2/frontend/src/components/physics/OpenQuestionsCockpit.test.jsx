/**
 * OpenQuestionsCockpit v2 — when/how rows, Oracle B, no LENR_PROVED.
 */
import React from 'react';
import { render, screen } from '../../tests/test-utils';
import OpenQuestionsCockpit from './OpenQuestionsCockpit';

const TWO_BODY_OQ = {
  schema: 'lenr-open-questions-v1',
  route_mode: 'legacy_unified_model',
  rate_mode: 'two_body',
  occurrence: { anchored: false, emp_gates: [] },
  when: { two_body_reference_log10_n: -40, active_mode_log10_n: -40 },
  how: {
    mechanism_paths: [
      { id: 'trapped_state', posterior: 0.1, lean_ids: ['EQ-NBODY-FGR-01'] },
      { id: 'phonon_cascade', posterior: 0.0, lean_ids: [] },
      { id: 'three_body', posterior: 0.05, lean_ids: [] },
    ],
    active_rate_mode: 'two_body',
    fgr_parameters: { P_occ: null, Gamma_tun: 1e-20 },
  },
  determination: {
    status: 'RATE_BUDGET_DOES_NOT_CLOSE',
    oracle_a: {
      two_body_budget_closes: false,
      lean_theorems: ['EQ-RATE-2B-NC-01', 'EQ-PHONON-N-01'],
    },
    oracle_b: {
      priors_source: 'default_skeptical',
      hypotheses: [
        { id: 'chemical_null', posterior: 0.35, log10_bayes_vs_two_body: 0 },
        { id: 'two_body', posterior: 0.5, log10_bayes_vs_two_body: 0 },
        { id: 'trapped_state', posterior: 0.1, log10_bayes_vs_two_body: 1.2 },
        { id: 'phonon_cascade', posterior: 0.0, log10_bayes_vs_two_body: -1 },
        { id: 'three_body', posterior: 0.05, log10_bayes_vs_two_body: 0.5 },
      ],
    },
    next_measurement: [
      { observable: 'he4', rank: 1, rationale: 'Miles EMP' },
    ],
  },
  q_mev_gap: {
    id: 'EQ-OPEN-MEV-01',
    status: 'OPEN',
    claim_tier: 'speculative_exploratory',
    energy_partition_mev: {
      phonon: 0, gamma: 0, recoil: 0, open_remainder: 23.8, q_total: 23.8,
    },
  },
  q_radiation: { id: 'EQ-OPEN-RAD-01', status: 'OPEN', detector_ul_log10: -8 },
  q_statistical: { id: 'EQ-OPEN-RATE-01', status: 'BUDGET_DOES_NOT_CLOSE', n_events_log10_two_body: -40 },
  q_electron_capture: { id: 'EQ-OPEN-EC-01', status: 'OPEN', dimmed: true },
  q_integrated_yield: { id: 'EQ-OPEN-YIELD-01', status: 'OPEN', dimmed: true },
  composition: {
    not_combinable: true,
    illegal_product: 1e10,
    tsc_enhancement_can_scale_two_body: true,
  },
  emp_chips: [{ id: 'miles_q_band', label: 'Miles 24±4 MeV/He EMP' }],
  lenr_proved: false,
};

const ANCHORED_OQ = {
  ...TWO_BODY_OQ,
  occurrence: { anchored: true, emp_gates: ['miles_q_band'] },
  determination: {
    ...TWO_BODY_OQ.determination,
    status: 'OCCURRENCE_ANCHORED_EMP',
    oracle_b: {
      ...TWO_BODY_OQ.determination.oracle_b,
      priors_source: 'occurrence_anchored',
      occurrence_anchored: true,
    },
  },
};

describe('OpenQuestionsCockpit', () => {
  test('prints when/how header and two-body does not close', () => {
    render(<OpenQuestionsCockpit openQuestions={TWO_BODY_OQ} />);
    expect(screen.getByText(/When and how under named conditions/i)).toBeInTheDocument();
    expect(screen.getByText(/Oracle A \/ B status:\s*RATE BUDGET DOES NOT CLOSE/i)).toBeInTheDocument();
    expect(screen.getByTestId('oracle-b-panel')).toBeInTheDocument();
    expect(screen.getByTestId('next-measurement-ivg')).toBeInTheDocument();
    expect(screen.queryByText('LENR_PROVED', { exact: true })).not.toBeInTheDocument();
  });

  test('shows occurrence anchored chip', () => {
    render(<OpenQuestionsCockpit openQuestions={ANCHORED_OQ} />);
    expect(screen.getByTestId('occurrence-anchored-chip')).toBeInTheDocument();
    expect(screen.getByText(/Miles-band heat–He anchors occurrence/i)).toBeInTheDocument();
  });

  test('local_fallback is INCONCLUSIVE without EMP chips', () => {
    render(
      <OpenQuestionsCockpit
        simulationData={{ validation: { route_mode: 'local_fallback' } }}
      />,
    );
    expect(screen.getByText(/Oracle A \/ B status:\s*INCONCLUSIVE/i)).toBeInTheDocument();
    expect(screen.queryByText(/Miles 24/)).not.toBeInTheDocument();
  });
});
