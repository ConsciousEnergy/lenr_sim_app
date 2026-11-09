import React from 'react';
import { render, screen } from '@testing-library/react';
import ScreeningProvenancePanel from './ScreeningProvenancePanel';

const SAMPLE_SCREENING = {
  model: 'assenbaum_rolfs_gamow_cited_range_v1',
  screening_potential_ev: 800,
  screening_potential_range_ev: [250, 18000],
  thermal_energy_ev: 0.049,
  sommerfeld_parameter: 12.4,
  log10_enhancement_raw: 7.2,
  is_saturated: true,
  assenbaum_applicable: false,
  formula_claimed: false,
  domain_equation_id: 'EQ-ASSEN-DOM-01',
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

  it('surfaces Assenbaum domain not-claimed separately from adiabatic floor', () => {
    render(<ScreeningProvenancePanel screening={SAMPLE_SCREENING} />);
    expect(screen.getByTestId('assenbaum-domain-alert')).toHaveTextContent(
      /formula not claimed/i,
    );
    expect(screen.getByTestId('assenbaum-domain-alert')).toHaveTextContent(
      /EQ-ASSEN-DOM-01/,
    );
    expect(screen.getByTestId('adiabatic-limit-alert')).toHaveTextContent(
      /adiabatic gas-target floor/i,
    );
    expect(screen.getByTestId('adiabatic-limit-alert')).toHaveTextContent(
      /separate from Assenbaum/i,
    );
    // Must not conflate adiabatic exceedance with Salpeter / Uₑ ≫ E wording.
    expect(screen.queryByText(/Salpeter/i)).not.toBeInTheDocument();
  });

  it('marks applicable Assenbaum domain when U_e < E', () => {
    render(
      <ScreeningProvenancePanel
        screening={{
          ...SAMPLE_SCREENING,
          screening_potential_ev: 20,
          thermal_energy_ev: 100,
          assenbaum_applicable: true,
          formula_claimed: true,
          exceeds_adiabatic_limit: false,
          is_saturated: false,
        }}
      />,
    );
    expect(screen.getByTestId('assenbaum-domain-chip')).toHaveTextContent(/applicable/i);
    expect(screen.queryByTestId('assenbaum-domain-alert')).not.toBeInTheDocument();
    expect(screen.queryByTestId('adiabatic-limit-alert')).not.toBeInTheDocument();
  });

  it('returns null when screening is absent', () => {
    const { container } = render(<ScreeningProvenancePanel screening={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
