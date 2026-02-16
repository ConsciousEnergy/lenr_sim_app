
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
    // Re-establish matchMedia mock for Ant Design responsive observer
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
    mockWebSocketInstance.isConnected.mockReturnValue(false);
    visualizationWebSocket.createVisualizationWebSocket.mockReturnValue(mockWebSocketInstance);
  });

  it('renders without crashing', () => {
    render(<VisualizationStream simulationId="test-sim-1" apiBaseUrl="http://localhost:8000" />);
    expect(screen.getAllByText(/Visualization Stream/i).length).toBeGreaterThan(0);
  });

  it('shows empty state when no simulation is selected', () => {
    render(<VisualizationStream simulationId={null} apiBaseUrl="http://localhost:8000" />);
    expect(screen.getByText(/Connect to start receiving visualization events/i)).toBeInTheDocument();
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
    
    expect(visualizationWebSocket.createVisualizationWebSocket).not.toHaveBeenCalled();
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

  it('reconnects when clicking the reconnect button while connected', async () => {
    mockWebSocketInstance.isConnected.mockReturnValue(true);
    
    render(
      <VisualizationStream 
        simulationId="test-sim-1" 
        apiBaseUrl="http://localhost:8000" 
        autoConnect={true} 
      />
    );
    
    // Component goes to else branch (already connected) - sets connected=true
    // Button should now say "Reconnect"
    const reconnectButton = screen.getByRole('button', { name: /Reconnect/i });
    fireEvent.click(reconnectButton);
    
    // handleConnect calls disconnect first if connected, then initializeWebSocket
    expect(mockWebSocketInstance.disconnect).toHaveBeenCalled();
  });

  it('displays visualization events as they arrive', async () => {
    render(
      <VisualizationStream 
        simulationId="test-sim-1" 
        apiBaseUrl="http://localhost:8000" 
        autoConnect={true} 
      />
    );
    
    // Simulate connection completing via onConnected callback
    const connectedCallback = mockWebSocketInstance.onConnected.mock.calls[0][0];
    act(() => { connectedCallback(); });
    
    // Get the event handler from registerVisualizationListener
    const eventHandler = mockWebSocketInstance.registerVisualizationListener.mock.calls[0][1];
    
    // Simulate receiving a snapshot event
    act(() => {
      eventHandler({
        id: 'evt-123',
        timestamp: new Date().toISOString(),
        type: 'snapshot',
        source: 'nuclear_domain',
        timestep: 42,
        metrics: { temperature: 500 },
        data: { temperature: 500 }
      });
    });
    
    // Snapshot events render "Snapshot taken at timestep X"
    expect(screen.getByText(/Snapshot taken at timestep 42/i)).toBeInTheDocument();
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
    
    // Simulate connection completing
    const connectedCallback = mockWebSocketInstance.onConnected.mock.calls[0][0];
    act(() => { connectedCallback(); });
    
    const eventHandler = mockWebSocketInstance.registerVisualizationListener.mock.calls[0][1];
    
    // Simulate receiving 3 events (one over the limit)
    act(() => {
      eventHandler({
        id: 'evt-1',
        timestamp: new Date().toISOString(),
        type: 'snapshot',
        source: 'thermal_domain',
        timestep: 1,
        data: { value: 1 }
      });
      
      eventHandler({
        id: 'evt-2',
        timestamp: new Date().toISOString(),
        type: 'snapshot',
        source: 'thermal_domain',
        timestep: 2,
        data: { value: 2 }
      });
      
      eventHandler({
        id: 'evt-3',
        timestamp: new Date().toISOString(),
        type: 'snapshot',
        source: 'thermal_domain',
        timestep: 3,
        data: { value: 3 }
      });
    });
    
    // Should only show the 2 most recent events (newest first due to unshift)
    expect(screen.queryByText(/timestep 1/i)).not.toBeInTheDocument();
    expect(screen.getByText(/timestep 2/i)).toBeInTheDocument();
    expect(screen.getByText(/timestep 3/i)).toBeInTheDocument();
  });

  it('shows different colors for different event types', async () => {
    render(
      <VisualizationStream 
        simulationId="test-sim-1" 
        apiBaseUrl="http://localhost:8000" 
        autoConnect={true}
      />
    );
    
    // Simulate connection completing
    const connectedCallback = mockWebSocketInstance.onConnected.mock.calls[0][0];
    act(() => { connectedCallback(); });
    
    const eventHandler = mockWebSocketInstance.registerVisualizationListener.mock.calls[0][1];
    
    // Simulate events of different types
    act(() => {
      eventHandler({
        id: 'evt-1',
        timestamp: new Date().toISOString(),
        type: 'milestone',
        source: 'nuclear_domain',
        name: 'Milestone Event',
        data: {}
      });
      
      eventHandler({
        id: 'evt-2',
        timestamp: new Date().toISOString(),
        type: 'error',
        source: 'nuclear_domain',
        message: 'Something went wrong',
        details: 'Error details',
        data: { error: 'Something went wrong' }
      });
    });
    
    // Both milestone and error event types should render as tags
    expect(screen.getAllByText(/milestone/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/error/i).length).toBeGreaterThan(0);
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
    
    // Simulate connection completing
    const connectedCallback = mockWebSocketInstance.onConnected.mock.calls[0][0];
    act(() => { connectedCallback(); });
    
    const eventHandler = mockWebSocketInstance.registerVisualizationListener.mock.calls[0][1];
    
    // Add an event
    act(() => {
      eventHandler({
        id: 'evt-1',
        timestamp: new Date().toISOString(),
        type: 'snapshot',
        source: 'nuclear_domain',
        timestep: 99,
        data: { value: 42 }
      });
    });
    
    // Verify event is displayed
    expect(screen.getByText(/timestep 99/i)).toBeInTheDocument();
    
    // Clear events
    fireEvent.click(screen.getByText(/Clear/i));
    
    // Verify event is no longer displayed
    expect(screen.queryByText(/timestep 99/i)).not.toBeInTheDocument();
  });
}); 
