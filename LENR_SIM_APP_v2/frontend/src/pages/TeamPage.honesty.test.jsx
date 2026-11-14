import { screen } from '@testing-library/react';
import { render } from '../tests/test-utils';
import TeamPage from './TeamPage';
import { DONATIONS_URL, FEEDBACK_EMAIL, PUBLIC_GITHUB_MAIN } from '../config/publicLinks';

describe('TeamPage honesty CTAs (public beta)', () => {
  it('points source access to the public GitHub main branch', () => {
    render(<TeamPage />);
    expect(screen.getByRole('link', { name: /Source on GitHub/i })).toHaveAttribute(
      'href',
      PUBLIC_GITHUB_MAIN,
    );
    expect(screen.getByRole('link', { name: /Email feedback$/i })).toHaveAttribute(
      'href',
      FEEDBACK_EMAIL,
    );
    expect(screen.queryByRole('link', { name: /Email feedback \/ source access/i })).not.toBeInTheDocument();
  });

  it('links donations externally and no longer claims a private repo', () => {
    render(<TeamPage />);
    expect(screen.queryByText(/private during invited beta/i)).not.toBeInTheDocument();
    const donations = screen.getByRole('link', { name: /Donations/i });
    expect(donations).toHaveAttribute('href', DONATIONS_URL);
    expect(donations).toHaveAttribute('target', '_blank');
    expect(donations).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
