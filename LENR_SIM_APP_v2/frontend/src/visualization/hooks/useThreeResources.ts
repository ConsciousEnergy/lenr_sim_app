import { useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface ThreeResources {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  controls: OrbitControls | null;
  initializeResources: (
    container: HTMLDivElement,
    width: number,
    height: number,
    backgroundColor: string
  ) => {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
  };
  cleanupResources: () => void;
}

export const useThreeResources = (): ThreeResources => {
  const [scene, setScene] = useState<THREE.Scene | null>(null);
  const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null);
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null);
  const [controls, setControls] = useState<OrbitControls | null>(null);

  const initializeResources = // eslint-disable-next-line react-hooks/exhaustive-deps
useCallback(
    (container: HTMLDivElement, width: number, height: number, backgroundColor: string) => {
      // Create scene
      const newScene = new THREE.Scene();
      newScene.background = new THREE.Color(backgroundColor);
      setScene(newScene);

      // Create camera
      const newCamera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      newCamera.position.z = 5;
      setCamera(newCamera);

      // Create renderer
      const newRenderer = new THREE.WebGLRenderer({ antialias: true });
      newRenderer.setSize(width, height);
      newRenderer.setPixelRatio(window.devicePixelRatio);
      container.appendChild(newRenderer.domElement);
      setRenderer(newRenderer);

      // Create controls
      const newControls = new OrbitControls(newCamera, newRenderer.domElement);
      newControls.enableDamping = true;
      newControls.dampingFactor = 0.05;
      setControls(newControls);

      return { scene: newScene, camera: newCamera, renderer: newRenderer, controls: newControls };
    },
    []
  );

  const cleanupResources = useCallback(() => {
    // Dispose of geometries
    scene?.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });

    // Dispose of renderer
    if (renderer) {
      renderer.dispose();
      renderer.domElement.remove();
    }

    // Clear state
    setScene(null);
    setCamera(null);
    setRenderer(null);
    setControls(null);
  }, [scene, renderer]);

  return {
    scene,
    camera,
    renderer,
    controls,
    initializeResources,
    cleanupResources,
  };
}; 