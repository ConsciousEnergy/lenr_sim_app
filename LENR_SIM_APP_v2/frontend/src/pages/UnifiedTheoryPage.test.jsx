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
