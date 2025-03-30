import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { 
  Box, 
  Paper, 
  Typography, 
  CircularProgress, 
  Chip, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  IconButton,
  Tooltip,
  Divider,
  Button,
  Card,
  CardContent,
  Stack,
  useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';

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
  flexDirection: 'row',
  gap: theme.spacing(1),
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  padding: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
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

const LegendOverlay = styled(Card)(({ theme }) => ({
  position: 'absolute',
  bottom: theme.spacing(2),
  left: theme.spacing(2),
  zIndex: 100,
  maxWidth: '200px',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  boxShadow: theme.shadows[2],
}));

const LegendItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(1),
}));

const ColorSwatch = styled(Box)(({ color, theme }) => ({
  width: '20px',
  height: '20px',
  backgroundColor: color,
  borderRadius: '50%',
  marginRight: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
}));

const LatticeVisualization = ({ 
  simulationData, 
  visualizationSettings,
  onSimulationStart, 
  onSimulationPause, 
  onSimulationStop, 
  onSimulationReset,
  simulationStatus = 'ready' // ready, running, paused, completed, error
}) => {
  const theme = useTheme();
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const frameIdRef = useRef(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [visualizationType, setVisualizationType] = useState('lattice'); // lattice, energy, phonon
  const [latticeAtoms, setLatticeAtoms] = useState([]);
  const [showLegend, setShowLegend] = useState(true);
  
  // Create placeholder lattice - fully memoized with useCallback
  const createPlaceholderLattice = useCallback(() => {
    setIsLoading(true);
    
    if (!sceneRef.current) return;
    
    // Clear existing lattice atoms
    latticeAtoms.forEach(atom => {
      if (sceneRef.current) {
        sceneRef.current.remove(atom);
      }
    });
    
    const newLatticeAtoms = [];
    
    // Create a simple cubic lattice structure as placeholder
    const latticeSize = 3; // 3x3x3 grid
    const latticeSpacing = 2;
    
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const materialPd = new THREE.MeshPhongMaterial({ color: 0x909090 }); // Palladium - gray
    const materialD = new THREE.MeshPhongMaterial({ color: 0x0088ff }); // Deuterium - blue
    
    // Create a grid of atoms
    for (let x = -latticeSize; x <= latticeSize; x++) {
      for (let y = -latticeSize; y <= latticeSize; y++) {
        for (let z = -latticeSize; z <= latticeSize; z++) {
          // Place Palladium atoms at lattice points
          const pdAtom = new THREE.Mesh(geometry, materialPd);
          pdAtom.position.set(
            x * latticeSpacing,
            y * latticeSpacing,
            z * latticeSpacing
          );
          if (sceneRef.current) {
            sceneRef.current.add(pdAtom);
            newLatticeAtoms.push(pdAtom);
          }
          
          // Randomly place some Deuterium atoms
          if (Math.random() > 0.7) {
            const dGeometry = new THREE.SphereGeometry(0.25, 16, 16);
            const dAtom = new THREE.Mesh(dGeometry, materialD);
            
            // Position deuterium between lattice points
            dAtom.position.set(
              x * latticeSpacing + (Math.random() - 0.5) * 0.8,
              y * latticeSpacing + (Math.random() - 0.5) * 0.8,
              z * latticeSpacing + (Math.random() - 0.5) * 0.8
            );
            
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
  }, [latticeAtoms]);

  // Create lattice based on real simulation data
  const createLatticeFromData = useCallback((data) => {
    setIsLoading(true);
    
    if (!sceneRef.current || !data) return;
    
    // Clear existing lattice atoms
    latticeAtoms.forEach(atom => {
      if (sceneRef.current) {
        sceneRef.current.remove(atom);
      }
    });
    
    const newLatticeAtoms = [];
    
    // Default structure if not specified
    const latticeStructure = data.lattice?.structure || 'fcc';
    const elements = data.lattice?.elements || ['Pd', 'D'];
    const dimensions = data.lattice?.dimensions || { x: 3, y: 3, z: 3 };
    
    // Calculate energy range for color mapping
    const energyValue = data.lattice?.energy || 0;
    const normalizedEnergy = Math.min(Math.max(0, Math.log10(Math.abs(energyValue)) / 20 + 0.5), 1);
    
    // Color scale from blue (cold, low probability) to red (hot, high probability)
    const colorScale = (value) => {
      // value should be between 0-1
      const hue = (1 - value) * 240; // 240 is blue, 0 is red
      return new THREE.Color(`hsl(${hue}, 100%, 50%)`);
    };
    
    const latticeColor = colorScale(normalizedEnergy);
    
    // Create materials with color based on energy
    const materialPd = new THREE.MeshPhongMaterial({ 
      color: latticeStructure === 'fcc' ? 0x909090 : latticeColor 
    });
    const materialD = new THREE.MeshPhongMaterial({ 
      color: 0x0088ff,
      emissive: latticeColor,
      emissiveIntensity: normalizedEnergy * 0.5 
    });
    
    // Lattice spacing depends on structure type
    const latticeSpacing = latticeStructure === 'fcc' ? 2 : 1.5;
    
    // Create geometries
    const pdGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const dGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    
    // Create positions based on lattice structure
    const positions = [];
    
    if (latticeStructure === 'fcc') {
      // Face-centered cubic structure
      for (let x = -dimensions.x/2; x < dimensions.x/2; x++) {
        for (let y = -dimensions.y/2; y < dimensions.y/2; y++) {
          for (let z = -dimensions.z/2; z < dimensions.z/2; z++) {
            // Corner atoms
            positions.push({ x: x*latticeSpacing, y: y*latticeSpacing, z: z*latticeSpacing, element: 'Pd' });
            
            // Face atoms
            positions.push({ 
              x: (x + 0.5)*latticeSpacing, 
              y: (y + 0.5)*latticeSpacing, 
              z: z*latticeSpacing,
              element: 'Pd'
            });
            positions.push({ 
              x: x*latticeSpacing, 
              y: (y + 0.5)*latticeSpacing, 
              z: (z + 0.5)*latticeSpacing,
              element: 'Pd'
            });
            positions.push({ 
              x: (x + 0.5)*latticeSpacing, 
              y: y*latticeSpacing, 
              z: (z + 0.5)*latticeSpacing,
              element: 'Pd'
            });
            
            // Add deuterium at octahedral sites with probability based on energy
            if (Math.random() < normalizedEnergy * 0.8 + 0.2) {
              positions.push({ 
                x: (x + 0.5)*latticeSpacing, 
                y: (y + 0.5)*latticeSpacing, 
                z: (z + 0.5)*latticeSpacing,
                element: 'D'
              });
            }
          }
        }
      }
    } else {
      // Simple cubic structure (fallback)
      for (let x = -dimensions.x/2; x < dimensions.x/2; x++) {
        for (let y = -dimensions.y/2; y < dimensions.y/2; y++) {
          for (let z = -dimensions.z/2; z < dimensions.z/2; z++) {
            positions.push({ 
              x: x*latticeSpacing, 
              y: y*latticeSpacing, 
              z: z*latticeSpacing,
              element: 'Pd'
            });
            
            // Add deuterium with probability based on energy
            if (Math.random() < normalizedEnergy * 0.8 + 0.2) {
              positions.push({ 
                x: x*latticeSpacing + (Math.random() - 0.5) * 0.8, 
                y: y*latticeSpacing + (Math.random() - 0.5) * 0.8, 
                z: z*latticeSpacing + (Math.random() - 0.5) * 0.8,
                element: 'D'
              });
            }
          }
        }
      }
    }
    
    // Create actual meshes and add to scene
    positions.forEach(pos => {
      const geometry = pos.element === 'Pd' ? pdGeometry : dGeometry;
      const material = pos.element === 'Pd' ? materialPd : materialD;
      
      const atom = new THREE.Mesh(geometry, material);
      atom.position.set(pos.x, pos.y, pos.z);
      
      if (sceneRef.current) {
        sceneRef.current.add(atom);
        newLatticeAtoms.push(atom);
      }
    });
    
    // Add probability visualization
    if (energyValue > 0) {
      // Create a glow effect for high probability scenarios
      const glowGeometry = new THREE.SphereGeometry(dimensions.x * latticeSpacing * 0.6, 32, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: latticeColor,
        transparent: true,
        opacity: normalizedEnergy * 0.3
      });
      
      const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
      if (sceneRef.current) {
        sceneRef.current.add(glowSphere);
        newLatticeAtoms.push(glowSphere);
      }
    }
    
    setLatticeAtoms(newLatticeAtoms);
    setIsLoading(false);
  }, [latticeAtoms]);
  
  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Save a reference to the DOM element for cleanup
    const container = containerRef.current;
    
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;
    
    // Create camera
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.z = 15;
    cameraRef.current = camera;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Add controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.7;
    controlsRef.current = controls;
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Add coordinate axes helper
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);
    
    // Animation loop
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    
    animate();
    
    // Create placeholder lattice initially - executed once after scene setup
    setTimeout(() => {
      createPlaceholderLattice();
    }, 100);
    
    // Handle resize
    const handleResize = () => {
      if (container && cameraRef.current && rendererRef.current) {
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        
        rendererRef.current.setSize(width, height);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      
      if (rendererRef.current && container) {
        container.removeChild(rendererRef.current.domElement);
      }
      
      // Dispose resources
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
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
        });
      }
    };
  }, [createPlaceholderLattice, createLatticeFromData]);  // Add createLatticeFromData as dependency
  
  // Update visualization when simulation data changes
  useEffect(() => {
    if (simulationData) {
      // Use real simulation data to create the visualization
      createLatticeFromData(simulationData);
    } else {
      // Create a placeholder lattice for visualization
      createPlaceholderLattice();
    }
  }, [simulationData, createPlaceholderLattice, createLatticeFromData]); // Include all dependencies
  
  // Update visualization type
  const handleVisualizationTypeChange = (event) => {
    setVisualizationType(event.target.value);
    
    // Apply different visualization modes
    if (sceneRef.current && latticeAtoms.length > 0) {
      switch(event.target.value) {
        case 'energy':
          // In energy mode, show energy distribution
          latticeAtoms.forEach(atom => {
            if (atom.material && !Array.isArray(atom.material)) {
              if (atom.geometry.parameters.radius > 0.4) {
                // Palladium atoms - show less energy effect
                atom.material.emissive = new THREE.Color(0x880000);
                atom.material.emissiveIntensity = 0.2;
              } else {
                // Deuterium atoms - show more energy effect
                atom.material.emissive = new THREE.Color(0xff0000);
                atom.material.emissiveIntensity = 0.5;
              }
            }
          });
          break;
          
        case 'phonon':
          // In phonon mode, show wave propagation
          latticeAtoms.forEach(atom => {
            if (atom.material && !Array.isArray(atom.material)) {
              atom.material.emissive = new THREE.Color(0x00ff00);
              atom.material.emissiveIntensity = 0.3;
            }
          });
          break;
          
        default: // 'lattice'
          // Reset to normal lattice view
          latticeAtoms.forEach(atom => {
            if (atom.material && !Array.isArray(atom.material)) {
              if (atom.geometry.parameters.radius > 0.4) {
                // Palladium atoms
                atom.material.color.set(0x909090);
                atom.material.emissive = new THREE.Color(0x000000);
                atom.material.emissiveIntensity = 0;
              } else {
                // Deuterium atoms
                atom.material.color.set(0x0088ff);
                atom.material.emissive = new THREE.Color(0x000000);
                atom.material.emissiveIntensity = 0;
              }
            }
          });
      }
    }
  };
  
  // Simulation control handlers
  const handleStart = () => {
    if (onSimulationStart) onSimulationStart();
  };
  
  const handlePause = () => {
    if (onSimulationPause) onSimulationPause();
  };
  
  const handleStop = () => {
    if (onSimulationStop) onSimulationStop();
  };
  
  const handleReset = () => {
    if (onSimulationReset) onSimulationReset();
  };
  
  // Toggle legend visibility
  const toggleLegend = () => {
    setShowLegend(prev => !prev);
  };
  
  return (
    <Box ref={containerRef} sx={{ width: '100%', height: '100%', position: 'relative' }}>
      {isLoading && (
        <LoadingOverlay>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Loading visualization...
          </Typography>
        </LoadingOverlay>
      )}
      
      <ControlsOverlay>
        <Tooltip title="Show/Hide Legend">
          <IconButton 
            size="small" 
            onClick={toggleLegend}
            sx={{ 
              backgroundColor: 'rgba(255,255,255,0.8)',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.9)' }
            }}
          >
            <InfoIcon />
          </IconButton>
        </Tooltip>
        
        <FormControl variant="outlined" size="small" sx={{ minWidth: 120, backgroundColor: 'rgba(255,255,255,0.8)' }}>
          <InputLabel id="visualization-type-label">View Mode</InputLabel>
          <Select
            labelId="visualization-type-label"
            id="visualization-type"
            value={visualizationType}
            onChange={handleVisualizationTypeChange}
            label="View Mode"
          >
            <MenuItem value="lattice">Lattice Structure</MenuItem>
            <MenuItem value="energy">Energy Distribution</MenuItem>
            <MenuItem value="phonon">Phonon Propagation</MenuItem>
          </Select>
        </FormControl>
        
        <Chip 
          label={simulationData ? "Real Data" : "Placeholder Data"} 
          color={simulationData ? "success" : "default"}
          size="small"
          sx={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
        />
      </ControlsOverlay>
      
      {/* Simulation Control Buttons */}
      <SimControlsOverlay>
        {simulationStatus === 'ready' || simulationStatus === 'completed' || simulationStatus === 'error' ? (
          <Tooltip title="Start Simulation">
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<PlayArrowIcon />}
              onClick={handleStart}
            >
              Start
            </Button>
          </Tooltip>
        ) : simulationStatus === 'running' ? (
          <Tooltip title="Pause Simulation">
            <Button
              variant="contained"
              color="warning"
              size="small"
              startIcon={<PauseIcon />}
              onClick={handlePause}
            >
              Pause
            </Button>
          </Tooltip>
        ) : (
          <Tooltip title="Resume Simulation">
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<PlayArrowIcon />}
              onClick={handleStart}
            >
              Resume
            </Button>
          </Tooltip>
        )}
        
        <Tooltip title="Stop Simulation">
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<StopIcon />}
            onClick={handleStop}
            disabled={simulationStatus === 'ready'}
          >
            Stop
          </Button>
        </Tooltip>
        
        <Tooltip title="Reset Simulation">
          <Button
            variant="outlined"
            size="small"
            startIcon={<RestartAltIcon />}
            onClick={handleReset}
            disabled={simulationStatus === 'ready'}
          >
            Reset
          </Button>
        </Tooltip>
      </SimControlsOverlay>
      
      {/* Visualization Legend */}
      {showLegend && (
        <LegendOverlay>
          <CardContent sx={{ p: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">Legend</Typography>
              <IconButton size="small" onClick={toggleLegend}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            <Divider sx={{ mb: 1 }} />
            
            <Stack spacing={1}>
              <LegendItem>
                <ColorSwatch color="#909090" />
                <Typography variant="caption">Palladium (Pd)</Typography>
              </LegendItem>
              
              <LegendItem>
                <ColorSwatch color="#0088ff" />
                <Typography variant="caption">Deuterium (D)</Typography>
              </LegendItem>
              
              {visualizationType === 'energy' && (
                <>
                  <LegendItem>
                    <ColorSwatch color="#ff0000" />
                    <Typography variant="caption">High Energy</Typography>
                  </LegendItem>
                  
                  <LegendItem>
                    <ColorSwatch color="#0000ff" />
                    <Typography variant="caption">Low Energy</Typography>
                  </LegendItem>
                </>
              )}
              
              {visualizationType === 'phonon' && (
                <LegendItem>
                  <ColorSwatch color="#00ff00" />
                  <Typography variant="caption">Phonon Wave</Typography>
                </LegendItem>
              )}
              
              <Typography variant="caption" sx={{ mt: 1, fontSize: '0.7rem', color: theme.palette.text.secondary }}>
                {visualizationType === 'lattice' 
                  ? 'Lattice view shows palladium metal structure with deuterium atoms.' 
                  : visualizationType === 'energy' 
                  ? 'Energy view highlights probability of fusion reactions.'
                  : 'Phonon view shows vibration patterns within the lattice.'}
              </Typography>
            </Stack>
          </CardContent>
        </LegendOverlay>
      )}
    </Box>
  );
};

export default LatticeVisualization; 