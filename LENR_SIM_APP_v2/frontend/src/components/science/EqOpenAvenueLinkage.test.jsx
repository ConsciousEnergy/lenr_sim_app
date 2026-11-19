/**
 * EqOpenAvenueLinkage — Affirmative / Falsification / Does-not-count stay OPEN.
 */
import React from 'react';
import { render, screen } from '../../tests/test-utils';
import { OPEN_EQ_IDS } from '../../config/unifiedTheoryScienceEvidence';
import EqOpenAvenueLinkage from './EqOpenAvenueLinkage';

describe('EqOpenAvenueLinkage', () => {
  test('inlines Affirmative / Falsification / Does-not-count for every OPEN id', () => {
    render(<EqOpenAvenueLinkage testIdPrefix="link-test" density="compact" />);

    expect(screen.getByTestId('link-test-status-open')).toHaveTextContent(/OPEN/i);
    expect(screen.getByTestId('link-test-criteria-not-met')).toHaveTextContent(
      /criteria documented/i,
    );
    expect(screen.getByTestId('link-test-runway-doc')).toHaveAttribute(
      'href',
      '/docs/eq-open-closure-runway',
    );
    expect(screen.getByTestId('link-test-reviewer-packets')).toHaveAttribute(
      'href',
      '/docs/reviewer-packets',
    );
    expect(screen.getByTestId('link-test-testable-predictions')).toHaveAttribute(
      'href',
      '/docs/testable-predictions',
    );

    OPEN_EQ_IDS.forEach((id) => {
      expect(screen.getByTestId(`link-test-open-${id}`)).toHaveTextContent(/OPEN/i);
      expect(screen.getByTestId(`link-test-affirmative-${id}`)).toHaveTextContent(
        /Affirmative:/i,
      );
      expect(screen.getByTestId(`link-test-falsification-${id}`)).toHaveTextContent(
        /Falsification:/i,
      );
      expect(screen.getByTestId(`link-test-does-not-count-${id}`)).toHaveTextContent(
        /Does not count:/i,
      );
    });

    expect(screen.queryByText(/EQ-OPEN-.*:\s*CLOSED/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/lenr_proved:\s*true/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/≥5σ met/i)).not.toBeInTheDocument();
  });

  test('full density surfaces blocked_awaiting_lab + DAQ provenance without discharge', () => {
    render(<EqOpenAvenueLinkage testIdPrefix="link-full" density="full" />);

    expect(
      screen.getByTestId(
        'link-full-lab-status-EQ-OPEN-YIELD-01-governed_heat_he_cite_gated_moe',
      ),
    ).toHaveTextContent(/blocked_awaiting_lab/);
    expect(
      screen.getByTestId(
        'link-full-lab-daq-EQ-OPEN-YIELD-01-governed_heat_he_cite_gated_moe',
      ),
    ).toHaveTextContent(/lenr-ara-daq-sample-v1|excess_power_W|refuse/i);
    expect(
      screen.getByTestId('link-full-lab-daq-EQ-OPEN-EC-01-ec_threshold_cm_path'),
    ).toHaveTextContent(/no sample-v1 observables|Refuse fabricating/i);
    expect(screen.queryByText(/lenr_proved:\s*true/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/EQ-OPEN-.*:\s*CLOSED/i)).not.toBeInTheDocument();
  });
});
