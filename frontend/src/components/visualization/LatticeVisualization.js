import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
// Import OrbitControls safely with a try/catch
let ThreeOrbitControls = null;
try {
  // Dynamic import would be better but not supported in CRA without ejecting
  const OrbitControlsModule = require('three/examples/jsm/controls/OrbitControls');
  ThreeOrbitControls = OrbitControlsModule.OrbitControls;
} catch (e) {
  console.error('Failed to import OrbitControls:', e);
  // OrbitControls will be null, component will handle this gracefully
}
import { 
  Box, 
  Paper, 
  Typography, 
  CircularProgress, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  IconButton,
  ButtonGroup,
  Tooltip,
  Button
} from '@mui/material';
import { styled } from '@mui/material/styles';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RefreshIcon from '@mui/icons-material/Refresh';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import { useLogger } from '../../contexts/LogContext';
import { useAppSettings } from '../../contexts/AppSettingsContext';
import errorReporter from '../../utils/errorReporter';
import threeCleanup from '../../utils/threeCleanup';

// Modified handling for OrbitControls to support testing
const OrbitControls = 
  typeof window !== 'undefined' && 
  window.THREE && 
  window.THREE.OrbitControls ? 
  window.THREE.OrbitControls : 
  (typeof jest !== 'undefined' ? 
    class MockOrbitControls {
      constructor() {
        this.enableDamping = true;
        this.update = () => {};
        this.dispose = () => {};
      }
    } : 
    ThreeOrbitControls);

// Styled components
const VisualizationContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  position: 'relative',
  height: '500px',
  overflow: 'hidden',
}));

const ControlsOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(2),
  right: theme.spacing(2),
  zIndex: 100,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
}));

const SimControlsOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: theme.spacing(2),
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 100,
  display: 'flex',
  backgroundColor: 'rgba(255, 255, 255, 0.7)',
  padding: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
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

// Use a ref-based approach to prevent React from managing the canvas
const ThreeContainer = styled('div')(({ theme }) => ({
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  borderRadius: theme.shape.borderRadius,
}));

const LatticeVisualization = ({ simulationData, visualizationSettings: propVisualizationSettings, onStartSimulation, onStopSimulation }) => {
  const logger = useLogger();
  const { settings } = useAppSettings();
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const frameIdRef = useRef(null);
  const threeContainerRef = useRef(null);
  
  // Merge visualization settings from props with app settings using useMemo
  const visualizationSettings = useMemo(() => ({
    ...settings?.visualization,
    ...propVisualizationSettings
  }), [settings?.visualization, propVisualizationSettings]);
  
  // Define element colors for the visualization using useMemo
  const elementColors = useMemo(() => ({
    palladium: 0xB9B9B9, // silver-gray
    nickel: 0xA6A6A6,    // darker silver
    deuterium: 0x2969B0, // blue
    hydrogen: 0x33A1C9,  // lighter blue
    energy: 0xFF6347,    // tomato red
    transition: 0xFFA500 // orange
  }), []);
  
  // State for component
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [visualizationType, setVisualizationType] = useState('lattice'); // lattice, energy, phonon
  const [latticeAtoms, setLatticeAtoms] = useState([]);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  
  // Create placeholder lattice for visualization
  const createPlaceholderLattice = useCallback(() => {
    try {
      logger.debug('Creating placeholder lattice');
      setIsLoading(true);
      setHasError(false);

      if (!sceneRef.current) {
        logger.warn('Scene not initialized');
        setHasError(true);
        setErrorMessage('Visualization engine not initialized properly. Try refreshing the page.');
        setIsLoading(false);
        return;
      }

      // Clear existing lattice atoms
      latticeAtoms.forEach(atom => {
        if (sceneRef.current) {
          sceneRef.current.remove(atom);
        }
      });

      const newLatticeAtoms = [];

      // Create a simple palladium-deuterium lattice structure
      const latticeSize = 3;
      const latticeSpacing = 2;

      // Create materials for different particles
      const materialPd = new THREE.MeshPhongMaterial({ 
        color: elementColors.palladium,
        transparent: false,
        opacity: 1.0
      });

      const materialD = new THREE.MeshPhongMaterial({ 
        color: elementColors.deuterium,
        transparent: false,
        opacity: 1.0
      });

      // Apply atom scale from settings
      const atomScale = visualizationSettings?.atomScale || 1.0;
      
      // Core lattice geometry
      const pdGeometry = new THREE.SphereGeometry(0.5 * atomScale, 32, 32);
      const dGeometry = new THREE.SphereGeometry(0.3 * atomScale, 16, 16);

      // Create a grid of atoms
      for (let x = -latticeSize; x <= latticeSize; x++) {
        for (let y = -latticeSize; y <= latticeSize; y++) {
          for (let z = -latticeSize; z <= latticeSize; z++) {
            // Place palladium atoms at lattice points
            const pdAtom = new THREE.Mesh(pdGeometry, materialPd);
            pdAtom.position.set(
              x * latticeSpacing, 
              y * latticeSpacing, 
              z * latticeSpacing
            );
            pdAtom.userData = { type: 'palladium' };

            if (sceneRef.current) {
              sceneRef.current.add(pdAtom);
              newLatticeAtoms.push(pdAtom);
            }

            // Apply settings to control deuterium density
            const deuteriumLoading = settings?.lenrPhysics?.deuteriumLoading || 0.85;
            const deuteriumThreshold = 1 - deuteriumLoading;
            
            // Randomly place deuterium atoms at interstitial positions with density based on settings
            if (Math.random() > deuteriumThreshold) {
              const dAtom = new THREE.Mesh(dGeometry, materialD);
              
              // Position deuterium at random interstitial positions
              dAtom.position.set(
                x * latticeSpacing + (Math.random() - 0.5) * 0.8,
                y * latticeSpacing + (Math.random() - 0.5) * 0.8,
                z * latticeSpacing + (Math.random() - 0.5) * 0.8
              );
              
              dAtom.userData = { type: 'deuterium' };
              
              if (sceneRef.current) {
                sceneRef.current.add(dAtom);
                newLatticeAtoms.push(dAtom);
              }
            }
          }
        }
      }
      
      setLatticeAtoms(newLatticeAtoms);
      setIsLoading(false);
      logger.debug(`Created lattice with ${newLatticeAtoms.length} atoms`);
    } catch (error) {
      logger.error('Error creating placeholder lattice', error);
      errorReporter.report('visualization-error', 'Failed to create lattice', error);
      setHasError(true);
      setErrorMessage('Failed to create visualization. Please try again.');
      setIsLoading(false);
    }
  }, [logger, latticeAtoms, visualizationSettings, settings, elementColors.palladium, elementColors.deuterium]);
  
  // New function to update the visualization based on Rydberg Matter simulation results
  const updateRydbergVisualization = useCallback((results) => {
    try {
      logger.debug('Starting Rydberg visualization update');
      setIsLoading(true);
      
      if (!sceneRef.current) {
        logger.warn('Scene not initialized yet');
        return;
      }
      
      // Clear existing lattice atoms
      latticeAtoms.forEach(atom => {
        if (sceneRef.current) {
          sceneRef.current.remove(atom);
        }
      });
      
      const newLatticeAtoms = [];
      
      // Create a Rydberg lattice structure based on simulation parameters
      const latticeSize = 2; // Smaller grid for better visibility
      const latticeSpacing = 2.5;
      
      // Calculate scaling factors based on simulation results
      const rydbergRadiusScale = results.rydbergRadius ? (results.rydbergRadius / 5) : 1; // Normalize radius for visualization
      const overlapScale = results.overlapProbability ? results.overlapProbability : 0.5;
      
      // Create materials for different particles
      const materialCore = new THREE.MeshPhongMaterial({ 
        color: elementColors.palladium, // Core atoms
        transparent: false,
        opacity: 1.0
      });
      
      const materialElectron = new THREE.MeshPhongMaterial({ 
        color: elementColors.hydrogen, // Electron clouds
        transparent: true,
        opacity: 0.6
      });
      
      const materialBridge = new THREE.MeshPhongMaterial({ 
        color: elementColors.transition, // Bridging states
        transparent: true,
        opacity: 0.4
      });
      
      // Geometries
      const coreGeometry = new THREE.SphereGeometry(0.3, 24, 24);
      const electronGeometry = new THREE.SphereGeometry(
        0.8 * rydbergRadiusScale, 
        16, 
        16
      );
      
      // Create a grid of Rydberg atoms
      for (let x = -latticeSize; x <= latticeSize; x++) {
        for (let y = -latticeSize; y <= latticeSize; y++) {
          for (let z = -latticeSize; z <= latticeSize; z++) {
            // Place core atoms at lattice points
            const coreAtom = new THREE.Mesh(coreGeometry, materialCore);
            coreAtom.position.set(
              x * latticeSpacing, 
              y * latticeSpacing, 
              z * latticeSpacing
            );
            coreAtom.userData = { type: 'core' };
            
            if (sceneRef.current) {
              sceneRef.current.add(coreAtom);
              newLatticeAtoms.push(coreAtom);
            }
            
            // Add electron cloud
            const electronCloud = new THREE.Mesh(electronGeometry, materialElectron);
            electronCloud.position.set(
              x * latticeSpacing, 
              y * latticeSpacing, 
              z * latticeSpacing
            );
            electronCloud.userData = { type: 'electron' };
            
            if (sceneRef.current) {
              sceneRef.current.add(electronCloud);
              newLatticeAtoms.push(electronCloud);
            }
            
            // Add bridges between adjacent atoms based on overlap probability
            // Only create bridges between nearest neighbors
            if (Math.random() < overlapScale) {
              const directions = [
                [1, 0, 0], [0, 1, 0], [0, 0, 1],
                [-1, 0, 0], [0, -1, 0], [0, 0, -1]
              ];
              
              // Choose a random direction to create a bridge
              const randomDir = directions[Math.floor(Math.random() * directions.length)];
              
              // Create a cylinder to represent the bridge
              const bridgeGeometry = new THREE.CylinderGeometry(
                0.2, 
                0.2, 
                latticeSpacing * 0.7, 
                8, 
                1
              );
              
              const bridge = new THREE.Mesh(bridgeGeometry, materialBridge);
              
              // Position and rotate the bridge
              bridge.position.set(
                x * latticeSpacing + (randomDir[0] * latticeSpacing * 0.4), 
                y * latticeSpacing + (randomDir[1] * latticeSpacing * 0.4), 
                z * latticeSpacing + (randomDir[2] * latticeSpacing * 0.4)
              );
              
              // Rotate the bridge to align with the direction
              if (randomDir[0] !== 0) {
                bridge.rotation.z = Math.PI / 2;
              } else if (randomDir[2] !== 0) {
                bridge.rotation.x = Math.PI / 2;
              }
              
              bridge.userData = { type: 'bridge' };
              
              if (sceneRef.current) {
                sceneRef.current.add(bridge);
                newLatticeAtoms.push(bridge);
              }
            }
          }
        }
      }
      
      logger.info(`Created Rydberg visualization with ${newLatticeAtoms.length} elements`);
      setLatticeAtoms(newLatticeAtoms);
      setIsLoading(false);
    } catch (error) {
      logger.error('Error updating Rydberg visualization');
      errorReporter.report(error, { 
        component: 'LatticeVisualization',
        function: 'updateRydbergVisualization',
        parameters: JSON.stringify(results)
      });
      // Fallback to placeholder if something goes wrong
      createPlaceholderLattice();
    }
  }, [latticeAtoms, elementColors, createPlaceholderLattice, logger]);
  
  // Initialize Three.js scene
  useEffect(() => {
    let isMounted = true;
    let cleanup = () => {};
    
    const initializeThreeJsScene = async () => {
      try {
        logger.debug('Initializing 3D visualization');
        
        // Reset error state at the beginning of initialization
        if (isMounted) {
          setHasError(false);
          setErrorMessage('');
        }
        
        // Initialize scene if not already done
        if (!sceneRef.current) {
          sceneRef.current = new THREE.Scene();
          
          // Apply background color from settings if available
          if (visualizationSettings?.backgroundColor) {
            try {
              sceneRef.current.background = new THREE.Color(visualizationSettings.backgroundColor);
            } catch (e) {
              logger.warn('Invalid background color in settings, using default');
              sceneRef.current.background = new THREE.Color(0xf0f0f0);
            }
          } else {
            sceneRef.current.background = new THREE.Color(0xf0f0f0);
          }
        }
        
        // Create camera if not already done
        if (!cameraRef.current) {
          cameraRef.current = new THREE.PerspectiveCamera(
            75, // Field of view
            1, // Aspect ratio (will be updated)
            0.1, // Near plane
            1000 // Far plane
          );
          cameraRef.current.position.z = 15;
        }

        // Initialize Three.js only if container is available
        if (containerRef.current && !rendererRef.current) {
          // Get container dimensions
          const width = containerRef.current.clientWidth || 800;
          const height = containerRef.current.clientHeight || 600;

          try {
            // Create renderer with antialiasing based on settings
            rendererRef.current = new THREE.WebGLRenderer({ 
              antialias: visualizationSettings?.useAntialiasing !== false, 
              alpha: true 
            });
            
            // Apply settings to renderer
            rendererRef.current.setSize(width, height);
            rendererRef.current.setPixelRatio(window.devicePixelRatio);
            
            // Apply quality settings
            const quality = visualizationSettings?.renderQuality || 'medium';
            switch (quality) {
              case 'low':
                rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 1));
                break;
              case 'medium':
                rendererRef.current.setPixelRatio(window.devicePixelRatio);
                break;
              case 'high':
                rendererRef.current.setPixelRatio(Math.max(window.devicePixelRatio, 2));
                break;
              default:
                rendererRef.current.setPixelRatio(window.devicePixelRatio);
            }
            
            // Set shadow properties
            rendererRef.current.shadowMap.enabled = quality !== 'low';
            rendererRef.current.shadowMap.type = THREE.PCFSoftShadowMap;
            
            // Set FPS limit
            const maxFPS = visualizationSettings?.maxFPS || 60;
            if (maxFPS < 60) {
              // For lower FPS, we'll manually control the animation timing
              rendererRef.current.userData = {
                ...rendererRef.current.userData,
                maxFPS: maxFPS,
                lastRenderTime: 0
              };
            }
            
            // Create a separate container for Three.js to prevent React issues
            const threeContainer = document.createElement('div');
            threeContainer.style.width = '100%';
            threeContainer.style.height = '100%';
            threeContainer.style.position = 'absolute';
            
            // Append renderer to container
            threeContainer.appendChild(rendererRef.current.domElement);
            containerRef.current.appendChild(threeContainer);
            
            // Register with cleanup utility
            const registryId = threeCleanup.registerElement(threeContainer, 'visualization');
            threeContainerRef.current = threeContainer;
            
            // Create orbit controls
            try {
              if (OrbitControls) {
                controlsRef.current = new OrbitControls(cameraRef.current, rendererRef.current.domElement);
                controlsRef.current.enableDamping = true;
                controlsRef.current.dampingFactor = 0.25;
                controlsRef.current.enableZoom = true;
                logger.debug('OrbitControls initialized successfully');
              } else {
                logger.warn('OrbitControls not available - camera controls will be disabled');
              }
            } catch (controlsError) {
              logger.error('Error creating orbit controls', controlsError);
              errorReporter.report('visualization-error', 'Failed to create orbit controls', controlsError);
              // Continue despite orbit controls error - we'll just have static camera
            }
            
            // Add lights
            const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
            sceneRef.current.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(10, 10, 10);
            sceneRef.current.add(directionalLight);

            // Show grid and axes based on settings
            if (visualizationSettings?.showGrid) {
              const gridHelper = new THREE.GridHelper(20, 20);
              sceneRef.current.add(gridHelper);
            }
            
            if (visualizationSettings?.showAxes) {
              const axesHelper = new THREE.AxesHelper(5);
              sceneRef.current.add(axesHelper);
            }
            
            // Prepare cleanup function
            cleanup = () => {
              if (isMounted) {
                logger.debug('Cleaning up 3D visualization');
                
                if (frameIdRef.current) {
                  cancelAnimationFrame(frameIdRef.current);
                  frameIdRef.current = null;
                }
                
                if (controlsRef.current) {
                  if (typeof controlsRef.current.dispose === 'function') {
                    try {
                      controlsRef.current.dispose();
                    } catch (e) {
                      logger.warn('Error disposing orbit controls', e);
                    }
                  }
                  controlsRef.current = null;
                }
                
                if (rendererRef.current) {
                  rendererRef.current.dispose();
                  rendererRef.current = null;
                }
                
                if (threeContainerRef.current && containerRef.current) {
                  try {
                    threeCleanup.safeRemoveChild(containerRef.current, threeContainerRef.current);
                  } catch (removeError) {
                    logger.error('Error removing Three.js container', removeError);
                  }
                  threeContainerRef.current = null;
                }
                
                // Clear scene
                if (sceneRef.current) {
                  try {
                    while(sceneRef.current.children.length > 0) { 
                      const object = sceneRef.current.children[0];
                      sceneRef.current.remove(object);
                      
                      if (object.geometry) {
                        object.geometry.dispose();
                      }
                      
                      if (object.material) {
                        if (Array.isArray(object.material)) {
                          object.material.forEach(material => material.dispose());
                        } else {
                          object.material.dispose();
                        }
                      }
                    }
                  } catch (sceneCleanupError) {
                    logger.error('Error cleaning up scene', sceneCleanupError);
                  }
                  sceneRef.current = null;
                }
                
                cameraRef.current = null;
              }
            };
            
            // Animation loop
            const animate = () => {
              if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
              
              // Apply FPS limiting if configured
              const now = performance.now();
              const fps = rendererRef.current.userData?.maxFPS;
              
              if (!fps || !rendererRef.current.userData.lastRenderTime || 
                  now - rendererRef.current.userData.lastRenderTime >= 1000 / fps) {
                
                if (controlsRef.current && typeof controlsRef.current.update === 'function') {
                  try {
                    controlsRef.current.update();
                  } catch (e) {
                    // Ignore errors in orbit controls update
                  }
                }
                
                try {
                  rendererRef.current.render(sceneRef.current, cameraRef.current);
                } catch (renderError) {
                  logger.error('Error during rendering', renderError);
                  errorReporter.report('visualization-error', 'Rendering error', renderError);
                  if (isMounted) {
                    setHasError(true);
                    setErrorMessage('Rendering error: ' + (renderError.message || 'Unknown error'));
                    setIsLoading(false);
                  }
                  // Stop animation loop on render error
                  if (frameIdRef.current) {
                    cancelAnimationFrame(frameIdRef.current);
                    frameIdRef.current = null;
                  }
                  return;
                }
                
                if (fps) {
                  rendererRef.current.userData.lastRenderTime = now;
                }
              }
              
              frameIdRef.current = requestAnimationFrame(animate);
            };
            
            // Handle window resize
            const handleResize = () => {
              if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
              
              const width = containerRef.current.clientWidth || 800;
              const height = containerRef.current.clientHeight || 600;
              
              cameraRef.current.aspect = width / height;
              cameraRef.current.updateProjectionMatrix();
              
              rendererRef.current.setSize(width, height);
            };
            
            // Add resize listener
            window.addEventListener('resize', handleResize);
            
            // Start animation loop
            animate();
            
            // Create initial lattice
            createPlaceholderLattice();
            
            // Update cleanup to include resize listener
            const originalCleanup = cleanup;
            cleanup = () => {
              window.removeEventListener('resize', handleResize);
              originalCleanup();
            };
          } catch (rendererError) {
            logger.error('Error creating WebGL renderer', rendererError);
            errorReporter.report('visualization-error', 'Failed to create WebGL renderer', rendererError);
            if (isMounted) {
              setHasError(true);
              setErrorMessage(`WebGL error: ${rendererError.message || 'Failed to initialize 3D renderer. Your browser may not support WebGL.'}`);
              setIsLoading(false);
            }
          }
        } else if (!containerRef.current) {
          logger.warn('Container ref not available for Three.js initialization');
          if (isMounted) {
            setHasError(true);
            setErrorMessage('Visualization container not available. Please try refreshing the page.');
            setIsLoading(false);
          }
        }
      } catch (error) {
        logger.error('Error initializing 3D visualization', error);
        errorReporter.report('visualization-error', 'Failed to initialize 3D visualization', error);
        if (isMounted) {
          setHasError(true);
          setErrorMessage(`Initialization error: ${error.message || 'Unknown error occurred during visualization setup.'}`);
          setIsLoading(false);
        }
      }
    };
    
    // Call the async initialization function
    initializeThreeJsScene();
    
    return () => {
      isMounted = false;
      cleanup();
    };
  }, [logger, createPlaceholderLattice, visualizationSettings]);
  
  // Update visualization when data or type changes
  useEffect(() => {
    if (simulationData && !isLoading) {
      // Future implementation: update visualization based on simulation data
      logger.debug('Simulation data updated, visualization would update here');
    }
  }, [simulationData, isLoading, logger]);

  // Update scene background when settings change
  useEffect(() => {
    if (sceneRef.current && visualizationSettings?.backgroundColor) {
      try {
        sceneRef.current.background = new THREE.Color(visualizationSettings.backgroundColor);
      } catch (e) {
        logger.warn('Invalid background color in settings');
      }
    }
  }, [visualizationSettings?.backgroundColor, logger]);

  // Update atom scale when settings change
  useEffect(() => {
    if (visualizationSettings?.atomScale && latticeAtoms.length > 0) {
      createPlaceholderLattice();
    }
  }, [visualizationSettings?.atomScale, createPlaceholderLattice, latticeAtoms.length]);

  // Update axes and grid visibility when settings change
  useEffect(() => {
    if (!sceneRef.current) return;
    
    // Remove existing grid and axes
    const existingGrid = sceneRef.current.children.find(child => child instanceof THREE.GridHelper);
    const existingAxes = sceneRef.current.children.find(child => child instanceof THREE.AxesHelper);
    
    if (existingGrid) {
      sceneRef.current.remove(existingGrid);
    }
    
    if (existingAxes) {
      sceneRef.current.remove(existingAxes);
    }
    
    // Add grid if enabled
    if (visualizationSettings?.showGrid) {
      const gridHelper = new THREE.GridHelper(20, 20);
      sceneRef.current.add(gridHelper);
    }
    
    // Add axes if enabled
    if (visualizationSettings?.showAxes) {
      const axesHelper = new THREE.AxesHelper(5);
      sceneRef.current.add(axesHelper);
    }
  }, [visualizationSettings?.showGrid, visualizationSettings?.showAxes]);

  // Update renderer quality when settings change
  useEffect(() => {
    if (!rendererRef.current) return;
    
    const quality = visualizationSettings?.renderQuality || 'medium';
    
    switch (quality) {
      case 'low':
        rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 1));
        rendererRef.current.shadowMap.enabled = false;
        break;
      case 'medium':
        rendererRef.current.setPixelRatio(window.devicePixelRatio);
        rendererRef.current.shadowMap.enabled = true;
        rendererRef.current.shadowMap.type = THREE.PCFShadowMap;
        break;
      case 'high':
        rendererRef.current.setPixelRatio(Math.max(window.devicePixelRatio, 2));
        rendererRef.current.shadowMap.enabled = true;
        rendererRef.current.shadowMap.type = THREE.PCFSoftShadowMap;
        break;
      default:
        rendererRef.current.setPixelRatio(window.devicePixelRatio);
    }
    
    // Update antialiasing (requires renderer recreation - not possible without a full remount)
    // We'll log this limitation
    if (rendererRef.current.antialias !== visualizationSettings?.useAntialiasing) {
      logger.info('Antialiasing setting change requires reload to take effect');
    }
    
  }, [visualizationSettings?.renderQuality, visualizationSettings?.useAntialiasing, logger]);

  // Handle visualization type changes
  const handleVisualizationTypeChange = (event) => {
    const newType = event.target.value;
    logger.debug('Visualization type changed', { from: visualizationType, to: newType });
    setVisualizationType(newType);
  };

  // Handle simulation controls
  const handleStartSimulation = () => {
    logger.info('Simulation started by user');
    setIsSimulationRunning(true);
    
    if (onStartSimulation) {
      onStartSimulation();
    }
  };

  const handleStopSimulation = () => {
    logger.info('Simulation stopped by user');
    setIsSimulationRunning(false);
    
    if (onStopSimulation) {
      onStopSimulation();
    }
  };

  const handleRefreshSimulation = () => {
    logger.info('Visualization reset by user');
    createPlaceholderLattice();
  };

  const resetCameraPosition = () => {
    logger.debug('Camera position reset');
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 0, 15);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  // Handle taking a screenshot
  const takeScreenshot = () => {
    logger.info('Screenshot requested');
    if (rendererRef.current) {
      try {
        // Render the scene
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        
        // Get the canvas data
        const dataURL = rendererRef.current.domElement.toDataURL('image/png');
        
        // Create a link to download the image
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = `lenr-visualization-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        logger.info('Screenshot saved successfully');
      } catch (error) {
        logger.error('Error taking screenshot');
        errorReporter.report(error, { 
          component: 'LatticeVisualization',
          function: 'takeScreenshot'
        });
      }
    }
  };

  return (
    <VisualizationContainer>
      {isLoading && (
        <LoadingOverlay>
          <CircularProgress />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Loading Visualization...
          </Typography>
        </LoadingOverlay>
      )}

      {hasError && (
        <LoadingOverlay>
          <Typography variant="h6" color="error" gutterBottom>
            Visualization Error
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {errorMessage || 'There was a problem loading the visualization.'}
          </Typography>
          <Button 
            variant="contained" 
            onClick={handleRefreshSimulation}
            startIcon={<RefreshIcon />}
          >
            Retry
          </Button>
        </LoadingOverlay>
      )}
      
      <ControlsOverlay>
        <Paper sx={{ p: 1 }}>
          <FormControl variant="outlined" size="small" fullWidth>
            <InputLabel>View Type</InputLabel>
            <Select
              value={visualizationType}
              onChange={handleVisualizationTypeChange}
              label="View Type"
            >
              <MenuItem value="lattice">Lattice</MenuItem>
              <MenuItem value="energy">Energy Levels</MenuItem>
              <MenuItem value="phonon">Phonons</MenuItem>
            </Select>
          </FormControl>
        </Paper>
        
        <Paper sx={{ p: 0.5 }}>
          <Tooltip title="Reset Camera">
            <IconButton size="small" onClick={resetCameraPosition} aria-label="Reset Camera">
              <CameraAltIcon />
            </IconButton>
          </Tooltip>
        </Paper>
        
        <Paper sx={{ p: 0.5 }}>
          <Tooltip title="Take Screenshot">
            <IconButton size="small" onClick={takeScreenshot} aria-label="Take Screenshot">
              <CameraAltIcon />
            </IconButton>
          </Tooltip>
        </Paper>
      </ControlsOverlay>
      
      <SimControlsOverlay>
        <ButtonGroup variant="contained" size="small">
          <Button 
            color="primary"
            startIcon={<PlayArrowIcon />}
            onClick={handleStartSimulation}
            disabled={isSimulationRunning}
          >
            Start
          </Button>
          <Button 
            color="secondary"
            startIcon={<StopIcon />}
            onClick={handleStopSimulation}
            disabled={!isSimulationRunning}
          >
            Stop
          </Button>
          <Button 
            startIcon={<RefreshIcon />}
            onClick={handleRefreshSimulation}
          >
            Reset
          </Button>
        </ButtonGroup>
      </SimControlsOverlay>
      
      <LegendOverlay>
        <Typography variant="subtitle2" gutterBottom>Legend:</Typography>
        <LegendItem>
          <LegendColor color="#B9B9B9" />
          <Typography variant="caption">Host Metal</Typography>
        </LegendItem>
        <LegendItem>
          <LegendColor color="#2969B0" />
          <Typography variant="caption">Deuterium/Hydrogen</Typography>
        </LegendItem>
        <LegendItem>
          <LegendColor color="#FFA500" />
          <Typography variant="caption">Tunneling Bridge</Typography>
        </LegendItem>
        <LegendItem>
          <LegendColor color="#FF6347" />
          <Typography variant="caption">Energy Release</Typography>
        </LegendItem>
      </LegendOverlay>
      
      <ThreeContainer
        ref={containerRef}
      />
    </VisualizationContainer>
  );
};

export default LatticeVisualization; 