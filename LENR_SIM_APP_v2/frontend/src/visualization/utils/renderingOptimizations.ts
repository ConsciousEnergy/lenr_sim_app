import * as THREE from 'three';
import { LatticeData } from '../components/LatticeStructure';

/**
 * Utility functions for optimizing rendering performance in Three.js visualizations
 */

/**
 * Creates a level-of-detail (LOD) version of lattice points for better performance
 * with large datasets. This creates multiple resolution versions of the same
 * lattice point geometry that are swapped based on camera distance.
 */
export const createLODLatticePoints = (
  scene: THREE.Scene, 
  latticeData: LatticeData,
  materialFn: (index: number) => THREE.Material
): THREE.LOD[] => {
  const lodObjects: THREE.LOD[] = [];
  
  // Create different detail levels for spheres
  const highDetailSphereGeometry = new THREE.SphereGeometry(0.1, 16, 16);
  const medDetailSphereGeometry = new THREE.SphereGeometry(0.1, 8, 8);
  const lowDetailSphereGeometry = new THREE.SphereGeometry(0.1, 6, 6);
  
  // Create LOD for each lattice point
  latticeData.points.forEach((point, index) => {
    const lod = new THREE.LOD();
    lod.position.set(point.position[0], point.position[1], point.position[2]);
    
    // High detail (close camera distance)
    const highDetailMesh = new THREE.Mesh(highDetailSphereGeometry, materialFn(index));
    lod.addLevel(highDetailMesh, 0);
    
    // Medium detail (medium camera distance)
    const medDetailMesh = new THREE.Mesh(medDetailSphereGeometry, materialFn(index));
    lod.addLevel(medDetailMesh, 10);
    
    // Low detail (far camera distance)
    const lowDetailMesh = new THREE.Mesh(lowDetailSphereGeometry, materialFn(index));
    lod.addLevel(lowDetailMesh, 50);
    
    // Add to scene and track
    scene.add(lod);
    lodObjects.push(lod);
  });
  
  return lodObjects;
};

/**
 * Creates an instance mesh for efficient rendering of many similar objects
 */
export const createInstancedLatticePoints = (
  scene: THREE.Scene,
  latticeData: LatticeData,
  colorArray: Float32Array
): THREE.InstancedMesh => {
  // Create base geometry and material
  const geometry = new THREE.SphereGeometry(0.1, 12, 12);
  const material = new THREE.MeshPhongMaterial({
    vertexColors: true,
    shininess: 80,
    transparent: true,
    opacity: 0.8
  });
  
  // Create instanced mesh
  const instancedMesh = new THREE.InstancedMesh(
    geometry, 
    material, 
    latticeData.points.length
  );
  instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  
  // Set up instanced attributes
  const colorAttrib = new THREE.InstancedBufferAttribute(colorArray, 3);
  geometry.setAttribute('color', colorAttrib);
  
  // Set transform matrix for each instance
  const dummy = new THREE.Object3D();
  latticeData.points.forEach((point, index) => {
    dummy.position.set(point.position[0], point.position[1], point.position[2]);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(index, dummy.matrix);
  });
  
  // Update instance matrices
  instancedMesh.instanceMatrix.needsUpdate = true;
  
  // Add to scene
  scene.add(instancedMesh);
  
  return instancedMesh;
};

/**
 * Creates a chunked geometry for large lattice connections
 * by splitting them into multiple line segments
 */
export const createChunkedConnections = (
  scene: THREE.Scene,
  latticeData: LatticeData,
  material: THREE.Material,
  chunkSize: number = 1000
): THREE.LineSegments[] => {
  const lineSegments: THREE.LineSegments[] = [];
  const totalConnections = latticeData.connections.length;
  const chunks = Math.ceil(totalConnections / chunkSize);
  
  // Create chunks of connections
  for (let i = 0; i < chunks; i++) {
    const startIdx = i * chunkSize;
    const endIdx = Math.min(startIdx + chunkSize, totalConnections);
    const chunkConnections = latticeData.connections.slice(startIdx, endIdx);
    
    // Create geometry for this chunk
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(chunkConnections.length * 6);
    
    // Fill positions
    chunkConnections.forEach(([from, to], idx) => {
      const fromPoint = latticeData.points[from].position;
      const toPoint = latticeData.points[to].position;
      
      positions[idx * 6] = fromPoint[0];
      positions[idx * 6 + 1] = fromPoint[1];
      positions[idx * 6 + 2] = fromPoint[2];
      positions[idx * 6 + 3] = toPoint[0];
      positions[idx * 6 + 4] = toPoint[1];
      positions[idx * 6 + 5] = toPoint[2];
    });
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Create line segments and add to scene
    const lines = new THREE.LineSegments(geometry, material);
    scene.add(lines);
    lineSegments.push(lines);
  }
  
  return lineSegments;
};

/**
 * Sets up frustum culling for improved performance with large datasets
 */
export const setupFrustumCulling = (
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
): { update: () => void } => {
  const frustum = new THREE.Frustum();
  const projScreenMatrix = new THREE.Matrix4();
  
  // Update function to call on animation frame
  const update = () => {
    camera.updateMatrixWorld();
    projScreenMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    frustum.setFromProjectionMatrix(projScreenMatrix);
    
    // This enables automatic frustum culling in Three.js
    renderer.render(scene, camera);
  };
  
  return { update };
};

/**
 * Creates a simplified version of the lattice for very large datasets
 */
export const createSimplifiedLattice = (
  latticeData: LatticeData,
  simplificationFactor: number
): LatticeData => {
  // Skip points based on simplification factor
  const simplifiedPoints = latticeData.points.filter(
    (_, index) => index % simplificationFactor === 0
  );
  
  // Create a mapping from old indices to new indices
  const indexMap = new Map<number, number>();
  latticeData.points.forEach((_, oldIndex) => {
    if (oldIndex % simplificationFactor === 0) {
      const newIndex = Math.floor(oldIndex / simplificationFactor);
      indexMap.set(oldIndex, newIndex);
    }
  });
  
  // Filter connections that have both endpoints in the simplified set
  const simplifiedConnections = latticeData.connections.filter(
    ([from, to]) => indexMap.has(from) && indexMap.has(to)
  ).map(
    ([from, to]) => [indexMap.get(from)!, indexMap.get(to)!] as [number, number]
  );
  
  return {
    points: simplifiedPoints,
    connections: simplifiedConnections,
    latticeConstants: latticeData.latticeConstants,
    unitCell: latticeData.unitCell
  };
};

/**
 * Utility to throttle updates for improved performance 
 */
export const createUpdateThrottler = (frameSkip: number = 2): {
  shouldUpdate: () => boolean;
  reset: () => void;
} => {
  let frameCount = 0;
  
  return {
    shouldUpdate: () => {
      frameCount = (frameCount + 1) % (frameSkip + 1);
      return frameCount === 0;
    },
    reset: () => {
      frameCount = 0;
    }
  };
};

/**
 * Rendering optimizations for WebGL and Three.js to prevent browser timeouts
 */

/**
 * Configures a Three.js renderer with optimized settings to prevent timeout
 * @param renderer The Three.js WebGLRenderer to optimize
 */
export const optimizeRenderer = (renderer: THREE.WebGLRenderer): void => {
  // Set power preference to high-performance for better GPU utilization
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio to prevent performance issues
  
  // Enable shader precision optimizations
  renderer.debug.checkShaderErrors = process.env.NODE_ENV === 'development';
  
  // Enable WebGL optimizations
  const gl = renderer.getContext();
  
  // Set optimal hint for fragment shader derivatives (WebGL2 only)
  if (gl instanceof WebGL2RenderingContext) {
    gl.hint(gl.FRAGMENT_SHADER_DERIVATIVE_HINT, gl.FASTEST);
  }
};

/**
 * Optimizes a Three.js scene to reduce rendering load
 * @param scene The Three.js scene to optimize
 */
export const optimizeScene = (scene: THREE.Scene): void => {
  // Use frustum culling for all objects
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.frustumCulled = true;
      
      // Optimize geometry
      if (object.geometry && !object.geometry.boundingSphere) {
        object.geometry.computeBoundingSphere();
      }
      
      // Use simpler materials when far from camera
      if (object.material instanceof THREE.MeshStandardMaterial) {
        // Reduce costly lighting calculations for distant objects
        object.userData.originalMaterial = object.material;
      }
    }
  });
};

/**
 * Implements adaptive quality based on frame rate
 * @param renderer The Three.js WebGLRenderer
 * @param camera The Three.js Camera
 * @returns A function to call in animation loop to monitor and adapt performance
 */
export const createAdaptiveQuality = (
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera
) => {
  const clock = new THREE.Clock();
  let frameCounter = 0;
  let frameTime = 0;
  const frameTimeHistory: number[] = [];
  let qualityLevel = 1.0; // 1.0 is full quality
  
  return () => {
    const delta = clock.getDelta();
    frameTime += delta;
    frameCounter++;
    
    // Check frame rate every second
    if (frameTime >= 1.0) {
      const fps = frameCounter / frameTime;
      frameTimeHistory.push(fps);
      
      // Keep only the last 5 frame rates
      if (frameTimeHistory.length > 5) {
        frameTimeHistory.shift();
      }
      
      // Calculate average frame rate
      const avgFps = frameTimeHistory.reduce((a, b) => a + b, 0) / frameTimeHistory.length;
      
      // Adjust quality based on frame rate
      if (avgFps < 30 && qualityLevel > 0.5) {
        qualityLevel = Math.max(0.5, qualityLevel - 0.1);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio * qualityLevel, 2));
        console.log(`Reducing render quality to ${qualityLevel.toFixed(2)} due to low frame rate (${avgFps.toFixed(2)} FPS)`);
      } else if (avgFps > 55 && qualityLevel < 1.0) {
        qualityLevel = Math.min(1.0, qualityLevel + 0.05);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio * qualityLevel, 2));
        console.log(`Increasing render quality to ${qualityLevel.toFixed(2)} due to high frame rate (${avgFps.toFixed(2)} FPS)`);
      }
      
      // Reset counters
      frameCounter = 0;
      frameTime = 0;
    }
  };
};

/**
 * Detects WebGL capabilities and returns appropriate rendering settings
 * @returns Optimized WebGL settings based on device capabilities
 */
export const detectWebGLCapabilities = (): {
  maxAnisotropy: number;
  maxPrecision: string;
  maxTextureSize: number;
  isWebGL2: boolean;
  isMobile: boolean;
} => {
  // Create a temporary renderer to detect capabilities
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
  });
  
  const gl = renderer.getContext();
  const isWebGL2 = gl instanceof WebGL2RenderingContext;
  
  // Check device type
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  
  // Get texture capabilities
  const textureExt = gl.getExtension('WEBGL_debug_renderer_info');
  const glRenderer = textureExt 
    ? gl.getParameter(textureExt.UNMASKED_RENDERER_WEBGL)
    : '';
  
  console.log(`WebGL Renderer: ${glRenderer}`);
  
  // Detect maximum texture size
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  
  // Detect anisotropic filtering support
  const capabilities = renderer.capabilities;
  const maxAnisotropy = capabilities.getMaxAnisotropy();
  
  // Detect shader precision
  const maxPrecision = capabilities.precision;
  
  // Clean up temporary renderer
  renderer.dispose();
  canvas.remove();
  
  return {
    maxAnisotropy,
    maxPrecision,
    maxTextureSize,
    isWebGL2,
    isMobile,
  };
};

/**
 * Checks if the browser is experiencing WebGL context loss
 * and handles recovery
 * @param canvas The canvas element to monitor
 * @param onContextLost Callback when context is lost
 * @param onContextRestored Callback when context is restored
 */
export const setupWebGLContextHandling = (
  canvas: HTMLCanvasElement,
  onContextLost?: () => void,
  onContextRestored?: () => void
): void => {
  canvas.addEventListener('webglcontextlost', (event) => {
    console.warn('WebGL context lost');
    event.preventDefault();
    if (onContextLost) onContextLost();
  });
  
  canvas.addEventListener('webglcontextrestored', () => {
    console.log('WebGL context restored');
    if (onContextRestored) onContextRestored();
  });
};

/**
 * Manages memory usage and garbage collection to prevent timeouts
 * @param renderer The Three.js WebGLRenderer
 * @param scene The Three.js Scene
 * @returns A cleanup function to dispose of resources
 */
export const setupMemoryManagement = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene
): () => void => {
  // Force garbage collection when supported (Chrome with --js-flags=--expose-gc)
  const forceGC = () => {
    if (typeof window.gc === 'function') {
      window.gc();
    }
  };
  
  // Disposable tracking cache
  const disposables = new Set<THREE.Object3D | THREE.Material | THREE.Texture | THREE.BufferGeometry>();
  
  // Track disposable objects
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      disposables.add(object);
      
      if (object.geometry) {
        disposables.add(object.geometry);
      }
      
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(mat => disposables.add(mat));
        } else {
          disposables.add(object.material);
          
          // Track textures
          const material = object.material as THREE.Material;
          Object.keys(material).forEach(key => {
            const value = (material as any)[key];
            if (value instanceof THREE.Texture) {
              disposables.add(value);
            }
          });
        }
      }
    }
  });
  
  // Return cleanup function
  return () => {
    disposables.forEach(item => {
      if (item instanceof THREE.Object3D) {
        if (item.parent) {
          item.parent.remove(item);
        }
      }
      
      if ('dispose' in item && typeof item.dispose === 'function') {
        item.dispose();
      }
    });
    
    // Clear cache
    disposables.clear();
    
    // Force renderer to release GPU resources
    renderer.dispose();
    
    // Try to force garbage collection
    setTimeout(forceGC, 100);
  };
};

// Custom type for window with gc property
declare global {
  interface Window {
    gc?: () => void;
  }
} 