import { screen } from '@testing-library/react';
import { render } from '../tests/test-utils';
import AboutPage from './AboutPage';
import { APP_VERSION } from '../config/version';

describe('AboutPage honesty copy', () => {
  it('describes a research preview without claiming current public open-source access', () => {
    render(<AboutPage />);
    expect(screen.getByText(/public research preview/i)).toBeInTheDocument();
    expect(screen.getByText(/repository is still private/i)).toBeInTheDocument();
    expect(screen.queryByText(/freely available for anyone to use, study, modify/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /GitHub Repository/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Email feedback \/ source access/i })).toHaveAttribute(
      'href',
      'mailto:diadon@conscious.energy',
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
});

