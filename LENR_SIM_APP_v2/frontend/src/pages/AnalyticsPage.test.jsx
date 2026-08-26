/**
 * Analytics Overview labels: completion is not LENR validation.
 * Charts plot SQL experiment fields; Relevance Map can use persisted means.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../tests/test-utils';
import AnalyticsPage from './AnalyticsPage';
import { analyticsApi } from '../services/analyticsApi';

jest.mock('../components/analytics/RelevanceMap', () => () => (
  <div data-testid="mock-relevance-map">Mock Relevance Map</div>
));

jest.mock('../services/analyticsApi', () => ({
  analyticsApi: {
    getStats: jest.fn().mockResolvedValue({
      totalSimulations: 4,
      successRate: 75,
      completionRate: 75,
      scientificPositiveRate: 25,
      avgEnhancement: 1.5,
      totalEnergy: 0,
      maxEnhancement: 2,
      completedCount: 3,
      failedCount: 1,
      outcomeCounts: { positive: 1, null: 1, inapplicable: 1, failed: 1 },
      claimTierCounts: { speculative: 2, validated_lenr_mechanism: 1 },
    }),
    getTypeDistribution: jest.fn().mockResolvedValue([
      { name: 'LENR', value: 3, percentage: 75 },
      { name: 'Unified Theory', value: 1, percentage: 25 },
    ]),
    getSourceDistribution: jest.fn().mockResolvedValue([
      { name: 'Baseline', value: 1, percentage: 50 },
      { name: 'Campaign', value: 1, percentage: 50 },
    ]),
    getTimeline: jest.fn().mockResolvedValue([
      {
        date: '2026-08-24',
        name: 'Taleyarkhan bubble fusion',
        enhancementFactor: 5,
        energyOutput: 2500,
        sourceClass: 'Baseline',
        source: 'Published Research',
        is_baseline: true,
      },
      {
        date: '2026-08-24',
        name: 'Iwamura transmutation',
        enhancementFactor: 12,
        energyOutput: 75,
        sourceClass: 'Baseline',
        source: 'Published Research',
        is_baseline: true,
      },
    ]),
    getExperiments: jest.fn().mockResolvedValue({
      experiments: [
        {
          id: 'exp-failed',
          name: 'FAILED Unified palladium',
          experiment_type: 'unified_theory',
          status: 'failed',
          material: 'palladium',
          temperature_k: 300,
          pressure_bar: 1.01,
          excess_heat_watts: 0,
          created_at: '2026-08-24T00:00:00Z',
          source: 'simulation_campaign',
        },
        {
          id: 'exp-null',
          name: 'Google/ARPA-E null',
          experiment_type: 'lenr',
          status: 'completed',
          material: 'palladium',
          temperature_k: 300,
          pressure_bar: 1.0,
          excess_heat_watts: 0,
          created_at: '2026-08-24T00:00:00Z',
          source: 'Published Research',
          is_baseline: true,
        },
      ],
      total: 2,
    }),
    getTemperatureDistribution: jest.fn().mockResolvedValue([]),
    getTheoryGraph: jest.fn().mockResolvedValue({ nodes: [], edges: [] }),
    computeTheoryScores: jest.fn().mockResolvedValue({ scores: [] }),
    getTheoryProperties: jest.fn().mockResolvedValue({ properties: {} }),
    getTheoryRunHistory: jest.fn().mockResolvedValue({
      n_runs: 2,
      n_theories: 1,
      is_empirical_confidence: false,
      curated_edge_strength_unchanged: true,
      score_field: 'final_score_preferred',
      per_theory: {
        electron_screening: {
          n: 2,
          mean_final_score: 0.42,
          mean_score: 0.42,
          mean_weighted_score: 0.31,
        },
      },
    }),
    getLocalStats: jest.fn().mockReturnValue({
      totalSimulations: 0,
      successRate: 0,
      completionRate: 0,
      scientificPositiveRate: 0,
      avgEnhancement: 0,
      totalEnergy: 0,
      outcomeCounts: {},
      claimTierCounts: {},
    }),
  },
}));

describe('AnalyticsPage honest metrics', () => {
  test('labels completion separately from scientific-positive and does not claim LENR is proved', async () => {
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Completion Rate')).toBeInTheDocument();
    });
    expect(screen.getByText('Scientific-positive')).toBeInTheDocument();
    expect(screen.getByText('Total Records')).toBeInTheDocument();
    expect(screen.queryByText('Success Rate')).not.toBeInTheDocument();
    expect(screen.queryByText(/LENR proved/i)).not.toBeInTheDocument();

    const note = screen.getByTestId('completion-vs-scientific-note');
    expect(note).toHaveTextContent(/Neither card validates LENR/i);
    expect(note).toHaveTextContent(/Outcome mix/i);
    expect(note).toHaveTextContent(/Claim-tier histogram/i);
    expect(note).toHaveTextContent(/popularity is not validation/i);
    expect(note).toHaveTextContent(/energy_output_kev/i);

    expect(screen.getByTestId('model-output-disclaimer')).toHaveTextContent(
      /model outputs/i
    );
    expect(screen.getByTestId('enhancement-sql-chart')).toHaveTextContent(
      /Enhancement factor \(SQL\)/
    );
    expect(screen.getByTestId('energy-sql-chart')).toHaveTextContent(
      /Energy output \(SQL keV\)/
    );
    expect(screen.getByTestId('experiment-type-pie')).toHaveTextContent(
      /Stored experiment type/
    );
    expect(screen.getByTestId('source-class-pie')).toHaveTextContent(/Source class/);
    expect(screen.getByTestId('include-baseline-toggle')).toBeInTheDocument();
  });

  test('history Name column, pressure in bar, and SQL score-mode chip', async () => {
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Total Records')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('tab', { name: /Simulation History/i }));
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('FAILED Unified palladium')).toBeInTheDocument();
    expect(screen.getByText('Google/ARPA-E null')).toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    await userEvent.click(checkboxes[1]);
    await userEvent.click(checkboxes[2]);
    await userEvent.click(screen.getByRole('tab', { name: /Comparison/i }));
    expect(screen.getAllByText(/bar/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/atm/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: /Relevance Map/i }));
    await waitFor(() => {
      expect(screen.getByTestId('score-mode-chip')).toHaveTextContent('SQL mean');
    });
    expect(screen.getByTestId('run-live-scores')).toBeInTheDocument();
    expect(screen.getByTestId('use-persisted-scores')).toBeInTheDocument();
  });

  test('baseline toggle remains usable and refetches without baselines', async () => {
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('include-baseline-toggle')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByTestId('include-baseline-toggle'));
    await waitFor(() => {
      expect(analyticsApi.getStats).toHaveBeenCalledWith(
        expect.objectContaining({ includeBaseline: false })
      );
    });
    expect(screen.getByTestId('include-baseline-toggle')).toBeInTheDocument();
  });
});
