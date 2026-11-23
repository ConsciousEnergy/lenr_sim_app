import React from 'react';
import { render, screen } from '../../tests/test-utils';
import FidelityLegendSplit from './FidelityLegendSplit';

describe('FidelityLegendSplit (VIZ-04)', () => {
  test('renders Quantitative vs Schematic fidelity groups', () => {
    render(<FidelityLegendSplit />);
    expect(screen.getByTestId('fidelity-legend-split')).toBeInTheDocument();
    expect(screen.getByTestId('fidelity-legend-chip-quantitative')).toHaveTextContent(
      /Quantitative · from solver/,
    );
    expect(screen.getByTestId('fidelity-legend-chip-schematic')).toHaveTextContent(
      /Schematic · illustrative/,
    );
    expect(screen.getByTestId('fidelity-legend-row-bubble_mhd_confinement')).toBeInTheDocument();
    expect(screen.getByTestId('fidelity-legend-row-rydberg_orbitals')).toBeInTheDocument();
  });
});
