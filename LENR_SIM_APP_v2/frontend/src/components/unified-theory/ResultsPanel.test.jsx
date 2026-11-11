/**
 * ResultsPanel — collapse hydro is labelled as modelled / contested, not nuclear proof.
 */
import React from 'react';
import { render, screen } from '../../tests/test-utils';
import ResultsPanel from './ResultsPanel';

const SIM = {
  collapse_results: {
    min_radius_um: 0.5,
    max_temperature_k: 5000,
    max_pressure_bar: 1000,
    compression_ratio: 10,
  },
};

describe('ResultsPanel epistemic posture', () => {
  test('labels collapse outputs as modelled / contested hydro', () => {
    render(<ResultsPanel simulationData={SIM} parameters={{}} onOpenGlossary={() => {}} />);
    expect(screen.getByTestId('collapse-hydro-chip')).toHaveTextContent('Modelled / Contested Hydro');
    expect(
      screen.getByText(/Hydrodynamic collapse outputs are modelled enhancement \/ contested hydro — not nuclear-rate/i),
    ).toBeInTheDocument();
  });

  test('frames the force-regime narrative as an exploratory model', () => {
    render(<ResultsPanel simulationData={SIM} parameters={{}} onOpenGlossary={() => {}} />);
    const note = screen.getByTestId('results-exploratory-model-note');
    expect(note).toHaveTextContent(/exploratory model/);
    expect(note).toHaveTextContent(/not proof of nuclear rates/);
    expect(note).toHaveTextContent(/lenr_proved stays false/);
  });
});
