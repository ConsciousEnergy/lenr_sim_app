import React from 'react';
import { render, screen, fireEvent } from '../../tests/test-utils';
import EnhancementBreakdownDrawer from './EnhancementBreakdownDrawer';

const BREAKDOWN = {
  screening: 1e3,
  qed: 2,
  casimir: 3,
  rydberg: 4,
  compression: 10,
  phonon: 1.5,
  loading: 1.2,
};

describe('EnhancementBreakdownDrawer', () => {
  test('renders claim-tier channel stack for engine-bound factors', () => {
    render(
      <EnhancementBreakdownDrawer
        breakdown={BREAKDOWN}
        sampleSource="solver"
        collapsed={false}
        onToggle={() => {}}
      />,
    );
    expect(screen.getByTestId('ublv-enhancement-channel-stack')).toBeInTheDocument();
    expect(screen.getByTestId('ublv-enhancement-source-chip')).toHaveTextContent('engine');
    expect(screen.getByTestId('ublv-enhancement-tier-enhancement.screening'))
      .toHaveAttribute('data-claim-tier', 'speculative_exploratory');
    expect(screen.getByTestId('ublv-enhancement-tier-enhancement.compression'))
      .toHaveAttribute('data-claim-tier', 'empirical_lenr_correlation');
    expect(screen.getByTestId('ublv-enhancement-value-enhancement.phonon')).toBeInTheDocument();
  });

  test('renders primary screening · phonon · loading radar/stack', () => {
    render(
      <EnhancementBreakdownDrawer
        breakdown={BREAKDOWN}
        sampleSource="solver"
        collapsed={false}
        onToggle={() => {}}
      />,
    );
    expect(screen.getByTestId('ublv-enhancement-primary-stack')).toBeInTheDocument();
    expect(screen.getByTestId('ublv-enhancement-radar')).toBeInTheDocument();
    expect(screen.getByTestId('ublv-enhancement-bar-stack')).toBeInTheDocument();
    expect(screen.getByTestId('ublv-enhancement-bar-fill-screening')).toHaveAttribute('data-norm');
    expect(screen.getByTestId('ublv-enhancement-bar-fill-phonon')).toBeInTheDocument();
    expect(screen.getByTestId('ublv-enhancement-bar-fill-loading')).toBeInTheDocument();
    expect(screen.getByTestId('ublv-enhancement-primary-label')).toHaveTextContent(
      /screening · phonon · loading/i,
    );
    // Claim-tier chips beside primary factor values (governance reuse; no new scores)
    expect(screen.getByTestId('ublv-enhancement-bar-tier-screening'))
      .toHaveAttribute('data-claim-tier', 'speculative_exploratory');
    expect(screen.getByTestId('ublv-enhancement-bar-tier-phonon'))
      .toHaveAttribute('data-claim-tier', 'speculative_exploratory');
    expect(screen.getByTestId('ublv-enhancement-bar-tier-loading'))
      .toHaveAttribute('data-claim-tier', 'speculative_exploratory');
  });

  test('marks Local Calc when no engine samples', () => {
    render(
      <EnhancementBreakdownDrawer
        breakdown={BREAKDOWN}
        sampleSource="local_fallback"
        collapsed={false}
        onToggle={() => {}}
      />,
    );
    expect(screen.getByTestId('ublv-enhancement-source-chip')).toHaveTextContent('Local Calc');
    expect(screen.getByTestId('ublv-enhancement-tier-enhancement.screening'))
      .toHaveAttribute('data-claim-tier', 'speculative_exploratory');
  });

  test('toggle expands and collapses', () => {
    const onToggle = jest.fn();
    render(
      <EnhancementBreakdownDrawer
        breakdown={BREAKDOWN}
        sampleSource="solver"
        collapsed
        onToggle={onToggle}
      />,
    );
    fireEvent.click(screen.getByTestId('ublv-enhancement-toggle'));
    expect(onToggle).toHaveBeenCalled();
  });
});
