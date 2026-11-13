import { screen } from '@testing-library/react';
import { render } from '../tests/test-utils';
import AboutPage from './AboutPage';
import { APP_VERSION } from '../config/version';
import {
  DONATIONS_URL,
  FEEDBACK_EMAIL,
  PUBLIC_GITHUB_MAIN,
  PUBLIC_GITHUB_REPO_LABEL,
} from '../config/publicLinks';

describe('AboutPage honesty copy', () => {
  it('describes a research preview with public GitHub source access', () => {
    render(<AboutPage />);
    expect(screen.getByText(/public research preview/i)).toBeInTheDocument();
    expect(screen.queryByText(/repository is still private/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: PUBLIC_GITHUB_REPO_LABEL })).toHaveAttribute(
      'href',
      PUBLIC_GITHUB_MAIN,
    );
    expect(screen.getByRole('link', { name: /Source on GitHub/i })).toHaveAttribute(
      'href',
      PUBLIC_GITHUB_MAIN,
    );
    expect(screen.getByRole('link', { name: /Email feedback$/i })).toHaveAttribute(
      'href',
      FEEDBACK_EMAIL,
    );
  });

  it('maps app build to manuscript revision aligned to the live train', () => {
    render(<AboutPage />);
    const versionMap = screen.getByText(/Version map:/i);
    expect(versionMap).toHaveTextContent(APP_VERSION);
    expect(versionMap).toHaveTextContent(`v${APP_VERSION} (revised 2026-11-11)`);
  });

  it('discloses invited-beta science-copy limitations', () => {
    render(<AboutPage />);
    const block = screen.getByTestId('about-known-limitations');
    expect(block).toHaveTextContent(/governance saturation ceiling/i);
    expect(block).toHaveTextContent(/not nuclear confirmation/i);
    expect(block).toHaveTextContent(/literature reports/i);
    expect(block).toHaveTextContent(/not a count of validated mechanisms/i);
  });

  it('ends with a Special Thanks memorial section', () => {
    render(<AboutPage />);
    const block = screen.getByTestId('about-special-thanks');
    expect(block).toHaveTextContent(/Special Thanks/);
    expect(block).toHaveTextContent(/Special thanks goes to the/);
    expect(block).toHaveTextContent(/loving memory of Alan Smith, Melvin Miles, and Michael McKubre/);
    expect(block).toHaveTextContent('Abiit autem non sum oblitus');
    const forumLink = screen.getByRole('link', { name: /LENR-Forum\.com/i });
    expect(forumLink).toHaveAttribute('href', 'https://www.lenr-forum.com/');
    expect(forumLink).toHaveAttribute('target', '_blank');
    expect(forumLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('places Special Thanks immediately after the Conscious Energy action bar', () => {
    render(<AboutPage />);
    const actions = screen.getByTestId('about-conscious-energy-actions');
    const thanks = screen.getByTestId('about-special-thanks');
    expect(actions.compareDocumentPosition(thanks) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(actions.nextElementSibling?.tagName).toBe('HR');
    expect(actions.nextElementSibling?.nextElementSibling).toBe(thanks);
    expect(screen.getByRole('link', { name: /Visit Website/i }).closest('[data-testid="about-conscious-energy-actions"]')).toBe(actions);
    expect(screen.getByRole('link', { name: /Email feedback$/i }).closest('[data-testid="about-conscious-energy-actions"]')).toBe(actions);
    expect(screen.getByRole('link', { name: /Donations/i })).toHaveAttribute('href', DONATIONS_URL);
    expect(screen.getByRole('link', { name: /Donations/i })).toHaveAttribute('target', '_blank');
  });
});
