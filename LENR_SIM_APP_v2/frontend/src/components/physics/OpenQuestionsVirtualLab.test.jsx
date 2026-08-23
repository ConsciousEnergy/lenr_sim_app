import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import OpenQuestionsVirtualLab from './OpenQuestionsVirtualLab';
import MechanismPathDiagram from './MechanismPathDiagram';

const SAMPLE_OQ = {
  schema: 'lenr-open-questions-v1',
  rate_mode: 'two_body',
  determination: {
    status: 'INCONCLUSIVE',
    oracle_a: { two_body_budget_closes: false, log10_n_events_two_body: -40 },
    oracle_b: {
      priors_source: 'default_skeptical',
      hypotheses: [
        { id: 'chemical_null', posterior: 0.97, log10_bayes_vs_two_body: 40.22 },
        { id: 'trapped_state', posterior: 0.023, log10_bayes_vs_two_body: 39.13 },
      ],
    },
  },
  how: {
    best_mechanism_path: 'trapped_state',
    mechanism_paths: [
      { id: 'trapped_state', posterior: 0.023, lean_ids: ['EQ-NBODY-FGR-01'] },
    ],
    lean_theorems: ['EQ-MECH-PATH-01'],
  },
  q_mev_gap: {
    energy_partition_mev: { phonon: 0.1, gamma: 0.01, recoil: 0.01, open_remainder: 23.8 },
  },
  q_radiation: { assumed_branching: { n: 1e-11, gamma: 0 } },
  q_statistical: { n_events_log10_two_body: -40 },
};

describe('OpenQuestionsVirtualLab', () => {
  it('renders virtual lab when open_questions present', () => {
    render(
      <OpenQuestionsVirtualLab
        simulationData={{ open_questions: SAMPLE_OQ, peak_conditions: { enhancement_breakdown: {} } }}
      />,
    );
    expect(screen.getByTestId('open-questions-virtual-lab')).toBeInTheDocument();
    expect(screen.getByTestId('oracle-b-panel')).toBeInTheDocument();
    expect(screen.getByTestId('energy-partition-flow')).toBeInTheDocument();
  });

  it('toggles Oracle B diagram view', () => {
    render(
      <OpenQuestionsVirtualLab
        simulationData={{ open_questions: SAMPLE_OQ, peak_conditions: { enhancement_breakdown: {} } }}
      />,
    );
    fireEvent.click(screen.getByTestId('oracle-b-tab-diagram'));
    expect(screen.getByTestId('oracle-b-diagrams')).toBeInTheDocument();
    expect(screen.getByTestId('mechanism-diagram-trapped_state')).toBeInTheDocument();
  });

  it('returns null for local_fallback', () => {
    const { container } = render(
      <OpenQuestionsVirtualLab
        simulationData={{ open_questions: { route_mode: 'local_fallback' } }}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('MechanismPathDiagram', () => {
  it('renders SVG for known path', () => {
    render(<MechanismPathDiagram pathId="three_body" posterior={0.1} />);
    expect(screen.getByTestId('mechanism-diagram-three_body')).toBeInTheDocument();
    expect(screen.getByText(/Three-body sequential path/)).toBeInTheDocument();
  });
});
