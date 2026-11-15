import { screen, fireEvent } from '@testing-library/react';
import { render } from '../tests/test-utils';
import TheoryPaperPage from './TheoryPaperPage';
import { FEEDBACK_EMAIL, PUBLIC_GITHUB_MAIN } from '../config/publicLinks';

describe('TheoryPaperPage honesty CTAs (public repo)', () => {
  it('points Corrections tab source CTA to the public GitHub main branch', () => {
    render(<TheoryPaperPage />);
    fireEvent.click(screen.getByRole('tab', { name: /Corrections & Improvements/i }));

    expect(screen.queryByText(/private during invited beta/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Source is public on GitHub/i)).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Source on GitHub/i })).toHaveAttribute(
      'href',
      PUBLIC_GITHUB_MAIN,
    );
    expect(screen.getByRole('link', { name: /Email feedback$/i })).toHaveAttribute(
      'href',
      FEEDBACK_EMAIL,
    );
    expect(screen.getByRole('link', { name: '/LICENSE' })).toHaveAttribute('href', '/LICENSE');
  });

  it('points References Full Paper CTA to the public GitHub main branch', () => {
    render(<TheoryPaperPage />);
    fireEvent.click(screen.getByRole('tab', { name: /References/i }));

    expect(screen.queryByText(/Private repository during invited beta/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Source on GitHub/i })).toHaveAttribute(
      'href',
      PUBLIC_GITHUB_MAIN,
    );
    expect(screen.getByRole('link', { name: /Email feedback$/i })).toHaveAttribute(
      'href',
      FEEDBACK_EMAIL,
    );
  });
});
