
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ThreeJsDebug from '../../../debug/ThreeJsDebug';

// Mock the THREE module and OrbitControls
jest.mock('three', () => {
  return {
    Scene: jest.fn().mockImplementation(() => ({
      add: jest.fn(),
      background: null,
      traverse: jest.fn(cb => cb({ geometry: { dispose: jest.fn() }, material: { dispose: jest.fn() } })),
    })),
    PerspectiveCamera: jest.fn().mockImplementation(() => ({
      position: { z: 0 },
      aspect: 1,
      updateProjectionMatrix: jest.fn(),
    })),
    WebGLRenderer: jest.fn().mockImplementation(() => ({
      setSize: jest.fn(),
      setPixelRatio: jest.fn(),
      render: jest.fn(),
      dispose: jest.fn(),
      domElement: document.createElement('canvas'),
    })),
    Color: jest.fn(),
    BoxGeometry: jest.fn(),
    MeshStandardMaterial: jest.fn().mockImplementation(() => ({ color: 0x00ff00 })),
    Mesh: jest.fn().mockImplementation(() => ({
      rotation: { x: 0, y: 0 },
    })),
    AmbientLight: jest.fn(),
    DirectionalLight: jest.fn().mockImplementation(() => ({
      position: { set: jest.fn() },
    })),
  };
});

jest.mock('three/examples/jsm/controls/OrbitControls', () => ({
  OrbitControls: jest.fn().mockImplementation(() => ({
    update: jest.fn(),
    enableDamping: false,
    dampingFactor: 0,
    dispose: jest.fn(),
  })),
}));

// Mock the threeCleanup utility
jest.mock('../../../utils/threeCleanup', () => {
  return {
    __esModule: true,
    default: {
      cleanupThreeJS: jest.fn(),
      initDefensiveDomObserver: jest.fn(),
      inspectArgs: jest.fn(),
    }
  };
});

describe('ThreeJsDebug Component', () => {
  beforeEach(() => {
    // Setup window methods and properties
    window.requestAnimationFrame = jest.fn();
    window.cancelAnimationFrame = jest.fn();
    
    // Setup Element methods
    Element.prototype.getBoundingClientRect = jest.fn().mockReturnValue({
      width: 800,
      height: 600,
    });
    
    // Setup client dimensions
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 800 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 600 });
    
    // Setup ResizeObserver
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders without crashing', () => {
    render(<ThreeJsDebug />);
    expect(screen.getByText('ThreeJS Debug')).toBeInTheDocument();
  });
  
  it('renders the canvas container', () => {
    render(<ThreeJsDebug />);
    const container = screen.getByText('ThreeJS Debug').parentElement.querySelector('div[style*="width: 100%"]');
    expect(container).toBeInTheDocument();
  });
  
  it('renders the debug info text', () => {
    render(<ThreeJsDebug />);
    expect(screen.getByText('This is a simple ThreeJS test showing a green cube.')).toBeInTheDocument();
    expect(screen.getByText('Try rotating, panning, and zooming with your mouse.')).toBeInTheDocument();
  });
  
  it('creates a Three.js scene', () => {
    // Trigger useEffect to run
    const { unmount } = render(<ThreeJsDebug />);
    
    // Check if THREE.Scene was called
    expect(require('three').Scene).toHaveBeenCalled();
    
    // Unmount to trigger cleanup
    unmount();
  });
  
  it('cleans up resources on unmount', () => {
    // Render and unmount to trigger cleanup
    const { unmount } = render(<ThreeJsDebug />);
    unmount();
    
    // Check if cleanupThreeJS was called
    const threeCleanup = require('../../../utils/threeCleanup').default;
    expect(threeCleanup.cleanupThreeJS).toHaveBeenCalled();
    
    // Check if event listener was removed
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });
}); 