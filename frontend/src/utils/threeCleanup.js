/**
 * Utility functions for proper cleanup of Three.js resources
 */

// Clean up Three.js resources to prevent memory leaks
const cleanupThreeJS = (scene, renderer, controls) => {
  if (!scene || !renderer) return;

  // Dispose of all geometries and materials
  scene.traverse((object) => {
    if (object.geometry) {
      object.geometry.dispose();
    }

    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach(material => material.dispose());
      } else {
        object.material.dispose();
      }
    }
  });

  // Dispose of renderer
  if (renderer.domElement) {
    renderer.dispose();
    try {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    } catch (e) {
      console.warn('Could not remove renderer DOM element:', e);
    }
  }

  // Dispose of controls if available
  if (controls && typeof controls.dispose === 'function') {
    controls.dispose();
  }
};

// Initialize defensive DOM observer to prevent React DOM removal errors
const initDefensiveDomObserver = (rootSelector) => {
  const root = document.querySelector(rootSelector);
  if (!root) {
    console.warn(`Root element with selector "${rootSelector}" not found`);
    return null;
  }

  // Create observer to watch for DOM removals
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.removedNodes.length) {
        // Check if any Three.js canvases were removed and handle cleanup
        Array.from(mutation.removedNodes).forEach(node => {
          if (node.nodeName === 'CANVAS' && node._threeRenderer) {
            console.debug('Detected Three.js canvas removal, running cleanup');
            cleanupThreeJS(node._threeScene, node._threeRenderer, node._threeControls);
          }
        });
      }
    }
  });

  // Start observing
  observer.observe(root, { childList: true, subtree: true });

  // Return cleanup function
  return {
    cleanup: () => {
      observer.disconnect();
    }
  };
};

// Helper function to handle arguments inspection safely
const inspectArgs = (args) => {
  try {
    if (!args || !args.length) return 'No arguments';
    return Array.from(args).map(arg => typeof arg).join(', ');
  } catch (e) {
    return 'Error inspecting arguments';
  }
};

// Create utils object with all functions
const threeCleanupUtils = {
  cleanupThreeJS,
  initDefensiveDomObserver,
  inspectArgs
};

export default threeCleanupUtils; 