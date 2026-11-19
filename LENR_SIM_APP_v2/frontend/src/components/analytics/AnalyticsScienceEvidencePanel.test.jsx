/**
 * Analytics §5B panel — live corpus MoE coverage hydrate honesty.
 */
import React from 'react';
import { waitFor } from '@testing-library/react';
import { render, screen } from '../../tests/test-utils';
import AnalyticsScienceEvidencePanel from './AnalyticsScienceEvidencePanel';

const LIVE = Object.freeze({
  schema: 'lenr-moe-coverage-v1',
  n_records: 26,
  with_sigma_q: 5,
  with_literature_reported_cite_gated: 2,
  with_moe_pairing_verified: 2,
  discovery_grade_eligible_count: 2,
  discovery_grade_eligible_ids: ['kasagi-nicu-radiant-2026', 'kasagi-ni-radiant-2026'],
  closes_eq_open: false,
  lenr_proved: false,
  source: 'literature_records+iccf27_literature_records+exploratory_moe_literature_records',
  live_endpoint: 'GET /api/analytics/literature-corpus-moe-coverage',
});

describe('AnalyticsScienceEvidencePanel live MoE coverage', () => {
  beforeEach(() => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => LIVE,
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('hydrates live coverage while keeping honesty locks', async () => {
    render(<AnalyticsScienceEvidencePanel />);
    expect(screen.getByTestId('analytics-science-evidence-panel')).toBeInTheDocument();
    expect(screen.getByTestId('analytics-5b-honesty')).toHaveTextContent(/lenr_proved: false/);
    await waitFor(() => {
      expect(screen.getByTestId('analytics-5b-moe-coverage-source')).toHaveTextContent(
        'live_api',
      );
    });
    expect(screen.getByTestId('analytics-5b-moe-coverage')).toHaveTextContent('2/26');
    expect(screen.getByTestId('analytics-5b-moe-coverage')).toHaveTextContent(
      'closes_eq_open',
    );
    // Gap checklist receives the same live hydrate (not SPA-only).
    await waitFor(() => {
      expect(screen.getByTestId('analytics-5b-gap-moe-coverage-source')).toHaveTextContent(
        'live_api',
      );
    });
    expect(screen.getByTestId('analytics-5b-gap-moe-coverage')).toHaveTextContent('2/26');
  });
});
