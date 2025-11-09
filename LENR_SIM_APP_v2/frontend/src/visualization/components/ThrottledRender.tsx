import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createUpdateThrottler } from '../utils/renderingOptimizations';

interface ThrottledRenderProps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  frameSkip?: number;
  isEnabled?: boolean;
  enableFrustumCulling?: boolean;
  onAnimate?: (time: number) => void;
}

/**
 * Component to optimize rendering performance by throttling updates
 * and implementing various performance techniques
 */
const ThrottledRender: React.FC<ThrottledRenderProps> = ({
  scene,
  camera,
  renderer,
  frameSkip = 2,
  isEnabled = true,
  enableFrustumCulling = true,
  onAnimate
}) => {
  // Animation frame reference
  const animationFrameRef = useRef<number | null>(null);
  
  // Setup throttling
  const throttlerRef = useRef(createUpdateThrottler(frameSkip));
  
  // Setup culling
  const frustumRef = useRef<THREE.Frustum>(new THREE.Frustum());
  const projScreenMatrixRef = useRef<THREE.Matrix4>(new THREE.Matrix4());

  useEffect(() => {
    if (!isEnabled) return;
    
    // Reset throttler when frameSkip changes
    throttlerRef.current = createUpdateThrottler(frameSkip);
    
    // Animation function
    const animate = (time: number) => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      // Call user animation callback
      if (onAnimate) {
        onAnimate(time);
      }
      
      // Only render every N frames based on throttling
      if (throttlerRef.current.shouldUpdate()) {
        if (enableFrustumCulling) {
          // Update frustum culling
          camera.updateMatrixWorld();
          projScreenMatrixRef.current.multiplyMatrices(
            camera.projectionMatrix,
            camera.matrixWorldInverse
          );
          frustumRef.current.setFromProjectionMatrix(projScreenMatrixRef.current);
        }
        
        // Render the scene
        renderer.render(scene, camera);
      }
    };
    
    // Start animation
    animationFrameRef.current = requestAnimationFrame(animate);
    
    // Cleanup function
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [scene, camera, renderer, isEnabled, frameSkip, enableFrustumCulling, onAnimate]);
  
  // No visible UI - this is just a controller component
  return null;
};

export default ThrottledRender; 