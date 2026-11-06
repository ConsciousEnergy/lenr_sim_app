import { screen } from '@testing-library/react';
import { render } from '../tests/test-utils';
import DocumentationPage from './DocumentationPage';

describe('DocumentationPage honesty CTAs (invited beta)', () => {
  it('does not advertise private-repo GitHub Repository / Issues CTAs', () => {
    render(<DocumentationPage />);
    expect(screen.queryByRole('link', { name: /GitHub Repository/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /GitHub Issues/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Email feedback \/ source access/i })).toHaveAttribute(
      'href',
      'mailto:diadon@conscious.energy',
    );
  });

  it('states the repository is private during invited beta', () => {
    render(<DocumentationPage />);
    expect(screen.getByText(/private during invited beta/i)).toBeInTheDocument();
    expect(screen.getByText(/Public GitHub Issues are unavailable/i)).toBeInTheDocument();
  });
});
