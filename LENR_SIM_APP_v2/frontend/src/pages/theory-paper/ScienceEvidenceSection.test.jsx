/**
 * ScienceEvidenceSection — Phase E honesty surfaces on Theory Paper.
 */
import React from 'react';
import { render, screen } from '../../tests/test-utils';
import ScienceEvidenceSection from './ScienceEvidenceSection';
import { OPEN_EQ_IDS } from '../../config/unifiedTheoryScienceEvidence';

describe('ScienceEvidenceSection', () => {
  test('renders honesty banner with lenr_proved false', () => {
    render(<ScienceEvidenceSection />);
    expect(screen.getByTestId('theory-paper-science-evidence')).toBeInTheDocument();
    expect(screen.getByTestId('science-evidence-lenr-proved')).toHaveTextContent(
      'lenr_proved: false',
    );
    expect(
      screen.getAllByText(/scenario_table_not_posterior/).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/lenr_proved:\s*true/i)).not.toBeInTheDocument();
  });

  test('surfaces cavitation_collapse campaign pointer', () => {
    render(<ScienceEvidenceSection />);
    expect(screen.getByTestId('science-evidence-campaign')).toHaveTextContent(
      /Campaign \/ reviewer-pack evidence/i,
    );
    expect(screen.getAllByText(/cavitation_collapse/).length).toBeGreaterThan(0);
    expect(screen.getByText(/modelled enhancement \/ contested hydro/i)).toBeInTheDocument();
  });

  test('avenue ranking summary uses non-proof language', () => {
    render(<ScienceEvidenceSection />);
    expect(screen.getByTestId('science-evidence-avenue-ranking')).toBeInTheDocument();
    expect(
      screen.getByText(/not a Bayesian posterior that LENR is proved/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId('science-evidence-avenue-list')).toHaveTextContent(
      /cavitation_collapse_uq/,
    );
    expect(screen.getByTestId('science-evidence-avenue-list')).toHaveTextContent(
      /miles_heat_helium_q/,
    );
  });

  test('formalization states bounds are not empirical closure', () => {
    render(<ScienceEvidenceSection />);
    expect(screen.getByTestId('science-evidence-formalization')).toBeInTheDocument();
    expect(screen.getByText(/Bounds ≠ empirical closure/i)).toBeInTheDocument();
    expect(screen.getByText(/CollapseBounds clamp algebra/i)).toBeInTheDocument();
    expect(screen.getByText(/does not prove LENR occurs/i)).toBeInTheDocument();
  });

  test('EQ-OPEN runway keeps all obligations OPEN', () => {
    render(<ScienceEvidenceSection />);
    expect(screen.getByTestId('science-evidence-eq-open-runway')).toBeInTheDocument();
    expect(
      screen.getByText(/all listed obligations remain OPEN/i),
    ).toBeInTheDocument();
    OPEN_EQ_IDS.forEach((id) => {
      expect(screen.getAllByText(new RegExp(`${id}: OPEN`)).length).toBeGreaterThan(0);
      expect(screen.getByTestId(`runway-obligation-${id}`)).toHaveTextContent(/OPEN/);
      expect(screen.getByTestId(`runway-claim-tier-${id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`runway-affirmative-tier-${id}`)).toBeInTheDocument();
    });
    expect(screen.queryByText(/EQ-OPEN-.*:\s*CLOSED/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('science-evidence-runway-criteria')).toHaveTextContent(
      /Affirmative:/i,
    );
    expect(screen.getByTestId('science-evidence-runway-criteria')).toHaveTextContent(
      /Falsification:/i,
    );
    expect(
      screen.getByTestId('runway-citation-EQ-OPEN-EC-01-tennfors2013'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('runway-citation-EQ-OPEN-YIELD-01-miles1993'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('runway-claim-tier-EQ-OPEN-EC-01')).toHaveAttribute(
      'data-claim-tier',
      'speculative_exploratory',
    );
    expect(screen.getByTestId('runway-claim-tier-EQ-OPEN-YIELD-01')).toHaveAttribute(
      'data-claim-tier',
      'empirical_lenr_correlation',
    );
  });

  test('surfaces unmet ≥5σ discovery bar and enriched campaign N', () => {
    render(<ScienceEvidenceSection />);
    expect(screen.getByTestId('science-evidence-5sigma')).toHaveTextContent(/not_met/i);
    expect(screen.getByTestId('science-evidence-5sigma-chip')).toHaveTextContent(/not met/i);
    expect(screen.getByTestId('science-evidence-campaign-n')).toHaveTextContent(/N=20/);
    expect(screen.getByTestId('science-evidence-uq-samples')).toHaveTextContent(/UQ=32/);
    expect(screen.getByTestId('science-evidence-moe-pairing')).toHaveTextContent(/unverified/);
    expect(screen.getByText(/pyyhtia-cr39-cavitation-2026/i)).toBeInTheDocument();
    expect(screen.queryByText(/lenr_proved:\s*true/i)).not.toBeInTheDocument();
  });
});
