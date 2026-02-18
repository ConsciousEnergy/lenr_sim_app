import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Box, Typography, CircularProgress } from '@mui/material';

/**
 * Simple Three.js Test Component
 * 
 * This component creates a minimal Three.js scene with just a cube
 * to test if Three.js initialization works in the current environment.
 */
const ThreeJsTest: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [webGLInfo, setWebGLInfo] = useState<string>('');

  useEffect(() => {
    // First, check if WebGL is supported
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) {
        setStatus('error');
        setErrorMessage('WebGL is not supported in this browser');
        return;
      }

      // Get WebGL information
      const webGLContext = gl as WebGLRenderingContext;
      const debugInfo = webGLContext.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const vendor = webGLContext.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL as number);
        const renderer = webGLContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL as number);
        setWebGLInfo(`Vendor: ${vendor}, Renderer: ${renderer}`);
      }
    } catch (err) {
      console.error('Error checking WebGL support:', err);
      setStatus('error');
      setErrorMessage('Error checking WebGL support');
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // Try creating a minimal Three.js scene
    try {
      console.log('Initializing Three.js test scene');
      
      // Create scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x2a2a2a);
      
      // Create camera
      const width = container.clientWidth;
      const height = container.clientHeight;
      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      camera.position.z = 5;
      
      // Create renderer with fallback options
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'default',
        preserveDrawingBuffer: true,
        failIfMajorPerformanceCaveat: false
      });
      
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      
      // Clear container and append canvas
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      container.appendChild(renderer.domElement);
      
      // Create a simple cube
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);
      
      // Simple animation loop
      const animate = () => {
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
      };
      
      // Start animation
      animate();
      
      // Set status to success
      setStatus('success');
      console.log('Three.js test scene initialized successfully');
      
      // Cleanup function
      return () => {
        if (renderer && container) {
          container.removeChild(renderer.domElement);
        }
        geometry.dispose();
        material.dispose();
      };
    } catch (err) {
      console.error('Error initializing Three.js:', err);
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Unknown error initializing Three.js');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box sx={{ width: '100%', height: '400px', position: 'relative' }}>
      {status === 'loading' && (
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            backgroundColor: 'rgba(0,0,0,0.7)',
            zIndex: 10
          }}
        >
          <CircularProgress color="info" size={60} thickness={4} />
          <Typography variant="h6" sx={{ mt: 2, color: '#fff' }}>
            Initializing Three.js...
          </Typography>
        </Box>
      )}
      
      {status === 'error' && (
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            backgroundColor: 'rgba(0,0,0,0.7)',
            zIndex: 10,
            p: 3
          }}
        >
          <Typography variant="h6" color="error" gutterBottom>
            Three.js Initialization Failed
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, textAlign: 'center', color: '#fff' }}>
            {errorMessage || 'Failed to initialize 3D visualization'}
          </Typography>
          {webGLInfo && (
            <Typography variant="caption" sx={{ mt: 2, color: '#ddd' }}>
              {webGLInfo}
            </Typography>
          )}
        </Box>
      )}
      
      <Box 
        ref={containerRef} 
        sx={{ 
          width: '100%', 
          height: '100%',
          overflow: 'hidden',
          borderRadius: 1,
          boxShadow: 3
        }} 
      /> 
    </Box>
  );
};

export default ThreeJsTest;