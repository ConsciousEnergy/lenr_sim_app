/**
 * PhysicsContext persistence
 *
 * theoryResult was in-memory only while simulationResult persisted to
 * sessionStorage. A reload therefore emptied the Theory Summary tab while the
 * simulation-backed tabs stayed populated, which is what made the Advanced
 * Analysis -> Theory Testbed round trip look broken.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import { PhysicsProvider, usePhysics } from './PhysicsContext';

const THEORY_RESULT = {
  combined_enhancement: 4321,
  total_energy_watts: 1.5,
  per_theory: [
    { theory_id: 'electron_screening', theory_name: 'Electron Screening', observables: {} },
  ],
};

const SIMULATION_RESULT = { collapse_results: { min_radius_um: 0.01 } };

function Probe() {
  const { theoryResult, setTheoryResult, simulationResult, setSimulationResult } = usePhysics();
  return (
    <div>
      <span data-testid="theory">{theoryResult ? 'theory-present' : 'theory-absent'}</span>
      <span data-testid="simulation">
        {simulationResult ? 'simulation-present' : 'simulation-absent'}
      </span>
      <button type="button" onClick={() => setTheoryResult(THEORY_RESULT)}>
        set theory
      </button>
      <button type="button" onClick={() => setTheoryResult(null)}>
        clear theory
      </button>
      <button type="button" onClick={() => setSimulationResult(SIMULATION_RESULT)}>
        set simulation
      </button>
    </div>
  );
}

const renderProbe = () => render(
  <PhysicsProvider>
    <Probe />
  </PhysicsProvider>,
);

describe('PhysicsContext theoryResult persistence', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('writes theoryResult to sessionStorage', () => {
    renderProbe();
    act(() => {
      screen.getByText('set theory').click();
    });
    expect(sessionStorage.getItem('lenr_theoryResult')).toContain('electron_screening');
  });

  it('rehydrates theoryResult on remount, so a reload keeps Theory Summary populated', () => {
    const first = renderProbe();
    act(() => {
      screen.getByText('set theory').click();
    });
    expect(screen.getByTestId('theory')).toHaveTextContent('theory-present');
    first.unmount();

    renderProbe();
    expect(screen.getByTestId('theory')).toHaveTextContent('theory-present');
  });

  it('clears the persisted value when theoryResult is reset', () => {
    renderProbe();
    act(() => {
      screen.getByText('set theory').click();
    });
    act(() => {
      screen.getByText('clear theory').click();
    });
    expect(sessionStorage.getItem('lenr_theoryResult')).toBeNull();
    expect(screen.getByTestId('theory')).toHaveTextContent('theory-absent');
  });

  it('keeps the two data sources in separate keys', () => {
    renderProbe();
    act(() => {
      screen.getByText('set simulation').click();
    });
    expect(sessionStorage.getItem('lenr_simulationResult')).toBeTruthy();
    expect(sessionStorage.getItem('lenr_theoryResult')).toBeNull();
  });

  it('starts empty when storage holds malformed JSON', () => {
    sessionStorage.setItem('lenr_theoryResult', '{not json');
    renderProbe();
    expect(screen.getByTestId('theory')).toHaveTextContent('theory-absent');
  });
});
