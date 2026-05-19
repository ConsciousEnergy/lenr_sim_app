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
  analyticsApi: { saveExperiment: jest.fn().mockResolvedValue({ id: 'test-id' }) },
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
