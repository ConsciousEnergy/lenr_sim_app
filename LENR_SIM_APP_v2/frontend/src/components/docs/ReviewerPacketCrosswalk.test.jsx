import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ReviewerPacketCrosswalk from './ReviewerPacketCrosswalk';
import { OPEN_EQ_IDS } from '../../config/unifiedTheoryScienceEvidence';

describe('ReviewerPacketCrosswalk', () => {
  test('renders honesty chips and keeps EQ-OPEN OPEN', () => {
    render(
      <MemoryRouter>
        <ReviewerPacketCrosswalk testIdPrefix="xwalk" />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('xwalk-panel')).toBeInTheDocument();
    expect(screen.getByTestId('xwalk-lenr-proved')).toHaveTextContent(
      /lenr_proved: false/i,
    );
    expect(screen.getByTestId('xwalk-eq-open')).toHaveTextContent(/OPEN/i);
    expect(screen.getByTestId('xwalk-no-discharge')).toBeInTheDocument();
    expect(screen.getByTestId('xwalk-no-tier-raise')).toBeInTheDocument();
    expect(screen.getByTestId('xwalk-fixed-ne-closed')).toBeInTheDocument();
    expect(screen.getByTestId('xwalk-honesty')).toHaveTextContent(
      /Navigation only/i,
    );
    expect(screen.queryByText(/lenr_proved:\s*true/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/EQ-OPEN.*CLOSED/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/status:\s*CLOSED/i)).not.toBeInTheDocument();
  });

  test('lists packets A–E and links governance docs', () => {
    render(
      <MemoryRouter>
        <ReviewerPacketCrosswalk testIdPrefix="xwalk" />
      </MemoryRouter>,
    );
    ['A', 'B', 'C', 'D', 'E'].forEach((id) => {
      expect(screen.getByTestId(`xwalk-row-${id}`)).toBeInTheDocument();
    });
    expect(screen.getByTestId('xwalk-link-ledger')).toHaveAttribute(
      'href',
      '/docs/issue-ledger',
    );
    expect(screen.getByTestId('xwalk-link-preds')).toHaveAttribute(
      'href',
      '/docs/testable-predictions',
    );
    expect(screen.getByTestId('xwalk-link-runway')).toHaveAttribute(
      'href',
      '/docs/eq-open-closure-runway',
    );
    expect(screen.getByTestId('xwalk-legacy-table')).toBeInTheDocument();
    expect(screen.getByTestId('xwalk-il-IL-001')).toBeInTheDocument();
    expect(screen.getByTestId('xwalk-il-IL-018')).toBeInTheDocument();
  });

  test('packet B OPEN chips reference known EQ-OPEN ids', () => {
    render(
      <MemoryRouter>
        <ReviewerPacketCrosswalk testIdPrefix="xwalk" />
      </MemoryRouter>,
    );
    OPEN_EQ_IDS.filter((id) => id !== 'EQ-OPEN-RATE-01').forEach((id) => {
      // Packet B stresses MEV/RAD/EC/YIELD; RATE appears on C/D/E
      if (
        [
          'EQ-OPEN-MEV-01',
          'EQ-OPEN-RAD-01',
          'EQ-OPEN-EC-01',
          'EQ-OPEN-YIELD-01',
        ].includes(id)
      ) {
        expect(
          screen.getByTestId(`xwalk-open-B-${id}`),
        ).toHaveTextContent(/OPEN/);
      }
    });
  });
});
