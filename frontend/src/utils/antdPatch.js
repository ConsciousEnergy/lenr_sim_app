/**
 * Ant Design Component Patching Utility
 * 
 * This script patches Ant Design components to fix deprecated props usage.
 * It specifically targets the Card component's bodyStyle warning.
 */

// Function to patch Ant Design Card component
export const patchAntDesignCard = () => {
  if (typeof window === 'undefined') return; // Server-side rendering guard
  
  // Function to apply the patch once Ant Design is loaded
  const applyPatch = () => {
    if (window.antd && window.antd.Card) {
      console.log('Patching Ant Design Card component...');
      
      // Keep reference to the original component
      const originalCard = window.antd.Card;
      
      // Create a patched version that replaces bodyStyle with styles.body
      window.antd.Card = function PatchedCard(props) {
        // Convert deprecated props to new format
        const newProps = {...props};
        
        if (newProps.bodyStyle) {
          newProps.styles = newProps.styles || {};
          newProps.styles.body = newProps.bodyStyle;
          delete newProps.bodyStyle;
        }
        
        // Handle other potential deprecated props
        if (newProps.headStyle) {
          newProps.styles = newProps.styles || {};
          newProps.styles.header = newProps.headStyle;
          delete newProps.headStyle;
        }
        
        // Call original component with updated props
        return originalCard(newProps);
      };
      
      console.log('Ant Design Card component patched successfully');
      return true;
    }
    
    return false;
  };
  
  // Try to apply patch immediately
  if (!applyPatch()) {
    // If Ant Design isn't loaded yet, set up checks to apply when it loads
    console.log('Ant Design not loaded yet, setting up patch for later');
    
    // Set up MutationObserver to detect when Ant Design components appear in DOM
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of Array.from(mutation.addedNodes)) {
            if (node instanceof HTMLElement) {
              // Look for ant-card classes which indicate Ant Design Card is in use
              if (node.querySelector('.ant-card') || (node.className && node.className.includes && node.className.includes('ant-card'))) {
                if (applyPatch()) {
                  observer.disconnect();
                  return;
                }
              }
            }
          }
        }
      }
    });
    
    // Start observing the document with the configured parameters
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Also set a timeout to check again after a delay in case we missed it
    setTimeout(() => {
      if (applyPatch()) {
        observer.disconnect();
      }
    }, 2000);
  }
};

// Function to monkey patch React component props that have deprecation warnings
export const setupReactPropsPatcher = () => {
  if (typeof window === 'undefined') return; // Server-side rendering guard
  
  // Set up the React patching function
  if (window.React && window.React.createElement) {
    const originalCreateElement = window.React.createElement;
    
    window.React.createElement = function patchedCreateElement(type, props, ...children) {
      // If not a component or no props, pass through
      if (!props || typeof type !== 'string' && typeof type !== 'function') {
        return originalCreateElement(type, props, ...children);
      }
      
      // Get component name
      const componentName = typeof type === 'string' 
        ? type 
        : type.displayName || type.name || 'UnknownComponent';
      
      // Clone props to avoid mutating the original
      let patchedProps = {...props};
      
      // Fix for Card component
      if (componentName === 'Card' || componentName.endsWith('Card')) {
        if (patchedProps.bodyStyle) {
          patchedProps.styles = patchedProps.styles || {};
          patchedProps.styles.body = patchedProps.bodyStyle;
          delete patchedProps.bodyStyle;
        }
      }
      
      // Call original createElement with patched props
      return originalCreateElement(type, patchedProps, ...children);
    };
    
    console.log('React createElement patched for prop deprecation warnings');
  } else {
    console.log('React not available for patching');
  }
};

// Auto-initialize patches
export const initializeAntDesignPatches = () => {
  patchAntDesignCard();
  setupReactPropsPatcher();
};

// Export default function for easy importing
export default initializeAntDesignPatches; 