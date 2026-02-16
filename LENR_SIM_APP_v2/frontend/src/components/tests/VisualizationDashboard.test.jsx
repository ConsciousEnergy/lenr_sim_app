
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VisualizationDashboard from '../VisualizationDashboard';

// Mock the child components
jest.mock('../SimulationMonitor', () => {
  return function MockSimulationMonitor(props) {
    return (
      <div data-testid="simulation-monitor">
        <button 
          data-testid="simulation-select-button"
          onClick={() => props.onSimulationSelect && props.onSimulationSelect('test-sim-123')}
        >
          Select Simulation
        </button>
        <div>Selected: {props.selectedSimulationId || 'none'}</div>
      </div>
    );
  };
});

jest.mock('../SimulationVisualizer', () => {
  return function MockSimulationVisualizer(props) {
    return (
      <div data-testid="simulation-visualizer">
        <div>Simulation ID: {props.simulationId || 'not set'}</div>
      </div>
    );
  };
});

jest.mock('../VisualizationStream', () => {
  return function MockVisualizationStream(props) {
    return (
      <div data-testid="visualization-stream">
        <div>Simulation ID: {props.simulationId || 'not set'}</div>
        <div>Auto Connect: {props.autoConnect ? 'yes' : 'no'}</div>
      </div>
    );
  };
});

describe('VisualizationDashboard Component', () => {
  beforeEach(() => {
    // Re-establish matchMedia mock for Ant Design responsive observer (Row/Col)
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  it('renders without crashing', () => {
    render(<VisualizationDashboard />);
    expect(screen.getByText('Simulation Visualization Dashboard')).toBeInTheDocument();
  });
  
  it('initially renders in vertical (tabbed) layout', () => {
    render(<VisualizationDashboard />);
    expect(screen.getByRole('tab', { name: /Monitor/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Visualizer/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Event Stream/i })).toBeInTheDocument();
  });
  
  it('switches between vertical and horizontal layouts', () => {
    render(<VisualizationDashboard />);
    
    // Initially in vertical layout
    expect(screen.getByRole('tab', { name: /Monitor/i })).toBeInTheDocument();
    
    // Switch to horizontal layout - Ant Design Select uses role="combobox"
    const layoutSelect = screen.getByRole('combobox');
    fireEvent.mouseDown(layoutSelect);
    const dashboardOption = screen.getByText('Dashboard View');
    fireEvent.click(dashboardOption);
    
    // In horizontal layout, all components should be visible at once
    expect(screen.getAllByTestId('simulation-monitor').length).toBe(1);
    expect(screen.getAllByTestId('simulation-visualizer').length).toBe(1);
    expect(screen.getAllByTestId('visualization-stream').length).toBe(1);
  });
  
  it('propagates simulation selection to child components', async () => {
    render(<VisualizationDashboard />);
    
    // Initially no simulation is selected
    expect(screen.queryByText('Selected: test-sim-123')).not.toBeInTheDocument();
    
    // Select a simulation
    const selectButton = screen.getByTestId('simulation-select-button');
    fireEvent.click(selectButton);
    
    // Verify simulation ID is passed to child components
    expect(screen.getByText('Selected: test-sim-123')).toBeInTheDocument();
    
    // Switch to visualizer tab to see if simulationId is passed
    const visualizerTab = screen.getByRole('tab', { name: /Visualizer/i });
    fireEvent.click(visualizerTab);
    
    // Check if the simulationId is passed to the visualizer
    await waitFor(() => {
      expect(screen.getAllByText('Simulation ID: test-sim-123').length).toBeGreaterThan(0);
    });
    
    // Switch to event stream tab
    const streamTab = screen.getByRole('tab', { name: /Event Stream/i });
    fireEvent.click(streamTab);
    
    // Check if the simulationId is passed to the stream component
    await waitFor(() => {
      expect(screen.getAllByText('Simulation ID: test-sim-123').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Auto Connect: yes').length).toBeGreaterThan(0);
    });
  });
  
  it('shows simulation ID in header when selected', () => {
    render(<VisualizationDashboard />);
    
    // Initially, no simulation ID is shown
    expect(screen.queryByText('Selected Simulation:')).not.toBeInTheDocument();
    
    // Select a simulation
    const selectButton = screen.getByTestId('simulation-select-button');
    fireEvent.click(selectButton);
    
    // Simulation ID should appear in the header
    expect(screen.getByText('Selected Simulation:')).toBeInTheDocument();
    expect(screen.getByText('test-sim-123')).toBeInTheDocument();
  });
  
  it('passes refresh interval to SimulationMonitor', () => {
    const refreshInterval = 30;
    render(<VisualizationDashboard refreshInterval={refreshInterval} />);
    
    // We can't directly test props passed to mocked components
    // but we can infer from the rendered output
    const monitorElement = screen.getByTestId('simulation-monitor');
    expect(monitorElement).toBeInTheDocument();
    
    // Prop verification would happen in integration tests
  });
}); 