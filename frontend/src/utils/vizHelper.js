/**
 * Visualization Helper Utilities for Three.js
 * 
 * Provides common functions for working with Three.js visualizations
 * in the LENR Simulation Application
 */

import * as THREE from 'three';
import logger from './logger';

// Create a specialized logger for viz operations
const vizLog = logger.create('viz');

/**
 * Generates a standard material with specified properties
 * 
 * @param {Object} options - Material options
 * @param {number|string} options.color - Material color
 * @param {number} options.opacity - Material opacity (0-1)
 * @param {boolean} options.transparent - Whether material is transparent
 * @param {number} options.metalness - Material metalness (0-1)
 * @param {number} options.roughness - Material roughness (0-1)
 * @param {boolean} options.wireframe - Whether to show wireframe
 * @returns {THREE.Material} The created material
 */
const createMaterial = ({
  color = 0xffffff,
  opacity = 1.0,
  transparent = false,
  metalness = 0.5,
  roughness = 0.5,
  wireframe = false
} = {}) => {
  // Convert string color to hex if needed
  if (typeof color === 'string') {
    color = new THREE.Color(color).getHex();
  }
  
  const material = new THREE.MeshStandardMaterial({
    color,
    opacity,
    transparent: transparent || opacity < 1.0,
    metalness,
    roughness,
    wireframe
  });
  
  return material;
};

/**
 * Creates a pooled geometry for reuse
 * 
 * @param {Object} geometryPool - Pool to store geometries
 * @param {string} type - Type of geometry
 * @param {Object} params - Parameters for geometry creation
 * @returns {THREE.BufferGeometry} The created or retrieved geometry
 */
const createPooledGeometry = (geometryPool, type, params = {}) => {
  const key = `${type}_${JSON.stringify(params)}`;
  
  if (geometryPool[key]) {
    return geometryPool[key];
  }
  
  let geometry;
  switch(type) {
    case 'sphere':
      geometry = new THREE.SphereGeometry(
        params.radius || 1,
        params.widthSegments || 32,
        params.heightSegments || 16
      );
      break;
    case 'box':
      geometry = new THREE.BoxGeometry(
        params.width || 1,
        params.height || 1,
        params.depth || 1
      );
      break;
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(
        params.radiusTop || 1,
        params.radiusBottom || 1,
        params.height || 1,
        params.radialSegments || 32
      );
      break;
    case 'torus':
      geometry = new THREE.TorusGeometry(
        params.radius || 1,
        params.tube || 0.4,
        params.radialSegments || 16,
        params.tubularSegments || 100
      );
      break;
    case 'plane':
      geometry = new THREE.PlaneGeometry(
        params.width || 1,
        params.height || 1
      );
      break;
    default:
      vizLog.warn(`Unknown geometry type: ${type}`);
      geometry = new THREE.SphereGeometry(1, 16, 12);
  }
  
  // Store in pool for reuse
  geometryPool[key] = geometry;
  return geometry;
};

/**
 * Creates a basic setup for a Three.js scene
 * 
 * @param {HTMLElement} container - DOM element to contain the renderer
 * @param {Object} options - Scene setup options
 * @returns {Object} Scene, camera, renderer, and controls
 */
const createBasicScene = (container, options = {}) => {
  if (!container) {
    vizLog.error('Container element is required for createBasicScene');
    return null;
  }
  
  const {
    backgroundColor = 0xf0f0f0,
    cameraFov = 75,
    cameraNear = 0.1,
    cameraFar = 1000,
    cameraPosition = { x: 0, y: 0, z: 10 },
    controlsEnabled = true,
    ambientLightColor = 0xffffff,
    ambientLightIntensity = 0.5,
    directionalLightColor = 0xffffff,
    directionalLightIntensity = 0.8,
    directionalLightPosition = { x: 5, y: 10, z: 7.5 },
    addAxesHelper = false,
    axesHelperSize = 5
  } = options;
  
  // Create scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(backgroundColor);
  
  // Create camera
  const aspect = container.clientWidth / container.clientHeight;
  const camera = new THREE.PerspectiveCamera(cameraFov, aspect, cameraNear, cameraFar);
  camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
  
  // Create renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  
  // Add to container
  container.innerHTML = '';
  container.appendChild(renderer.domElement);
  
  // Add lights
  const ambientLight = new THREE.AmbientLight(ambientLightColor, ambientLightIntensity);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(directionalLightColor, directionalLightIntensity);
  directionalLight.position.set(
    directionalLightPosition.x,
    directionalLightPosition.y,
    directionalLightPosition.z
  );
  scene.add(directionalLight);
  
  // Add axes helper if enabled
  if (addAxesHelper) {
    const axesHelper = new THREE.AxesHelper(axesHelperSize);
    scene.add(axesHelper);
  }
  
  // Set up controls if enabled
  let controls = null;
  if (controlsEnabled) {
    // Import is handled dynamically to avoid bundling issues
    import('three/examples/jsm/controls/OrbitControls')
      .then(({ OrbitControls }) => {
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
      })
      .catch(err => {
        vizLog.error('Failed to load OrbitControls', err);
      });
  }
  
  // Handle window resize
  const handleResize = () => {
    if (!container) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
  };
  
  window.addEventListener('resize', handleResize);
  
  // Return the created objects
  return {
    scene,
    camera,
    renderer,
    controls,
    dispose: () => {
      window.removeEventListener('resize', handleResize);
      
      // Note: scene cleanup should be handled separately with threeCleanup utility
      // This just removes the event listener
    }
  };
};

/**
 * Creates animated particles in a scene with specified parameters
 * 
 * @param {THREE.Scene} scene - Three.js scene to add particles to
 * @param {Object} options - Particle options
 * @returns {Object} Particle system with update method
 */
const createParticleSystem = (scene, options = {}) => {
  if (!scene) {
    vizLog.error('Scene is required for createParticleSystem');
    return null;
  }
  
  const {
    count = 100,
    color = 0xffffff,
    size = 0.05,
    speed = 0.01,
    spread = 10,
    opacity = 0.7,
    blending = THREE.AdditiveBlending,
    texture = null
  } = options;
  
  // Create particle geometry
  const particles = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  
  // Initialize positions and velocities
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    
    // Random position within spread
    positions[i3] = (Math.random() - 0.5) * spread;
    positions[i3 + 1] = (Math.random() - 0.5) * spread;
    positions[i3 + 2] = (Math.random() - 0.5) * spread;
    
    // Random velocity
    velocities[i3] = (Math.random() - 0.5) * speed;
    velocities[i3 + 1] = (Math.random() - 0.5) * speed;
    velocities[i3 + 2] = (Math.random() - 0.5) * speed;
  }
  
  particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  // Create material with optional texture
  let particleMaterial;
  
  if (texture) {
    // Load texture for particles if provided
    const textureLoader = new THREE.TextureLoader();
    const particleTexture = textureLoader.load(texture);
    
    particleMaterial = new THREE.PointsMaterial({
      size,
      map: particleTexture,
      transparent: true,
      opacity,
      blending,
      depthWrite: false,
      color
    });
  } else {
    // Simple particles without texture
    particleMaterial = new THREE.PointsMaterial({
      size,
      transparent: true,
      opacity,
      blending,
      depthWrite: false,
      color
    });
  }
  
  // Create the particle system
  const particleSystem = new THREE.Points(particles, particleMaterial);
  scene.add(particleSystem);
  
  // Return particle system with update method
  return {
    particleSystem,
    update: () => {
      const positions = particles.attributes.position.array;
      
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        
        // Update positions based on velocities
        positions[i3] += velocities[i3];
        positions[i3 + 1] += velocities[i3 + 1];
        positions[i3 + 2] += velocities[i3 + 2];
        
        // Wrap particles that move out of bounds
        const wrap = (index, limit) => {
          if (positions[index] > limit) {
            positions[index] = -limit;
          } else if (positions[index] < -limit) {
            positions[index] = limit;
          }
        };
        
        wrap(i3, spread / 2);
        wrap(i3 + 1, spread / 2);
        wrap(i3 + 2, spread / 2);
      }
      
      particles.attributes.position.needsUpdate = true;
    },
    dispose: () => {
      scene.remove(particleSystem);
      particles.dispose();
      particleMaterial.dispose();
    }
  };
};

/**
 * Creates a gradient background for the scene
 * 
 * @param {THREE.Scene} scene - Three.js scene
 * @param {Object} options - Gradient options
 * @returns {THREE.Mesh} The background mesh
 */
const createGradientBackground = (scene, options = {}) => {
  const {
    topColor = 0x88ccff,
    bottomColor = 0x000000
  } = options;
  
  // Create the gradient texture
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  
  // Create gradient
  const gradient = context.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, `#${new THREE.Color(topColor).getHexString()}`);
  gradient.addColorStop(1, `#${new THREE.Color(bottomColor).getHexString()}`);
  
  context.fillStyle = gradient;
  context.fillRect(0, 0, 2, 512);
  
  const texture = new THREE.CanvasTexture(canvas);
  
  // Create a large background plane
  const planeGeometry = new THREE.PlaneGeometry(2, 2);
  const planeMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    depthTest: false,
    depthWrite: false,
    side: THREE.BackSide
  });
  
  // Create background mesh and position it behind everything
  const mesh = new THREE.Mesh(planeGeometry, planeMaterial);
  mesh.position.z = -500;
  mesh.scale.set(1000, 1000, 1);
  
  // Add to scene
  scene.add(mesh);
  
  return mesh;
};

// Export the utility functions
const vizHelper = {
  createMaterial,
  createPooledGeometry,
  createBasicScene,
  createParticleSystem,
  createGradientBackground
};

export default vizHelper; 