import { screen } from '@testing-library/react';
import { render } from '../tests/test-utils';
import TeamPage from './TeamPage';

describe('TeamPage honesty CTAs (invited beta)', () => {
  it('replaces View on GitHub with email source-access CTA', () => {
    render(<TeamPage />);
    expect(screen.queryByRole('link', { name: /View on GitHub/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^GitHub$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Email feedback \/ source access/i })).toHaveAttribute(
      'href',
      'mailto:diadon@conscious.energy',
    );
  });

  it('notes the repository is private during invited beta', () => {
    render(<TeamPage />);
    expect(screen.getByText(/private during invited beta/i)).toBeInTheDocument();
  });
});
