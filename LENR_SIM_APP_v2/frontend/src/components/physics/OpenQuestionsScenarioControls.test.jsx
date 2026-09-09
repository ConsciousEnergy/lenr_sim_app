/**
 * OpenQuestionsScenarioControls — pure lookup into the API grids; selection
 * changes the remainder vector text; n_coh above the licensed max is flagged.
 */
import React from 'react';
import { fireEvent, render, screen } from '../../tests/test-utils';
import OpenQuestionsScenarioControls, {
  lookupClosureCell,
  lookupCouplingRow,
} from './OpenQuestionsScenarioControls';
import fixture from '../../../tests/fixtures/open_questions_wh_v2.json';

const WH = fixture.working_hypothesis;

function renderControls(overrides = {}) {
  return render(
    <OpenQuestionsScenarioControls
      q1={WH.q1}
      q2={WH.q2}
      q3={WH.q3}
      dicke={WH.dicke}
      {...overrides}
    />,
  );
}

describe('OpenQuestionsScenarioControls', () => {
  test('renders the header and the cited row by default', () => {
    renderControls();
    expect(screen.getByTestId('wh-scenario-controls')).toBeInTheDocument();
    expect(
      screen.getByText('Scenario explorer (lookup of API grids; not a posterior; EQ-OPEN-* remain OPEN)'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('wh-remainder-q1')).toHaveTextContent(
      /Q1 remainder 23\.8 MeV OPEN · derived 0 MeV for g=0\.0001, n_coh=0 \(cited row\)/,
    );
    expect(screen.queryByTestId('wh-ncoh-unlicensed-chip')).not.toBeInTheDocument();
    expect(screen.getByTestId('wh-remainder-q2')).toHaveTextContent(
      /Q2 log10 P_N = -4\.791e9 at S=1 vs target -11: below target · S_min for target 575400000 · N = 575500000/,
    );
    expect(screen.getByTestId('wh-remainder-q3')).toHaveTextContent(
      /Q3 log10\(R_mode\/R_obs\) = -14\.25 at θ=0\.6, τ=1e-20 s, f_nuc=1e-6: below R_obs · required product 5\.784e26/,
    );
  });

  test('selecting a scenario (g, n_coh) row updates Q1 and flags unlicensed n_coh', () => {
    renderControls();
    fireEvent.change(screen.getByLabelText('g (coupling)'), { target: { value: '0.1' } });
    fireEvent.change(screen.getByLabelText('n_coh'), { target: { value: '100' } });
    expect(screen.getByTestId('wh-remainder-q1')).toHaveTextContent(
      /Q1 remainder 0 MeV OPEN · derived 23\.8 MeV for g=0\.1, n_coh=100 \(scenario row\)/,
    );
    expect(screen.getByTestId('wh-ncoh-unlicensed-chip')).toHaveTextContent(
      'unlicensed by EQ-WH-DICKE-N-01',
    );
  });

  test('a (g, n_coh) pair with no row falls back to the default derived value', () => {
    renderControls();
    fireEvent.change(screen.getByLabelText('g (coupling)'), { target: { value: '0.1' } });
    // g=0.1 only exists with n_coh=100 in the fixture; n_coh stays at 0.
    expect(screen.getByTestId('wh-remainder-q1')).toHaveTextContent(
      /Q1 remainder 23\.8 MeV OPEN · derived 0 MeV for g=0\.1, n_coh=0 \(no row for this pair; default_derived_mev shown\)/,
    );
  });

  test('closure grid cell lookup follows the selected cell and never crosses at C_lin = 1', () => {
    renderControls();
    fireEvent.change(screen.getByLabelText('f_nuc'), { target: { value: '1' } });
    expect(screen.getByTestId('wh-remainder-q3')).toHaveTextContent(
      /= -8\.252 at θ=0\.6, τ=1e-20 s, f_nuc=1: below R_obs/,
    );
    fireEvent.change(screen.getByLabelText('θ (loading)'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('τ (s)'), { target: { value: '1e-12' } });
    expect(screen.getByTestId('wh-remainder-q3')).toHaveTextContent(
      /= -15\.36 at θ=1, τ=1e-12 s, f_nuc=1: below R_obs/,
    );
  });

  test('closure grid reports crossing when a cell is at or above R_obs', () => {
    const crossing = JSON.parse(JSON.stringify(WH));
    crossing.q3.closure_demand.grid.log10_ratio[0][0][0] = 0.9;
    render(
      <OpenQuestionsScenarioControls q1={crossing.q1} q2={crossing.q2} q3={crossing.q3} dicke={crossing.dicke} />,
    );
    expect(screen.getByTestId('wh-remainder-q3')).toHaveTextContent(/= 0\.9 at θ=0\.6, τ=1e-20 s, f_nuc=1e-6: crosses R_obs/);
  });

  test('null R_obs (no excess-power ingest) never reads as 0 or as a crossing', () => {
    const noPower = JSON.parse(JSON.stringify(WH));
    noPower.q3.closure_demand.R_obs_per_m3_s = null;
    noPower.q3.closure_demand.required_product = null;
    noPower.q3.closure_demand.grid.log10_ratio = noPower.q3.closure_demand.grid.log10_ratio.map((a) =>
      a.map((b) => b.map(() => null)),
    );
    render(
      <OpenQuestionsScenarioControls q1={noPower.q1} q2={noPower.q2} q3={noPower.q3} dicke={noPower.dicke} />,
    );
    const q3 = screen.getByTestId('wh-remainder-q3');
    expect(q3).toHaveTextContent(/= — at θ=0\.6/);
    expect(q3).toHaveTextContent(/R_obs not supplied \(no excess-power ingest\)/);
    expect(q3).toHaveTextContent(/required product not supplied/);
    expect(q3).not.toHaveTextContent(/crosses R_obs/);
    expect(lookupClosureCell(noPower.q3.closure_demand.grid, 0, 0, 0)).toBeNull();
  });

  test('Franck–Condon S selection reads the matching log10 P_N', () => {
    renderControls();
    fireEvent.change(screen.getByLabelText('Huang–Rhys S'), { target: { value: '10000' } });
    expect(screen.getByTestId('wh-remainder-q2')).toHaveTextContent(
      /Q2 log10 P_N = -2\.489e9 at S=10000 vs target -11: below target/,
    );
  });

  test('degrades to a caption when the grids are absent', () => {
    render(<OpenQuestionsScenarioControls q1={{ open_remainder_mev: 23.8 }} q2={{}} q3={{}} dicke={{}} />);
    expect(screen.getByTestId('wh-scenario-controls')).toHaveTextContent(/not supplied by this API response/);
    expect(screen.queryByTestId('wh-remainder-vector')).not.toBeInTheDocument();
  });

  test('never claims proof', () => {
    renderControls();
    expect(screen.queryByText('LENR_PROVED', { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText(/EQ-OPEN-MEV-01 \/ RAD-01 \/ RATE-01 remain OPEN/)).toBeInTheDocument();
  });
});

describe('lookup helpers', () => {
  test('lookupCouplingRow matches on numeric g and n_coh', () => {
    expect(lookupCouplingRow(WH.q1.coupling_scan.rows, 1e-2, 100)).toMatchObject({ remainder_mev: 23.56 });
    expect(lookupCouplingRow(WH.q1.coupling_scan.rows, 1e-2, 0)).toBeNull();
  });

  test('lookupClosureCell indexes [theta][tau][f_nuc]', () => {
    expect(lookupClosureCell(WH.q3.closure_demand.grid, 2, 0, 1)).toBe(-11.55);
    expect(lookupClosureCell(WH.q3.closure_demand.grid, 9, 0, 0)).toBeNull();
  });
});
