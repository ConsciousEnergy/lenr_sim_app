import { screen, fireEvent } from '@testing-library/react';
import { render } from '../tests/test-utils';
import TheoryPaperPage from './TheoryPaperPage';

describe('TheoryPaperPage honesty CTAs (invited beta)', () => {
  it('soft-gates Corrections tab Full Paper GitHub CTA to email source access', () => {
    render(<TheoryPaperPage />);
    fireEvent.click(screen.getByRole('tab', { name: /Corrections & Improvements/i }));

    expect(screen.queryByRole('link', { name: /View Full Paper on GitHub/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Full Paper on GitHub/i })).not.toBeInTheDocument();
    expect(screen.getByText(/private during invited beta/i)).toBeInTheDocument();

    const emailCta = screen.getByRole('link', { name: /Email feedback \/ source access/i });
    expect(emailCta).toHaveAttribute('href', 'mailto:diadon@conscious.energy');
    expect(screen.getByRole('link', { name: '/LICENSE' })).toHaveAttribute('href', '/LICENSE');
  });

  it('soft-gates References Full Paper GitHub CTA to email source access', () => {
    render(<TheoryPaperPage />);
    fireEvent.click(screen.getByRole('tab', { name: /References/i }));

    expect(screen.queryByRole('link', { name: /Full Paper on GitHub/i })).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Email feedback \/ source access/i }),
    ).toHaveAttribute('href', 'mailto:diadon@conscious.energy');
  });
});
