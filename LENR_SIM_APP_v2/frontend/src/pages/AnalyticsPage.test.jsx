/**
 * Analytics Overview labels: completion is not LENR validation.
 */

import React from 'react';
import { render, screen, waitFor } from '../tests/test-utils';
import AnalyticsPage from './AnalyticsPage';

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
    getTypeDistribution: jest.fn().mockResolvedValue([]),
    getTimeline: jest.fn().mockResolvedValue([]),
    getExperiments: jest.fn().mockResolvedValue({ experiments: [], total: 0 }),
    getTemperatureDistribution: jest.fn().mockResolvedValue([]),
    getTheoryGraph: jest.fn().mockResolvedValue({ nodes: [], edges: [] }),
    computeTheoryScores: jest.fn().mockResolvedValue({ scores: [] }),
    getTheoryProperties: jest.fn().mockResolvedValue({ properties: {} }),
    getTheoryRunHistory: jest.fn().mockResolvedValue(null),
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
    expect(screen.queryByText('Success Rate')).not.toBeInTheDocument();
    expect(screen.queryByText(/LENR proved/i)).not.toBeInTheDocument();

    const note = screen.getByTestId('completion-vs-scientific-note');
    expect(note).toHaveTextContent(/Neither card validates LENR/i);
    expect(note).toHaveTextContent(/Outcome mix/i);
    expect(note).toHaveTextContent(/Claim-tier histogram/i);
    expect(note).toHaveTextContent(/popularity is not validation/i);

    expect(screen.getByTestId('model-output-disclaimer')).toHaveTextContent(
      /model outputs/i
    );
  });
});
