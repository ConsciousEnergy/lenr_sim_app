import React from 'react';
import { render, screen } from '@testing-library/react';
import EnhancementWaterfallChart from './EnhancementWaterfallChart';

const SAMPLE_BREAKDOWN = {
  total: 1e5,
  screening: 1e5,
  phonon: 55,
  prediction: {
    physics_governed: {
      total_log10: 7.5,
      groups: [
        { group: 'barrier_screening', selected: 'screening', log10_value: 5, value: 1e5 },
        { group: 'collapse_geometry', selected: 'compression', log10_value: 6, value: 1e6 },
        { group: 'field_coupling', selected: 'rydberg', log10_value: 1, value: 10 },
        { group: 'lattice_coupling', selected: 'phonon', log10_value: 1.74, value: 55 },
        { group: 'material_loading', selected: 'loading', log10_value: 0.39, value: 2.5 },
      ],
    },
    sensitivity_model: { total_log10: 13.4 },
    claim_tier_display: { total: 1e5 },
  },
  saturation: { mechanisms: { screening: { is_saturated: true } } },
};

describe('EnhancementWaterfallChart', () => {
  it('renders physics governed chip and segments', () => {
    render(<EnhancementWaterfallChart breakdown={SAMPLE_BREAKDOWN} />);
    expect(screen.getByTestId('enhancement-waterfall')).toBeInTheDocument();
    expect(screen.getByText(/Physics governed/)).toBeInTheDocument();
    expect(screen.getByText(/Screening/)).toBeInTheDocument();
  });
});
