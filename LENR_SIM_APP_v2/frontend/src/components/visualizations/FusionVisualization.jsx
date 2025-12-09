import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Box, Typography, Slider, IconButton, Card, CardContent, Switch, FormControlLabel } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import { PlasmaVortexEffect, ParticleTrailSystem } from './FluidDynamicsEffects';

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
  
  // Fluid dynamics effects refs
  const plasmaVortexRef = useRef(null);
  const trailSystemRef = useRef(null);
  const lastAnimationTimeRef = useRef(0);
  
  // Animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const lastUpdateTimeRef = useRef(0);
  
  // Visualization effect toggles
  const [showVortexEffect, setShowVortexEffect] = useState(true);
  const [showParticleTrails, setShowParticleTrails] = useState(false);
  
  // Calculated values
  const timeSteps = useMemo(() => {
    return simulationData?.timeSteps || [];
  }, [simulationData]);
  
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
    
    // Initialize plasma vortex effect
    const plasmaVortex = new PlasmaVortexEffect({
      particleCount: 300,
      vortexStrength: 0.8,
      radialSpeed: 0.3,
      verticalSpeed: 0.2,
      radius: 4,
      height: 3
    });
    plasmaVortex.initialize();
    scene.add(plasmaVortex.getGroup());
    plasmaVortexRef.current = plasmaVortex;
    
    // Initialize trail system
    trailSystemRef.current = new ParticleTrailSystem({
      trailLength: 15,
      fadeRate: 0.1
    });
    
    // Add bounding box to visualize confinement region
    const boxGeometry = new THREE.BoxGeometry(10, 10, 10);
    const boxMaterial = new THREE.LineBasicMaterial({ color: 0x333333 });
    const boxWireframe = new THREE.LineSegments(
      new THREE.EdgesGeometry(boxGeometry),
      boxMaterial
    );
    scene.add(boxWireframe);
    
    // Add coordinate axes
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);
    
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
      
      // Update plasma vortex effect
      if (plasmaVortexRef.current) {
        plasmaVortexRef.current.update(deltaTime);
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
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      // Dispose of particles geometry and materials
      if (particlesRef.current) {
        particlesRef.current.children.forEach(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
      }
      // Dispose of hotspots geometry and materials
      if (hotspotsRef.current) {
        hotspotsRef.current.children.forEach(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
      }
      // Dispose of plasma vortex effect
      if (plasmaVortexRef.current) {
        plasmaVortexRef.current.dispose();
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
  }, [timeSteps, currentTimeIndex, parameters]);
  
  // Toggle vortex effect visibility
  useEffect(() => {
    if (plasmaVortexRef.current) {
      plasmaVortexRef.current.getGroup().visible = showVortexEffect;
    }
  }, [showVortexEffect]);
  
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
  }, [isPlaying, timeSteps.length, playbackSpeed]);
  
  /**
   * Updates the visualization with data from the current time step
   */
  const updateVisualization = (timeStep) => {
    if (!particlesRef.current || !hotspotsRef.current || !sceneRef.current) return;
    
    // Dispose shared geometries first (stored in userData)
    if (particlesRef.current.userData.geometriesToDispose) {
      particlesRef.current.userData.geometriesToDispose.forEach(geo => geo.dispose());
      particlesRef.current.userData.geometriesToDispose = [];
    }
    
    // Clear existing particles (only dispose materials, geometries handled above)
    while (particlesRef.current.children.length > 0) {
      const child = particlesRef.current.children[0];
      // Don't dispose geometry here - it's shared and already disposed above
      if (child.material) child.material.dispose();
      particlesRef.current.remove(child);
    }
    
    // Clear hotspots (each has unique geometry so dispose both)
    while (hotspotsRef.current.children.length > 0) {
      const child = hotspotsRef.current.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      hotspotsRef.current.remove(child);
    }
    
    // Create particles (default to showing if parameter not explicitly false)
    const showParticles = parameters?.showParticles !== false;
    if (showParticles && timeStep.particles) {
      // Limit number of particles for performance
      const displayCount = Math.min(
        timeStep.particles.length,
        parameters?.maxParticleDisplay || 1000
      );
      
      // Find max energy to normalize color scale
      let maxEnergy = 0;
      for (let i = 0; i < timeStep.particles.length; i++) {
        maxEnergy = Math.max(maxEnergy, timeStep.particles[i].energy);
      }
      
      // Create particle geometry and materials
      const particleGeometries = {};
      const particleMaterials = {};
      
      // Group particles by type for instanced rendering
      const particleTypes = {};
      
      for (let i = 0; i < displayCount; i++) {
        const particle = timeStep.particles[i];
        if (!particleTypes[particle.type]) {
          particleTypes[particle.type] = [];
        }
        particleTypes[particle.type].push(particle);
      }
      
      // Create geometries and materials for each particle type
      // Store geometries to dispose later (shared across particles of same type)
      const geometriesToDispose = [];
      
      for (const [type, particles] of Object.entries(particleTypes)) {
        // Different sizes for different particle types
        let radius = 0.05;
        switch (type) {
          case 'deuterium':
            radius = 0.05;
            break;
          case 'tritium':
            radius = 0.06;
            break;
          case 'helium':
            radius = 0.08;
            break;
          case 'proton':
            radius = 0.04;
            break;
          case 'electron':
            radius = 0.02;
            break;
          default:
            radius = 0.05;
        }
        
        const geometry = new THREE.SphereGeometry(radius, 8, 8);
        particleGeometries[type] = geometry;
        geometriesToDispose.push(geometry);
        
        // Add particles
        for (const particle of particles) {
          let material;
          
          if (parameters?.colorByEnergy) {
            // Color by energy
            const normalizedEnergy = maxEnergy > 0 ? particle.energy / maxEnergy : 0;
            const color = getEnergyColor(normalizedEnergy);
            material = new THREE.MeshPhongMaterial({ color: color });
          } else {
            // Color by particle type
            let color;
            switch (particle.type) {
              case 'deuterium':
                color = 0x3498db; // blue
                break;
              case 'tritium':
                color = 0x2ecc71; // green
                break;
              case 'helium':
                color = 0xf1c40f; // yellow
                break;
              case 'proton':
                color = 0xe74c3c; // red
                break;
              case 'electron':
                color = 0x9b59b6; // purple
                break;
              default:
                color = 0xcccccc; // gray
            }
            material = new THREE.MeshPhongMaterial({ color });
          }
          
          const sphere = new THREE.Mesh(particleGeometries[type], material);
          sphere.position.set(particle.x, particle.y, particle.z);
          particlesRef.current.add(sphere);
        }
      }
      
      // Store geometries reference for proper disposal
      particlesRef.current.userData.geometriesToDispose = geometriesToDispose;
    }
    
    // Create hotspots (default to showing if parameter not explicitly false)
    const showHotspots = parameters?.showHotspots !== false;
    if (showHotspots && timeStep.hotspots) {
      for (const hotspot of timeStep.hotspots) {
        // Create hotspot geometry
        const geometry = new THREE.SphereGeometry(hotspot.intensity * 0.5, 16, 16);
        
        // Create material with emissive property for glow effect
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
      {/* 3D rendering container */}
      <Box
        ref={containerRef}
        sx={{
          width: '100%',
          height,
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: '#000'
        }}
      />
      
      {/* Playback controls */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <IconButton onClick={handleRestart}>
              <RestartAltIcon />
            </IconButton>
            <IconButton onClick={handleStepBackward}>
              <FastRewindIcon />
            </IconButton>
            <IconButton onClick={handlePlayPause}>
              {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
            </IconButton>
            <IconButton onClick={handleStepForward}>
              <FastForwardIcon />
            </IconButton>
            <Box sx={{ ml: 2, flexGrow: 1 }}>
              <Typography variant="body2" gutterBottom>
                Time: {timeLabels[currentTimeIndex] || '0.00 ps'}
              </Typography>
              <Slider
                value={currentTimeIndex}
                onChange={handleTimeChange}
                min={0}
                max={timeSteps.length - 1}
                step={1}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => timeLabels[value]}
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
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showVortexEffect}
                  onChange={(e) => setShowVortexEffect(e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Plasma Vortex Effect</Typography>}
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
          </Box>
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