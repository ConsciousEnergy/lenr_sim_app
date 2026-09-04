/**
 * TheoryPage.test.jsx
 * Locks Theory Guide timeline honesty: retracted Paneth, Miles EMP,
 * Huang contested Scientific Reports (not Nature), Takahashi TSC still open.
 */

import React from 'react';
import { render, screen, fireEvent } from '../tests/test-utils';
import TheoryPage from './TheoryPage';

function expandHistoryAccordion() {
  fireEvent.click(
    screen.getByText(/Historical foundations and contested experiments \(1926-2026\)/)
  );
}

describe('TheoryPage historical timeline', () => {
  test('accordion title covers 1926-2026 contested experiments', () => {
    render(<TheoryPage />);
    expect(
      screen.getByText(/Historical foundations and contested experiments \(1926-2026\)/)
    ).toBeInTheDocument();
  });

  test('Paneth & Peters are framed as retracted, not validated fusion', () => {
    render(<TheoryPage />);
    expandHistoryAccordion();
    expect(screen.getByText(/Paneth & Peters/)).toBeInTheDocument();
    expect(screen.getByText(/retracted as glass\/asbestos artifacts/i)).toBeInTheDocument();
    expect(screen.getByText(/Not electrolysis, not deuterium/i)).toBeInTheDocument();
  });

  test('Miles heat-helium is EMP, not nuclear proof, and stronger than Huang', () => {
    render(<TheoryPage />);
    expandHistoryAccordion();
    expect(screen.getByText(/1993 — Miles/)).toBeInTheDocument();
    expect(screen.getByText(/Claim-tier EMP, not proof/i)).toBeInTheDocument();
    expect(screen.getByText(/Stronger EMP than Huang 2024/i)).toBeInTheDocument();
  });

  test('Huang 2024 is contested EMP in Scientific Reports, not Nature', () => {
    render(<TheoryPage />);
    expandHistoryAccordion();
    expect(screen.getAllByText(/Huang et al\./).length).toBeGreaterThan(0);
    expect(screen.getByText(/Scientific Reports 14, 214/i)).toBeInTheDocument();
    expect(screen.getByText(/contested EMP/i)).toBeInTheDocument();
    expect(screen.getByText(/Fomitchev-Zamilov critique/i)).toBeInTheDocument();
    expect(screen.getByText(/not D\+D → ⁴He 23\.8 MeV/i)).toBeInTheDocument();
    expect(screen.queryByText(/Nature journal/i)).not.toBeInTheDocument();
    expect(screen.getByText(/does not close the acoustic or multi-body CMNS class/i)).toBeInTheDocument();
  });

  test('Takahashi TSC remains an open SPEC channel', () => {
    render(<TheoryPage />);
    expandHistoryAccordion();
    expect(screen.getByText(/Takahashi/)).toBeInTheDocument();
    expect(screen.getByText(/tetrahedral symmetric condensate \(TSC\)/i)).toBeInTheDocument();
    expect(screen.getByText(/claim-tier SPEC/i)).toBeInTheDocument();
    expect(
      screen.getByText(/not closed by criticism of unrelated experiments/i)
    ).toBeInTheDocument();
  });

  test('caption states criticism does not close a mechanism class', () => {
    render(<TheoryPage />);
    expandHistoryAccordion();
    expect(
      screen.getByText(/does not close a mechanism class/i)
    ).toBeInTheDocument();
    const gapLink = screen.getByRole('link', { name: /Open-question corpus gaps/i });
    expect(gapLink.getAttribute('href')).toContain('OPEN_QUESTION_CORPUS_GAPS.md');
  });
});
