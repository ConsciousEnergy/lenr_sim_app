/**
 * History chips honesty: analytics_gates_clear ≠ ≥5σ met; analytics flag only when eligible.
 */
import React from 'react';
import { fireEvent, render, screen } from '../../tests/test-utils';
import ExperimentHonestClosureChips from './ExperimentHonestClosureChips';

describe('ExperimentHonestClosureChips', () => {
  test('shows analytics_gates_clear and never ≥5σ gap: met wording', () => {
    render(
      <ExperimentHonestClosureChips
        experiment={{
          discovery_grade_eligible: false,
          discovery_grade_gap: { overall_status: 'met', missing_ids: [], lenr_proved: false },
          honest_closure: {
            overall_status: 'not_met',
            missing_ids: ['eq_open_discharge'],
            missing_requirements: [
              { id: 'eq_open_discharge', label: 'EQ-OPEN discharge', status: 'not_met' },
            ],
            lenr_proved: false,
          },
        }}
        testIdPrefix="chip-test"
      />,
    );
    expect(screen.getByTestId('chip-test-discovery')).toHaveTextContent(
      /analytics gates:\s*analytics_gates_clear/i,
    );
    expect(screen.getByTestId('chip-test-discovery')).not.toHaveTextContent(/≥5σ gap:\s*met/i);
    expect(screen.getByTestId('chip-test-closure')).toHaveTextContent(/closure:\s*not_met/i);
    expect(screen.queryByTestId('chip-test-analytics-flag')).not.toBeInTheDocument();
  });

  test('surfaces Miles why-not-discovery reasons for exploratory EMP rows', async () => {
    render(
      <ExperimentHonestClosureChips
        experiment={{
          literature_id: 'miles-1993',
          discovery_grade_eligible: false,
          discovery_grade_gap: { overall_status: 'not_met', missing_ids: [], lenr_proved: false },
          honest_closure: {
            overall_status: 'not_met',
            missing_ids: ['moe_pairing_verified'],
            missing_requirements: [
              { id: 'moe_pairing_verified', label: 'pairing', status: 'not_met' },
            ],
            lenr_proved: false,
          },
          quantitative_distance: {
            distance_status: 'at_or_above_bar_gates_blocked',
            s_heat: 26,
            moe_provenance: 'literature_reported_instrument_precision',
            arithmetic_sigma_shortfall: 0,
            discovery_grade_eligible: false,
            lenr_proved: false,
          },
        }}
        testIdPrefix="miles-why"
      />,
    );
    fireEvent.click(screen.getByTestId('miles-why-discovery'));
    expect(await screen.findByTestId('miles-why-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('miles-why-exploratory-banner')).toHaveTextContent(
      /analytics_gates_clear/i,
    );
    expect(screen.getByTestId('miles-why-why-not-title')).toHaveTextContent(/miles-1993/i);
    expect(screen.getByTestId('miles-why-why-not-honesty')).toHaveTextContent(
      /not discovery|exploratory/i,
    );
    expect(screen.getByTestId('miles-why-why-not-list')).toHaveTextContent(
      /instrument_precision|pairing/i,
    );
    expect(screen.getByTestId('miles-why-why-not-honesty')).toHaveTextContent(
      /≠ EQ-OPEN|lenr_proved/i,
    );
  });

  test('shows analytics flag only chip whenever discovery_grade_eligible', () => {
    render(
      <ExperimentHonestClosureChips
        experiment={{
          discovery_grade_eligible: true,
          discovery_grade_gap: { overall_status: 'met', missing_ids: [], lenr_proved: false },
          honest_closure: {
            overall_status: 'not_met',
            missing_ids: ['eq_open_discharge'],
            missing_requirements: [
              { id: 'eq_open_discharge', label: 'EQ-OPEN discharge', status: 'not_met' },
            ],
            lenr_proved: false,
          },
          quantitative_distance: {
            distance_status: 'at_or_above_bar_gates_clear',
            s_heat: 13.75,
            moe_provenance: 'literature_reported',
            arithmetic_sigma_shortfall: 0,
            lenr_proved: false,
          },
        }}
        testIdPrefix="kasagi-like"
      />,
    );
    const flag = screen.getByTestId('kasagi-like-analytics-flag');
    expect(flag).toHaveTextContent(/analytics flag only/i);
    expect(flag).toHaveAttribute(
      'title',
      expect.stringMatching(/does not set lenr_proved|does not.*EQ-OPEN/i),
    );
    expect(screen.getByTestId('kasagi-like-discovery')).toHaveTextContent(
      /analytics_gates_clear/i,
    );
  });
});
