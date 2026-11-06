import { screen } from '@testing-library/react';
import { render } from '../tests/test-utils';
import TeamPage from './TeamPage';

describe('TeamPage source-access honesty', () => {
  it('replaces View on GitHub with email + /LICENSE while repo is private', () => {
    render(<TeamPage />);

    expect(screen.queryByRole('link', { name: /View on GitHub/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^GitHub$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Email for source access/i })).toHaveAttribute(
      'href',
      'mailto:diadon@conscious.energy',
    );
    expect(screen.getByRole('link', { name: /GPL-3\.0 \/LICENSE/i })).toHaveAttribute(
      'href',
      '/LICENSE',
    );
  });
});
