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

  it('maps app build to manuscript revision without inventing a new paper train', () => {
    render(<AboutPage />);
    expect(screen.getByText(new RegExp(APP_VERSION))).toBeInTheDocument();
    expect(screen.getByText(/v0\.3\.7-beta \(revised 2026-09-25\)/)).toBeInTheDocument();
  });

  it('discloses invited-beta science-copy limitations', () => {
    render(<AboutPage />);
    const block = screen.getByTestId('about-known-limitations');
    expect(block).toHaveTextContent(/governance saturation ceiling/i);
    expect(block).toHaveTextContent(/not nuclear confirmation/i);
    expect(block).toHaveTextContent(/literature reports/i);
    expect(block).toHaveTextContent(/not a count of validated mechanisms/i);
  });
});
