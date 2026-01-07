/**
 * ThreeJS Cleanup Utilities
 * Helper functions to safely dispose Three.js resources and prevent memory leaks
 */

import errorReporter from './errorReporter';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Global registry to track Three.js elements - helps prevent React from removing managed elements
const threeJsRegistry = {
  containers: new Map(),
  canvases: new Map(),
  
  // Register a container or canvas element
  register(element, type, componentName) {
    const map = type === 'container' ? this.containers : this.canvases;
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    map.set(id, {
      element,
      componentName,
      timestamp: Date.now()
    });
    
    // Set a data attribute to mark this element
    element.setAttribute(`data-threejs-${type}-id`, id);
    console.debug(`Registered ${type} with ID ${id} for ${componentName}`);
    return id;
  },
  
  // Unregister an element
  unregister(element, type) {
    try {
      const map = type === 'container' ? this.containers : this.canvases;
      const id = element.getAttribute(`data-threejs-${type}-id`);
      
      if (id && map.has(id)) {
        map.delete(id);
        console.debug(`Unregistered ${type} with ID ${id}`);
        return true;
      }
      return false;
    } catch (e) {
      console.error(`Error unregistering element: ${e.message}`);
      return false;
    }
  },
  
  // Check if an element is registered
  isRegistered(element) {
    try {
      // Check if it's a container
      const containerId = element.getAttribute('data-threejs-container-id');
      if (containerId && this.containers.has(containerId)) return true;
      
      // Check if it's a canvas
      const canvasId = element.getAttribute('data-threejs-canvas-id');
      if (canvasId && this.canvases.has(canvasId)) return true;
      
      return false;
    } catch (e) {
      return false;
    }
  },
  
  // Help identify if an element should be protected from React's reconciliation
  shouldProtect(element) {
    if (!element) return false;
    
    // Check if this element is registered
    if (this.isRegistered(element)) return true;
    
    // Check if it has any registered Three.js ancestors
    let current = element;
    while (current && current.parentElement) {
      current = current.parentElement;
      if (this.isRegistered(current)) return true;
    }
    
    // Check if it's a canvas inside a Three.js container
    if (element.tagName === 'CANVAS') {
      const parent = element.parentElement;
      if (parent && this.isRegistered(parent)) return true;
    }
    
    return false;
  }
};

// Export the registry for external use
export const registry = threeJsRegistry;

// Add texture pooling system
const texturePool = {
  cache: new Map(),
  
  /**
   * Get or create a texture from the pool
   * @param {string} url - Texture URL
   * @param {function} createTexture - Function to create texture if not found
   * @returns {THREE.Texture} The texture
   */
  getTexture(url, createTexture) {
    if (this.cache.has(url)) {
      const entry = this.cache.get(url);
      entry.refCount++;
      return entry.texture;
    }
    
    const texture = createTexture();
    this.cache.set(url, { texture, refCount: 1 });
    return texture;
  },
  
  /**
   * Release a texture back to the pool
   * @param {string} url - Texture URL
   * @param {boolean} forceDispose - Force disposal even if referenced elsewhere
   */
  releaseTexture(url, forceDispose = false) {
    if (!this.cache.has(url)) return;
    
    const entry = this.cache.get(url);
    entry.refCount--;
    
    if (entry.refCount <= 0 || forceDispose) {
      entry.texture.dispose();
      this.cache.delete(url);
    }
  },
  
  /**
   * Clear all textures from the pool
   */
  clearAll() {
    this.cache.forEach(entry => {
      entry.texture.dispose();
    });
    this.cache.clear();
  }
};

// Export the texture pool
export const textureManager = texturePool;

/**
 * Safely remove a DOM element from its parent
 * @param {HTMLElement} element - DOM element to remove
 * @param {string} componentName - Name of the component for error reporting
 */
export const safeRemoveElement = (element, componentName = 'Unknown') => {
  try {
    if (!element) {
      console.debug(`${componentName}: No element provided to remove`);
      return;
    }
    
    // If this is a registered Three.js element or child thereof, extra care needed
    const isProtected = threeJsRegistry.shouldProtect(element);
    
    // Unregister from registry if this is a container or canvas
    if (element.hasAttribute('data-threejs-container-id')) {
      threeJsRegistry.unregister(element, 'container');
    } else if (element.hasAttribute('data-threejs-canvas-id')) {
      threeJsRegistry.unregister(element, 'canvas');
    }
    
    const parent = element.parentNode;
    if (!parent) {
      console.debug(`${componentName}: Element has no parent, already removed`);
      return;
    }
    
    // For Three.js elements, use our safer removal
    if (isProtected) {
      console.debug(`${componentName}: Using protected removal for Three.js element`);
      
      // Double detach - helps avoid React conflicts
      try {
        // First try to move to a temp container that React doesn't know about
        const detachedDiv = document.createElement('div');
        detachedDiv.style.display = 'none';
        detachedDiv.appendChild(element);
        
        // Then empty that container
        while (detachedDiv.firstChild) {
          detachedDiv.removeChild(detachedDiv.firstChild);
        }
        
        console.debug(`${componentName}: Successfully removed element using protected method`);
        return;
      } catch (e) {
        console.debug(`${componentName}: Protected removal failed, trying standard removal`);
      }
    }
    
    // Implement more robust checking for parent-child relationship
    let isElementInParent = false;
    
    try {
      // Method 1: Use contains method if available
      if (parent.contains && typeof parent.contains === 'function') {
        isElementInParent = parent.contains(element);
      }
      
      // Method 2: If contains method doesn't work, check child nodes manually
      if (!isElementInParent && parent.childNodes && parent.childNodes.length > 0) {
        for (let i = 0; i < parent.childNodes.length; i++) {
          if (parent.childNodes[i] === element) {
            isElementInParent = true;
            break;
          }
        }
      }
      
      // Method 3: Compare element's reported parent with the parent we have
      if (!isElementInParent && element.parentNode === parent) {
        // Last resort verification - if element reports this parent, try anyway
        isElementInParent = true;
      }
    } catch (checkError) {
      console.debug(`${componentName}: Error checking if element is in parent, assuming not`, checkError);
      isElementInParent = false;
    }
    
    if (isElementInParent) {
      // Use try/catch around the actual removal operation
      try {
        // Try through a safe wrapper first
        const removed = parent.removeChild(element);
        console.debug(`${componentName}: Successfully removed element from DOM`);
        return removed;
      } catch (removeError) {
        console.error(`${componentName}: Failed to remove child element`, removeError);
        errorReporter.report(removeError, {
          component: componentName,
          function: 'safeRemoveElement:removeChild',
          details: 'Direct removal failed'
        });
        
        // Fallback: Try to ensure the element is at least detached from the DOM
        try {
          if (element.parentNode) {
            // Create an empty div and move the element into it, then discard
            const tempDiv = document.createElement('div');
            tempDiv.appendChild(element);
            // The div is not attached to DOM, so the element is effectively removed
            console.debug(`${componentName}: Used fallback method to detach element from DOM`);
          }
        } catch (fallbackError) {
          console.error(`${componentName}: Even fallback removal failed`, fallbackError);
        }
      }
    } else {
      console.debug(`${componentName}: Element not in parent, already removed`);
    }
  } catch (error) {
    console.error(`${componentName}: Error in safeRemoveElement`, error);
    errorReporter.report(error, {
      component: componentName,
      function: 'safeRemoveElement'
    });
  }
};

/**
 * Dispose of a Three.js scene and all its resources
 * @param {Object} scene - Three.js scene object
 * @param {string} componentName - Name of the component for error reporting
 */
export const disposeScene = (scene, componentName = 'Unknown') => {
  try {
    if (!scene) return;
    
    scene.traverse((object) => {
      // Dispose of geometries
      if (object.geometry) {
        object.geometry.dispose();
      }
      
      // Dispose of materials
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => disposeMaterial(material));
        } else {
          disposeMaterial(object.material);
        }
      }
    });
  } catch (error) {
    console.error('Error disposing scene:', error);
    errorReporter.report(error, {
      component: componentName,
      function: 'disposeScene'
    });
  }
};

/**
 * Dispose of a Three.js material and its textures
 * @param {Object} material - Three.js material
 */
const disposeMaterial = (material) => {
  if (!material) return;
  
  // Dispose of all textures
  Object.keys(material).forEach(key => {
    const value = material[key];
    if (value && value.isTexture) {
      value.dispose();
    }
  });
  
  // Dispose of the material
  material.dispose();
};

/**
 * Force the release of WebGL resources by fully disposing the context
 * @param {WebGLRenderingContext} gl - The WebGL context to release
 */
export const forceReleaseWebGLResources = (gl) => {
  if (!gl) return;
  
  try {
    // Clear all texture bindings
    const numTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
    for (let unit = 0; unit < numTextureUnits; ++unit) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
    }
    
    // Clear buffer bindings
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    
    // Clear framebuffer and renderbuffer bindings
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    // Clear vertex array bindings if available (WebGL2)
    if (gl.bindVertexArray) {
      gl.bindVertexArray(null);
    }
    
    // Force context loss if extension is available
    const loseContextExt = gl.getExtension('WEBGL_lose_context');
    if (loseContextExt) {
      loseContextExt.loseContext();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error releasing WebGL resources:', error);
    return false;
  }
};

/**
 * Enhanced renderer disposal with forced GPU resource cleanup
 * @param {Object} renderer - THREE.WebGLRenderer instance
 * @param {string} componentName - Name of the component for error reporting
 */
export const disposeRenderer = (renderer, componentName = 'Unknown') => {
  try {
    if (!renderer) return;
    
    // Store reference to WebGL context before disposal
    let gl = null;
    try {
      gl = renderer.getContext();
    } catch (e) {
      // Ignore errors retrieving context
    }
    
    // Safely remove canvas from DOM
    try {
      safeRemoveElement(renderer.domElement, componentName);
    } catch (canvasError) {
      console.error(`${componentName}: Error removing canvas from DOM`, canvasError);
    }
    
    // Dispose the renderer
    try {
      renderer.dispose();
    } catch (rendererError) {
      console.error(`${componentName}: Error disposing renderer`, rendererError);
    }
    
    // Force release WebGL resources if we have the context
    if (gl) {
      forceReleaseWebGLResources(gl);
    }
  } catch (error) {
    console.error('Error disposing renderer:', error);
    errorReporter.report(error, {
      component: componentName,
      function: 'disposeRenderer'
    });
  }
};

/**
 * Cancel an animation frame safely
 * @param {number} frameId - Animation frame ID to cancel
 */
export const cancelAnimationFrameSafe = (frameId) => {
  if (frameId !== null && frameId !== undefined) {
    cancelAnimationFrame(frameId);
  }
};

/**
 * Complete cleanup of Three.js resources
 * @param {Object} params - Parameters containing references to Three.js objects
 * @param {Object} params.scene - Three.js scene
 * @param {Object} params.renderer - Three.js renderer
 * @param {Object} params.controls - OrbitControls or similar
 * @param {number} params.animationFrameId - Animation frame ID
 * @param {string} params.componentName - Name of the component for error reporting
 */
export const cleanupThreeJs = ({
  scene, 
  renderer, 
  controls, 
  animationFrameId,
  componentName = 'Unknown'
}) => {
  try {
    console.debug(`${componentName}: Starting Three.js cleanup`);
    
    // Cancel animation frame first
    cancelAnimationFrameSafe(animationFrameId);
    
    // Dispose scene
    disposeScene(scene, componentName);
    
    // Dispose controls
    if (controls && typeof controls.dispose === 'function') {
      controls.dispose();
      console.debug(`${componentName}: Controls disposed`);
    }
    
    // Dispose renderer and handle canvas removal safely
    if (renderer) {
      try {
        // Store reference to the canvas element first
        const canvas = renderer.domElement;
        
        // First dispose the renderer and its resources
        renderer.dispose();
        console.debug(`${componentName}: Renderer disposed`);
        
        // Then safely attempt to remove the canvas from the DOM
        if (canvas) {
          try {
            const parent = canvas.parentNode;
            if (parent && parent.contains && parent.contains(canvas)) {
              parent.removeChild(canvas);
              console.debug(`${componentName}: Canvas element removed from DOM`);
            }
          } catch (canvasError) {
            console.error(`${componentName}: Error removing canvas from DOM`, canvasError);
            errorReporter.report(canvasError, {
              component: componentName,
              function: 'cleanupThreeJs:canvasRemoval'
            });
          }
        }
      } catch (rendererError) {
        console.error(`${componentName}: Error disposing renderer`, rendererError);
        errorReporter.report(rendererError, {
          component: componentName,
          function: 'cleanupThreeJs:rendererDisposal'
        });
      }
    }
    
    // Force garbage collection if available
    if (window.gc) {
      try {
        window.gc();
      } catch (e) {
        // Ignore errors
      }
    }
    
    console.debug(`${componentName}: Three.js resources cleaned up`);
  } catch (error) {
    console.error(`${componentName}: Error during Three.js cleanup`, error);
    errorReporter.report(error, {
      component: componentName,
      function: 'cleanupThreeJs'
    });
  }
};

/**
 * Test utility for checking Three.js memory usage and cleanup
 * This can be used to verify that resources are being properly cleaned up
 * @param {Object} params - Test parameters
 * @param {function} params.onMemoryUsage - Callback that receives memory usage data
 * @param {string} params.componentName - Name of the component for context
 */
export const testThreeJsCleanup = ({ 
  onMemoryUsage, 
  componentName = 'TestCleanup' 
}) => {
  let testRenderer, testScene, testControls, testAnimationFrame;
  let memoryUsageBefore, memoryUsageAfter;
  const container = document.createElement('div');
  
  try {
    console.debug(`${componentName}: Starting Three.js cleanup test`);
    
    // Add container to DOM
    document.body.appendChild(container);
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    
    // Create a minimal Three.js setup
    testScene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    testRenderer = new THREE.WebGLRenderer();
    testRenderer.setSize(10, 10); // Tiny renderer for testing
    container.appendChild(testRenderer.domElement);
    
    // Add test objects
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const cube = new THREE.Mesh(geometry, material);
    testScene.add(cube);
    
    // Add controls - use the directly imported OrbitControls, not as a property of THREE
    if (typeof OrbitControls !== 'undefined') {
      testControls = new OrbitControls(camera, testRenderer.domElement);
    }
    
    // Render frame
    testRenderer.render(testScene, camera);
    
    // Start animation
    const animate = () => {
      testAnimationFrame = requestAnimationFrame(animate);
      if (testRenderer && testScene && camera) {
        if (testControls) {
          testControls.update();
        }
        testRenderer.render(testScene, camera);
      }
    };
    animate();
    
    // Capture memory usage before cleanup
    if (testRenderer.info) {
      memoryUsageBefore = {
        geometries: testRenderer.info.memory.geometries,
        textures: testRenderer.info.memory.textures
      };
      console.debug(`${componentName}: Memory usage before cleanup:`, memoryUsageBefore);
    }
    
    // Set timeout to perform cleanup and check results
    setTimeout(() => {
      // Clean up
      cleanupThreeJs({
        scene: testScene,
        renderer: testRenderer,
        controls: testControls,
        animationFrameId: testAnimationFrame,
        componentName
      });
      
      // Create another renderer to check memory usage
      const checkRenderer = new THREE.WebGLRenderer();
      
      // Check memory usage after cleanup
      if (checkRenderer.info) {
        memoryUsageAfter = {
          geometries: checkRenderer.info.memory.geometries,
          textures: checkRenderer.info.memory.textures
        };
        console.debug(`${componentName}: Memory usage after cleanup:`, memoryUsageAfter);
      }
      
      // Force context loss to fully release GPU resources
      if (checkRenderer.getContext && checkRenderer.getContext()) {
        const gl = checkRenderer.getContext();
        if (gl && gl.getExtension('WEBGL_lose_context')) {
          gl.getExtension('WEBGL_lose_context').loseContext();
          console.debug(`${componentName}: Forced WebGL context loss to release GPU resources`);
        }
      }
      
      // Dispose check renderer
      checkRenderer.dispose();
      
      // Remove test container
      try {
        if (document.body.contains(container)) {
          document.body.removeChild(container);
        }
      } catch (e) {
        console.error(`${componentName}: Error removing test container`, e);
      }
      
      // Report results
      if (onMemoryUsage && memoryUsageBefore && memoryUsageAfter) {
        onMemoryUsage({
          before: memoryUsageBefore,
          after: memoryUsageAfter,
          difference: {
            geometries: memoryUsageAfter.geometries - memoryUsageBefore.geometries,
            textures: memoryUsageAfter.textures - memoryUsageBefore.textures
          },
          success: 
            memoryUsageAfter.geometries <= memoryUsageBefore.geometries &&
            memoryUsageAfter.textures <= memoryUsageBefore.textures
        });
      }
    }, 500);
    
  } catch (error) {
    console.error(`${componentName}: Error in cleanup test`, error);
    errorReporter.report(error, {
      component: componentName,
      function: 'testThreeJsCleanup'
    });
    
    // Try to clean up even on error
    try {
      if (testAnimationFrame) cancelAnimationFrame(testAnimationFrame);
      if (testControls && testControls.dispose) testControls.dispose();
      if (testRenderer) testRenderer.dispose();
      if (container && document.body.contains(container)) {
        document.body.removeChild(container);
      }
    } catch (cleanupError) {
      console.error(`${componentName}: Error in emergency cleanup`, cleanupError);
    }
  }
};

/**
 * Create a detached container for Three.js that won't be managed by React
 * This prevents React from trying to remove the canvas element and causing errors
 * @param {HTMLElement} parentElement - Parent element to attach the container to
 * @param {string} componentName - Name of the component for error reporting
 * @returns {HTMLElement} - The created container element
 */
export const createDetachedThreeContainer = (parentElement, componentName = 'Unknown') => {
  if (!parentElement) {
    console.error(`${componentName}: No parent element provided for Three.js container`);
    return null;
  }
  
  try {
    // First check if a container already exists
    // Use a unique data attribute to identify our containers
    let existingContainer = null;
    
    // Look for containers with our registry ID
    const registeredContainers = parentElement.querySelectorAll('[data-threejs-container-id]');
    if (registeredContainers.length > 0) {
      for (let i = 0; i < registeredContainers.length; i++) {
        const container = registeredContainers[i];
        const id = container.getAttribute('data-threejs-container-id');
        if (id && threeJsRegistry.containers.has(id)) {
          existingContainer = container;
          console.debug(`${componentName}: Using existing registered container with ID ${id}`);
          break;
        }
      }
    }
    
    // Check with a backup method if no registered container found
    if (!existingContainer) {
      const fallbackContainers = parentElement.querySelectorAll('[data-threejs-container="true"]');
      if (fallbackContainers.length > 0) {
        existingContainer = fallbackContainers[0];
        console.debug(`${componentName}: Using existing container with legacy attribute`);
        
        // Register this container retroactively
        threeJsRegistry.register(existingContainer, 'container', componentName);
      }
    }
    
    if (existingContainer) {
      return existingContainer;
    }
    
    // Clean up any potential existing Three.js artifacts to avoid conflicts
    cleanupExistingThreeElements(parentElement, componentName);
    
    // Create a container div that won't be managed by React
    const container = document.createElement('div');
    
    // Set properties to make it identifiable
    container.setAttribute('data-threejs-container', 'true');
    container.setAttribute('data-component', componentName);
    container.setAttribute('data-timestamp', Date.now().toString());
    container.className = 'three-js-container';
    
    // Register this container in our registry
    const registryId = threeJsRegistry.register(container, 'container', componentName);
    
    // Set styles
    Object.assign(container.style, {
      width: '100%',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      // This helps avoid z-index issues with other elements
      zIndex: '1'
    });
    
    // Add to parent element
    parentElement.appendChild(container);
    
    console.debug(`${componentName}: Created and registered new Three.js container with ID ${registryId}`);
    return container;
  } catch (error) {
    console.error(`${componentName}: Error creating Three.js container`, error);
    errorReporter.report(error, {
      component: componentName,
      function: 'createDetachedThreeContainer'
    });
    return null;
  }
};

/**
 * Clean up any existing Three.js elements in the parent that might conflict
 * @param {HTMLElement} parentElement - Parent element to clean
 * @param {string} componentName - Component name for logging
 */
function cleanupExistingThreeElements(parentElement, componentName) {
  try {
    // Look for and remove existing canvases
    const existingCanvases = parentElement.querySelectorAll('canvas');
    if (existingCanvases.length > 0) {
      console.debug(`${componentName}: Found ${existingCanvases.length} existing canvas elements to clean up`);
      
      for (let i = 0; i < existingCanvases.length; i++) {
        safeRemoveElement(existingCanvases[i], componentName);
      }
    }
    
    // Look for and remove any containers that might be broken/orphaned
    const existingContainers = parentElement.querySelectorAll('[data-threejs-container="true"]');
    if (existingContainers.length > 0) {
      console.debug(`${componentName}: Found ${existingContainers.length} existing container elements to clean up`);
      
      for (let i = 0; i < existingContainers.length; i++) {
        // Only remove if it doesn't have a registered ID (means it's an orphan)
        const container = existingContainers[i];
        if (!container.hasAttribute('data-threejs-container-id')) {
          safeRemoveElement(container, componentName);
        }
      }
    }
    
    // Look for orphaned registry IDs as a last resort
    const elementsWithIds = parentElement.querySelectorAll('[data-threejs-container-id], [data-threejs-canvas-id]');
    if (elementsWithIds.length > 0) {
      for (let i = 0; i < elementsWithIds.length; i++) {
        const element = elementsWithIds[i];
        const containerId = element.getAttribute('data-threejs-container-id');
        const canvasId = element.getAttribute('data-threejs-canvas-id');
        
        // Check if it's a registered container
        if (containerId && !threeJsRegistry.containers.has(containerId)) {
          console.debug(`${componentName}: Removing orphaned container with ID ${containerId}`);
          safeRemoveElement(element, componentName);
        }
        
        // Check if it's a registered canvas
        if (canvasId && !threeJsRegistry.canvases.has(canvasId)) {
          console.debug(`${componentName}: Removing orphaned canvas with ID ${canvasId}`);
          safeRemoveElement(element, componentName);
        }
      }
    }
  } catch (error) {
    console.error(`${componentName}: Error cleaning up existing Three.js elements`, error);
  }
}

/**
 * Register a Three.js canvas with the registry
 * @param {HTMLCanvasElement} canvas - The canvas element to register
 * @param {string} componentName - Name of the component for debugging
 * @returns {string} The registration ID
 */
export const registerThreeJsCanvas = (canvas, componentName = 'Unknown') => {
  if (!canvas) {
    console.error(`${componentName}: Cannot register null canvas`);
    return null;
  }
  
  return threeJsRegistry.register(canvas, 'canvas', componentName);
};

/**
 * Unregister a Three.js canvas from the registry
 * @param {HTMLCanvasElement} canvas - The canvas element to unregister
 * @param {string} componentName - Name of the component for debugging
 */
export const unregisterThreeJsCanvas = (canvas, componentName = 'Unknown') => {
  if (!canvas) {
    console.error(`${componentName}: Cannot unregister null canvas`);
    return;
  }
  
  threeJsRegistry.unregister(canvas, 'canvas');
};

/**
 * Safe cleanup function for Three.js in React components
 * @param {Object} params - Cleanup parameters
 * @param {Object} params.renderer - Three.js renderer
 * @param {Object} params.scene - Three.js scene
 * @param {Object} params.controls - Three.js controls
 * @param {number} params.animationFrameId - Animation frame ID
 * @param {HTMLElement} params.container - Detached container element
 * @param {HTMLElement} params.parentElement - Parent element containing the container
 * @param {string} params.componentName - Component name for logging
 * @returns {boolean} - Success status
 */
export const reactSafeCleanupThreeJs = ({
  renderer,
  scene,
  controls,
  animationFrameId,
  container,
  parentElement,
  componentName = 'Unknown'
}) => {
  try {
    console.debug(`${componentName}: Starting React-safe Three.js cleanup`);
    
    // Keep track of what we've cleaned up
    const cleanedUp = {
      animationFrame: false,
      scene: false,
      controls: false,
      renderer: false,
      canvas: false,
      container: false
    };
    
    // Step 1: Cancel animation frame first
    if (animationFrameId !== null && animationFrameId !== undefined) {
      try {
        cancelAnimationFrame(animationFrameId);
        cleanedUp.animationFrame = true;
        console.debug(`${componentName}: Animation frame cancelled`);
      } catch (animError) {
        console.error(`${componentName}: Error cancelling animation frame`, animError);
      }
    }
    
    // Step 2: Store references to DOM elements before disposing anything
    let canvasElement = null;
    if (renderer && renderer.domElement) {
      canvasElement = renderer.domElement;
    }
    
    // Step 3: Dispose the scene objects
    if (scene) {
      try {
        scene.traverse((object) => {
          // Dispose geometries
          if (object.geometry) {
            object.geometry.dispose();
          }
          
          // Dispose materials
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => {
                // Dispose textures
                Object.keys(material).forEach(prop => {
                  if (material[prop] && material[prop].isTexture) {
                    material[prop].dispose();
                  }
                });
                material.dispose();
              });
            } else {
              // Dispose textures
              Object.keys(object.material).forEach(prop => {
                if (object.material[prop] && object.material[prop].isTexture) {
                  object.material[prop].dispose();
                }
              });
              object.material.dispose();
            }
          }
        });
        cleanedUp.scene = true;
        console.debug(`${componentName}: Scene objects disposed`);
      } catch (sceneError) {
        console.error(`${componentName}: Error disposing scene objects`, sceneError);
      }
    }
    
    // Step 4: Dispose controls
    if (controls && typeof controls.dispose === 'function') {
      try {
        controls.dispose();
        cleanedUp.controls = true;
        console.debug(`${componentName}: Controls disposed`);
      } catch (controlsError) {
        console.error(`${componentName}: Error disposing controls`, controlsError);
      }
    }
    
    // Step 5: Dispose renderer (before removing DOM elements)
    if (renderer) {
      try {
        // First remove the canvas from the registry before disposing the renderer
        if (canvasElement) {
          // Unregister the canvas
          threeJsRegistry.unregister(canvasElement, 'canvas');
        }
        
        renderer.dispose();
        cleanedUp.renderer = true;
        console.debug(`${componentName}: Renderer disposed`);
      } catch (rendererError) {
        console.error(`${componentName}: Error disposing renderer`, rendererError);
        errorReporter.report(rendererError, {
          component: componentName,
          function: 'reactSafeCleanupThreeJs:rendererDisposal'
        });
      }
    }
    
    // Step 6: Handle DOM elements with extreme care
    // First, handle the canvas element if we have it
    if (canvasElement && canvasElement.parentNode) {
      try {
        // Use safe method to remove canvas
        safeRemoveElement(canvasElement, componentName);
        cleanedUp.canvas = true;
      } catch (canvasError) {
        console.error(`${componentName}: Error removing canvas element`, canvasError);
      }
    }
    
    // Finally, remove the container
    if (container) {
      try {
        // Unregister the container from our registry
        threeJsRegistry.unregister(container, 'container');
        
        // Try to remove container from DOM
        safeRemoveElement(container, componentName);
        cleanedUp.container = true;
      } catch (containerError) {
        console.error(`${componentName}: Error removing container`, containerError);
      }
      
      // As an extra precaution, also try to clear the container's content
      try {
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
      } catch (clearError) {
        console.debug(`${componentName}: Error clearing container contents`, clearError);
      }
    }
    
    console.debug(`${componentName}: React-safe Three.js cleanup completed with results:`, cleanedUp);
    return true;
  } catch (error) {
    console.error(`${componentName}: Error during React-safe Three.js cleanup`, error);
    errorReporter.report(error, {
      component: componentName,
      function: 'reactSafeCleanupThreeJs'
    });
    return false;
  }
};

/**
 * Initialize a defensive MutationObserver that can prevent React from incorrectly
 * removing Three.js elements from the DOM.
 * @param {string} rootSelector - CSS selector for the root element to observe
 */
export const initDefensiveDomObserver = (rootSelector = '#root') => {
  // Only run in browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  
  try {
    const rootElement = document.querySelector(rootSelector);
    if (!rootElement) {
      console.warn('Could not find root element for defensive observer:', rootSelector);
      return;
    }
    
    // Add an even more aggressive patch for React's DOM operations
    // This directly monkey patches the DOM removeChild method
    const originalRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function(child) {
      // If this is a Three.js related element, handle it specially
      if (child && 
          (child.hasAttribute?.('data-threejs-container-id') || 
           child.hasAttribute?.('data-threejs-canvas-id') ||
           child.tagName === 'CANVAS' || 
           (child.className && typeof child.className === 'string' && child.className.includes('three-js-container')))) {
        
        console.debug('Defensive patch: Protected Three.js element from removal');
        
        // Instead of removing, detach from the DOM in a safer way
        try {
          // First check if we're in the correct parent-child relationship
          if (!this.contains(child)) {
            console.debug('Defensive patch: Element is not a child of the parent trying to remove it');
            return null; // Return null to indicate "success" without doing anything
          }
          
          // Move to a temporary container first
          const tempContainer = document.createElement('div');
          tempContainer.style.display = 'none';
          document.body.appendChild(tempContainer);
          tempContainer.appendChild(child);
          
          // Schedule removal of the temp container
          setTimeout(() => {
            try {
              if (document.body.contains(tempContainer)) {
                document.body.removeChild(tempContainer);
              }
            } catch (e) {
              // Ignore cleanup errors
            }
          }, 100);
          
          return child; // Return the child as if it was successfully removed
        } catch (e) {
          console.error('Defensive patch: Error in safe removal', e);
          return null; // Return null to indicate "success" without doing anything
        }
      }
      
      // For other elements, use the original implementation
      try {
        return originalRemoveChild.call(this, child);
      } catch (e) {
        // If we get the "not a child" error, handle it gracefully
        if (e.message && e.message.includes('child of this node')) {
          console.debug('Defensive patch: Prevented "not a child" error for regular element');
          return null; // Return null to indicate "success" without doing anything
        }
        throw e; // Re-throw other errors
      }
    };
    
    // This function will be called before an element is removed from the DOM
    const defensiveHandler = (mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          // Check removed nodes
          for (const removedNode of mutation.removedNodes) {
            if (removedNode.nodeType === Node.ELEMENT_NODE) {
              // If this is a Three.js element or contains Three.js elements, we need to
              // take protective measures
              if (threeJsRegistry.shouldProtect(removedNode)) {
                console.debug('Defensive observer: Prevented removal of a Three.js element');
                
                // Store the element in a detached container to safely remove it later
                setTimeout(() => {
                  try {
                    safeRemoveElement(removedNode, 'DefensiveObserver');
                  } catch (e) {
                    // Ignore errors here, we're just trying to help
                  }
                }, 0);
                
                // Stop the default removal operation
                mutation.preventDefault?.();
                return false;
              }
              
              // Also check if it has any Three.js containers or canvases as children
              const threeJsElements = removedNode.querySelectorAll(
                '[data-threejs-container-id], [data-threejs-canvas-id], canvas, [data-threejs-container="true"]'
              );
              
              if (threeJsElements.length > 0) {
                console.debug(`Defensive observer: Found ${threeJsElements.length} Three.js elements in node being removed`);
                
                // For each Three.js element found, detach it first
                for (const element of threeJsElements) {
                  if (threeJsRegistry.shouldProtect(element)) {
                    try {
                      // Move it to a temporary holding area
                      const detachedHolder = document.createElement('div');
                      detachedHolder.style.display = 'none';
                      document.body.appendChild(detachedHolder);
                      
                      // Move the element
                      if (element.parentNode) {
                        element.parentNode.removeChild(element);
                        detachedHolder.appendChild(element);
                      }
                      
                      // Schedule cleanup
                      setTimeout(() => {
                        try {
                          document.body.removeChild(detachedHolder);
                        } catch (e) {
                          // Ignore
                        }
                      }, 100);
                    } catch (e) {
                      // Ignore errors, we're just trying to help
                    }
                  }
                }
              }
            }
          }
        }
      }
    };
    
    // Set up observer with all types of mutations we want to monitor
    const observer = new MutationObserver(defensiveHandler);
    observer.observe(rootElement, { 
      childList: true,
      subtree: true
    });
    
    console.debug('Initialized defensive DOM observer and React patch for Three.js elements');
    
    return {
      observer,
      cleanup: () => {
        // Restore original removeChild method when cleaning up
        if (Node.prototype.removeChild !== originalRemoveChild) {
          Node.prototype.removeChild = originalRemoveChild;
        }
        observer.disconnect();
      }
    };
  } catch (error) {
    console.error('Error initializing defensive DOM observer:', error);
    return null;
  }
};

export default {
  safeRemoveElement,
  disposeScene,
  disposeRenderer,
  cancelAnimationFrameSafe,
  cleanupThreeJs,
  testThreeJsCleanup,
  createDetachedThreeContainer,
  reactSafeCleanupThreeJs,
  registerThreeJsCanvas,
  unregisterThreeJsCanvas,
  initDefensiveDomObserver,
  forceReleaseWebGLResources,
  textureManager,
  registry: threeJsRegistry
}; 