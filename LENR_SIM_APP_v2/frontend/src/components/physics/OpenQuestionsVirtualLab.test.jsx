/**
 * OpenQuestionsVirtualLab — when/how rows, Oracle B, no LENR_PROVED.
 */
import React from 'react';
import { fireEvent, render, screen } from '../../tests/test-utils';
import OpenQuestionsVirtualLab from './OpenQuestionsVirtualLab';
import MechanismPathDiagram from './MechanismPathDiagram';
import whFixture from '../../../tests/fixtures/open_questions_wh_v2.json';

// The lazily-loaded R3F scene pulls in three; it has its own test with mocks.
jest.mock('./TscClusterScene', () => ({
  __esModule: true,
  default: () => <div data-testid="tsc-cluster-scene" />,
}));

const TWO_BODY_OQ = {
  schema: 'lenr-open-questions-v1',
  route_mode: 'legacy_unified_model',
  rate_mode: 'two_body',
  occurrence: { anchored: false, emp_gates: [] },
  when: { two_body_reference_log10_n: -40, active_mode_log10_n: -40 },
  how: {
    mechanism_paths: [
      { id: 'trapped_state', posterior: 0.1, lean_ids: ['EQ-NBODY-FGR-01'] },
      { id: 'phonon_cascade', posterior: 0.0, lean_ids: [] },
      { id: 'three_body', posterior: 0.05, lean_ids: [] },
    ],
    active_rate_mode: 'two_body',
    fgr_parameters: { P_occ: null, Gamma_tun: 1e-20 },
  },
  determination: {
    status: 'RATE_BUDGET_DOES_NOT_CLOSE',
    oracle_a: {
      two_body_budget_closes: false,
      lean_theorems: ['EQ-RATE-2B-NC-01', 'EQ-PHONON-N-01'],
    },
    oracle_b: {
      priors_source: 'default_skeptical',
      hypotheses: [
        { id: 'chemical_null', posterior: 0.35, log10_bayes_vs_two_body: 0 },
        { id: 'two_body', posterior: 0.5, log10_bayes_vs_two_body: 0 },
        { id: 'trapped_state', posterior: 0.1, log10_bayes_vs_two_body: 1.2 },
        { id: 'phonon_cascade', posterior: 0.0, log10_bayes_vs_two_body: -1 },
        { id: 'three_body', posterior: 0.05, log10_bayes_vs_two_body: 0.5 },
      ],
    },
    next_measurement: [
      { observable: 'he4', rank: 1, rationale: 'Miles EMP' },
    ],
  },
  q_mev_gap: {
    id: 'EQ-OPEN-MEV-01',
    status: 'OPEN',
    claim_tier: 'speculative_exploratory',
    energy_partition_mev: {
      phonon: 0, gamma: 0, recoil: 0, open_remainder: 23.8, q_total: 23.8,
    },
  },
  q_radiation: { id: 'EQ-OPEN-RAD-01', status: 'OPEN', detector_ul_log10: -8 },
  q_statistical: { id: 'EQ-OPEN-RATE-01', status: 'BUDGET_DOES_NOT_CLOSE', n_events_log10_two_body: -40 },
  q_electron_capture: {
    id: 'EQ-OPEN-EC-01',
    status: 'OPEN',
    claim_tier: 'speculative_exploratory',
    dimmed: true,
    electron_capture_threshold_mev: 0.782,
    mass_renormalization_input_mstar_over_me: 4,
    mass_renormalization_threshold_mstar_over_me: 2.531,
    mass_renormalization_threshold_met: true,
    energy_deficit_mev: 0,
    occurrence_claimed: false,
    unmet_reason: 'Meeting the speculative mass gate is necessary, not sufficient.',
  },
  q_integrated_yield: {
    id: 'EQ-OPEN-YIELD-01',
    status: 'OPEN',
    claim_tier: 'empirical_lenr_correlation',
    dimmed: true,
    expected_he4_rate_per_s: 2.62e11,
    duty_adjusted_expected_he4_rate_per_s: 1.31e11,
    expected_integrated_he4_yield_atoms: 2.62e12,
    observed_integrated_he4_yield_atoms: null,
    observed_integrated_yield_note: 'No observed integrated yield was supplied.',
    reported_integrated_yield_discrepancy: {
      factor_band: [1e2, 1e4],
    },
    retention_time_resolved_caveat: 'Retention and simultaneous time-resolved accounting remain required.',
    occurrence_claimed: false,
  },
  composition: {
    not_combinable: true,
    illegal_product: 1e10,
    tsc_enhancement_can_scale_two_body: true,
  },
  emp_chips: [{ id: 'miles_q_band', label: 'Miles 24±4 MeV/He EMP' }],
  working_hypothesis: {
    id: 'WH-ENP-01',
    status: 'OPEN',
    claim_tier: 'speculative_exploratory',
    statement: 'Coupled Hagelstein/TSC ledger; remainders OPEN.',
    geometry: 'fcc_tetrahedral',
    occupation_model: 'bernoulli_p4_model_assumption',
    lean_theorems: ['EQ-WH-NONCLOSE-01'],
    dicke: { n2_licensed: false, paper_domain_m: 6.6e-9, dicke_radius_m: 4.9e-11 },
    schwinger_he: { he_factor: 1 },
    q1: { alpha_stopping: { csda_range_pd_m: 4e-5, ke_per_alpha_mev: 23.8 } },
    q2: {
      derived_bound: { derived_gamma_ph_over_gamma_gamma: 0, lattice_gamma_target: 1e11, meets_target: false },
      neutron_moderation: { media: { liquid_d2o: { label: 'liquid', length_m: 0.06 } } },
    },
    channels: [
      { id: 'tsc_4d_2alpha', q_mev: 47.6, weight_kind: 'kinematics_only', primary_gamma_required: false },
    ],
    remainder_vector: { q1_open_remainder_mev: 23.8, q3_log10_n_two_body: -40 },
  },
  lenr_proved: false,
};

const ANCHORED_OQ = {
  ...TWO_BODY_OQ,
  occurrence: { anchored: true, emp_gates: ['miles_q_band'] },
  determination: {
    ...TWO_BODY_OQ.determination,
    status: 'OCCURRENCE_ANCHORED_EMP',
    oracle_b: {
      ...TWO_BODY_OQ.determination.oracle_b,
      priors_source: 'occurrence_anchored',
      occurrence_anchored: true,
    },
  },
};

describe('OpenQuestionsVirtualLab', () => {
  test('prints when/how header and two-body does not close', () => {
    render(<OpenQuestionsVirtualLab openQuestions={TWO_BODY_OQ} />);
    expect(screen.getByText(/When and how under named conditions/i)).toBeInTheDocument();
    expect(screen.getByText(/Oracle A \/ B status:\s*RATE BUDGET DOES NOT CLOSE/i)).toBeInTheDocument();
    expect(screen.getByTestId('oracle-b-panel')).toBeInTheDocument();
    expect(screen.getByTestId('next-measurement-ivg')).toBeInTheDocument();
    expect(screen.queryByText('LENR_PROVED', { exact: true })).not.toBeInTheDocument();
  });

  test('shows occurrence anchored chip', () => {
    render(<OpenQuestionsVirtualLab openQuestions={ANCHORED_OQ} />);
    expect(screen.getByTestId('occurrence-anchored-chip')).toBeInTheDocument();
    expect(screen.getByText(/Miles-band heat–He anchors occurrence/i)).toBeInTheDocument();
  });

  test('local_fallback is INCONCLUSIVE without EMP chips', () => {
    render(
      <OpenQuestionsVirtualLab
        simulationData={{ validation: { route_mode: 'local_fallback' } }}
      />,
    );
    expect(screen.getByText(/Oracle A \/ B status:\s*INCONCLUSIVE/i)).toBeInTheDocument();
    expect(screen.queryByText(/Miles 24/)).not.toBeInTheDocument();
  });

  test('toggles Oracle B diagram view', () => {
    render(
      <OpenQuestionsVirtualLab
        simulationData={{
          open_questions: TWO_BODY_OQ,
          peak_conditions: { enhancement_breakdown: {} },
        }}
      />,
    );
    fireEvent.click(screen.getByTestId('oracle-b-tab-diagram'));
    expect(screen.getByTestId('oracle-b-diagrams')).toBeInTheDocument();
    expect(screen.getByTestId('mechanism-diagram-trapped_state')).toBeInTheDocument();
  });

  test('renders energy partition flow chart', () => {
    render(<OpenQuestionsVirtualLab openQuestions={TWO_BODY_OQ} />);
    expect(screen.getByTestId('energy-partition-flow')).toBeInTheDocument();
  });

  test('renders dimmed Q4 and Q5 computed fields without claiming occurrence', () => {
    render(<OpenQuestionsVirtualLab openQuestions={TWO_BODY_OQ} />);
    expect(screen.getByTestId('q4-computed-fields')).toHaveTextContent(
      /Energy gate 0.782 MeV · m\*\/mₑ 4.00 \/ 2.53 required/i,
    );
    expect(screen.getByTestId('q4-computed-fields')).toHaveTextContent(
      /Threshold status does not establish capture occurrence/i,
    );
    expect(screen.getByTestId('q5-computed-fields')).toHaveTextContent(
      /2.62e\+11 atoms\/s active/i,
    );
    expect(screen.getByTestId('q5-computed-fields')).toHaveTextContent(
      /Reported \/ known integrated-yield shortfall: 1e2–1e4× lower/i,
    );
    expect(screen.getByTestId('q5-computed-fields')).toHaveTextContent(
      /No observed integrated yield was supplied/i,
    );
    expect(screen.getAllByText('Speculative / exploratory').length).toBeGreaterThan(0);
    expect(screen.getByText('Empirical LENR correlation')).toBeInTheDocument();
    expect(TWO_BODY_OQ.lenr_proved).toBe(false);
  });

  test('zero Q4 deficit carries the scenario-input / deficit-identity caveat', () => {
    render(<OpenQuestionsVirtualLab openQuestions={TWO_BODY_OQ} />);
    expect(screen.getByTestId('q4-zero-deficit-note')).toHaveTextContent(
      /assumed m\*\/mₑ scenario input.*EQ-OPEN-EC-DEFICIT-01.*EQ-OPEN-EC-01 stays OPEN/,
    );
  });

  test('Q4 prefers the backend zero-deficit note and hides it when a deficit remains', () => {
    const backendNote = 'Backend zero-deficit note (EQ-OPEN-EC-DEFICIT-01).';
    const { unmount } = render(
      <OpenQuestionsVirtualLab
        openQuestions={{
          ...TWO_BODY_OQ,
          q_electron_capture: { ...TWO_BODY_OQ.q_electron_capture, zero_deficit_note: backendNote },
        }}
      />,
    );
    expect(screen.getByTestId('q4-zero-deficit-note')).toHaveTextContent(backendNote);
    unmount();
    render(
      <OpenQuestionsVirtualLab
        openQuestions={{
          ...TWO_BODY_OQ,
          q_electron_capture: { ...TWO_BODY_OQ.q_electron_capture, energy_deficit_mev: 0.27 },
        }}
      />,
    );
    expect(screen.queryByTestId('q4-zero-deficit-note')).not.toBeInTheDocument();
  });

  test('two-body BUDGET_DOES_NOT_CLOSE row still shows the obligation as OPEN', () => {
    render(<OpenQuestionsVirtualLab openQuestions={TWO_BODY_OQ} />);
    expect(screen.getByText('BUDGET_DOES_NOT_CLOSE')).toBeInTheDocument();
    expect(screen.getByTestId('obligation-open-EQ-OPEN-RATE-01')).toHaveTextContent('obligation OPEN');
    expect(screen.queryByTestId('obligation-open-EQ-OPEN-MEV-01')).not.toBeInTheDocument();
  });

  test('local fallback keeps every EQ-OPEN row OPEN with backend-aligned tiers', () => {
    render(
      <OpenQuestionsVirtualLab
        simulationData={{ validation: { route_mode: 'local_fallback' } }}
      />,
    );
    expect(screen.getAllByText('OPEN').length).toBe(5);
    expect(screen.getAllByText('Speculative / exploratory').length).toBe(4);
    expect(screen.getByText('Empirical LENR correlation')).toBeInTheDocument();
    expect(screen.queryByTestId(/^obligation-open-/)).not.toBeInTheDocument();
  });

  test('renders WH-ENP-01 coupled ledger without implying proof', () => {
    render(<OpenQuestionsVirtualLab openQuestions={TWO_BODY_OQ} />);
    expect(screen.getByTestId('wh-enp-01-panel')).toBeInTheDocument();
    expect(screen.getByText(/Working hypothesis WH-ENP-01/)).toBeInTheDocument();
    expect(screen.getByText(/EQ-OPEN-MEV-01 \/ RAD-01 \/ RATE-01 remain OPEN/)).toBeInTheDocument();
    expect(screen.getByTestId('wh-channel-graph')).toBeInTheDocument();
  });

  test('renders the v2 WH fixture with scenario controls, Franck–Condon chart and DAG', async () => {
    render(<OpenQuestionsVirtualLab openQuestions={whFixture} />);
    expect(screen.getByTestId('wh-enp-01-panel')).toBeInTheDocument();
    expect(screen.getByTestId('wh-scenario-controls')).toBeInTheDocument();
    expect(screen.getByTestId('wh-remainder-vector')).toHaveTextContent(/Q1 remainder 23\.8 MeV OPEN/);
    expect(screen.getByTestId('wh-franck-condon-chart')).toHaveTextContent(/S_min for target 575400000/);
    expect(screen.getByTestId('wh-channel-dag')).toBeInTheDocument();
    expect(screen.getByTestId('wh-channel-graph')).toBeInTheDocument();
    expect(screen.getByTestId('wh-closure-demand-row')).toHaveTextContent(
      /required product 5\.784e26.*fcc_tetrahedral:.*crosses R_obs no.*trap_25pm:.*crosses R_obs no/,
    );
    expect(screen.getByTestId('wh-coupling-cited-row')).toHaveTextContent(/g 0\.0001, n_coh 0 → derived 0 MeV/);
    expect(await screen.findByTestId('tsc-cluster-scene')).toBeInTheDocument();
    expect(screen.queryByText('LENR_PROVED', { exact: true })).not.toBeInTheDocument();
    expect(whFixture.lenr_proved).toBe(false);
  });

  test('older responses without the v2 grids still render without the new panels', () => {
    render(<OpenQuestionsVirtualLab openQuestions={TWO_BODY_OQ} />);
    expect(screen.getByTestId('wh-scenario-controls')).toHaveTextContent(/not supplied by this API response/);
    expect(screen.queryByTestId('wh-franck-condon-chart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('wh-closure-demand-row')).not.toBeInTheDocument();
  });
});

describe('MechanismPathDiagram', () => {
  test('renders SVG for known path', () => {
    render(<MechanismPathDiagram pathId="three_body" posterior={0.1} />);
    expect(screen.getByTestId('mechanism-diagram-three_body')).toBeInTheDocument();
    expect(screen.getByText(/Three-body sequential path/)).toBeInTheDocument();
  });
});
