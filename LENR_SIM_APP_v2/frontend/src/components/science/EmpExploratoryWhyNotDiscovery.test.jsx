/**
 * EMP exploratory “why not discovery” panel honesty (BDS-343).
 */
import React from 'react';
import { render, screen } from '../../tests/test-utils';
import EmpExploratoryWhyNotDiscovery from './EmpExploratoryWhyNotDiscovery';

describe('EmpExploratoryWhyNotDiscovery', () => {
  test('surfaces 2/25 coverage and Miles exploratory reasons without ≥5σ met', () => {
    render(<EmpExploratoryWhyNotDiscovery testIdPrefix="emp-test" />);
    expect(screen.getByTestId('emp-test-panel')).toBeInTheDocument();
    expect(screen.getByTestId('emp-test-pairing-chip')).toHaveTextContent(/2\/25/);
    expect(screen.getByTestId('emp-test-eligible-chip')).toHaveTextContent(/2\/25/);
    expect(screen.getByTestId('emp-test-inventory-chip')).toHaveTextContent(
      /inventory exhausted/i,
    );
    expect(screen.getByTestId('emp-test-inventory-note')).toHaveTextContent(
      /analytics_gates_clear/i,
    );
    expect(screen.getByTestId('emp-test-coverage')).toHaveTextContent(
      /analytics_eligible ≠ EQ-OPEN/i,
    );
    expect(screen.getByTestId('emp-test-row-miles-1993')).toHaveTextContent(/Miles/i);
    expect(screen.getByTestId('emp-test-distance-miles-1993')).toHaveTextContent(
      /at_or_above_bar_gates_blocked/,
    );
    expect(screen.getByTestId('emp-test-honesty-miles-1993')).toHaveTextContent(
      /not discovery/i,
    );
    expect(screen.getByTestId('emp-test-panel')).not.toHaveTextContent(/≥5σ gap:\s*met/i);
    expect(screen.getByTestId('emp-test-panel')).not.toHaveTextContent(/lenr_proved:\s*true/i);
  });
});
