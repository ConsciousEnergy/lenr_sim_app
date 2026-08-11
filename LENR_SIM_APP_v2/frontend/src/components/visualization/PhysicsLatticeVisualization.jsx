/**
 * PhysicsLatticeVisualization Component
 * 
 * An enhanced lattice visualization component that visualizes physical properties
 * from physics simulations. It extends the basic lattice visualization with
 * temperature, energy levels, reaction rates, and particle movement representation.
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Box, CircularProgress, Typography, Paper, IconButton, 
  FormControl, InputLabel, Select, MenuItem, Tooltip,
  Switch, FormControlLabel } from '@mui/material';
import styled from '@emotion/styled';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import InfoIcon from '@mui/icons-material/Info';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { useLogger } from '../../hooks/useLogger';
import { useAppSettings } from '../../contexts/SettingsContext';
import { usePhysicsDataStream } from '../../services/physics/hooks';

// Styled Components
const VisualizationContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  height: '100%',
  minHeight: '400px',
  backgroundColor: theme.palette.background.default,
  borderRadius: theme.shape.borderRadius,
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

const _ViewControlsOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: theme.spacing(2),
  right: theme.spacing(2),
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
  maxWidth: '200px',
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

const LegendGradient = styled(Box)(({ gradient }) => ({
  width: '100%',
  height: '20px',
  marginTop: '4px',
  marginBottom: '8px',
  borderRadius: '2px',
  background: gradient,
}));

const LoadingOverlay = styled(Box)(({ _theme }) => ({
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

const ThreeContainer = styled('div')(({ theme }) => ({
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  borderRadius: theme.shape.borderRadius,
}));

// Heat map color scales
const createColorScale = (colors, _steps = 100) => {
  const colorStops = colors.map((color, index) => {
    const position = index / (colors.length - 1);
    return { position, color };
  });
  
  return (value) => {
    // Ensure value is between 0 and 1
    value = Math.max(0, Math.min(1, value));
    
    // Find the two colors to interpolate between
    let lowerIndex = 0;
    for (let i = 1; i < colorStops.length; i++) {
      if (value <= colorStops[i].position) {
        lowerIndex = i - 1;
        break;
      }
      if (i === colorStops.length - 1) {
        lowerIndex = i - 1;
      }
    }
    
    const lowerColor = new THREE.Color(colorStops[lowerIndex].color);
    const upperColor = new THREE.Color(colorStops[lowerIndex + 1].color);
    const lowerPosition = colorStops[lowerIndex].position;
    const upperPosition = colorStops[lowerIndex + 1].position;
    
    // Normalize value to the range between the two stops
    const normalizedValue = (value - lowerPosition) / (upperPosition - lowerPosition);
    
    // Interpolate between the two colors
    const resultColor = new THREE.Color();
    resultColor.r = lowerColor.r + (upperColor.r - lowerColor.r) * normalizedValue;
    resultColor.g = lowerColor.g + (upperColor.g - lowerColor.g) * normalizedValue;
    resultColor.b = lowerColor.b + (upperColor.b - lowerColor.b) * normalizedValue;
    
    return resultColor;
  };
};

const PhysicsLatticeVisualization = ({ 
  simulationId, 
  visualizationSettings = {},
  onStartSimulation: _onStartSimulation,
  onStopSimulation: _onStopSimulation 
}) => {
  const logger = useLogger();
  const { settings } = useAppSettings();
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const frameIdRef = useRef(null);
  const threeContainerRef = useRef(null);
  const latticeRef = useRef(null);
  
  // Physics data state
  const { 
    _isConnected, 
    connectionStatus,
    latticeState,
    simulationSummary
  } = usePhysicsDataStream(simulationId);
  
  // Enhanced visualization settings
  const mergedVisualizationSettings = useMemo(() => ({
    ...settings?.visualization,
    ...visualizationSettings,
    atomScale: visualizationSettings?.atomScale || settings?.visualization?.atomScale || 1.0,
    showOctahedralSites: visualizationSettings?.showOctahedralSites || settings?.visualization?.showOctahedralSites || false,
    loadingRatio: visualizationSettings?.loadingRatio || settings?.visualization?.loadingRatio || 0,
    loadedElement: visualizationSettings?.loadedElement || settings?.visualization?.loadedElement || 'deuterium'
  }), [settings?.visualization, visualizationSettings]);
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [visualizationType, setVisualizationType] = useState('lattice');
  const [colorProperty, setColorProperty] = useState('temperature');
  const [showConnections, setShowConnections] = useState(true);
  const [minMaxValues, setMinMaxValues] = useState({
    temperature: { min: 0, max: 1000 },
    energy: { min: 0, max: 10 },
    reaction_rate: { min: 0, max: 0.5 }
  });
  
  // Memoize color scales
  const colorScales = useMemo(() => ({
    temperature: createColorScale(['#0000FF', '#00FFFF', '#FFFF00', '#FF0000']),
    energy: createColorScale(['#FFFFFF', '#FFFF00', '#FF8800', '#FF0000']),
    reaction_rate: createColorScale(['#00FF00', '#FFFF00', '#FF0000'])
  }), []);
  
  // Convert hex colors to CSS string format
  const hexToCSS = (hex) => {
    const color = new THREE.Color(hex);
    return `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`;
  };
  
  // Initialize Three.js scene, camera, renderer
  const initThreeJS = useCallback(() => {
    try {
      if (!containerRef.current) return;
      
      logger.debug('Initializing Three.js');
      
      // Create scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf0f0f0);
      sceneRef.current = scene;
      
      // Create camera
      const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
      camera.position.set(20, 20, 20);
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;
      
      // Create renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      threeContainerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;
      
      // Add orbit controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controlsRef.current = controls;
      
      // Add ambient light
      const ambientLight = new THREE.AmbientLight(0x404040);
      scene.add(ambientLight);
      
      // Add directional lights
      const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight1.position.set(1, 1, 1);
      scene.add(directionalLight1);
      
      const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
      directionalLight2.position.set(-1, -1, -1);
      scene.add(directionalLight2);
      
      // Add coordinate axes for reference during development
      if (process.env.NODE_ENV === 'development') {
        const axesHelper = new THREE.AxesHelper(10);
        scene.add(axesHelper);
      }
      
      logger.debug('Three.js initialization complete');
      
      return { scene, camera, renderer, controls };
    } catch (error) {
      logger.error('Error initializing Three.js', error);
      return null;
    }
  }, [logger]);
  
  // Animation loop
  const animate = useCallback(() => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current || !controlsRef.current) {
      return;
    }
    
    controlsRef.current.update();
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    frameIdRef.current = requestAnimationFrame(animate);
  }, []);
  
  // Normalize value to colormap range
  const normalizeValue = (value, property) => {
    const { min, max } = minMaxValues[property];
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  };
  
  // Create and update lattice visualization from physics data
  const updateLatticeFromPhysicsData = useCallback(() => {
    if (!sceneRef.current || !latticeState) return;
    
    try {
      setIsLoading(true);
      logger.debug('Updating lattice visualization with physics data');
      
      // Clean up existing lattice
      if (latticeRef.current) {
        if (latticeRef.current.group) {
          sceneRef.current.remove(latticeRef.current.group);
        }
        
        if (typeof latticeRef.current.dispose === 'function') {
          latticeRef.current.dispose();
        }
        
        latticeRef.current = null;
      }
      
      // Create group to hold all lattice elements
      const latticeGroup = new THREE.Group();
      sceneRef.current.add(latticeGroup);
      
      // Create reusable geometries
      const atomGeometry = new THREE.SphereGeometry(
        0.5 * mergedVisualizationSettings.atomScale,
        32,
        32
      );
      
      // Create connections if enabled
      if (showConnections && latticeState.connections && latticeState.connections.length > 0) {
        const lineMaterial = new THREE.LineBasicMaterial({ 
          color: 0x666666, 
          opacity: 0.5, 
          transparent: true 
        });
        
        latticeState.connections.forEach(([indexA, indexB]) => {
          if (indexA < latticeState.points.length && indexB < latticeState.points.length) {
            const pointA = latticeState.points[indexA];
            const pointB = latticeState.points[indexB];
            
            const geometry = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(...pointA.position),
              new THREE.Vector3(...pointB.position)
            ]);
            
            const line = new THREE.Line(geometry, lineMaterial);
            latticeGroup.add(line);
          }
        });
      }
      
      // Create atoms with color mapping based on selected property
      latticeState.points.forEach(point => {
        // Choose material based on visualization type
        let material;
        
        if (visualizationType === 'lattice') {
          // Use element-based coloring
          const elementColors = {
            'Pd': 0xB9B9B9, // silver-gray for palladium
            'Ni': 0xA6A6A6, // darker silver for nickel
            'D': 0x2969B0,  // blue for deuterium
            'H': 0x33A1C9   // lighter blue for hydrogen
          };
          
          const color = elementColors[point.element] || 0xFFFFFF;
          material = new THREE.MeshPhongMaterial({ color });
        } 
        else {
          // Use property-based coloring
          const value = point[colorProperty];
          const normalizedValue = normalizeValue(value, colorProperty);
          const color = colorScales[colorProperty](normalizedValue);
          
          material = new THREE.MeshPhongMaterial({ color });
        }
        
        // Create the atom mesh
        const atom = new THREE.Mesh(atomGeometry, material);
        atom.position.set(...point.position);
        
        // Store original data in userData for interaction
        atom.userData = {
          element: point.element,
          temperature: point.temperature,
          energy: point.energy,
          reaction_rate: point.reaction_rate,
          position: [...point.position]
        };
        
        latticeGroup.add(atom);
      });
      
      // Store reference to the lattice
      latticeRef.current = {
        group: latticeGroup,
        dispose: () => {
          sceneRef.current.remove(latticeGroup);
          // Could add more cleanup here if needed
        }
      };
      
      // Calculate new min/max values from the data
      if (latticeState.points.length > 0) {
        const newMinMax = {
          temperature: { 
            min: Number.POSITIVE_INFINITY, 
            max: Number.NEGATIVE_INFINITY 
          },
          energy: { 
            min: Number.POSITIVE_INFINITY, 
            max: Number.NEGATIVE_INFINITY 
          },
          reaction_rate: { 
            min: Number.POSITIVE_INFINITY, 
            max: Number.NEGATIVE_INFINITY 
          }
        };
        
        latticeState.points.forEach(point => {
          // Update temperature min/max
          newMinMax.temperature.min = Math.min(newMinMax.temperature.min, point.temperature);
          newMinMax.temperature.max = Math.max(newMinMax.temperature.max, point.temperature);
          
          // Update energy min/max
          newMinMax.energy.min = Math.min(newMinMax.energy.min, point.energy);
          newMinMax.energy.max = Math.max(newMinMax.energy.max, point.energy);
          
          // Update reaction_rate min/max
          newMinMax.reaction_rate.min = Math.min(newMinMax.reaction_rate.min, point.reaction_rate);
          newMinMax.reaction_rate.max = Math.max(newMinMax.reaction_rate.max, point.reaction_rate);
        });
        
        // Apply some padding to the ranges and update state
        setMinMaxValues({
          temperature: {
            min: Math.floor(newMinMax.temperature.min * 0.9),
            max: Math.ceil(newMinMax.temperature.max * 1.1)
          },
          energy: {
            min: Math.floor(newMinMax.energy.min * 0.9),
            max: Math.ceil(newMinMax.energy.max * 1.1)
          },
          reaction_rate: {
            min: 0, // Always start from 0 for reaction rates
            max: Math.ceil(newMinMax.reaction_rate.max * 1.1)
          }
        });
      }
      
      setIsLoading(false);
      logger.debug('Lattice visualization updated successfully');
      
    } catch (error) {
      logger.error('Error updating lattice visualization', error);
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latticeState, visualizationType, colorProperty, mergedVisualizationSettings, showConnections, logger, minMaxValues]);
  
  // Handle visualization type change
  const handleVisualizationTypeChange = (event) => {
    setVisualizationType(event.target.value);
  };
  
  // Handle color property change
  const handleColorPropertyChange = (event, newProperty) => {
    if (newProperty !== null) {
      setColorProperty(newProperty);
    }
  };
  
  // Reset camera position
  const resetCameraPosition = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(20, 20, 20);
      cameraRef.current.lookAt(0, 0, 0);
      controlsRef.current.update();
    }
  };
  
  // Take screenshot
  const takeScreenshot = () => {
    if (!rendererRef.current) return;
    
    try {
      const dataURL = rendererRef.current.domElement.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = `lenr-sim-${new Date().toISOString().slice(0, 19).replace(/[^0-9]/g, '')}.png`;
      link.click();
    } catch (error) {
      logger.error('Error taking screenshot', error);
    }
  };
  
  // Handle window resize
  const handleResize = useCallback(() => {
    if (!rendererRef.current || !cameraRef.current || !containerRef.current) {
      return;
    }
    
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height);
  }, []);
  
  // Initialize Three.js
  useEffect(() => {
    initThreeJS();
    
    // Start animation loop
    frameIdRef.current = requestAnimationFrame(animate);
    
    // Add resize event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup function
    return () => {
      cancelAnimationFrame(frameIdRef.current);
      window.removeEventListener('resize', handleResize);
      
      // Dispose of Three.js resources
      if (rendererRef.current) {
        if (rendererRef.current.domElement && rendererRef.current.domElement.parentNode) {
          rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current.dispose();
      }
      
      if (latticeRef.current && typeof latticeRef.current.dispose === 'function') {
        latticeRef.current.dispose();
      }
    };
  }, [animate, handleResize, initThreeJS]);
  
  // Update lattice when physics data changes
  useEffect(() => {
    if (latticeState) {
      updateLatticeFromPhysicsData();
    }
  }, [latticeState, updateLatticeFromPhysicsData]);
  
  // Create legend color gradient for current property
  const legendGradient = useMemo(() => {
    if (visualizationType === 'lattice') {
      return null;
    }
    
    // Create gradient with 5 stops
    const steps = 5;
    let gradientStyle = 'linear-gradient(to right, ';
    
    for (let i = 0; i < steps; i++) {
      const normalizedValue = i / (steps - 1);
      const color = colorScales[colorProperty](normalizedValue);
      const colorCSS = hexToCSS(color.getHex());
      
      gradientStyle += `${colorCSS} ${normalizedValue * 100}%`;
      
      if (i < steps - 1) {
        gradientStyle += ', ';
      }
    }
    
    gradientStyle += ')';
    return gradientStyle;
  }, [visualizationType, colorProperty, colorScales]);
  
  // Create element color legend
  const elementLegend = useMemo(() => {
    const elements = {
      'Pd': { color: '#B9B9B9', name: 'Palladium' },
      'Ni': { color: '#A6A6A6', name: 'Nickel' },
      'D': { color: '#2969B0', name: 'Deuterium' },
      'H': { color: '#33A1C9', name: 'Hydrogen' }
    };
    
    return Object.entries(elements).map(([symbol, { color, name }]) => (
      <LegendItem key={symbol}>
        <LegendColor color={color} />
        <Typography variant="caption">{symbol} - {name}</Typography>
      </LegendItem>
    ));
  }, []);
  
  return (
    <VisualizationContainer ref={containerRef}>
      {isLoading && (
        <LoadingOverlay>
          <CircularProgress />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Loading Visualization...
          </Typography>
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
              <MenuItem value="properties">Physical Properties</MenuItem>
            </Select>
          </FormControl>
        </Paper>
        
        {visualizationType === 'properties' && (
          <Paper sx={{ p: 1 }}>
            <Typography variant="caption" gutterBottom>
              Color By Property
            </Typography>
            <ToggleButtonGroup
              value={colorProperty}
              exclusive
              onChange={handleColorPropertyChange}
              size="small"
              fullWidth
            >
              <ToggleButton value="temperature" title="Temperature">
                Temp
              </ToggleButton>
              <ToggleButton value="energy" title="Energy">
                Energy
              </ToggleButton>
              <ToggleButton value="reaction_rate" title="Reaction Rate">
                Rate
              </ToggleButton>
            </ToggleButtonGroup>
          </Paper>
        )}
        
        <Paper sx={{ p: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showConnections}
                onChange={(e) => setShowConnections(e.target.checked)}
                size="small"
              />
            }
            label={<Typography variant="caption">Show Connections</Typography>}
          />
        </Paper>
        
        <Paper sx={{ p: 0.5 }}>
          <Tooltip title="Reset Camera">
            <IconButton size="small" onClick={resetCameraPosition}>
              <RestartAltIcon />
            </IconButton>
          </Tooltip>
        </Paper>
        
        <Paper sx={{ p: 0.5 }}>
          <Tooltip title="Take Screenshot">
            <IconButton size="small" onClick={takeScreenshot}>
              <CameraAltIcon />
            </IconButton>
          </Tooltip>
        </Paper>
      </ControlsOverlay>
      
      {/* Legend overlay */}
      {!isLoading && (
        <LegendOverlay>
          <Typography variant="subtitle2" gutterBottom>
            {visualizationType === 'lattice' ? 'Elements' : 
              `${colorProperty.charAt(0).toUpperCase() + colorProperty.slice(1).replace('_', ' ')}`}
          </Typography>
          
          {visualizationType === 'lattice' ? (
            elementLegend
          ) : (
            <>
              <LegendGradient gradient={legendGradient} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption">
                  {minMaxValues[colorProperty].min.toFixed(1)}
                </Typography>
                <Typography variant="caption">
                  {minMaxValues[colorProperty].max.toFixed(1)}
                </Typography>
              </Box>
            </>
          )}
          
          {simulationSummary && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Simulation Summary
              </Typography>
              <Typography variant="caption" display="block">
                Avg Temperature: {simulationSummary.average_temperature.toFixed(1)} K
              </Typography>
              <Typography variant="caption" display="block">
                {/* Backend reports total_energy as cumulative joules, not eV. */}
                Total Energy: {simulationSummary.total_energy.toExponential(2)} J
              </Typography>
              {simulationSummary.reaction_rate !== undefined && (
                <Typography variant="caption" display="block">
                  Reaction Rate: {simulationSummary.reaction_rate.toFixed(4)} /s
                </Typography>
              )}
            </Box>
          )}
          
          {connectionStatus !== 'connected' && (
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', color: 'error.main' }}>
              <InfoIcon fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="caption" color="error">
                {connectionStatus === 'connecting' ? 'Connecting...' : 'Not connected'}
              </Typography>
            </Box>
          )}
        </LegendOverlay>
      )}
      
      <ThreeContainer ref={threeContainerRef} />
    </VisualizationContainer>
  );
};

export default PhysicsLatticeVisualization; 