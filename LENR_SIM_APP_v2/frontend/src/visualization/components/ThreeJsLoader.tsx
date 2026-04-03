import React, { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Typography, Button, Link } from '@mui/material';
import * as THREE from 'three';

interface ThreeJsLoaderProps {
  width?: number | string;
  height?: number | string;
  onThreeJsReady?: (_three: typeof THREE, _renderer: THREE.WebGLRenderer, _scene: THREE.Scene, _camera: THREE.Camera) => void;
  onError?: (_error: Error) => void;
  fallback?: React.ReactNode;
  backgroundColor?: string;
  children?: React.ReactNode;
  debugMode?: boolean;
}

/**
 * ThreeJsLoader Component - Handles reliable loading of Three.js with error handling
 * 
 * This component:
 * 1. Initializes Three.js with error boundary
 * 2. Detects WebGL support
 * 3. Provides proper cleanup
 * 4. Offers fallback UI
 */
const ThreeJsLoader: React.FC<ThreeJsLoaderProps> = ({
  width = '100%',
  height = '400px',
  onThreeJsReady,
  onError,
  fallback,
  backgroundColor = '#1a1a1a',
  children,
  debugMode = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [webGLSupported, setWebGLSupported] = useState<boolean | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  // Check WebGL support
  useEffect(() => {
    try {
      if (debugMode) console.log('ThreeJsLoader: Checking WebGL support');
      
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) {
        const noWebGLError = new Error('WebGL is not supported in this browser');
        console.error('ThreeJsLoader:', noWebGLError.message);
        setError(noWebGLError);
        setWebGLSupported(false);
        if (onError) onError(noWebGLError);
        return;
      }
      
      // Get WebGL information
      let webGLInfo = '';
      try {
        const webGLContext = gl as WebGLRenderingContext;
        const debugInfo = webGLContext.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const vendor = webGLContext.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          const renderer = webGLContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          webGLInfo = `Vendor: ${vendor}, Renderer: ${renderer}`;
          setDebugInfo(webGLInfo);
          if (debugMode) console.log('ThreeJsLoader: WebGL Info -', webGLInfo);
        }
      } catch (debugErr) {
        console.warn('Unable to get detailed WebGL info:', debugErr);
      }
      
      setWebGLSupported(true);
      if (debugMode) console.log('ThreeJsLoader: WebGL is supported');
    } catch (err) {
      console.error('Error checking WebGL support:', err);
      setWebGLSupported(false);
      setError(err instanceof Error ? err : new Error('Could not check WebGL support'));
      if (onError) onError(err instanceof Error ? err : new Error('Could not check WebGL support'));
    }
  }, [onError, debugMode]);
  
  // Initialize Three.js
  useEffect(() => {
    if (!containerRef.current || !webGLSupported) return;
    
    try {
      if (debugMode) console.log('ThreeJsLoader: Initializing Three.js');
      
      // Create scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(backgroundColor);
      sceneRef.current = scene;
      
      // Create camera
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      camera.position.z = 5;
      cameraRef.current = camera;
      
      // Create renderer with improved options and fallbacks
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'default', // Use 'default' instead of 'high-performance' for better compatibility
        preserveDrawingBuffer: true,
        failIfMajorPerformanceCaveat: false // Allow software rendering fallback
      });
      
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio to avoid performance issues
      rendererRef.current = renderer;
      
      // Clear container and append canvas
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
      containerRef.current.appendChild(renderer.domElement);
      
      // Add event listener for window resize
      const handleResize = () => {
        if (!containerRef.current || !renderer || !camera) return;
        
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        
        renderer.setSize(width, height);
      };
      
      window.addEventListener('resize', handleResize);
      
      // Call onThreeJsReady callback
      if (onThreeJsReady) {
        try {
        onThreeJsReady(THREE, renderer, scene, camera);
          if (debugMode) console.log('ThreeJsLoader: onThreeJsReady callback executed successfully');
        } catch (callbackError) {
          console.error('Error in onThreeJsReady callback:', callbackError);
          throw callbackError; // Re-throw to be caught by the outer try-catch
        }
      }
      
      // Add a simple animation to ensure rendering is working
      const testSphere = new THREE.Mesh(
        new THREE.SphereGeometry(1, 16, 16), // Reduced complexity for better performance
        new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true })
      );
      scene.add(testSphere);
      
      // Animation loop
      let frameId: number;
      const animate = () => {
        frameId = requestAnimationFrame(animate);
        
        if (testSphere) {
          testSphere.rotation.x += 0.01;
          testSphere.rotation.y += 0.01;
        }
        
        renderer.render(scene, camera);
      };
      
      animate();
      
      // Remove test sphere after confirmation
      setTimeout(() => {
        scene.remove(testSphere);
        setIsLoading(false);
        if (debugMode) console.log('ThreeJsLoader: Initialization complete, loading finished');
      }, 1000);
      
      // Clean up function
      return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(frameId);
        
        if (renderer) {
          if (debugMode) console.log('ThreeJsLoader: Cleaning up renderer and scene');
          renderer.dispose();
          
          // Force garbage collection for scene objects
          if (scene) {
            scene.traverse((object) => {
              if (object instanceof THREE.Mesh) {
                if (object.geometry) {
                  object.geometry.dispose();
                }
                
                if (object.material) {
                  if (Array.isArray(object.material)) {
                    object.material.forEach((material) => material.dispose());
                  } else {
                    object.material.dispose();
                  }
                }
              }
            });
          }
        }
      };
    } catch (err) {
      console.error('Error initializing Three.js:', err);
      setError(err instanceof Error ? err : new Error('Failed to initialize Three.js'));
      setIsLoading(false);
      
      if (onError) {
        onError(err instanceof Error ? err : new Error('Failed to initialize Three.js'));
      }
      
      return () => {};
    }
  }, [backgroundColor, onThreeJsReady, onError, webGLSupported, debugMode]);
  
  // Handle retry
  const handleRetry = () => {
    if (debugMode) console.log('ThreeJsLoader: Retrying initialization');
    setError(null);
    setIsLoading(true);
    
    // Recreate elements
    if (containerRef.current) {
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
    }
    
    // Force reinitialization
    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current = null;
    }
    
    sceneRef.current = null;
    cameraRef.current = null;
  };
  
  // Show loading state
  if (isLoading && !error) {
    return (
      <Box 
        ref={containerRef}
        sx={{ 
          width, 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexDirection: 'column',
          backgroundColor
        }}
      >
        <CircularProgress color="info" size={60} thickness={4} />
        <Typography variant="body1" sx={{ mt: 2, color: '#fff' }}>
          Initializing 3D Visualization...
        </Typography>
        {debugMode && debugInfo && (
          <Typography variant="caption" sx={{ mt: 1, color: '#aaa' }}>
            WebGL: {debugInfo}
          </Typography>
        )}
      </Box>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <Box 
        sx={{ 
          width, 
          height, 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor,
          color: 'white',
          p: 3
        }}
      >
        {!webGLSupported ? (
          <>
            <Typography variant="h6" color="error" gutterBottom>
              WebGL Not Supported
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, textAlign: 'center' }}>
              Your browser or device doesn't support WebGL, which is required for 3D visualization.
              Try using a modern browser like Chrome, Firefox, or Edge.
            </Typography>
            <Typography variant="caption" sx={{ mt: 1, mb: 2, textAlign: 'center', color: '#aaa' }}>
              If you're using a compatible browser, try updating your graphics drivers or enabling hardware acceleration.
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="h6" color="error" gutterBottom>
              Three.js Initialization Failed
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, textAlign: 'center' }}>
              {error.message || 'Failed to initialize 3D visualization'}
            </Typography>
            {debugInfo && (
              <Typography variant="caption" sx={{ mb: 2, textAlign: 'center', color: '#aaa' }}>
                WebGL Info: {debugInfo}
              </Typography>
            )}
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleRetry}
              sx={{ mt: 2 }}
            >
              Try Again
            </Button>
          </>
        )}
        
        {/* Show custom fallback if provided */}
        {fallback && (
          <Box sx={{ mt: 3, width: '100%' }}>
            {fallback}
          </Box>
        )}
        
        {debugMode && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#aaa' }}>
              For troubleshooting, check the <Link href="/three-test" color="inherit" underline="hover">diagnostic page</Link>.
            </Typography>
          </Box>
        )}
      </Box>
    );
  }
  
  // Show container with children
  return (
    <Box 
      ref={containerRef} 
      sx={{ 
        width, 
        height, 
        position: 'relative' 
      }}
    >
      {children}
    </Box>
  );
};

export default ThreeJsLoader; 