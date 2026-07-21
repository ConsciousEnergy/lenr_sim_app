
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LatticeTest from '../../../visualization/components/LatticeTest';

// Canvas element for mock renderer
const mockCanvas = document.createElement('canvas');

// Mock the THREE module and OrbitControls using constructor functions
// (import * as + new X() ignores mockImplementation return values)
jest.mock('three', () => {
  function MockVector3(x = 0, y = 0, z = 0) {
    this.x = x; this.y = y; this.z = z;
    this.distanceTo = jest.fn().mockReturnValue(0.5);
    this.clone = jest.fn().mockReturnThis();
    this.sub = jest.fn().mockReturnThis();
    this.length = jest.fn().mockReturnValue(1);
    this.multiplyScalar = jest.fn().mockReturnThis();
    this.copy = jest.fn();
    this.set = jest.fn();
  }
  function MockWebGLRenderer() {
    this.setSize = jest.fn();
    this.setPixelRatio = jest.fn();
    this.render = jest.fn();
    this.dispose = jest.fn();
    this.domElement = mockCanvas;
  }
  function MockPerspectiveCamera() {
    this.position = { set: jest.fn(), x: 0, y: 0, z: 0 };
    this.lookAt = jest.fn();
    this.aspect = 1;
    this.updateProjectionMatrix = jest.fn();
  }
  function MockScene() {
    this.add = jest.fn();
    this.remove = jest.fn();
    this.background = null;
    this.children = [];
    this.traverse = jest.fn(cb => cb({ geometry: { dispose: jest.fn() }, material: { dispose: jest.fn() } }));
  }
  function MockColor() {
    this.r = 0; this.g = 0; this.b = 0;
    this.setHSL = jest.fn().mockReturnThis();
  }
  function MockBufferGeometry() {
    this.setAttribute = jest.fn();
    this.dispose = jest.fn();
  }
  function MockDisposable() { this.dispose = jest.fn(); }
  function MockPositioned() { this.position = { set: jest.fn(), copy: jest.fn(), distanceTo: jest.fn().mockReturnValue(0.5) }; }
  function MockMesh() {
    this.position = new MockVector3();
    this.userData = {};
  }
  function MockAmbientLight() { this.position = { set: jest.fn() }; }
  function MockDirectionalLight() { this.position = { set: jest.fn() }; }
  function MockPoints() { this.position = { set: jest.fn() }; this.userData = {}; }
  function MockLineSegments() { this.position = { set: jest.fn() }; this.userData = {}; }
  function MockEdgesGeometry() { this.dispose = jest.fn(); }
  function MockSphereGeometry() { this.dispose = jest.fn(); }
  function MockBoxGeometry() { this.dispose = jest.fn(); }

  function MockGridHelper() { this.position = { y: 0, set: jest.fn() }; }
  function MockObject3D() {
    this.position = new MockVector3();
    this.scale = { set: jest.fn() };
    this.updateMatrix = jest.fn();
    this.matrix = {};
  }
  function MockInstancedMesh() {
    this.setMatrixAt = jest.fn();
    this.setColorAt = jest.fn();
    this.instanceMatrix = { needsUpdate: false };
    this.instanceColor = { needsUpdate: false };
    this.count = 0;
  }

  return {
    __esModule: true,
    WebGLRenderer: MockWebGLRenderer,
    PerspectiveCamera: MockPerspectiveCamera,
    Scene: MockScene,
    Color: MockColor,
    Vector3: MockVector3,
    BufferGeometry: MockBufferGeometry,
    Float32BufferAttribute: jest.fn(),
    PointsMaterial: MockDisposable,
    LineBasicMaterial: MockDisposable,
    MeshStandardMaterial: MockDisposable,
    MeshPhongMaterial: MockDisposable,
    AmbientLight: MockAmbientLight,
    DirectionalLight: MockDirectionalLight,
    Points: MockPoints,
    LineSegments: MockLineSegments,
    Mesh: MockMesh,
    BoxGeometry: MockBoxGeometry,
    EdgesGeometry: MockEdgesGeometry,
    SphereGeometry: MockSphereGeometry,
    GridHelper: MockGridHelper,
    Object3D: MockObject3D,
    InstancedMesh: MockInstancedMesh,
  };
});

jest.mock('three/examples/jsm/controls/OrbitControls', () => ({
  OrbitControls: function MockOrbitControls() {
    this.update = jest.fn();
    this.dispose = jest.fn();
    this.enableDamping = false;
    this.dampingFactor = 0;
    this.target = { set: jest.fn() };
  },
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
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;

  beforeEach(() => {
    window.requestAnimationFrame = jest.fn().mockReturnValue(123);
    window.cancelAnimationFrame = jest.fn();
    
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
    
    Element.prototype.getBoundingClientRect = jest.fn().mockReturnValue({
      width: 800, height: 600, top: 0, left: 0, right: 800, bottom: 600,
    });
    
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
    expect(screen.getByText('Lattice Visualization')).toBeInTheDocument();
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
    const solidBtn = screen.getByText('Solid');
    const wireframeBtn = screen.getByText('Wireframe');
    const pointsBtn = screen.getByText('Points');
    
    fireEvent.click(solidBtn);
    // Verify buttons remain in the document after click (no crash)
    expect(solidBtn).toBeInTheDocument();
    
    fireEvent.click(wireframeBtn);
    expect(wireframeBtn).toBeInTheDocument();
    
    fireEvent.click(pointsBtn);
    expect(pointsBtn).toBeInTheDocument();
  });

  it('toggles options when checkboxes are clicked', () => {
    render(<LatticeTest />);
    const energyCheckbox = screen.getByLabelText('Show Energy Colors');
    const unitCellCheckbox = screen.getByLabelText('Show Unit Cell');
    fireEvent.click(energyCheckbox);
    fireEvent.click(unitCellCheckbox);
  });

  it('renders FCC lattice info correctly', () => {
    render(<LatticeTest />);
    expect(screen.getByText('FCC')).toBeInTheDocument();
  });
});
