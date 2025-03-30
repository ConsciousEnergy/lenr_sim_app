import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Slider, 
  TextField, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  CircularProgress, 
  Alert,
  Tooltip
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { styled } from '@mui/material/styles';
import { getClusterVisualization } from '../../api/api';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import ExportButton from '../common/ExportButton';
import { exportAsJSON } from '../../api/export';

const InfoIconStyled = styled(InfoIcon)(({ theme }) => ({
  fontSize: '1rem',
  marginLeft: theme.spacing(1),
  color: theme.palette.info.main,
  cursor: 'help',
}));

const ClusterVisualizationPanel = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [visualizationData, setVisualizationData] = useState(null);
  const [params, setParams] = useState({
    num_particles: 3,
    charge: 1.0,
    cluster_radius: 1e-10,
    grid_resolution: 50
  });

  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const particlesRef = useRef([]);

  // Handle parameter changes
  const handleChange = (param) => (event) => {
    const value = event.target.value === '' ? '' : Number(event.target.value);
    if (value !== '' && !isNaN(value)) {
      setParams({
        ...params,
        [param]: value
      });
    }
  };

  // Handle slider changes
  const handleSliderChange = (param) => (event, newValue) => {
    setParams({
      ...params,
      [param]: newValue
    });
  };

  // Format a number to scientific notation
  const formatScientific = (value) => {
    return value.toExponential(2);
  };

  // Generate cluster visualization
  const handleGenerateVisualization = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getClusterVisualization(params);
      setVisualizationData(response);
    } catch (error) {
      console.error('Error generating cluster visualization:', error);
      setError('Failed to generate cluster visualization. Please try different parameters.');
    } finally {
      setLoading(false);
    }
  };

  // Initialize Three.js scene
  const initScene = () => {
    if (!canvasRef.current || sceneRef.current) return;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current,
      antialias: true 
    });
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75,
      canvasRef.current.clientWidth / canvasRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    // Create controls
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

    // Create coordinate axes to help with orientation
    const axesHelper = new THREE.AxesHelper(2);
    scene.add(axesHelper);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      if (rendererRef.current && cameraRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();
  };

  // Update scene with visualization data
  const updateVisualization = () => {
    if (!sceneRef.current || !visualizationData) return;
    
    // Clear existing particles
    if (particlesRef.current.length > 0) {
      particlesRef.current.forEach(particle => {
        sceneRef.current.remove(particle);
      });
      particlesRef.current = [];
    }

    // Add particles
    const particleGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const particleMaterial = new THREE.MeshPhongMaterial({ color: 0x1976d2 });
    
    visualizationData.particle_positions.forEach(position => {
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      // Scale the positions for visualization
      const scale = 2.0;
      particle.position.set(
        position[0] * scale,
        position[1] * scale,
        position[2] * scale
      );
      sceneRef.current.add(particle);
      particlesRef.current.push(particle);
    });

    // Add potential field visualization (placeholder - would need actual field data for a proper implementation)
    // This would typically use volume rendering or isosurfaces for the potential field
  };

  // Handle window resize
  const handleResize = () => {
    if (!canvasRef.current || !cameraRef.current || !rendererRef.current) return;
    
    const width = canvasRef.current.clientWidth;
    const height = canvasRef.current.clientHeight;
    
    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height);
  };

  // Initialize scene on mount
  useEffect(() => {
    initScene();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      
      // Clean up Three.js resources
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      
      // Clean up geometries and materials
      particlesRef.current.forEach(particle => {
        particle.geometry.dispose();
        particle.material.dispose();
      });
    };
  }, []);

  // Update visualization when data changes
  useEffect(() => {
    updateVisualization();
  }, [visualizationData]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Cluster Visualization
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Cluster Parameters
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box display="flex" alignItems="center">
                  <Typography gutterBottom>
                    Number of Particles
                  </Typography>
                  <Tooltip title="The number of particles in the cluster">
                    <InfoIconStyled />
                  </Tooltip>
                </Box>
                <Slider
                  value={params.num_particles}
                  onChange={handleSliderChange('num_particles')}
                  step={1}
                  marks
                  min={2}
                  max={10}
                  valueLabelDisplay="auto"
                />
                <TextField
                  value={params.num_particles}
                  onChange={handleChange('num_particles')}
                  size="small"
                  type="number"
                  inputProps={{ min: 2, max: 10 }}
                  fullWidth
                />
              </Grid>
              
              <Grid item xs={12}>
                <Box display="flex" alignItems="center">
                  <Typography gutterBottom>
                    Charge (e)
                  </Typography>
                  <Tooltip title="The charge of each particle in elementary charge units">
                    <InfoIconStyled />
                  </Tooltip>
                </Box>
                <Slider
                  value={params.charge}
                  onChange={handleSliderChange('charge')}
                  step={0.1}
                  min={0.1}
                  max={2.0}
                  valueLabelDisplay="auto"
                />
                <TextField
                  value={params.charge}
                  onChange={handleChange('charge')}
                  size="small"
                  type="number"
                  inputProps={{ step: 0.1, min: 0.1, max: 2.0 }}
                  fullWidth
                />
              </Grid>
              
              <Grid item xs={12}>
                <Box display="flex" alignItems="center">
                  <Typography gutterBottom>
                    Cluster Radius (m)
                  </Typography>
                  <Tooltip title="The approximate radius of the cluster in meters">
                    <InfoIconStyled />
                  </Tooltip>
                </Box>
                <TextField
                  value={formatScientific(params.cluster_radius)}
                  onChange={handleChange('cluster_radius')}
                  size="small"
                  fullWidth
                />
              </Grid>
              
              <Grid item xs={12}>
                <Box display="flex" alignItems="center">
                  <Typography gutterBottom>
                    Grid Resolution
                  </Typography>
                  <Tooltip title="The resolution of the 3D grid for potential field calculation">
                    <InfoIconStyled />
                  </Tooltip>
                </Box>
                <Slider
                  value={params.grid_resolution}
                  onChange={handleSliderChange('grid_resolution')}
                  step={10}
                  min={20}
                  max={100}
                  marks={[
                    { value: 20, label: '20' },
                    { value: 50, label: '50' },
                    { value: 100, label: '100' }
                  ]}
                  valueLabelDisplay="auto"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Button 
                  variant="contained" 
                  fullWidth 
                  onClick={handleGenerateVisualization}
                  disabled={loading}
                >
                  {loading ? 'Generating...' : 'Generate Visualization'}
                </Button>
              </Grid>
            </Grid>
            
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
            
            {visualizationData && (
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2">
                    Cluster Metadata
                  </Typography>
                  <ExportButton 
                    data={visualizationData} 
                    buttonText="Export Data" 
                    fileName={`cluster_${params.num_particles}_particles`}
                    showCSV={false} 
                    showJSON={true}
                  />
                </Box>
                <Typography variant="body2">
                  Grid Resolution: {visualizationData.metadata.grid_resolution}
                </Typography>
                <Typography variant="body2">
                  Calculation Time: {visualizationData.metadata.calculation_time_ms.toFixed(2)} ms
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: 400 }}>
            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <CircularProgress />
              </Box>
            ) : (
              <Box width="100%" height="100%">
                <canvas 
                  ref={canvasRef} 
                  style={{ width: '100%', height: '100%' }}
                />
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ClusterVisualizationPanel; 