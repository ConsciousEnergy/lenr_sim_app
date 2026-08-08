/**
 * TheoryTestbedCard
 *
 * The dashboard was a launcher with no way to run anything, so a user had to
 * navigate to /unified-theory before the theory pipeline could be exercised at
 * all. These tests lock the run path and the honesty labelling.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

import TheoryTestbedCard from './TheoryTestbedCard';
import { PhysicsProvider } from '../../contexts/PhysicsContext';

const THEORIES = [
  {
    theory_id: 'electron_screening',
    theory_name: 'Electron Screening',
    description: 'Debye screening of the Coulomb barrier',
    configurable_parameters: {},
    references: [],
    category: 'primary',
  },
  {
    theory_id: 'takahashi_tsc',
    theory_name: 'Takahashi TSC',
    description: 'Four-deuteron tetrahedral condensate',
    configurable_parameters: {},
    references: [],
    category: 'mechanism',
  },
];

const RUN_RESULT = {
  combined_enhancement: 2.5e4,
  combined_reaction_rate_modifier: 1.0,
  total_energy_watts: 0.02,
  conditions: {},
  enabled_theories: ['electron_screening', 'takahashi_tsc'],
  per_theory: [
    {
      theory_id: 'electron_screening',
      theory_name: 'Electron Screening',
      enhancement_factor: 1.2e4,
      reaction_rate_modifier: 1,
      energy_output_watts: 0.01,
      observables: {},
      parameters_used: {},
      is_applicable: true,
      confidence: 0.8,
      claim_tier: 'empirical_lenr_correlation',
      references: [],
    },
    {
      theory_id: 'takahashi_tsc',
      theory_name: 'Takahashi TSC',
      enhancement_factor: 2.0,
      reaction_rate_modifier: 1,
      energy_output_watts: 0.01,
      observables: {},
      parameters_used: {},
      is_applicable: true,
      confidence: 0.4,
      claim_tier: 'speculative_exploratory',
      references: [],
    },
  ],
};

const renderCard = () => render(
  <MemoryRouter>
    <PhysicsProvider>
      <TheoryTestbedCard />
    </PhysicsProvider>
  </MemoryRouter>,
);

beforeEach(() => {
  sessionStorage.clear();
  global.fetch = jest.fn((url, options) => {
    if (String(url).includes('/api/physics/theories/run')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(RUN_RESULT),
        // Captured so the conditions assertion below can inspect the body.
        _body: options?.body,
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(THEORIES) });
  });
});

afterEach(() => {
  jest.resetAllMocks();
});

describe('TheoryTestbedCard', () => {
  it('lists the theories returned by the backend', async () => {
    renderCard();
    expect(await screen.findByText('Electron Screening')).toBeInTheDocument();
    expect(screen.getByText('Takahashi TSC')).toBeInTheDocument();
  });

  it('runs the pipeline and shows the combined enhancement', async () => {
    renderCard();
    const runButton = await screen.findByRole('button', { name: /run selected theories/i });
    await userEvent.click(runButton);

    await waitFor(() => {
      expect(screen.getByText(/2\.50e\+4x/i)).toBeInTheDocument();
    });
  });

  it('posts a complete conditions dict even with no simulation parameters', async () => {
    renderCard();
    const runButton = await screen.findByRole('button', { name: /run selected theories/i });
    await userEvent.click(runButton);

    await waitFor(() => {
      const runCall = global.fetch.mock.calls.find(([url]) =>
        String(url).includes('/api/physics/theories/run'),
      );
      expect(runCall).toBeDefined();
      const body = JSON.parse(runCall[1].body);
      expect(body.conditions.temperature).toBe(300);
      expect(body.conditions.electrolyte_species).toBe('lioh');
      expect(body.conditions.gap_width_nm).toBeGreaterThan(0);
    });
  });

  it('states that the pipeline result is not combinable with the bubble-lattice result', async () => {
    renderCard();
    expect(await screen.findByText(/not combinable/i)).toBeInTheDocument();
  });

  it('labels the contribution bars as log-scaled rather than a percentage', async () => {
    renderCard();
    await userEvent.click(await screen.findByRole('button', { name: /run selected theories/i }));
    await waitFor(() => {
      expect(screen.getByText(/claim-tier weighted/i)).toBeInTheDocument();
    });
  });

  it('disables the run button when no theory is selected', async () => {
    renderCard();
    await screen.findByText('Electron Screening');
    await userEvent.click(screen.getByRole('button', { name: 'None' }));
    expect(screen.getByRole('button', { name: /run selected theories/i })).toBeDisabled();
  });

  it('offers a route into the full testbed', async () => {
    renderCard();
    const link = await screen.findByRole('link', { name: /full testbed/i });
    expect(link).toHaveAttribute('href', '/unified-theory?tab=testbed');
  });

  it('links to Advanced Analysis only after a run produces contributions', async () => {
    renderCard();
    await screen.findByText('Electron Screening');
    expect(screen.queryByRole('link', { name: /advanced analysis/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /run selected theories/i }));
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /advanced analysis/i })).toHaveAttribute(
        'href',
        '/advanced-analysis',
      );
    });
  });
});
