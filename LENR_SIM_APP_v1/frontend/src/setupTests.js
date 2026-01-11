// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock for IntersectionObserver
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.IntersectionObserver = MockIntersectionObserver;

// Mock for ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = MockResizeObserver;

// Mock for window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock requestAnimationFrame
global.requestAnimationFrame = callback => setTimeout(callback, 0);
global.cancelAnimationFrame = id => clearTimeout(id);

// Mock performance.now
global.performance.now = jest.fn(() => Date.now());

// Mock Three.js modules
jest.mock('three', () => {
  return {
    Scene: jest.fn().mockImplementation(() => ({
      add: jest.fn(),
      remove: jest.fn(),
      background: null
    })),
    PerspectiveCamera: jest.fn().mockImplementation(() => ({
      position: { x: 0, y: 0, z: 0 },
      aspect: 1,
      updateProjectionMatrix: jest.fn()
    })),
    WebGLRenderer: jest.fn().mockImplementation(() => ({
      setSize: jest.fn(),
      setPixelRatio: jest.fn(),
      render: jest.fn(),
      domElement: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        clientWidth: 800,
        clientHeight: 600
      },
      dispose: jest.fn()
    })),
    Mesh: jest.fn().mockImplementation(() => ({
      position: { x: 0, y: 0, z: 0, set: jest.fn() },
      rotation: { x: 0, y: 0, z: 0, set: jest.fn() },
      scale: { x: 1, y: 1, z: 1, set: jest.fn() },
      userData: {}
    })),
    Color: jest.fn(),
    Vector3: jest.fn().mockImplementation(() => ({ set: jest.fn() })),
    Box3: jest.fn().mockImplementation(() => ({ 
      setFromObject: jest.fn(),
      getSize: jest.fn().mockReturnValue({ x: 1, y: 1, z: 1 }),
      getCenter: jest.fn().mockReturnValue({ x: 0, y: 0, z: 0 })
    })),
    BufferGeometry: jest.fn().mockImplementation(() => ({
      dispose: jest.fn()
    })),
    BufferAttribute: jest.fn(),
    AmbientLight: jest.fn().mockImplementation(() => ({})),
    DirectionalLight: jest.fn().mockImplementation(() => ({
      position: { set: jest.fn() }
    })),
    HemisphereLight: jest.fn().mockImplementation(() => ({})),
    SphereGeometry: jest.fn().mockImplementation(() => ({
      dispose: jest.fn()
    })),
    BoxGeometry: jest.fn().mockImplementation(() => ({
      dispose: jest.fn()
    })),
    TorusGeometry: jest.fn().mockImplementation(() => ({
      dispose: jest.fn()
    })),
    OctahedronGeometry: jest.fn().mockImplementation(() => ({
      dispose: jest.fn()
    })),
    IcosahedronGeometry: jest.fn().mockImplementation(() => ({
      dispose: jest.fn()
    })),
    TorusKnotGeometry: jest.fn().mockImplementation(() => ({
      dispose: jest.fn()
    })),
    MeshPhongMaterial: jest.fn().mockImplementation(() => ({
      dispose: jest.fn()
    })),
    MeshBasicMaterial: jest.fn().mockImplementation(() => ({
      dispose: jest.fn()
    })),
    Group: jest.fn().mockImplementation(() => ({
      add: jest.fn(),
      remove: jest.fn()
    })),
    Matrix4: jest.fn().mockImplementation(() => ({
      makeRotationFromQuaternion: jest.fn(),
      makeScale: jest.fn(),
      makeTranslation: jest.fn(),
      multiply: jest.fn()
    })),
    Quaternion: jest.fn().mockImplementation(() => ({
      setFromAxisAngle: jest.fn()
    })),
    Raycaster: jest.fn().mockImplementation(() => ({
      setFromCamera: jest.fn(),
      intersectObjects: jest.fn().mockReturnValue([])
    })),
    Euler: jest.fn(),
    Clock: jest.fn().mockImplementation(() => ({
      getDelta: jest.fn().mockReturnValue(0.016),
      getElapsedTime: jest.fn().mockReturnValue(0)
    }))
  };
});

// Mock OrbitControls
jest.mock('three/examples/jsm/controls/OrbitControls', () => {
  return {
    OrbitControls: jest.fn().mockImplementation(() => ({
      enableDamping: false,
      dampingFactor: 0,
      update: jest.fn(),
      dispose: jest.fn()
    }))
  };
});

// Mock threeCleanup utility
jest.mock('./utils/threeCleanup', () => ({
  registerThreeJsCanvas: jest.fn(),
  unregisterThreeJsCanvas: jest.fn()
}));

// Set up a global afterEach to run after each test
afterEach(() => {
  // Clear any mocks automatically
  if (jest.isMockFunction(global.fetch)) {
    global.fetch.mockClear();
  }
});

// Mock canvas and getContext for WebGL
HTMLCanvasElement.prototype.getContext = function() {
  return {
    viewport: jest.fn(),
    clearColor: jest.fn(),
    clear: jest.fn(),
    enable: jest.fn(),
    createShader: jest.fn(),
    createProgram: jest.fn(),
    createBuffer: jest.fn(),
    bindBuffer: jest.fn(),
    bufferData: jest.fn(),
    useProgram: jest.fn(),
    enableVertexAttribArray: jest.fn(),
    vertexAttribPointer: jest.fn(),
    drawArrays: jest.fn(),
  };
}; 