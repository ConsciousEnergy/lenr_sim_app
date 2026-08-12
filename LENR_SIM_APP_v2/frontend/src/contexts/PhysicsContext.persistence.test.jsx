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
  const {
    theoryResult,
    setTheoryResult,
    simulationResult,
    setSimulationResult,
    enabledTheories,
    setEnabledTheories,
    theoryConfigs,
    setTheoryConfigs,
  } = usePhysics();
  return (
    <div>
      <span data-testid="theory">{theoryResult ? 'theory-present' : 'theory-absent'}</span>
      <span data-testid="simulation">
        {simulationResult ? 'simulation-present' : 'simulation-absent'}
      </span>
      <span data-testid="enabled">{enabledTheories.join(',') || 'none'}</span>
      <span data-testid="configs">{JSON.stringify(theoryConfigs)}</span>
      <button type="button" onClick={() => setTheoryResult(THEORY_RESULT)}>
        set theory
      </button>
      <button type="button" onClick={() => setTheoryResult(null)}>
        clear theory
      </button>
      <button type="button" onClick={() => setSimulationResult(SIMULATION_RESULT)}>
        set simulation
      </button>
      <button type="button" onClick={() => setEnabledTheories(['takahashi_tsc', 'kim_bec'])}>
        set enabled
      </button>
      <button type="button" onClick={() => setEnabledTheories([])}>
        clear enabled
      </button>
      <button
        type="button"
        onClick={() => setTheoryConfigs({ kim_bec: { grain_size_nm: 12 } })}
      >
        set configs
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

describe('PhysicsContext theory selection persistence', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('persists the enabled theory selection so the dashboard choice reaches the testbed', () => {
    const first = renderProbe();
    act(() => {
      screen.getByText('set enabled').click();
    });
    expect(sessionStorage.getItem('lenr_enabledTheories')).toContain('takahashi_tsc');
    first.unmount();

    renderProbe();
    expect(screen.getByTestId('enabled')).toHaveTextContent('takahashi_tsc,kim_bec');
  });

  it('clears the stored key when the selection is emptied', () => {
    renderProbe();
    act(() => {
      screen.getByText('set enabled').click();
    });
    act(() => {
      screen.getByText('clear enabled').click();
    });
    expect(sessionStorage.getItem('lenr_enabledTheories')).toBeNull();
    expect(screen.getByTestId('enabled')).toHaveTextContent('none');
  });

  it('persists per-theory parameter overrides', () => {
    const first = renderProbe();
    act(() => {
      screen.getByText('set configs').click();
    });
    expect(sessionStorage.getItem('lenr_theoryConfigs')).toContain('grain_size_nm');
    first.unmount();

    renderProbe();
    expect(screen.getByTestId('configs')).toHaveTextContent('grain_size_nm');
  });
});
