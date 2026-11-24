import React from 'react';
import { render, screen } from '../../tests/test-utils';
import FidelityLegendSplit from './FidelityLegendSplit';

describe('FidelityLegendSplit (VIZ-04)', () => {
  test('renders Schematic vs Indirect fidelity groups (empty Quantitative omitted)', () => {
    render(<FidelityLegendSplit />);
    expect(screen.getByTestId('fidelity-legend-split')).toBeInTheDocument();
    // No quantitative overlays remain after MHD/Casimir → schematic honesty (#506).
    expect(screen.queryByTestId('fidelity-legend-chip-quantitative')).not.toBeInTheDocument();
    expect(screen.getByTestId('fidelity-legend-chip-schematic')).toHaveTextContent(
      /Schematic · illustrative/,
    );
    expect(screen.getByTestId('fidelity-legend-row-bubble_mhd_confinement')).toHaveAttribute(
      'data-fidelity',
      'schematic',
    );
    expect(screen.getByTestId('fidelity-legend-row-casimir_confinement')).toHaveAttribute(
      'data-fidelity',
      'schematic',
    );
    expect(screen.getByTestId('fidelity-legend-row-rydberg_orbitals')).toBeInTheDocument();
    expect(screen.getByTestId('fidelity-legend-chip-indirect')).toHaveTextContent(
      /Indirect · via other channels/,
    );
  });
});
