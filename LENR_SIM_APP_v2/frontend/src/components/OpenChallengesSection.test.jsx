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
    expect(screen.getByText(/MeV energy gap \(how\)/)).toBeInTheDocument();
    expect(screen.getByText(/Mechanism for distributing 23\.8 MeV into lattice\/electronic modes without single gamma emission remains debated/)).toBeInTheDocument();
  });

  test('renders radiation suppression content', () => {
    render(<OpenChallengesSection />);
    expect(screen.getByText(/Radiation suppression \(how\)/)).toBeInTheDocument();
    expect(screen.getByText(/Detector UL and/)).toBeInTheDocument();
  });

  test('renders statistical feasibility content', () => {
    render(<OpenChallengesSection />);
    expect(screen.getByText(/Statistical feasibility \(when\)/)).toBeInTheDocument();
    expect(screen.getByText(/calorimetric floor under the selected hypothesis/)).toBeInTheDocument();
  });

  test('renders companion documents links', () => {
    render(<OpenChallengesSection />);
    expect(screen.getByText('Companion Documents')).toBeInTheDocument();
  });

  test('renders honesty chips without claiming proof or closure', () => {
    render(<OpenChallengesSection />);
    const chips = screen.getByTestId('open-challenges-honesty-chips');
    expect(chips).toBeInTheDocument();
    expect(chips).toHaveTextContent(/lenr_proved: false/i);
    expect(chips).toHaveTextContent(/avenue ranking ≠ proof/i);
    expect(chips).toHaveTextContent(/closure runway: criteria only/i);
    expect(chips).toHaveTextContent(/EQ-OPEN-MEV-01: OPEN/);
    expect(screen.queryByText(/lenr_proved:\s*true/i)).not.toBeInTheDocument();
  });
});
