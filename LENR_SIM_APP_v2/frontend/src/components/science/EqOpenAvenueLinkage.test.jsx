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
});
