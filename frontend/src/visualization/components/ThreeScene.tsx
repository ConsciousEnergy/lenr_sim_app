import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useThreeResources } from '../hooks/useThreeResources';
import ThrottledRender from './ThrottledRender';

interface ThreeSceneProps {
  width?: number;
  height?: number;
  backgroundColor?: string;
  onSceneReady?: (scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) => void;
  onRender?: (scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer, controls: OrbitControls) => void;
  optimizeRendering?: boolean;
  frameSkip?: number;
}

const ThreeScene: React.FC<ThreeSceneProps> = ({
  width = window.innerWidth,
  height = window.innerHeight,
  backgroundColor = '#000000',
  onSceneReady,
  onRender,
  optimizeRendering = false,
  frameSkip = 2
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { 
    initializeResources,
    cleanupResources 
  } = useThreeResources();
  
  // State to store resources for throttled rendering
  const [resources, setResources] = useState<{
    scene: THREE.Scene;
    camera: THREE.Camera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
  } | null>(null);

  // Reference to cleanup function to prevent stale closures
  const cleanupRef = useRef<() => void>(() => {
    // Intentionally empty initial function, will be replaced with actual cleanup
  });

  // Initialize and manage three.js resources
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Initialize Three.js resources with container ref and dimensions
    const { scene: newScene, camera: newCamera, renderer: newRenderer, controls: newControls } = 
      initializeResources(containerRef.current, width, height, backgroundColor);
    
    // Store resources for throttled rendering
    setResources({
      scene: newScene,
      camera: newCamera,
      renderer: newRenderer,
      controls: newControls
    });
    
    // Call onSceneReady callback if provided
    if (onSceneReady) {
      onSceneReady(newScene, newCamera, newRenderer);
    }
    
    // Only set up animation loop if not using throttled rendering
    if (!optimizeRendering) {
      // Animation loop
      const animate = () => {
        requestAnimationFrame(animate);
        
        // Call onRender callback if provided
        if (onRender) {
          onRender(newScene, newCamera, newRenderer, newControls);
        }
        
        newRenderer.render(newScene, newCamera);
      };
      
      animate();
    }
    
    // Cleanup function
    cleanupRef.current = () => {
      newRenderer.dispose();
      if (newControls) {
        newControls.dispose();
      }
    };
    
    return () => {
      cleanupResources();
    };
  }, [containerRef, initializeResources, onRender, onSceneReady, cleanupResources, width, height, backgroundColor, optimizeRendering]);

  // Create a handler for the ThrottledRender's onAnimate callback
  const handleThrottledAnimate = (time: number) => {
    if (resources && onRender) {
      onRender(resources.scene, resources.camera, resources.renderer, resources.controls);
    }
  };

  return (
    <>
      <div ref={containerRef} style={{ width, height }} />
      {optimizeRendering && resources && resources.camera instanceof THREE.PerspectiveCamera && (
        <ThrottledRender
          scene={resources.scene}
          camera={resources.camera as THREE.PerspectiveCamera}
          renderer={resources.renderer}
          frameSkip={frameSkip}
          isEnabled={true}
          enableFrustumCulling={true}
          onAnimate={handleThrottledAnimate}
        />
      )}
    </>
  );
};

export default ThreeScene; 