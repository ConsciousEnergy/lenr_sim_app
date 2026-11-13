import { screen } from '@testing-library/react';
import { render } from '../tests/test-utils';
import DocumentationPage from './DocumentationPage';
import { FEEDBACK_EMAIL, PUBLIC_GITHUB_MAIN } from '../config/publicLinks';

describe('DocumentationPage honesty CTAs (public beta)', () => {
  it('points source access to the public GitHub main branch', () => {
    render(<DocumentationPage />);
    const sourceLinks = screen.getAllByRole('link', { name: /Source on GitHub/i });
    expect(sourceLinks.length).toBeGreaterThan(0);
    sourceLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', PUBLIC_GITHUB_MAIN);
    });
    expect(screen.getAllByRole('link', { name: /^Email feedback$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /^Email feedback$/i })[0]).toHaveAttribute(
      'href',
      FEEDBACK_EMAIL,
    );
    expect(screen.queryByRole('link', { name: /Email feedback \/ source access/i })).not.toBeInTheDocument();
  });

  it('does not claim the repository is private or advertise Swagger UI', () => {
    render(<DocumentationPage />);
    expect(screen.queryByText(/private during invited beta/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Source access during invited beta/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Open Swagger UI/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Open Swagger UI/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Public source on GitHub/i)).toBeInTheDocument();
  });
});
