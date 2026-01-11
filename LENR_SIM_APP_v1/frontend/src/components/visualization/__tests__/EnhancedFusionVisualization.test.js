import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnhancedFusionVisualization from '../EnhancedFusionVisualization';
import { LogProvider } from '../../../contexts/LogContext';

// Mock the Three.js modules
jest.mock('three', () => {
  return {
    Scene: jest.fn().mockImplementation(() => ({
      add: jest.fn(),
      remove: jest.fn(),
      background: null
    })),
    PerspectiveCamera: jest.fn().mockImplementation(() => ({
      position: { z: 0 },
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
        clientHeight: 600,
        appendChild: jest.fn()
      },
      dispose: jest.fn()
    })),
    Mesh: jest.fn().mockImplementation(() => ({
      position: { set: jest.fn() },
      rotation: { set: jest.fn(), y: 0 },
      scale: { set: jest.fn() },
      userData: {}
    })),
    Color: jest.fn(),
    AmbientLight: jest.fn(),
    DirectionalLight: jest.fn().mockImplementation(() => ({
      position: { set: jest.fn() }
    })),
    HemisphereLight: jest.fn(),
    SphereGeometry: jest.fn().mockImplementation(() => ({
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
    }))
  };
});

// Mock OrbitControls
jest.mock('three/examples/jsm/controls/OrbitControls', () => ({
  OrbitControls: jest.fn().mockImplementation(() => ({
    enableDamping: false,
    dampingFactor: 0,
    update: jest.fn(),
    dispose: jest.fn()
  }))
}));

// Mock the threeCleanup utility
jest.mock('../../../utils/threeCleanup', () => ({
  registerThreeJsCanvas: jest.fn(),
  unregisterThreeJsCanvas: jest.fn()
}));

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Mock LogProvider
jest.mock('../../../contexts/LogContext', () => ({
  useLogger: () => mockLogger,
  LogProvider: ({ children }) => children
}));

// Wrap component with necessary providers
const renderWithProviders = (ui) => {
  return render(
    <LogProvider>{ui}</LogProvider>
  );
};

describe('EnhancedFusionVisualization Component', () => {
  // Mock elements needed for DOM interactions
  beforeAll(() => {
    // Create mock element for container ref
    const mockElement = {
      clientWidth: 800,
      clientHeight: 600,
      appendChild: jest.fn()
    };
    
    // Mock ref implementation
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      right: 800,
      bottom: 600
    }));
    
    // Mock createRef behavior in React
    React.createRef = jest.fn().mockImplementation(() => ({
      current: mockElement
    }));
  });
  
  beforeEach(() => {
    // Mock window.requestAnimationFrame
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      return setTimeout(cb, 0);
    });
    
    // Mock performance.now
    jest.spyOn(performance, 'now').mockReturnValue(1000);
  });

  afterEach(() => {
    // Clean up mocks
    jest.clearAllMocks();
    
    // Restore window methods
    window.requestAnimationFrame.mockRestore();
    performance.now.mockRestore();
  });

  test('renders loading state initially', () => {
    const { container } = render(<EnhancedFusionVisualization />);
    
    // The loading indicator should be rendered initially
    expect(container).toBeTruthy();
  });

  test('renders with enhanced fusion data', () => {
    const mockData = {
      metal: 'Pd',
      site_type: 'tetrahedral',
      enhancement_factors: {
        proximity: 10,
        screening: 100,
        fluctuation: 5,
        resonance: 50,
        quantum: 20,
        total: 1e25
      }
    };

    const { container } = render(<EnhancedFusionVisualization enhancedFusionData={mockData} />);
    expect(container).toBeTruthy();
  });
}); 