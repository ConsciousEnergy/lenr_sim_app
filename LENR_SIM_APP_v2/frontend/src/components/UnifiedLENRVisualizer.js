import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Switch,
  FormControlLabel,
  Divider,
  Button,
  Tabs,
  Tab,
  Tooltip,
  CircularProgress
} from '@mui/material';
import { styled } from '@mui/material/styles';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import axios from 'axios';
import { useSnackbar } from 'notistack';
import threeCleanup from '../utils/threeCleanup';

/**
 * @typedef {Object} EnhancementFactors
 * @property {number} rydbergMatter - Rydberg matter enhancement
 * @property {number} electronScreening - Electron screening enhancement  
 * @property {number} double_layer_qed - QED double layer enhancement
 * @property {number} casimirForces - Casimir effect enhancement
 * @property {number} quantumTunneling - Quantum tunneling enhancement
 * @property {number} oppenheimerPhillips - Oppenheimer-Phillips process enhancement
 * @property {number} quantumCoherence - Quantum coherence enhancement
 * @property {number} shockEnergy - Shock energy enhancement
 */

/**
 * Global function to update LENR Visualizer enhancement factors
 * @callback UpdateEnhancementCallback
 * @param {string} factorName - Name of the enhancement factor to update
 * @param {number} value - New value for the enhancement factor
 * @returns {void}
 */

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
  
  // State for enhancement mechanisms
  const [enhancementFactors, setEnhancementFactors] = useState({
    rydbergMatter: 50,
    electronScreening: 40,
    double_layer_qed: 30,
    casimirForces: 25,
    quantumTunneling: 60,
    oppenheimerPhillips: 35,
    quantumCoherence: 45,
    shockEnergy: 20
  });
  
  // State for loading and visualization
  const [loading, setLoading] = useState(false);
  const [calculationResults, setCalculationResults] = useState(null);
  
  // Snackbar for notifications
  const { enqueueSnackbar } = useSnackbar();

  // Three.js scene setup
  const initThreeScene = // eslint-disable-next-line react-hooks/exhaustive-deps
useCallback(() => {
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
  }, []);
  
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
    const dGeometry = new THREE.SphereGeometry(0.25, 32, 32);
    const dMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x00bfff,
      transparent: true,
      opacity: 0.7
    });
    
    // The number of deuterium atoms depends on the Rydberg matter enhancement
    const dCount = Math.max(5, Math.floor(enhancementFactors.rydbergMatter / 10));
    
    for (let i = 0; i < dCount; i++) {
      const dAtom = new THREE.Mesh(dGeometry, dMaterial);
      
      // Position D atoms near Pd lattice sites
      const x = (Math.random() * 2 - 1) * latticeSize * latticeSpacing;
      const y = (Math.random() * 2 - 1) * latticeSize * latticeSpacing;
      const z = (Math.random() * 2 - 1) * latticeSize * latticeSpacing;
      
      dAtom.position.set(x, y, z);
      scene.add(dAtom);
      
      // Add electron cloud for deuterium based on Rydberg state
      if (enhancementFactors.rydbergMatter > 20) {
        const cloudSize = 0.2 + (enhancementFactors.rydbergMatter / 100) * 1.5;
        const cloudGeometry = new THREE.SphereGeometry(cloudSize, 32, 32);
        const cloudMaterial = new THREE.MeshStandardMaterial({
          color: 0x4fc3f7,
          transparent: true,
          opacity: 0.2
        });
        
        const electronCloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
        electronCloud.position.copy(dAtom.position);
        scene.add(electronCloud);
      }
    }
    
    // Visualize tunneling enhancement
    if (enhancementFactors.quantumTunneling > 10) {
      const tunnelingStrength = enhancementFactors.quantumTunneling / 100;
      
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
    
    // Add double layer QED effects visualization - IMPROVED VISUALIZATION
    if (enhancementFactors.double_layer_qed > 0) {
      const layerStrength = enhancementFactors.double_layer_qed / 100;
      
      // Create more visually distinct layers with better opacity and coloring
      const layerGeometry = new THREE.BoxGeometry(
        latticeSize * 2.2 * latticeSpacing, 
        0.05 + layerStrength * 0.3, 
        latticeSize * 2.2 * latticeSpacing
      );
      
      // Use a more vibrant yellow color with improved transparency
      const layerMaterial = new THREE.MeshStandardMaterial({
        color: 0xffeb3b, // Brighter yellow
        transparent: true,
        opacity: 0.2 + layerStrength * 0.4,
        emissive: 0xffeb3b,
        emissiveIntensity: 0.2 * layerStrength
      });
      
      // Add multiple layers with wider spacing for better visibility
      const numLayers = Math.max(2, Math.floor(enhancementFactors.double_layer_qed / 2));
      for (let i = 0; i < numLayers; i++) {
        const offset = (i - (numLayers - 1) / 2) * (2.5 + layerStrength);
        const layer = new THREE.Mesh(layerGeometry, layerMaterial.clone());
        layer.position.y = offset;
        scene.add(layer);
        
        // Add subtle electric field effects between layers
        if (i < numLayers - 1) {
          const fieldGeometry = new THREE.CylinderGeometry(
            0.02, 0.02, 
            2.5 + layerStrength, 
            8, 2, true
          );
          const fieldMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.1 * layerStrength,
            emissive: 0xffeb3b,
            emissiveIntensity: 0.3 * layerStrength,
            side: THREE.DoubleSide
          });
          
          // Add field lines to visualize electric field
          for (let j = 0; j < 8; j++) {
            const angle = (j / 8) * Math.PI * 2;
            const radius = 3 + Math.random() * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            const fieldLine = new THREE.Mesh(fieldGeometry, fieldMaterial);
            fieldLine.position.set(x, offset + (2.5 + layerStrength) / 2, z);
            fieldLine.rotation.x = Math.PI / 2;
            scene.add(fieldLine);
          }
        }
      }
    }
    
    // Visualize Oppenheimer-Phillips process if active
    if (enhancementFactors.oppenheimerPhillips > 30) {
      const opStrength = enhancementFactors.oppenheimerPhillips / 100;
      
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
  }, [enhancementFactors]);
  
  // Calculate LENR enhancement based on current factors
  const calculateEnhancement = useCallback(async () => {
    setLoading(true);
    
    try {
      // Mock API call for now - in a full implementation this would call our backend
      // const response = await axios.post('/api/unified-theory/calculate', { enhancementFactors });
      
      // Mock calculation result
      setTimeout(() => {
        const tunnelingFactor = Math.pow(10, enhancementFactors.quantumTunneling / 10);
        const rydbergEnhancement = Math.pow(10, enhancementFactors.rydbergMatter / 20);
        const totalScreening = 
          (enhancementFactors.electronScreening * 0.3) + 
          (enhancementFactors.double_layer_qed * 0.2) + 
          (enhancementFactors.casimirForces * 0.1);
        
        const screeningFactor = Math.pow(10, totalScreening / 30);
        const coherenceFactor = Math.pow(2, enhancementFactors.quantumCoherence / 20);
        const opFactor = 1 + (enhancementFactors.oppenheimerPhillips / 40);
        const shockFactor = 1 + (enhancementFactors.shockEnergy / 30);
        
        // Calculate total enhancement
        const totalEnhancement = tunnelingFactor * rydbergEnhancement * 
          screeningFactor * coherenceFactor * opFactor * shockFactor;
        
        // Generate mock results
        const results = {
          tunnelingFactor: tunnelingFactor.toExponential(2),
          rydbergEnhancement: rydbergEnhancement.toExponential(2),
          screeningFactor: screeningFactor.toExponential(2),
          coherenceFactor: coherenceFactor.toFixed(3),
          opFactor: opFactor.toFixed(3),
          shockFactor: shockFactor.toFixed(3),
          totalEnhancement: totalEnhancement.toExponential(2),
          fusionRate: (totalEnhancement * 1e-20).toExponential(2),
          powerDensity: (totalEnhancement * 1e-15).toExponential(2)
        };
        
        setCalculationResults(results);
        setLoading(false);
        
        // Switch to the results tab
        setActiveTab(2);
        
        enqueueSnackbar('Calculation completed successfully', { variant: 'success' });
      }, 1500);
    } catch (error) {
      console.error('Error calculating enhancement:', error);
      enqueueSnackbar('Error calculating enhancement factors', { variant: 'error' });
      setLoading(false);
    }
  }, [enhancementFactors, enqueueSnackbar]);
  
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
  
  // Add a global way to update enhancement factors
  useEffect(() => {
    // Add an event listener for external enhancement factor updates
    const handleExternalEnhancementUpdate = (event) => {
      const { factorName, value } = event.detail;
      console.log(`Received enhancement factor update via event: ${factorName} = ${value}`);
      if (factorName && value !== undefined) {
        setEnhancementFactors(prev => ({
          ...prev,
          [factorName]: value
        }));
      }
    };
    
    // Listen for the custom event
    window.addEventListener('enhancementFactorUpdate', handleExternalEnhancementUpdate);
    
    // Expose a method to update enhancement factors directly
    window.updateLENRVisualizerEnhancement = (factorName, value) => {
      console.log(`Updating enhancement factor directly: ${factorName} = ${value}`);
      setEnhancementFactors(prev => ({
        ...prev,
        [factorName]: value
      }));
    };
    
    // Log the initialization of the visualization communication channel
    console.log('LENR Visualizer enhancement communication channel initialized');
    
    return () => {
      // Cleanup event listener and global method
      window.removeEventListener('enhancementFactorUpdate', handleExternalEnhancementUpdate);
      delete window.updateLENRVisualizerEnhancement;
      console.log('LENR Visualizer enhancement communication channel cleaned up');
    };
  }, []);
  
  // Update visualization when enhancement factors change
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
              </Box>
              
              <Button 
                variant="contained" 
                color="primary" 
                sx={{ mt: 3 }}
                onClick={calculateEnhancement}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Calculate Enhancement'}
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
      
      <TabPanel value={activeTab} index={1}>
        <Grid container spacing={3}>
          {/* Enhancement Factor Controls */}
          <Grid item xs={12} md={6} lg={4}>
            <Card>
              <CardHeader title="Rydberg Matter" subheader="Expanded electron orbitals in highly excited states" />
              <CardContent>
                <Slider
                  value={enhancementFactors.rydbergMatter}
                  onChange={(_, value) => handleFactorChange('rydbergMatter', value)}
                  min={0}
                  max={100}
                  valueLabelDisplay="auto"
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">Minimal Effect</Typography>
                  <Typography variant="caption">Maximum Effect</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6} lg={4}>
            <Card>
              <CardHeader title="Electron Screening" subheader="Screening of nuclear charges by electron density" />
              <CardContent>
                <Slider
                  value={enhancementFactors.electronScreening}
                  onChange={(_, value) => handleFactorChange('electronScreening', value)}
                  min={0}
                  max={100}
                  valueLabelDisplay="auto"
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">Minimal Effect</Typography>
                  <Typography variant="caption">Maximum Effect</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6} lg={4}>
            <Card>
              <CardHeader title="Double-Layer QED" subheader="Quantum electrodynamic effects at interfaces" />
              <CardContent>
                <Slider
                  value={enhancementFactors.double_layer_qed}
                  onChange={(_, value) => handleFactorChange('double_layer_qed', value)}
                  min={0}
                  max={100}
                  valueLabelDisplay="auto"
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">Minimal Effect</Typography>
                  <Typography variant="caption">Maximum Effect</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6} lg={4}>
            <Card>
              <CardHeader title="Casimir Effect" subheader="Vacuum energy effects in confined geometries" />
              <CardContent>
                <Slider
                  value={enhancementFactors.casimirForces}
                  onChange={(_, value) => handleFactorChange('casimirForces', value)}
                  min={0}
                  max={100}
                  valueLabelDisplay="auto"
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">Minimal Effect</Typography>
                  <Typography variant="caption">Maximum Effect</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6} lg={4}>
            <Card>
              <CardHeader title="Quantum Tunneling" subheader="Enhanced barrier penetration probability" />
              <CardContent>
                <Slider
                  value={enhancementFactors.quantumTunneling}
                  onChange={(_, value) => handleFactorChange('quantumTunneling', value)}
                  min={0}
                  max={100}
                  valueLabelDisplay="auto"
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">Minimal Effect</Typography>
                  <Typography variant="caption">Maximum Effect</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6} lg={4}>
            <Card>
              <CardHeader title="Oppenheimer-Phillips" subheader="Neutron stripping and transfer processes" />
              <CardContent>
                <Slider
                  value={enhancementFactors.oppenheimerPhillips}
                  onChange={(_, value) => handleFactorChange('oppenheimerPhillips', value)}
                  min={0}
                  max={100}
                  valueLabelDisplay="auto"
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">Minimal Effect</Typography>
                  <Typography variant="caption">Maximum Effect</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6} lg={4}>
            <Card>
              <CardHeader title="Quantum Coherence" subheader="Coherent quantum effects across lattice domains" />
              <CardContent>
                <Slider
                  value={enhancementFactors.quantumCoherence}
                  onChange={(_, value) => handleFactorChange('quantumCoherence', value)}
                  min={0}
                  max={100}
                  valueLabelDisplay="auto"
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">Minimal Effect</Typography>
                  <Typography variant="caption">Maximum Effect</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6} lg={4}>
            <Card>
              <CardHeader title="Shock Energy" subheader="Bubble collapse and energy localization" />
              <CardContent>
                <Slider
                  value={enhancementFactors.shockEnergy}
                  onChange={(_, value) => handleFactorChange('shockEnergy', value)}
                  min={0}
                  max={100}
                  valueLabelDisplay="auto"
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">Minimal Effect</Typography>
                  <Typography variant="caption">Maximum Effect</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
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
                      <Grid item xs={8}>
                        <Typography variant="subtitle2">Tunneling Factor:</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2">{calculationResults.tunnelingFactor}</Typography>
                      </Grid>
                      
                      <Grid item xs={8}>
                        <Typography variant="subtitle2">Rydberg Enhancement:</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2">{calculationResults.rydbergEnhancement}</Typography>
                      </Grid>
                      
                      <Grid item xs={8}>
                        <Typography variant="subtitle2">Screening Factor:</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2">{calculationResults.screeningFactor}</Typography>
                      </Grid>
                      
                      <Grid item xs={8}>
                        <Typography variant="subtitle2">Coherence Factor:</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2">{calculationResults.coherenceFactor}</Typography>
                      </Grid>
                      
                      <Grid item xs={8}>
                        <Typography variant="subtitle2">Oppenheimer-Phillips Factor:</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2">{calculationResults.opFactor}</Typography>
                      </Grid>
                      
                      <Grid item xs={8}>
                        <Typography variant="subtitle2">Shock Energy Factor:</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2">{calculationResults.shockFactor}</Typography>
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                      </Grid>
                      
                      <Grid item xs={8}>
                        <Typography variant="subtitle1" fontWeight="bold">Total Enhancement:</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="subtitle1" fontWeight="bold">{calculationResults.totalEnhancement}</Typography>
                      </Grid>
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
    </Container>
  );
};

export default UnifiedLENRVisualizer; 