/**
 * OpenQuestionsCockpit — determination alphabet, no LENR_PROVED, fallback safety.
 */
import React from 'react';
import { render, screen } from '../../tests/test-utils';
import OpenQuestionsCockpit from './OpenQuestionsCockpit';

const TWO_BODY_OQ = {
  schema: 'lenr-open-questions-v1',
  route_mode: 'legacy_unified_model',
  rate_mode: 'two_body',
  determination: {
    status: 'RATE_BUDGET_DOES_NOT_CLOSE',
    oracle_a: {
      two_body_budget_closes: false,
      lean_theorems: ['EQ-RATE-2B-NC-01', 'EQ-PHONON-N-01'],
    },
  },
  q_mev_gap: {
    id: 'EQ-OPEN-MEV-01',
    status: 'OPEN',
    claim_tier: 'speculative_exploratory',
    lean_theorems: ['EQ-PHONON-N-01'],
    energy_partition_mev: {
      phonon: 0, gamma: 0, recoil: 0, open_remainder: 23.8, q_total: 23.8,
    },
  },
  q_radiation: { id: 'EQ-OPEN-RAD-01', status: 'OPEN' },
  q_statistical: { id: 'EQ-OPEN-RATE-01', status: 'BUDGET_DOES_NOT_CLOSE', n_events_log10_two_body: -40 },
  q_electron_capture: { id: 'EQ-OPEN-EC-01', status: 'OPEN', dimmed: true },
  q_integrated_yield: { id: 'EQ-OPEN-YIELD-01', status: 'OPEN', dimmed: true },
  composition: {
    not_combinable: true,
    illegal_product: 1e10,
    illegal_product_label: 'not physical',
    tsc_enhancement_can_scale_two_body: true,
  },
  emp_chips: [{ id: 'miles_q_band', label: 'Miles 24±4 MeV/He EMP' }],
  lenr_proved: false,
  open_ids: ['EQ-OPEN-MEV-01', 'EQ-OPEN-RAD-01', 'EQ-OPEN-RATE-01'],
};

describe('OpenQuestionsCockpit', () => {
  test('prints two-body does not close as a determination', () => {
    render(<OpenQuestionsCockpit openQuestions={TWO_BODY_OQ} />);
    expect(screen.getByText(/RATE BUDGET DOES NOT CLOSE/i)).toBeInTheDocument();
    expect(screen.getByText(/Two-body rate budget does not close/i)).toBeInTheDocument();
    expect(screen.getByText('EQ-RATE-2B-NC-01')).toBeInTheDocument();
    expect(screen.getByText('EQ-OPEN-MEV-01')).toBeInTheDocument();
    expect(screen.getByText('Q4 Electron capture')).toBeInTheDocument();
    expect(screen.getByText('Q5 Integrated yield')).toBeInTheDocument();
    expect(screen.queryByText('LENR_PROVED')).not.toBeInTheDocument();
  });

  test('strikes through illegal product and warns on TSC leak', () => {
    render(<OpenQuestionsCockpit openQuestions={TWO_BODY_OQ} />);
    expect(screen.getByText(/illegal product/i)).toBeInTheDocument();
    expect(screen.getByText(/not trapped_state/i)).toBeInTheDocument();
  });

  test('local_fallback is INCONCLUSIVE without EMP chips', () => {
    render(
      <OpenQuestionsCockpit
        simulationData={{ validation: { route_mode: 'local_fallback' } }}
      />,
    );
    expect(screen.getByText(/INCONCLUSIVE/i)).toBeInTheDocument();
    expect(screen.queryByText(/Miles 24/)).not.toBeInTheDocument();
    expect(screen.queryByText('LENR_PROVED')).not.toBeInTheDocument();
  });
});
