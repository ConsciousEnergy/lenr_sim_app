/**
 * TheoryTogglePanel — Primary LENR theories All / None bulk selection.
 *
 * All / None are primary-scoped: they must not clear or enable context-track
 * theories (category === 'context_line').
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import TheoryTogglePanel from './TheoryTogglePanel';
import { render } from '../../tests/test-utils';

const THEORIES = [
  {
    theory_id: 'electron_screening',
    theory_name: 'Electron Screening',
    description: 'Debye screening of the Coulomb barrier',
    configurable_parameters: {},
    references: [],
    category: 'primary',
  },
  {
    theory_id: 'takahashi_tsc',
    theory_name: 'Takahashi TSC',
    description: 'Four-deuteron tetrahedral condensate',
    configurable_parameters: {},
    references: [],
    category: 'mechanism',
  },
  {
    theory_id: 'stellar_mhd_scaling',
    theory_name: 'Stellar MHD Scaling',
    description: 'Cross-regime comparison track',
    configurable_parameters: {},
    references: [],
    category: 'context_line',
  },
];

const PRIMARY_IDS = ['electron_screening', 'takahashi_tsc'];
const CONTEXT_ID = 'stellar_mhd_scaling';

function readEnabledIds() {
  const raw = sessionStorage.getItem('lenr_enabledTheories');
  return raw ? JSON.parse(raw) : [];
}

beforeEach(() => {
  sessionStorage.clear();
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(THEORIES) }),
  );
});

afterEach(() => {
  jest.resetAllMocks();
});

describe('TheoryTogglePanel primary All / None', () => {
  it('renders All and None next to the Primary LENR theories header', async () => {
    render(<TheoryTogglePanel />);
    expect(await screen.findByText('Primary LENR theories')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enable every primary LENR theory' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear every primary LENR theory' })).toBeInTheDocument();
  });

  it('None clears only primary theories and leaves context tracks enabled', async () => {
    render(<TheoryTogglePanel />);
    await screen.findByText('Electron Screening');
    await screen.findByText('Stellar MHD Scaling');

    await waitFor(() => {
      const enabled = readEnabledIds();
      expect(enabled).toEqual(expect.arrayContaining([...PRIMARY_IDS, CONTEXT_ID]));
    });

    await userEvent.click(screen.getByRole('button', { name: 'Clear every primary LENR theory' }));

    await waitFor(() => {
      expect(readEnabledIds()).toEqual([CONTEXT_ID]);
    });
  });

  it('All re-enables every primary theory without dropping context selection', async () => {
    render(<TheoryTogglePanel />);
    await screen.findByText('Electron Screening');

    await waitFor(() => {
      expect(readEnabledIds().length).toBeGreaterThan(0);
    });

    await userEvent.click(screen.getByRole('button', { name: 'Clear every primary LENR theory' }));
    await waitFor(() => {
      expect(readEnabledIds()).toEqual([CONTEXT_ID]);
    });

    await userEvent.click(screen.getByRole('button', { name: 'Enable every primary LENR theory' }));

    await waitFor(() => {
      const enabled = readEnabledIds();
      expect(enabled).toEqual(expect.arrayContaining([...PRIMARY_IDS, CONTEXT_ID]));
      expect(enabled).toHaveLength(3);
    });
  });
});
