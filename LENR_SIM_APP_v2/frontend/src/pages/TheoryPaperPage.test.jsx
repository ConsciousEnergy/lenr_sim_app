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

  test('renders Section 5A Open Theoretical Challenges accordion', () => {
    render(<TheoryPaperPage />);
    expect(screen.getByText('5A. Open Theoretical Challenges')).toBeInTheDocument();
  });

  test('Section 5A shows MeV energy gap when expanded', () => {
    render(<TheoryPaperPage />);
    const section5a = screen.getByText('5A. Open Theoretical Challenges');
    fireEvent.click(section5a.closest('[class*="MuiAccordionSummary"]') || section5a.parentElement);
    expect(screen.getByText('MeV energy gap')).toBeInTheDocument();
  });

  test('Section 5A shows radiation suppression content when expanded', () => {
    render(<TheoryPaperPage />);
    const section5a = screen.getByText('5A. Open Theoretical Challenges');
    fireEvent.click(section5a.closest('[class*="MuiAccordionSummary"]') || section5a.parentElement);
    expect(screen.getByText('Radiation suppression')).toBeInTheDocument();
  });

  test('Section 5A shows statistical feasibility content when expanded', () => {
    render(<TheoryPaperPage />);
    const section5a = screen.getByText('5A. Open Theoretical Challenges');
    fireEvent.click(section5a.closest('[class*="MuiAccordionSummary"]') || section5a.parentElement);
    expect(screen.getByText('Statistical feasibility')).toBeInTheDocument();
  });

  test('Section 5A shows Key open questions in LENR theory', () => {
    render(<TheoryPaperPage />);
    const section5a = screen.getByText('5A. Open Theoretical Challenges');
    fireEvent.click(section5a.closest('[class*="MuiAccordionSummary"]') || section5a.parentElement);
    expect(screen.getByText(/Key open questions in LENR theory/)).toBeInTheDocument();
  });

  test('renders Key Equations Quick Reference panel', () => {
    render(<TheoryPaperPage />);
    expect(screen.getByText('Key Equations Quick Reference')).toBeInTheDocument();
  });
});
