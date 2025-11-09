/**
 * Material UI Patching Utility
 * 
 * This script patches Material UI components to fix deprecated props usage.
 * It specifically targets the Grid component to migrate from v1 to v2 props.
 */

// Function to patch MUI Grid component
export const patchMuiGrid = () => {
  if (typeof window === 'undefined') return; // Server-side rendering guard
  
  // Function to apply the patch once MUI is loaded
  const applyPatch = () => {
    if (window.MaterialUI && window.MaterialUI.Grid) {
      console.log('Patching Material UI Grid component...');
      
      // Keep reference to the original component
      const originalGrid = window.MaterialUI.Grid;
      
      // Create a patched version that replaces v1 props with v2 props
      window.MaterialUI.Grid = function PatchedGrid(props) {
        // Convert deprecated props to new format
        const newProps = {...props};
        
        // Handle 'item' prop removal
        if ('item' in newProps) {
          delete newProps.item;
        }
        
        // Handle 'xs', 'sm', 'md', 'lg', 'xl' prop migration
        const breakpoints = ['xs', 'sm', 'md', 'lg', 'xl'];
        for (const bp of breakpoints) {
          if (bp in newProps) {
            newProps.gridSize = newProps.gridSize || {};
            newProps.gridSize[bp] = newProps[bp];
            delete newProps[bp];
          }
        }
        
        // Call original component with updated props
        return originalGrid(newProps);
      };
      
      console.log('Material UI Grid component patched successfully');
      return true;
    }
    
    return false;
  };
  
  // Try to apply patch immediately
  if (!applyPatch()) {
    // If MUI isn't loaded yet, set up a timeout to try again
    console.log('Material UI not loaded yet, setting up patch for later');
    
    // Try to apply the patch after a delay
    setTimeout(() => {
      applyPatch();
    }, 1000);
  }
};

// Export default function for easy importing
export const initializeMuiPatches = () => {
  patchMuiGrid();
};

export default initializeMuiPatches; 