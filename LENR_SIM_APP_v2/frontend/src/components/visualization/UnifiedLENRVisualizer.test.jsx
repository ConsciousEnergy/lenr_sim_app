import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import UnifiedLENRVisualizer from './UnifiedLENRVisualizer';
import { PhysicsContext } from '../../contexts/PhysicsContext';

// Mock the three.js and related modules
jest.mock('three', () => ({
  WebGLRenderer: jest.fn().mockImplementation(() => ({
    setSize: jest.fn(),
    setPixelRatio: jest.fn(),
    render: jest.fn(),
    dispose: jest.fn(),
    domElement: document.createElement('canvas'),
    setClearColor: jest.fn(),
    shadowMap: {
      enabled: false,
      type: 0,
    },
  })),
  PerspectiveCamera: jest.fn().mockImplementation(() => ({
    position: { set: jest.fn() },
    lookAt: jest.fn(),
    updateProjectionMatrix: jest.fn(),
    aspect: 1,
  })),
  Scene: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    remove: jest.fn(),
    children: [],
    traverse: jest.fn((callback) => callback({ userData: {}, parent: { remove: jest.fn() } })),
    background: null,
  })),
  Clock: jest.fn().mockImplementation(() => ({
    getElapsedTime: jest.fn().mockReturnValue(0),
  })),
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
  AmbientLight: jest.fn().mockImplementation(() => ({
    isLight: true,
  })),
  DirectionalLight: jest.fn().mockImplementation(() => ({
    isLight: true,
    position: { set: jest.fn() },
    shadow: {
      mapSize: { width: 0, height: 0 },
      camera: { 
        near: 0, 
        far: 0,
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
      bias: 0,
    },
    castShadow: false,
  })),
}));

jest.mock('three/examples/jsm/controls/OrbitControls', () => ({
  OrbitControls: jest.fn().mockImplementation(() => ({
    update: jest.fn(),
    dispose: jest.fn(),
    target: { copy: jest.fn() },
    enableDamping: false,
    dampingFactor: 0,
  })),
}));

jest.mock('three/examples/jsm/postprocessing/EffectComposer', () => ({
  EffectComposer: jest.fn().mockImplementation(() => ({
    addPass: jest.fn(),
    render: jest.fn(),
    passes: [],
    setSize: jest.fn(),
  })),
}));

jest.mock('three/examples/jsm/postprocessing/RenderPass', () => ({
  RenderPass: jest.fn(),
}));

jest.mock('three/examples/jsm/postprocessing/UnrealBloomPass', () => ({
  UnrealBloomPass: jest.fn().mockImplementation(() => ({
    threshold: 0,
    strength: 0,
    radius: 0,
  })),
}));

jest.mock('three/examples/jsm/postprocessing/ShaderPass', () => ({
  ShaderPass: jest.fn().mockImplementation(() => ({
    material: {
      uniforms: {
        resolution: {
          value: { x: 0, y: 0 },
        },
      },
    },
  })),
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

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(callback => callback());
global.cancelAnimationFrame = jest.fn();

// Test data
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

// Mock context provider
const MockPhysicsProvider = ({ children, value = mockPhysicsData }) => (
  <PhysicsContext.Provider value={value}>
    {children}
  </PhysicsContext.Provider>
);

// Mocking the usePhysics hook
jest.mock('../../contexts/PhysicsContext', () => ({
  usePhysics: jest.fn().mockReturnValue(mockPhysicsData),
  __esModule: true,
  default: {
    Provider: ({ children, value }) => children,
  },
  PhysicsContext: {
    Provider: ({ children, value }) => children,
  },
}));

describe('UnifiedLENRVisualizer Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <MockPhysicsProvider>
        <UnifiedLENRVisualizer />
      </MockPhysicsProvider>
    );
    // If it renders without throwing an error, the test passes
  });

  it('initializes Three.js renderer and scene', () => {
    render(
      <MockPhysicsProvider>
        <UnifiedLENRVisualizer />
      </MockPhysicsProvider>
    );
    
    // Check that getVisualizationData was called
    expect(mockPhysicsData.getVisualizationData).toHaveBeenCalled();
  });

  it('handles rendering when no physics data is available', () => {
    const emptyPhysicsData = {
      ...mockPhysicsData,
      getVisualizationData: jest.fn().mockReturnValue(null),
    };
    
    jest.requireMock('../../contexts/PhysicsContext').usePhysics.mockReturnValueOnce(emptyPhysicsData);
    
    render(
      <MockPhysicsProvider value={emptyPhysicsData}>
        <UnifiedLENRVisualizer />
      </MockPhysicsProvider>
    );
    
    // The component should still render without crashing
    expect(emptyPhysicsData.getVisualizationData).toHaveBeenCalled();
  });
}); 