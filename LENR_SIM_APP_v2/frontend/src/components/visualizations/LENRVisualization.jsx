import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, Tabs, Tab, Typography, FormGroup, FormControlLabel, Switch, CircularProgress,
  IconButton, Tooltip as MuiTooltip, Paper, Divider, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import ThreeDRotationIcon from '@mui/icons-material/ThreeDRotation';
import HomeIcon from '@mui/icons-material/Home';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { EnergyFlowVisualizer } from './FluidDynamicsEffects';
import { QuantumFluxEffect, ScaleBar, FluxMode } from './QuantumFluxVisualization';
import VisualizationLegend from './VisualizationLegend';

/**
 * LENR Visualization Component
 * 
 * Renders 3D visualization of the lattice and reaction sites,
 * plus charts showing energy output and other parameters over time
 */
const LENRVisualization = ({
  parameters,
  timeSeriesData,
  comparisonData
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [visOptions, setVisOptions] = useState({
    showLattice: parameters?.showLattice ?? true,
    showHotSpots: parameters?.showHotSpots ?? true,
    showEnergyFlow: parameters?.showEnergyFlow ?? true
  });
  const [isSceneReady, setIsSceneReady] = useState(false);
  
  // Quantum flux visualization state
  const [showQuantumFlux, setShowQuantumFlux] = useState(true);
  const [quantumFluxMode, setQuantumFluxMode] = useState(FluxMode.ELECTRON_SCREENING);
  const [showLegend, setShowLegend] = useState(true);
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  
  const containerRef = useRef();
  const canvasRef = useRef();
  const rendererRef = useRef();
  const sceneRef = useRef();
  const cameraRef = useRef();
  const controlsRef = useRef();
  const frameRef = useRef();
  const isInitializedRef = useRef(false);
  const energyFlowRef = useRef(null);
  const lastAnimationTimeRef = useRef(0);
  
  // Quantum flux visualization refs
  const quantumFluxRef = useRef(null);
  const scaleBarRef = useRef(null);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Handle visualization options change
  const handleVisOptionChange = (option) => (event) => {
    setVisOptions({
      ...visOptions,
      [option]: event.target.checked
    });
  };
  
  // 3D Navigation control handlers
  const handleZoomIn = () => {
    if (cameraRef.current && controlsRef.current) {
      const camera = cameraRef.current;
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      camera.position.add(direction.multiplyScalar(5));
      controlsRef.current.update();
    }
  };
  
  const handleZoomOut = () => {
    if (cameraRef.current && controlsRef.current) {
      const camera = cameraRef.current;
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      camera.position.sub(direction.multiplyScalar(5));
      controlsRef.current.update();
    }
  };
  
  const handleResetView = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(30, 30, 30);
      cameraRef.current.lookAt(0, 0, 0);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };
  
  const handleCenterView = () => {
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };
  
  const handleAutoRotate = () => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = !controlsRef.current.autoRotate;
      controlsRef.current.autoRotateSpeed = 2.0;
    }
  };
  
  // Scale settings for LENR (nanometer lattice scale)
  const scaleInfo = useMemo(() => {
    const gridSize = 10; // 10 unit grid
    const realWorldSize = parameters?.grainSize ? parameters.grainSize * 1e-9 : 50e-9; // Default 50nm grain
    return {
      gridSize,
      scaleUnit: 'nm',
      realWorldSize,
    };
  }, [parameters?.grainSize]);
  
  // Calculate LENR-specific statistics for the legend
  const currentStats = useMemo(() => {
    const latticeData = timeSeriesData?.lattice || null;
    const results = timeSeriesData?.results || {};
    
    // Count particles by type
    const particleCounts = {};
    let hotspotCount = 0;
    
    if (latticeData?.points) {
      latticeData.points.forEach(point => {
        const element = point.element?.toLowerCase() || 'unknown';
        particleCounts[element] = (particleCounts[element] || 0) + 1;
        if (point.reaction_rate > 0.05) {
          hotspotCount++;
        }
      });
    }
    
    return {
      particleCounts,
      stats: {
        totalParticles: latticeData?.points?.length || 0,
        hotspotCount,
        loadingRatio: parameters?.loadingRatio || 0.85,
        enhancementFactor: results?.total_enhancement || 1.0,
        defectDensity: parameters?.defectDensity || 0.1,
        temperature: parameters?.temperature || 300,
        screeningEnhancement: results?.individual_factors?.electron_screening || 1.0,
        phononCoupling: results?.individual_factors?.phonon_assisted || 1.0,
      }
    };
  }, [timeSeriesData, parameters]);
  
  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current || isInitializedRef.current) return;
    
    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x1a1a2e); // Dark blue-gray background
    
    // Add ambient and directional lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Create camera - positioned further back to see the full lattice
    const aspectRatio = containerRef.current.clientWidth / containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(60, aspectRatio, 0.1, 1000);
    camera.position.set(30, 30, 30);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;
    
    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;
    
    // Add coordinate axes helper
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);
    
    // Initialize energy flow visualizer
    const energyFlow = new EnergyFlowVisualizer({
      particleCount: 80,
      speed: 0.015,
      particleSize: 0.08
    });
    scene.add(energyFlow.getGroup());
    energyFlowRef.current = energyFlow;
    
    // Initialize QuantumFluxEffect for LENR-specific visualizations
    const quantumFlux = new QuantumFluxEffect({
      mode: FluxMode.ELECTRON_SCREENING,
      resolution: 10,
      size: 12,
      opacity: 0.6,
      screeningLength: 2.5,
      temperature: parameters?.temperature || 300,
      latticeConstant: 1.5, // Lattice spacing for visualization
    });
    quantumFlux.initialize(); // IMPORTANT: Initialize before adding to scene
    scene.add(quantumFlux.getGroup());
    quantumFluxRef.current = quantumFlux;
    
    // Initialize ScaleBar for LENR scale reference (nanometer scale)
    const scaleBar = new ScaleBar({
      length: 5,
      realWorldScale: 5e-9, // 5 nm
      position: new THREE.Vector3(-8, -8, 0),
      color: 0x88ccff,
    });
    scaleBar.initialize(); // IMPORTANT: Initialize before adding to scene
    scene.add(scaleBar.getGroup());
    scaleBarRef.current = scaleBar;
    
    // Add enhanced grid helpers for LENR lattice context
    const gridXY = new THREE.GridHelper(20, 10, 0x444466, 0x222244);
    gridXY.rotation.x = Math.PI / 2;
    gridXY.position.z = -10;
    gridXY.material.transparent = true;
    gridXY.material.opacity = 0.3;
    scene.add(gridXY);
    
    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      
      // Calculate delta time for smooth animations
      const now = performance.now();
      const deltaTime = (now - (lastAnimationTimeRef.current || now)) / 1000;
      lastAnimationTimeRef.current = now;
      
      controls.update();
      
      // Update energy flow animation
      if (energyFlowRef.current && visOptions.showEnergyFlow) {
        energyFlowRef.current.update(deltaTime);
      }
      
      // Update quantum flux animation
      if (quantumFluxRef.current) {
        quantumFluxRef.current.update(deltaTime);
      }
      
      renderer.render(scene, camera);
    };
    
    lastAnimationTimeRef.current = performance.now();
    animate();
    isInitializedRef.current = true;
    setIsSceneReady(true);
    
    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      
      renderer.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameRef.current);
      
      // Dispose energy flow visualizer
      if (energyFlowRef.current) {
        energyFlowRef.current.dispose();
      }
      
      // Dispose quantum flux visualizer
      if (quantumFluxRef.current) {
        quantumFluxRef.current.dispose();
      }
      
      // Dispose scale bar
      if (scaleBarRef.current) {
        scaleBarRef.current.dispose();
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      
      if (sceneRef.current) {
        // Dispose of all geometries and materials
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
  
  // Toggle quantum flux visibility
  useEffect(() => {
    if (quantumFluxRef.current) {
      quantumFluxRef.current.getGroup().visible = showQuantumFlux;
    }
  }, [showQuantumFlux]);
  
  // Update quantum flux mode
  useEffect(() => {
    if (quantumFluxRef.current) {
      quantumFluxRef.current.setMode(quantumFluxMode);
    }
  }, [quantumFluxMode]);
  
  // Update quantum flux parameters when simulation parameters change
  useEffect(() => {
    if (quantumFluxRef.current && parameters) {
      quantumFluxRef.current.updateParameters({
        temperature: parameters.temperature || 300,
        screeningLength: 2.5,
        latticeConstant: 1.5,
      });
    }
  }, [parameters?.temperature]);
  
  // Generate fallback lattice data if none provided
  const generateFallbackLattice = () => {
    const dimension = 4;
    const points = [];
    const connections = [];
    let idx = 0;
    
    for (let x = 0; x < dimension; x++) {
      for (let y = 0; y < dimension; y++) {
        for (let z = 0; z < dimension; z++) {
          const isHost = (x + y + z) % 2 === 0;
          points.push({
            position: [(x - dimension/2) * 1.5, (y - dimension/2) * 1.5, (z - dimension/2) * 1.5],
            element: isHost ? 'nickel' : 'hydrogen',
            reaction_rate: Math.random() * 0.1
          });
          
          if (x > 0) connections.push([idx, idx - dimension * dimension]);
          if (y > 0) connections.push([idx, idx - dimension]);
          if (z > 0) connections.push([idx, idx - 1]);
          idx++;
        }
      }
    }
    
    return { points, connections, dimensions: [6, 6, 6] };
  };

  // Update visualization when data or options change
  useEffect(() => {
    if (!sceneRef.current || !isSceneReady) return;
    
    const scene = sceneRef.current;
    
    // Track animation frame IDs for cleanup
    const animationFrameIds = [];
    
    // Clear previous visualization components
    scene.children = scene.children.filter(child => 
      child.type === 'AmbientLight' || 
      child.type === 'DirectionalLight' || 
      child.type === 'AxesHelper'
    );
    
    // Get the current lattice state (use fallback if not available)
    const latticeData = timeSeriesData?.lattice || generateFallbackLattice();
    
    if (visOptions.showLattice && latticeData.points && latticeData.points.length > 0) {
      // Create lattice structure
      const latticeGroup = new THREE.Group();
      latticeGroup.name = 'lattice';
      
      // Calculate bounding box to scale the lattice appropriately
      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      
      latticeData.points.forEach(point => {
        const [x, y, z] = point.position;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
      });
      
      // Calculate scale factor to fit in a 10-unit box
      const rangeX = (maxX - minX) || 1;
      const rangeY = (maxY - minY) || 1;
      const rangeZ = (maxZ - minZ) || 1;
      const maxRange = Math.max(rangeX, rangeY, rangeZ);
      const scaleFactor = maxRange > 0 && isFinite(maxRange) ? 10 / maxRange : 1;
      
      // Calculate center offset
      const centerX = isFinite(minX) && isFinite(maxX) ? (minX + maxX) / 2 : 0;
      const centerY = isFinite(minY) && isFinite(maxY) ? (minY + maxY) / 2 : 0;
      const centerZ = isFinite(minZ) && isFinite(maxZ) ? (minZ + maxZ) / 2 : 0;
      
      // Material for lattice points based on material type
      const getMaterialColor = (element) => {
        switch(element.toLowerCase()) {
          case 'nickel': return 0x4682b4; // Steel blue
          case 'palladium': return 0x8b8b8b; // Gray
          case 'hydrogen': return 0x32cd32; // Lime green (visible!)
          case 'deuterium': return 0x00ced1; // Dark cyan
          case 'platinum': return 0x808080; // Gray
          case 'titanium': return 0x696969; // Dim gray
          case 'lithium': return 0x20b2aa; // Light sea green
          default: return 0xff6347; // Tomato (visible default)
        }
      };
      
      // Add lattice points - reuse materials by element type to prevent memory leaks
      const sphereRadius = 0.3; // Larger radius for visibility
      const pointGeometry = new THREE.SphereGeometry(sphereRadius, 16, 16);
      const materialCache = {};
      
      latticeData.points.forEach((point) => {
        const elementKey = point.element.toLowerCase();
        // Reuse material if already created for this element type
        if (!materialCache[elementKey]) {
          materialCache[elementKey] = new THREE.MeshPhongMaterial({ 
            color: getMaterialColor(point.element),
            shininess: 100
          });
        }
        
        const sphere = new THREE.Mesh(pointGeometry, materialCache[elementKey]);
        // Scale and center the position
        const scaledX = (point.position[0] - centerX) * scaleFactor;
        const scaledY = (point.position[1] - centerY) * scaleFactor;
        const scaledZ = (point.position[2] - centerZ) * scaleFactor;
        
        sphere.position.set(scaledX, scaledY, scaledZ);
        latticeGroup.add(sphere);
      });
      
      // Store scale info for connections and hotspots
      latticeGroup.userData = { scaleFactor, centerX, centerY, centerZ };
      
      // Add connections between points
      const connectionMaterial = new THREE.LineBasicMaterial({ color: 0x444444, opacity: 0.6, transparent: true });
      
      latticeData.connections.forEach(connection => {
        const [i, j] = connection;
        if (i < latticeData.points.length && j < latticeData.points.length) {
          const start = latticeData.points[i].position;
          const end = latticeData.points[j].position;
          
          // Apply the same scaling transformation
          const scaledStart = new THREE.Vector3(
            (start[0] - centerX) * scaleFactor,
            (start[1] - centerY) * scaleFactor,
            (start[2] - centerZ) * scaleFactor
          );
          const scaledEnd = new THREE.Vector3(
            (end[0] - centerX) * scaleFactor,
            (end[1] - centerY) * scaleFactor,
            (end[2] - centerZ) * scaleFactor
          );
          
          const geometry = new THREE.BufferGeometry().setFromPoints([scaledStart, scaledEnd]);
          const line = new THREE.Line(geometry, connectionMaterial);
          latticeGroup.add(line);
        }
      });
      
      scene.add(latticeGroup);
      
      // Force a render to ensure the scene updates
      if (rendererRef.current && cameraRef.current) {
        rendererRef.current.render(scene, cameraRef.current);
      }
    }
    
    if (visOptions.showHotSpots) {
      // Create hot spots based on reaction rates
      const hotSpotsGroup = new THREE.Group();
      hotSpotsGroup.name = 'hotSpots';
      
      // Get scaling info from lattice group if available
      const latticeGroupObj = scene.getObjectByName('lattice');
      const scaleInfo = latticeGroupObj?.userData || { scaleFactor: 1, centerX: 0, centerY: 0, centerZ: 0 };
      const { scaleFactor: sf, centerX: cx, centerY: cy, centerZ: cz } = scaleInfo;
      
      const hotSpotGeometry = new THREE.SphereGeometry(0.3, 16, 16);
      const hotSpotMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff4500, 
        transparent: true,
        opacity: 0.7 
      });
      
      // Add hot spots at points with high reaction rates - clone material for each to allow independent opacity
      latticeData.points.forEach(point => {
        if (point.reaction_rate > 0.05) {
          const scale = 0.5 + (point.reaction_rate * 3); // Scale based on reaction rate
          
          const hotSpot = new THREE.Mesh(hotSpotGeometry, hotSpotMaterial.clone());
          // Apply the same scaling transformation
          const scaledX = (point.position[0] - cx) * sf;
          const scaledY = (point.position[1] - cy) * sf;
          const scaledZ = (point.position[2] - cz) * sf;
          hotSpot.position.set(scaledX, scaledY, scaledZ);
          hotSpot.scale.set(scale, scale, scale);
          
          // Add pulsing animation data
          hotSpot.userData = {
            originalScale: scale,
            pulsePhase: Math.random() * Math.PI * 2
          };
          
          hotSpotsGroup.add(hotSpot);
        }
      });
      
      scene.add(hotSpotsGroup);
      
      // Animate hot spots with pulsing effect
      let hotSpotsAnimationId = null;
      const animateHotSpots = () => {
        const hotSpots = scene.getObjectByName('hotSpots');
        if (hotSpots) {
          const time = Date.now() * 0.001; // Convert to seconds
          
          hotSpots.children.forEach(hotSpot => {
            const { originalScale, pulsePhase } = hotSpot.userData;
            
            // Calculate pulsing scale factor
            const pulseFactor = Math.sin(time * 2 + pulsePhase) * 0.2 + 1;
            const newScale = originalScale * pulseFactor;
            
            hotSpot.scale.set(newScale, newScale, newScale);
          });
        }
        
        hotSpotsAnimationId = requestAnimationFrame(animateHotSpots);
      };
      
      hotSpotsAnimationId = requestAnimationFrame(animateHotSpots);
      animationFrameIds.push({ getId: () => hotSpotsAnimationId });
    }
    
    if (visOptions.showEnergyFlow) {
      // Create energy flow visualization
      const energyFlowGroup = new THREE.Group();
      energyFlowGroup.name = 'energyFlow';
      
      // Create energy particles based on temperature
      const particleGeometry = new THREE.BufferGeometry();
      const particleCount = 100;
      const particlePositions = new Float32Array(particleCount * 3);
      const particleSizes = new Float32Array(particleCount);
      
      // Use scaled bounds (10 units after scaling)
      const bounds = 5; // half of 10-unit box
      
      // Initialize particles with random positions within the scaled bounds
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        particlePositions[i3] = (Math.random() - 0.5) * bounds * 2;
        particlePositions[i3 + 1] = (Math.random() - 0.5) * bounds * 2;
        particlePositions[i3 + 2] = (Math.random() - 0.5) * bounds * 2;
        
        particleSizes[i] = Math.random() * 2 + 0.5;
      }
      
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
      particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
      
      // Shader material for energy particles
      const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
          color: { value: new THREE.Color(0xffff00) },
        },
        vertexShader: `
          attribute float size;
          varying vec3 vColor;
          void main() {
            vColor = vec3(1.0, 1.0, 0.5); // Light yellow
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 color;
          varying vec3 vColor;
          void main() {
            // Create a circular particle
            float r = 0.0;
            float delta = 0.0;
            float alpha = 1.0;
            vec2 cxy = 2.0 * gl_PointCoord - 1.0;
            r = dot(cxy, cxy);
            if (r > 1.0) {
                discard;
            }
            // Fade out towards the edge
            alpha = 1.0 - smoothstep(0.8, 1.0, r);
            gl_FragColor = vec4(vColor, alpha);
          }
        `,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true
      });
      
      const particles = new THREE.Points(particleGeometry, particleMaterial);
      energyFlowGroup.add(particles);
      
      scene.add(energyFlowGroup);
      
      // Animate energy particles
      let energyFlowAnimationId = null;
      const animateEnergyFlow = () => {
        const energyFlow = scene.getObjectByName('energyFlow');
        if (energyFlow) {
          const energyParticles = energyFlow.children[0];
          const positions = energyParticles.geometry.attributes.position.array;
          
          for (let i = 0; i < positions.length; i += 3) {
            // Move particles along small random paths
            positions[i] += (Math.random() - 0.5) * 0.1;
            positions[i + 1] += (Math.random() - 0.5) * 0.1;
            positions[i + 2] += (Math.random() - 0.5) * 0.1;
            
            // Keep particles within scaled bounds (5 units = half of 10-unit box)
            const bound = 5;
            positions[i] = Math.max(-bound, Math.min(bound, positions[i]));
            positions[i + 1] = Math.max(-bound, Math.min(bound, positions[i + 1]));
            positions[i + 2] = Math.max(-bound, Math.min(bound, positions[i + 2]));
          }
          
          energyParticles.geometry.attributes.position.needsUpdate = true;
        }
        
        energyFlowAnimationId = requestAnimationFrame(animateEnergyFlow);
      };
      
      energyFlowAnimationId = requestAnimationFrame(animateEnergyFlow);
      animationFrameIds.push({ getId: () => energyFlowAnimationId });
      
      // Create hotspot-based energy flow paths using EnergyFlowVisualizer
      if (energyFlowRef.current && latticeData.points) {
        // Get lattice scaling info
        const latticeGroup = scene.getObjectByName('lattice');
        const scaleData = latticeGroup?.userData || { scaleFactor: 1, centerX: 0, centerY: 0, centerZ: 0 };
        
        // Find high-activity hotspots
        const hotspots = latticeData.points
          .filter(point => point.reaction_rate > 0.1)
          .map(point => ({
            position: point.position,
            intensity: point.reaction_rate,
            x: (point.position[0] - scaleData.centerX) * scaleData.scaleFactor,
            y: (point.position[1] - scaleData.centerY) * scaleData.scaleFactor,
            z: (point.position[2] - scaleData.centerZ) * scaleData.scaleFactor
          }));
        
        // Create flow paths from hotspots
        energyFlowRef.current.createFlowPathsFromHotspots(hotspots, new THREE.Vector3(0, 0, 0));
      }
    }
    
    // Cleanup all animation frames
    return () => {
      animationFrameIds.forEach(ref => {
        const id = ref.getId();
        if (id) cancelAnimationFrame(id);
      });
    };
  }, [timeSeriesData, visOptions, isSceneReady]);
  
  // Prepare chart data
  const prepareChartData = () => {
    // Default values for chart generation
    const defaultSummary = {
      total_energy: 50,
      average_temperature: 400,
      reaction_rate: 0.05
    };
    
    const summary = timeSeriesData?.summary || defaultSummary;
    const totalTime = timeSeriesData?.time || 10;
    
    // Generate time points
    const timePoints = Array.from({ length: 50 }, (_, i) => i * (totalTime / 49));
    
    // Create chart data with main simulation series
    return timePoints.map((time, index) => {
      // Calculate values based on time progression (this would come from actual simulation data)
      const progress = index / 49;
      const energyOutput = (summary.total_energy || 50) * progress;
      const temperature = (summary.average_temperature || 400) + 
        (Math.random() - 0.5) * 5 * progress;
      const reactionRate = (summary.reaction_rate || 0.05) * progress + 
        (Math.random() - 0.5) * 0.01;
      
      // Get comparison values if available
      let comparisonEnergy, comparisonTemp, comparisonRate;
      
      if (comparisonData?.summary) {
        comparisonEnergy = comparisonData.summary.total_energy * progress;
        comparisonTemp = comparisonData.summary.average_temperature + 
          (Math.random() - 0.5) * 5 * progress;
        comparisonRate = (comparisonData.summary.reaction_rate || 0.05) * progress + 
          (Math.random() - 0.5) * 0.01;
      }
      
      return {
        time: Number(time.toFixed(2)),
        energyOutput: Number(energyOutput.toFixed(2)),
        temperature: Number(temperature.toFixed(2)),
        reactionRate: Number(reactionRate.toFixed(4)),
        comparisonEnergy: comparisonEnergy ? Number(comparisonEnergy.toFixed(2)) : undefined,
        comparisonTemp: comparisonTemp ? Number(comparisonTemp.toFixed(2)) : undefined,
        comparisonRate: comparisonRate ? Number(comparisonRate.toFixed(4)) : undefined
      };
    });
  };
  
  // Format chart data for display
  const chartData = prepareChartData();
  
  // Tab content components
  const renderTabs = () => {
    return (
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="Visualization tabs">
          <Tab label="3D Visualization" />
          <Tab label="Energy Output" />
          <Tab label="Temperature" />
          <Tab label="Reaction Rate" />
        </Tabs>
      </Box>
    );
  };
  
  const render3DVisualization = () => {
    return (
      <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Main 3D canvas container */}
        <Box
          ref={containerRef}
          sx={{
            width: '100%',
            flex: 1,
            minHeight: 300,
            position: 'relative'
          }}
        >
          <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
          
          {/* Layer toggles - top right */}
          <Paper 
            elevation={3}
            sx={{ 
              position: 'absolute', 
              top: 10, 
              right: 10, 
              backgroundColor: 'rgba(30, 30, 50, 0.9)', 
              padding: 1, 
              borderRadius: 1,
              maxWidth: 320
            }}
          >
            <FormGroup row sx={{ flexWrap: 'wrap' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={visOptions.showLattice}
                    onChange={handleVisOptionChange('showLattice')}
                    size="small"
                    color="primary"
                  />
                }
                label={<Typography variant="caption" color="white">Lattice</Typography>}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={visOptions.showHotSpots}
                    onChange={handleVisOptionChange('showHotSpots')}
                    size="small"
                    color="warning"
                  />
                }
                label={<Typography variant="caption" color="white">Hot Spots</Typography>}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={visOptions.showEnergyFlow}
                    onChange={handleVisOptionChange('showEnergyFlow')}
                    size="small"
                    color="info"
                  />
                }
                label={<Typography variant="caption" color="white">Energy Flow</Typography>}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showQuantumFlux}
                    onChange={(e) => setShowQuantumFlux(e.target.checked)}
                    size="small"
                    color="secondary"
                  />
                }
                label={<Typography variant="caption" color="white">Quantum Field</Typography>}
              />
            </FormGroup>
            
            {/* Quantum Flux Mode Selector */}
            {showQuantumFlux && (
              <FormControl size="small" sx={{ mt: 1, minWidth: 150 }}>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Quantum Mode</InputLabel>
                <Select
                  value={quantumFluxMode}
                  onChange={(e) => setQuantumFluxMode(e.target.value)}
                  label="Quantum Mode"
                  sx={{ 
                    color: 'white',
                    '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                    '.MuiSvgIcon-root': { color: 'white' }
                  }}
                >
                  <MenuItem value={FluxMode.ELECTRON_SCREENING}>
                    <MuiTooltip title="Thomas-Fermi screening around nuclei" placement="left">
                      <span>Electron Screening</span>
                    </MuiTooltip>
                  </MenuItem>
                  <MenuItem value={FluxMode.PHONON_MODES}>
                    <MuiTooltip title="Lattice vibration modes (H-metal coupling)" placement="left">
                      <span>Phonon Modes</span>
                    </MuiTooltip>
                  </MenuItem>
                  <MenuItem value={FluxMode.MAGNETIC_DIPOLES}>
                    <MuiTooltip title="Nuclear and electron spin interactions" placement="left">
                      <span>Magnetic Dipoles</span>
                    </MuiTooltip>
                  </MenuItem>
                  <MenuItem value={FluxMode.COULOMB_EXCHANGE}>
                    <MuiTooltip title="Virtual photon exchange at interstitial sites" placement="left">
                      <span>Coulomb Exchange</span>
                    </MuiTooltip>
                  </MenuItem>
                  <MenuItem value={FluxMode.GAMOW_WINDOW}>
                    <MuiTooltip title="Optimal tunneling energy region" placement="left">
                      <span>Gamow Window</span>
                    </MuiTooltip>
                  </MenuItem>
                  <MenuItem value={FluxMode.COMBINED}>
                    <MuiTooltip title="All quantum effects combined" placement="left">
                      <span>Combined Effects</span>
                    </MuiTooltip>
                  </MenuItem>
                </Select>
              </FormControl>
            )}
          </Paper>
          
          {/* Visualization Legend - bottom right overlay */}
          {showLegend && (
            <Box sx={{ position: 'absolute', bottom: 40, right: 10, zIndex: 10 }}>
              <VisualizationLegend
                particleCounts={currentStats?.particleCounts}
                stats={currentStats?.stats}
                collapsed={legendCollapsed}
                onToggleCollapse={() => setLegendCollapsed(!legendCollapsed)}
                showScale={true}
                showQuantumFlux={showQuantumFlux}
                scaleInfo={scaleInfo}
                quantumFluxMode={quantumFluxMode}
                simulationType="lenr"
              />
            </Box>
          )}
          
          {/* 3D Navigation Controls - left side */}
          <Paper
            elevation={3}
            sx={{
              position: 'absolute',
              top: 10,
              left: 10,
              backgroundColor: 'rgba(30, 30, 50, 0.9)',
              borderRadius: 1,
              display: 'flex',
              flexDirection: 'column',
              p: 0.5
            }}
          >
            <MuiTooltip title="Zoom In" placement="right">
              <IconButton size="small" onClick={handleZoomIn} sx={{ color: 'white' }}>
                <ZoomInIcon />
              </IconButton>
            </MuiTooltip>
            <MuiTooltip title="Zoom Out" placement="right">
              <IconButton size="small" onClick={handleZoomOut} sx={{ color: 'white' }}>
                <ZoomOutIcon />
              </IconButton>
            </MuiTooltip>
            <Divider sx={{ my: 0.5, bgcolor: 'rgba(255,255,255,0.2)' }} />
            <MuiTooltip title="Reset View" placement="right">
              <IconButton size="small" onClick={handleResetView} sx={{ color: 'white' }}>
                <HomeIcon />
              </IconButton>
            </MuiTooltip>
            <MuiTooltip title="Center View" placement="right">
              <IconButton size="small" onClick={handleCenterView} sx={{ color: 'white' }}>
                <CenterFocusStrongIcon />
              </IconButton>
            </MuiTooltip>
            <MuiTooltip title="Auto Rotate" placement="right">
              <IconButton size="small" onClick={handleAutoRotate} sx={{ color: 'white' }}>
                <ThreeDRotationIcon />
              </IconButton>
            </MuiTooltip>
          </Paper>
          
          {/* Navigation hint */}
          <Typography
            variant="caption"
            sx={{
              position: 'absolute',
              bottom: 5,
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'rgba(255,255,255,0.6)',
              backgroundColor: 'rgba(0,0,0,0.4)',
              px: 1,
              borderRadius: 1
            }}
          >
            Drag to rotate • Scroll to zoom • Right-click to pan
          </Typography>
        </Box>
        
        {/* Legend/Key */}
        <Paper
          elevation={2}
          sx={{
            mt: 1,
            p: 1.5,
            backgroundColor: 'rgba(30, 30, 50, 0.95)',
            borderRadius: 1
          }}
        >
          <Typography variant="subtitle2" color="white" gutterBottom>
            Visualization Key
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {/* Host Material */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#4682b4' }} />
              <Typography variant="caption" color="white">
                Host Material (Ni/Pd)
              </Typography>
            </Box>
            {/* Hydrogen */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#32cd32' }} />
              <Typography variant="caption" color="white">
                Hydrogen/Deuterium
              </Typography>
            </Box>
            {/* Lattice Bonds */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 20, height: 2, bgcolor: '#444444' }} />
              <Typography variant="caption" color="white">
                Lattice Bonds
              </Typography>
            </Box>
            {/* Hot Spots */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#ff4500', opacity: 0.7 }} />
              <Typography variant="caption" color="white">
                Reaction Hot Spots
              </Typography>
            </Box>
            {/* Energy Flow */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#ffff00', opacity: 0.8 }} />
              <Typography variant="caption" color="white">
                Energy Flow Particles
              </Typography>
            </Box>
            {/* Coordinate Axes */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ display: 'flex', gap: 0.3 }}>
                <Box sx={{ width: 8, height: 3, bgcolor: '#ff0000' }} />
                <Box sx={{ width: 8, height: 3, bgcolor: '#00ff00' }} />
                <Box sx={{ width: 8, height: 3, bgcolor: '#0000ff' }} />
              </Box>
              <Typography variant="caption" color="white">
                Axes (X/Y/Z)
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    );
  };
  
  const renderEnergyChart = () => {
    return (
      <Box sx={{ width: '100%', height: 'calc(100% - 50px)', p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Energy Output Over Time
        </Typography>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              label={{ value: 'Time (s)', position: 'insideBottomRight', offset: -10 }} 
            />
            <YAxis 
              label={{ value: 'Energy Output (J)', angle: -90, position: 'insideLeft' }} 
            />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="energyOutput"
              stroke="#8884d8"
              activeDot={{ r: 8 }}
              name="Current Simulation"
            />
            {comparisonData && (
              <Line
                type="monotone"
                dataKey="comparisonEnergy"
                stroke="#82ca9d"
                activeDot={{ r: 8 }}
                name="Comparison Simulation"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </Box>
    );
  };
  
  const renderTemperatureChart = () => {
    return (
      <Box sx={{ width: '100%', height: 'calc(100% - 50px)', p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Temperature Evolution
        </Typography>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              label={{ value: 'Time (s)', position: 'insideBottomRight', offset: -10 }} 
            />
            <YAxis 
              label={{ value: 'Temperature (K)', angle: -90, position: 'insideLeft' }} 
            />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="temperature"
              stroke="#ff7300"
              activeDot={{ r: 8 }}
              name="Current Simulation"
            />
            {comparisonData && (
              <Line
                type="monotone"
                dataKey="comparisonTemp"
                stroke="#0088fe"
                activeDot={{ r: 8 }}
                name="Comparison Simulation"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </Box>
    );
  };
  
  const renderReactionRateChart = () => {
    return (
      <Box sx={{ width: '100%', height: 'calc(100% - 50px)', p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Reaction Rate
        </Typography>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              label={{ value: 'Time (s)', position: 'insideBottomRight', offset: -10 }} 
            />
            <YAxis 
              label={{ value: 'Reaction Rate', angle: -90, position: 'insideLeft' }} 
            />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="reactionRate"
              stroke="#ff0000"
              activeDot={{ r: 8 }}
              name="Current Simulation"
            />
            {comparisonData && (
              <Line
                type="monotone"
                dataKey="comparisonRate"
                stroke="#00c49f"
                activeDot={{ r: 8 }}
                name="Comparison Simulation"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </Box>
    );
  };
  
  // If no data is available, show a loading spinner
  if (!timeSeriesData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      {renderTabs()}
      
      <Box sx={{ height: 'calc(100% - 48px)' }}>
        {activeTab === 0 && render3DVisualization()}
        {activeTab === 1 && renderEnergyChart()}
        {activeTab === 2 && renderTemperatureChart()}
        {activeTab === 3 && renderReactionRateChart()}
      </Box>
    </Box>
  );
};

LENRVisualization.propTypes = {
  parameters: PropTypes.object,
  timeSeriesData: PropTypes.object,
  comparisonData: PropTypes.object
};

export default LENRVisualization; 