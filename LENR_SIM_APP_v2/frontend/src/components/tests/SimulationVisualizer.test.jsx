
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SimulationVisualizer from '../SimulationVisualizer';

// Mock the VisualizationSwitcher child component
jest.mock('../visualization/VisualizationSwitcher', () => {
  return function MockVisualizationSwitcher() {
    return <div data-testid="visualization-switcher">Mock Visualization</div>;
  };
});

// Mock rendering optimizations
jest.mock('../../visualization/utils/renderingOptimizations', () => ({
  optimizeRenderer: jest.fn(),
  optimizeScene: jest.fn(),
  setupWebGLContextHandling: jest.fn(),
  detectWebGLCapabilities: jest.fn().mockReturnValue({
    isMobile: false,
    maxTextureSize: 4096,
    supportsWebGL2: true,
  }),
}));

// Mock fetch API
global.fetch = jest.fn();

describe('SimulationVisualizer Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockReset();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders without crashing', () => {
    render(<SimulationVisualizer />);
    expect(screen.getByText('3D Visualization')).toBeInTheDocument();
  });

  it('displays refresh and fullscreen buttons', () => {
    render(<SimulationVisualizer />);
    expect(screen.getByLabelText('Refresh visualization')).toBeInTheDocument();
    expect(screen.getByLabelText('Enter fullscreen mode')).toBeInTheDocument();
  });

  it('shows loading state when fetching data', async () => {
    fetch.mockImplementationOnce(() => new Promise(() => {})); // never resolves

    render(<SimulationVisualizer simulationId="test-simulation" apiBaseUrl="http://localhost:8000" />);

    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  it('loads simulation data when simulationId is provided', async () => {
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ results: [{ temperature: 300 }] }),
      })
    );

    render(<SimulationVisualizer simulationId="test-simulation" apiBaseUrl="http://localhost:8000" />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('test-simulation'));
    });
  });

  it('handles errors when fetching visualization data', async () => {
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      })
    );

    render(<SimulationVisualizer simulationId="test-simulation" apiBaseUrl="http://localhost:8000" />);

    await waitFor(() => {
      expect(screen.getByText('Visualization Error')).toBeInTheDocument();
    });
  });

  it('does not fetch when simulationId is not provided', () => {
    render(<SimulationVisualizer />);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('calls fetch with the correct URL', async () => {
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      })
    );

    render(<SimulationVisualizer simulationId="sim-42" apiBaseUrl="http://api.test" />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('http://api.test/api/simulations/sim-42/results');
    });
  });
});
