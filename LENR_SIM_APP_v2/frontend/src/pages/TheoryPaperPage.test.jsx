/**
 * TheoryPaperPage.test.jsx
 * Phase 4.3: Component tests for updated formula displays.
 * Asserts: Section 5A "Open Theoretical Challenges" content, corrected formulas.
 */

import React from 'react';
import { render, screen, fireEvent } from '../tests/test-utils';
import TheoryPaperPage from './TheoryPaperPage';

describe('TheoryPaperPage', () => {
  test('renders page header with unified framework title', () => {
    render(<TheoryPaperPage />);
    expect(screen.getByText(/A Unified Theoretical and Mathematical Framework for Low-Energy Nuclear Reactions/)).toBeInTheDocument();
  });

  test('renders Transformer-inspired subtitle without front-matter homage', () => {
    render(<TheoryPaperPage />);
    expect(screen.getByText(/Coupling is all you need/)).toBeInTheDocument();
    // Vaswani homage lives in References only (not the hero / title block).
    expect(screen.queryByText(/Attention Is All You Need/)).not.toBeInTheDocument();
  });

  test('lists Composer and xAI/Grok among AI contributors', () => {
    render(<TheoryPaperPage />);
    expect(screen.getByText(/Composer \(Cursor\)/)).toBeInTheDocument();
    expect(screen.getByText(/Grok 4\.6/)).toBeInTheDocument();
    expect(screen.getByText(/xAI\/Grok/)).toBeInTheDocument();
  });

  test('References tab lists Vaswani homage with a source link', () => {
    render(<TheoryPaperPage />);
    fireEvent.click(screen.getByRole('tab', { name: /References/i }));
    expect(screen.getByText(/\[vaswani2017\] Vaswani/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Attention Is All You Need/).length).toBeGreaterThan(0);
    const arxivLinks = screen.getAllByRole('link', { name: /arXiv:1706\.03762/i });
    expect(arxivLinks.some((el) => el.getAttribute('href') === 'https://arxiv.org/abs/1706.03762')).toBe(true);
  });

  test('renders Section 5A Open Theoretical Challenges accordion', () => {
    render(<TheoryPaperPage />);
    expect(screen.getByText('5A. Open Theoretical Challenges')).toBeInTheDocument();
  });

  test('Section 5A shows MeV energy gap when expanded', () => {
    render(<TheoryPaperPage />);
    const section5a = screen.getByText('5A. Open Theoretical Challenges');
    fireEvent.click(section5a.closest('[class*="MuiAccordionSummary"]') || section5a.parentElement);
    expect(screen.getByText(/MeV energy gap \(how\)/)).toBeInTheDocument();
  });

  test('Section 5A shows radiation suppression content when expanded', () => {
    render(<TheoryPaperPage />);
    const section5a = screen.getByText('5A. Open Theoretical Challenges');
    fireEvent.click(section5a.closest('[class*="MuiAccordionSummary"]') || section5a.parentElement);
    expect(screen.getByText(/Radiation suppression \(how\)/)).toBeInTheDocument();
  });

  test('Section 5A shows statistical feasibility content when expanded', () => {
    render(<TheoryPaperPage />);
    const section5a = screen.getByText('5A. Open Theoretical Challenges');
    fireEvent.click(section5a.closest('[class*="MuiAccordionSummary"]') || section5a.parentElement);
    expect(screen.getByText(/Statistical feasibility \(when\)/)).toBeInTheDocument();
  });

  test('Section 5A shows when/how framing intro', () => {
    render(<TheoryPaperPage />);
    const section5a = screen.getByText('5A. Open Theoretical Challenges');
    fireEvent.click(section5a.closest('[class*="MuiAccordionSummary"]') || section5a.parentElement);
    expect(screen.getAllByText(/Open Questions Virtual Lab/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/closes under a named mechanism path/i)).toBeInTheDocument();
  });

  test('renders Key Equations Quick Reference panel', () => {
    render(<TheoryPaperPage />);
    expect(screen.getByText('Key Equations Quick Reference')).toBeInTheDocument();
  });

  test('screening equation card states Assenbaum domain limit', () => {
    render(<TheoryPaperPage />);
    expect(screen.getByText('Screening Enhancement')).toBeInTheDocument();
    expect(screen.getByText(/Claimed only when Uₑ < E \(EQ-ASSEN-DOM-01\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Material Uₑ ranges are RR-007/i)).toBeInTheDocument();
  });

  test('section 2.1 screening alert separates Assenbaum domain from adiabatic floor', () => {
    render(<TheoryPaperPage />);
    fireEvent.click(screen.getByText('2. Theoretical Framework'));
    const alert = screen.getByTestId('screening-domain-honesty-alert');
    expect(alert).toHaveTextContent(/EQ-ASSEN-DOM-01/);
    expect(alert).toHaveTextContent(/adiabatic gas-target floor/);
    expect(alert).toHaveTextContent(/not the Assenbaum predicate/);
  });

  test('Section 6.1 TSC is labelled speculative and remains open', () => {
    render(<TheoryPaperPage />);
    fireEvent.click(screen.getByText('6. Extended Theoretical Models'));
    expect(screen.getByText(/6\.1 Takahashi Tetrahedral Symmetric Condensate/)).toBeInTheDocument();
    expect(screen.getByText(/open speculative channel/i)).toBeInTheDocument();
    expect(screen.getAllByText(/claim tier: speculative_exploratory/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/trapped_state/)).toBeInTheDocument();
  });

  test('Section 6.11 Letts is EMP, not a shown controlled trigger', () => {
    render(<TheoryPaperPage />);
    fireEvent.click(screen.getByText('6. Extended Theoretical Models'));
    expect(screen.getByText(/6\.11 Letts-Cravens Dual-Laser Stimulation/)).toBeInTheDocument();
    expect(screen.getAllByText(/empirical LENR correlation/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/showed that irradiating/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/controlled triggering mechanism/i)).not.toBeInTheDocument();
  });

  test('Section 6 intro is comparative workbench, not unification endorsement', () => {
    render(<TheoryPaperPage />);
    fireEvent.click(screen.getByText('6. Extended Theoretical Models'));
    expect(screen.getByText(/comparative scientific workbench/i)).toBeInTheDocument();
    expect(screen.queryByText(/mathematical unification/i)).not.toBeInTheDocument();
  });

  test('Section 6.2 Hagelstein is speculative approx and does not close MeV-gap', () => {
    render(<TheoryPaperPage />);
    fireEvent.click(screen.getByText('6. Extended Theoretical Models'));
    expect(screen.getByText(/6\.2 Hagelstein Phonon-Nuclear Coupling/)).toBeInTheDocument();
    expect(screen.queryByText(/is converted into/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/avoiding single high-energy gamma/i)).not.toBeInTheDocument();
    expect(screen.getByText(/this module does not close them/i)).toBeInTheDocument();
  });

  test('Section 6.6 Widom does not claim without dangerous radiation', () => {
    render(<TheoryPaperPage />);
    fireEvent.click(screen.getByText('6. Extended Theoretical Models'));
    expect(screen.getByText(/6\.6 Widom-Larsen Ultra-Low-Momentum Neutrons/)).toBeInTheDocument();
    expect(screen.queryByText(/without dangerous radiation/i)).not.toBeInTheDocument();
    expect(screen.getByText(/electroweak-entrance scaffold/i)).toBeInTheDocument();
  });

  test('Theory-to-Simulation map separates Holmlid UDH from Kim BEC', () => {
    render(<TheoryPaperPage />);
    fireEvent.click(screen.getByText('6. Extended Theoretical Models'));
    expect(screen.getByText(/holmlid_udh/)).toBeInTheDocument();
    expect(screen.getByText(/≠ kim_bec/)).toBeInTheDocument();
    expect(screen.getByText('null_recombination')).toBeInTheDocument();
    expect(screen.getByText('shoulders_evo')).toBeInTheDocument();
  });

  test('Section 5B Science Evidence accordion surfaces Phase E honesty', () => {
    render(<TheoryPaperPage />);
    const section5b = screen.getByText(
      '5B. Science Evidence (Campaign, Ranking, Formalization)',
    );
    fireEvent.click(section5b.closest('[class*="MuiAccordionSummary"]') || section5b.parentElement);
    expect(screen.getByTestId('theory-paper-science-evidence')).toBeInTheDocument();
    expect(screen.getByTestId('science-evidence-lenr-proved')).toHaveTextContent(
      'lenr_proved: false',
    );
    expect(screen.getByTestId('science-evidence-campaign')).toBeInTheDocument();
    expect(screen.getByTestId('science-evidence-avenue-ranking')).toBeInTheDocument();
    expect(screen.getByTestId('science-evidence-formalization')).toBeInTheDocument();
    expect(screen.getByTestId('science-evidence-eq-open-runway')).toBeInTheDocument();
    expect(screen.queryByText(/lenr_proved:\s*true/i)).not.toBeInTheDocument();
  });

  test('Section 5A honesty chips include avenue ranking and runway non-closure', () => {
    render(<TheoryPaperPage />);
    const section5a = screen.getByText('5A. Open Theoretical Challenges');
    fireEvent.click(section5a.closest('[class*="MuiAccordionSummary"]') || section5a.parentElement);
    expect(screen.getByTestId('open-challenges-honesty-chips')).toBeInTheDocument();
    expect(screen.getByText(/avenue ranking ≠ proof/i)).toBeInTheDocument();
    expect(screen.getByText(/closure runway: criteria only/i)).toBeInTheDocument();
    expect(
      screen.getByText('5B. Science Evidence (Campaign, Ranking, Formalization)'),
    ).toBeInTheDocument();
  });

  test('shows app/manuscript version map without inventing a new paper revision', () => {
    render(<TheoryPaperPage />);
    expect(screen.getByTestId('manuscript-revision-chip')).toHaveTextContent(
      /v0\.3\.7-beta/,
    );
    expect(screen.getByTestId('app-manuscript-version-map')).toHaveTextContent(
      /0\.3\.9-beta/,
    );
    expect(screen.getByTestId('app-manuscript-version-map')).toHaveTextContent(
      /v0\.3\.7-beta \(revised 2026-09-25\)/,
    );
  });

  test('Section 4.2 Typical Results are labelled literature reports', () => {
    render(<TheoryPaperPage />);
    fireEvent.click(screen.getByText(/4\. Experimental Validation/i));
    const block = screen.getByTestId('section-42-typical-results');
    expect(block).toHaveTextContent(/literature reports/i);
    expect(block).toHaveTextContent(/not measurements produced or validated/i);
  });

  test('Section 3 marks Poisson–Schrödinger / FEM as aspirational not live', () => {
    render(<TheoryPaperPage />);
    fireEvent.click(screen.getByText(/3\. Computational Methods/i));
    expect(screen.getByTestId('theory-paper-methods-aspirational')).toHaveTextContent(
      /not live on public beta/i,
    );
    expect(screen.getByText(/aspirational research methods/i)).toBeInTheDocument();
  });
});
