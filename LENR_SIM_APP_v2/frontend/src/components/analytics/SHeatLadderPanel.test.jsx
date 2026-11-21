import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import SHeatLadderPanel from './SHeatLadderPanel';
import * as fetchMod from './fetchSHeatLadder';

jest.mock('./fetchSHeatLadder', () => ({
  fetchSHeatLadder: jest.fn(),
}));

describe('SHeatLadderPanel', () => {
  beforeEach(() => {
    fetchMod.fetchSHeatLadder.mockResolvedValue(null);
  });

  it('renders freeze ladder with ≥5σ bar and Kasagi high-success ranks', async () => {
    render(<SHeatLadderPanel />);
    expect(screen.getByTestId('s-heat-ladder-panel')).toBeInTheDocument();
    expect(screen.getByTestId('s-heat-ladder-5sigma-bar')).toHaveTextContent('≥5σ bar');
    expect(screen.getByTestId('s-heat-ladder-high-success-n')).toHaveTextContent(
      'high-success n=2',
    );
    expect(
      screen.getByTestId('s-heat-ladder-high-success-row-kasagi-nicu-radiant-2026'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('s-heat-ladder-demoted-seed-row-deninno-tid-1995'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('s-heat-ladder-eng-hs-08')).toBeInTheDocument();
    expect(screen.getByTestId('s-heat-ladder-source')).toHaveTextContent('spa_freeze');
    expect(
      screen.getByTestId(
        's-heat-ladder-high-success-claim-tier-kasagi-nicu-radiant-2026',
      ),
    ).toHaveAttribute('data-claim-tier', 'empirical_lenr_correlation');
    expect(
      screen.getByTestId('s-heat-ladder-exploratory-row-miles-1993'),
    ).toBeInTheDocument();
  });

  it('hydrates from live API when honest payload returns', async () => {
    fetchMod.fetchSHeatLadder.mockResolvedValue({
      schema: 'lenr-s-heat-ladder-v1',
      n_records: 26,
      n_high_success_rankable: 2,
      discovery_grade_threshold_sigma: 5,
      ladder_display_max_s: 30,
      ranked_high_success: [
        {
          literature_id: 'kasagi-nicu-radiant-2026',
          s_heat: 13.75,
          display_s_heat: 13.75,
          claim_tier: 'empirical_lenr_correlation',
          band: 'discovery_analytics_clear',
          high_success_rankable: true,
          high_success_rank: 1,
        },
      ],
      exploratory_band: [],
      demoted_seed_scale: [
        {
          literature_id: 'deninno-tid-1995',
          s_heat: 250,
          display_s_heat: null,
          claim_tier: 'speculative_exploratory',
          band: 'demoted_seed_scale',
          high_success_rankable: false,
          q_is_seed_scale: true,
          demotion_reason: 'q_is_seed_scale',
        },
      ],
      honest_high_success_order_ids: ['kasagi-nicu-radiant-2026'],
      raw_s_heat_order_ids: ['deninno-tid-1995', 'kasagi-nicu-radiant-2026'],
      eng_hs_08: { raw_s_heat_would_lie: true, rule: 'ENG-HS-08' },
      closes_eq_open: false,
      lenr_proved: false,
      honesty: 'live honesty',
    });
    render(<SHeatLadderPanel />);
    await waitFor(() => {
      expect(screen.getByTestId('s-heat-ladder-source')).toHaveTextContent('live_api');
    });
    expect(screen.getByTestId('s-heat-ladder-honesty')).toHaveTextContent('live honesty');
  });
});
