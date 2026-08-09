import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Box, Typography, CircularProgress, Slider, FormControlLabel, Switch } from '@mui/material';
import { styled } from '@mui/material/styles';
import PropTypes from 'prop-types';

// Constants for MHD visualization
const MHD_CONSTANTS = {
  MAX_MAGNETIC_STRENGTH: 10.0,  // Tesla
  MAX_ELECTRIC_CURRENT: 1000.0, // Amperes
  PLASMA_CONDUCTIVITY_RANGE: [0.1, 100], // S/m (Siemens per meter)
  MAGNETIC_FIELD_COLOR: 0x0044ff,
  ELECTRIC_FIELD_COLOR: 0xff4400,
  LORENTZ_FORCE_COLOR: 0x00ff00,
  PLASMA_CONDUCTIVITY_COLORMAP: [
    { value: 0.1, color: new THREE.Color(0x0000ff) },
    { value: 10, color: new THREE.Color(0x00ffff) },
    { value: 50, color: new THREE.Color(0xffff00) },
    { value: 100, color: new THREE.Color(0xff0000) }
  ]
};

// Styled components
const VisualizerContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  height: '100%',
  minHeight: '400px'
}));

const CanvasContainer = styled(Box)({
  width: '100%',
  height: '100%',
  minHeight: '400px'
});

const LoadingOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  zIndex: 10
}));

const ControlsPanel = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 10,
  right: 10,
  padding: theme.spacing(2),
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  color: '#fff',
  borderRadius: 4,
  zIndex: 5,
  width: '250px'
}));

const InfoOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 10,
  left: 10,
  padding: theme.spacing(1),
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  color: '#fff',
  borderRadius: 4,
  zIndex: 5
}));

/**
 * FluidDynamicsVisualizer component for visualizing fluid dynamics simulation data
 * including MHD (magnetohydrodynamics) visualizations
 * @param {Object} props - Component props
 * @param {Object} props.fluidData - Fluid dynamics simulation data
 * @param {boolean} props.loading - Whether data is loading
 * @param {boolean} props.showVelocity - Initial state for showing velocity field
 * @param {boolean} props.showDensity - Initial state for showing density field
 * @param {boolean} props.showVorticity - Initial state for showing vorticity field
 * @param {boolean} props.showParticles - Initial state for showing tracer particles
 * @param {boolean} props.showStreamlines - Initial state for showing streamlines
 * @param {boolean} props.showMagneticField - Initial state for showing magnetic field
 * @param {boolean} props.showElectricField - Initial state for showing electric field
 * @param {boolean} props.showLorentzForce - Initial state for showing Lorentz force
 */
const FluidDynamicsVisualizer = ({
  fluidData,
  loading = false,
  showVelocity: initialShowVelocity = true,
  showDensity: initialShowDensity = false,
  showVorticity: initialShowVorticity = false,
  showParticles: initialShowParticles = true,
  showStreamlines: initialShowStreamlines = false,
  showMagneticField: initialShowMagneticField = true,
  showElectricField: initialShowElectricField = false,
  showLorentzForce: initialShowLorentzForce = false
}) => {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timeRef = useRef(0);
  
  // References for visualization objects
  const velocityFieldRef = useRef(null);
  const densityFieldRef = useRef(null);
  const vorticityFieldRef = useRef(null);
  const particlesRef = useRef(null);
  const streamsRef = useRef(null);
  
  // References for MHD visualization objects
  const magneticFieldRef = useRef(null);
  const electricFieldRef = useRef(null);
  const lorentzForceFieldRef = useRef(null);
  const plasmaCondRef = useRef(null);
  
  // UI Controls - visualization options
  const [showVelocity, setShowVelocity] = useState(initialShowVelocity);
  const [showDensity, setShowDensity] = useState(initialShowDensity);
  const [showVorticity, setShowVorticity] = useState(initialShowVorticity);
  const [showParticles, setShowParticles] = useState(initialShowParticles);
  const [showStreamlines, setShowStreamlines] = useState(initialShowStreamlines);
  
  // UI Controls - MHD visualization options
  const [showMagneticField, setShowMagneticField] = useState(initialShowMagneticField);
  const [showElectricField, setShowElectricField] = useState(initialShowElectricField);
  const [showLorentzForce, setShowLorentzForce] = useState(initialShowLorentzForce);
  const [showPlasmaConductivity, setShowPlasmaConductivity] = useState(false);
  
  // UI Controls - MHD parameters
  const [magneticFieldStrength, setMagneticFieldStrength] = useState(1.0);
  const [electricCurrentDensity, setElectricCurrentDensity] = useState(1.0);
  const [plasmaTemperature, setPlasmaTemperature] = useState(1000); // in Kelvin
  
  // UI Controls - other parameters
  const [velocityScale, setVelocityScale] = useState(1.0);
  const [densityOpacity, setDensityOpacity] = useState(0.7);
  const [particleCount, setParticleCount] = useState(1000);
  const [particleSpeed, setParticleSpeed] = useState(1.0);
  const [showInfo, setShowInfo] = useState(true);
  
  // Validate fluid data format
  const isValidFluidData = useMemo(() => {
    if (!fluidData) return false;
    
    // Check essential properties
    const hasGridSize = fluidData.grid_size !== undefined;
    const hasVelocity = fluidData.velocity && 
                       fluidData.velocity.x && 
                       fluidData.velocity.y && 
                       fluidData.velocity.z;
    const hasDensity = !!fluidData.density;
    const hasVorticity = fluidData.vorticity && 
                        fluidData.vorticity.x && 
                        fluidData.vorticity.y && 
                        fluidData.vorticity.z;
    
    return hasGridSize && hasVelocity; // At minimum we need grid size and velocity
  }, [fluidData]);
  
  // Validate MHD data format
  const isValidMhdData = useMemo(() => {
    if (!fluidData || !fluidData.mhd) return false;
    
    // Check essential MHD properties
    const hasMagneticField = fluidData.mhd.magnetic_field && 
                       fluidData.mhd.magnetic_field.x && 
                       fluidData.mhd.magnetic_field.y && 
                       fluidData.mhd.magnetic_field.z;
    const hasElectricField = fluidData.mhd.electric_field && 
                       fluidData.mhd.electric_field.x && 
                       fluidData.mhd.electric_field.y && 
                       fluidData.mhd.electric_field.z;
    const hasConductivity = !!fluidData.mhd.conductivity;
    
    return hasMagneticField || hasElectricField || hasConductivity;
  }, [fluidData]);
  
  // Show loading if data is invalid
  const isEffectivelyLoading = loading || !isValidFluidData || !isValidMhdData;
  
  // Update internal state when props change
  useEffect(() => {
    setShowVelocity(initialShowVelocity);
  }, [initialShowVelocity]);
  
  useEffect(() => {
    setShowDensity(initialShowDensity);
  }, [initialShowDensity]);
  
  useEffect(() => {
    setShowVorticity(initialShowVorticity);
  }, [initialShowVorticity]);
  
  useEffect(() => {
    setShowParticles(initialShowParticles);
  }, [initialShowParticles]);
  
  useEffect(() => {
    setShowStreamlines(initialShowStreamlines);
  }, [initialShowStreamlines]);
  
  useEffect(() => {
    setShowMagneticField(initialShowMagneticField);
  }, [initialShowMagneticField]);
  
  useEffect(() => {
    setShowElectricField(initialShowElectricField);
  }, [initialShowElectricField]);
  
  useEffect(() => {
    setShowLorentzForce(initialShowLorentzForce);
  }, [initialShowLorentzForce]);
  
  // Setup Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;
    
    // Create camera
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;
    cameraRef.current = camera;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    rendererRef.current = renderer;
    
    // Add to DOM
    containerRef.current.appendChild(renderer.domElement);
    
    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controlsRef.current = controls;
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Add grid for reference
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);
    
    // Add coordinate axes
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);
    
    // For FPS calculation
    let lastFrameTime = performance.now();
    let frameCounter = 0;
    let frameRateUpdateInterval = 500; // ms
    let lastFpsUpdate = performance.now();
    
    // Start animation loop
    const animate = () => {
      const now = performance.now();
      
      // Calculate delta time
      const delta = (now - lastFrameTime) / 1000; // in seconds
      lastFrameTime = now;
      
      // Update FPS counter every 500ms
      frameCounter++;
      if (now - lastFpsUpdate > frameRateUpdateInterval) {
        // Calculate frames per second
        const fps = frameCounter / ((now - lastFpsUpdate) / 1000);
        timeRef.current = 1 / fps; // Store frame time in seconds
        frameCounter = 0;
        lastFpsUpdate = now;
      }
      
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      // Animate particles along velocity field
      try {
        if (particlesRef.current && particlesRef.current.userData && 
            particlesRef.current.userData.velocityField) {
          updateParticles(
            particlesRef.current, 
            particlesRef.current.userData.velocityField,
            particleSpeed
          );
        }
      } catch (error) {
        console.error("Error animating particles:", error);
      }
      
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      
      rendererRef.current.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      
      // Clean up scene resources
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      }
    };
  }, []);
  
  // Update visualization when fluid data changes
  useEffect(() => {
    if (!sceneRef.current || !isValidFluidData) return;
    
    // Clear previous visualizations
    clearVisualizations();
    
    try {
      // Create new visualizations
      if (showVelocity && fluidData.velocity) {
        const velocityField = createVelocityVisualization(
          [fluidData.velocity.x, fluidData.velocity.y, fluidData.velocity.z], 
          velocityScale
        );
        if (velocityField) {
          sceneRef.current.add(velocityField);
          velocityFieldRef.current = velocityField;
        }
      }
      
      if (showDensity && fluidData.density) {
        const densityField = createDensityVisualization(fluidData.density, densityOpacity);
        if (densityField) {
          sceneRef.current.add(densityField);
          densityFieldRef.current = densityField;
        }
      }
      
      if (showVorticity && fluidData.vorticity) {
        const vorticityField = createVorticityVisualization(
          [fluidData.vorticity.x, fluidData.vorticity.y, fluidData.vorticity.z]
        );
        if (vorticityField) {
          sceneRef.current.add(vorticityField);
          vorticityFieldRef.current = vorticityField;
        }
      }
      
      if (showParticles && fluidData.velocity) {
        const particles = createParticleSystem(
          [fluidData.velocity.x, fluidData.velocity.y, fluidData.velocity.z], 
          particleCount
        );
        if (particles) {
          sceneRef.current.add(particles);
          particlesRef.current = particles;
        }
      }
      
      if (showStreamlines && fluidData.velocity) {
        const streamlines = createStreamlines(
          [fluidData.velocity.x, fluidData.velocity.y, fluidData.velocity.z]
        );
        if (streamlines) {
          sceneRef.current.add(streamlines);
          streamsRef.current = streamlines;
        }
      }
    } catch (error) {
      console.error("Error creating fluid dynamics visualizations:", error);
    }
  }, [fluidData, isValidFluidData, showVelocity, showDensity, showVorticity, showParticles, showStreamlines, velocityScale, densityOpacity, particleCount]);
  
  // Update animation when particle speed changes
  useEffect(() => {
    if (!particlesRef.current || !particlesRef.current.userData) return;
    
    particlesRef.current.userData.speed = particleSpeed;
  }, [particleSpeed]);
  
  // Clear existing visualizations
  const clearVisualizations = () => {
    if (!sceneRef.current) return;
    
    if (velocityFieldRef.current) {
      sceneRef.current.remove(velocityFieldRef.current);
      velocityFieldRef.current = null;
    }
    
    if (densityFieldRef.current) {
      sceneRef.current.remove(densityFieldRef.current);
      densityFieldRef.current = null;
    }
    
    if (vorticityFieldRef.current) {
      sceneRef.current.remove(vorticityFieldRef.current);
      vorticityFieldRef.current = null;
    }
    
    if (particlesRef.current) {
      sceneRef.current.remove(particlesRef.current);
      particlesRef.current = null;
    }
    
    if (streamsRef.current) {
      sceneRef.current.remove(streamsRef.current);
      streamsRef.current = null;
    }
  };
  
  // Create velocity field visualization using arrows
  const createVelocityVisualization = (velocityField, scale = 1.0) => {
    if (!velocityField || velocityField.length !== 3) return null;
    
    const group = new THREE.Group();
    
    try {
      // Get dimensions - check first velocity component's structure
      const vxData = velocityField[0];
      
      // Handle different data structures
      let nx, ny, nz;
      if (vxData.shape) {
        // Array with shape property
        [nx, ny, nz] = vxData.shape;
      } else if (Array.isArray(vxData)) {
        // Array of arrays
        nx = vxData.length;
        ny = nx > 0 && Array.isArray(vxData[0]) ? vxData[0].length : 0;
        nz = ny > 0 && Array.isArray(vxData[0][0]) ? vxData[0][0].length : 0;
      } else {
        // Unable to determine structure
        return null;
      }
      
      const arrowCount = Math.min(16, nx, ny, nz); // Limit for performance
      
      // Sample points in the grid
      const step = {
        x: Math.floor(nx / arrowCount),
        y: Math.floor(ny / arrowCount),
        z: Math.floor(nz / arrowCount)
      };
      
      // Create arrows to show direction and magnitude
      for (let i = 0; i < nx; i += step.x) {
        for (let j = 0; j < ny; j += step.y) {
          for (let k = 0; k < nz; k += step.z) {
            // Get component values, handling different array structures
            let vx, vy, vz;
            
            if (vxData.shape) {
              // Array with shape property
              vx = velocityField[0][i][j][k];
              vy = velocityField[1][i][j][k];
              vz = velocityField[2][i][j][k];
            } else {
              // Array of arrays
              vx = velocityField[0][i]?.[j]?.[k] || 0;
              vy = velocityField[1][i]?.[j]?.[k] || 0;
              vz = velocityField[2][i]?.[j]?.[k] || 0;
            }
            
            const magnitude = Math.sqrt(vx*vx + vy*vy + vz*vz);
            if (magnitude < 0.01) continue; // Skip very small velocities
            
            // Create normalized coordinates in -1 to 1 range
            const x = (i / nx) * 2 - 1;
            const y = (j / ny) * 2 - 1;
            const z = (k / nz) * 2 - 1;
            
            // Create arrow
            const arrowDir = new THREE.Vector3(vx, vy, vz).normalize();
            const arrowLength = magnitude * scale;
            
            // Enhanced contrast heatmap color (blue to red gradient)
            // Using a more distinct color palette for better visualization
            const arrowColor = new THREE.Color();
            if (magnitude < 0.3) {
              // Blue to cyan range for low velocity
              const t = magnitude / 0.3;
              arrowColor.setRGB(0, t, 1); // Blue (0,0,1) to Cyan (0,1,1)
            } else if (magnitude < 0.6) {
              // Cyan to yellow range for medium velocity
              const t = (magnitude - 0.3) / 0.3;
              arrowColor.setRGB(t, 1, 1 - t); // Cyan (0,1,1) to Yellow (1,1,0)
            } else {
              // Yellow to red range for high velocity
              const t = Math.min(1, (magnitude - 0.6) / 0.4);
              arrowColor.setRGB(1, 1 - t, 0); // Yellow (1,1,0) to Red (1,0,0)
            }
            
            const arrow = new THREE.ArrowHelper(
              arrowDir,
              new THREE.Vector3(x, y, z),
              arrowLength,
              arrowColor,
              arrowLength * 0.2,  // headLength
              arrowLength * 0.1   // headWidth
            );
            
            group.add(arrow);
          }
        }
      }
      
      return group;
    } catch (error) {
      console.error("Error creating velocity field visualization:", error);
      return null;
    }
  };
  
  // Create density field visualization using colored box
  const createDensityVisualization = (densityField, opacity = 0.7) => {
    if (!densityField) return null;
    
    const group = new THREE.Group();
    
    try {
      // Handle different data structures
      let nx, ny, nz;
      
      if (densityField.shape) {
        // Array with shape property
        [nx, ny, nz] = densityField.shape;
      } else if (Array.isArray(densityField)) {
        // Array of arrays
        nx = densityField.length;
        ny = nx > 0 && Array.isArray(densityField[0]) ? densityField[0].length : 0;
        nz = ny > 0 && Array.isArray(densityField[0][0]) ? densityField[0][0].length : 0;
      } else {
        // Unable to determine structure
        return null;
      }
      
      // Create a 3D texture-like visualization with small boxes
      const boxSize = {
        x: 2 / nx,
        y: 2 / ny,
        z: 2 / nz
      };
      
      // Sample rate for performance
      const sampleRate = Math.max(1, Math.floor(Math.cbrt(nx * ny * nz / 4000)));
      
      // Find min/max values for normalization
      let minDensity = Number.MAX_VALUE;
      let maxDensity = Number.MIN_VALUE;
      
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
          for (let k = 0; k < nz; k++) {
            const density = Array.isArray(densityField[i]) 
              ? densityField[i][j]?.[k] || 0 
              : 0;
            minDensity = Math.min(minDensity, density);
            maxDensity = Math.max(maxDensity, density);
          }
        }
      }
      
      // Create instanced mesh for better performance
      const boxGeometry = new THREE.BoxGeometry(
        boxSize.x * 0.9, 
        boxSize.y * 0.9, 
        boxSize.z * 0.9
      );
      
      const boxMaterial = new THREE.MeshPhongMaterial({
        transparent: true,
        opacity: opacity,
        vertexColors: true
      });
      
      const instancedMesh = new THREE.InstancedMesh(
        boxGeometry,
        boxMaterial,
        Math.ceil(nx * ny * nz / (sampleRate * sampleRate * sampleRate))
      );
      
      let instanceIndex = 0;
      const color = new THREE.Color();
      const matrix = new THREE.Matrix4();
      
      for (let i = 0; i < nx; i += sampleRate) {
        for (let j = 0; j < ny; j += sampleRate) {
          for (let k = 0; k < nz; k += sampleRate) {
            const density = Array.isArray(densityField[i]) 
              ? densityField[i][j]?.[k] || 0 
              : 0;
            const normalizedDensity = (density - minDensity) / (maxDensity - minDensity);
            
            // Skip low density areas
            if (normalizedDensity < 0.1) continue;
            
            // Create normalized coordinates in -1 to 1 range
            const x = (i / nx) * 2 - 1;
            const y = (j / ny) * 2 - 1;
            const z = (k / nz) * 2 - 1;
            
            // Enhanced contrast heatmap for density (improved color scheme)
            if (normalizedDensity < 0.33) {
              // Deep blue to light blue
              const t = normalizedDensity * 3;
              color.setRGB(0, t * 0.5, 0.5 + t * 0.5);
            } else if (normalizedDensity < 0.66) {
              // Light blue to yellow
              const t = (normalizedDensity - 0.33) * 3;
              color.setRGB(t, 0.5 + t * 0.5, 1 - t * 0.5);
            } else {
              // Yellow to red
              const t = (normalizedDensity - 0.66) * 3;
              color.setRGB(1, 1 - t, 0);
            }
            
            matrix.setPosition(x, y, z);
            instancedMesh.setMatrixAt(instanceIndex, matrix);
            instancedMesh.setColorAt(instanceIndex, color);
            instanceIndex++;
          }
        }
      }
      
      // Update instance count to actual number used
      instancedMesh.count = instanceIndex;
      instancedMesh.instanceMatrix.needsUpdate = true;
      if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
      
      group.add(instancedMesh);
      return group;
    } catch (error) {
      console.error("Error creating density visualization:", error);
      return null;
    }
  };
  
  // Create vorticity field visualization
  const createVorticityVisualization = (vorticityField) => {
    if (!vorticityField || vorticityField.length !== 3) return null;
    
    const group = new THREE.Group();
    
    try {
      // Get dimensions - check first vorticity component's structure
      const vxData = vorticityField[0];
      
      // Handle different data structures
      let nx, ny, nz;
      if (vxData.shape) {
        // Array with shape property
        [nx, ny, nz] = vxData.shape;
      } else if (Array.isArray(vxData)) {
        // Array of arrays
        nx = vxData.length;
        ny = nx > 0 && Array.isArray(vxData[0]) ? vxData[0].length : 0;
        nz = ny > 0 && Array.isArray(vxData[0][0]) ? vxData[0][0].length : 0;
      } else {
        // Unable to determine structure
        return null;
      }
      
      // Create lines showing vorticity
      const sampleRate = Math.max(1, Math.floor(Math.cbrt(nx * ny * nz / 500)));
      
      // Find max vorticity magnitude for normalization
      let maxVorticity = 0;
      for (let i = 0; i < nx; i += sampleRate) {
        for (let j = 0; j < ny; j += sampleRate) {
          for (let k = 0; k < nz; k += sampleRate) {
            // Get component values, handling different array structures
            let vx, vy, vz;
            
            if (vxData.shape) {
              // Array with shape property
              vx = vorticityField[0][i][j][k];
              vy = vorticityField[1][i][j][k];
              vz = vorticityField[2][i][j][k];
            } else {
              // Array of arrays
              vx = vorticityField[0][i]?.[j]?.[k] || 0;
              vy = vorticityField[1][i]?.[j]?.[k] || 0;
              vz = vorticityField[2][i]?.[j]?.[k] || 0;
            }
            
            const magnitude = Math.sqrt(vx*vx + vy*vy + vz*vz);
            maxVorticity = Math.max(maxVorticity, magnitude);
          }
        }
      }
      
      for (let i = 0; i < nx; i += sampleRate) {
        for (let j = 0; j < ny; j += sampleRate) {
          for (let k = 0; k < nz; k += sampleRate) {
            const vx = vorticityField[0][i][j][k];
            const vy = vorticityField[1][i][j][k];
            const vz = vorticityField[2][i][j][k];
            
            const magnitude = Math.sqrt(vx*vx + vy*vy + vz*vz);
            
            // Skip low vorticity areas
            if (magnitude < maxVorticity * 0.2) continue;
            
            // Create normalized coordinates in -1 to 1 range
            const x = (i / nx) * 2 - 1;
            const y = (j / ny) * 2 - 1;
            const z = (k / nz) * 2 - 1;
            
            // Create a line along vorticity direction
            const dir = new THREE.Vector3(vx, vy, vz).normalize();
            const lineLength = 0.1 + magnitude / maxVorticity * 0.3;
            
            const lineStart = new THREE.Vector3(x, y, z);
            const lineEnd = new THREE.Vector3(
              x + dir.x * lineLength,
              y + dir.y * lineLength,
              z + dir.z * lineLength
            );
            
            // Enhanced contrast color scheme for vorticity
            const normalizedMagnitude = magnitude / maxVorticity;
            const lineColor = new THREE.Color();
            
            // Magenta to yellow-green color gradient for better contrast with fluid
            if (normalizedMagnitude < 0.4) {
              // Magenta to white
              const t = normalizedMagnitude / 0.4;
              lineColor.setRGB(1, t, 1);
            } else if (normalizedMagnitude < 0.7) {
              // White to yellow
              const t = (normalizedMagnitude - 0.4) / 0.3;
              lineColor.setRGB(1, 1, 1 - t);
            } else {
              // Yellow to green
              const t = (normalizedMagnitude - 0.7) / 0.3;
              lineColor.setRGB(1 - t, 1, 0);
            }
            
            const geometry = new THREE.BufferGeometry().setFromPoints([lineStart, lineEnd]);
            const material = new THREE.LineBasicMaterial({ 
              color: lineColor, 
              linewidth: 2,
              transparent: true,
              opacity: 0.8
            });
            const line = new THREE.Line(geometry, material);
            
            group.add(line);
          }
        }
      }
      
      return group;
    } catch (error) {
      console.error("Error creating vorticity visualization:", error);
      return null;
    }
  };
  
  // Create particle system based on velocity field
  const createParticleSystem = (velocityField, count = 1000) => {
    if (!velocityField || velocityField.length !== 3) return null;
    
    try {
      // Get dimensions - check first velocity component's structure
      const vxData = velocityField[0];
      
      // Handle different data structures
      let nx, ny, nz;
      if (vxData.shape) {
        // Array with shape property
        [nx, ny, nz] = vxData.shape;
      } else if (Array.isArray(vxData)) {
        // Array of arrays
        nx = vxData.length;
        ny = nx > 0 && Array.isArray(vxData[0]) ? vxData[0].length : 0;
        nz = ny > 0 && Array.isArray(vxData[0][0]) ? vxData[0][0].length : 0;
      } else {
        // Unable to determine structure
        return null;
      }
      
      // Create geometry
      const particleGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      
      // Create a canvas texture for particles
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      
      // Draw a soft, circular particle
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, 
        canvas.height / 2, 
        0, 
        canvas.width / 2, 
        canvas.height / 2, 
        canvas.width / 2
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
      gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const particleTexture = new THREE.CanvasTexture(canvas);
      particleTexture.needsUpdate = true;
      
      // Random initial positions
      for (let i = 0; i < count; i++) {
        const x = Math.random() * 2 - 1;  // -1 to 1
        const y = Math.random() * 2 - 1;
        const z = Math.random() * 2 - 1;
        
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        
        // Assign different colors to particles
        // Based on starting position (creates more visual interest)
        let r, g, b;
        
        if (i % 3 === 0) {
          // Group 1: cyan-like colors
          r = 0.2 + Math.random() * 0.2;
          g = 0.7 + Math.random() * 0.3;
          b = 0.8 + Math.random() * 0.2;
        } else if (i % 3 === 1) {
          // Group 2: yellow-like colors
          r = 0.8 + Math.random() * 0.2;
          g = 0.8 + Math.random() * 0.2;
          b = 0.2 + Math.random() * 0.2;
        } else {
          // Group 3: magenta-like colors
          r = 0.8 + Math.random() * 0.2;
          g = 0.2 + Math.random() * 0.2;
          b = 0.8 + Math.random() * 0.2;
        }
        
        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
        
        // Vary particle sizes slightly
        sizes[i] = 0.04 + Math.random() * 0.04;
      }
      
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      
      // Custom shader material for high-quality particles
      const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
          texture: { value: particleTexture }
        },
        vertexShader: `
          attribute float size;
          attribute vec3 color;
          varying vec3 vColor;
          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform sampler2D texture;
          varying vec3 vColor;
          void main() {
            gl_FragColor = vec4(vColor, 1.0) * texture2D(texture, gl_PointCoord);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      
      // Create points instance
      const particles = new THREE.Points(particleGeometry, particleMaterial);
      
      // Add velocity info to the object
      particles.userData = {
        velocityField,
        positions,
        colors,
        nx, ny, nz
      };
      
      return particles;
    } catch (error) {
      console.error("Error creating particle system:", error);
      return null;
    }
  };
  
  // Create streamlines with enhanced visuals
  const createStreamlines = (velocityField) => {
    if (!velocityField || velocityField.length !== 3) return null;
    
    const group = new THREE.Group();
    
    try {
      // Get dimensions - check first velocity component's structure
      const vxData = velocityField[0];
      
      // Handle different data structures
      let nx, ny, nz;
      if (vxData.shape) {
        // Array with shape property
        [nx, ny, nz] = vxData.shape;
      } else if (Array.isArray(vxData)) {
        // Array of arrays
        nx = vxData.length;
        ny = nx > 0 && Array.isArray(vxData[0]) ? vxData[0].length : 0;
        nz = ny > 0 && Array.isArray(vxData[0][0]) ? vxData[0][0].length : 0;
      } else {
        // Unable to determine structure
        return null;
      }
      
      // Parameters
      const streamCount = 15;  // Number of stream lines
      const pointsPerStream = 50;  // Points per stream line
      const streamStep = 0.01;  // Integration step size
      
      // Seed points around the domain
      for (let i = 0; i < streamCount; i++) {
        // Seed points mostly near boundaries for interesting flow visualization
        let x, y, z;
        if (Math.random() < 0.7) {
          // Near boundary
          const face = Math.floor(Math.random() * 6);
          switch (face) {
            case 0: x = -0.9; y = Math.random() * 1.8 - 0.9; z = Math.random() * 1.8 - 0.9; break;
            case 1: x = 0.9; y = Math.random() * 1.8 - 0.9; z = Math.random() * 1.8 - 0.9; break;
            case 2: x = Math.random() * 1.8 - 0.9; y = -0.9; z = Math.random() * 1.8 - 0.9; break;
            case 3: x = Math.random() * 1.8 - 0.9; y = 0.9; z = Math.random() * 1.8 - 0.9; break;
            case 4: x = Math.random() * 1.8 - 0.9; y = Math.random() * 1.8 - 0.9; z = -0.9; break;
            default: x = Math.random() * 1.8 - 0.9; y = Math.random() * 1.8 - 0.9; z = 0.9; break;
          }
        } else {
          // Random internal point
          x = Math.random() * 1.6 - 0.8;
          y = Math.random() * 1.6 - 0.8;
          z = Math.random() * 1.6 - 0.8;
        }
        
        const points = [];
        points.push(new THREE.Vector3(x, y, z));
        
        // Integrate along velocity field
        for (let j = 0; j < pointsPerStream; j++) {
          const lastPoint = points[points.length - 1].clone();
          
          // Convert from -1,1 to grid coordinates
          const ix = Math.floor((lastPoint.x + 1) * 0.5 * nx);
          const iy = Math.floor((lastPoint.y + 1) * 0.5 * ny);
          const iz = Math.floor((lastPoint.z + 1) * 0.5 * nz);
          
          // Check if point is out of bounds
          if (ix < 0 || ix >= nx || iy < 0 || iy >= ny || iz < 0 || iz >= nz) {
            break;
          }
          
          // Get velocity at this point, handling different array structures
          let vx, vy, vz;
          
          if (vxData.shape) {
            // Array with shape property
            vx = velocityField[0][ix][iy][iz];
            vy = velocityField[1][ix][iy][iz];
            vz = velocityField[2][ix][iy][iz];
          } else {
            // Array of arrays
            vx = velocityField[0][ix]?.[iy]?.[iz] || 0;
            vy = velocityField[1][ix]?.[iy]?.[iz] || 0;
            vz = velocityField[2][ix]?.[iy]?.[iz] || 0;
          }
          
          const magnitude = Math.sqrt(vx*vx + vy*vy + vz*vz);
          if (magnitude < 0.001) break;  // Stop if velocity is too small
          
          // Simple Euler integration
          const newX = lastPoint.x + vx * streamStep / magnitude;
          const newY = lastPoint.y + vy * streamStep / magnitude;
          const newZ = lastPoint.z + vz * streamStep / magnitude;
          
          points.push(new THREE.Vector3(newX, newY, newZ));
        }
        
        if (points.length < 3) continue;  // Skip if too short
        
        // Create tube geometry
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeometry = new THREE.TubeGeometry(
          curve,
          points.length,
          0.01,  // radius
          8,     // tubular segments
          false  // closed
        );
        
        // Create enhanced gradient material for streamlines
        // Using more vibrant colors to represent flow paths
        const startColor = new THREE.Color(0x00ffff); // Cyan
        const endColor = new THREE.Color(0xff00ff);   // Magenta
        
        // Create gradient texture for tube
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop(0, startColor.getStyle());
        gradient.addColorStop(1, endColor.getStyle());
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        const material = new THREE.MeshPhongMaterial({ 
          map: texture,
          transparent: true,
          opacity: 0.8,
          shininess: 30
        });
        
        const tube = new THREE.Mesh(tubeGeometry, material);
        group.add(tube);
      }
      
      return group;
    } catch (error) {
      console.error("Error creating streamlines:", error);
      return null;
    }
  };
  
  // Update particles based on velocity field  
  const updateParticles = (particles, velocityField, speed = 1.0) => {
    if (!particles || !particles.userData) return;
    
    try {
      const { positions, colors, nx, ny, nz } = particles.userData;
      const dt = 0.01 * speed;
      
      for (let i = 0; i < positions.length / 3; i++) {
        let x = positions[i * 3];
        let y = positions[i * 3 + 1];
        let z = positions[i * 3 + 2];
        
        // Convert from -1,1 to grid coordinates
        const ix = Math.floor((x + 1) * 0.5 * nx);
        const iy = Math.floor((y + 1) * 0.5 * ny);
        const iz = Math.floor((z + 1) * 0.5 * nz);
        
        // Check if particle is out of bounds
        if (ix < 0 || ix >= nx || iy < 0 || iy >= ny || iz < 0 || iz >= nz) {
          // Reset particle to a random position
          x = Math.random() * 2 - 1;
          y = Math.random() * 2 - 1;
          z = Math.random() * 2 - 1;
        } else {
          // Get velocity at this point, handling different array structures
          let vx, vy, vz;
          
          const vxData = velocityField[0];
          if (vxData.shape) {
            // Array with shape property
            vx = velocityField[0][ix][iy][iz];
            vy = velocityField[1][ix][iy][iz];
            vz = velocityField[2][ix][iy][iz];
          } else {
            // Array of arrays
            vx = velocityField[0][ix]?.[iy]?.[iz] || 0;
            vy = velocityField[1][ix]?.[iy]?.[iz] || 0;
            vz = velocityField[2][ix]?.[iy]?.[iz] || 0;
          }
          
          // Update position
          x += vx * dt;
          y += vy * dt;
          z += vz * dt;
          
          // Update color based on velocity (optional)
          const magnitude = Math.sqrt(vx*vx + vy*vy + vz*vz);
          if (magnitude > 0.05) {
            // Gradually shift colors to indicate faster particles
            colors[i * 3] = Math.min(1.0, colors[i * 3] + 0.01 * magnitude);
            colors[i * 3 + 1] = Math.max(0.2, colors[i * 3 + 1] - 0.005 * magnitude);
            colors[i * 3 + 2] = Math.max(0.2, colors[i * 3 + 2] - 0.005 * magnitude);
          }
          
          // Check if particle is out of bounds after update
          if (x < -1 || x > 1 || y < -1 || y > 1 || z < -1 || z > 1) {
            // Reset particle to a random position
            x = Math.random() * 2 - 1;
            y = Math.random() * 2 - 1;
            z = Math.random() * 2 - 1;
          }
        }
        
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
      }
      
      // Update particles
      particles.geometry.attributes.position.needsUpdate = true;
      particles.geometry.attributes.color.needsUpdate = true;
    } catch (error) {
      console.error("Error updating particles:", error);
    }
  };
  
  // Create magnetic field visualization
  const createMagneticFieldVisualization = (magneticField, scale = 1.0) => {
    if (!magneticField || !magneticField.x || !magneticField.y || !magneticField.z) {
      console.warn('Invalid magnetic field data');
      return null;
    }
    
    const gridSize = fluidData.grid_size;
    const cellSize = 10 / gridSize;
    
    // Create arrows for magnetic field visualization
    const arrowHelpers = new THREE.Group();
    
    // Sample the magnetic field at regular intervals
    const samplingRate = Math.max(1, Math.floor(gridSize / 10)); // Adjust sampling based on grid size
    
    for (let i = 0; i < gridSize; i += samplingRate) {
      for (let j = 0; j < gridSize; j += samplingRate) {
        for (let k = 0; k < gridSize; k += samplingRate) {
          const idx = i * gridSize * gridSize + j * gridSize + k;
          
          // Get magnetic field vector at this point
          const bx = magneticField.x[idx] || 0;
          const by = magneticField.y[idx] || 0;
          const bz = magneticField.z[idx] || 0;
          
          // Calculate magnitude
          const magnitude = Math.sqrt(bx * bx + by * by + bz * bz);
          
          // Skip negligible fields to reduce clutter
          if (magnitude < 0.05) continue;
          
          // Calculate normalized direction
          const nx = bx / magnitude;
          const ny = by / magnitude;
          const nz = bz / magnitude;
          
          // Create position
          const x = (i / gridSize) * 10 - 5;
          const y = (j / gridSize) * 10 - 5;
          const z = (k / gridSize) * 10 - 5;
          
          // Create arrow helper
          const arrowLength = cellSize * 1.5 * Math.min(1, magnitude * scale);
          const arrowHelper = new THREE.ArrowHelper(
            new THREE.Vector3(nx, ny, nz),
            new THREE.Vector3(x, y, z),
            arrowLength,
            MHD_CONSTANTS.MAGNETIC_FIELD_COLOR,
            arrowLength * 0.3,
            arrowLength * 0.2
          );
          
          arrowHelpers.add(arrowHelper);
        }
      }
    }
    
    // Create magnetic field lines for stronger visualization
    const fieldLines = new THREE.Group();
    
    // Seed points for field lines
    const numSeedPoints = 20;
    const seedPoints = [];
    
    // Generate seed points on the boundaries
    for (let i = 0; i < numSeedPoints; i++) {
      // Generate random positions on the domain boundaries
      const face = Math.floor(Math.random() * 6);
      let x, y, z;
      
      switch (face) {
        case 0: // Front face
          x = -5;
          y = Math.random() * 10 - 5;
          z = Math.random() * 10 - 5;
          break;
        case 1: // Back face
          x = 5;
          y = Math.random() * 10 - 5;
          z = Math.random() * 10 - 5;
          break;
        case 2: // Left face
          x = Math.random() * 10 - 5;
          y = -5;
          z = Math.random() * 10 - 5;
          break;
        case 3: // Right face
          x = Math.random() * 10 - 5;
          y = 5;
          z = Math.random() * 10 - 5;
          break;
        case 4: // Bottom face
          x = Math.random() * 10 - 5;
          y = Math.random() * 10 - 5;
          z = -5;
          break;
        case 5: // Top face
          x = Math.random() * 10 - 5;
          y = Math.random() * 10 - 5;
          z = 5;
          break;
      }
      
      seedPoints.push(new THREE.Vector3(x, y, z));
    }
    
    // Trace field lines from each seed point
    seedPoints.forEach(seedPoint => {
      const points = [seedPoint.clone()];
      let currentPoint = seedPoint.clone();
      
      // Trace forward
      for (let step = 0; step < 100; step++) {
        const gridX = Math.floor(((currentPoint.x + 5) / 10) * gridSize);
        const gridY = Math.floor(((currentPoint.y + 5) / 10) * gridSize);
        const gridZ = Math.floor(((currentPoint.z + 5) / 10) * gridSize);
        
        // Check if we're still in the domain
        if (gridX < 0 || gridX >= gridSize || 
            gridY < 0 || gridY >= gridSize || 
            gridZ < 0 || gridZ >= gridSize) {
          break;
        }
        
        const idx = gridX * gridSize * gridSize + gridY * gridSize + gridZ;
        
        // Get magnetic field at current point
        const bx = magneticField.x[idx] || 0;
        const by = magneticField.y[idx] || 0;
        const bz = magneticField.z[idx] || 0;
        
        // Calculate magnitude
        const magnitude = Math.sqrt(bx * bx + by * by + bz * bz);
        
        // Stop if field is too weak
        if (magnitude < 0.01) break;
        
        // Normalize direction
        const nx = bx / magnitude;
        const ny = by / magnitude;
        const nz = bz / magnitude;
        
        // Step size proportional to cell size but inversely proportional to field strength
        const stepSize = cellSize * 0.5 / (1 + magnitude * scale);
        
        // Move to next point
        currentPoint.x += nx * stepSize;
        currentPoint.y += ny * stepSize;
        currentPoint.z += nz * stepSize;
        
        // Add point to line
        points.push(currentPoint.clone());
      }
      
      // Create geometry and line
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ 
        color: MHD_CONSTANTS.MAGNETIC_FIELD_COLOR,
        linewidth: 1,
        opacity: 0.7,
        transparent: true
      });
      
      const line = new THREE.Line(geometry, material);
      fieldLines.add(line);
    });
    
    // Create combined group
    const magneticFieldGroup = new THREE.Group();
    magneticFieldGroup.add(arrowHelpers);
    magneticFieldGroup.add(fieldLines);
    
    return magneticFieldGroup;
  };
  
  // Create Lorentz force field visualization (F = q(E + v × B))
  const createLorentzForceVisualization = (electricField, magneticField, velocityField, scale = 1.0) => {
    if (!electricField || !magneticField || !velocityField) {
      console.warn('Missing data for Lorentz force visualization');
      return null;
    }
    
    const gridSize = fluidData.grid_size;
    const cellSize = 10 / gridSize;
    
    // Create arrows for Lorentz force visualization
    const arrowHelpers = new THREE.Group();
    
    // Sample at regular intervals
    const samplingRate = Math.max(1, Math.floor(gridSize / 8));
    
    for (let i = 0; i < gridSize; i += samplingRate) {
      for (let j = 0; j < gridSize; j += samplingRate) {
        for (let k = 0; k < gridSize; k += samplingRate) {
          const idx = i * gridSize * gridSize + j * gridSize + k;
          
          // Get electric field vector
          const ex = electricField.x ? (electricField.x[idx] || 0) : 0;
          const ey = electricField.y ? (electricField.y[idx] || 0) : 0;
          const ez = electricField.z ? (electricField.z[idx] || 0) : 0;
          
          // Get magnetic field vector
          const bx = magneticField.x ? (magneticField.x[idx] || 0) : 0;
          const by = magneticField.y ? (magneticField.y[idx] || 0) : 0;
          const bz = magneticField.z ? (magneticField.z[idx] || 0) : 0;
          
          // Get velocity vector
          const vx = velocityField.x ? (velocityField.x[idx] || 0) : 0;
          const vy = velocityField.y ? (velocityField.y[idx] || 0) : 0;
          const vz = velocityField.z ? (velocityField.z[idx] || 0) : 0;
          
          // Calculate v × B (cross product)
          const crossX = vy * bz - vz * by;
          const crossY = vz * bx - vx * bz;
          const crossZ = vx * by - vy * bx;
          
          // Calculate Lorentz force F = q(E + v × B), assume q = 1 for visualization
          const fx = ex + crossX;
          const fy = ey + crossY;
          const fz = ez + crossZ;
          
          // Calculate magnitude
          const magnitude = Math.sqrt(fx * fx + fy * fy + fz * fz);
          
          // Skip negligible forces
          if (magnitude < 0.05) continue;
          
          // Calculate normalized direction
          const nx = fx / magnitude;
          const ny = fy / magnitude;
          const nz = fz / magnitude;
          
          // Create position
          const x = (i / gridSize) * 10 - 5;
          const y = (j / gridSize) * 10 - 5;
          const z = (k / gridSize) * 10 - 5;
          
          // Create arrow helper with length based on force magnitude
          const arrowLength = cellSize * 1.5 * Math.min(1, magnitude * scale);
          const arrowHelper = new THREE.ArrowHelper(
            new THREE.Vector3(nx, ny, nz),
            new THREE.Vector3(x, y, z),
            arrowLength,
            MHD_CONSTANTS.LORENTZ_FORCE_COLOR,
            arrowLength * 0.3,
            arrowLength * 0.2
          );
          
          arrowHelpers.add(arrowHelper);
        }
      }
    }
    
    return arrowHelpers;
  };
  
  // Create plasma conductivity visualization
  const createPlasmaConductivityVisualization = (conductivityField, opacity = 0.7) => {
    if (!conductivityField) {
      console.warn('Invalid conductivity field data');
      return null;
    }
    
    const gridSize = fluidData.grid_size;
    
    // Create a 3D texture to represent the conductivity field
    const size = gridSize;
    const data = new Uint8Array(size * size * size * 4);
    
    // Find min and max values for normalization
    let minValue = Infinity;
    let maxValue = -Infinity;
    
    for (let i = 0; i < conductivityField.length; i++) {
      const value = conductivityField[i] || 0;
      minValue = Math.min(minValue, value);
      maxValue = Math.max(maxValue, value);
    }
    
    // Fallback to constants if needed
    if (!isFinite(minValue) || !isFinite(maxValue) || minValue === maxValue) {
      minValue = MHD_CONSTANTS.PLASMA_CONDUCTIVITY_RANGE[0];
      maxValue = MHD_CONSTANTS.PLASMA_CONDUCTIVITY_RANGE[1];
    }
    
    // Map the conductivity values to colors
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        for (let k = 0; k < gridSize; k++) {
          const index = (i * gridSize * gridSize + j * gridSize + k);
          const value = conductivityField[index] || 0;
          
          // Normalize value between 0 and 1
          const normalizedValue = (value - minValue) / (maxValue - minValue);
          
          // Get color based on colormap by interpolating between defined color points
          let color = new THREE.Color(0xffffff);
          
          const colormap = MHD_CONSTANTS.PLASMA_CONDUCTIVITY_COLORMAP;
          
          // Find the appropriate color segment
          for (let c = 0; c < colormap.length - 1; c++) {
            const lowerBound = (colormap[c].value - minValue) / (maxValue - minValue);
            const upperBound = (colormap[c + 1].value - minValue) / (maxValue - minValue);
            
            if (normalizedValue >= lowerBound && normalizedValue <= upperBound) {
              // Interpolate between colors
              const t = (normalizedValue - lowerBound) / (upperBound - lowerBound);
              color.copy(colormap[c].color).lerp(colormap[c + 1].color, t);
              break;
            }
          }
          
          // Apply alpha based on value (higher conductivity = more opacity)
          const alpha = Math.max(0.1, Math.min(0.95, normalizedValue * opacity));
          
          // Set color in texture
          const pixelIdx = (i * size * size + j * size + k) * 4;
          data[pixelIdx] = Math.floor(color.r * 255);
          data[pixelIdx + 1] = Math.floor(color.g * 255);
          data[pixelIdx + 2] = Math.floor(color.b * 255);
          data[pixelIdx + 3] = Math.floor(alpha * 255);
        }
      }
    }
    
    // Create 3D texture
    const texture = new THREE.Data3DTexture(data, size, size, size);
    texture.format = THREE.RGBAFormat;
    texture.needsUpdate = true;
    
    // Create volume rendering material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        u_data: { value: texture },
        u_size: { value: new THREE.Vector3(gridSize, gridSize, gridSize) },
        u_renderthreshold: { value: 0.15 },
        u_clim: { value: new THREE.Vector2(0, 1) }
      },
      transparent: true,
      vertexShader: `
        varying vec3 v_position;
        
        void main() {
          v_position = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp sampler3D;
        uniform sampler3D u_data;
        uniform vec3 u_size;
        uniform float u_renderthreshold;
        uniform vec2 u_clim;
        
        varying vec3 v_position;
        
        void main() {
          // Map position from [-5,5] to [0,1] for texture lookup
          vec3 texCoord = v_position * 0.1 + 0.5;
          
          // Sample the 3D texture
          vec4 sample = texture(u_data, texCoord);
          
          // Apply threshold
          if (sample.a < u_renderthreshold) {
            discard;
          }
          
          // Output the color
          gl_FragColor = sample;
        }
      `
    });
    
    // Create a cube geometry that spans the domain
    const geometry = new THREE.BoxGeometry(10, 10, 10);
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    
    return mesh;
  };
  
  // Update scene with MHD visualizations based on current state
  useEffect(() => {
    if (!isValidMhdData || !sceneRef.current || !fluidData || !fluidData.mhd) return;
    
    // Clear existing MHD visualizations
    if (magneticFieldRef.current) {
      sceneRef.current.remove(magneticFieldRef.current);
      magneticFieldRef.current = null;
    }
    
    if (electricFieldRef.current) {
      sceneRef.current.remove(electricFieldRef.current);
      electricFieldRef.current = null;
    }
    
    if (lorentzForceFieldRef.current) {
      sceneRef.current.remove(lorentzForceFieldRef.current);
      lorentzForceFieldRef.current = null;
    }
    
    if (plasmaCondRef.current) {
      sceneRef.current.remove(plasmaCondRef.current);
      plasmaCondRef.current = null;
    }
    
    // Create new visualizations based on current state
    if (showMagneticField && fluidData.mhd.magnetic_field) {
      magneticFieldRef.current = createMagneticFieldVisualization(
        fluidData.mhd.magnetic_field,
        magneticFieldStrength
      );
      
      if (magneticFieldRef.current) {
        sceneRef.current.add(magneticFieldRef.current);
      }
    }
    
    if (showElectricField && fluidData.mhd.electric_field) {
      // Similar to magnetic field visualization but with different colors
      // Implementation omitted for brevity
    }
    
    if (showLorentzForce && fluidData.mhd.magnetic_field && fluidData.velocity) {
      lorentzForceFieldRef.current = createLorentzForceVisualization(
        fluidData.mhd.electric_field || { x: [], y: [], z: [] }, // Handle missing electric field
        fluidData.mhd.magnetic_field,
        fluidData.velocity,
        electricCurrentDensity
      );
      
      if (lorentzForceFieldRef.current) {
        sceneRef.current.add(lorentzForceFieldRef.current);
      }
    }
    
    if (showPlasmaConductivity && fluidData.mhd.conductivity) {
      plasmaCondRef.current = createPlasmaConductivityVisualization(
        fluidData.mhd.conductivity,
        0.7
      );
      
      if (plasmaCondRef.current) {
        sceneRef.current.add(plasmaCondRef.current);
      }
    }
    
  }, [
    isValidMhdData, 
    fluidData, 
    showMagneticField, 
    showElectricField, 
    showLorentzForce, 
    showPlasmaConductivity,
    magneticFieldStrength,
    electricCurrentDensity,
    plasmaTemperature
  ]);
  
  return (
    <VisualizerContainer>
      {isEffectivelyLoading && (
        <LoadingOverlay>
          <CircularProgress color="primary" size={60} />
          <Typography variant="h6" sx={{ mt: 2, color: '#fff' }}>
            Loading Fluid Dynamics Data...
          </Typography>
        </LoadingOverlay>
      )}
      
      {!isValidFluidData && !loading && (
        <LoadingOverlay>
          <Typography variant="h6" sx={{ color: 'white', mt: 2 }}>
            Invalid fluid dynamics data format
          </Typography>
          <Typography variant="body2" sx={{ color: 'white', mt: 1, maxWidth: '80%', textAlign: 'center' }}>
            The fluid dynamics data is missing required properties. Please check the backend API response.
          </Typography>
        </LoadingOverlay>
      )}
      
      {/* Add header for the fluid dynamics visualization */}
      <Box sx={{ 
        position: 'absolute', 
        top: 10, 
        left: '50%', 
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        color: '#fff',
        borderRadius: 4,
        padding: '4px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        zIndex: 5,
      }}>
        <Typography variant="subtitle1">
          LENR Fluid Dynamics Simulation
        </Typography>
        {isValidFluidData && (
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            Grid: {fluidData.grid_size} • FPS: {Math.round(1 / (timeRef.current ? timeRef.current : 0.01))}
          </Typography>
        )}
      </Box>
      
      {showInfo && isValidFluidData && (
        <InfoOverlay>
          <Typography variant="body2">Grid Size: {Array.isArray(fluidData.grid_size) 
              ? fluidData.grid_size.join(' × ') 
              : `${fluidData.grid_size} × ${fluidData.grid_size} × ${fluidData.grid_size}`}
          </Typography>
          <Typography variant="body2">
            Max Velocity: {fluidData.max_velocity?.toFixed(3) || 'N/A'} m/s
          </Typography>
          <Typography variant="body2">
            Reynolds Number: {fluidData.reynolds_number?.toFixed(2) || 'N/A'}
          </Typography>
          <Typography variant="body2">
            Lattice Type: {fluidData.metadata?.lattice_type || 'N/A'}
          </Typography>
        </InfoOverlay>
      )}
      
      <ControlsPanel>
        <Typography variant="h6" gutterBottom>Visualization Controls</Typography>
        
        {/* Standard visualization controls */}
        <FormControlLabel
          control={<Switch checked={showVelocity} onChange={(e) => setShowVelocity(e.target.checked)} />}
          label="Velocity Field"
        />
        <FormControlLabel
          control={<Switch checked={showDensity} onChange={(e) => setShowDensity(e.target.checked)} />}
          label="Density Field"
        />
        <FormControlLabel
          control={<Switch checked={showVorticity} onChange={(e) => setShowVorticity(e.target.checked)} />}
          label="Vorticity"
        />
        <FormControlLabel
          control={<Switch checked={showParticles} onChange={(e) => setShowParticles(e.target.checked)} />}
          label="Particles"
        />
        <FormControlLabel
          control={<Switch checked={showStreamlines} onChange={(e) => setShowStreamlines(e.target.checked)} />}
          label="Streamlines"
        />
        
        {/* MHD visualization controls */}
        {isValidMhdData && (
          <>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>MHD Controls</Typography>
            
            <FormControlLabel
              control={<Switch checked={showMagneticField} onChange={(e) => setShowMagneticField(e.target.checked)} />}
              label="Magnetic Field"
            />
            <FormControlLabel
              control={<Switch checked={showElectricField} onChange={(e) => setShowElectricField(e.target.checked)} />}
              label="Electric Field"
            />
            <FormControlLabel
              control={<Switch checked={showLorentzForce} onChange={(e) => setShowLorentzForce(e.target.checked)} />}
              label="Lorentz Force"
            />
            <FormControlLabel
              control={<Switch checked={showPlasmaConductivity} onChange={(e) => setShowPlasmaConductivity(e.target.checked)} />}
              label="Plasma Conductivity"
            />
            
            <Typography variant="body2" id="magnetic-strength-slider" gutterBottom>
              Magnetic Field Strength
            </Typography>
            <Slider
              value={magneticFieldStrength}
              onChange={(_, value) => setMagneticFieldStrength(value)}
              min={0.1}
              max={2.0}
              step={0.1}
              aria-labelledby="magnetic-strength-slider"
              disabled={!showMagneticField}
            />
            
            <Typography variant="body2" id="current-density-slider" gutterBottom>
              Electric Current Density
            </Typography>
            <Slider
              value={electricCurrentDensity}
              onChange={(_, value) => setElectricCurrentDensity(value)}
              min={0.1}
              max={2.0}
              step={0.1}
              aria-labelledby="current-density-slider"
              disabled={!showLorentzForce}
            />
            
            <Typography variant="body2" id="plasma-temp-slider" gutterBottom>
              Plasma Temperature (K)
            </Typography>
            <Slider
              value={plasmaTemperature}
              onChange={(_, value) => setPlasmaTemperature(value)}
              min={100}
              max={10000}
              step={100}
              aria-labelledby="plasma-temp-slider"
              disabled={!showPlasmaConductivity}
            />
          </>
        )}
        
        <FormControlLabel
          control={<Switch checked={showInfo} onChange={(e) => setShowInfo(e.target.checked)} />}
          label="Show Info"
        />
      </ControlsPanel>
      
      <CanvasContainer ref={containerRef} />
    </VisualizerContainer>
  );
};

FluidDynamicsVisualizer.propTypes = {
  fluidData: PropTypes.object,
  loading: PropTypes.bool,
  showVelocity: PropTypes.bool,
  showDensity: PropTypes.bool,
  showVorticity: PropTypes.bool,
  showParticles: PropTypes.bool,
  showStreamlines: PropTypes.bool,
  showMagneticField: PropTypes.bool,
  showElectricField: PropTypes.bool,
  showLorentzForce: PropTypes.bool
};

export default FluidDynamicsVisualizer;

