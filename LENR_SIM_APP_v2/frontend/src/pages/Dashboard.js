import { useState, useRef, useEffect } from 'react';
import { 
  Container, 
  Paper, 
  Typography, 
  Box, 
  Tabs, 
  Tab, 
  Divider, 
  Card, 
  CardContent,
  CircularProgress,
  Link,
  ButtonGroup,
  Button,
  Slider,
  Tooltip,
  IconButton,
  Alert,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import Grid from '@mui/material/Grid';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RefreshIcon from '@mui/icons-material/Refresh';
import SpeedIcon from '@mui/icons-material/Speed';
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import GitHubIcon from '@mui/icons-material/GitHub';
import InfoIcon from '@mui/icons-material/Info';
import MemoryIcon from '@mui/icons-material/Memory';
import WarningIcon from '@mui/icons-material/Warning';
import LinearProgress from '@mui/material/LinearProgress';
import LENRSimulationPanel from '../components/LENRSimulationPanel';
import ResultsPanel from '../components/ResultsPanel';
import EnhancedFusionPanel from '../components/EnhancedFusionPanel';
import EnhancedFusionVisualization from '../components/visualization/EnhancedFusionVisualization';
import { styled } from '@mui/material/styles';
import threeCleanupUtils from '../utils/threeCleanup';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { useLogger } from '../contexts/LogContext';
import errorReporter from '../utils/errorReporter';
import SettingsPage from '../debug/SettingsPage';
import { Link as RouterLink } from 'react-router-dom';

// Styled components
const VisualizationContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  position: 'relative',
  height: '500px',
  overflow: 'hidden',
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

const ControlsOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: theme.spacing(2),
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 100,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(1),
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  padding: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
}));

const SpeedSlider = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  width: '100%',
  padding: theme.spacing(0, 1),
}));

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
};

// Add this function to transform data for the ResultsPanel
const prepareResultsData = (results) => {
  if (!results) return null;

  // Transform simulation results to match expected format for ResultsPanel
  return {
    ...results,
    // Generate energy levels data from principal quantum number if available
    energyLevels: Array.isArray(results.energyLevels) ? results.energyLevels : 
      results.config?.principalQuantumNumber ? 
        Array.from({ length: results.config.principalQuantumNumber }, 
          (_, i) => ({ energy: -13.6 / ((i+1) * (i+1)), n: i+1 })) : 
        [],
    // Add tunnelingProbability if not present
    tunnelingProbability: results.tunnelingProbability || 
      (results.tunnelingEnhancement ? results.tunnelingEnhancement / 100 : 0.001),
    // Add potentialEnergy if not present  
    potentialEnergy: results.potentialEnergy || 
      (results.originalBarrierHeight ? results.originalBarrierHeight : 0),
    // Ensure metadata exists
    metadata: results.metadata || results.config || {}
  };
};

// Add a new visualization legend component for the Dashboard
const VisualizationLegend = ({ simulationData, isSimulationRunning, simulationSpeed }) => {
  const [showInfo, setShowInfo] = useState(false);
  
  // Get simulation type
  const simulationType = simulationData?.type || 'default';
  
  return (
    <Paper sx={{ p: 2, mt: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">Visualization Legend</Typography>
        <Tooltip title="Visualization Info">
          <IconButton 
            size="small"
            onClick={() => setShowInfo(!showInfo)}
            color="info"
            aria-label="visualization info"
          >
            <InfoIcon />
          </IconButton>
        </Tooltip>
      </Box>
      
      {showInfo && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>How This Works:</strong> This visualization shows a 3D model of Rydberg matter in a palladium lattice.
            The simulation models quantum effects like electron orbital expansion and tunneling enhancement factors.
            Mouse interactions: drag to rotate, scroll to zoom, right-click to pan.
          </Typography>
        </Alert>
      )}
      
      <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
        {simulationType === 'rydberg' 
          ? 'Rydberg Matter visualization showing expanded atomic orbitals and quantum tunneling effects in the LENR system.'
          : 'Basic palladium-deuterium lattice representation.'}
      </Typography>
      
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Lattice Elements:</Typography>
          <List dense>
            <ListItem>
              <Box sx={{ 
                width: 16, 
                height: 16, 
                bgcolor: '#B9B9B9', // palladium
                mr: 1,
                border: '1px solid rgba(0,0,0,0.2)',
                borderRadius: '50%'
              }} />
              <ListItemText 
                primary="Palladium (Host)" 
                secondary="Core atoms forming the metal lattice structure" 
              />
            </ListItem>
            <ListItem>
              <Box sx={{ 
                width: 16, 
                height: 16, 
                bgcolor: '#33A1C9', // hydrogen/deuterium
                mr: 1,
                borderRadius: '50%',
                border: '1px solid rgba(0,0,0,0.2)',
              }} />
              <ListItemText 
                primary="Deuterium/Hydrogen" 
                secondary="Loaded into lattice interstitial sites" 
              />
            </ListItem>
            {simulationType === 'rydberg' && (
              <ListItem>
                <Box sx={{ 
                  width: 16, 
                  height: 16, 
                  bgcolor: '#33A1C9', 
                  mr: 1,
                  opacity: 0.6,
                  border: '1px solid rgba(0,0,0,0.2)',
                  borderRadius: '50%'
                }} />
                <ListItemText 
                  primary="Electron Orbitals" 
                  secondary="Expanded Rydberg orbitals showing quantum state" 
                />
              </ListItem>
            )}
          </List>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Quantum Effects:</Typography>
          <List dense>
            {simulationType === 'rydberg' && (
              <>
                <ListItem>
                  <Box sx={{ 
                    width: 16, 
                    height: 16, 
                    bgcolor: '#FFA500', // transition/bridge color 
                    mr: 1,
                    opacity: 0.7,
                    border: '1px solid rgba(0,0,0,0.2)',
                  }} />
                  <ListItemText 
                    primary="Tunneling Bridges" 
                    secondary="Quantum tunneling pathways between nuclei" 
                  />
                </ListItem>
                <ListItem>
                  <Box sx={{ 
                    width: 16, 
                    height: 16, 
                    background: 'radial-gradient(circle, #FF6347 0%, rgba(255,99,71,0) 100%)', 
                    mr: 1,
                  }} />
                  <ListItemText 
                    primary="Energy Emission" 
                    secondary="Heat/energy release from nuclear reactions" 
                  />
                </ListItem>
              </>
            )}
            <ListItem>
              <ListItemText 
                primary="Atomic Motion" 
                secondary={`Vibrations at ${simulationSpeed.toFixed(1)}x speed (${isSimulationRunning ? 'Running' : 'Paused'})`} 
              />
            </ListItem>
          </List>
        </Grid>
      </Grid>
      
      {simulationType === 'rydberg' && simulationData?.results && (
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            Current Simulation Parameters:
          </Typography>
          <Grid container spacing={1}>
            <Grid size={6}>
              <Typography variant="body2" component="div">
                <Box component="span" sx={{ fontWeight: 'medium' }}>Rydberg Radius:</Box>{' '}
                {simulationData.results.rydbergRadius?.toFixed(2) || 'N/A'} Å
              </Typography>
            </Grid>
            <Grid size={6}>
              <Typography variant="body2" component="div">
                <Box component="span" sx={{ fontWeight: 'medium' }}>Overlap Probability:</Box>{' '}
                {(simulationData.results.overlapProbability * 100)?.toFixed(2) || 'N/A'}%
              </Typography>
            </Grid>
            <Grid size={6}>
              <Typography variant="body2" component="div">
                <Box component="span" sx={{ fontWeight: 'medium' }}>Tunneling Enhancement:</Box>{' '}
                {simulationData.results.tunnelingEnhancement?.toFixed(2) || 'N/A'}x
              </Typography>
            </Grid>
            <Grid size={6}>
              <Typography variant="body2" component="div">
                <Box component="span" sx={{ fontWeight: 'medium' }}>Principal Quantum Number:</Box>{' '}
                {simulationData.results.config?.principalQuantumNumber || 'N/A'}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      )}
    </Paper>
  );
};

// Add MemoryStatus component
const MemoryStatus = () => {
  const [memoryInfo, setMemoryInfo] = useState(null);
  const [memoryWarnings, setMemoryWarnings] = useState([]);
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
    // Initial memory check
    checkMemory();
    
    // Set up interval for checking memory
    const interval = setInterval(checkMemory, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  const checkMemory = () => {
    if (window.performance && performance.memory) {
      const memory = performance.memory;
      const usedRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      const timestamp = new Date().toLocaleTimeString();
      
      setMemoryInfo({
        total: formatBytes(memory.jsHeapSizeLimit),
        used: formatBytes(memory.usedJSHeapSize),
        ratio: usedRatio,
        timestamp
      });
      
      // Add warning if memory is running high
      if (usedRatio > 0.7) {
        setMemoryWarnings(prev => {
          const newWarnings = [
            { 
              level: usedRatio > 0.85 ? 'high' : 'medium',
              message: `Memory usage at ${Math.round(usedRatio * 100)}%`,
              timestamp
            },
            ...prev
          ].slice(0, 5); // Keep only the 5 most recent warnings
          
          return newWarnings;
        });
      }
    }
  };
  
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // If memory API not available, don't show anything
  if (!memoryInfo) return null;
  
  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <MemoryIcon color="primary" fontSize="small" />
        <Typography variant="subtitle2">Memory Status</Typography>
      </Box>
      
      <Box sx={{ mb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption">Used: {memoryInfo.used}</Typography>
          <Typography 
            variant="caption" 
            sx={{
              color: memoryInfo.ratio > 0.8 ? 'error.main' : 
                     memoryInfo.ratio > 0.6 ? 'warning.main' : 'success.main'
            }}
          >
            {Math.round(memoryInfo.ratio * 100)}%
          </Typography>
        </Box>
        
        <LinearProgress 
          variant="determinate" 
          value={memoryInfo.ratio * 100} 
          color={
            memoryInfo.ratio > 0.8 ? 'error' : 
            memoryInfo.ratio > 0.6 ? 'warning' : 'success'
          }
          sx={{ height: 6, borderRadius: 1 }}
        />
        
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
          Total Available: {memoryInfo.total}
        </Typography>
      </Box>
      
      {memoryWarnings.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <WarningIcon fontSize="inherit" color="warning" />
            Recent Memory Warnings:
          </Typography>
          
          <List dense disablePadding sx={{ mt: 0.5 }}>
            {memoryWarnings.map((warning, i) => (
              <ListItem key={i} sx={{ py: 0.5 }}>
                <ListItemText
                  primary={warning.message}
                  secondary={warning.timestamp}
                  primaryTypographyProps={{
                    variant: 'caption',
                    color: warning.level === 'high' ? 'error.main' : 'warning.main',
                    fontWeight: 'medium'
                  }}
                  secondaryTypographyProps={{
                    variant: 'caption',
                    fontSize: '0.65rem'
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
};

// Update VisualizationOverlay to show quality
const VisualizationOverlay = ({ fps, simulationData, simulationSpeed, isSimulationRunning, renderQuality }) => {
  if (!simulationData) return null;
  
  return (
    <Box sx={{
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      color: 'white',
      padding: '6px 10px',
      borderRadius: 1,
      fontSize: '0.75rem',
      fontFamily: 'monospace',
      pointerEvents: 'none', // Make sure it doesn't interfere with interaction
      maxWidth: '180px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" sx={{ color: 'white' }}>Status:</Typography>
        <Typography 
          variant="caption" 
          sx={{ color: isSimulationRunning ? '#4caf50' : '#ff9800', fontWeight: 'bold' }}
        >
          {isSimulationRunning ? 'RUNNING' : 'PAUSED'}
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
        <Typography variant="caption" sx={{ color: 'white' }}>FPS:</Typography>
        <Typography 
          variant="caption" 
          sx={{ 
            color: fps > 40 ? '#4caf50' : fps > 20 ? '#ff9800' : '#f44336',
            fontWeight: 'bold'
          }}
        >
          {fps || 0}
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
        <Typography variant="caption" sx={{ color: 'white' }}>Quality:</Typography>
        <Typography 
          variant="caption" 
          sx={{ 
            color: renderQuality === 'high' ? '#4caf50' : 
                  renderQuality === 'medium' ? '#ff9800' : '#f44336',
            fontWeight: 'bold'
          }}
        >
          {renderQuality.toUpperCase()}
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
        <Typography variant="caption" sx={{ color: 'white' }}>Speed:</Typography>
        <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold' }}>
          {simulationSpeed.toFixed(1)}x
        </Typography>
      </Box>
      
      {simulationData.type === 'rydberg' && simulationData.results && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'white' }}>Rydberg:</Typography>
            <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold' }}>
              {simulationData.results.rydbergRadius?.toFixed(2) || 'N/A'} Å
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'white' }}>Tunneling:</Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: simulationData.results.tunnelingEnhancement > 50 ? '#4caf50' : 
                      simulationData.results.tunnelingEnhancement > 10 ? '#ff9800' : '#f44336',
                fontWeight: 'bold'
              }}
            >
              {simulationData.results.tunnelingEnhancement?.toFixed(1) || 'N/A'}x
            </Typography>
          </Box>
        </>
      )}
      
      <Box sx={{ 
        width: '100%', 
        height: 3, 
        mt: 0.5, 
        bgcolor: isSimulationRunning ? '#4caf50' : '#ff9800',
        borderRadius: 1
      }} />
    </Box>
  );
};

// Add a ResourceManager class at the top of the file after imports
// This will handle pooling and reuse of geometries and materials
class ResourceManager {
  constructor() {
    this.geometries = {};
    this.materials = {};
    this.disposed = false;
  }

  // Get or create a geometry with given parameters
  getGeometry(type, params) {
    const key = `${type}_${JSON.stringify(params)}`;
    if (!this.geometries[key]) {
      let geometry;
      
      switch (type) {
        case 'sphere':
          geometry = new THREE.SphereGeometry(
            params.radius, 
            params.widthSegments || 16, 
            params.heightSegments || 16
          );
          break;
        case 'cylinder':
          geometry = new THREE.CylinderGeometry(
            params.radiusTop,
            params.radiusBottom,
            params.height,
            params.radialSegments || 8,
            params.heightSegments || 1
          );
          break;
        default:
          throw new Error(`Unsupported geometry type: ${type}`);
      }
      
      this.geometries[key] = {
        geometry,
        refCount: 0
      };
    }
    
    this.geometries[key].refCount++;
    return this.geometries[key].geometry;
  }

  // Get or create a material with given parameters
  getMaterial(type, params) {
    const key = `${type}_${JSON.stringify(params)}`;
    if (!this.materials[key]) {
      let material;
      
      switch (type) {
        case 'phong':
          material = new THREE.MeshPhongMaterial(params);
          break;
        case 'basic':
          material = new THREE.MeshBasicMaterial(params);
          break;
        default:
          throw new Error(`Unsupported material type: ${type}`);
      }
      
      this.materials[key] = {
        material,
        refCount: 0
      };
    }
    
    this.materials[key].refCount++;
    return this.materials[key].material;
  }

  // Release a geometry
  releaseGeometry(geometry) {
    for (const key in this.geometries) {
      if (this.geometries[key].geometry === geometry) {
        this.geometries[key].refCount--;
        
        // If refCount reaches 0 and we're in disposal mode, dispose the resource
        if (this.disposed && this.geometries[key].refCount <= 0) {
          this.geometries[key].geometry.dispose();
          delete this.geometries[key];
        }
        return;
      }
    }
  }

  // Release a material
  releaseMaterial(material) {
    for (const key in this.materials) {
      if (this.materials[key].material === material) {
        this.materials[key].refCount--;
        
        // If refCount reaches 0 and we're in disposal mode, dispose the resource
        if (this.disposed && this.materials[key].refCount <= 0) {
          this.materials[key].material.dispose();
          delete this.materials[key];
        }
        return;
      }
    }
  }

  // Cleanup resources with zero refCount
  cleanup() {
    for (const key in this.geometries) {
      if (this.geometries[key].refCount <= 0) {
        this.geometries[key].geometry.dispose();
        delete this.geometries[key];
      }
    }
    
    for (const key in this.materials) {
      if (this.materials[key].refCount <= 0) {
        this.materials[key].material.dispose();
        delete this.materials[key];
      }
    }
  }
  
  // Prepare for complete disposal
  dispose() {
    this.disposed = true;
    
    // Dispose resources with zero refCount
    this.cleanup();
    
    // Log any remaining resources that might indicate memory leaks
    const remainingGeometries = Object.keys(this.geometries).length;
    const remainingMaterials = Object.keys(this.materials).length;
    
    if (remainingGeometries > 0 || remainingMaterials > 0) {
      console.warn(
        `ResourceManager disposed with remaining resources: ` +
        `${remainingGeometries} geometries, ${remainingMaterials} materials`
      );
    }
  }
}

// Add a feature card component for the new Unified LENR Theory Visualizer
const FeatureCard = ({ title, description, icon, linkTo, buttonText }) => {
  return (
    <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon}
          <Typography variant="h6" sx={{ ml: 1 }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" paragraph>
          {description}
        </Typography>
      </CardContent>
      <Box sx={{ p: 2, pt: 0 }}>
        <Button 
          component={RouterLink}
          to={linkTo}
          variant="contained" 
          color="primary"
          fullWidth
        >
          {buttonText}
        </Button>
      </Box>
    </Card>
  );
};

function Dashboard() {
  const logger = useLogger();
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const frameIdRef = useRef(null);
  const threeContainerRef = useRef(null);
  const resourceManagerRef = useRef(null); // Add reference for resource manager
  
  // Add quality state to manage rendering quality based on memory pressure
  const [renderQuality, setRenderQuality] = useState('high'); // 'high', 'medium', 'low'
  
  // State for the simulation
  const [simulationData, setSimulationData] = useState(null);
  const [simulationResults, setSimulationResults] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [latticeAtoms, setLatticeAtoms] = useState([]);
  const latticeAtomsRef = useRef([]); // Ref to avoid stale closure in animation loop
  
  // New simulation control states
  const [isSimulationRunning, setIsSimulationRunning] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(1.0);
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const [currentFPS, setCurrentFPS] = useState(0);
  const lastTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  
  // Define element colors for visualization
  const elementColors = {
    palladium: 0xB9B9B9, // silver-gray
    nickel: 0xA6A6A6,    // darker silver
    deuterium: 0x2969B0, // blue
    hydrogen: 0x33A1C9,  // lighter blue
    energy: 0xFF6347,    // tomato red
    transition: 0xFFA500 // orange
  };

  // Add state for tracking errors
  const [visualizationError, setVisualizationError] = useState(null);
  const visualizationErrorRef = useRef(null); // Ref to avoid stale closure in setTimeout

  // Add state for enhanced fusion data
  const [enhancedFusionData, setEnhancedFusionData] = useState(null);
  const enhancedFusionDataRef = useRef(null);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Handle simulation updates from the simulation panel
  const handleSimulationUpdate = (results) => {
    logger.info('Simulation update received', { 
      rydbergRadius: results.rydbergRadius,
      overlapProbability: results.overlapProbability 
    });
    
    setSimulationData({
      type: 'rydberg',
      results: results
    });
    
    setSimulationResults(results);
  };
  
  // Animation state control
  const startSimulation = () => {
    if (!isSimulationRunning && frameIdRef.current === null) {
      let lastMemoryCheck = 0;
      
      const animate = () => {
        const animationFrame = requestAnimationFrame(animate);
        frameIdRef.current = animationFrame;
        
        const currentTime = performance.now();
        const deltaTime = (currentTime - lastTimeRef.current) / 1000; // in seconds
        
        // Calculate FPS every second
        frameCountRef.current++;
        const elapsed = currentTime - lastTimeRef.current;
        
        if (elapsed >= 1000) {
          setCurrentFPS(Math.round((frameCountRef.current * 1000) / elapsed));
          frameCountRef.current = 0;
          lastTimeRef.current = currentTime;
          
          // Check memory pressure every 5 seconds during animation
          if (currentTime - lastMemoryCheck > 5000) {
            checkMemoryPressure();
            lastMemoryCheck = currentTime;
          }
        }
        
        // Update lattice atom rotations based on simulation speed
        // Use ref to avoid stale closure - latticeAtoms may change during animation
        if (rotationEnabled && simulationSpeed > 0) {
          latticeAtomsRef.current.forEach(atom => {
            if (atom.userData.type === 'electron') {
              // Rotate electron clouds
              atom.rotation.y += 0.2 * simulationSpeed * deltaTime;
              atom.rotation.z += 0.1 * simulationSpeed * deltaTime;
            } else if (atom.userData.type === 'bridge') {
              // Pulse bridges
              const scale = 1.0 + 0.1 * Math.sin(currentTime * 0.002 * simulationSpeed);
              atom.scale.set(scale, 1, scale);
            } else if (atom.userData.type === 'core' || atom.userData.type === 'palladium') {
              // Slight vibration for core atoms
              atom.position.x += (Math.random() - 0.5) * 0.01 * simulationSpeed * deltaTime;
              atom.position.y += (Math.random() - 0.5) * 0.01 * simulationSpeed * deltaTime;
              atom.position.z += (Math.random() - 0.5) * 0.01 * simulationSpeed * deltaTime;
            } else if (atom.userData.type === 'deuterium') {
              // More movement for deuterium
              atom.position.x += (Math.random() - 0.5) * 0.03 * simulationSpeed * deltaTime;
              atom.position.y += (Math.random() - 0.5) * 0.03 * simulationSpeed * deltaTime;
              atom.position.z += (Math.random() - 0.5) * 0.03 * simulationSpeed * deltaTime;
            }
          });
        }
        
        if (controlsRef.current) {
          controlsRef.current.update();
        }
        
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      };
      
      frameCountRef.current = 0;
      lastTimeRef.current = performance.now();
      animate();
      setIsSimulationRunning(true);
      logger.info('Simulation animation started');
    }
  };
  
  const stopSimulation = () => {
    if (isSimulationRunning && frameIdRef.current !== null) {
      cancelAnimationFrame(frameIdRef.current);
      frameIdRef.current = null;
      setIsSimulationRunning(false);
      logger.info('Simulation animation stopped');
    }
  };
  
  const resetSimulation = () => {
    // Stop first if running
    if (isSimulationRunning) {
      stopSimulation();
    }
    
    // Reset positions and rotations - use ref for current atoms
    latticeAtomsRef.current.forEach(atom => {
      if (atom.userData.originalPosition) {
        atom.position.copy(atom.userData.originalPosition);
      }
      
      if (atom.userData.originalRotation) {
        atom.rotation.copy(atom.userData.originalRotation);
      }
      
      if (atom.userData.originalScale) {
        atom.scale.copy(atom.userData.originalScale);
      }
    });
    
    // Force a render
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    
    logger.info('Simulation reset to initial state');
  };
  
  const resetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 0, 15);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
      logger.info('Camera reset to initial position');
    }
  };
  
  const handleSpeedChange = (event, newValue) => {
    setSimulationSpeed(newValue);
    logger.debug(`Simulation speed changed to ${newValue}x`);
  };
  
  const takeScreenshot = () => {
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      // Force a render at high quality
      const prevPixelRatio = rendererRef.current.getPixelRatio();
      rendererRef.current.setPixelRatio(Math.max(window.devicePixelRatio, 2));
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      
      try {
        const dataURL = rendererRef.current.domElement.toDataURL('image/png');
        
        // Create a download link
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = `LENR-simulation-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        logger.info('Screenshot captured and downloaded');
      } catch (error) {
        logger.error('Error taking screenshot', error);
      }
      
      // Restore pixel ratio
      rendererRef.current.setPixelRatio(prevPixelRatio);
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  };
  
  // Update the createPlaceholderLattice to use resource manager
  const createPlaceholderLattice = () => {
    try {
      logger.debug('Creating placeholder lattice');
      setIsLoading(true);
      // Clear any previous errors
      setVisualizationError(null);

      if (!sceneRef.current) {
        logger.warn('Scene not initialized');
        setIsLoading(false);
        setVisualizationError('3D scene not properly initialized');
        return;
      }

      // Clear existing lattice atoms
      clearLatticeAtoms();

      const newLatticeAtoms = [];
      
      // Initialize resource manager if not already done
      if (!resourceManagerRef.current) {
        resourceManagerRef.current = new ResourceManager();
      }

      // Create a simple palladium-deuterium lattice structure
      const latticeSize = 3;
      const latticeSpacing = 2;

      // Use resource manager to get shared materials
      const materialPd = resourceManagerRef.current.getMaterial('phong', { 
        color: elementColors.palladium,
        transparent: false,
        opacity: 1.0
      });

      const materialD = resourceManagerRef.current.getMaterial('phong', { 
        color: elementColors.deuterium,
        transparent: false,
        opacity: 1.0
      });

      // Use resource manager to get shared geometries
      // Adjust the detail level based on quality setting
      const segmentsByQuality = {
        high: { pd: 32, d: 16 },
        medium: { pd: 16, d: 12 },
        low: { pd: 12, d: 8 }
      };
      
      const segments = segmentsByQuality[renderQuality];
      
      const pdGeometry = resourceManagerRef.current.getGeometry('sphere', {
        radius: 0.5,
        widthSegments: segments.pd,
        heightSegments: segments.pd
      });
      
      const dGeometry = resourceManagerRef.current.getGeometry('sphere', {
        radius: 0.3,
        widthSegments: segments.d,
        heightSegments: segments.d
      });

      // Create a grid of atoms
      for (let x = -latticeSize; x <= latticeSize; x++) {
        for (let y = -latticeSize; y <= latticeSize; y++) {
          for (let z = -latticeSize; z <= latticeSize; z++) {
            // Only place atoms that are likely to be visible (basic culling)
            // Skip atoms that are deep inside the lattice
            const isVisible = Math.abs(x) === latticeSize || 
                              Math.abs(y) === latticeSize || 
                              Math.abs(z) === latticeSize ||
                              Math.random() < 0.3; // Allow some internal atoms for density
                              
            if (!isVisible) continue;
            
            // Place palladium atoms at lattice points
            const pdAtom = new THREE.Mesh(pdGeometry, materialPd);
            pdAtom.position.set(
              x * latticeSpacing, 
              y * latticeSpacing, 
              z * latticeSpacing
            );
            pdAtom.userData = { 
              type: 'palladium',
              resourceManaged: true // Mark for proper cleanup
            };

            if (sceneRef.current) {
              sceneRef.current.add(pdAtom);
              newLatticeAtoms.push(pdAtom);
            }

            // Randomly place deuterium atoms at interstitial positions
            if (Math.random() > 0.8) {
              const dAtom = new THREE.Mesh(dGeometry, materialD);
              
              // Position deuterium at random interstitial positions
              dAtom.position.set(
                x * latticeSpacing + (Math.random() - 0.5) * 0.8,
                y * latticeSpacing + (Math.random() - 0.5) * 0.8,
                z * latticeSpacing + (Math.random() - 0.5) * 0.8
              );
              dAtom.userData = { 
                type: 'deuterium',
                resourceManaged: true // Mark for proper cleanup
              };

              if (sceneRef.current) {
                sceneRef.current.add(dAtom);
                newLatticeAtoms.push(dAtom);
              }
            }
          }
        }
      }

      // Store original positions for reset functionality
      newLatticeAtoms.forEach(atom => {
        atom.userData.originalPosition = atom.position.clone();
        atom.userData.originalRotation = atom.rotation.clone();
        atom.userData.originalScale = atom.scale.clone();
      });

      logger.info(`Created placeholder lattice with ${newLatticeAtoms.length} atoms`);
      setLatticeAtoms(newLatticeAtoms);
      latticeAtomsRef.current = newLatticeAtoms; // Keep ref in sync
      setIsLoading(false);
      
      // Start animation if it should be running
      if (isSimulationRunning) {
        startSimulation();
      }
    } catch (error) {
      logger.error('Error creating placeholder lattice', error);
      errorReporter.report(error, { 
        component: 'Dashboard',
        function: 'createPlaceholderLattice'
      });
      setIsLoading(false);
      setVisualizationError('Failed to create 3D visualization: ' + error.message);
    }
  };

  // Add helper function to properly clear lattice atoms with resource management
  const clearLatticeAtoms = () => {
    if (!resourceManagerRef.current) return;
    
    latticeAtoms.forEach(atom => {
      if (sceneRef.current) {
        sceneRef.current.remove(atom);
      }
      
      // Release managed resources
      if (atom.userData.resourceManaged) {
        if (atom.geometry) {
          resourceManagerRef.current.releaseGeometry(atom.geometry);
        }
        
        if (atom.material) {
          resourceManagerRef.current.releaseMaterial(atom.material);
        }
      }
    });
    
    // Run cleanup to dispose any unused resources
    resourceManagerRef.current.cleanup();
  };

  // Update the Rydberg visualization to use resource manager
  const updateRydbergVisualization = (results) => {
    try {
      logger.debug('Starting Rydberg visualization update');
      setIsLoading(true);
      // Clear any previous errors
      setVisualizationError(null);
      
      if (!sceneRef.current) {
        logger.warn('Scene not initialized yet');
        setIsLoading(false);
        setVisualizationError('3D scene not properly initialized');
        return;
      }
      
      // Clear existing lattice atoms with proper resource cleanup
      clearLatticeAtoms();
      
      const newLatticeAtoms = [];
      
      // Initialize resource manager if not already done
      if (!resourceManagerRef.current) {
        resourceManagerRef.current = new ResourceManager();
      }
      
      // Adjust detail level based on quality setting
      const segmentsByQuality = {
        high: { core: 24, electron: 16, cylinder: 8 },
        medium: { core: 16, electron: 12, cylinder: 6 },
        low: { core: 12, electron: 8, cylinder: 4 }
      };
      
      const segments = segmentsByQuality[renderQuality];
      
      // Create a Rydberg lattice structure based on simulation parameters
      const latticeSize = renderQuality === 'low' ? 1 : 2; // Reduce grid size at low quality
      const latticeSpacing = 2.5;
      
      // Calculate scaling factors based on simulation results
      const rydbergRadiusScale = results.rydbergRadius ? (results.rydbergRadius / 5) : 1;
      const overlapScale = results.overlapProbability ? results.overlapProbability : 0.5;
      
      // Use resource manager to get shared materials
      const materialCore = resourceManagerRef.current.getMaterial('phong', { 
        color: elementColors.palladium,
        transparent: false,
        opacity: 1.0
      });
      
      const materialElectron = resourceManagerRef.current.getMaterial('phong', { 
        color: elementColors.hydrogen,
        transparent: true,
        opacity: 0.6
      });
      
      const materialBridge = resourceManagerRef.current.getMaterial('phong', { 
        color: elementColors.transition,
        transparent: true,
        opacity: 0.4
      });
      
      // Use resource manager to get shared geometries
      const coreGeometry = resourceManagerRef.current.getGeometry('sphere', {
        radius: 0.3,
        widthSegments: segments.core,
        heightSegments: segments.core
      });
      
      const electronGeometry = resourceManagerRef.current.getGeometry('sphere', {
        radius: 0.8 * rydbergRadiusScale,
        widthSegments: segments.electron,
        heightSegments: segments.electron
      });
      
      // Create a grid of Rydberg atoms with optimized placement
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
            coreAtom.userData = { 
              type: 'core',
              resourceManaged: true
            };
            
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
            electronCloud.userData = { 
              type: 'electron',
              resourceManaged: true
            };
            
            if (sceneRef.current) {
              sceneRef.current.add(electronCloud);
              newLatticeAtoms.push(electronCloud);
            }
            
            // Only add bridges for higher quality settings or with lower probability
            const bridgeProbability = renderQuality === 'low' ? overlapScale * 0.5 : overlapScale;
            
            // Add bridges between adjacent atoms based on overlap probability
            if (Math.random() < bridgeProbability) {
              const directions = [
                [1, 0, 0], [0, 1, 0], [0, 0, 1],
                [-1, 0, 0], [0, -1, 0], [0, 0, -1]
              ];
              
              // Choose a random direction to create a bridge
              const randomDir = directions[Math.floor(Math.random() * directions.length)];
              
              // Create a cylinder with resource manager
              const bridgeGeometry = resourceManagerRef.current.getGeometry('cylinder', {
                radiusTop: 0.2, 
                radiusBottom: 0.2, 
                height: latticeSpacing * 0.7,
                radialSegments: segments.cylinder,
                heightSegments: 1
              });
              
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
              
              bridge.userData = { 
                type: 'bridge',
                resourceManaged: true
              };
              
              if (sceneRef.current) {
                sceneRef.current.add(bridge);
                newLatticeAtoms.push(bridge);
              }
            }
          }
        }
      }
      
      // Store original positions for reset functionality
      newLatticeAtoms.forEach(atom => {
        atom.userData.originalPosition = atom.position.clone();
        atom.userData.originalRotation = atom.rotation.clone();
        atom.userData.originalScale = atom.scale.clone();
      });
      
      logger.info(`Created Rydberg visualization with ${newLatticeAtoms.length} elements`);
      setLatticeAtoms(newLatticeAtoms);
      latticeAtomsRef.current = newLatticeAtoms; // Keep ref in sync
      setIsLoading(false);
      
      // Start animation if it should be running
      if (isSimulationRunning) {
        startSimulation();
      }
    } catch (error) {
      logger.error('Error updating Rydberg visualization', error);
      errorReporter.report(error, { 
        component: 'Dashboard',
        function: 'updateRydbergVisualization'
      });
      // Fallback to placeholder if something goes wrong
      setIsLoading(false);
      const errorMsg = 'Failed to update 3D visualization: ' + error.message;
      setVisualizationError(errorMsg);
      visualizationErrorRef.current = errorMsg; // Update ref for closure access
      
      // Wait a moment before trying the fallback to avoid potential recursive errors
      setTimeout(() => {
        try {
          // Use ref to check current error state (avoids stale closure)
          if (!visualizationErrorRef.current) {
            createPlaceholderLattice();
          }
        } catch (fallbackError) {
          logger.error('Error in fallback visualization', fallbackError);
        }
      }, 1000);
    }
  };

  // Add memory pressure detection and quality management
  const checkMemoryPressure = () => {
    try {
      // Check for memory pressure using performance.memory if available
      if (window.performance && performance.memory) {
        const memoryInfo = performance.memory;
        const usedHeapRatio = memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit;
        
        // Update quality based on heap usage
        if (usedHeapRatio > 0.8 && renderQuality !== 'low') {
          logger.warn('High memory pressure detected (>80%). Reducing render quality to LOW.');
          setRenderQuality('low');
          adjustRendererQuality('low');
          return true;
        } else if (usedHeapRatio > 0.6 && renderQuality === 'high') {
          logger.warn('Moderate memory pressure detected (>60%). Reducing render quality to MEDIUM.');
          setRenderQuality('medium');
          adjustRendererQuality('medium');
          return true;
        } else if (usedHeapRatio < 0.4 && renderQuality !== 'high') {
          logger.info('Memory pressure normalized (<40%). Increasing render quality to HIGH.');
          setRenderQuality('high');
          adjustRendererQuality('high');
          return false;
        }
      }
      
      // No memory pressure or measurement not available
      return false;
    } catch (error) {
      logger.error('Error checking memory pressure', error);
      return false;
    }
  };

  // Add function to adjust renderer quality based on memory pressure
  const adjustRendererQuality = (quality) => {
    if (!rendererRef.current) return;
    
    const pixelRatios = {
      high: Math.min(window.devicePixelRatio, 2),
      medium: Math.min(window.devicePixelRatio, 1),
      low: 0.75
    };
    
    rendererRef.current.setPixelRatio(pixelRatios[quality]);
    
    // If we've reduced quality significantly, cleanup resources
    if (quality === 'low') {
      // Cleanup any resources we can dispose
      if (resourceManagerRef.current) {
        resourceManagerRef.current.cleanup();
      }
      // Note: Removed fake GC trigger - creating and discarding large arrays is counterproductive
      // and doesn't actually help garbage collection. The browser's GC is automatic.
    }
    
    // Update visualization with new quality settings if needed
    if (simulationData && quality !== renderQuality) {
      updateVisualizationForQuality(quality);
    }
  };

  // Add function to update visualization for quality changes
  const updateVisualizationForQuality = (quality) => {
    if (simulationData && simulationData.type === 'rydberg' && simulationData.results) {
      // Wait a bit to allow GC to run before recreating the visualization
      setTimeout(() => {
        updateRydbergVisualization(simulationData.results);
      }, 200);
    } else {
      setTimeout(() => {
        createPlaceholderLattice();
      }, 200);
    }
  };

  // Handle enhanced fusion results
  const handleEnhancedFusionResults = (data) => {
    // Skip update if data is null or undefined
    if (!data) {
      if (enhancedFusionData !== null) {
        setEnhancedFusionData(null);
        enhancedFusionDataRef.current = null;
      }
      return;
    }
    
    // Check if data is significantly different from previous data
    const isDataChanged = !enhancedFusionDataRef.current || 
      !data.enhancement_factors || 
      !enhancedFusionDataRef.current.enhancement_factors ||
      data.enhancement_factors.total !== enhancedFusionDataRef.current.enhancement_factors.total;
    
    if (isDataChanged) {
      logger.info('Enhanced fusion results updated', { 
        total_enhancement: data?.enhancement_factors?.total,
        is_observable: data?.is_observable 
      });
      enhancedFusionDataRef.current = data;
      setEnhancedFusionData(data);
    }
  };

  // Initialize Three.js scene - this happens only once
  useEffect(() => {
    logger.info('Initializing Dashboard visualization');
    
    if (!containerRef.current) {
      logger.error('Dashboard: Container ref not available');
      setIsLoading(false);
      return;
    }
    
    try {
      // Create a detached container for Three.js content
      // TODO: Fix threeCleanupUtils - createDetachedThreeContainer doesn't exist
      const threeContainer = containerRef.current;
      // const threeContainer = threeCleanupUtils.createDetachedThreeContainer(
      //   containerRef.current, 
      //   'Dashboard'
      // );
      
      if (!threeContainer) {
        throw new Error('Failed to create Three.js container');
      }
      
      // Store the container reference
      threeContainerRef.current = threeContainer;
      
      // Create scene
      const scene = new THREE.Scene();
      if (!scene) {
        throw new Error('Failed to create Three.js scene');
      }
      scene.background = new THREE.Color(0xf0f0f0);
      sceneRef.current = scene;
      
      // Create camera
      const aspect = threeContainer.clientWidth / threeContainer.clientHeight || 1;
      const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
      camera.position.set(0, 0, 15);
      cameraRef.current = camera;
      
      // Verify WebGL support
      let canvas = document.createElement('canvas');
      let gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        throw new Error('WebGL is not supported in this browser');
      }
      
      // Create renderer
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance"
      });
      
      if (!renderer) {
        throw new Error('Failed to create Three.js renderer');
      }
      
      renderer.setSize(threeContainer.clientWidth || 300, threeContainer.clientHeight || 200);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      
      try {
        // Append renderer to container
        threeContainer.appendChild(renderer.domElement);
        
        // Register the canvas element to protect it from React
        // TODO: Fix threeCleanupUtils - registerThreeJsCanvas doesn't exist
        // threeCleanupUtils.registerThreeJsCanvas(renderer.domElement, 'Dashboard');
      } catch (domError) {
        logger.error('Error appending renderer to container', domError);
        throw new Error('Failed to append renderer to container: ' + domError.message);
      }
      
      rendererRef.current = renderer;
      
      // Add orbit controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.rotateSpeed = 1.0;
      controls.zoomSpeed = 1.2;
      controls.panSpeed = 0.8;
      controls.minDistance = 5;
      controls.maxDistance = 50;
      controls.enableZoom = true;
      controls.enablePan = true;
      controls.enableRotate = true;
      controls.target.set(0, 0, 0);
      controls.update();
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
      
      // Define the animate function
      const animate = () => {
        // Check if we can continue animating
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
          logger.debug('Animation stopped - resources were cleaned up');
          return; // Stop animation if resources have been cleaned up
        }
        
        const animationFrame = requestAnimationFrame(animate);
        frameIdRef.current = animationFrame;
        
        // Just update controls and render
        if (controlsRef.current) {
          controlsRef.current.update();
        }
        
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      };
      
      // Start the basic animation for initial rendering
      animate();
      
      // Create initial visualization after slight delay to ensure container is ready
      setTimeout(() => {
        try {
          createPlaceholderLattice();
        } catch (latticeError) {
          logger.error('Error creating placeholder lattice', latticeError);
          setIsLoading(false);
        }
      }, 100);
      
      // Handle window resize
      const handleResize = () => {
        if (!threeContainer || !cameraRef.current || !rendererRef.current) return;
        
        const width = threeContainer.clientWidth;
        const height = threeContainer.clientHeight;
        
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        
        rendererRef.current.setSize(width, height);
        rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        if (controlsRef.current) {
          controlsRef.current.update();
        }
      };
      
      window.addEventListener('resize', handleResize);
      
      // Add WebGL context loss/recovery handlers
      const handleContextLost = (event) => {
        event.preventDefault();
        logger.warn('WebGL context lost! Preparing for recovery...');
        
        // Stop animation if running
        if (frameIdRef.current !== null) {
          cancelAnimationFrame(frameIdRef.current);
          frameIdRef.current = null;
        }
        
        // Let user know what's happening
        setVisualizationError('WebGL context lost. Attempting to recover...');
        
        // Set quality to low to improve chances of recovery
        setRenderQuality('low');
      };
      
      const handleContextRestored = () => {
        logger.info('WebGL context restored! Reinitializing scene...');
        
        // Clear error message
        setVisualizationError(null);
        
        // Force scene recreation by clearing lattice atoms
        clearLatticeAtoms();
        setLatticeAtoms([]);
        latticeAtomsRef.current = []; // Keep ref in sync
        
        // Reset camera
        if (cameraRef.current) {
          cameraRef.current.position.set(0, 0, 15);
          cameraRef.current.updateProjectionMatrix();
        }
        
        if (controlsRef.current) {
          controlsRef.current.target.set(0, 0, 0);
          controlsRef.current.update();
        }
        
        // Recreate visualization with updated low quality settings
        setTimeout(() => {
          if (simulationData && simulationData.type === 'rydberg' && simulationData.results) {
            updateRydbergVisualization(simulationData.results);
          } else {
            createPlaceholderLattice();
          }
        }, 500);
      };
      
      // Register event listeners for context loss/recovery
      if (renderer.domElement) {
        renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);
        renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored, false);
      }
      
      // Cleanup function for component unmount
      return () => {
        logger.info('Cleaning up Dashboard visualization');
        window.removeEventListener('resize', handleResize);
        
        // Remove WebGL context event listeners
        if (rendererRef.current && rendererRef.current.domElement) {
          rendererRef.current.domElement.removeEventListener('webglcontextlost', handleContextLost);
          rendererRef.current.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
        }
        
        // First cancel animation frame if it exists
        if (frameIdRef.current !== null) {
          cancelAnimationFrame(frameIdRef.current);
          frameIdRef.current = null;
        }
        
        // Properly dispose resource manager
        if (resourceManagerRef.current) {
          resourceManagerRef.current.dispose();
          resourceManagerRef.current = null;
        }
        
        // Store local refs to ensure they exist during cleanup
        const localContainer = threeContainerRef.current;
        const localParent = containerRef.current;
        
        // Use our safe cleanup utility with proper container references
        // TODO: Fix threeCleanupUtils - use the actual cleanupThreeJS function
        threeCleanupUtils.cleanupThreeJS(
          sceneRef.current,
          rendererRef.current,
          controlsRef.current
        );
        
        // Cancel animation frame if exists
        if (frameIdRef.current) {
          cancelAnimationFrame(frameIdRef.current);
        }
        
        // Clear state
        setLatticeAtoms([]);
        latticeAtomsRef.current = []; // Keep ref in sync
        setVisualizationError(null);
        visualizationErrorRef.current = null; // Keep ref in sync
        
        // Clear refs
        rendererRef.current = null;
        sceneRef.current = null;
        cameraRef.current = null;
        controlsRef.current = null;
        frameIdRef.current = null;
        threeContainerRef.current = null;
      };
    } catch (error) {
      logger.error('Error initializing Three.js scene', error);
      errorReporter.report(error, { 
        component: 'Dashboard',
        function: 'initVisualization'
      });
      setIsLoading(false);
      setVisualizationError(error.message || 'Failed to initialize 3D visualization');
    }
  }, [logger]); // Only run once on component mount
  
  // Update visualization when simulation data changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (simulationData) {
      logger.info('Simulation data received', { type: simulationData.type });
      
      if (simulationData.type === 'rydberg' && simulationData.results) {
        updateRydbergVisualization(simulationData.results);
      } else {
        createPlaceholderLattice();
      }
    }
  }, [simulationData]);

  // Stop animation when component unmounts or when tab changes
  useEffect(() => {
    return () => {
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
    };
  }, [tabValue]);

  // Add useEffect to run periodic memory checks
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!tabValue === 0) return; // Only check memory on visualization tab
    
    const memoryCheckInterval = setInterval(() => {
      checkMemoryPressure();
    }, 10000); // Check every 10 seconds
    
    return () => {
      clearInterval(memoryCheckInterval);
    };
  }, [tabValue, renderQuality]);

  // Add a function to manually attempt context recovery 
  const attemptContextRecovery = () => {
    if (!rendererRef.current) return;
    
    logger.info('Attempting manual WebGL context recovery');
    
    try {
      // First, try a simple renderer reset
      const canvas = rendererRef.current.domElement;
      const parent = canvas.parentElement;
      
      if (parent && canvas) {
        // Remove canvas from DOM temporarily
        parent.removeChild(canvas);
        
        // Set low quality to improve recovery chances
        setRenderQuality('low');
        
        // Force garbage collection help
        setTimeout(() => {
          // Try to recreate renderer
          try {
            // Dispose old renderer properly
            rendererRef.current.dispose();
            
            // Create new renderer
            const newRenderer = new THREE.WebGLRenderer({ 
              antialias: false, // Disable antialiasing for recovery
              alpha: true,
              preserveDrawingBuffer: true,
              powerPreference: "default"
            });
            
            newRenderer.setSize(parent.clientWidth || 300, parent.clientHeight || 200);
            newRenderer.setPixelRatio(0.75); // Use low pixel ratio
            
            // Add back to DOM
            parent.appendChild(newRenderer.domElement);
            rendererRef.current = newRenderer;
            
            // Reattach event listeners
            newRenderer.domElement.addEventListener('webglcontextlost', (e) => {
              e.preventDefault();
              logger.warn('WebGL context lost during recovery!');
            }, false);
            
            // Clear error and recreate scene
            setVisualizationError(null);
            createPlaceholderLattice();
            
            return true;
          } catch (innerError) {
            logger.error('Failed to recreate renderer', innerError);
            setVisualizationError('Failed to recover visualization: ' + innerError.message);
            return false;
          }
        }, 500);
      }
    } catch (error) {
      logger.error('Error during manual context recovery', error);
      setVisualizationError('Failed to recover visualization: ' + error.message);
      return false;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          LENR Simulation Hub
        </Typography>
        <Link 
          href="https://github.com/ConsciousEnergy/lenr_sim_app" 
          target="_blank"
          rel="noopener noreferrer"
          sx={{ 
            textDecoration: 'none', 
            color: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <GitHubIcon />
          <Typography variant="body2">GitHub Repository</Typography>
        </Link>
      </Box>
      
      <Tabs 
        value={tabValue} 
        onChange={handleTabChange} 
        aria-label="Dashboard tabs"
        sx={{ mb: 2 }}
      >
        <Tab label="Simulation" />
        <Tab label="Results Analysis" />
        <Tab label="Configuration" />
      </Tabs>
      
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <FeatureCard
              title="Unified LENR Theory Explorer"
              description="Interactively explore the Unified LENR Theory with visualizations of enhancement mechanisms and fusion calculations based on the theoretical framework."
              icon={<MemoryIcon color="primary" fontSize="large" />}
              linkTo="/unified-theory"
              buttonText="Launch Theory Explorer"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <VisualizationContainer>
              {isLoading && (
                <LoadingOverlay>
                  <CircularProgress sx={{ mb: 2 }} />
                  <Typography variant="body1">
                    Loading Visualization...
                  </Typography>
                </LoadingOverlay>
              )}
              
              {visualizationError && !isLoading && (
                <LoadingOverlay>
                  <Alert severity="error" sx={{ mb: 2, maxWidth: '80%' }}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                      Visualization Error
                    </Typography>
                    <Typography variant="body2">
                      {visualizationError}
                    </Typography>
                  </Alert>
                  <ButtonGroup variant="contained">
                    <Button 
                      color="primary"
                      onClick={() => window.location.reload()}
                      startIcon={<RefreshIcon />}
                    >
                      Reload Application
                    </Button>
                    <Button 
                      color="warning"
                      onClick={attemptContextRecovery}
                      startIcon={<MemoryIcon />}
                    >
                      Attempt Recovery
                    </Button>
                  </ButtonGroup>
                </LoadingOverlay>
              )}
              
              {/* Simulation Controls Overlay */}
              <ControlsOverlay>
                <ButtonGroup variant="contained" size="small">
                  <Tooltip title={isSimulationRunning ? "Pause Simulation" : "Start Simulation"}>
                    <Button 
                      color={isSimulationRunning ? "warning" : "success"}
                      onClick={isSimulationRunning ? stopSimulation : startSimulation}
                    >
                      {isSimulationRunning ? <PauseIcon /> : <PlayArrowIcon />}
                    </Button>
                  </Tooltip>
                  
                  <Tooltip title="Reset Simulation">
                    <Button color="primary" onClick={resetSimulation}>
                      <RefreshIcon />
                    </Button>
                  </Tooltip>
                  
                  <Tooltip title="Reset Camera">
                    <Button color="primary" onClick={resetCamera}>
                      <SettingsBackupRestoreIcon />
                    </Button>
                  </Tooltip>
                  
                  <Tooltip title="Take Screenshot">
                    <Button color="primary" onClick={takeScreenshot}>
                      <CameraAltIcon />
                    </Button>
                  </Tooltip>
                </ButtonGroup>
                
                <SpeedSlider>
                  <SpeedIcon fontSize="small" />
                  <Slider
                    value={simulationSpeed}
                    onChange={handleSpeedChange}
                    min={0}
                    max={3}
                    step={0.1}
                    valueLabelDisplay="auto"
                    valueLabelFormat={x => `${x.toFixed(1)}x`}
                    aria-labelledby="simulation-speed-slider"
                    sx={{ minWidth: 150 }}
                  />
                </SpeedSlider>
              </ControlsOverlay>
              
              <ThreeContainer ref={containerRef}>
                {!isLoading && !visualizationError && simulationData && (
                  <VisualizationOverlay 
                    fps={currentFPS}
                    simulationData={simulationData}
                    simulationSpeed={simulationSpeed}
                    isSimulationRunning={isSimulationRunning}
                    renderQuality={renderQuality}
                  />
                )}
              </ThreeContainer>
            </VisualizationContainer>
            
            {/* Add visualization legend below the 3D canvas */}
            <VisualizationLegend 
              simulationData={simulationData} 
              isSimulationRunning={isSimulationRunning} 
              simulationSpeed={simulationSpeed}
            />
          </Grid>

          {/* Simulation Controls */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ height: '100%' }}>
              <LENRSimulationPanel onSimulationUpdate={handleSimulationUpdate} />
              <MemoryStatus />
            </Box>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          {/* Results Analysis Panel */}
        <Grid size={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                Simulation Results Analysis
            </Typography>
              <Divider sx={{ mb: 2 }} />
            {/* Transform data before passing to ResultsPanel */}
            <ResultsPanel results={prepareResultsData(simulationResults)} />
          </Paper>
        </Grid>
      </Grid>
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          {/* Enhanced Fusion Visualization */}
          <Grid size={{ xs: 12, md: 6 }}>
            <EnhancedFusionVisualization enhancedFusionData={enhancedFusionData} />
          </Grid>
          
          {/* Enhanced Fusion Configuration */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 2 }}>
              <EnhancedFusionPanel onResultsChange={handleEnhancedFusionResults} />
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
    </Container>
  );
}

export default Dashboard;