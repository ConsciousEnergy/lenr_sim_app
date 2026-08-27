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
    expect(screen.getByText(/Electron, Neutron, and Proton coupling is all you need/)).toBeInTheDocument();
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
    expect(screen.getByText(/Open Questions Virtual Lab/i)).toBeInTheDocument();
    expect(screen.getByText(/closes under a named mechanism path/i)).toBeInTheDocument();
  });

  test('renders Key Equations Quick Reference panel', () => {
    render(<TheoryPaperPage />);
    expect(screen.getByText('Key Equations Quick Reference')).toBeInTheDocument();
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
});
