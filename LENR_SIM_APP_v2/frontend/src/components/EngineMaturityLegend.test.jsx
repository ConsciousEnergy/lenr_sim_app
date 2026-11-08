import React from 'react';
import { render, screen } from '../tests/test-utils';
import EngineMaturityLegend from './EngineMaturityLegend';

describe('EngineMaturityLegend', () => {
  it('renders Beta / Approximate / Aspirational claim-tier rows', () => {
    render(<EngineMaturityLegend />);
    expect(screen.getByTestId('engine-maturity-legend')).toBeInTheDocument();
    expect(screen.getByTestId('engine-maturity-legend-beta')).toHaveTextContent(/Beta/i);
    expect(screen.getByTestId('engine-maturity-legend-approximate')).toHaveTextContent(
      /Approximate/i,
    );
    expect(screen.getByTestId('engine-maturity-legend-aspirational')).toHaveTextContent(
      /Aspirational/i,
    );
    expect(screen.getByText(/WKB \/ Gamow/i)).toBeInTheDocument();
    expect(screen.getByText(/Rayleigh–Plesset \/ Keller–Miksis/i)).toBeInTheDocument();
    expect(screen.getByText(/not deployed/i)).toBeInTheDocument();
    expect(screen.getByText(/Poisson–Schrödinger/i)).toBeInTheDocument();
  });
});
