import React from 'react';
import { render, screen } from '@testing-library/react';
import TheoryFidelityHonestySummary from './TheoryFidelityHonestySummary';

describe('TheoryFidelityHonestySummary', () => {
  it('renders multiplier warning and free/fitted chips', () => {
    render(
      <TheoryFidelityHonestySummary
        theoryResult={{
          composition_provenance: {
            multiplier_stack_warning: 'Multiple composition groups multiply',
          },
          per_theory: [
            {
              theory_id: 'widom_larsen',
              free_or_fitted_parameters: [
                { name: 'ULM_CHAIN_RATE_TO_ENHANCEMENT', kind: 'free' },
              ],
              author_equations_vs_simulator_approximations: {
                ULM_CHAIN_RATE_TO_ENHANCEMENT: 'simulator_approximation',
              },
            },
          ],
        }}
      />,
    );
    expect(screen.getByTestId('theory-fidelity-honesty-summary')).toBeInTheDocument();
    expect(screen.getByText(/Multiple composition groups multiply/i)).toBeInTheDocument();
    expect(screen.getByText(/free\/fitted params/i)).toBeInTheDocument();
    expect(screen.getByText(/simulator approximations/i)).toBeInTheDocument();
  });

  it('returns null when empty', () => {
    const { container } = render(<TheoryFidelityHonestySummary theoryResult={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
