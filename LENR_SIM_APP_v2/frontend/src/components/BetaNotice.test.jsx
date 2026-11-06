import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../tests/test-utils';
import BetaNotice from './BetaNotice';

jest.mock('../analytics/flags', () => {
  const actual = jest.requireActual('../analytics/flags');
  return {
    ...actual,
    useMaintenanceHideRun: jest.fn(() => false),
  };
});

const { useMaintenanceHideRun } = require('../analytics/flags');

const DISMISS_KEY = 'lenr-beta-notice-dismissed';

beforeEach(() => {
  window.localStorage.removeItem(DISMISS_KEY);
  useMaintenanceHideRun.mockReturnValue(false);
});

describe('BetaNotice', () => {
  it('renders the public-beta research-preview banner', () => {
    render(<BetaNotice monitorApi={false} />);
    expect(screen.getByTestId('beta-banner')).toHaveTextContent(/Public beta/);
    expect(screen.getByTestId('beta-banner')).toHaveTextContent(/model output/);
    expect(screen.getByTestId('beta-banner')).toHaveTextContent(
      /LENR is still an experimental inquiry/,
    );
    expect(screen.getByRole('link', { name: 'diadon@conscious.energy' })).toHaveAttribute(
      'href',
      'mailto:diadon@conscious.energy',
    );
    expect(screen.getByTestId('beta-banner')).toHaveTextContent(/while the repository is private/);
    expect(
      screen.queryByRole('link', { name: /Send beta feedback/i }),
    ).not.toBeInTheDocument();
  });

  it('hides the banner after dismiss and remembers it in localStorage', async () => {
    render(<BetaNotice monitorApi={false} />);
    fireEvent.click(screen.getByLabelText(/Dismiss beta notice/i));
    await waitFor(() => {
      expect(screen.queryByTestId('beta-banner')).not.toBeInTheDocument();
    });
    expect(window.localStorage.getItem(DISMISS_KEY)).toBe('1');
  });

  it('does not show the API-unreachable alert when monitoring is off', () => {
    render(<BetaNotice monitorApi={false} />);
    expect(screen.queryByTestId('api-unreachable-alert')).not.toBeInTheDocument();
  });

  it('shows maintenance hide-run alert when the kill-switch flag is on', () => {
    useMaintenanceHideRun.mockReturnValue(true);
    render(<BetaNotice monitorApi={false} />);
    expect(screen.getByTestId('maintenance-hide-run-alert')).toHaveTextContent(
      /Runs temporarily unavailable/,
    );
    expect(screen.getByTestId('maintenance-hide-run-alert')).toHaveTextContent(
      /not a physics result/,
    );
  });
});
