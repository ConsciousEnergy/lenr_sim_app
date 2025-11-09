import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Box, CircularProgress, Typography } from '@mui/material';

interface TestCubeProps {
  width?: number | string;
  height?: number | string;
  complexity?: 'low' | 'medium' | 'high';
  onRenderSuccess?: () => void;
  onRenderError?: (error: Error) => void;
}

/**
 * TestCube component for testing Three.js rendering with different complexity levels
 * This helps diagnose WebGL compatibility issues
 */
const TestCube: React.FC<TestCubeProps> = ({ 
  width = '100%', 
  height = 400, 
  complexity = 'low',
  onRenderSuccess,
  onRenderError
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Store references for cleanup
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const frameIdRef = useRef<number | null>(null);
  
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!containerRef.current) {
        throw new Error('Container reference not available');
      }
      
      // Create scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x121218);
      sceneRef.current = scene;
      
      // Create camera
      const camera = new THREE.PerspectiveCamera(
        75, 
        containerRef.current.clientWidth / containerRef.current.clientHeight, 
        0.1, 
        1000
      );
      camera.position.z = 5;
      cameraRef.current = camera;
      
      // Create renderer
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;
      
      // Add orbit controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controlsRef.current = controls;
      
      // Add ambient light
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);
      
      // Add directional light
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(1, 1, 1);
      scene.add(directionalLight);
      
      // Create geometry based on complexity level
      let geometry: THREE.BufferGeometry;
      let material: THREE.Material;
      
      switch (complexity) {
        case 'high':
          // High complexity: Detailed geometry with high-poly count and complex material
          geometry = new THREE.TorusKnotGeometry(1, 0.3, 128, 64, 2, 3);
          material = new THREE.MeshPhysicalMaterial({ 
            color: 0x3498db, 
            metalness: 0.8,
            roughness: 0.2,
            clearcoat: 1.0,
            clearcoatRoughness: 0.2,
            reflectivity: 1.0
          });
          
          // Add post-processing or more complex features here
          // Note: These would be more complex in a real application
          break;
        
        case 'medium':
          // Medium complexity: More detailed geometry and standard material
          geometry = new THREE.IcosahedronGeometry(1, 3);
          material = new THREE.MeshStandardMaterial({ 
            color: 0x2ecc71,
            metalness: 0.5,
            roughness: 0.5,
            flatShading: true
          });
          break;
        
        case 'low':
        default:
          // Low complexity: Simple cube with basic material
          geometry = new THREE.BoxGeometry(1, 1, 1);
          material = new THREE.MeshBasicMaterial({ 
            color: 0xe74c3c,
            wireframe: false
          });
          break;
      }
      
      // Create mesh and add to scene
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      
      // Add gridHelper as a reference
      const gridHelper = new THREE.GridHelper(10, 10);
      scene.add(gridHelper);
      
      // Animation loop
      const animate = () => {
        frameIdRef.current = requestAnimationFrame(animate);
        
        // Rotate the mesh
        if (mesh) {
          mesh.rotation.x += 0.005;
          mesh.rotation.y += 0.01;
        }
        
        // Update controls
        if (controlsRef.current) {
          controlsRef.current.update();
        }
        
        // Render scene
        renderer.render(scene, camera);
      };
      
      // Start animation
      animate();
      
      // Handle window resize
      const handleResize = () => {
        if (!containerRef.current || !camera || !renderer) return;
        
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        
        renderer.setSize(width, height);
      };
      
      window.addEventListener('resize', handleResize);
      
      // Signal successful rendering
      setIsLoading(false);
      if (onRenderSuccess) {
        onRenderSuccess();
      }
      
      // Clean up
      return () => {
        // Cancel animation frame
        if (frameIdRef.current !== null) {
          cancelAnimationFrame(frameIdRef.current);
        }
        
        // Remove resize listener
        window.removeEventListener('resize', handleResize);
        
        // Dispose of Three.js resources
        if (geometry) geometry.dispose();
        if (material && 'dispose' in material) material.dispose();
        
        // Remove renderer DOM element
        if (rendererRef.current && containerRef.current) {
          containerRef.current.removeChild(rendererRef.current.domElement);
          rendererRef.current.dispose();
        }
        
        // Clear refs
        sceneRef.current = null;
        cameraRef.current = null;
        controlsRef.current = null;
        rendererRef.current = null;
      };
    } catch (err) {
      console.error('Error initializing Three.js:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
      
      if (onRenderError) {
        onRenderError(err instanceof Error ? err : new Error('Unknown error'));
      }
    }
  }, [complexity, onRenderSuccess, onRenderError]);
  
  return (
    <Box 
      ref={containerRef}
      sx={{ 
        width, 
        height, 
        position: 'relative',
        overflow: 'hidden',
        bgcolor: '#121218'
      }}
    >
      {isLoading && (
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            bgcolor: 'rgba(0,0,0,0.5)',
            zIndex: 10
          }}
        >
          <CircularProgress color="primary" size={40} />
          <Typography variant="body2" color="white" sx={{ mt: 2 }}>
            Initializing {complexity} complexity visualization...
          </Typography>
        </Box>
      )}
      
      {error && (
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            bgcolor: 'rgba(30,0,0,0.7)',
            color: 'white',
            p: 3,
            zIndex: 10
          }}
        >
          <Typography variant="subtitle1" gutterBottom>
            Rendering Error
          </Typography>
          <Typography variant="body2" align="center">
            {error}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default TestCube; 