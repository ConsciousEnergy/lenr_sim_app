import React from 'react';
import { render, screen } from '@testing-library/react';
import EngineMaturityBadge from './EngineMaturityBadge';
import { ENGINE_MATURITY } from '../config/engineMaturity';

describe('EngineMaturityBadge', () => {
  it('renders Bubble Fusion approximate chip', () => {
    render(<EngineMaturityBadge engineId="ENG-BUBBLE-FUSION-01" />);
    expect(screen.getByTestId('engine-maturity-chip-ENG-BUBBLE-FUSION-01')).toHaveTextContent(
      /Approximate/i,
    );
  });

  it('renders speculative OPEN chip', () => {
    render(<EngineMaturityBadge engineId="EQ-OPEN-MEV-01" />);
    expect(screen.getByTestId('engine-maturity-chip-EQ-OPEN-MEV-01')).toHaveTextContent(
      /Speculative/i,
    );
  });

  it('ledger mirror exposes required public surfaces', () => {
    [
      'ENG-BUBBLE-FUSION-01',
      'ENG-WKB-01',
      'ENG-RP-KM-01',
      'ENG-THEORY-PIPELINE-01',
      'ENG-ASPIRATIONAL-FEM-01',
      'WH-ENP-01',
    ].forEach((id) => {
      expect(ENGINE_MATURITY[id]).toBeTruthy();
    });
  });
});
