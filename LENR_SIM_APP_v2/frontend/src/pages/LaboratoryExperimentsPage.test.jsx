/**
 * HIP-03 Laboratory Experiments hub honesty + surface tests.
 */
import React from 'react';
import { render, screen } from '../tests/test-utils';
import LaboratoryExperimentsPage from './LaboratoryExperimentsPage';
import { NEXT_LAB_MOE_TARGETS, OPEN_EQ_IDS } from '../config/unifiedTheoryScienceEvidence';

jest.mock('../analytics/events', () => ({
  track: { docsViewed: jest.fn() },
}));

describe('LaboratoryExperimentsPage (HIP-03)', () => {
  test('renders first-class hub with honesty locks', () => {
    render(<LaboratoryExperimentsPage />);
    expect(screen.getByTestId('lab-experiments-page')).toBeInTheDocument();
    expect(screen.getByTestId('lab-experiments-title')).toHaveTextContent(
      /Laboratory Experiments/i,
    );
    const chips = screen.getByTestId('lab-experiments-honesty-chips');
    expect(chips).toHaveTextContent(/lenr_proved: false/i);
    expect(chips).toHaveTextContent(/ask met ≠ discharge/i);
    expect(chips).toHaveTextContent(/refuse fabricated σ_Q/i);
    OPEN_EQ_IDS.forEach((id) => {
      expect(chips).toHaveTextContent(new RegExp(`${id}: OPEN`));
    });
    expect(screen.queryByText(/lenr_proved:\s*true/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/EQ-OPEN-[A-Z]+-01: CLOSED/)).not.toBeInTheDocument();
  });

  test('surfaces NEXT_LAB checklist for all five asks', () => {
    render(<LaboratoryExperimentsPage />);
    expect(screen.getByTestId('lab-hub-next-lab-panel')).toBeInTheDocument();
    NEXT_LAB_MOE_TARGETS.forEach((row) => {
      expect(screen.getByTestId(`lab-hub-next-lab-row-${row.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`lab-hub-next-lab-status-${row.id}`)).toHaveTextContent(
        'blocked_awaiting_lab',
      );
      expect(screen.getByTestId(`lab-hub-next-lab-acceptance-${row.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`lab-hub-next-lab-still-open-${row.id}`)).toBeInTheDocument();
    });
  });

  test('includes discharge walkthrough Affirmative / Falsification / Does-not-count', () => {
    render(<LaboratoryExperimentsPage />);
    expect(screen.getByTestId('lab-hub-discharge-panel')).toBeInTheDocument();
    expect(screen.getByTestId('lab-hub-discharge-affirmative-EQ-OPEN-YIELD-01')).toHaveTextContent(
      /Affirmative:/i,
    );
    expect(
      screen.getByTestId('lab-hub-discharge-falsification-EQ-OPEN-YIELD-01'),
    ).toHaveTextContent(/Falsification:/i);
    expect(
      screen.getByTestId('lab-hub-discharge-does-not-count-EQ-OPEN-YIELD-01'),
    ).toHaveTextContent(/Does not count:/i);
    expect(screen.getByTestId('lab-hub-discharge-ask-met-still-open')).toBeInTheDocument();
  });

  test('includes positive-results operator path without inventing σ_Q', () => {
    render(<LaboratoryExperimentsPage />);
    expect(screen.getByTestId('lab-hub-positive-panel')).toBeInTheDocument();
    expect(screen.getByTestId('lab-hub-positive-refuse-chip')).toBeInTheDocument();
    expect(screen.getByTestId('lab-hub-positive-step-heat_he_governed')).toBeInTheDocument();
    expect(
      screen.getByTestId('lab-hub-positive-step-calorimetry_beyond_kasagi'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('lab-hub-positive-step-gamma_ul_efficiency')).toBeInTheDocument();
    expect(screen.getByTestId('lab-hub-positive-do-not-heat_he_governed')).toHaveTextContent(
      /Do not invent σ_Q/i,
    );
  });

  test('cross-links Virtual Lab, Analytics, and runway', () => {
    render(<LaboratoryExperimentsPage />);
    expect(screen.getByTestId('lab-experiments-virtual-lab-link')).toHaveAttribute(
      'href',
      '/unified-theory?tab=results',
    );
    expect(screen.getByTestId('lab-experiments-analytics-link')).toHaveAttribute(
      'href',
      '/analytics',
    );
    expect(screen.getByTestId('lab-experiments-runway-link')).toHaveAttribute(
      'href',
      '/docs/eq-open-closure-runway',
    );
  });
});
