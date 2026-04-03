/**
 * TheoryDocumentationPanel.test.jsx
 * Phase 4.3: Component tests for updated formula displays.
 * Asserts: P_overlap 8.5×10⁻¹⁶ (not 5×10⁻³), "Delocalized Interface Electrons" (not "Halo Electrons"),
 * nuclear radius 5 fm.
 */

import React from 'react';
import { render, screen } from '../../tests/test-utils';
import TheoryDocumentationPanel from './TheoryDocumentationPanel';

describe('TheoryDocumentationPanel', () => {
  test('renders P_overlap formula with corrected value 8.5×10⁻¹⁶', () => {
    render(<TheoryDocumentationPanel />);
    // Correct formula: P_overlap ≈ 8.5 × 10⁻¹⁶ (not the old 5×10⁻³)
    expect(screen.getByText(/8\.5\s*×\s*10⁻¹⁶/)).toBeInTheDocument();
    expect(screen.getByText(/P_overlap.*exp.*rₙ/)).toBeInTheDocument();
  });

  test('does not display incorrect P_overlap value 5×10⁻³', () => {
    render(<TheoryDocumentationPanel />);
    expect(screen.queryByText(/5 × 10⁻³/)).not.toBeInTheDocument();
  });

  test('renders Delocalized Interface Electrons (not Halo Electrons)', () => {
    render(<TheoryDocumentationPanel />);
    expect(screen.getByText('2. Delocalized Interface Electrons')).toBeInTheDocument();
    expect(screen.getByText(/Delocalized Interface Electrons are weakly bound electrons/)).toBeInTheDocument();
    expect(screen.queryByText(/Halo Electrons/)).not.toBeInTheDocument();
  });

  test('renders nuclear radius 5 fm', () => {
    render(<TheoryDocumentationPanel />);
    expect(screen.getByText(/rₙ = 5 fm \(nuclear core radius\)/)).toBeInTheDocument();
  });

  test('renders Unified LENR Theoretical Framework header', () => {
    render(<TheoryDocumentationPanel />);
    expect(screen.getByText('Unified LENR Theoretical Framework')).toBeInTheDocument();
  });
});
