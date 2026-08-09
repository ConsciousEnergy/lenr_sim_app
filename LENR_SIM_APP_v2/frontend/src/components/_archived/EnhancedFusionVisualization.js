import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { 
  Box, 
  Paper, 
  Typography, 
  CircularProgress, 
  Alert,
  Button,
  Tooltip,
  IconButton
} from '@mui/material';
import { styled } from '@mui/material/styles';
import threeCleanup from '../../utils/threeCleanup';
import { useLogger } from '../../contexts/LogContext';
import InfoIcon from '@mui/icons-material/Info';

// Styled components
const VisualizationContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  position: 'relative',
  height: '400px',
  overflow: 'hidden',
  marginBottom: theme.spacing(2),
}));

const ThreeContainer = styled('div')(({ theme }) => ({
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  borderRadius: theme.shape.borderRadius,
}));

const LoadingOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.7)',
  zIndex: 100,
}));

const LegendOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: theme.spacing(2),
  left: theme.spacing(2),
  zIndex: 100,
  backgroundColor: 'rgba(255, 255, 255, 0.7)',
  padding: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  maxWidth: '150px',
}));

const LegendItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(0.5),
}));

const LegendColor = styled(Box)(({ color }) => ({
  width: '16px',
  height: '16px',
  borderRadius: '50%',
  backgroundColor: color,
  marginRight: '8px',
}));

// Add this component to display performance stats
const PerformanceOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  right: theme.spacing(1),
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  color: 'white',
  padding: theme.spacing(0.5),
  borderRadius: theme.shape.borderRadius,
  fontSize: '0.7rem',
  zIndex: 100,
  pointerEvents: 'none',
  fontFamily: 'monospace',
}));

/**
 * Component for visualizing enhanced fusion model in 3D
 */
const EnhancedFusionVisualization = ({ enhancedFusionData }) => {
  const logger = useLogger();
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const frameIdRef = useRef(null);
  const objectsRef = useRef([]);
  
  // Object pool for reusing geometries and materials
  const objectPoolRef = useRef({
    geometries: {},
    materials: {}
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Performance monitoring state
  const [fps, setFps] = useState(0);
  const [objectCount, setObjectCount] = useState(0);
  const [renderTime, setRenderTime] = useState(0);
  const [showPerformanceStats, setShowPerformanceStats] = useState(false);
  const lastTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const renderTimesRef = useRef([]);
  
  // Track if we need to update visualization
  const dataRef = useRef(enhancedFusionData);
  
  // Memoize colors to prevent recreation on every render
  const colors = useMemo(() => ({
    palladium: 0xB9B9B9,      // silver-gray
    nickel: 0xA6A6A6,         // darker silver
    titanium: 0x8C8C8C,       // even darker silver
    deuterium: 0x2969B0,      // blue
    hydrogen: 0x33A1C9,       // lighter blue
    electron: 0x00BFFF,       // deep sky blue
    energy: 0xFF6347,         // tomato red
    proximity: 0x9370DB,      // medium purple
    screening: 0x3CB371,      // medium sea green
    fluctuation: 0xFFD700,    // gold
    resonance: 0xFF6347,      // tomato red
    quantum: 0x9932CC,        // dark orchid
    total: 0xFF4500           // orange red
  }), []);
  
  // Safe Math.log10 that handles errors
  const safeLog10 = // eslint-disable-next-line react-hooks/exhaustive-deps
useCallback((value) => {
    if (value <= 0 || typeof value !== 'number' || isNaN(value)) {
      return 0;
    }
    return Math.log10(value);
  }, []);
  
  // Toggle performance stats display
  const togglePerformanceStats = // eslint-disable-next-line react-hooks/exhaustive-deps
useCallback(() => {
    setShowPerformanceStats(prev => !prev);
  }, []);
  
  // Performance monitoring function
  const updatePerformanceStats = useCallback(() => {
    // Update FPS
    const now = performance.now();
    frameCountRef.current++;
    
    if (now - lastTimeRef.current >= 1000) {
      setFps(Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current)));
      frameCountRef.current = 0;
      lastTimeRef.current = now;
      
      // Update object count
      setObjectCount(objectsRef.current.length);
      
      // Update average render time
      if (renderTimesRef.current.length > 0) {
        const avgRenderTime = renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length;
        setRenderTime(avgRenderTime.toFixed(2));
        renderTimesRef.current = [];
      }
    }
  }, []);
  
  // Measure render time
  const measureRenderTime = // eslint-disable-next-line react-hooks/exhaustive-deps
useCallback(() => {
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      const startTime = performance.now();
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      const endTime = performance.now();
      renderTimesRef.current.push(endTime - startTime);
    }
  }, []);

  // Get or create a geometry from the pool
  const getGeometry = // eslint-disable-next-line react-hooks/exhaustive-deps
useCallback((type, params = {}) => {
    const pool = objectPoolRef.current.geometries;
    const key = `${type}_${JSON.stringify(params)}`;
    
    if (pool[key]) {
      return pool[key];
    }
    
    let geometry;
    switch(type) {
      case 'sphere':
        geometry = new THREE.SphereGeometry(
          params.radius || 1.0,
          params.widthSegments || 32,
          params.heightSegments || 32
        );
        break;
      case 'torus':
        geometry = new THREE.TorusGeometry(
          params.radius || 1.0,
          params.tube || 0.1,
          params.radialSegments || 16,
          params.tubularSegments || 100
        );
        break;
      case 'octahedron':
        geometry = new THREE.OctahedronGeometry(
          params.radius || 1.0,
          params.detail || 0
        );
        break;
      case 'icosahedron':
        geometry = new THREE.IcosahedronGeometry(
          params.radius || 1.0,
          params.detail || 0
        );
        break;
      case 'torusKnot':
        geometry = new THREE.TorusKnotGeometry(
          params.radius || 1.0,
          params.tube || 0.1,
          params.tubularSegments || 64,
          params.radialSegments || 8,
          params.p || 2,
          params.q || 3
        );
        break;
      default:
        geometry = new THREE.SphereGeometry(1.0, 32, 32);
    }
    
    pool[key] = geometry;
    return geometry;
  }, []);
  
  // Get or create a material from the pool
  const getMaterial = useCallback((type, params = {}) => {
    const pool = objectPoolRef.current.materials;
    const key = `${type}_${JSON.stringify(params)}`;
    
    if (pool[key]) {
      return pool[key];
    }
    
    let material;
    switch(type) {
      case 'phong':
        material = new THREE.MeshPhongMaterial({
          color: params.color || 0xffffff,
          shininess: params.shininess || 30,
          transparent: params.transparent || false,
          opacity: params.opacity || 1.0,
          wireframe: params.wireframe || false,
          emissive: params.emissive || 0x000000,
          emissiveIntensity: params.emissiveIntensity || 1.0
        });
        break;
      case 'basic':
        material = new THREE.MeshBasicMaterial({
          color: params.color || 0xffffff,
          transparent: params.transparent || false,
          opacity: params.opacity || 1.0,
          wireframe: params.wireframe || false
        });
        break;
      default:
        material = new THREE.MeshPhongMaterial({
          color: params.color || 0xffffff
        });
    }
    
    pool[key] = material;
    return material;
  }, []);
  
  // Clean up the object pool
  const cleanupObjectPool = // eslint-disable-next-line react-hooks/exhaustive-deps
useCallback(() => {
    const pool = objectPoolRef.current;
    
    // Dispose geometries
    Object.values(pool.geometries).forEach(geometry => {
      geometry.dispose();
    });
    pool.geometries = {};
    
    // Dispose materials
    Object.values(pool.materials).forEach(material => {
      material.dispose();
    });
    pool.materials = {};
  }, []);

  // Clean up Three.js resources
  const cleanup = useCallback(() => {
    if (frameIdRef.current) {
      cancelAnimationFrame(frameIdRef.current);
      frameIdRef.current = null;
    }

    // Clean up all objects
    if (objectsRef.current.length > 0) {
      objectsRef.current.forEach(obj => {
        if (sceneRef.current) {
          sceneRef.current.remove(obj);
        }
      });
      objectsRef.current = [];
    }

    // Clean up THREE.js resources
    if (rendererRef.current) {
      threeCleanup.unregisterThreeJsCanvas(rendererRef.current.domElement, 'EnhancedFusionVis');
      rendererRef.current.dispose();
      rendererRef.current = null;
    }

    if (controlsRef.current) {
      controlsRef.current.dispose();
      controlsRef.current = null;
    }

    if (sceneRef.current) {
      sceneRef.current = null;
    }
    
    // Clean up object pool
    cleanupObjectPool();
  }, [cleanupObjectPool]);
  
  // Create visualization based on enhanced fusion data
  const createVisualization = useCallback((data) => {
    if (!sceneRef.current) return;

    try {
      const scene = sceneRef.current;

      // Extract parameters for visualization
      const metal = data.metal || 'Pd';
      const siteType = data.site_type || 'tetrahedral';
      
      // Extract enhancement factors
      const {
        proximity = 1.0,
        screening = 1.0,
        fluctuation = 1.0,
        resonance = 1.0,
        quantum = 1.0,
        total = 1.0
      } = data.enhancement_factors || {};

      // Calculate logarithmic scales for visual representation
      const proximityScale = Math.min(2.0, 0.5 + 0.3 * safeLog10(proximity));
      const screeningScale = Math.min(3.0, 0.5 + 0.3 * safeLog10(screening));
      const fluctuationScale = Math.min(1.5, 0.5 + 0.2 * safeLog10(fluctuation));
      const resonanceScale = Math.min(2.0, 0.5 + 0.3 * safeLog10(resonance));
      const quantumScale = Math.min(2.5, 0.5 + 0.3 * safeLog10(quantum));
      
      // Total enhancement affects overall scene activity
      const totalEnhancement = Math.min(3.0, 0.5 + 0.3 * safeLog10(total));

      // Create metal lattice (host material)
      const metalGeometry = getGeometry('sphere', { radius: 1.0, widthSegments: 32, heightSegments: 32 });
      const metalMaterial = getMaterial('phong', {
        color: colors[metal] || colors.palladium,
        shininess: 80,
        ...(metal === 'titanium' && { emissive: 0x3A5FCD, emissiveIntensity: 0.05 })
      });

      // Create central metal atom
      const centralMetal = new THREE.Mesh(metalGeometry, metalMaterial);
      centralMetal.userData = { type: 'metal', metal: metal };
      scene.add(centralMetal);
      objectsRef.current.push(centralMetal);

      // Create deuterium atoms
      const deuteriumGeometry = getGeometry('sphere', { radius: 0.4, widthSegments: 24, heightSegments: 24 });
      const deuteriumMaterial = getMaterial('phong', {
        color: colors.deuterium,
        shininess: 60
      });

      // Position deuterium atoms according to site type
      let positions = [];
      
      switch(siteType) {
        case 'octahedral':
          // Octahedral positions (6 positions aligned with axes)
          positions = [
            [0, 0, 2.0],
            [0, 0, -2.0],
            [2.0, 0, 0],
            [-2.0, 0, 0],
            [0, 2.0, 0],
            [0, -2.0, 0]
          ];
          break;
        case 'vacancy':
          // Vacancy positions (randomly distributed)
          const vacancyCount = 8;
          for (let i = 0; i < vacancyCount; i++) {
            const theta = Math.random() * 2 * Math.PI;
            const phi = Math.random() * Math.PI;
            const r = 1.8 + 0.4 * Math.random(); // Random radius
            
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);
            
            positions.push([x, y, z]);
          }
          break;
        case 'tetrahedral':
        default:
          // Tetrahedral positions (4 positions in tetrahedral arrangement)
          positions = [
            [1.5, 1.5, 1.5],
            [-1.5, -1.5, 1.5],
            [1.5, -1.5, -1.5],
            [-1.5, 1.5, -1.5]
          ];
      }

      positions.forEach(pos => {
        const deuterium = new THREE.Mesh(deuteriumGeometry, deuteriumMaterial);
        deuterium.position.set(...pos);
        deuterium.userData = { type: 'deuterium' };
        scene.add(deuterium);
        objectsRef.current.push(deuterium);
      });

      // Create enhancement effect visualizations
      // Proximity effect (green glow between metal and deuterium)
      if (proximity > 1.1) {
        const proximityGeometry = getGeometry('sphere', { 
          radius: 0.5 * proximityScale, 
          widthSegments: 16, 
          heightSegments: 16 
        });
        const proximityMaterial = getMaterial('phong', {
          color: colors.proximity,
          transparent: true,
          opacity: 0.6,
          emissive: colors.proximity,
          emissiveIntensity: 0.4
        });

        positions.forEach(pos => {
          const proximityEffect = new THREE.Mesh(proximityGeometry, proximityMaterial);
          proximityEffect.position.set(
            pos[0] * 0.5, 
            pos[1] * 0.5, 
            pos[2] * 0.5
          );
          proximityEffect.userData = { 
            type: 'effect', 
            effect: 'proximity',
            pulseSpeed: 1.2
          };
          scene.add(proximityEffect);
          objectsRef.current.push(proximityEffect);
        });
      }

      // Electron screening effect (purple sphere around the whole system)
      if (screening > 1.1) {
        const screeningGeometry = getGeometry('sphere', { 
          radius: 3.0 * screeningScale, 
          widthSegments: 32, 
          heightSegments: 32 
        });
        const screeningMaterial = getMaterial('phong', {
          color: colors.screening,
          transparent: true,
          opacity: 0.2,
          wireframe: true,
          emissive: colors.screening,
          emissiveIntensity: 0.3
        });

        const screeningEffect = new THREE.Mesh(screeningGeometry, screeningMaterial);
        screeningEffect.userData = { 
          type: 'effect', 
          effect: 'screening',
          pulseSpeed: 0.5
        };
        scene.add(screeningEffect);
        objectsRef.current.push(screeningEffect);
      }

      // Lattice fluctuation effect (orange waves)
      if (fluctuation > 1.1) {
        // Adjust fluctuation visualization based on site type
        let fluctuationGeometries = [];
        
        if (siteType === 'tetrahedral') {
          // For tetrahedral, use torus rings
          fluctuationGeometries = [
            getGeometry('torus', { 
              radius: 2.5 * fluctuationScale, 
              tube: 0.1, 
              radialSegments: 16, 
              tubularSegments: 100 
            })
          ];
        } else if (siteType === 'octahedral') {
          // For octahedral, use more complex structure
          fluctuationGeometries = [
            getGeometry('torus', { 
              radius: 2.5 * fluctuationScale, 
              tube: 0.1, 
              radialSegments: 16, 
              tubularSegments: 100 
            }),
            getGeometry('torusKnot', {
              radius: 1.5 * fluctuationScale,
              tube: 0.05,
              tubularSegments: 64,
              radialSegments: 8,
              p: 2,
              q: 3
            })
          ];
        } else {
          // For vacancy, use particle system-like approach
          fluctuationGeometries = [
            getGeometry('icosahedron', { radius: 0.2 * fluctuationScale, detail: 0 })
          ];
        }

        const fluctuationMaterial = getMaterial('phong', {
          color: colors.fluctuation,
          transparent: true,
          opacity: 0.6,
          emissive: colors.fluctuation,
          emissiveIntensity: 0.4
        });

        // For standard torus geometry
        if (siteType === 'tetrahedral' || siteType === 'octahedral') {
          // Create multiple torus rings at different orientations
          const rotations = [
            [0, 0, 0],
            [Math.PI/2, 0, 0],
            [0, Math.PI/2, 0]
          ];

          rotations.forEach(rotation => {
            const fluctuationEffect = new THREE.Mesh(fluctuationGeometries[0], fluctuationMaterial);
            fluctuationEffect.rotation.set(...rotation);
            fluctuationEffect.userData = { 
              type: 'effect', 
              effect: 'fluctuation',
              pulseSpeed: 1.8
            };
            scene.add(fluctuationEffect);
            objectsRef.current.push(fluctuationEffect);
          });
          
          // Add torus knot for octahedral
          if (siteType === 'octahedral' && fluctuationGeometries[1]) {
            const torusKnotEffect = new THREE.Mesh(fluctuationGeometries[1], fluctuationMaterial);
            torusKnotEffect.userData = { 
              type: 'effect', 
              effect: 'fluctuation',
              pulseSpeed: 2.2
            };
            scene.add(torusKnotEffect);
            objectsRef.current.push(torusKnotEffect);
          }
        } else {
          // For vacancy type, create particle system appearance
          for (let i = 0; i < 20; i++) {
            const theta = Math.random() * 2 * Math.PI;
            const phi = Math.random() * Math.PI;
            const r = 2.0 + 0.8 * Math.random();
            
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);
            
            const fluctuationParticle = new THREE.Mesh(fluctuationGeometries[0], fluctuationMaterial);
            fluctuationParticle.position.set(x, y, z);
            fluctuationParticle.userData = { 
              type: 'effect', 
              effect: 'fluctuation', 
              pulseSpeed: 1.5 + Math.random() * 1.0
            };
            scene.add(fluctuationParticle);
            objectsRef.current.push(fluctuationParticle);
          }
        }
      }

      // Resonance effect (pink points or stars)
      if (resonance > 1.1) {
        const resonanceGeometry = getGeometry('octahedron', { radius: 0.2 * resonanceScale, detail: 0 });
        const resonanceMaterial = getMaterial('phong', {
          color: colors.resonance,
          emissive: colors.resonance,
          emissiveIntensity: 0.7
        });

        // Create resonance points in a spherical distribution
        for (let i = 0; i < 12; i++) {
          const phi = Math.acos(-1 + (2 * i) / 12);
          const theta = Math.sqrt(12 * Math.PI) * phi;
          
          const x = 4 * Math.cos(theta) * Math.sin(phi);
          const y = 4 * Math.sin(theta) * Math.sin(phi);
          const z = 4 * Math.cos(phi);
          
          const resonancePoint = new THREE.Mesh(resonanceGeometry, resonanceMaterial);
          resonancePoint.position.set(x, y, z);
          resonancePoint.userData = { 
            type: 'effect', 
            effect: 'resonance',
            pulseSpeed: 2.2 + Math.random() * 0.8 // Slightly different speeds
          };
          scene.add(resonancePoint);
          objectsRef.current.push(resonancePoint);
        }
      }

      // Quantum effect (cyan glow and particles)
      if (quantum > 1.1) {
        // Create a quantum particles system
        const quantumGeometry = getGeometry('sphere', { radius: 0.1 * quantumScale, widthSegments: 8, heightSegments: 8 });
        const quantumMaterial = getMaterial('phong', {
          color: colors.quantum,
          transparent: true,
          opacity: 0.8,
          emissive: colors.quantum,
          emissiveIntensity: 0.6
        });

        // Create quantum particles in a spiral pattern
        for (let i = 0; i < 50; i++) {
          const angle = 0.2 * i;
          const radius = 0.05 * i;
          const height = 0.05 * i - 1.25;
          
          const x = radius * Math.cos(angle);
          const y = height;
          const z = radius * Math.sin(angle);
          
          const quantumParticle = new THREE.Mesh(quantumGeometry, quantumMaterial);
          quantumParticle.position.set(x, y, z);
          quantumParticle.userData = { 
            type: 'effect', 
            effect: 'quantum',
            pulseSpeed: 3.0 + Math.random() * 0.5
          };
          scene.add(quantumParticle);
          objectsRef.current.push(quantumParticle);
        }
      }

      // If there's significant total enhancement, add a glow effect
      if (total > 1e20) {
        const glowGeometry = getGeometry('sphere', { radius: 5.0 * totalEnhancement, widthSegments: 32, heightSegments: 32 });
        const glowMaterial = getMaterial('phong', {
          color: 0xffffff,
          transparent: true,
          opacity: 0.15,
          emissive: 0xffffff,
          emissiveIntensity: 0.2
        });

        const glowEffect = new THREE.Mesh(glowGeometry, glowMaterial);
        glowEffect.userData = { 
          type: 'effect', 
          effect: 'total',
          pulseSpeed: 0.3
        };
        scene.add(glowEffect);
        objectsRef.current.push(glowEffect);
      }

      // Force a render
      if (rendererRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

    } catch (error) {
      logger.error('Error creating enhanced fusion visualization', error);
      setError(`Visualization error: ${error.message}`);
    }
  }, [getGeometry, getMaterial, safeLog10, colors, logger]);

  // Create placeholder visualization when no data is available
  const createPlaceholderVisualization = useCallback(() => {
    if (!sceneRef.current) return;

    try {
      const scene = sceneRef.current;

      // Create a simple metal-deuterium system
      const metalGeometry = getGeometry('sphere', { radius: 1.0, widthSegments: 32, heightSegments: 32 });
      const metalMaterial = getMaterial('phong', {
        color: colors.palladium, // Use palladium as default metal
        shininess: 80
      });

      const centralMetal = new THREE.Mesh(metalGeometry, metalMaterial);
      centralMetal.userData = { type: 'metal', metal: 'Pd' };
      scene.add(centralMetal);
      objectsRef.current.push(centralMetal);

      // Add a wireframe sphere to indicate potential enhancement
      const wireframeGeometry = getGeometry('sphere', { radius: 3.0, widthSegments: 16, heightSegments: 16 });
      const wireframeMaterial = getMaterial('basic', {
        color: 0x888888,
        wireframe: true,
        transparent: true,
        opacity: 0.3
      });

      const wireframeSphere = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
      wireframeSphere.userData = { type: 'wireframe' };
      scene.add(wireframeSphere);
      objectsRef.current.push(wireframeSphere);
      
      // Add placeholder deuterium atoms in tetrahedral positions
      const deuteriumGeometry = getGeometry('sphere', { radius: 0.2, widthSegments: 16, heightSegments: 16 });
      const deuteriumMaterial = getMaterial('phong', {
        color: colors.deuterium,
        shininess: 60,
        transparent: true,
        opacity: 0.7
      });
      
      // Tetrahedral positions
      const positions = [
        [1.5, 1.5, 1.5],
        [-1.5, -1.5, 1.5],
        [1.5, -1.5, -1.5],
        [-1.5, 1.5, -1.5]
      ];
      
      positions.forEach(pos => {
        const deuterium = new THREE.Mesh(deuteriumGeometry, deuteriumMaterial);
        deuterium.position.set(...pos);
        deuterium.userData = { type: 'deuterium' };
        scene.add(deuterium);
        objectsRef.current.push(deuterium);
      });

      // Force a render
      if (rendererRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

    } catch (error) {
      logger.error('Error creating placeholder visualization', error);
      setError(`Visualization error: ${error.message}`);
    }
  }, [getGeometry, getMaterial, colors, logger]);
  
  // Animation loop
  const animate = useCallback(() => {
    frameIdRef.current = requestAnimationFrame(animate);
    
    // Update objects for animation effects
    objectsRef.current.forEach(obj => {
      if (obj.userData.type === 'effect') {
        obj.rotation.y += 0.01;
        
        // Pulse effect spheres
        const time = Date.now() * 0.001;
        const scale = 1.0 + 0.1 * Math.sin(time * obj.userData.pulseSpeed);
        obj.scale.set(scale, scale, scale);
      }
    });

    if (controlsRef.current) {
      controlsRef.current.update();
    }
    
    // Measure performance and render
    measureRenderTime();
    updatePerformanceStats();
  }, [measureRenderTime, updatePerformanceStats]);

  // Modified initialization useEffect
  useEffect(() => {
    if (!containerRef.current) return;

    try {
      // Initialize Three.js scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf0f0f0);
      sceneRef.current = scene;

      // Set up camera
      const camera = new THREE.PerspectiveCamera(
        75,
        containerRef.current.clientWidth / containerRef.current.clientHeight,
        0.1,
        1000
      );
      camera.position.z = 15;
      cameraRef.current = camera;

      // Set up renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Register for cleanup
      threeCleanup.registerThreeJsCanvas(renderer.domElement, 'EnhancedFusionVis');

      // Set up controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controlsRef.current = controls;

      // Set up lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(1, 1, 1);
      scene.add(directionalLight);

      // Add a subtle hemisphere light for better color representation
      const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5);
      scene.add(hemisphereLight);

      // Create visualization if data is available
      if (enhancedFusionData) {
        createVisualization(enhancedFusionData);
      } else {
        // Create placeholder visualization
        createPlaceholderVisualization();
      }

      // Initialize performance monitoring
      lastTimeRef.current = performance.now();
      
      // Start animation loop
      animate();
      setIsLoading(false);

      // Handle window resize
      const handleResize = () => {
        if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
        
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        
        rendererRef.current.setSize(width, height);
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        cleanup();
      };
    } catch (error) {
      logger.error('Error initializing enhanced fusion visualization', error);
      setError(`Visualization error: ${error.message}`);
      setIsLoading(false);
    }
  }, [cleanup, createVisualization, createPlaceholderVisualization, enhancedFusionData, logger, animate]);

  // Update visualization when data changes
  useEffect(() => {
    // Skip if there's no data or the scene isn't ready yet
    if (!enhancedFusionData || !sceneRef.current || isLoading) return;
    
    // Skip if data hasn't changed
    if (dataRef.current === enhancedFusionData) return;
    
    // Update ref to track current data
    dataRef.current = enhancedFusionData;
    
    // Clear previous objects
    objectsRef.current.forEach(obj => {
      if (sceneRef.current) {
        sceneRef.current.remove(obj);
      }
    });
    objectsRef.current = [];

    // Create new visualization
    createVisualization(enhancedFusionData);
  }, [enhancedFusionData, isLoading, createVisualization]);

  return (
    <VisualizationContainer>
      {showPerformanceStats && (
        <PerformanceOverlay>
          <div>FPS: {fps}</div>
          <div>Objects: {objectCount}</div>
          <div>Render time: {renderTime}ms</div>
          <div>Geom pool: {Object.keys(objectPoolRef.current.geometries).length}</div>
          <div>Mat pool: {Object.keys(objectPoolRef.current.materials).length}</div>
        </PerformanceOverlay>
      )}
      
      <Box sx={{ position: 'absolute', top: 4, right: 4, zIndex: 100 }}>
        <Tooltip title="Toggle performance stats">
          <IconButton
            size="small"
            onClick={togglePerformanceStats}
            sx={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.9)' }
            }}
          >
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      
      {isLoading && (
        <LoadingOverlay>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="body1">
            Loading Enhanced Fusion Visualization...
          </Typography>
        </LoadingOverlay>
      )}
      
      {error && !isLoading && (
        <LoadingOverlay>
          <Alert severity="error" sx={{ mb: 2, maxWidth: '80%' }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Visualization Error
            </Typography>
            <Typography variant="body2">
              {error}
            </Typography>
          </Alert>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => window.location.reload()}
          >
            Reload
          </Button>
        </LoadingOverlay>
      )}
      
      <ThreeContainer ref={containerRef} />
      
      {!isLoading && !error && enhancedFusionData && (
        <LegendOverlay>
          <Typography variant="caption" fontWeight="bold" gutterBottom>
            Enhancement Factors:
          </Typography>
          <LegendItem>
            <LegendColor color={`#${colors.proximity.toString(16).padStart(6, '0')}`} />
            <Typography variant="caption">Proximity</Typography>
          </LegendItem>
          <LegendItem>
            <LegendColor color={`#${colors.screening.toString(16).padStart(6, '0')}`} />
            <Typography variant="caption">Screening</Typography>
          </LegendItem>
          <LegendItem>
            <LegendColor color={`#${colors.fluctuation.toString(16).padStart(6, '0')}`} />
            <Typography variant="caption">Fluctuation</Typography>
          </LegendItem>
          <LegendItem>
            <LegendColor color={`#${colors.resonance.toString(16).padStart(6, '0')}`} />
            <Typography variant="caption">Resonance</Typography>
          </LegendItem>
          <LegendItem>
            <LegendColor color={`#${colors.quantum.toString(16).padStart(6, '0')}`} />
            <Typography variant="caption">Quantum</Typography>
          </LegendItem>
        </LegendOverlay>
      )}
    </VisualizationContainer>
  );
};

export default EnhancedFusionVisualization; 