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

  it('shows Bryan Chris White as a highlighted guidance note under the contributor grid', () => {
    render(<TeamPage />);
    const note = screen.getByTestId('bryan-guidance-note');
    expect(note).toHaveTextContent('Bryan Chris White');
    expect(note).toHaveTextContent('Infrastructure / Stack Guidance');
    // Not a peer card in the contributor grid
    expect(screen.getByText('Diadon Acs with Conscious Energy').closest('[data-testid="bryan-guidance-note"]')).toBeNull();
    expect(screen.getByText('Physics Contributors').closest('[data-testid="bryan-guidance-note"]')).toBeNull();
    expect(screen.getByText('Research Community').closest('[data-testid="bryan-guidance-note"]')).toBeNull();
    const bryanSite = screen.getByRole('link', { name: /Bryan Chris White website/i });
    expect(bryanSite).toHaveAttribute('href', 'https://bryanchriswhite.com/');
    expect(bryanSite).toHaveAttribute('target', '_blank');
    expect(bryanSite).toHaveAttribute('rel', 'noopener noreferrer');
    // Contributor peer cards stay unlinked
    expect(screen.getByText('Diadon Acs with Conscious Energy').closest('a')).toBeNull();
    expect(screen.getByText('Physics Contributors').closest('a')).toBeNull();
    expect(screen.getByText('Research Community').closest('a')).toBeNull();
  });
});
