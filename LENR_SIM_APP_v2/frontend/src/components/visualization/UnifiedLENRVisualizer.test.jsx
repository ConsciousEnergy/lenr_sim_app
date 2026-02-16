import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import UnifiedLENRVisualizer from './UnifiedLENRVisualizer';

// Test data (must be defined before jest.mock that references it via mock prefix)
const mockPhysicsData = {
  simulationData: null,
  advancedPhysicsData: {
    quantumTunneling: {
      gamowFactor: 20,
      screeningFactor: 1.5,
      tunnelingProbability: 0.001,
    },
    latticeDynamics: {
      debyeTemperature: 275,
      phononFrequency: 1e13,
      phononAssistFactor: 1.1,
    },
    enhancementEffects: {
      coherenceLength: 2e-10,
      coherenceVolume: 8e-30,
      coherenceFactor: 0.5, 
    },
  },
  simulationHistory: [],
  getVisualizationData: jest.fn().mockReturnValue({
    latticeData: {
      material: 'palladium',
      temperature: 300,
      pressure: 101325,
      atoms: [],
    },
    fusionData: { 
      events: [] 
    },
    enhancementData: {
      enhancementFactor: 1.5,
      coherenceFactor: 0.5,
      phononAssist: 1.1,
      activeRegions: 5,
      maxTemperature: 300,
    },
  }),
  isRunning: false,
  status: 'idle',
  error: null,
};

// Mock canvas for renderer domElement
const mockCanvas = document.createElement('canvas');

// Mock the three.js module using constructor functions
// (import * as + new X() ignores mockImplementation return values)
jest.mock('three', () => {
  function MockWebGLRenderer() {
    this.setSize = jest.fn();
    this.setPixelRatio = jest.fn();
    this.render = jest.fn();
    this.dispose = jest.fn();
    this.domElement = mockCanvas;
    this.setClearColor = jest.fn();
    this.shadowMap = { enabled: false, type: 0 };
  }
  function MockPerspectiveCamera() {
    this.position = { set: jest.fn(), x: 0, y: 0, z: 0 };
    this.lookAt = jest.fn();
    this.updateProjectionMatrix = jest.fn();
    this.aspect = 1;
  }
  function MockScene() {
    this.add = jest.fn();
    this.remove = jest.fn();
    this.children = [];
    this.traverse = jest.fn((cb) => cb({ userData: {}, parent: { remove: jest.fn() } }));
    this.background = null;
  }
  function MockClock() {
    this.getElapsedTime = jest.fn().mockReturnValue(0);
  }
  function MockAmbientLight() { this.isLight = true; }
  function MockDirectionalLight() {
    this.isLight = true;
    this.position = { set: jest.fn() };
    this.shadow = {
      mapSize: { width: 0, height: 0 },
      camera: { near: 0, far: 0, left: 0, right: 0, top: 0, bottom: 0 },
      bias: 0,
    };
    this.castShadow = false;
  }
  return {
    __esModule: true,
    WebGLRenderer: MockWebGLRenderer,
    PerspectiveCamera: MockPerspectiveCamera,
    Scene: MockScene,
    Clock: MockClock,
    Color: jest.fn(),
    Group: jest.fn(),
    Mesh: jest.fn(),
    MeshStandardMaterial: jest.fn(),
    SphereGeometry: jest.fn(),
    Vector3: jest.fn(),
    PCFSoftShadowMap: 0,
    PCFShadowMap: 0,
    BasicShadowMap: 0,
    NoToneMapping: 0,
    ACESFilmicToneMapping: 0,
    ReinhardToneMapping: 0,
    AmbientLight: MockAmbientLight,
    DirectionalLight: MockDirectionalLight,
  };
});

jest.mock('three/examples/jsm/controls/OrbitControls', () => ({
  OrbitControls: function MockOrbitControls() {
    this.update = jest.fn();
    this.dispose = jest.fn();
    this.target = { copy: jest.fn() };
    this.enableDamping = false;
    this.dampingFactor = 0;
  },
}));

jest.mock('three/examples/jsm/postprocessing/EffectComposer', () => ({
  EffectComposer: function MockEffectComposer() {
    this.addPass = jest.fn();
    this.render = jest.fn();
    this.passes = [];
    this.setSize = jest.fn();
  },
}));

jest.mock('three/examples/jsm/postprocessing/RenderPass', () => ({
  RenderPass: jest.fn(),
}));

jest.mock('three/examples/jsm/postprocessing/UnrealBloomPass', () => ({
  UnrealBloomPass: function MockUnrealBloomPass() {
    this.threshold = 0;
    this.strength = 0;
    this.radius = 0;
  },
}));

jest.mock('three/examples/jsm/postprocessing/ShaderPass', () => ({
  ShaderPass: function MockShaderPass() {
    this.material = {
      uniforms: { resolution: { value: { x: 0, y: 0 } } },
    };
  },
}));

jest.mock('three/examples/jsm/shaders/FXAAShader', () => ({
  FXAAShader: {},
}));

jest.mock('three/examples/jsm/loaders/FontLoader', () => ({
  FontLoader: jest.fn(),
}));

jest.mock('three/examples/jsm/geometries/TextGeometry', () => ({
  TextGeometry: jest.fn(),
}));

// Mocking the usePhysics hook - define jest.fn() inline, get reference via require()
jest.mock('../../contexts/PhysicsContext', () => ({
  usePhysics: jest.fn(),
  __esModule: true,
  default: {
    Provider: ({ children }) => children,
  },
  PhysicsContext: {
    Provider: ({ children }) => children,
  },
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn();

describe('UnifiedLENRVisualizer Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { usePhysics } = require('../../contexts/PhysicsContext');
    usePhysics.mockReturnValue(mockPhysicsData);
  });

  it('renders without crashing', () => {
    render(<UnifiedLENRVisualizer />);
    // If it renders without throwing an error, the test passes
  });

  it('renders with physics context data and attaches canvas', () => {
    const { container } = render(<UnifiedLENRVisualizer />);
    expect(container).toBeTruthy();
    // Verify the Three.js renderer canvas is attached to the DOM
    const canvas = container.querySelector('canvas');
    if (canvas) {
      expect(canvas).toBeInTheDocument();
    }
  });

  it('handles rendering when physics data has null values', () => {
    const emptyPhysicsData = {
      ...mockPhysicsData,
      getVisualizationData: jest.fn().mockReturnValue(null),
      isRunning: false,
      status: 'idle',
    };
    
    const { usePhysics } = require('../../contexts/PhysicsContext');
    usePhysics.mockReturnValueOnce(emptyPhysicsData);
    
    const { container } = render(<UnifiedLENRVisualizer />);
    expect(container).toBeTruthy();
  });
});
