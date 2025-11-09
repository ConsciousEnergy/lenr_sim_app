import threeCleanupModule from '../../../utils/threeCleanup';

const { cleanupThreeJS, initDefensiveDomObserver, inspectArgs } = threeCleanupModule;

// Mock the THREE module
jest.mock('three', () => {
  return {
    Scene: jest.fn().mockImplementation(() => ({
      traverse: jest.fn((callback) => {
        // Simulate traversing some objects with geometry and material
        callback({ 
          geometry: { dispose: jest.fn() },
          material: { dispose: jest.fn() } 
        });
        callback({ 
          geometry: { dispose: jest.fn() },
          material: [
            { dispose: jest.fn() },
            { dispose: jest.fn() }
          ]
        });
      })
    })),
    WebGLRenderer: jest.fn().mockImplementation(() => ({
      dispose: jest.fn(),
      domElement: {
        parentNode: {
          removeChild: jest.fn()
        }
      }
    }))
  };
});

describe('threeCleanup utility', () => {
  let mockScene;
  let mockRenderer;
  let mockControls;
  
  beforeEach(() => {
    // Create mock objects
    mockScene = {
      traverse: jest.fn(callback => {
        // Call callback with mock objects that have dispose methods
        callback({ 
          geometry: { dispose: jest.fn() },
          material: { dispose: jest.fn() } 
        });
        callback({ 
          geometry: { dispose: jest.fn() },
          material: [
            { dispose: jest.fn() },
            { dispose: jest.fn() }
          ]
        });
      })
    };
    
    mockRenderer = {
      dispose: jest.fn(),
      domElement: {
        parentNode: {
          removeChild: jest.fn()
        }
      }
    };
    
    mockControls = {
      dispose: jest.fn()
    };
    
    // Mock console.warn
    console.warn = jest.fn();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('cleanupThreeJS', () => {
    it('should return early if scene or renderer is not provided', () => {
      cleanupThreeJS(null, null);
      expect(console.warn).not.toHaveBeenCalled();
    });
    
    it('should dispose of all geometries and materials in the scene', () => {
      cleanupThreeJS(mockScene, mockRenderer, mockControls);
      expect(mockScene.traverse).toHaveBeenCalled();
    });
    
    it('should dispose of the renderer', () => {
      cleanupThreeJS(mockScene, mockRenderer, mockControls);
      expect(mockRenderer.dispose).toHaveBeenCalled();
    });
    
    it('should remove the renderer dom element from its parent', () => {
      cleanupThreeJS(mockScene, mockRenderer, mockControls);
      expect(mockRenderer.domElement.parentNode.removeChild).toHaveBeenCalledWith(mockRenderer.domElement);
    });
    
    it('should handle errors when removing dom element gracefully', () => {
      // Setup mock to throw error
      mockRenderer.domElement.parentNode.removeChild.mockImplementation(() => {
        throw new Error('Test error');
      });
      
      cleanupThreeJS(mockScene, mockRenderer, mockControls);
      expect(console.warn).toHaveBeenCalled();
    });
    
    it('should dispose of controls if available', () => {
      cleanupThreeJS(mockScene, mockRenderer, mockControls);
      expect(mockControls.dispose).toHaveBeenCalled();
    });
    
    it('should handle missing controls gracefully', () => {
      cleanupThreeJS(mockScene, mockRenderer, null);
      // Should not throw an error
    });
  });
  
  describe('initDefensiveDomObserver', () => {
    let mockObserver;
    let mockRoot;
    
    beforeEach(() => {
      // Mock MutationObserver
      mockObserver = {
        observe: jest.fn(),
        disconnect: jest.fn()
      };
      
      global.MutationObserver = jest.fn(() => mockObserver);
      
      // Mock document.querySelector
      mockRoot = document.createElement('div');
      document.querySelector = jest.fn().mockReturnValue(mockRoot);
    });
    
    it('should return null if the root element is not found', () => {
      document.querySelector.mockReturnValue(null);
      const result = initDefensiveDomObserver('#root');
      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalled();
    });
    
    it('should create and start observing the DOM', () => {
      const result = initDefensiveDomObserver('#root');
      expect(document.querySelector).toHaveBeenCalledWith('#root');
      expect(mockObserver.observe).toHaveBeenCalledWith(mockRoot, { childList: true, subtree: true });
      expect(result).toHaveProperty('cleanup');
    });
    
    it('should provide a cleanup function that disconnects the observer', () => {
      const result = initDefensiveDomObserver('#root');
      result.cleanup();
      expect(mockObserver.disconnect).toHaveBeenCalled();
    });
  });
  
  describe('inspectArgs', () => {
    it('should return "No arguments" when args is empty', () => {
      expect(inspectArgs([])).toBe('No arguments');
    });
    
    it('should return "No arguments" when args is null or undefined', () => {
      expect(inspectArgs(null)).toBe('No arguments');
      expect(inspectArgs(undefined)).toBe('No arguments');
    });
    
    it('should return comma-separated types for args', () => {
      const args = [1, 'string', true, {}, []];
      expect(inspectArgs(args)).toBe('number, string, boolean, object, object');
    });
    
    it('should handle errors gracefully', () => {
      // Create an object that throws an error when accessing properties
      const problemObject = {
        get length() { throw new Error('Test error'); }
      };
      
      expect(inspectArgs(problemObject)).toBe('Error inspecting arguments');
    });
  });
}); 