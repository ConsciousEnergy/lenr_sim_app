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
      openQuestionCounts: { 'EQ-OPEN-YIELD-01': 2, 'EQ-OPEN-RAD-01': 1 },
      openQuestionCountsCampaign: { 'EQ-OPEN-YIELD-01': 2 },
      sourceClassCounts: { Baseline: 1, Campaign: 1, User: 2 },
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
          sourceClass: 'Campaign',
          literatureId: 'miles-1993',
          meanFinalScore: 0.62,
          topTheoryId: 'miles_heat_helium',
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
          sourceClass: 'Baseline',
          literatureId: 'berlinguette-arpa-e-2019',
          meanFinalScore: null,
          topTheoryId: null,
        },
        {
          id: 'exp-capped',
          name: 'Theory pipeline palladium',
          experiment_type: 'lenr',
          status: 'completed',
          material: 'palladium',
          temperature_k: 300,
          pressure_bar: 1.0,
          enhancement_factor: 100000,
          enhancementSaturated: true,
          log10EnhancementRaw: 18.4,
          energy_output_kev: null,
          excessHeatWatts: 0.012,
          created_at: '2026-08-24T00:00:00Z',
          source: 'auto_persist',
          sourceClass: 'Auto',
          literatureId: 'miles-1993',
          meanFinalScore: 0.24,
          topTheoryId: 'electron_screening',
        },
        {
          id: 'exp-bubble',
          name: 'Bubble-lattice palladium T=500K',
          experiment_type: 'bubble_fusion',
          status: 'completed',
          material: 'palladium',
          temperature_k: 500,
          pressure_bar: 1.5,
          enhancement_factor: 12,
          energy_output_kev: null,
          excessHeatWatts: null,
          created_at: '2026-08-24T00:00:00Z',
          source: 'auto_persist',
          sourceClass: 'Auto',
          literatureId: null,
          meanFinalScore: null,
          topTheoryId: null,
        },
      ],
      total: 4,
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
      score_formula: 'five_factor_gm_x_claim_tier',
      skip_sensitivity_note:
        'Persisted parameter_sensitivity is 0.5 unless live scores are computed.',
      per_theory: {
        electron_screening: {
          n: 2,
          mean_final_score: 0.42,
          mean_score: 0.42,
          mean_weighted_score: 0.31,
          ci_lo: 0.40,
          ci_hi: 0.44,
          ci_method: 'percentile_2.5_97.5',
          claim_tier: 'validated_lenr_mechanism',
        },
      },
      ranked_theory_ids: ['electron_screening'],
    }),
    parameterSweep: jest.fn().mockResolvedValue({
      sweep_param: 'loading_ratio',
      sweep_values: [0.1, 1.0],
      results: {
        electron_screening: [
          { sweep_value: 0.1, final_score: 0.21 },
          { sweep_value: 1.0, final_score: 0.44 },
        ],
      },
    }),
    getValidationReport: jest.fn().mockResolvedValue({
      n_theories: 1,
      reports: [
        {
          theory_id: 'electron_screening',
          theory_name: 'Electron Screening',
          n_passed: 5,
          n_total: 7,
          overall_pass_rate: 0.71,
          checks: [
            {
              check_id: 'miles_correlation',
              check_name: 'Miles Heat-Helium Correlation',
              passed: true,
              score: 1,
              detail: '',
            },
          ],
        },
      ],
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
      openQuestionCounts: {},
      openQuestionCountsCampaign: {},
      sourceClassCounts: {},
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
    expect(note).toHaveTextContent(/Open-question N on persisted rows/i);
    expect(note).toHaveTextContent(/Campaign-only N/i);
    expect(screen.getByTestId('open-question-n-chips')).toHaveTextContent('EQ-OPEN-YIELD-01 N=2');
    expect(screen.queryByTestId('analytics-seed-only-banner')).not.toBeInTheDocument();

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
    expect(screen.getByTestId('association-percent-header')).toHaveTextContent(/Model association %/);
    expect(screen.getByTestId('association-history-caption')).toHaveTextContent(/not a laboratory/);
    expect(screen.getByTestId('association-history-caption')).toHaveTextContent(/governance ceiling/);
    expect(screen.getByTestId('association-history-caption')).toHaveTextContent(/Power \(W\)/);
    expect(screen.getByText('62%')).toBeInTheDocument();
    expect(screen.getByText('miles heat helium')).toBeInTheDocument();
    expect(screen.getByText('miles-1993')).toBeInTheDocument();
    expect(screen.getByTestId('history-source-chip-campaign')).toBeInTheDocument();
    expect(screen.getByText('Power (W)')).toBeInTheDocument();
    expect(screen.getByText('Energy (keV)')).toBeInTheDocument();
    expect(screen.getByTestId('history-enhancement-capped')).toHaveTextContent('≥1e5 (capped)');
    expect(screen.queryByText('100000.00×')).not.toBeInTheDocument();
    const energyCells = screen.getAllByTestId('history-energy-kev');
    expect(energyCells.some((cell) => cell.textContent === '—')).toBe(true);
    expect(energyCells.some((cell) => cell.textContent === '0.000')).toBe(false);
    const powerCells = screen.getAllByTestId('history-power-watts');
    expect(powerCells.some((cell) => cell.textContent === '0.012')).toBe(true);
    expect(powerCells.some((cell) => cell.textContent === '—')).toBe(true);

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
    expect(screen.getByTestId('association-rank-panel')).toBeInTheDocument();
    expect(screen.getByTestId('association-rank-caption')).toHaveTextContent(/not empirical P\(LENR\)/i);
    expect(screen.getByTestId('association-rank-row-electron_screening')).toHaveTextContent(
      /validated_lenr_mechanism/
    );
    expect(screen.getByTestId('run-live-scores')).toBeInTheDocument();
    expect(screen.getByTestId('use-persisted-scores')).toBeInTheDocument();
    expect(screen.getByTestId('score-formula-chip')).toHaveTextContent(
      'five_factor_gm_x_claim_tier'
    );
    expect(screen.getByTestId('sensitivity-note-chip')).toHaveTextContent(
      /persisted sensitivity = 0.5 unless live/i
    );
    expect(screen.getByTestId('overlay-n-chip')).toHaveTextContent('N=2');
    expect(screen.getByTestId('score-n-electron_screening')).toHaveTextContent('N=2');
    expect(screen.getByTestId('score-ci-electron_screening')).toHaveTextContent('CI 40–44%');
    expect(screen.getByTestId('reviewer-analytics-panels')).toBeInTheDocument();
    expect(screen.getByTestId('parameter-sweep-panel')).toBeInTheDocument();
    expect(screen.getByTestId('validation-report-panel')).toBeInTheDocument();
    await waitFor(() => {
      expect(analyticsApi.getValidationReport).toHaveBeenCalled();
    });
    expect(screen.getByTestId('validation-theory-count')).toHaveTextContent('1 theories');
    await userEvent.click(screen.getByTestId('run-parameter-sweep'));
    await waitFor(() => {
      expect(analyticsApi.parameterSweep).toHaveBeenCalledWith(
        expect.objectContaining({
          sweep_param: 'loading_ratio',
          sweep_steps: expect.any(Number),
        })
      );
    });
    expect(analyticsApi.parameterSweep.mock.calls[0][0].sweep_steps).toBeLessThanOrEqual(100);
    expect(screen.getByTestId('live-score-mode-chip')).toHaveTextContent('five_factor');
    await userEvent.click(screen.getByLabelText(/Literature likelihood/i));
    await userEvent.click(screen.getByTestId('run-live-scores'));
    await waitFor(() => {
      expect(analyticsApi.computeTheoryScores).toHaveBeenCalledWith(
        expect.objectContaining({ score_mode: 'five_factor_plus_literature' })
      );
    });
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
    expect(screen.getByText('Total Records')).toBeInTheDocument();
    expect(screen.getByText(/Include published literature baselines/i)).toBeInTheDocument();
  });

  test('history sort and source-class chips pass query params', async () => {
    render(<AnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Records')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('tab', { name: /Simulation History/i }));
    await userEvent.click(screen.getByTestId('history-source-chip-campaign'));
    await waitFor(() => {
      expect(analyticsApi.getExperiments).toHaveBeenCalledWith(
        expect.objectContaining({ sourceClass: 'Campaign' })
      );
    });
    await userEvent.click(screen.getByLabelText('Sort'));
    await userEvent.click(await screen.findByRole('option', { name: /Model association %/i }));
    await waitFor(() => {
      expect(analyticsApi.getExperiments).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'mean_final_score' })
      );
    });
  });

  test('seed-only Campaign N is 0 has no CLI warning banner', async () => {
    analyticsApi.getStats.mockResolvedValueOnce({
      totalSimulations: 17,
      successRate: 100,
      completionRate: 100,
      scientificPositiveRate: 0,
      avgEnhancement: 1,
      totalEnergy: 0,
      maxEnhancement: 1,
      completedCount: 17,
      failedCount: 0,
      outcomeCounts: { positive: 0, null: 17, inapplicable: 0, failed: 0 },
      claimTierCounts: {},
      openQuestionCounts: { 'EQ-OPEN-YIELD-01': 4 },
      openQuestionCountsCampaign: {},
      sourceClassCounts: { Baseline: 17, Campaign: 0 },
    });

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Total Records')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('analytics-seed-only-banner')).not.toBeInTheDocument();
    expect(screen.queryByText(/seed_database --force --hydrate-demo/)).not.toBeInTheDocument();
    expect(screen.getByTestId('completion-vs-scientific-note')).toHaveTextContent(
      /not a hydrated campaign/i
    );
  });
});
