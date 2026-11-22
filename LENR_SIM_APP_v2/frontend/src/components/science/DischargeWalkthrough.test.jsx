import React from 'react';
import { render, screen } from '../../tests/test-utils';
import DischargeWalkthrough from './DischargeWalkthrough';
import { OPEN_EQ_IDS } from '../../config/unifiedTheoryScienceEvidence';

describe('DischargeWalkthrough', () => {
  test('walks Affirmative / Falsification / Does-not-count for every OPEN id', () => {
    render(<DischargeWalkthrough testIdPrefix="dw" />);
    expect(screen.getByTestId('dw-status-open')).toHaveTextContent(/OPEN/i);
    expect(screen.getByTestId('dw-ask-met-still-open')).toBeInTheDocument();
    OPEN_EQ_IDS.forEach((id) => {
      expect(screen.getByTestId(`dw-affirmative-${id}`)).toHaveTextContent(/Affirmative:/i);
      expect(screen.getByTestId(`dw-falsification-${id}`)).toHaveTextContent(/Falsification:/i);
      expect(screen.getByTestId(`dw-does-not-count-${id}`)).toHaveTextContent(/Does not count:/i);
    });
  });
});
