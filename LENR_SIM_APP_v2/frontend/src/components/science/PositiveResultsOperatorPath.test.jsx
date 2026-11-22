import React from 'react';
import { render, screen } from '../../tests/test-utils';
import PositiveResultsOperatorPath from './PositiveResultsOperatorPath';
import { POSITIVE_RESULTS_OPERATOR_PATH } from '../../config/unifiedTheoryScienceEvidence';

describe('PositiveResultsOperatorPath', () => {
  test('lists governed heat+He / calorimetry / γ UL steps without inventing σ_Q', () => {
    render(<PositiveResultsOperatorPath testIdPrefix="pr" />);
    expect(screen.getByTestId('pr-refuse-chip')).toBeInTheDocument();
    expect(screen.getByTestId('pr-closes-false')).toHaveTextContent(/closes_eq_open: false/);
    expect(screen.getByTestId('pr-lenr-proved-false')).toHaveTextContent(/lenr_proved: false/);
    POSITIVE_RESULTS_OPERATOR_PATH.steps.forEach((step) => {
      expect(screen.getByTestId(`pr-step-${step.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`pr-do-not-${step.id}`)).toBeInTheDocument();
    });
    expect(screen.getByTestId('pr-do-not-heat_he_governed')).toHaveTextContent(
      /Do not invent σ_Q/i,
    );
  });
});
