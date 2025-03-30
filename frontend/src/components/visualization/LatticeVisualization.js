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
  useTheme,
  Tab,
  Tabs
} from '@mui/material';
import { styled } from '@mui/material/styles';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import ScienceIcon from '@mui/icons-material/Science';

// Import our new components and utilities
import TunnelingVisualization from './TunnelingVisualization';
import PhysicsInfoPanel from './PhysicsInfoPanel';
import { 
  CONSTANTS, 
  ELEMENT_PROPERTIES, 
  LATTICE_STRUCTURES,
  calculateTunnelingProbability,
  calculateOscillationAmplitude,
  getElementColorByEnergy
} from '../../utils/physicsConstants';

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
  maxWidth: '250px',
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

const PhysicsButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(2),
  left: theme.spacing(2),
  zIndex: 100,
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
}));

const EnhancedTabPanel = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  height: '100%',
}));

const LatticeVisualization = ({ 
  simulationData, 
  visualizationSettings,
  onSimulationStart, 
  onSimulationPause, 
  onSimulationStop, 
  onSimulationReset,
  simulationStatus = 'ready', // ready, running, paused, completed, error
  simulationParameters // Add this prop to accept simulation parameters
}) => {
  const theme = useTheme();
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const frameIdRef = useRef(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [visualizationType, setVisualizationType] = useState('lattice'); // lattice, energy, phonon, tunneling
  const [latticeAtoms, setLatticeAtoms] = useState([]);
  const [showLegend, setShowLegend] = useState(true);
  const [showPhysicsInfo, setShowPhysicsInfo] = useState(false);
  const [viewMode, setViewMode] = useState(0); // 0 = 3D, 1 = Tunneling, 2 = Physics Info
  
  // Create placeholder lattice - updated to use our physics constants
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
    
    // Create a simple FCC lattice structure
    const latticeSize = 3; // 3x3x3 grid
    const latticeSpacing = CONSTANTS.PD_LATTICE_CONSTANT * CONSTANTS.SCALE_FACTOR;
    
    // Use element properties for visualization
    const pdRadius = ELEMENT_PROPERTIES.Pd.radius * CONSTANTS.SCALE_FACTOR;
    const dRadius = ELEMENT_PROPERTIES.D.radius * CONSTANTS.SCALE_FACTOR;
    
    const pdGeometry = new THREE.SphereGeometry(pdRadius, 32, 32);
    const pdMaterial = new THREE.MeshPhongMaterial({ 
      color: ELEMENT_PROPERTIES.Pd.color,
      shininess: 80
    });
    
    const dGeometry = new THREE.SphereGeometry(dRadius, 16, 16);
    const dMaterial = new THREE.MeshPhongMaterial({ 
      color: ELEMENT_PROPERTIES.D.color,
      shininess: 100,
      emissive: 0x0044cc,
      emissiveIntensity: 0.2
    });
    
    // Create FCC lattice structure
    for (let x = -latticeSize; x <= latticeSize; x++) {
      for (let y = -latticeSize; y <= latticeSize; y++) {
        for (let z = -latticeSize; z <= latticeSize; z++) {
          // Place Palladium atoms at lattice points
          const pdAtom = new THREE.Mesh(pdGeometry, pdMaterial);
          pdAtom.position.set(
            x * latticeSpacing,
            y * latticeSpacing,
            z * latticeSpacing
          );
          pdAtom.userData = { 
            element: 'Pd', 
            position: [x, y, z],
            properties: ELEMENT_PROPERTIES.Pd
          };
          
          if (sceneRef.current) {
            sceneRef.current.add(pdAtom);
            newLatticeAtoms.push(pdAtom);
          }
          
          // Face centers (FCC)
          if ((x+y+z) % 2 === 0) {
            const placeFCCAtoms = (fccX, fccY, fccZ) => {
              if (Math.abs(fccX) <= latticeSize && 
                  Math.abs(fccY) <= latticeSize && 
                  Math.abs(fccZ) <= latticeSize) {
                const fccPd = new THREE.Mesh(pdGeometry, pdMaterial);
                fccPd.position.set(
                  fccX * latticeSpacing,
                  fccY * latticeSpacing,
                  fccZ * latticeSpacing
                );
                fccPd.userData = { 
                  element: 'Pd', 
                  position: [fccX, fccY, fccZ],
                  properties: ELEMENT_PROPERTIES.Pd
                };
                
                if (sceneRef.current) {
                  sceneRef.current.add(fccPd);
                  newLatticeAtoms.push(fccPd);
                }
              }
            };
            
            // Add face center atoms
            placeFCCAtoms(x+0.5, y+0.5, z);
            placeFCCAtoms(x+0.5, y, z+0.5);
            placeFCCAtoms(x, y+0.5, z+0.5);
          }
          
          // Randomly place some Deuterium atoms in octahedral sites
          if (Math.random() > 0.7) {
            // Octahedral sites are at midpoints between nearest neighbors
            const dAtom = new THREE.Mesh(dGeometry, dMaterial);
            
            // Position deuterium at octahedral sites
            dAtom.position.set(
              (x + 0.5) * latticeSpacing,
              y * latticeSpacing,
              z * latticeSpacing
            );
            
            dAtom.userData = { 
              element: 'D', 
              position: [x+0.5, y, z],
              properties: ELEMENT_PROPERTIES.D
            };
            
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

  // Create lattice based on real simulation data - using our physics parameters
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
    
    // Extract lattice parameters from simulation data
    const latticeStructure = data.lattice?.structure || 'fcc';
    const hostMetal = data.lattice?.host_metal || 'Pd';
    const fuel = data.lattice?.fuel || 'D';
    
    // Get appropriate lattice constant
    let latticeConstant;
    switch(hostMetal) {
      case 'Ni':
        latticeConstant = CONSTANTS.NI_LATTICE_CONSTANT;
        break;
      case 'Ti':
        latticeConstant = CONSTANTS.TI_LATTICE_CONSTANT;
        break;
      case 'Zr':
        latticeConstant = CONSTANTS.ZR_LATTICE_CONSTANT;
        break;
      case 'Pd':
      default:
        latticeConstant = CONSTANTS.PD_LATTICE_CONSTANT;
    }
    
    // Scale for visualization
    const latticeSpacing = latticeConstant * CONSTANTS.SCALE_FACTOR;
    
    // Dimensions
    const dimensions = data.lattice?.dimensions || { x: 3, y: 3, z: 3 };
    
    // Calculate energy values for visualization
    const temperature = data.parameters?.T || 300;
    const lambda = data.parameters?.lambda || 1e-10;
    const r0 = data.parameters?.r0 || 1e-10;
    const k_spring = data.parameters?.k_spring || 1000;
    const potential = data.parameters?.potential || 'harmonic';
    
    // Calculate tunneling probability
    const tunnelingProb = calculateTunnelingProbability(
      lambda, r0, temperature, k_spring, potential
    );
    
    // Normalize energy for color mapping (logarithmic scale due to small values)
    // Tunneling probability is extremely small, so we use log scale with a large offset
    const normalizedEnergy = Math.min(
      Math.max(0, (Math.log10(tunnelingProb) + 40) / 40), 
      1
    );
    
    // Create materials based on elements
    const hostGeometry = new THREE.SphereGeometry(
      ELEMENT_PROPERTIES[hostMetal].radius * CONSTANTS.SCALE_FACTOR, 32, 32
    );
    
    const fuelGeometry = new THREE.SphereGeometry(
      ELEMENT_PROPERTIES[fuel].radius * CONSTANTS.SCALE_FACTOR, 16, 16
    );
    
    // Create base materials
    const hostMaterial = new THREE.MeshPhongMaterial({ 
      color: ELEMENT_PROPERTIES[hostMetal].color,
      shininess: 80
    });
    
    // Use the color scaling function for the fuel atoms
    const fuelColor = getElementColorByEnergy(fuel, normalizedEnergy);
    const fuelMaterial = new THREE.MeshPhongMaterial({ 
      color: ELEMENT_PROPERTIES[fuel].color,
      emissive: fuelColor,
      emissiveIntensity: normalizedEnergy * 0.5,
      shininess: 100
    });
    
    // Build the appropriate lattice structure
    if (latticeStructure.toLowerCase() === 'fcc') {
      // FCC lattice structure (same as in placeholder, but with real parameters)
      for (let x = -dimensions.x/2; x <= dimensions.x/2; x++) {
        for (let y = -dimensions.y/2; y <= dimensions.y/2; y++) {
          for (let z = -dimensions.z/2; z <= dimensions.z/2; z++) {
            // Corner atoms
            addAtomToLattice(
              hostGeometry, hostMaterial, 
              x * latticeSpacing, y * latticeSpacing, z * latticeSpacing,
              hostMetal, [x, y, z], newLatticeAtoms
            );
            
            // Face centers if within bounds
            if ((x+y+z) % 2 === 0) {
              const addFCCAtom = (fccX, fccY, fccZ) => {
                if (Math.abs(fccX) <= dimensions.x/2 && 
                    Math.abs(fccY) <= dimensions.y/2 && 
                    Math.abs(fccZ) <= dimensions.z/2) {
                  addAtomToLattice(
                    hostGeometry, hostMaterial, 
                    fccX * latticeSpacing, fccY * latticeSpacing, fccZ * latticeSpacing,
                    hostMetal, [fccX, fccY, fccZ], newLatticeAtoms
                  );
                }
              };
              
              // Face centers
              addFCCAtom(x+0.5, y+0.5, z);
              addFCCAtom(x+0.5, y, z+0.5);
              addFCCAtom(x, y+0.5, z+0.5);
            }
            
            // Add fuel atoms in octahedral sites based on loading ratio
            const loading = data.lattice?.loading || 0.6; // D/Pd ratio
            if (Math.random() < loading) {
              // Choose octahedral or tetrahedral site
              const sites = [
                [x+0.5, y, z], // octahedral
                [x, y+0.5, z],
                [x, y, z+0.5],
                [x+0.25, y+0.25, z+0.25], // tetrahedral
                [x+0.75, y+0.25, z+0.25],
                [x+0.25, y+0.75, z+0.25],
                [x+0.25, y+0.25, z+0.75]
              ];
              
              // Randomly choose one site
              const site = sites[Math.floor(Math.random() * sites.length)];
              
              addAtomToLattice(
                fuelGeometry, fuelMaterial,
                site[0] * latticeSpacing, site[1] * latticeSpacing, site[2] * latticeSpacing,
                fuel, site, newLatticeAtoms
              );
            }
          }
        }
      }
    } else if (latticeStructure.toLowerCase() === 'bcc') {
      // Body-centered cubic structure
      for (let x = -dimensions.x/2; x <= dimensions.x/2; x++) {
        for (let y = -dimensions.y/2; y <= dimensions.y/2; y++) {
          for (let z = -dimensions.z/2; z <= dimensions.z/2; z++) {
            // Corner atoms
            addAtomToLattice(
              hostGeometry, hostMaterial, 
              x * latticeSpacing, y * latticeSpacing, z * latticeSpacing,
              hostMetal, [x, y, z], newLatticeAtoms
            );
            
            // Body center
            if ((x+y+z) % 2 === 0) {
              addAtomToLattice(
                hostGeometry, hostMaterial, 
                (x+0.5) * latticeSpacing, (y+0.5) * latticeSpacing, (z+0.5) * latticeSpacing,
                hostMetal, [x+0.5, y+0.5, z+0.5], newLatticeAtoms
              );
            }
            
            // Add fuel atoms in tetrahedral sites
            const loading = data.lattice?.loading || 0.4; // typical for BCC
            if (Math.random() < loading) {
              const site = [
                x+0.25, y+0.25, z+0.25
              ];
              
              addAtomToLattice(
                fuelGeometry, fuelMaterial,
                site[0] * latticeSpacing, site[1] * latticeSpacing, site[2] * latticeSpacing,
                fuel, site, newLatticeAtoms
              );
            }
          }
        }
      }
    }
    // Add more lattice structures as needed
    
    setLatticeAtoms(newLatticeAtoms);
    setIsLoading(false);
  }, []);
  
  // Helper function to add atoms to the lattice
  const addAtomToLattice = useCallback((geometry, material, x, y, z, element, position, atomsList) => {
    const atom = new THREE.Mesh(geometry, material);
    atom.position.set(x, y, z);
    atom.userData = { 
      element, 
      position,
      properties: ELEMENT_PROPERTIES[element]
    };
    
    if (sceneRef.current) {
      sceneRef.current.add(atom);
      atomsList.push(atom);
    }
  }, []);

  // Handle visualization type change
  const handleVisualizationTypeChange = (event) => {
    setVisualizationType(event.target.value);
    
    // Update visualization based on type
    if (event.target.value === 'energy') {
      // Update to energy visualization
      latticeAtoms.forEach(atom => {
        if (atom.userData.element === 'D') {
          // Only change D atoms
          const normalizedEnergy = Math.random(); // Replace with actual calculation
          const energyColor = getElementColorByEnergy(atom.userData.element, normalizedEnergy);
          
          atom.material.emissive.set(energyColor);
          atom.material.emissiveIntensity = normalizedEnergy * 0.5;
        }
      });
    } else if (event.target.value === 'phonon') {
      // Reset for phonon visualization
      latticeAtoms.forEach(atom => {
        if (atom.userData.element === 'D') {
          atom.material.emissive.set(0x0044cc);
          atom.material.emissiveIntensity = 0.2;
        }
      });
    } else {
      // Reset for standard lattice visualization
      latticeAtoms.forEach(atom => {
        if (atom.userData.element === 'D') {
          atom.material.emissive.set(0x0044cc);
          atom.material.emissiveIntensity = 0.2;
        }
      });
    }
  };

  // Rest of the component (initialize, animate, etc.)
  // ...

  // Simulation control handlers
  const handleStart = () => {
    onSimulationStart && onSimulationStart();
  };
  
  const handlePause = () => {
    onSimulationPause && onSimulationPause();
  };
  
  const handleStop = () => {
    onSimulationStop && onSimulationStop();
  };
  
  const handleReset = () => {
    onSimulationReset && onSimulationReset();
  };
  
  const toggleLegend = () => {
    setShowLegend(!showLegend);
  };
  
  const togglePhysicsInfo = () => {
    setShowPhysicsInfo(!showPhysicsInfo);
  };
  
  const handleViewModeChange = (event, newValue) => {
    setViewMode(newValue);
  };
  
  return (
    <Box sx={{ height: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={viewMode} 
          onChange={handleViewModeChange} 
          aria-label="visualization modes"
          variant="fullWidth"
        >
          <Tab label="3D Lattice" />
          <Tab label="Tunneling" />
          <Tab label="Physics Info" />
        </Tabs>
      </Box>
      
      <EnhancedTabPanel hidden={viewMode !== 0}>
        <VisualizationContainer ref={containerRef}>
          {isLoading && (
            <LoadingOverlay>
              <CircularProgress />
              <Typography variant="body2" sx={{ mt: 2 }}>
                Loading lattice visualization...
              </Typography>
            </LoadingOverlay>
          )}
          
          <ControlsOverlay>
            <FormControl size="small" variant="outlined" sx={{ minWidth: 120, backgroundColor: 'rgba(255, 255, 255, 0.8)' }}>
              <InputLabel id="visualization-type-label">View Mode</InputLabel>
              <Select
                labelId="visualization-type-label"
                id="visualization-type"
                value={visualizationType}
                onChange={handleVisualizationTypeChange}
                label="View Mode"
                size="small"
              >
                <MenuItem value="lattice">Lattice Structure</MenuItem>
                <MenuItem value="energy">Energy Distribution</MenuItem>
                <MenuItem value="phonon">Phonon Propagation</MenuItem>
              </Select>
            </FormControl>
            
            <Tooltip title={showLegend ? "Hide Legend" : "Show Legend"}>
              <IconButton
                onClick={toggleLegend}
                size="small"
                sx={{ backgroundColor: 'rgba(255, 255, 255, 0.8)' }}
              >
                <InfoIcon />
              </IconButton>
            </Tooltip>
          </ControlsOverlay>
          
          <SimControlsOverlay>
            <Tooltip title="Start Simulation">
              <span>
                <IconButton
                  color="primary"
                  onClick={handleStart}
                  disabled={simulationStatus === 'running' || simulationStatus === 'completed'}
                >
                  <PlayArrowIcon />
                </IconButton>
              </span>
            </Tooltip>
            
            <Tooltip title="Pause Simulation">
              <span>
                <IconButton
                  color="primary"
                  onClick={handlePause}
                  disabled={simulationStatus !== 'running'}
                >
                  <PauseIcon />
                </IconButton>
              </span>
            </Tooltip>
            
            <Tooltip title="Stop Simulation">
              <span>
                <IconButton
                  color="primary"
                  onClick={handleStop}
                  disabled={simulationStatus !== 'running' && simulationStatus !== 'paused'}
                >
                  <StopIcon />
                </IconButton>
              </span>
            </Tooltip>
            
            <Tooltip title="Reset Simulation">
              <span>
                <IconButton
                  color="primary"
                  onClick={handleReset}
                  disabled={simulationStatus === 'ready'}
                >
                  <RestartAltIcon />
                </IconButton>
              </span>
            </Tooltip>
          </SimControlsOverlay>
          
          {showLegend && (
            <LegendOverlay>
              <CardContent sx={{ p: 1.5 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Legend
                  </Typography>
                  <IconButton size="small" onClick={toggleLegend}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
                
                <Divider sx={{ mb: 1 }} />
                
                <Stack spacing={0.5}>
                  <LegendItem>
                    <ColorSwatch color="#909090" />
                    <Typography variant="body2">Palladium (Host Metal)</Typography>
                  </LegendItem>
                  <LegendItem>
                    <ColorSwatch color="#0088FF" />
                    <Typography variant="body2">Deuterium (Fuel)</Typography>
                  </LegendItem>
                  
                  {visualizationType === 'energy' && (
                    <>
                      <Divider sx={{ my: 0.5 }} />
                      <Typography variant="caption">Energy Distribution</Typography>
                      <Box display="flex" mt={0.5}>
                        <Box 
                          sx={{ 
                            width: '100%', 
                            height: '20px', 
                            background: 'linear-gradient(to right, #0000FF, #FFFFFF, #FF0000)',
                            borderRadius: '4px',
                            my: 0.5
                          }} 
                        />
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="caption">Low</Typography>
                        <Typography variant="caption">High</Typography>
                      </Box>
                    </>
                  )}
                  
                  {visualizationType === 'phonon' && (
                    <>
                      <Divider sx={{ my: 0.5 }} />
                      <Typography variant="caption">Phonon Propagation</Typography>
                      <LegendItem>
                        <ColorSwatch color="#FF00FF" />
                        <Typography variant="body2">Wave Direction</Typography>
                      </LegendItem>
                    </>
                  )}
                  
                  <Divider sx={{ my: 0.5 }} />
                  <Chip 
                    size="small" 
                    label={`Status: ${simulationStatus.charAt(0).toUpperCase() + simulationStatus.slice(1)}`}
                    color={
                      simulationStatus === 'running' ? 'success' :
                      simulationStatus === 'paused' ? 'warning' :
                      simulationStatus === 'error' ? 'error' :
                      'default'
                    }
                  />
                </Stack>
              </CardContent>
            </LegendOverlay>
          )}
        </VisualizationContainer>
      </EnhancedTabPanel>
      
      <EnhancedTabPanel hidden={viewMode !== 1}>
        <TunnelingVisualization simulationParameters={simulationParameters} />
      </EnhancedTabPanel>
      
      <EnhancedTabPanel hidden={viewMode !== 2}>
        <PhysicsInfoPanel 
          simulationData={simulationData} 
          simulationParameters={simulationParameters}
        />
      </EnhancedTabPanel>
    </Box>
  );
};

export default LatticeVisualization; 