import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import LicensePage from './LicensePage';

describe('LicensePage', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test('renders license heading and full GPL text from /LICENSE', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        'GNU GENERAL PUBLIC LICENSE\nVersion 3, 29 June 2007\ncopyleft free software',
    });

    render(<LicensePage />);

    expect(screen.getByTestId('license-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /license/i })).toBeInTheDocument();
    expect(screen.getByText(/GNU General Public License v3.0/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('license-full-text')).toHaveTextContent(
        /GNU GENERAL PUBLIC LICENSE/,
      );
    });

    expect(global.fetch).toHaveBeenCalledWith('/LICENSE');
    expect(screen.getByTestId('license-full-text')).toHaveTextContent(/copyleft free software/);
  });

  test('shows fallback when license fetch fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    render(<LicensePage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Could not load the full license text/i);
    });
    const licenseLinks = screen.getAllByRole('link', { name: '/LICENSE' });
    expect(licenseLinks.length).toBeGreaterThan(0);
    expect(licenseLinks[0]).toHaveAttribute('href', '/LICENSE');
  });
});
