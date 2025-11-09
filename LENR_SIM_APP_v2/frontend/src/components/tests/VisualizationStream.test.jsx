
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VisualizationStream from '../VisualizationStream';
import * as visualizationWebSocket from '../../utils/visualizationWebSocket';

// Mock the visualization WebSocket utility
jest.mock('../../utils/visualizationWebSocket', () => ({
  createVisualizationWebSocket: jest.fn(),
  registerVisualizationListener: jest.fn().mockResolvedValue(undefined),
  unregisterVisualizationListener: jest.fn().mockResolvedValue(undefined)
}));

describe('VisualizationStream', () => {
  // Mock WebSocket instance
  const mockWebSocketInstance = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    subscribe: jest.fn().mockResolvedValue(undefined),
    unsubscribe: jest.fn().mockResolvedValue(undefined),
    onSimulationEvent: jest.fn(),
    offSimulationEvent: jest.fn(),
    // Add alias methods for backward compatibility
    subscribeToSimulation: jest.fn().mockResolvedValue(undefined),
    unsubscribeFromSimulation: jest.fn().mockResolvedValue(undefined),
    registerVisualizationListener: jest.fn(),
    unregisterVisualizationListener: jest.fn(),
    on: jest.fn(),
    onConnected: jest.fn(),
    onDisconnected: jest.fn(),
    onError: jest.fn(),
    isConnected: jest.fn().mockReturnValue(false)
  };

  beforeEach(() => {
    jest.clearAllMocks();
    visualizationWebSocket.createVisualizationWebSocket.mockReturnValue(mockWebSocketInstance);
  });

  it('renders without crashing', () => {
    render(<VisualizationStream simulationId="test-sim-1" apiBaseUrl="http://localhost:8000" />);
    expect(screen.getByText(/Visualization Stream/i)).toBeInTheDocument();
  });

  it('shows a placeholder when no simulation is selected', () => {
    render(<VisualizationStream simulationId={null} apiBaseUrl="http://localhost:8000" />);
    expect(screen.getByText(/No simulation selected/i)).toBeInTheDocument();
  });

  it('connects to WebSocket on mount when autoConnect is true', async () => {
    render(
      <VisualizationStream 
        simulationId="test-sim-1" 
        apiBaseUrl="http://localhost:8000" 
        autoConnect={true} 
      />
    );
    
    expect(visualizationWebSocket.createVisualizationWebSocket).toHaveBeenCalledWith('http://localhost:8000');
    expect(mockWebSocketInstance.connect).toHaveBeenCalled();
    expect(mockWebSocketInstance.registerVisualizationListener).toHaveBeenCalledWith('test-sim-1', expect.any(Function));
  });

  it('does not connect to WebSocket on mount when autoConnect is false', () => {
    render(
      <VisualizationStream 
        simulationId="test-sim-1" 
        apiBaseUrl="http://localhost:8000" 
        autoConnect={false} 
      />
    );
    
    expect(visualizationWebSocket.createVisualizationWebSocket).toHaveBeenCalledWith('http://localhost:8000');
    expect(mockWebSocketInstance.connect).not.toHaveBeenCalled();
  });

  it('connects when clicking the connect button', async () => {
    render(
      <VisualizationStream 
        simulationId="test-sim-1" 
        apiBaseUrl="http://localhost:8000" 
        autoConnect={false} 
      />
    );
    
    fireEvent.click(screen.getByRole('button', { name: /Connect/i }));
    
    expect(mockWebSocketInstance.connect).toHaveBeenCalled();
    expect(mockWebSocketInstance.registerVisualizationListener).toHaveBeenCalledWith('test-sim-1', expect.any(Function));
  });

  it('disconnects on unmount', () => {
    const { unmount } = render(
      <VisualizationStream 
        simulationId="test-sim-1" 
        apiBaseUrl="http://localhost:8000" 
        autoConnect={true} 
      />
    );
    
    unmount();
    
    expect(mockWebSocketInstance.unsubscribeFromSimulation).toHaveBeenCalledWith('test-sim-1');
    expect(mockWebSocketInstance.unregisterVisualizationListener).toHaveBeenCalled();
  });

  it('disconnects when clicking the disconnect button', async () => {
    // Override isConnected for this test
    mockWebSocketInstance.isConnected.mockReturnValue(true);
    
    render(
      <VisualizationStream 
        simulationId="test-sim-1" 
        apiBaseUrl="http://localhost:8000" 
        autoConnect={true} 
      />
    );
    
    // Force a re-render to show the disconnect button
    await act(async () => {
      // Simulate connection status change
      const connectionHandler = mockWebSocketInstance.onConnected.mock.calls[0][0];
      connectionHandler();
    });
    
    // Use the Button with the connected state (showing Disconnect)
    const connectButton = screen.getByRole('button', { name: /Disconnect/i });
    fireEvent.click(connectButton);
    
    expect(mockWebSocketInstance.disconnect).toHaveBeenCalled();
    
    // Reset for other tests
    mockWebSocketInstance.isConnected.mockReturnValue(false);
  });

  it('displays visualization events as they arrive', async () => {
    render(
      <VisualizationStream 
        simulationId="test-sim-1" 
        apiBaseUrl="http://localhost:8000" 
        autoConnect={true} 
      />
    );
    
    // Find the event handler function from the mock calls
    const eventHandler = mockWebSocketInstance.registerVisualizationListener.mock.calls[0][1];
    
    // Simulate receiving an event
    act(() => {
      eventHandler({
        id: 'evt-123',
        timestamp: new Date().toISOString(),
        type: 'snapshot',
        source: 'nuclear_domain',
        title: 'Temperature Snapshot',
        data: { temperature: 500 }
      });
    });
    
    expect(screen.getByText(/Temperature Snapshot/i)).toBeInTheDocument();
  });

  it('limits the number of events based on maxEvents prop', async () => {
    render(
      <VisualizationStream 
        simulationId="test-sim-1" 
        apiBaseUrl="http://localhost:8000" 
        autoConnect={true}
        maxEvents={2}
      />
    );
    
    // Find the event handler function
    const eventHandler = mockWebSocketInstance.registerVisualizationListener.mock.calls[0][1];
    
    // Simulate receiving 3 events (one over the limit)
    act(() => {
      eventHandler({
        id: 'evt-1',
        timestamp: new Date().toISOString(),
        type: 'snapshot',
        source: 'thermal_domain',
        title: 'Event 1',
        data: { value: 1 }
      });
      
      eventHandler({
        id: 'evt-2',
        timestamp: new Date().toISOString(),
        type: 'snapshot',
        source: 'thermal_domain',
        title: 'Event 2',
        data: { value: 2 }
      });
      
      eventHandler({
        id: 'evt-3',
        timestamp: new Date().toISOString(),
        type: 'snapshot',
        source: 'thermal_domain',
        title: 'Event 3',
        data: { value: 3 }
      });
    });
    
    // Should only show the 2 most recent events
    expect(screen.queryByText(/Event 1/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Event 2/i)).toBeInTheDocument();
    expect(screen.getByText(/Event 3/i)).toBeInTheDocument();
  });

  it('shows different colors for different event types', async () => {
    render(
      <VisualizationStream 
        simulationId="test-sim-1" 
        apiBaseUrl="http://localhost:8000" 
        autoConnect={true}
      />
    );
    
    const eventHandler = mockWebSocketInstance.registerVisualizationListener.mock.calls[0][1];
    
    // Simulate events of different types
    act(() => {
      eventHandler({
        id: 'evt-1',
        timestamp: new Date().toISOString(),
        type: 'milestone',
        source: 'nuclear_domain',
        title: 'Milestone Event',
        data: {}
      });
      
      eventHandler({
        id: 'evt-2',
        timestamp: new Date().toISOString(),
        type: 'error',
        source: 'nuclear_domain',
        title: 'Error Event',
        data: { error: 'Something went wrong' }
      });
    });
    
    // Check if the milestone and error tags are rendered
    expect(screen.getByText(/Milestone Event/i)).toBeInTheDocument();
    expect(screen.getByText(/Error Event/i)).toBeInTheDocument();
    
    // Error events should show error details
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
  });

  it('shows connection errors when they occur', async () => {
    render(
      <VisualizationStream 
        simulationId="test-sim-1" 
        apiBaseUrl="http://localhost:8000" 
        autoConnect={true}
      />
    );
    
    // Find the error handler function
    const errorHandler = mockWebSocketInstance.onError.mock.calls[0][0];
    
    // Simulate an error
    await act(async () => {
      errorHandler(new Error('Connection failed'));
    });
    
    expect(screen.getByText(/Connection failed/i)).toBeInTheDocument();
  });

  it('clears events when clicking the clear button', async () => {
    render(
      <VisualizationStream 
        simulationId="test-sim-1" 
        apiBaseUrl="http://localhost:8000" 
        autoConnect={true}
      />
    );
    
    const eventHandler = mockWebSocketInstance.registerVisualizationListener.mock.calls[0][1];
    
    // Add an event
    act(() => {
      eventHandler({
        id: 'evt-1',
        timestamp: new Date().toISOString(),
        type: 'snapshot',
        source: 'nuclear_domain',
        title: 'Test Event',
        data: { value: 42 }
      });
    });
    
    // Verify event is displayed
    expect(screen.getByText(/Test Event/i)).toBeInTheDocument();
    
    // Clear events
    fireEvent.click(screen.getByText(/Clear/i));
    
    // Verify event is no longer displayed
    expect(screen.queryByText(/Test Event/i)).not.toBeInTheDocument();
  });
}); 