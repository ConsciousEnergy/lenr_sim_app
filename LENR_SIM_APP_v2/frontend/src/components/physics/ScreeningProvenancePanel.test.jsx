import React from 'react';
import { render, screen } from '@testing-library/react';
import ScreeningProvenancePanel from './ScreeningProvenancePanel';

const SAMPLE_SCREENING = {
  model: 'assenbaum_rolfs_screened',
  screening_potential_ev: 800,
  screening_potential_range_ev: [250, 18000],
  thermal_energy_ev: 0.049,
  sommerfeld_parameter: 12.4,
  log10_enhancement_raw: 7.2,
  is_saturated: true,
  exceeds_adiabatic_limit: true,
  citations: ['Assenbaum, Langanke & Rolfs (1987)'],
};

describe('ScreeningProvenancePanel', () => {
  it('renders U_e and log10 raw', () => {
    render(<ScreeningProvenancePanel screening={SAMPLE_SCREENING} />);
    expect(screen.getByTestId('screening-provenance-panel')).toBeInTheDocument();
    expect(screen.getByText(/800/)).toBeInTheDocument();
    expect(screen.getByText(/7\.20/)).toBeInTheDocument();
    expect(screen.getByText(/SATURATED AT CEILING/)).toBeInTheDocument();
  });

  it('returns null when screening is absent', () => {
    const { container } = render(<ScreeningProvenancePanel screening={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
