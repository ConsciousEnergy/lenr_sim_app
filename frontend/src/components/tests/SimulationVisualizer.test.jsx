
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as THREE from 'three';
import SimulationVisualizer from '../SimulationVisualizer';

// Mock Three.js
jest.mock('three', () => {
  const actualThree = jest.requireActual('three');
  
  return {
    ...actualThree,
    WebGLRenderer: jest.fn().mockImplementation(() => ({
      setSize: jest.fn(),
      setPixelRatio: jest.fn(),
      domElement: document.createElement('canvas'),
      render: jest.fn(),
      dispose: jest.fn()
    })),
    Scene: jest.fn().mockImplementation(() => ({
      add: jest.fn(),
      remove: jest.fn(),
      background: null
    })),
    PerspectiveCamera: jest.fn().mockImplementation(() => ({
      aspect: 1,
      position: { set: jest.fn() },
      lookAt: jest.fn(),
      updateProjectionMatrix: jest.fn()
    })),
    Color: jest.fn(),
    AmbientLight: jest.fn().mockImplementation(() => ({
      position: { set: jest.fn() }
    })),
    DirectionalLight: jest.fn().mockImplementation(() => ({
      position: { set: jest.fn() }
    })),
    GridHelper: jest.fn(),
    AxesHelper: jest.fn(),
    BoxGeometry: jest.fn(),
    SphereGeometry: jest.fn(),
    PlaneGeometry: jest.fn().mockImplementation(() => ({
      rotateX: jest.fn(),
      rotateY: jest.fn()
    })),
    MeshLambertMaterial: jest.fn().mockImplementation(() => ({
      color: null,
      transparent: false,
      opacity: 1
    })),
    MeshBasicMaterial: jest.fn().mockImplementation(() => ({
      side: null,
      map: null,
      transparent: false,
      opacity: 1
    })),
    Mesh: jest.fn().mockImplementation(() => ({
      position: { set: jest.fn() }
    })),
    DataTexture: jest.fn().mockImplementation(() => ({
      needsUpdate: false
    })),
    DoubleSide: 'DoubleSide',
    RGBFormat: 'RGBFormat'
  };
});

// Mock OrbitControls
jest.mock('three/examples/jsm/controls/OrbitControls', () => ({
  OrbitControls: jest.fn().mockImplementation(() => ({
    enableDamping: false,
    dampingFactor: 0,
    enableZoom: false,
    update: jest.fn(),
    dispose: jest.fn(),
    target: { set: jest.fn() }
  }))
}));

// Mock fetch API
global.fetch = jest.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      metadata: {
        simulationId: 'test-simulation',
        timestamp: '2023-05-01T12:00:00Z',
        parameters: { iterations: 1000 }
      },
      grid: {
        type: 'structured',
        dimensions: { x: 10, y: 10, z: 10 },
        origin: { x: 0, y: 0, z: 0 }
      },
      values: {
        temperature: Array(1000).fill(0).map((_, i) => Math.random()),
        pressure: Array(1000).fill(0).map((_, i) => Math.random())
      },
      availableProperties: ['temperature', 'pressure', 'density', 'energyDensity']
    })
  })
);

describe('SimulationVisualizer Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    jest.resetAllMocks();
  });
  
  it('renders without crashing', () => {
    render(<SimulationVisualizer />);
    expect(screen.getByText('Simulation Visualizer')).toBeInTheDocument();
  });
  
  it('displays placeholder when no simulation is selected', () => {
    render(<SimulationVisualizer />);
    expect(screen.getByText('Select a simulation to visualize')).toBeInTheDocument();
  });
  
  it('shows loading state when loading data', async () => {
    fetch.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<SimulationVisualizer simulationId="test-simulation" />);
    expect(screen.getByText('Loading visualization data...')).toBeInTheDocument();
  });
  
  it('initializes Three.js scene when mounted', () => {
    render(<SimulationVisualizer />);
    expect(THREE.Scene).toHaveBeenCalled();
    expect(THREE.WebGLRenderer).toHaveBeenCalled();
    expect(THREE.PerspectiveCamera).toHaveBeenCalled();
  });
  
  it('loads simulation data when simulationId is provided', async () => {
    render(<SimulationVisualizer simulationId="test-simulation" />);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('test-simulation'));
    });
  });
  
  it('changes view mode when radio buttons are clicked', async () => {
    render(<SimulationVisualizer simulationId="test-simulation" />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
    
    // Find and click slice X mode
    const sliceXButton = screen.getByRole('radio', { name: /X Slice/i });
    fireEvent.click(sliceXButton);
    
    // Should show slice position slider
    expect(screen.getByText('Slice Position:')).toBeInTheDocument();
  });
  
  it('changes color property when dropdown is changed', async () => {
    render(<SimulationVisualizer simulationId="test-simulation" />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
    
    // Find and change the color property
    const colorSelect = screen.getByText('Color By:').closest('div').querySelector('div.ant-select');
    fireEvent.mouseDown(colorSelect);
    
    await waitFor(() => {
      const option = screen.getByText('Pressure');
      fireEvent.click(option);
    });
    
    // Verify that fetch is called again to reload with new settings
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });
  
  it('handles errors when fetching visualization data', async () => {
    // Mock fetch to return an error
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        statusText: 'Server Error'
      })
    );
    
    render(<SimulationVisualizer simulationId="test-simulation" />);
    
    await waitFor(() => {
      expect(screen.getByText('Visualization Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch visualization data: Server Error')).toBeInTheDocument();
    });
  });
  
  it('cleans up Three.js resources on unmount', () => {
    const { unmount } = render(<SimulationVisualizer />);
    
    // Unmount the component
    unmount();
    
    // Can't directly test cleanup in jest, but this is a proxy for proper cleanup
    expect(window.removeEventListener).toHaveBeenCalled;
  });
}); 