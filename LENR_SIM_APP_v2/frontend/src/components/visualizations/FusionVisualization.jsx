import React, { useRef, useEffect, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Box, Typography, Slider, IconButton, Card, CardContent, Switch, FormControlLabel, Tooltip, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { ParticleTrailSystem } from './FluidDynamicsEffects';
import { QuantumFluxEffect, ScaleBar, FluxMode } from './QuantumFluxVisualization';
import VisualizationLegend from './VisualizationLegend';

// Color palette for particles based on energy
const energyColorScale = [
  new THREE.Color(0x0000ff), // Low energy - blue
  new THREE.Color(0x00ffff), // cyan
  new THREE.Color(0x00ff00), // green
  new THREE.Color(0xffff00), // yellow
  new THREE.Color(0xff8000), // orange
  new THREE.Color(0xff0000)  // High energy - red
];

/**
 * Maps a normalized value (0-1) to a color in the energy color scale
 */
function getEnergyColor(normalizedEnergy) {
  // Clamp value between 0 and 1
  const value = Math.max(0, Math.min(normalizedEnergy, 1));
  
  // Calculate position in color scale
  const position = value * (energyColorScale.length - 1);
  const index = Math.floor(position);
  const fraction = position - index;
  
  // If at the end of the scale, return the last color
  if (index >= energyColorScale.length - 1) {
    return energyColorScale[energyColorScale.length - 1];
  }
  
  // Interpolate between two colors
  const color1 = energyColorScale[index];
  const color2 = energyColorScale[index + 1];
  
  return new THREE.Color(
    color1.r + fraction * (color2.r - color1.r),
    color1.g + fraction * (color2.g - color1.g),
    color1.b + fraction * (color2.b - color1.b)
  );
}

/**
 * FusionVisualization component
 * 
 * Renders a 3D visualization of fusion plasma simulation including particles and hotspots
 * Supports time evolution with playback controls
 */
function FusionVisualization({ 
  simulationData, 
  parameters,
  width = '100%',
  height = '500px'
}) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const frameIdRef = useRef(null);
  const particlesRef = useRef(null);
  const hotspotsRef = useRef(null);
  
  // Visualization effects refs
  const quantumFluxRef = useRef(null);
  const scaleBarRef = useRef(null);
  const trailSystemRef = useRef(null);
  const lastAnimationTimeRef = useRef(0);
  
  // Animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const lastUpdateTimeRef = useRef(0);
  
  // Visualization effect toggles
  const [showQuantumFlux, setShowQuantumFlux] = useState(true);
  const [showParticleTrails, setShowParticleTrails] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  const [quantumFluxMode, setQuantumFluxMode] = useState('electron_screening');
  
  // Scale settings (can be derived from parameters)
  const scaleInfo = useMemo(() => {
    // Default: 10 unit grid = 5 nm (typical lattice scale)
    const gridSize = 10;
    const realWorldSize = parameters?.latticeConstant || 5e-9; // Default 5 nm
    return {
      gridSize,
      scaleUnit: 'nm',
      realWorldSize,
    };
  }, [parameters]);
  
  // Calculated values
  const timeSteps = useMemo(() => {
    return simulationData?.timeSteps || [];
  }, [simulationData]);
  
  // Calculate statistics for current time step
  const currentStats = useMemo(() => {
    if (!timeSteps || timeSteps.length === 0 || currentTimeIndex >= timeSteps.length) {
      return null;
    }
    
    const timeStep = timeSteps[currentTimeIndex];
    const particles = timeStep?.particles || [];
    const hotspots = timeStep?.hotspots || [];
    
    // Calculate particle counts by type
    const particleCounts = {};
    let totalEnergy = 0;
    let maxEnergy = 0;
    
    particles.forEach(p => {
      const type = p.type || 'unknown';
      particleCounts[type] = (particleCounts[type] || 0) + 1;
      totalEnergy += p.energy || 0;
      maxEnergy = Math.max(maxEnergy, p.energy || 0);
    });
    
    const avgEnergy = particles.length > 0 ? totalEnergy / particles.length : 0;
    
    // Calculate fusion rate estimate (based on hotspot intensities)
    const totalIntensity = hotspots.reduce((sum, h) => sum + (h.intensity || 0), 0);
    const fusionRate = totalIntensity * 1e12; // Scaled estimate
    
    return {
      particleCounts,
      stats: {
        totalParticles: particles.length,
        hotspotCount: hotspots.length,
        avgEnergy,
        maxEnergy,
        fusionRate,
        temperature: parameters?.temperature || 300,
      }
    };
  }, [timeSteps, currentTimeIndex, parameters]);
  
  const timeLabels = useMemo(() => {
    if (!simulationData?.timeSteps) return [];
    return simulationData.timeSteps.map((step, index) => 
      `${(index * (parameters?.timeStepSize || 0.1)).toFixed(2)} ps`
    );
  }, [simulationData, parameters]);
  
  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75, 
      containerRef.current.clientWidth / containerRef.current.clientHeight, 
      0.1, 
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Add controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controlsRef.current = controls;
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Create container for particles
    const particlesContainer = new THREE.Group();
    scene.add(particlesContainer);
    particlesRef.current = particlesContainer;
    
    // Create container for hotspots
    const hotspotsContainer = new THREE.Group();
    scene.add(hotspotsContainer);
    hotspotsRef.current = hotspotsContainer;
    
    // Initialize quantum flux visualization (physics-based)
    const quantumFlux = new QuantumFluxEffect({
      mode: FluxMode.ELECTRON_SCREENING,
      resolution: 12, // Lower resolution for performance but visible
      size: 8,
      opacity: 0.6, // Higher opacity for visibility
      screeningLength: 2.5,
      temperature: parameters?.temperature || 300,
      debyeFrequency: 1.0,
    });
    quantumFlux.initialize();
    scene.add(quantumFlux.getGroup());
    quantumFluxRef.current = quantumFlux;
    
    // Initialize scale bar
    const scaleBar = new ScaleBar({
      length: 5,
      realWorldScale: 1e-9, // 1 nm per unit
      position: new THREE.Vector3(-4, -4.5, 4),
    });
    scaleBar.initialize();
    scene.add(scaleBar.getGroup());
    scaleBarRef.current = scaleBar;
    
    // Initialize trail system
    trailSystemRef.current = new ParticleTrailSystem({
      trailLength: 20,
      fadeRate: 0.08,
      trailWidth: 2
    });
    
    // Create container for particle trails
    const trailsContainer = new THREE.Group();
    trailsContainer.name = 'particleTrails';
    scene.add(trailsContainer);
    trailSystemRef.current.trailGroup = trailsContainer;
    
    // Add grid helper for spatial reference
    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    gridHelper.position.y = -5;
    scene.add(gridHelper);
    
    // Add secondary grid on XZ plane (vertical reference)
    const gridHelperXZ = new THREE.GridHelper(10, 10, 0x333333, 0x1a1a1a);
    gridHelperXZ.rotation.x = Math.PI / 2;
    gridHelperXZ.position.z = -5;
    scene.add(gridHelperXZ);
    
    // Add bounding box to visualize confinement region with gradient effect
    const boxGeometry = new THREE.BoxGeometry(10, 10, 10);
    const boxMaterial = new THREE.LineBasicMaterial({ 
      color: 0x4488ff,
      transparent: true,
      opacity: 0.4
    });
    const boxWireframe = new THREE.LineSegments(
      new THREE.EdgesGeometry(boxGeometry),
      boxMaterial
    );
    scene.add(boxWireframe);
    
    // Add glowing corner markers for better depth perception
    const cornerGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const cornerMaterial = new THREE.MeshBasicMaterial({ color: 0x4488ff });
    const corners = [
      [-5, -5, -5], [5, -5, -5], [-5, 5, -5], [5, 5, -5],
      [-5, -5, 5], [5, -5, 5], [-5, 5, 5], [5, 5, 5]
    ];
    corners.forEach(([x, y, z]) => {
      const corner = new THREE.Mesh(cornerGeometry, cornerMaterial);
      corner.position.set(x, y, z);
      scene.add(corner);
    });
    
    // Add coordinate axes with custom colors
    const axesHelper = new THREE.AxesHelper(6);
    // Customize axis colors (X=red, Y=green, Z=blue)
    axesHelper.setColors(
      new THREE.Color(0xff4444),  // X axis - red
      new THREE.Color(0x44ff44),  // Y axis - green
      new THREE.Color(0x4444ff)   // Z axis - blue
    );
    scene.add(axesHelper);
    
    // Add axis labels using sprites
    const createAxisLabel = (text, position, color) => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = color;
      ctx.font = 'Bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 32, 16);
      
      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({ 
        map: texture, 
        transparent: true,
        depthTest: false
      });
      const sprite = new THREE.Sprite(material);
      sprite.position.set(...position);
      sprite.scale.set(1, 0.5, 1);
      return sprite;
    };
    
    scene.add(createAxisLabel('X', [6.5, 0, 0], '#ff4444'));
    scene.add(createAxisLabel('Y', [0, 6.5, 0], '#44ff44'));
    scene.add(createAxisLabel('Z', [0, 0, 6.5], '#4444ff'));
    
    // Add origin marker
    const originGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const originMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const origin = new THREE.Mesh(originGeometry, originMaterial);
    scene.add(origin);
    
    // Animation loop
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      
      // Calculate delta time for smooth animations
      const now = performance.now();
      const deltaTime = (now - (lastAnimationTimeRef.current || now)) / 1000;
      lastAnimationTimeRef.current = now;
      
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      // Update quantum flux visualization
      if (quantumFluxRef.current) {
        quantumFluxRef.current.update(deltaTime);
      }
      
      renderer.render(scene, camera);
    };
    
    lastAnimationTimeRef.current = performance.now();
    animate();
    
    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      
      rendererRef.current.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Store ref value for cleanup to avoid stale closure
    const container = containerRef.current;
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      if (rendererRef.current && container) {
        container.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      // Dispose of instanced meshes stored in userData
      if (particlesRef.current?.userData?.instancedMeshes) {
        particlesRef.current.userData.instancedMeshes.forEach(mesh => {
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) mesh.material.dispose();
          if (mesh.instanceColor) mesh.instanceColor = null;
        });
      }
      // Dispose of particles geometry and materials
      if (particlesRef.current) {
        particlesRef.current.children.forEach(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
          // Handle InstancedMesh specifically
          if (child.isInstancedMesh && child.instanceColor) {
            child.instanceColor = null;
          }
        });
      }
      // Dispose of hotspots geometry and materials
      if (hotspotsRef.current) {
        hotspotsRef.current.children.forEach(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
          if (child.isInstancedMesh && child.instanceColor) {
            child.instanceColor = null;
          }
        });
      }
      // Dispose of quantum flux effect
      if (quantumFluxRef.current) {
        quantumFluxRef.current.dispose();
      }
      // Dispose of scale bar
      if (scaleBarRef.current) {
        scaleBarRef.current.dispose();
      }
      // Clear trail system
      if (trailSystemRef.current) {
        trailSystemRef.current.clear();
      }
    };
  }, []);
  
  // Update visualization when time step changes
  useEffect(() => {
    if (!timeSteps || timeSteps.length === 0 || currentTimeIndex >= timeSteps.length) return;
    
    const currentStep = timeSteps[currentTimeIndex];
    updateVisualization(currentStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeSteps, currentTimeIndex, parameters]); // updateVisualization is defined later and stable
  
  // Toggle quantum flux visibility and update mode
  useEffect(() => {
    if (quantumFluxRef.current) {
      quantumFluxRef.current.getGroup().visible = showQuantumFlux;
    }
  }, [showQuantumFlux]);
  
  // Update quantum flux mode
  useEffect(() => {
    if (quantumFluxRef.current && quantumFluxMode) {
      quantumFluxRef.current.setMode(quantumFluxMode);
    }
  }, [quantumFluxMode]);
  
  // Update quantum flux parameters from simulation
  useEffect(() => {
    if (quantumFluxRef.current && parameters) {
      quantumFluxRef.current.updateParameters({
        temperature: parameters.temperature || 300,
        screeningLength: parameters.screeningLength || 2.0,
      });
    }
  }, [parameters]);

  // Control particle trails visibility
  useEffect(() => {
    if (trailSystemRef.current?.trailGroup) {
      trailSystemRef.current.trailGroup.visible = showParticleTrails;
      
      // Clear trails when disabled
      if (!showParticleTrails) {
        trailSystemRef.current.clear();
        const trailGroup = trailSystemRef.current.trailGroup;
        while (trailGroup.children.length > 0) {
          const child = trailGroup.children[0];
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
          trailGroup.remove(child);
        }
      }
    }
  }, [showParticleTrails]);

  // Handle animation playback
  useEffect(() => {
    if (!isPlaying || !timeSteps || timeSteps.length === 0) return;
    
    let animationId = null;
    let isActive = true;
    
    const playbackLoop = () => {
      if (!isActive) return;
      
      const now = Date.now();
      const elapsed = now - lastUpdateTimeRef.current;
      
      // Update time step based on playback speed (milliseconds per step)
      const updateInterval = 1000 / playbackSpeed;
      
      if (elapsed >= updateInterval) {
        setCurrentTimeIndex(prev => {
          if (prev >= timeSteps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
        lastUpdateTimeRef.current = now;
      }
      
      animationId = requestAnimationFrame(playbackLoop);
    };
    
    lastUpdateTimeRef.current = Date.now();
    animationId = requestAnimationFrame(playbackLoop);
    
    return () => {
      isActive = false;
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isPlaying, timeSteps, playbackSpeed]); // Use timeSteps instead of .length for proper reactivity
  
  /**
   * Get particle type configuration (radius, color)
   */
  const getParticleTypeConfig = (type) => {
    const configs = {
      deuterium: { radius: 0.05, color: 0x3498db },   // blue
      tritium: { radius: 0.06, color: 0x2ecc71 },    // green
      helium: { radius: 0.08, color: 0xf1c40f },     // yellow
      proton: { radius: 0.04, color: 0xe74c3c },     // red
      electron: { radius: 0.02, color: 0x9b59b6 },   // purple
    };
    return configs[type] || { radius: 0.05, color: 0xcccccc };
  };

  /**
   * Updates the visualization with data from the current time step
   * Uses InstancedMesh for efficient rendering of many particles
   */
  const updateVisualization = (timeStep) => {
    if (!particlesRef.current || !hotspotsRef.current || !sceneRef.current) return;
    
    // Dispose existing instanced meshes and their resources
    if (particlesRef.current.userData.instancedMeshes) {
      particlesRef.current.userData.instancedMeshes.forEach(mesh => {
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) mesh.material.dispose();
      });
    }
    
    // Clear existing particles
    while (particlesRef.current.children.length > 0) {
      const child = particlesRef.current.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      particlesRef.current.remove(child);
    }
    
    // Clear hotspots
    while (hotspotsRef.current.children.length > 0) {
      const child = hotspotsRef.current.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      hotspotsRef.current.remove(child);
    }
    
    // Create particles using InstancedMesh (default to showing if parameter not explicitly false)
    const showParticles = parameters?.showParticles !== false;
    if (showParticles && timeStep.particles) {
      // Limit number of particles for performance
      const displayCount = Math.min(
        timeStep.particles.length,
        parameters?.maxParticleDisplay || 5000 // Increased limit due to InstancedMesh efficiency
      );
      
      // Find max energy to normalize color scale
      let maxEnergy = 0;
      for (let i = 0; i < timeStep.particles.length; i++) {
        maxEnergy = Math.max(maxEnergy, timeStep.particles[i].energy);
      }
      
      // Group particles by type for instanced rendering
      const particlesByType = {};
      for (let i = 0; i < displayCount; i++) {
        const particle = timeStep.particles[i];
        if (!particlesByType[particle.type]) {
          particlesByType[particle.type] = [];
        }
        particlesByType[particle.type].push(particle);
      }
      
      // Track instanced meshes for cleanup
      const instancedMeshes = [];
      
      // Create InstancedMesh for each particle type
      for (const [type, particles] of Object.entries(particlesByType)) {
        const config = getParticleTypeConfig(type);
        const particleCount = particles.length;
        
        if (particleCount === 0) continue;
        
        // Create shared geometry for this particle type (lower poly for performance)
        const geometry = new THREE.SphereGeometry(config.radius, 6, 6);
        
        // Create material - use MeshPhongMaterial for lighting
        let material;
        if (parameters?.colorByEnergy) {
          // For energy-based coloring, we need per-instance colors
          material = new THREE.MeshPhongMaterial({
            color: 0xffffff, // Base white, will be tinted by instance color
            vertexColors: false,
          });
        } else {
          material = new THREE.MeshPhongMaterial({ color: config.color });
        }
        
        // Create InstancedMesh with the number of particles of this type
        const instancedMesh = new THREE.InstancedMesh(geometry, material, particleCount);
        instancedMesh.name = `InstancedParticles_${type}`;
        
        // Create a dummy object for setting transforms
        const dummy = new THREE.Object3D();
        
        // If coloring by energy, create instance colors
        if (parameters?.colorByEnergy) {
          const colors = new Float32Array(particleCount * 3);
          
          for (let i = 0; i < particleCount; i++) {
            const particle = particles[i];
            
            // Set position
            dummy.position.set(particle.x, particle.y, particle.z);
            dummy.updateMatrix();
            instancedMesh.setMatrixAt(i, dummy.matrix);
            
            // Set color based on energy
            const normalizedEnergy = maxEnergy > 0 ? particle.energy / maxEnergy : 0;
            const color = getEnergyColor(normalizedEnergy);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
          }
          
          // Add instance colors attribute
          instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
        } else {
          // Just set positions without individual colors
          for (let i = 0; i < particleCount; i++) {
            const particle = particles[i];
            dummy.position.set(particle.x, particle.y, particle.z);
            dummy.updateMatrix();
            instancedMesh.setMatrixAt(i, dummy.matrix);
          }
        }
        
        // Mark matrix as needing update
        instancedMesh.instanceMatrix.needsUpdate = true;
        if (instancedMesh.instanceColor) {
          instancedMesh.instanceColor.needsUpdate = true;
        }
        
        // Enable frustum culling for better performance
        instancedMesh.frustumCulled = true;
        
        particlesRef.current.add(instancedMesh);
        instancedMeshes.push(instancedMesh);
      }
      
      // Store reference for cleanup
      particlesRef.current.userData.instancedMeshes = instancedMeshes;
    }
    
    // Create hotspots using InstancedMesh if there are many
    const showHotspots = parameters?.showHotspots !== false;
    if (showHotspots && timeStep.hotspots && timeStep.hotspots.length > 0) {
      const hotspotCount = timeStep.hotspots.length;
      
      if (hotspotCount > 10) {
        // Use InstancedMesh for many hotspots
        const avgIntensity = timeStep.hotspots.reduce((sum, h) => sum + h.intensity, 0) / hotspotCount;
        const geometry = new THREE.SphereGeometry(avgIntensity * 0.5, 12, 12);
        const material = new THREE.MeshPhongMaterial({
          color: 0xffffff,
          emissive: 0xffaa00,
          emissiveIntensity: avgIntensity,
          transparent: true,
          opacity: Math.min(0.7, avgIntensity * 0.5)
        });
        
        const instancedHotspots = new THREE.InstancedMesh(geometry, material, hotspotCount);
        instancedHotspots.name = 'InstancedHotspots';
        
        const dummy = new THREE.Object3D();
        for (let i = 0; i < hotspotCount; i++) {
          const hotspot = timeStep.hotspots[i];
          dummy.position.set(hotspot.x, hotspot.y, hotspot.z);
          // Scale based on intensity
          const scale = hotspot.intensity / avgIntensity;
          dummy.scale.setScalar(scale);
          dummy.updateMatrix();
          instancedHotspots.setMatrixAt(i, dummy.matrix);
        }
        
        instancedHotspots.instanceMatrix.needsUpdate = true;
        hotspotsRef.current.add(instancedHotspots);
      } else {
        // Use individual meshes for few hotspots (more control over appearance)
        for (const hotspot of timeStep.hotspots) {
          const geometry = new THREE.SphereGeometry(hotspot.intensity * 0.5, 16, 16);
          const material = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            emissive: 0xffaa00,
            emissiveIntensity: hotspot.intensity,
            transparent: true,
            opacity: Math.min(0.7, hotspot.intensity * 0.5)
          });
          
          const sphere = new THREE.Mesh(geometry, material);
          sphere.position.set(hotspot.x, hotspot.y, hotspot.z);
          hotspotsRef.current.add(sphere);
        }
      }
    }
    
    // Update particle trails if enabled
    if (showParticleTrails && trailSystemRef.current && timeStep.particles) {
      const trailGroup = trailSystemRef.current.trailGroup;
      
      if (trailGroup) {
        // Clear existing trail meshes from scene (but keep trail history)
        while (trailGroup.children.length > 0) {
          const child = trailGroup.children[0];
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
          trailGroup.remove(child);
        }
        
        // Update trail positions for each particle
        const displayCount = Math.min(
          timeStep.particles.length,
          parameters?.maxTrailParticles || 100 // Limit trails for performance
        );
        
        // Find max energy for color scaling
        let maxEnergy = 0;
        for (let i = 0; i < timeStep.particles.length; i++) {
          maxEnergy = Math.max(maxEnergy, timeStep.particles[i].energy);
        }
        
        for (let i = 0; i < displayCount; i++) {
          const particle = timeStep.particles[i];
          const particleId = particle.id || `particle_${i}`;
          const position = new THREE.Vector3(particle.x, particle.y, particle.z);
          
          // Update trail history using the correct method name
          trailSystemRef.current.updateTrail(particleId, position);
          
          // Get color based on particle type or energy
          let trailColor;
          if (parameters?.colorByEnergy && maxEnergy > 0) {
            const normalizedEnergy = particle.energy / maxEnergy;
            const energyColor = getEnergyColor(normalizedEnergy);
            trailColor = energyColor.getHex();
          } else {
            // Color by particle type
            const typeColors = {
              deuterium: 0x3498db,
              tritium: 0x2ecc71,
              helium: 0xf1c40f,
              proton: 0xe74c3c,
              electron: 0x9b59b6
            };
            trailColor = typeColors[particle.type] || 0x00ffff;
          }
          
          // Create trail mesh and add to scene
          const trailMesh = trailSystemRef.current.createTrailMesh(particleId, trailColor);
          if (trailMesh) {
            trailGroup.add(trailMesh);
          }
        }
      }
    } else if (trailSystemRef.current) {
      // Clear trails when disabled
      trailSystemRef.current.clear();
      const trailGroup = trailSystemRef.current.trailGroup;
      if (trailGroup) {
        while (trailGroup.children.length > 0) {
          const child = trailGroup.children[0];
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
          trailGroup.remove(child);
        }
      }
    }
  };
  
  /**
   * Handle playback controls
   */
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      lastUpdateTimeRef.current = Date.now();
    }
  };
  
  const handleRestart = () => {
    setCurrentTimeIndex(0);
    setIsPlaying(false);
  };
  
  const handleStepForward = () => {
    if (currentTimeIndex < timeSteps.length - 1) {
      setCurrentTimeIndex(currentTimeIndex + 1);
    }
  };
  
  const handleStepBackward = () => {
    if (currentTimeIndex > 0) {
      setCurrentTimeIndex(currentTimeIndex - 1);
    }
  };
  
  const handleTimeChange = (_, value) => {
    setCurrentTimeIndex(value);
  };
  
  const handleSpeedChange = (_, value) => {
    setPlaybackSpeed(value);
  };
  
  // Render loading state when no data
  if (!simulationData || !timeSteps || timeSteps.length === 0) {
    return (
      <Box
        sx={{
          width,
          height,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: 'rgba(0, 0, 0, 0.05)',
          borderRadius: 1
        }}
      >
        <Typography variant="body1" color="text.secondary">
          No simulation data available. Run a simulation to visualize results.
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ width, height: 'auto' }}>
      {/* 3D rendering container with legend overlay */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height,
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: '#000'
        }}
      >
        {/* Three.js canvas container */}
        <Box
          ref={containerRef}
          sx={{
            width: '100%',
            height: '100%',
          }}
        />
        
        {/* Legend overlay */}
        {showLegend && (
          <VisualizationLegend
            particleCounts={currentStats?.particleCounts || {}}
            stats={currentStats?.stats}
            showEnergy={parameters?.colorByEnergy !== false}
            showParticles={parameters?.showParticles !== false}
            showHotspots={parameters?.showHotspots !== false}
            showStats={true}
            showScale={true}
            showQuantumFlux={showQuantumFlux}
            scaleInfo={scaleInfo}
            quantumFluxMode={quantumFluxMode}
            position="top-right"
            collapsed={legendCollapsed}
            onToggleCollapse={setLegendCollapsed}
            variant="overlay"
          />
        )}
        
        {/* Quick info badge - bottom left */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            bgcolor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <span>⏱️ {timeLabels[currentTimeIndex] || '0.00 ps'}</span>
          {currentStats?.stats && (
            <>
              <span>🔵 {currentStats.stats.totalParticles} particles</span>
              <span>🔥 {currentStats.stats.hotspotCount} hotspots</span>
            </>
          )}
        </Box>
      </Box>
      
      {/* Playback controls */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Tooltip title="Restart">
              <IconButton onClick={handleRestart}>
                <RestartAltIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Step Backward">
              <IconButton onClick={handleStepBackward}>
                <FastRewindIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={isPlaying ? "Pause" : "Play"}>
              <IconButton onClick={handlePlayPause} color="primary">
                {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Step Forward">
              <IconButton onClick={handleStepForward}>
                <FastForwardIcon />
              </IconButton>
            </Tooltip>
            <Box sx={{ ml: 2, flexGrow: 1 }}>
              <Typography variant="body2" gutterBottom>
                Time: {timeLabels[currentTimeIndex] || '0.00 ps'}
              </Typography>
              <Slider
                value={currentTimeIndex}
                onChange={handleTimeChange}
                min={0}
                max={Math.max(timeSteps.length - 1, 0)}
                step={1}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => timeLabels[value] || '0.00 ps'}
              />
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ mr: 2, minWidth: '80px' }}>
              Speed: {playbackSpeed}x
            </Typography>
            <Slider
              value={playbackSpeed}
              onChange={handleSpeedChange}
              min={0.25}
              max={5}
              step={0.25}
              marks={[
                { value: 0.25, label: '0.25x' },
                { value: 1, label: '1x' },
                { value: 5, label: '5x' }
              ]}
              sx={{ ml: 2 }}
            />
          </Box>
          
          {/* Visual Effects Toggles */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', mt: 2, gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showQuantumFlux}
                  onChange={(e) => setShowQuantumFlux(e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Quantum Field</Typography>}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={showParticleTrails}
                  onChange={(e) => setShowParticleTrails(e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Particle Trails</Typography>}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={showLegend}
                  onChange={(e) => setShowLegend(e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Show Legend</Typography>}
            />
            <Tooltip title="Information about the visualization">
              <IconButton size="small" color="info">
                <InfoOutlinedIcon />
              </IconButton>
            </Tooltip>
          </Box>
          
          {/* Quantum Flux Mode Selector */}
          {showQuantumFlux && (
            <Box sx={{ mt: 2 }}>
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="quantum-flux-mode-label">Quantum Field Mode</InputLabel>
                <Select
                  labelId="quantum-flux-mode-label"
                  value={quantumFluxMode}
                  label="Quantum Field Mode"
                  onChange={(e) => setQuantumFluxMode(e.target.value)}
                >
                  <MenuItem value="electron_screening">
                    <Tooltip title="Thomas-Fermi electron density reducing Coulomb barrier" placement="right">
                      <span>Electron Screening</span>
                    </Tooltip>
                  </MenuItem>
                  <MenuItem value="magnetic_dipoles">
                    <Tooltip title="Nuclear/electron spin magnetic moments and local fields" placement="right">
                      <span>Magnetic Dipoles</span>
                    </Tooltip>
                  </MenuItem>
                  <MenuItem value="phonon_modes">
                    <Tooltip title="Debye model lattice vibrations (acoustic + optical)" placement="right">
                      <span>Phonon Modes</span>
                    </Tooltip>
                  </MenuItem>
                  <MenuItem value="coulomb_exchange">
                    <Tooltip title="Virtual photon exchange between charged particles" placement="right">
                      <span>Coulomb Exchange</span>
                    </Tooltip>
                  </MenuItem>
                  <MenuItem value="gamow_window">
                    <Tooltip title="Optimal tunneling energy (stellar nucleosynthesis)" placement="right">
                      <span>Gamow Window</span>
                    </Tooltip>
                  </MenuItem>
                  <MenuItem value="combined">
                    <Tooltip title="Combined screening, phonon, and tunneling effects" placement="right">
                      <span>Combined Effects</span>
                    </Tooltip>
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

FusionVisualization.propTypes = {
  simulationData: PropTypes.shape({
    timeSteps: PropTypes.arrayOf(PropTypes.shape({
      particles: PropTypes.arrayOf(PropTypes.shape({
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired,
        z: PropTypes.number.isRequired,
        type: PropTypes.string.isRequired,
        energy: PropTypes.number.isRequired
      })),
      hotspots: PropTypes.arrayOf(PropTypes.shape({
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired,
        z: PropTypes.number.isRequired,
        intensity: PropTypes.number.isRequired
      }))
    }))
  }),
  parameters: PropTypes.object,
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default FusionVisualization; 