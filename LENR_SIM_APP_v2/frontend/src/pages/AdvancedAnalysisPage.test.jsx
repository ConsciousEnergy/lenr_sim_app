/**
 * Advanced Analysis Page - data-source coherence
 *
 * Covers the navigation/state loop: a persisted bubble-lattice simulation used to
 * satisfy a combined `hasData` gate, so the page rendered as ready while the
 * theory-dependent tabs stayed permanently empty and every empty-state CTA sent the
 * user back to a page whose dominant action refilled the wrong data source.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

const mockUsePhysics = jest.fn();

jest.mock('../contexts/PhysicsContext', () => ({
  usePhysics: () => mockUsePhysics(),
}));

jest.mock('../components/layout/AppLayout', () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>,
}));

// eslint-disable-next-line import/first
import AdvancedAnalysisPage from './AdvancedAnalysisPage';

const SIMULATION_ONLY = {
  simulationResult: {
    collapse_results: {
      min_radius_um: 0.01,
      max_temperature_k: 10000,
      max_pressure_bar: 100000,
      compression_ratio: 1000,
      collapse_time_us: 56.578,
      peak_enhancement: 1e5,
    },
    peak_conditions: {
      temperature_k: 10000,
      pressure_gpa: 10,
      enhancement_factor: 1e5,
      enhancement_breakdown: {
        total: 1e5,
        screening: 9897.13,
        phonon: 55.11,
        qed: 1e5,
        casimir: 1e5,
        rydberg: 1e5,
        compression: 1e5,
        loading: 2.4621,
        saturation: {
          ceiling: 1e5,
          any_saturated: true,
          saturated_mechanisms: ['casimir', 'compression', 'qed', 'rydberg', 'total'],
          mechanisms: {
            total: { value: 1e5, log10_value_raw: 38.83, is_saturated: true, ceiling: 1e5 },
            screening: { value: 9897.13, log10_value_raw: 4.0, is_saturated: false, ceiling: 1e5 },
            phonon: { value: 55.11, log10_value_raw: 1.74, is_saturated: false, ceiling: 1e5 },
            qed: { value: 1e5, log10_value_raw: 12.0, is_saturated: true, ceiling: 1e5 },
            casimir: { value: 1e5, log10_value_raw: 6.0, is_saturated: true, ceiling: 1e5 },
            rydberg: { value: 1e5, log10_value_raw: 8.7, is_saturated: true, ceiling: 1e5 },
            compression: { value: 1e5, log10_value_raw: 6.0, is_saturated: true, ceiling: 1e5 },
            loading: { value: 2.4621, log10_value_raw: 0.39, is_saturated: false, ceiling: 1e5 },
          },
        },
      },
    },
    proton_phases: { FREE: 0.0127, SCREENED: 0.5145, CAPTURE_READY: 0.3546, NUCLEAR: 0.1182 },
  },
  theoryResult: null,
};

const THEORY_ONLY = {
  simulationResult: null,
  theoryResult: {
    combined_enhancement: 1234,
    total_energy_watts: 0.5,
    per_theory: [
      {
        theory_id: 'electron_screening',
        theory_name: 'Electron Screening',
        enhancement_factor: 9897,
        confidence: 0.8,
        observables: { U_screen_eV: 800, lambda_D_nm: 0.1 },
      },
    ],
  },
};

function renderPage(contextValue) {
  mockUsePhysics.mockReturnValue(contextValue);
  return render(
    <MemoryRouter>
      <AdvancedAnalysisPage />
    </MemoryRouter>,
  );
}

describe('AdvancedAnalysisPage data-source coherence', () => {
  afterEach(() => {
    mockUsePhysics.mockReset();
  });

  it('warns that theory data is missing when only simulation data is present', () => {
    renderPage(SIMULATION_ONLY);
    expect(
      screen.getByText(/Theory Summary and the per-theory observables stay/i),
    ).toBeInTheDocument();
  });

  it('warns that simulation data is missing when only theory data is present', () => {
    renderPage(THEORY_ONLY);
    expect(screen.getByText(/Bubble Collapse stays empty/i)).toBeInTheDocument();
  });

  it('routes users to the testbed tab, not the bare unified-theory page', () => {
    renderPage(SIMULATION_ONLY);
    const links = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
      .filter((href) => href && href.includes('unified-theory'));

    expect(links.length).toBeGreaterThan(0);
    links.forEach((href) => {
      expect(href).toContain('tab=testbed');
    });
  });

  it('shows an empty state naming both data sources when nothing has been run', () => {
    renderPage({ simulationResult: null, theoryResult: null });
    expect(screen.getByText(/No Analysis Data Available/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Theory Testbed/i })).toBeInTheDocument();
  });

  it('treats an empty per_theory array as no theory data', () => {
    renderPage({
      simulationResult: SIMULATION_ONLY.simulationResult,
      theoryResult: { per_theory: [] },
    });
    expect(
      screen.getByText(/Theory Summary and the per-theory observables stay/i),
    ).toBeInTheDocument();
  });
});

describe('AdvancedAnalysisPage saturation reporting', () => {
  afterEach(() => {
    mockUsePhysics.mockReset();
  });

  it('flags that saturated mechanisms are a display ceiling', () => {
    renderPage(SIMULATION_ONLY);
    expect(screen.getByText(/claim-tier display ceiling/i)).toBeInTheDocument();
  });

  it('shows the uncapped magnitude so identical values stay distinguishable', () => {
    renderPage(SIMULATION_ONLY);
    // qed, casimir/compression and rydberg all display 1.0000e+5 but differ in raw
    // magnitude; the raw annotation is what makes the breakdown informative.
    expect(screen.getByText(/raw ≈ 10\^12\.0/)).toBeInTheDocument();
    expect(screen.getByText(/raw ≈ 10\^8\.7/)).toBeInTheDocument();
    expect(screen.getByText(/raw ≈ 10\^38\.8/)).toBeInTheDocument();
  });

  it('does not render the saturation metadata block as a mechanism card', () => {
    renderPage(SIMULATION_ONLY);
    expect(screen.queryByText(/^saturation$/i)).not.toBeInTheDocument();
  });
});
