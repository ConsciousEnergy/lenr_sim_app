import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Slider, 
  Card, 
  CardContent, 
  CardHeader,
  Divider,
  Button,
  Tabs,
  Tab,
  CircularProgress,
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';
import { styled } from '@mui/material/styles';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { useSnackbar } from 'notistack';
import threeCleanup from '../utils/threeCleanup';
import axios from 'axios';

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
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
};

const UnifiedLENRVisualizer = () => {
  // State for handling active tab
  const [activeTab, setActiveTab] = useState(0);
  
  // Three.js references
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  
  // State for enhancement mechanisms data
  const [mechanisms, setMechanisms] = useState({});
  const [parameterRanges, setParameterRanges] = useState({});
  const [loadingMechanismData, setLoadingMechanismData] = useState(true);
  
  // State for enhancement mechanisms
  const [enhancementFactors, setEnhancementFactors] = useState({
    rydberg_matter: 50,
    electron_screening: 40,
    qed_effects: 30,
    casimir_forces: 25,
    quantum_coherence: 60,
    oppenheimer_phillips: 35,
    bubble_collapse: 20
  });
  
  // State for loading and visualization
  const [loading, setLoading] = useState(false);
  const [calculationResults, setCalculationResults] = useState(null);
  const [error, setError] = useState(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  
  // Snackbar for notifications
  const { enqueueSnackbar } = useSnackbar();

  // Update visualization based on enhancement factors
  const updateVisualization = useCallback(() => {
    if (!sceneRef.current) return;
    
    // Clear existing objects except lights
    const scene = sceneRef.current;
    while (scene.children.length > 0) {
      const obj = scene.children[0];
      if (obj.type === 'AmbientLight' || obj.type === 'DirectionalLight') {
        scene.children.shift();
        scene.add(obj);
      } else {
        scene.remove(obj);
      }
    }
    
    // Create the base palladium lattice structure
    const latticeSize = 3;
    const latticeSpacing = 2.5;
    
    // Create the palladium lattice
    const pdGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const pdMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xb9b9b9,
      metalness: 0.8,
      roughness: 0.2
    });
    
    for (let x = -latticeSize; x <= latticeSize; x++) {
      for (let y = -latticeSize; y <= latticeSize; y++) {
        for (let z = -latticeSize; z <= latticeSize; z++) {
          const pdAtom = new THREE.Mesh(pdGeometry, pdMaterial);
          pdAtom.position.set(
            x * latticeSpacing,
            y * latticeSpacing,
            z * latticeSpacing
          );
          scene.add(pdAtom);
        }
      }
    }
    
    // Add deuterium atoms based on Rydberg matter factor
    const deuteriumGeometry = new THREE.SphereGeometry(0.25, 32, 32);
    const dMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x00bfff,
      transparent: true,
      opacity: 0.7
    });
    
    // The number of deuterium atoms depends on the Rydberg matter enhancement
    const dCount = Math.max(5, Math.floor(enhancementFactors.rydberg_matter / 10));
    
    for (let i = 0; i < dCount; i++) {
      const deuteriumAtom = new THREE.Mesh(deuteriumGeometry, dMaterial);
      
      // Position D atoms near Pd lattice sites
      const x = (Math.random() * 2 - 1) * latticeSize * latticeSpacing;
      const y = (Math.random() * 2 - 1) * latticeSize * latticeSpacing;
      const z = (Math.random() * 2 - 1) * latticeSize * latticeSpacing;
      
      deuteriumAtom.position.set(x, y, z);
      scene.add(deuteriumAtom);
      
      // Add electron cloud for deuterium based on Rydberg state
      if (enhancementFactors.rydberg_matter > 20) {
        const cloudSize = 0.2 + (enhancementFactors.rydberg_matter / 100) * 1.5;
        const cloudGeometry = new THREE.SphereGeometry(cloudSize, 32, 32);
        const cloudMaterial = new THREE.MeshStandardMaterial({
          color: 0x4fc3f7,
          transparent: true,
          opacity: 0.2
        });
        
        const electronCloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
        electronCloud.position.copy(deuteriumAtom.position);
        scene.add(electronCloud);
      }
    }
    
    // Visualize tunneling enhancement from quantum coherence
    if (enhancementFactors.quantum_coherence > 10) {
      const tunnelingStrength = enhancementFactors.quantum_coherence / 100;
      
      // Create tunneling potential visualization
      const tunnelGeometry = new THREE.TorusGeometry(
        5,
        0.05 + tunnelingStrength * 0.3,
        16,
        100
      );
      const tunnelMaterial = new THREE.MeshStandardMaterial({
        color: 0xff5722,
        transparent: true,
        opacity: 0.3 + tunnelingStrength * 0.4
      });
      
      const tunnelRing = new THREE.Mesh(tunnelGeometry, tunnelMaterial);
      tunnelRing.rotation.x = Math.PI / 2;
      scene.add(tunnelRing);
    }
    
    // Add double layer QED effects visualization
    if (enhancementFactors.qed_effects > 15) {
      const layerStrength = enhancementFactors.qed_effects / 100;
      const layerGeometry = new THREE.BoxGeometry(
        latticeSize * 2 * latticeSpacing, 
        0.05 + layerStrength * 0.2, 
        latticeSize * 2 * latticeSpacing
      );
      const layerMaterial = new THREE.MeshStandardMaterial({
        color: 0xffc107,
        transparent: true,
        opacity: 0.2 + layerStrength * 0.3
      });
      
      // Add multiple layers
      for (let i = -2; i <= 2; i += 1.5) {
        const layer = new THREE.Mesh(layerGeometry, layerMaterial);
        layer.position.y = i * 2;
        scene.add(layer);
      }
    }
    
    // Visualize Oppenheimer-Phillips process if active
    if (enhancementFactors.oppenheimer_phillips > 30) {
      const opStrength = enhancementFactors.oppenheimer_phillips / 100;
      
      // Create neutron transfer visualization
      const neutronGeometry = new THREE.SphereGeometry(0.15, 32, 32);
      const neutronMaterial = new THREE.MeshStandardMaterial({
        color: 0x9c27b0,
        emissive: 0x9c27b0,
        emissiveIntensity: 0.5
      });
      
      for (let i = 0; i < 5 * opStrength; i++) {
        const neutron = new THREE.Mesh(neutronGeometry, neutronMaterial);
        const angle = Math.random() * Math.PI * 2;
        const radius = 2 + Math.random() * 5;
        
        neutron.position.set(
          Math.cos(angle) * radius,
          (Math.random() * 2 - 1) * 5,
          Math.sin(angle) * radius
        );
        scene.add(neutron);
      }
    }
    
    // Visualize bubble collapse if active
    if (enhancementFactors.bubble_collapse > 25) {
      const bubbleStrength = enhancementFactors.bubble_collapse / 100;
      
      // Create bubble visualization
      const bubbleGeometry = new THREE.SphereGeometry(
        2 + bubbleStrength * 3,
        32,
        32
      );
      const bubbleMaterial = new THREE.MeshStandardMaterial({
        color: 0x2196f3,
        transparent: true,
        opacity: 0.2,
        wireframe: true
      });
      
      const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
      scene.add(bubble);
      
      // Add energy wave from bubble collapse
      if (enhancementFactors.bubble_collapse > 50) {
        const waveGeometry = new THREE.SphereGeometry(
          4 + bubbleStrength * 2,
          32,
          32
        );
        const waveMaterial = new THREE.MeshStandardMaterial({
          color: 0x64b5f6,
          transparent: true,
          opacity: 0.15,
          wireframe: false
        });
        
        const wave = new THREE.Mesh(waveGeometry, waveMaterial);
        scene.add(wave);
      }
    }
  }, [enhancementFactors]);

  // Three.js scene setup
  const initThreeScene = useCallback(() => {
    if (!containerRef.current) return;
    
    // Cleanup any existing scene
    if (rendererRef.current) {
      threeCleanup(rendererRef.current, sceneRef.current);
    }
    
    // Setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;
    
    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 15;
    cameraRef.current = camera;
    
    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Setup controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);
    
    // Start animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    
    animate();
    
    // Initial visualization setup
    updateVisualization();
    
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
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [updateVisualization]);
  
  const showSnackbar = (message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setOpenSnackbar(true);
  };
  
  const handleSnackbarClose = (_, reason) => {
    if (reason === 'clickaway') return;
    setOpenSnackbar(false);
  };

  const fetchMechanismData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    console.log('Fetching mechanism data and parameter ranges...');
    
    try {
      // Make both API calls in parallel
      const [mechanismsResponse, rangesResponse] = await Promise.all([
        axios.get('/api/physics/unified-theory/enhancement-mechanisms'),
        axios.get('/api/physics/unified-theory/parameter-ranges')
      ]);
      
      if (!mechanismsResponse.data) {
        throw new Error('Failed to fetch mechanisms');
      }
      
      if (!rangesResponse.data) {
        throw new Error('Failed to fetch parameter ranges');
      }
      
      console.log('Successfully fetched mechanisms and ranges data:', 
                  {mechanisms: Object.keys(mechanismsResponse.data.mechanisms).length, 
                   ranges: Object.keys(rangesResponse.data.parameter_ranges).length});
      
      setMechanisms(mechanismsResponse.data.mechanisms);
      setParameterRanges(rangesResponse.data.parameter_ranges);
      
      // Set initial configuration based on ranges
      const initialConfig = {};
      Object.entries(rangesResponse.data.parameter_ranges).forEach(([mechName, params]) => {
        initialConfig[mechName] = {};
        Object.entries(params).forEach(([paramName, paramConfig]) => {
          initialConfig[mechName][paramName] = paramConfig.default;
        });
      });
      
      setEnhancementFactors(prev => ({
        ...prev,
        ...initialConfig
      }));
      
      showSnackbar('Successfully loaded mechanism data', 'success');
    } catch (err) {
      console.error('Error fetching mechanism data:', err);
      setError(err.message);
      showSnackbar(`Error loading data: ${err.message}`, 'error');
      
      // Provide mock data for demo/testing purposes
      setMechanisms({
        rydberg_matter: {
          name: "Rydberg Matter Effects",
          description: "Enhancement due to highly excited electronic states",
          physical_basis: "Extended electron orbits modify nuclear interactions",
          typical_enhancement: "10^3 - 10^10"
        },
        electron_screening: {
          name: "Electron Screening Effects",
          description: "Screening of nuclear charges by electron density",
          physical_basis: "Electrons reduce the effective Coulomb barrier",
          typical_enhancement: "10^1 - 10^3"
        },
        // More mock mechanisms...
      });
    } finally {
      setLoading(false);
    }
  }, []);
  
  const calculateEnhancement = useCallback(async () => {
    if (!enhancementFactors || Object.keys(enhancementFactors).length === 0) {
      showSnackbar('No mechanism configuration available', 'warning');
      return;
    }

    setLoading(true);
    setError(null);
    
    const activeMechanisms = Object.keys(enhancementFactors)
      .filter(mech => enhancementFactors[mech] !== undefined);
    
    const requestData = {
      config: enhancementFactors,
      mechanisms: activeMechanisms.length > 0 ? activeMechanisms : null
    };
    
    console.log('Calculating enhancement with config:', requestData);
    
    try {
      const response = await axios.post('/api/physics/unified-theory/calculate-combined-enhancement', requestData);

      if (!response.data) {
        throw new Error('Failed to calculate enhancement');
      }

      console.log('Enhancement calculation results:', response.data);
      
      const results = {
        totalEnhancement: response.data.combined_enhancement_factor.toExponential(2),
        logEnhancement: response.data.log_combined_enhancement.toFixed(2),
        mechanismContributions: response.data.mechanism_contribution || {},
        dominantMechanism: response.data.dominant_mechanism || '',
        individualEnhancements: response.data.individual_enhancements || {},
        fusionRate: (response.data.combined_enhancement_factor * 1e-20).toExponential(2),
        powerDensity: (response.data.combined_enhancement_factor * 1e-15).toExponential(2)
      };
      
      setCalculationResults(results);
      showSnackbar('Enhancement calculation complete', 'success');
      
      // Update visualization with new data
      updateVisualization();
      
    } catch (err) {
      console.error('Error calculating enhancement:', err);
      setError(err.message);
      showSnackbar(`Error in calculation: ${err.message}`, 'error');
      
      // Provide fallback results for demo/testing
      const fallbackResults = generateFallbackResults();
      setCalculationResults(fallbackResults);
      updateVisualization(fallbackResults);
    } finally {
      setLoading(false);
    }
  }, [enhancementFactors, updateVisualization]);
  
  const generateFallbackResults = () => {
    console.log('Generating fallback results...');
    // Create fallback results for demo purposes
    const activeMechanisms = Object.keys(enhancementFactors)
      .filter(mech => enhancementFactors[mech] !== undefined);
    
    const fallbackResults = {
      individual_enhancements: {},
      log_combined_enhancement: 0,
      combined_enhancement: 1,
      reaction_rate_increase: "Moderate",
      metadata: {
        model_version: "1.0.0-fallback",
        timestamp: new Date().toISOString(),
        mechanisms_included: activeMechanisms.length > 0 ? activeMechanisms : Object.keys(enhancementFactors)
      }
    };
    
    // Generate simulated enhancement factors for each mechanism
    activeMechanisms.forEach(mech => {
      let magnitude = 0;
      
      // Assign rough enhancement values based on mechanism type
      switch(mech) {
        case 'electron_screening':
          magnitude = 2;
          break;
        case 'quantum_coherence':
          magnitude = 4;
          break;
        case 'rydberg_matter':
          magnitude = 6;
          break;
        case 'bubble_collapse':
          magnitude = 10;
          break;
        default:
          magnitude = 3;
      }
      
      const logEnhancement = magnitude;
      fallbackResults.individual_enhancements[mech] = {
        log_enhancement: logEnhancement,
        enhancement_factor: Math.pow(10, logEnhancement),
        dominant_parameters: Object.keys(enhancementFactors[mech] || {}).slice(0, 2),
        confidence: "Medium (Fallback)"
      };
      
      fallbackResults.log_combined_enhancement += logEnhancement;
    });
    
    fallbackResults.combined_enhancement = Math.pow(10, fallbackResults.log_combined_enhancement);
    
    return fallbackResults;
  };
  
  // Initialize Three.js scene on component mount
  useEffect(() => {
    const cleanup = initThreeScene();
    
    return () => {
      if (cleanup) cleanup();
      if (rendererRef.current) {
        threeCleanup(rendererRef.current, sceneRef.current);
      }
    };
  }, [initThreeScene]);
  
  // Fetch mechanism data on component mount
  useEffect(() => {
    fetchMechanismData();
  }, [fetchMechanismData]);
  
  // Update visualization when enhancement factors change
  useEffect(() => {
    updateVisualization();
  }, [enhancementFactors, updateVisualization]);
  
  // Handle enhancement factor changes
  const handleFactorChange = (factor, value) => {
    setEnhancementFactors(prev => ({
      ...prev,
      [factor]: value
    }));
  };

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" component="h1" gutterBottom sx={{ pt: 3 }}>
        Unified LENR Theory Explorer
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Explore the unified theoretical framework for Low-Energy Nuclear Reactions with interactive visualizations and calculations.
      </Typography>
      
      <Tabs 
        value={activeTab} 
        onChange={(_, newValue) => setActiveTab(newValue)}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
      >
        <Tab label="Theory Visualizer" />
        <Tab label="Enhancement Factors" />
        <Tab label="Calculation Results" />
      </Tabs>
      
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <VisualizationContainer>
              <ThreeContainer ref={containerRef} />
            </VisualizationContainer>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Visualization Controls
              </Typography>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                This visualization represents the key mechanisms of the Unified LENR Theory. The 3D model shows 
                a palladium lattice with deuterium atoms and various enhancement effects.
              </Typography>
              
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                Key Elements:
              </Typography>
              
              <Box sx={{ ml: 2 }}>
                <Typography variant="body2">• Gray spheres: Palladium lattice atoms</Typography>
                <Typography variant="body2">• Blue spheres: Deuterium atoms</Typography>
                <Typography variant="body2">• Blue clouds: Rydberg electron orbitals</Typography>
                <Typography variant="body2">• Orange rings: Quantum tunneling pathways</Typography>
                <Typography variant="body2">• Yellow planes: Double-layer QED effects</Typography>
                <Typography variant="body2">• Purple dots: Oppenheimer-Phillips neutron transfers</Typography>
                <Typography variant="body2">• Blue wireframe: Cavitation bubble dynamics</Typography>
              </Box>
              
              <Button 
                variant="contained" 
                color="primary" 
                sx={{ mt: 3 }}
                onClick={calculateEnhancement}
                disabled={loading || loadingMechanismData}
              >
                {loading ? <CircularProgress size={24} /> : 'Calculate Enhancement'}
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
      
      <TabPanel value={activeTab} index={1}>
        <Grid container spacing={3}>
          {loadingMechanismData ? (
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Grid>
          ) : (
            <>
              {/* Enhancement Factor Controls */}
              {Object.entries(mechanisms).map(([mechName, mechData]) => (
                <Grid item xs={12} md={6} lg={4} key={mechName}>
                  <Card>
                    <CardHeader 
                      title={mechData.name} 
                      subheader={mechData.description} 
                      titleTypographyProps={{ variant: 'h6' }}
                      subheaderTypographyProps={{ variant: 'body2' }}
                    />
                    <CardContent>
                      <Tooltip title={mechData.physical_basis || ''} arrow placement="top">
                        <Slider
                          value={enhancementFactors[mechName] || 50}
                          onChange={(_, value) => handleFactorChange(mechName, value)}
                          min={0}
                          max={100}
                          valueLabelDisplay="auto"
                        />
                      </Tooltip>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption">Minimal Effect</Typography>
                        <Typography variant="caption">Maximum Effect</Typography>
                      </Box>
                      <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                        Typical enhancement: {mechData.typical_enhancement}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={calculateEnhancement}
                    disabled={loading}
                    size="large"
                  >
                    {loading ? <CircularProgress size={24} /> : 'Calculate Enhancement Factors'}
                  </Button>
                </Box>
              </Grid>
            </>
          )}
        </Grid>
      </TabPanel>
      
      <TabPanel value={activeTab} index={2}>
        <Grid container spacing={3}>
          {calculationResults ? (
            <>
              <Grid item xs={12}>
                <Typography variant="h5" gutterBottom>
                  LENR Enhancement Calculation Results
                </Typography>
                <Typography variant="body2" paragraph>
                  Based on the unified theoretical framework, the following enhancement factors and predictions have been calculated:
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader title="Enhancement Factors" />
                  <CardContent>
                    <Grid container spacing={2}>
                      {Object.entries(calculationResults.individualEnhancements || {}).map(([mechName, data]) => (
                        <React.Fragment key={mechName}>
                          <Grid item xs={8}>
                            <Typography variant="subtitle2">{mechanisms[mechName]?.name || mechName}:</Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="body2">{data.factor}</Typography>
                          </Grid>
                        </React.Fragment>
                      ))}
                      
                      <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                      </Grid>
                      
                      <Grid item xs={8}>
                        <Typography variant="subtitle1" fontWeight="bold">Total Enhancement:</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="subtitle1" fontWeight="bold">{calculationResults.totalEnhancement}</Typography>
                      </Grid>
                      
                      <Grid item xs={8}>
                        <Typography variant="subtitle2">Log Enhancement:</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2">{calculationResults.logEnhancement}</Typography>
                      </Grid>
                      
                      {calculationResults.dominantMechanism && (
                        <>
                          <Grid item xs={8}>
                            <Typography variant="subtitle2">Dominant Mechanism:</Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="body2">{mechanisms[calculationResults.dominantMechanism]?.name || calculationResults.dominantMechanism}</Typography>
                          </Grid>
                        </>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader title="LENR Predictions" />
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={8}>
                        <Typography variant="subtitle2">Fusion Rate (reactions/cc/sec):</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2">{calculationResults.fusionRate}</Typography>
                      </Grid>
                      
                      <Grid item xs={8}>
                        <Typography variant="subtitle2">Power Density (W/cm³):</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2">{calculationResults.powerDensity}</Typography>
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Divider sx={{ my: 2 }} />
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Typography variant="body2" paragraph>
                          <strong>Interpretation:</strong> These results suggest that under the current parameter configuration, 
                          the combined enhancement mechanisms could potentially facilitate LENR processes at rates that may be 
                          experimentally detectable.
                        </Typography>
                        
                        <Typography variant="body2">
                          <strong>Note:</strong> These calculations are based on the theoretical framework described in the 
                          Unified LENR Theory paper and should be validated through controlled experiments.
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </>
          ) : (
            <Grid item xs={12}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Calculation Results Available
                </Typography>
                <Typography variant="body2" paragraph>
                  Adjust the enhancement factors in the "Enhancement Factors" tab and click "Calculate Enhancement Factors" to generate results.
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => setActiveTab(1)}
                >
                  Go to Enhancement Factors
                </Button>
              </Paper>
            </Grid>
          )}
        </Grid>
      </TabPanel>
      
      <Snackbar 
        open={openSnackbar} 
        autoHideDuration={6000} 
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
      
      {error && (
        <Box sx={{ mt: 2, mb: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
          <Typography variant="subtitle1" color="error.dark">
            Error: {error}
          </Typography>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={error.includes('fetch') ? fetchMechanismData : calculateEnhancement}
            sx={{ mt: 1 }}
          >
            Retry
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default UnifiedLENRVisualizer; 