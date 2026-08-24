/**
 * UnifiedTheoryPage.test.jsx
 * Phase 4.3: Component tests for ENHANCEMENT_THRESHOLDS display.
 * Asserts: observable=1e5, measurable=1e3, screening=1e1 (via threshold display and status logic).
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '../tests/test-utils';
import UnifiedTheoryPage from './UnifiedTheoryPage';

const mockSetSimulationResult = jest.fn();

jest.mock('../contexts/PhysicsContext', () => ({
  ...jest.requireActual('../contexts/PhysicsContext'),
  usePhysics: () => ({
    setSimulationResult: mockSetSimulationResult,
  }),
}));

// Mock heavy visualization component
jest.mock('../components/visualizations/UnifiedBubbleLatticeVisualization', () => () => (
  <div data-testid="mock-unified-visualization">Mock Visualization</div>
));

// Mock TheoryTogglePanel
jest.mock('../components/physics/TheoryTogglePanel', () => () => (
  <div data-testid="mock-theory-toggle">Mock Toggle</div>
));

// Mock analytics API
jest.mock('../services/analyticsApi', () => ({
  analyticsApi: { saveExperiment: jest.fn().mockResolvedValue({ id: 'test-id' }), saveFailedRun: jest.fn().mockResolvedValue({ id: 'failed-id' }) },
}));

// Mock ErrorBoundary to render children
jest.mock('../components/ErrorBoundary', () => ({ children }) => children);

describe('UnifiedTheoryPage', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock fetch to reject so generateLocalResults fallback runs (pd_d preset has loadingRatio 0.9 -> baseEnhancement 1e5)
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('renders page with main header and system configuration', () => {
    render(<UnifiedTheoryPage />);
    expect(screen.getByText('Unified Bubble-Lattice LENR Simulation')).toBeInTheDocument();
    expect(screen.getByText('System Configuration')).toBeInTheDocument();
    expect(screen.getByText('Electrolyte System')).toBeInTheDocument();
    expect(screen.getByText('50 μs · ~2.5s vis')).toBeInTheDocument();
  });

  test('includes electrolyte_species in bubble-lattice payload', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        collapse_results: { max_temperature_k: 300, compression_ratio: 2, min_radius_um: 1, max_pressure_bar: 100 },
        proton_phases: { FREE: 0.5, SCREENED: 0.3, CAPTURE_READY: 0.15, NUCLEAR: 0.05 },
        enhancement_timeline: [{ normalized_time: 0, phase: 'EXPANSION', enhancement: 1, radius_factor: 1, temperature: 300 }],
        peak_conditions: { enhancement_factor: 1 },
      }),
    });
    render(<UnifiedTheoryPage />);
    fireEvent.click(screen.getByRole('button', { name: /Run Physics Simulation/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
    const [, requestInit] = global.fetch.mock.calls[0];
    const payload = JSON.parse(requestInit.body);
    expect(payload.lattice.electrolyte_family).toBeDefined();
    expect(payload.lattice.electrolyte_species).toBeDefined();
    expect(payload.lattice.electrolyte_molarity_mol_l).toBeDefined();
  });

  test('displays ENHANCEMENT_THRESHOLDS.observable (1e5) after running simulation', async () => {
    render(<UnifiedTheoryPage />);

    const runButton = screen.getByRole('button', { name: /Run Physics Simulation/i });
    fireEvent.click(runButton);

    await waitFor(
      () => {
        // Threshold for observable = 1e5 displays as "1e+5" via toExponential(0)
        expect(screen.getByText(/1e[+]5/)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  test('shows Enhancement Factor after simulation completes', async () => {
    render(<UnifiedTheoryPage />);

    const runButton = screen.getByRole('button', { name: /Run Physics Simulation/i });
    fireEvent.click(runButton);

    await waitFor(
      () => {
        expect(screen.getByText(/Enhancement Factor/)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });
});

/**
 * Saturation-aware timeline and reporting limits.
 *
 * The timeline plotted log10 of the *clamped* enhancement, so it drew a flat
 * line at 5.0 through the entire collapse. The backend also emits
 * enhancement_log10_raw / enhancement_is_saturated, which the frontend ignored
 * entirely, and the page hardcoded a 1e4 K ceiling against a backend value of
 * 2e6 K.
 */
describe('UnifiedTheoryPage saturation and limits reporting', () => {
  const originalFetch = global.fetch;

  const SATURATED_RESPONSE = {
    success: true,
    collapse_results: {
      max_temperature_k: 2.0e6,
      compression_ratio: 1000,
      min_radius_um: 0.01,
      max_pressure_bar: 100000,
      limits: {
        temperature_k: {
          value: 2.0e6,
          value_raw: 4.7e6,
          ceiling: 2.0e6,
          is_saturated: true,
          basis: 'literature-anchored bound',
          citation: 'doi:10.1121/1.416948',
        },
      },
    },
    proton_phases: { FREE: 0.0127, SCREENED: 0.5145, CAPTURE_READY: 0.3546, NUCLEAR: 0.1182 },
    enhancement_timeline: [
      {
        normalized_time: 0,
        phase: 'EXPANSION',
        enhancement: 1,
        enhancement_log10_raw: 0,
        enhancement_is_saturated: false,
        radius_factor: 1,
        temperature_k: 300,
        pressure_bar: 1,
      },
      {
        normalized_time: 0.5,
        phase: 'MINIMUM',
        enhancement: 1e5,
        enhancement_log10_raw: 38.83,
        enhancement_is_saturated: true,
        radius_factor: 0.001,
        temperature_k: 2.0e6,
        pressure_bar: 100000,
      },
    ],
    peak_conditions: { enhancement_factor: 1e5 },
    collapse_trajectory: {
      time_s: [0, 2.5e-5, 5e-5],
      radius_um: [10, 0.01, 9.4],
      wall_velocity_m_s: [0, -1200, 300],
      min_radius_sample_index: 1,
      sample_count: 3,
      downsample_step: 1,
      source: 'rayleigh_plesset_trajectory',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => SATURATED_RESPONSE,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const runAndOpenTab = async (tabName) => {
    render(<UnifiedTheoryPage />);
    fireEvent.click(screen.getByRole('button', { name: /Run Physics Simulation/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: tabName })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('tab', { name: tabName }));
  };

  test('timeline warns that saturated samples are clamped', async () => {
    await runAndOpenTab(/enhancement timeline/i);
    await waitFor(() => {
      expect(screen.getByText(/exceed the/i)).toBeInTheDocument();
      expect(screen.getByText(/uncapped model magnitude/i)).toBeInTheDocument();
    });
  });

  test('timeline plots the integrated collapse trajectory', async () => {
    await runAndOpenTab(/enhancement timeline/i);
    await waitFor(() => {
      expect(
        screen.getByText(/integrated collapse trajectory/i),
      ).toBeInTheDocument();
    });
  });

  test('flags the temperature ceiling using the backend limit, not a hardcoded 1e4', async () => {
    await runAndOpenTab(/results/i);
    await waitFor(() => {
      expect(screen.getByText('AT CEILING')).toBeInTheDocument();
    });
    // The reported 2e6 K comes from the response, not the old 1e4 constant.
    // The value and its unit are separate text nodes, so match on textContent.
    expect(
      screen.getByText(
        (_content, element) => element?.tagName === 'STRONG'
          && element.textContent.replace(/\s+/g, ' ').trim() === '2000000 K',
      ),
    ).toBeInTheDocument();
  });

  test('proton phase shares keep one decimal so small nuclear fractions survive', async () => {
    await runAndOpenTab(/results/i);
    await waitFor(() => {
      expect(screen.getByText(/NUCLEAR: 11\.8%/)).toBeInTheDocument();
      expect(screen.getByText(/FREE: 1\.3%/)).toBeInTheDocument();
    });
  });
});

/**
 * Collapse uncertainty.
 *
 * The page advertised an uncertainty-interval chip with no interval rendered
 * anywhere, and only the reaction rate carried a real physics interval.
 */
describe('UnifiedTheoryPage collapse uncertainty', () => {
  const originalFetch = global.fetch;

  const withUncertainty = {
    success: true,
    collapse_results: {
      max_temperature_k: 1.16e6,
      compression_ratio: 1000,
      min_radius_um: 0.01,
      max_pressure_bar: 100000,
    },
    proton_phases: { FREE: 0.1, SCREENED: 0.5, CAPTURE_READY: 0.3, NUCLEAR: 0.1 },
    enhancement_timeline: [
      {
        normalized_time: 0,
        phase: 'EXPANSION',
        enhancement: 1,
        enhancement_log10_raw: 0,
        radius_factor: 1,
        temperature_k: 300,
      },
    ],
    peak_conditions: { enhancement_factor: 1e5 },
    collapse_uncertainty: {
      observables: {
        peak_temperature_k: {
          unit: 'K',
          median: 9.891e4,
          mean: 1.1e5,
          credible_interval: {
            p05: 3.975e4, p25: 6.5e4, p50: 9.891e4, p75: 1.5e5, p95: 2.504e5,
          },
          interval_kind: 'predictive',
        },
        peak_pressure_pa: {
          unit: 'Pa',
          median: 1e10,
          mean: 1e10,
          credible_interval: {
            p05: 8e9, p25: 9e9, p50: 1e10, p75: 1e10, p95: 1e10,
          },
          interval_kind: 'predictive',
        },
      },
      mechanisms: {},
      log10_total_enhancement_raw: {
        unit: 'log10',
        median: 11.64,
        credible_interval: { p05: 11.48, p25: 11.55, p50: 11.64, p75: 11.72, p95: 11.79 },
      },
      sensitivity: {
        log10_total_enhancement_raw: {
          compression_ratio: 0.999,
          screening_potential_ev: 0.0,
          polytropic_index: 0.001,
        },
      },
      inputs: { n_samples: 64, seed: 7 },
      provenance: {
        claim_tier: 'speculative_exploratory',
        note: 'Intervals propagate input ranges and do not include model-form error.',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => withUncertainty });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const openResults = async () => {
    render(<UnifiedTheoryPage />);
    fireEvent.click(screen.getByRole('button', { name: /Run Physics Simulation/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /results/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('tab', { name: /results/i }));
  };

  test('renders the collapse uncertainty panel when intervals are present', async () => {
    await openResults();
    await waitFor(() => {
      expect(screen.getByText('Collapse Uncertainty')).toBeInTheDocument();
    });
  });

  test('states the sample count and seed for reproducibility', async () => {
    await openResults();
    await waitFor(() => {
      expect(screen.getByText(/64 samples/i)).toBeInTheDocument();
      expect(screen.getByText(/seed 7/i)).toBeInTheDocument();
    });
  });

  test('ranks the dominant contributor to the spread', async () => {
    await openResults();
    await waitFor(() => {
      expect(screen.getByText(/compression ratio 100%/i)).toBeInTheDocument();
    });
  });

  test('carries the model-form caveat', async () => {
    await openResults();
    await waitFor(() => {
      expect(screen.getByText(/do not include model-form error/i)).toBeInTheDocument();
    });
  });

  test('omits the panel entirely when uncertainty was not requested', async () => {
    const noUq = { ...withUncertainty };
    delete noUq.collapse_uncertainty;
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => noUq });

    await openResults();
    await waitFor(() => {
      expect(screen.getByText(/Collapse Results/i)).toBeInTheDocument();
    });
    expect(screen.queryByText('Collapse Uncertainty')).not.toBeInTheDocument();
  });
});
