import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress,
  Tooltip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import InfoIcon from '@mui/icons-material/Info';
import {
  CONSTANTS,
  ELEMENT_PROPERTIES,
  calculateTunnelingProbability,
  calculateOscillationAmplitude
} from '../../utils/physicsConstants';

// Styled components
const VisualizationContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  position: 'relative',
  height: '400px',
  overflow: 'hidden',
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

const InfoOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(2),
  right: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  zIndex: 10,
}));

const ProbabilityLabel = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: theme.spacing(2),
  left: theme.spacing(2),
  padding: theme.spacing(1),
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  borderRadius: theme.shape.borderRadius,
  zIndex: 10,
}));

/**
 * TunnelingVisualization Component
 * 
 * Visualizes quantum tunneling effects between atoms in the lattice
 */
const TunnelingVisualization = ({ simulationParameters }) => {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const frameIdRef = useRef(null);
  const nucleiRef = useRef([]);
  const waveFunction = useRef(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [tunnelingProbability, setTunnelingProbability] = useState(0);
  
  // Extract simulation parameters
  const {
    T = 300,
    lambda = 1e-10,
    r0 = 1e-10,
    k_spring = 1000,
    potential = 'harmonic'
  } = simulationParameters || {};
  
  // Initialize the scene
  const initScene = useCallback(() => {
    if (!containerRef.current) return;
    
    // Clean up previous scene
    if (rendererRef.current) {
      containerRef.current.removeChild(rendererRef.current.domElement);
    }
    
    // Get container dimensions
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    // Create new scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    sceneRef.current = scene;
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 15);
    cameraRef.current = camera;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Add controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);
    
    // Create visualization elements
    createVisualizationElements();
    
    setIsLoading(false);
  }, []);
  
  // Create visualization elements based on current parameters
  const createVisualizationElements = useCallback(() => {
    if (!sceneRef.current) return;
    
    const scene = sceneRef.current;
    
    // Clear previous elements
    while (scene.children.length > 0) {
      scene.remove(scene.children[0]);
    }
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);
    
    // Create nuclei (deuterium and palladium)
    const pdGeometry = new THREE.SphereGeometry(2, 32, 32);
    const pdMaterial = new THREE.MeshPhongMaterial({ 
      color: ELEMENT_PROPERTIES.Pd.color,
      shininess: 80
    });
    
    const dGeometry = new THREE.SphereGeometry(1, 24, 24);
    const dMaterial = new THREE.MeshPhongMaterial({ 
      color: ELEMENT_PROPERTIES.D.color,
      shininess: 100,
      emissive: 0x0044cc,
      emissiveIntensity: 0.2
    });
    
    // Place two palladium atoms
    const pd1 = new THREE.Mesh(pdGeometry, pdMaterial);
    pd1.position.set(-4, 0, 0);
    scene.add(pd1);
    
    const pd2 = new THREE.Mesh(pdGeometry, pdMaterial);
    pd2.position.set(4, 0, 0);
    scene.add(pd2);
    
    // Place deuterium atoms
    const d1 = new THREE.Mesh(dGeometry, dMaterial);
    d1.position.set(-2, 0, 0);
    scene.add(d1);
    
    const d2 = new THREE.Mesh(dGeometry, dMaterial);
    d2.position.set(2, 0, 0);
    scene.add(d2);
    
    nucleiRef.current = [pd1, pd2, d1, d2];
    
    // Create barrier/potential curve
    const potentialCurve = createPotentialCurve();
    scene.add(potentialCurve);
    
    // Create wave function visualization
    const waveFunc = createWaveFunction();
    scene.add(waveFunc);
    waveFunction.current = waveFunc;
    
    // Add coordinate axes for reference
    const axesHelper = new THREE.AxesHelper(10);
    axesHelper.position.set(0, -6, 0);
    scene.add(axesHelper);
    
    // Calculate tunneling probability
    const probability = calculateTunnelingProbability(
      lambda, r0, T, k_spring, potential
    );
    
    // This would be an extremely small number, so we scale for visualization
    setTunnelingProbability(probability);
    
  }, [T, lambda, r0, k_spring, potential]);
  
  // Create curve showing potential barrier
  const createPotentialCurve = useCallback(() => {
    // Create points for the curve based on potential model
    const points = [];
    const segmentCount = 100;
    const width = 10;
    
    // Morse or Harmonic potential
    const isMorse = potential === 'morse';
    
    // Parameters for potential calculation
    const De = 1.0; // Dissociation energy (for Morse potential)
    const alpha = 1.0; // Width parameter (for Morse potential)
    const centerPosition = 0;
    
    // Calculate potential curve points
    for (let i = 0; i <= segmentCount; i++) {
      const x = (i / segmentCount) * width - width / 2;
      let y;
      
      if (isMorse) {
        // Morse potential: V(r) = De * (1 - exp(-alpha*(r-re)))^2
        const r = Math.abs(x - centerPosition);
        y = De * Math.pow(1 - Math.exp(-alpha * (r - r0 * 1e10)), 2);
        
        // Add Coulomb barrier spike when approaching close
        if (r < 2) {
          y += 10 * Math.exp(-r * 2);
        }
      } else {
        // Harmonic potential: V(r) = 0.5 * k * (r-re)^2
        const r = x - centerPosition;
        y = 0.5 * k_spring * 1e-10 * Math.pow(r, 2);
        
        // Add Coulomb barrier
        if (Math.abs(r) < 1) {
          y += 5 * Math.exp(-Math.abs(r) * 5);
        }
      }
      
      // Scale for visualization
      y = Math.min(y * 0.5, 5);
      
      points.push(new THREE.Vector3(x, -y - 3, 0));
    }
    
    // Create curve geometry
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ 
      color: 0x333333, 
      linewidth: 2
    });
    
    return new THREE.Line(geometry, material);
  }, [potential, r0, k_spring]);
  
  // Create visualization of wave function/probability density
  const createWaveFunction = useCallback(() => {
    // Create points for the wave function visualization
    const points = [];
    const segmentCount = 100;
    const width = 10;
    
    // Parameters affecting the wave function shape
    const centerPosition = 0;
    const amplitude = calculateOscillationAmplitude(k_spring, T) * 1e11; // Scale for visualization
    const scaledLambda = lambda * 1e11 * 10; // Scale for visualization
    
    // Calculate wave function points
    for (let i = 0; i <= segmentCount; i++) {
      const x = (i / segmentCount) * width - width / 2;
      
      // Gaussian-like wave packet
      const distance = Math.abs(x - centerPosition);
      let y = amplitude * Math.exp(-distance / scaledLambda) * 
              Math.cos(distance * 2 * Math.PI / scaledLambda);
      
      // Add to points array
      points.push(new THREE.Vector3(x, y - 3, 0));
    }
    
    // Create curve geometry
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ 
      color: 0x0088ff, 
      linewidth: 2
    });
    
    return new THREE.Line(geometry, material);
  }, [T, lambda, k_spring]);
  
  // Animation loop
  const animate = useCallback(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
    
    const time = performance.now() * 0.001; // seconds
    setElapsedTime(time);
    
    // Animate deuterium atoms (quantum oscillation)
    if (nucleiRef.current.length >= 4) {
      const d1 = nucleiRef.current[2];
      const d2 = nucleiRef.current[3];
      
      // Oscillation based on spring constant and temperature
      const oscillationAmplitude = calculateOscillationAmplitude(k_spring, T) * 1e11;
      const scaledAmplitude = Math.min(oscillationAmplitude, 0.5);
      
      // Update positions
      d1.position.x = -2 + Math.sin(time * 10) * scaledAmplitude;
      d2.position.x = 2 + Math.sin(time * 10 + Math.PI) * scaledAmplitude;
      
      // Determine if tunneling occurs (very rare event)
      const randomValue = Math.random();
      const scaledProbability = tunnelingProbability * 1e20; // Scale up for visualization
      
      // If tunneling occurs (very rare), animate a tunneling event
      if (randomValue < scaledProbability * 0.1) {
        // Tunneling animation code
        const tunnelingDuration = 1; // seconds
        
        // Animate over time
        const animateTunneling = (startTime) => {
          const elapsed = (performance.now() * 0.001) - startTime;
          const progress = Math.min(elapsed / tunnelingDuration, 1);
          
          if (progress < 1) {
            // Calculate position during tunneling
            const startX = d1.position.x;
            const endX = d2.position.x;
            d1.position.x = startX + (endX - startX) * progress;
            
            // Schedule next frame
            requestAnimationFrame(() => animateTunneling(startTime));
          } else {
            // Reset position after tunneling
            d1.position.x = -2 + Math.sin(time * 10) * scaledAmplitude;
          }
        };
        
        // Start tunneling animation
        animateTunneling(time);
      }
    }
    
    // Animate wave function
    if (waveFunction.current) {
      const waveFunc = waveFunction.current;
      const positions = waveFunc.geometry.attributes.position.array;
      
      // Update wave function shape
      for (let i = 0; i <= 100; i++) {
        const x = (i / 100) * 10 - 5;
        const distance = Math.abs(x);
        
        // Oscillating wave packet with tunneling effects
        const scaledLambda = lambda * 1e11 * 10;
        const amplitude = calculateOscillationAmplitude(k_spring, T) * 1e11;
        
        // Add time dependence
        const phase = time * 5;
        const y = amplitude * Math.exp(-distance / scaledLambda) * 
                Math.cos(distance * 2 * Math.PI / scaledLambda + phase);
        
        positions[i * 3 + 1] = y - 3;
      }
      
      waveFunc.geometry.attributes.position.needsUpdate = true;
    }
    
    // Update controls and render
    controlsRef.current.update();
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    
    // Schedule next frame
    frameIdRef.current = requestAnimationFrame(animate);
  }, [T, lambda, k_spring, tunnelingProbability]);
  
  // Handle window resize
  const handleResize = useCallback(() => {
    if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
    
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    
    rendererRef.current.setSize(width, height);
  }, []);
  
  // Initialize scene on component mount
  useEffect(() => {
    initScene();
    
    // Add event listener for window resize
    window.addEventListener('resize', handleResize);
    
    // Start animation loop
    frameIdRef.current = requestAnimationFrame(animate);
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [initScene, handleResize, animate]);
  
  // Update visualization when parameters change
  useEffect(() => {
    createVisualizationElements();
  }, [createVisualizationElements, T, lambda, r0, k_spring, potential]);
  
  // Format tunneling probability for display
  const formatProbability = (probability) => {
    if (probability === 0) return '0';
    return probability.toExponential(6);
  };
  
  return (
    <VisualizationContainer ref={containerRef}>
      {isLoading && (
        <LoadingOverlay>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Initializing quantum tunneling visualization...
          </Typography>
        </LoadingOverlay>
      )}
      
      <InfoOverlay>
        <Tooltip title="This visualization shows quantum tunneling effects between deuterium atoms. The wave function represents probability density, and the curve below shows the potential energy barrier.">
          <InfoIcon color="primary" />
        </Tooltip>
      </InfoOverlay>
      
      <ProbabilityLabel>
        <Typography variant="body2" fontWeight="bold">
          Tunneling Probability: {formatProbability(tunnelingProbability)}
        </Typography>
        <Typography variant="caption">
          Temperature: {T} K | λ: {lambda.toExponential(2)} m | Model: {potential}
        </Typography>
      </ProbabilityLabel>
    </VisualizationContainer>
  );
};

export default TunnelingVisualization; 