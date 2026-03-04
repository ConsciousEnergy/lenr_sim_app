/**
 * OpenChallengesSection.test.jsx
 * Phase 4.3: Component tests for Section 5A Open Theoretical Challenges.
 * Asserts: MeV gap, radiation suppression, statistical feasibility content.
 */

import React from 'react';
import { render, screen } from '../tests/test-utils';
import OpenChallengesSection from './OpenChallengesSection';

describe('OpenChallengesSection', () => {
  test('renders Section 5A header', () => {
    render(<OpenChallengesSection />);
    expect(screen.getByText('5A. Open Theoretical Challenges')).toBeInTheDocument();
  });

  test('renders MeV energy gap content', () => {
    render(<OpenChallengesSection />);
    expect(screen.getByText('MeV energy gap')).toBeInTheDocument();
    expect(screen.getByText(/Mechanism for distributing 23\.8 MeV into lattice\/electronic modes without single gamma emission remains debated/)).toBeInTheDocument();
  });

  test('renders radiation suppression content', () => {
    render(<OpenChallengesSection />);
    expect(screen.getByText('Radiation suppression')).toBeInTheDocument();
    expect(screen.getByText(/How LENR systems suppress dangerous radiation while releasing nuclear-scale energy/)).toBeInTheDocument();
  });

  test('renders statistical feasibility content', () => {
    render(<OpenChallengesSection />);
    expect(screen.getByText('Statistical feasibility')).toBeInTheDocument();
    expect(screen.getByText(/Whether observed excess heat and transmutations are statistically distinguishable from background/)).toBeInTheDocument();
  });

  test('renders companion documents links', () => {
    render(<OpenChallengesSection />);
    expect(screen.getByText('Companion Documents')).toBeInTheDocument();
  });
});
