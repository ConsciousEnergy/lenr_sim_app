import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../tests/test-utils';
import BetaNotice from './BetaNotice';

const DISMISS_KEY = 'lenr-beta-notice-dismissed';

beforeEach(() => {
  window.localStorage.removeItem(DISMISS_KEY);
});

describe('BetaNotice', () => {
  it('renders the public-beta research-preview banner', () => {
    render(<BetaNotice monitorApi={false} />);
    expect(screen.getByTestId('beta-banner')).toHaveTextContent(/Public beta/);
    expect(screen.getByTestId('beta-banner')).toHaveTextContent(/model output/);
    expect(screen.getByRole('link', { name: /Send beta feedback/i })).toHaveAttribute(
      'href',
      expect.stringContaining('github.com/ConsciousEnergy/lenr_sim_app/issues/new'),
    );
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
});
