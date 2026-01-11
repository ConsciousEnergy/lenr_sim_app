
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LatticeTest from '../../../visualization/components/LatticeTest';

// Mock the THREE module and OrbitControls
jest.mock('three', () => {
  const actualThree = jest.requireActual('three');
  return {
    ...actualThree,
    WebGLRenderer: jest.fn().mockImplementation(() => ({
      setSize: jest.fn(),
      setPixelRatio: jest.fn(),
      render: jest.fn(),
      dispose: jest.fn(),
      domElement: document.createElement('canvas'),
    })),
    PerspectiveCamera: jest.fn().mockImplementation(() => ({
      position: { set: jest.fn() },
      lookAt: jest.fn(),
      aspect: 1,
      updateProjectionMatrix: jest.fn(),
    })),
    Scene: jest.fn().mockImplementation(() => ({
      add: jest.fn(),
      remove: jest.fn(),
      background: null,
      traverse: jest.fn(cb => cb({ geometry: { dispose: jest.fn() }, material: { dispose: jest.fn() } })),
    })),
    Color: jest.fn().mockImplementation(() => ({ 
      r: 0, g: 0, b: 0,
      setHSL: jest.fn().mockReturnThis() 
    })),
    Vector3: jest.fn().mockImplementation(() => ({
      x: 0, y: 0, z: 0,
      distanceTo: jest.fn().mockReturnValue(0.5),
      clone: jest.fn().mockReturnThis(),
      sub: jest.fn().mockReturnThis(),
      length: jest.fn().mockReturnValue(1),
      multiplyScalar: jest.fn().mockReturnThis(),
      copy: jest.fn(),
      set: jest.fn(),
    })),
    BufferGeometry: jest.fn().mockImplementation(() => ({
      setAttribute: jest.fn(),
      dispose: jest.fn(),
    })),
    Float32BufferAttribute: jest.fn(),
    PointsMaterial: jest.fn().mockImplementation(() => ({
      dispose: jest.fn(),
    })),
    LineBasicMaterial: jest.fn().mockImplementation(() => ({
      dispose: jest.fn(),
    })),
    MeshStandardMaterial: jest.fn().mockImplementation(() => ({
      dispose: jest.fn(),
    })),
    AmbientLight: jest.fn().mockImplementation(() => ({
      position: { set: jest.fn() },
    })),
    DirectionalLight: jest.fn().mockImplementation(() => ({
      position: { set: jest.fn() },
    })),
    Points: jest.fn().mockImplementation(() => ({
      position: { set: jest.fn() },
    })),
    LineSegments: jest.fn().mockImplementation(() => ({
      position: { set: jest.fn() },
    })),
    Mesh: jest.fn().mockImplementation(() => ({
      position: { 
        copy: jest.fn(),
        set: jest.fn()
      },
    })),
    BoxGeometry: jest.fn().mockImplementation(() => ({
      dispose: jest.fn(),
    })),
    EdgesGeometry: jest.fn().mockImplementation(() => ({
      dispose: jest.fn(),
    })),
    SphereGeometry: jest.fn().mockImplementation(() => ({
      dispose: jest.fn(),
    })),
    // Add any other Three.js objects that are needed
  };
});

jest.mock('three/examples/jsm/controls/OrbitControls', () => ({
  OrbitControls: jest.fn().mockImplementation(() => ({
    update: jest.fn(),
    dispose: jest.fn(),
    enableDamping: false,
    dampingFactor: 0,
    target: { set: jest.fn() },
  })),
}));

// Mock the threeCleanup utility
jest.mock('../../../utils/threeCleanup', () => ({
  __esModule: true,
  default: {
    cleanupThreeJS: jest.fn(),
    initDefensiveDomObserver: jest.fn(),
    inspectArgs: jest.fn(),
  }
}));

describe('LatticeTest Component', () => {
  // Mock window.requestAnimationFrame
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;

  beforeEach(() => {
    window.requestAnimationFrame = jest.fn().mockReturnValue(123);
    window.cancelAnimationFrame = jest.fn();
    
    // Mock ResizeObserver
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
    
    // Mock Element.getBoundingClientRect
    Element.prototype.getBoundingClientRect = jest.fn().mockReturnValue({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      right: 800,
      bottom: 600,
    });
    
    // Mock clientWidth and clientHeight
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 800 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 600 });
  });

  afterEach(() => {
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<LatticeTest />);
    expect(screen.getByText('Lattice Visualization Test')).toBeInTheDocument();
  });

  it('displays visualization controls', () => {
    render(<LatticeTest />);
    expect(screen.getByText('View Mode:')).toBeInTheDocument();
    expect(screen.getByText('Solid')).toBeInTheDocument();
    expect(screen.getByText('Wireframe')).toBeInTheDocument();
    expect(screen.getByText('Points')).toBeInTheDocument();
  });

  it('displays option checkboxes', () => {
    render(<LatticeTest />);
    expect(screen.getByText('Show Energy Colors')).toBeInTheDocument();
    expect(screen.getByText('Show Unit Cell')).toBeInTheDocument();
  });

  it('changes view mode when buttons are clicked', () => {
    render(<LatticeTest />);
    
    // Click Solid button
    fireEvent.click(screen.getByText('Solid'));
    
    // Click Wireframe button
    fireEvent.click(screen.getByText('Wireframe'));
    
    // Click Points button
    fireEvent.click(screen.getByText('Points'));
  });

  it('toggles options when checkboxes are clicked', () => {
    render(<LatticeTest />);
    
    // Get checkboxes
    const energyCheckbox = screen.getByLabelText('Show Energy Colors');
    const unitCellCheckbox = screen.getByLabelText('Show Unit Cell');
    
    // Toggle energy colors
    fireEvent.click(energyCheckbox);
    
    // Toggle unit cell
    fireEvent.click(unitCellCheckbox);
  });

  it('renders FCC lattice info correctly', () => {
    render(<LatticeTest />);
    expect(screen.getByText('Face-Centered Cubic (FCC) Lattice')).toBeInTheDocument();
  });
}); 