import { screen } from '@testing-library/react';
import { render } from '../tests/test-utils';
import DocumentationPage from './DocumentationPage';

describe('DocumentationPage source-access honesty', () => {
  it('soft-gates private GitHub Repository / Issues / git clone CTAs', () => {
    render(<DocumentationPage />);

    expect(screen.queryByRole('link', { name: /GitHub Repository/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /GitHub Issues/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/git clone https:\/\/github\.com\//i)).not.toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Email for source access/i })).toHaveAttribute(
      'href',
      'mailto:diadon@conscious.energy',
    );
    expect(screen.getByRole('link', { name: /GPL-3\.0 \/LICENSE/i })).toHaveAttribute(
      'href',
      '/LICENSE',
    );
    expect(screen.getByTestId('docs-source-private-notice')).toHaveTextContent(/still private/i);
    expect(screen.getByRole('link', { name: /diadon@conscious\.energy/i })).toHaveAttribute(
      'href',
      'mailto:diadon@conscious.energy',
    );
  });
});
