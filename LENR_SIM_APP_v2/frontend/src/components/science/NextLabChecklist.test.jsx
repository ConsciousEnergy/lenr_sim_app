import React from 'react';
import { render, screen } from '../../tests/test-utils';
import NextLabChecklist from './NextLabChecklist';
import { NEXT_LAB_MOE_TARGETS } from '../../config/unifiedTheoryScienceEvidence';

describe('NextLabChecklist', () => {
  test('lists five blocked asks with acceptance and still-does-not-discharge', () => {
    render(<NextLabChecklist testIdPrefix="nlc" />);
    expect(screen.getByTestId('nlc-panel')).toBeInTheDocument();
    expect(screen.getByTestId('nlc-ask-met-ne-discharge')).toBeInTheDocument();
    expect(NEXT_LAB_MOE_TARGETS.length).toBeGreaterThanOrEqual(5);
    NEXT_LAB_MOE_TARGETS.forEach((row) => {
      expect(screen.getByTestId(`nlc-row-${row.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`nlc-status-${row.id}`)).toHaveTextContent(
        'blocked_awaiting_lab',
      );
      expect(screen.getByTestId(`nlc-acceptance-${row.id}`)).toHaveTextContent(/Accept when:/i);
      expect(screen.getByTestId(`nlc-still-open-${row.id}`)).toHaveTextContent(
        /Still does not discharge:/i,
      );
    });
  });

  test('RATE/EC rows refuse empty DAQ fabrication', () => {
    render(<NextLabChecklist testIdPrefix="nlc" />);
    expect(screen.getByTestId('nlc-daq-occupation_rate_caps_measured')).toHaveTextContent(
      /none in sample-v1/i,
    );
    expect(screen.getByTestId('nlc-daq-ec_threshold_cm_path')).toHaveTextContent(
      /none in sample-v1/i,
    );
  });
});
