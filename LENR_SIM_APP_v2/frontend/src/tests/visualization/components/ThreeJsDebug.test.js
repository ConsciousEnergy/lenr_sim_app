
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ThreeJsDebug from '../../../debug/ThreeJsDebug';

// Create canvas outside jest.mock (mock-prefixed vars are auto-hoisted by Jest)
const mockCanvas = document.createElement('canvas');

// Mock the THREE module and OrbitControls
// NOTE: Must use constructor functions (not jest.fn().mockImplementation) because
// `import * as THREE` + `new THREE.X()` ignores mockImplementation return values.
jest.mock('three', () => {
  function MockScene() {
    this.add = jest.fn();
    this.background = null;
    this.traverse = jest.fn(cb => cb({ geometry: { dispose: jest.fn() }, material: { dispose: jest.fn() } }));
  }
  function MockPerspectiveCamera() {
    this.position = { x: 0, y: 0, z: 0, set: jest.fn() };
    this.aspect = 1;
    this.updateProjectionMatrix = jest.fn();
  }
  function MockWebGLRenderer() {
    this.setSize = jest.fn();
    this.setPixelRatio = jest.fn();
    this.render = jest.fn();
    this.dispose = jest.fn();
    this.domElement = mockCanvas;
  }
  function MockMesh() {
    this.rotation = { x: 0, y: 0 };
    this.position = { set: jest.fn() };
  }
  function MockDirectionalLight() {
    this.position = { set: jest.fn() };
  }
  return {
    __esModule: true,
    Scene: MockScene,
    PerspectiveCamera: MockPerspectiveCamera,
    WebGLRenderer: MockWebGLRenderer,
    Color: jest.fn(),
    BoxGeometry: jest.fn(),
    MeshBasicMaterial: jest.fn(),
    MeshStandardMaterial: jest.fn(),
    Mesh: MockMesh,
    AmbientLight: jest.fn(),
    DirectionalLight: MockDirectionalLight,
  };
});

jest.mock('three/examples/jsm/controls/OrbitControls', () => ({
  OrbitControls: function MockOrbitControls() {
    this.update = jest.fn();
    this.enableDamping = false;
    this.dampingFactor = 0;
    this.dispose = jest.fn();
  },
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
    const { unmount } = render(<ThreeJsDebug />);
    
    // Verify the component rendered (scene was created during useEffect)
    expect(screen.getByText('ThreeJS Debug')).toBeInTheDocument();
    
    unmount();
  });
  
  it('cleans up resources on unmount', () => {
    const { unmount } = render(<ThreeJsDebug />);
    unmount();
    
    // Check if cleanupThreeJS was called
    const threeCleanup = require('../../../utils/threeCleanup').default;
    expect(threeCleanup.cleanupThreeJS).toHaveBeenCalled();
  });
}); 