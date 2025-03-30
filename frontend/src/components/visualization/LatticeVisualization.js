import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Box, Paper, Typography, CircularProgress, Chip, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { styled } from '@mui/material/styles';

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

const LatticeVisualization = ({ simulationData, visualizationSettings }) => {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const frameIdRef = useRef(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [visualizationType, setVisualizationType] = useState('lattice'); // lattice, energy, phonon
  const [latticeAtoms, setLatticeAtoms] = useState([]);
  
  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;
    
    // Create camera
    const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.z = 15;
    cameraRef.current = camera;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
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
    
    // Create placeholder lattice visualization
    createPlaceholderLattice();
    
    // Handle resize
    const handleResize = () => {
      if (containerRef.current && cameraRef.current && rendererRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
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
      
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
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
  }, []);
  
  // Create placeholder lattice
  const createPlaceholderLattice = () => {
    setIsLoading(true);
    
    if (!sceneRef.current) return;
    
    // Clear existing lattice atoms
    latticeAtoms.forEach(atom => {
      sceneRef.current.remove(atom);
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
          sceneRef.current.add(pdAtom);
          newLatticeAtoms.push(pdAtom);
          
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
            
            sceneRef.current.add(dAtom);
            newLatticeAtoms.push(dAtom);
          }
        }
      }
    }
    
    setLatticeAtoms(newLatticeAtoms);
    setIsLoading(false);
  };
  
  // Update visualization when simulation data changes
  useEffect(() => {
    if (simulationData) {
      // In a real implementation, we would update the visualization based on real simulation data
      // For now, just show the placeholder
      createPlaceholderLattice();
    }
  }, [simulationData]);
  
  // Update visualization type
  const handleVisualizationTypeChange = (event) => {
    setVisualizationType(event.target.value);
    
    // In a real implementation, we would change the visualization based on type
    // For now, just show different colors
    if (sceneRef.current && latticeAtoms.length > 0) {
      const newColor = 
        event.target.value === 'energy' ? 0xff0000 :
        event.target.value === 'phonon' ? 0x00ff00 : 
        0x909090;
      
      latticeAtoms.forEach(atom => {
        if (atom.material) {
          atom.material.color.set(newColor);
        }
      });
    }
  };
  
  return (
    <VisualizationContainer ref={containerRef}>
      {isLoading && (
        <LoadingOverlay>
          <CircularProgress size={60} />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Loading Visualization...
          </Typography>
        </LoadingOverlay>
      )}
      
      <ControlsOverlay>
        <Chip 
          label={`Atoms: ${latticeAtoms.length}`} 
          size="small" 
          sx={{ backgroundColor: 'white', mb: 1 }}
        />
        
        <FormControl variant="outlined" size="small" sx={{ minWidth: 120, backgroundColor: 'white' }}>
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
            <MenuItem value="phonon">Phonon Activity</MenuItem>
          </Select>
        </FormControl>
      </ControlsOverlay>
    </VisualizationContainer>
  );
};

export default LatticeVisualization; 