/**
 * UnifiedBubbleLatticeVisualization.jsx
 * 
 * Main 3D visualization for the unified LENR bubble-lattice interaction.
 * Shows electrodynamic ionic double-layer bubble collapsing onto lattice-loaded materials,
 * with proton phase transitions through EM/Weak/Strong force coupling.
 * 
 * Scene Hierarchy:
 * - LatticeGroup: Host atoms, loaded hydrogen, lattice bonds
 * - BubbleGroup: Animated bubble, double-layer shell, pressure waves
 * - ProtonPhaseGroup: Color-coded protons by force regime
 * - FieldVisualization: Electric field lines, energy flow
 * - EffectsGroup: Hotspots, collapse flash
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { 
  Box, Typography, Paper, FormGroup, FormControlLabel, Switch, 
  IconButton, Tooltip, Slider, Chip, Stack
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import HomeIcon from '@mui/icons-material/Home';
import CycloneIcon from '@mui/icons-material/Cyclone';

// Import fluid dynamics effects for vortex visualization
import { VortexField, EnergyFlowVisualizer, PlasmaVortexEffect } from './FluidDynamicsEffects';

// Proton state definitions with visual properties
const PROTON_STATES = {
  FREE: { color: 0x3498db, emissive: 0x1a4c6e, emissiveIntensity: 0.2, size: 0.15, name: 'Free (EM)' },
  SCREENED: { color: 0x00ffff, emissive: 0x006666, emissiveIntensity: 0.4, size: 0.13, name: 'Screened' },
  CAPTURE_READY: { color: 0xf1c40f, emissive: 0x7d6208, emissiveIntensity: 0.7, size: 0.11, name: 'Capture Ready' },
  NUCLEAR: { color: 0xff4500, emissive: 0xff2200, emissiveIntensity: 1.0, size: 0.09, name: 'Nuclear Active' }
};

// Bubble collapse phases
const COLLAPSE_PHASES = {
  EXPANSION: { name: 'Expansion', duration: 0.4 },
  COLLAPSE: { name: 'Collapse', duration: 0.15 },
  MINIMUM: { name: 'Minimum', duration: 0.05 },
  REBOUND: { name: 'Rebound', duration: 0.1 },
  RECOVERY: { name: 'Recovery', duration: 0.3 }
};

// UX Time Scale: Slow down the physics animation for user comprehension
// Physical frequency is in kHz (e.g., 20kHz = 50μs cycles) - way too fast to observe
// This multiplier makes one visual cycle take ~3-5 seconds at default speed
const UX_TIME_SCALE = 0.02; // Slow down by 50x for visual comprehension

/**
 * Main unified bubble-lattice visualization component
 */
const UnifiedBubbleLatticeVisualization = ({
  parameters = {},
  simulationData = null,
  onPhaseChange = () => {},
  onCollapseEvent = () => {},
  width = '100%',
  height = 500
}) => {
  // Refs for Three.js objects
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const frameIdRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  
  // Group refs for scene hierarchy
  const latticeGroupRef = useRef(null);
  const bubbleGroupRef = useRef(null);
  const protonGroupRef = useRef(null);
  const fieldGroupRef = useRef(null);
  const effectsGroupRef = useRef(null);
  
  // Vortex/fluid dynamics refs
  const vortexGroupRef = useRef(null);
  const vortexFieldRef = useRef(null);
  const energyFlowRef = useRef(null);
  const plasmaVortexRef = useRef(null);
  
  // Animation state
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentPhase, setCurrentPhase] = useState('EXPANSION');
  const [cycleProgress, setCycleProgress] = useState(0);
  const [collapseCount, setCollapseCount] = useState(0);
  
  // Visualization toggles
  const [showLattice, setShowLattice] = useState(true);
  const [showBubble, setShowBubble] = useState(true);
  const [showProtons, setShowProtons] = useState(true);
  const [showFieldLines, setShowFieldLines] = useState(true);
  const [showDoubleLayer, setShowDoubleLayer] = useState(true);
  const [showVortices, setShowVortices] = useState(true);
  
  // Animation parameters
  const animationSpeedRef = useRef(0.1); // Default to slower speed for better observation
  const bubbleRadiusRef = useRef(3.0);
  const normalizedTimeRef = useRef(0);
  
  // Extract parameters with defaults
  const {
    hostMaterial = 'palladium',
    loadingRatio = 0.9,
    temperature = 300,
    initialBubbleRadius = 3.0,
    drivingPressure = 1.5,
    frequency = 20,
    latticeSize = 4
  } = parameters;

  // Create lattice structure
  const createLattice = useCallback((scene) => {
    const latticeGroup = new THREE.Group();
    latticeGroup.name = 'LatticeGroup';
    
    const dimension = latticeSize;
    const spacing = 1.2;
    const offset = (dimension - 1) * spacing / 2;
    
    // Host atom material (Pd/Ni color)
    const hostColor = hostMaterial === 'palladium' ? 0x8b8b8b : 
                      hostMaterial === 'nickel' ? 0x4682b4 : 0x696969;
    
    const hostGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const hostMaterial3D = new THREE.MeshPhongMaterial({
      color: hostColor,
      shininess: 100,
      specular: 0x444444
    });
    
    // Hydrogen atom material
    const hydrogenGeometry = new THREE.SphereGeometry(0.15, 12, 12);
    const hydrogenMaterial = new THREE.MeshPhongMaterial({
      color: 0x32cd32,
      emissive: 0x0a3a0a,
      emissiveIntensity: 0.3,
      shininess: 80
    });
    
    // Bond material
    const bondMaterial = new THREE.LineBasicMaterial({ 
      color: 0x444444, 
      transparent: true, 
      opacity: 0.4 
    });
    
    const points = [];
    const connections = [];
    let pointIndex = 0;
    
    // Create FCC-like lattice
    for (let x = 0; x < dimension; x++) {
      for (let y = 0; y < dimension; y++) {
        for (let z = 0; z < dimension; z++) {
          const posX = x * spacing - offset;
          const posY = y * spacing - offset - 5; // Position lattice below bubble
          const posZ = z * spacing - offset;
          
          // Host atom
          const hostAtom = new THREE.Mesh(hostGeometry, hostMaterial3D);
          hostAtom.position.set(posX, posY, posZ);
          latticeGroup.add(hostAtom);
          
          // Add hydrogen at interstitial sites based on loading ratio
          if (Math.random() < loadingRatio) {
            const hOffset = spacing * 0.25;
            const hydrogen = new THREE.Mesh(hydrogenGeometry, hydrogenMaterial);
            hydrogen.position.set(
              posX + (Math.random() - 0.5) * hOffset,
              posY + (Math.random() - 0.5) * hOffset,
              posZ + (Math.random() - 0.5) * hOffset
            );
            hydrogen.userData = { type: 'hydrogen', state: 'FREE' };
            latticeGroup.add(hydrogen);
          }
          
          points.push(new THREE.Vector3(posX, posY, posZ));
          
          // Create bonds to neighbors
          if (x > 0) connections.push([pointIndex, pointIndex - dimension * dimension]);
          if (y > 0) connections.push([pointIndex, pointIndex - dimension]);
          if (z > 0) connections.push([pointIndex, pointIndex - 1]);
          
          pointIndex++;
        }
      }
    }
    
    // Add bond lines
    connections.forEach(([i, j]) => {
      const geometry = new THREE.BufferGeometry().setFromPoints([points[i], points[j]]);
      const line = new THREE.Line(geometry, bondMaterial);
      latticeGroup.add(line);
    });
    
    scene.add(latticeGroup);
    latticeGroupRef.current = latticeGroup;
    
    return latticeGroup;
  }, [hostMaterial, loadingRatio, latticeSize]);

  // Create bubble with double-layer shell
  const createBubble = useCallback((scene) => {
    const bubbleGroup = new THREE.Group();
    bubbleGroup.name = 'BubbleGroup';
    bubbleGroup.position.set(0, 2, 0); // Position above lattice
    
    // Main bubble sphere
    const bubbleGeometry = new THREE.SphereGeometry(1, 32, 32);
    const bubbleMaterial = new THREE.MeshPhongMaterial({
      color: 0xaaddff,
      transparent: true,
      opacity: 0.4,
      shininess: 100,
      specular: 0xffffff
    });
    const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
    bubble.name = 'MainBubble';
    bubbleGroup.add(bubble);
    
    // Ionic double-layer shell (outer)
    const doubleLayerGeometry = new THREE.SphereGeometry(1.1, 32, 32);
    const doubleLayerMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });
    const doubleLayer = new THREE.Mesh(doubleLayerGeometry, doubleLayerMaterial);
    doubleLayer.name = 'DoubleLayer';
    bubbleGroup.add(doubleLayer);
    
    // Inner charge layer
    const innerLayerGeometry = new THREE.SphereGeometry(0.95, 32, 32);
    const innerLayerMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.1,
      side: THREE.FrontSide
    });
    const innerLayer = new THREE.Mesh(innerLayerGeometry, innerLayerMaterial);
    innerLayer.name = 'InnerLayer';
    bubbleGroup.add(innerLayer);
    
    // Pressure wave rings
    for (let i = 0; i < 3; i++) {
      const ringGeometry = new THREE.RingGeometry(1.2 + i * 0.5, 1.3 + i * 0.5, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.name = `PressureRing${i}`;
      ring.userData = { baseRadius: 1.2 + i * 0.5, phase: i * 0.3 };
      bubbleGroup.add(ring);
    }
    
    scene.add(bubbleGroup);
    bubbleGroupRef.current = bubbleGroup;
    
    return bubbleGroup;
  }, []);

  // Create proton phase particles
  const createProtons = useCallback((scene) => {
    const protonGroup = new THREE.Group();
    protonGroup.name = 'ProtonPhaseGroup';
    
    const protonCount = 30;
    const protonGeometry = new THREE.SphereGeometry(0.12, 8, 8);
    
    for (let i = 0; i < protonCount; i++) {
      // Start with FREE state
      const state = PROTON_STATES.FREE;
      const protonMaterial = new THREE.MeshPhongMaterial({
        color: state.color,
        emissive: state.emissive,
        emissiveIntensity: state.emissiveIntensity,
        shininess: 60
      });
      
      const proton = new THREE.Mesh(protonGeometry, protonMaterial);
      
      // Random position in bubble region
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 0.5 + Math.random() * 2;
      
      proton.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        2 + r * Math.cos(phi), // Above lattice
        r * Math.sin(phi) * Math.sin(theta)
      );
      
      proton.userData = {
        state: 'FREE',
        basePosition: proton.position.clone(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1
        ),
        phaseThreshold: 0.3 + Math.random() * 0.4
      };
      
      protonGroup.add(proton);
    }
    
    scene.add(protonGroup);
    protonGroupRef.current = protonGroup;
    
    return protonGroup;
  }, []);

  // Create electric field lines
  const createFieldVisualization = useCallback((scene) => {
    const fieldGroup = new THREE.Group();
    fieldGroup.name = 'FieldVisualization';
    
    // Create field lines from bubble to lattice
    const lineCount = 12;
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.5
    });
    
    for (let i = 0; i < lineCount; i++) {
      const angle = (i / lineCount) * Math.PI * 2;
      const radius = 1.5;
      
      const points = [];
      for (let j = 0; j <= 20; j++) {
        const t = j / 20;
        const x = radius * Math.cos(angle) * (1 - t * 0.3);
        const y = 2 - t * 7; // From bubble down to lattice
        const z = radius * Math.sin(angle) * (1 - t * 0.3);
        points.push(new THREE.Vector3(x, y, z));
      }
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, lineMaterial);
      line.name = `FieldLine${i}`;
      line.userData = { angle, baseRadius: radius };
      fieldGroup.add(line);
    }
    
    // Energy flow particles
    const particleGeometry = new THREE.SphereGeometry(0.05, 6, 6);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.8
    });
    
    for (let i = 0; i < 20; i++) {
      const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone());
      particle.userData = {
        t: Math.random(),
        speed: 0.02 + Math.random() * 0.02,
        lineIndex: Math.floor(Math.random() * lineCount)
      };
      particle.name = `EnergyParticle${i}`;
      fieldGroup.add(particle);
    }
    
    scene.add(fieldGroup);
    fieldGroupRef.current = fieldGroup;
    
    return fieldGroup;
  }, []);

  // Create effects (hotspots, collapse flash)
  const createEffects = useCallback((scene) => {
    const effectsGroup = new THREE.Group();
    effectsGroup.name = 'EffectsGroup';
    
    // Hotspots on lattice surface
    const hotspotGeometry = new THREE.SphereGeometry(0.2, 12, 12);
    const hotspotMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4500,
      transparent: true,
      opacity: 0
    });
    
    for (let i = 0; i < 5; i++) {
      const hotspot = new THREE.Mesh(hotspotGeometry, hotspotMaterial.clone());
      hotspot.position.set(
        (Math.random() - 0.5) * 4,
        -5 + Math.random() * 2,
        (Math.random() - 0.5) * 4
      );
      hotspot.userData = { pulsePhase: Math.random() * Math.PI * 2 };
      hotspot.name = `Hotspot${i}`;
      effectsGroup.add(hotspot);
    }
    
    // Collapse flash sphere (hidden initially)
    const flashGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0
    });
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.set(0, -3, 0);
    flash.name = 'CollapseFlash';
    effectsGroup.add(flash);
    
    // Shockwave ring
    const shockwaveGeometry = new THREE.RingGeometry(0.1, 0.3, 32);
    const shockwaveMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    const shockwave = new THREE.Mesh(shockwaveGeometry, shockwaveMaterial);
    shockwave.rotation.x = Math.PI / 2;
    shockwave.position.set(0, -3, 0);
    shockwave.name = 'Shockwave';
    effectsGroup.add(shockwave);
    
    scene.add(effectsGroup);
    effectsGroupRef.current = effectsGroup;
    
    return effectsGroup;
  }, []);

  // Create vortex flow visualization - ions flowing in/out of lattice
  const createVortexFlow = useCallback((scene) => {
    const vortexGroup = new THREE.Group();
    vortexGroup.name = 'VortexFlowGroup';
    
    try {
      // Create plasma vortex effect centered between bubble and lattice
      const plasmaVortex = new PlasmaVortexEffect({
        particleCount: 200,
        vortexStrength: 0.8,
        radialSpeed: 0.3,
        verticalSpeed: 0.5,
        radius: 2.5,
        height: 6
      });
      plasmaVortex.initialize();
      plasmaVortex.getGroup().position.set(0, -1.5, 0); // Center between bubble and lattice
      vortexGroup.add(plasmaVortex.getGroup());
      plasmaVortexRef.current = plasmaVortex;
    } catch (error) {
      console.warn('Failed to create plasma vortex effect:', error);
      // Continue without plasma vortex if it fails
    }
    
    // Create energy flow visualizer for directed particle streams
    const energyFlow = new EnergyFlowVisualizer({
      particleCount: 80,
      speed: 0.015,
      particleSize: 0.06
    });
    
    // Create flow paths from bubble area down to lattice hotspots
    const flowPathsData = [
      // Central downward flow
      {
        points: [
          new THREE.Vector3(0, 2, 0),
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, -3, 0),
          new THREE.Vector3(0, -5, 0)
        ],
        color: 0x00ffff,
        intensity: 1.0
      },
      // Spiral inward flows
      {
        points: [
          new THREE.Vector3(2, 2, 0),
          new THREE.Vector3(1.5, 0, 1),
          new THREE.Vector3(0.5, -2, 0.5),
          new THREE.Vector3(0, -4, 0)
        ],
        color: 0x00ff88,
        intensity: 0.8
      },
      {
        points: [
          new THREE.Vector3(-2, 2, 0),
          new THREE.Vector3(-1.5, 0, -1),
          new THREE.Vector3(-0.5, -2, -0.5),
          new THREE.Vector3(0, -4, 0)
        ],
        color: 0x00ff88,
        intensity: 0.8
      },
      {
        points: [
          new THREE.Vector3(0, 2, 2),
          new THREE.Vector3(1, 0, 1.5),
          new THREE.Vector3(0.5, -2, 0.5),
          new THREE.Vector3(0, -4, 0)
        ],
        color: 0x88ffff,
        intensity: 0.7
      },
      {
        points: [
          new THREE.Vector3(0, 2, -2),
          new THREE.Vector3(-1, 0, -1.5),
          new THREE.Vector3(-0.5, -2, -0.5),
          new THREE.Vector3(0, -4, 0)
        ],
        color: 0x88ffff,
        intensity: 0.7
      }
    ];
    
    try {
      flowPathsData.forEach(path => {
        energyFlow.addFlowPath(path.points, path.color, path.intensity);
      });
      
      energyFlow.initializeParticles();
      vortexGroup.add(energyFlow.getGroup());
      energyFlowRef.current = energyFlow;
    } catch (error) {
      console.warn('Failed to create energy flow visualizer:', error);
      // Continue without energy flow if it fails
    }
    
    try {
      // Create a vortex field for additional swirl effects
      const vortexField = new VortexField({
        strength: 1.0,
        decayRate: 0.3,
        rotationAxis: new THREE.Vector3(0, 1, 0)
      });
      
      // Add vortex centers at key positions
      vortexField.addVortex(new THREE.Vector3(0, 2, 0), 1.5, 2.0);  // Bubble center
      vortexField.addVortex(new THREE.Vector3(0, -4, 0), 2.0, 3.0); // Lattice impact zone
      vortexFieldRef.current = vortexField;
    } catch (error) {
      console.warn('Failed to create vortex field:', error);
      // Continue without vortex field if it fails
    }
    
    // Create visual representation of vortex swirl lines
    const swirlLineCount = 8;
    const swirlMaterial = new THREE.LineBasicMaterial({
      color: 0x44ffaa,
      transparent: true,
      opacity: 0.4
    });
    
    for (let i = 0; i < swirlLineCount; i++) {
      const points = [];
      const baseAngle = (i / swirlLineCount) * Math.PI * 2;
      const spiralTurns = 2;
      
      for (let j = 0; j <= 40; j++) {
        const t = j / 40;
        const angle = baseAngle + t * spiralTurns * Math.PI * 2;
        const radius = 2.5 * (1 - t * 0.6);
        const y = 2 - t * 7; // From bubble to lattice
        
        points.push(new THREE.Vector3(
          radius * Math.cos(angle),
          y,
          radius * Math.sin(angle)
        ));
      }
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, swirlMaterial.clone());
      line.name = `SwirlLine${i}`;
      line.userData = { baseAngle, phase: i / swirlLineCount };
      vortexGroup.add(line);
    }
    
    scene.add(vortexGroup);
    vortexGroupRef.current = vortexGroup;
    
    return vortexGroup;
  }, []);

  // Calculate bubble radius based on collapse phase
  const calculateBubbleRadius = useCallback((normalizedTime, baseRadius) => {
    let radius;
    let phase;
    
    if (normalizedTime < 0.4) {
      // Expansion phase
      phase = 'EXPANSION';
      const t = normalizedTime / 0.4;
      radius = baseRadius * (1 + drivingPressure * 0.3 * Math.sin(t * Math.PI / 2));
    } else if (normalizedTime < 0.55) {
      // Collapse phase (rapid)
      phase = 'COLLAPSE';
      const t = (normalizedTime - 0.4) / 0.15;
      const maxRadius = baseRadius * (1 + drivingPressure * 0.3);
      const minRadius = baseRadius * 0.15;
      radius = maxRadius - (maxRadius - minRadius) * Math.pow(t, 2);
    } else if (normalizedTime < 0.6) {
      // Minimum/impact phase
      phase = 'MINIMUM';
      radius = baseRadius * 0.15;
    } else if (normalizedTime < 0.7) {
      // Rebound phase
      phase = 'REBOUND';
      const t = (normalizedTime - 0.6) / 0.1;
      radius = baseRadius * (0.15 + 0.5 * t);
    } else {
      // Recovery phase
      phase = 'RECOVERY';
      const t = (normalizedTime - 0.7) / 0.3;
      radius = baseRadius * (0.65 + 0.35 * t);
    }
    
    return { radius: Math.max(0.1, radius), phase };
  }, [drivingPressure]);

  // Update proton states based on collapse phase
  const updateProtonStates = useCallback((phase, normalizedTime) => {
    if (!protonGroupRef.current) return;
    
    protonGroupRef.current.children.forEach((proton) => {
      const threshold = proton.userData.phaseThreshold;
      let newState;
      
      if (phase === 'EXPANSION' || phase === 'RECOVERY') {
        newState = 'FREE';
      } else if (phase === 'COLLAPSE') {
        const collapseProgress = (normalizedTime - 0.4) / 0.15;
        if (collapseProgress > threshold + 0.3) {
          newState = 'CAPTURE_READY';
        } else if (collapseProgress > threshold) {
          newState = 'SCREENED';
        } else {
          newState = 'FREE';
        }
      } else if (phase === 'MINIMUM') {
        newState = Math.random() < 0.3 ? 'NUCLEAR' : 'CAPTURE_READY';
      } else if (phase === 'REBOUND') {
        newState = Math.random() < 0.5 ? 'SCREENED' : 'FREE';
      }
      
      if (newState !== proton.userData.state) {
        proton.userData.state = newState;
        const stateProps = PROTON_STATES[newState];
        proton.material.color.setHex(stateProps.color);
        proton.material.emissive.setHex(stateProps.emissive);
        proton.material.emissiveIntensity = stateProps.emissiveIntensity;
        proton.scale.setScalar(stateProps.size / 0.12);
      }
    });
  }, []);

  // Animation update function
  const updateAnimation = useCallback((deltaTime) => {
    if (!isPlaying) return;
    
    const speed = animationSpeedRef.current;
    // Apply UX_TIME_SCALE to slow down the physics for visual observation
    // cycleDuration is now in seconds, adjusted for human perception
    const cycleDuration = (1 / frequency) / UX_TIME_SCALE; // seconds per visual cycle
    
    normalizedTimeRef.current += (deltaTime * speed) / cycleDuration;
    if (normalizedTimeRef.current >= 1) {
      normalizedTimeRef.current = 0;
      setCollapseCount(prev => prev + 1);
      onCollapseEvent();
    }
    
    const normalizedTime = normalizedTimeRef.current;
    setCycleProgress(normalizedTime);
    
    const baseRadius = initialBubbleRadius;
    const { radius, phase } = calculateBubbleRadius(normalizedTime, baseRadius);
    bubbleRadiusRef.current = radius;
    
    if (phase !== currentPhase) {
      setCurrentPhase(phase);
      onPhaseChange(phase);
    }
    
    // Update bubble
    if (bubbleGroupRef.current && showBubble) {
      const bubble = bubbleGroupRef.current.getObjectByName('MainBubble');
      const doubleLayer = bubbleGroupRef.current.getObjectByName('DoubleLayer');
      const innerLayer = bubbleGroupRef.current.getObjectByName('InnerLayer');
      
      if (bubble) {
        bubble.scale.setScalar(radius / baseRadius);
        bubble.material.opacity = 0.3 + (1 - radius / baseRadius) * 0.4;
      }
      if (doubleLayer) {
        doubleLayer.scale.setScalar((radius * 1.1) / baseRadius);
        const intensity = phase === 'COLLAPSE' || phase === 'MINIMUM' ? 0.4 : 0.15;
        doubleLayer.material.opacity = intensity;
      }
      if (innerLayer) {
        innerLayer.scale.setScalar((radius * 0.95) / baseRadius);
      }
      
      // Update pressure rings
      for (let i = 0; i < 3; i++) {
        const ring = bubbleGroupRef.current.getObjectByName(`PressureRing${i}`);
        if (ring) {
          const ringPhase = (normalizedTime + ring.userData.phase) % 1;
          ring.scale.setScalar(1 + ringPhase * 2);
          ring.material.opacity = Math.max(0, 0.2 - ringPhase * 0.2);
        }
      }
      
      // Move bubble toward lattice during collapse
      if (phase === 'COLLAPSE' || phase === 'MINIMUM') {
        const collapseProgress = Math.min(1, (normalizedTime - 0.4) / 0.2);
        bubbleGroupRef.current.position.y = 2 - collapseProgress * 4;
      } else {
        bubbleGroupRef.current.position.y = 2;
      }
    }
    
    // Update protons
    if (showProtons) {
      updateProtonStates(phase, normalizedTime);
      
      protonGroupRef.current?.children.forEach((proton) => {
        // Move protons toward lattice during collapse
        if (phase === 'COLLAPSE' || phase === 'MINIMUM') {
          const targetY = -5 + Math.random() * 2;
          proton.position.y += (targetY - proton.position.y) * 0.05;
        } else {
          // Return to original position
          const base = proton.userData.basePosition;
          proton.position.lerp(base, 0.02);
        }
        
        // Add small random motion
        proton.position.x += proton.userData.velocity.x;
        proton.position.z += proton.userData.velocity.z;
      });
    }
    
    // Update field lines
    if (fieldGroupRef.current && showFieldLines) {
      const fieldIntensity = phase === 'COLLAPSE' || phase === 'MINIMUM' ? 1 : 0.3;
      
      fieldGroupRef.current.children.forEach((child) => {
        if (child.name.startsWith('FieldLine')) {
          child.material.opacity = 0.3 * fieldIntensity;
        } else if (child.name.startsWith('EnergyParticle')) {
          // Animate particles along field lines
          child.userData.t += child.userData.speed * (1 + fieldIntensity);
          if (child.userData.t > 1) child.userData.t = 0;
          
          const t = child.userData.t;
          const lineIndex = child.userData.lineIndex;
          const angle = (lineIndex / 12) * Math.PI * 2;
          const lineRadius = 1.5 * (1 - t * 0.3);
          
          child.position.set(
            lineRadius * Math.cos(angle),
            2 - t * 7,
            lineRadius * Math.sin(angle)
          );
          child.material.opacity = (phase === 'COLLAPSE' || phase === 'MINIMUM') ? 0.8 : 0.3;
        }
      });
    }
    
    // Update effects
    if (effectsGroupRef.current) {
      const flash = effectsGroupRef.current.getObjectByName('CollapseFlash');
      const shockwave = effectsGroupRef.current.getObjectByName('Shockwave');
      
      // Flash during minimum phase
      if (phase === 'MINIMUM') {
        if (flash) {
          flash.material.opacity = 0.8;
          flash.scale.setScalar(2);
        }
        if (shockwave) {
          const shockProgress = (normalizedTime - 0.55) / 0.05;
          shockwave.material.opacity = 0.6 - shockProgress * 0.6;
          shockwave.scale.setScalar(1 + shockProgress * 5);
        }
      } else {
        if (flash) flash.material.opacity = 0;
        if (shockwave) shockwave.material.opacity = 0;
      }
      
      // Pulse hotspots
      effectsGroupRef.current.children.forEach((child) => {
        if (child.name.startsWith('Hotspot')) {
          const pulseIntensity = (phase === 'MINIMUM' || phase === 'REBOUND') ? 0.7 : 0.2;
          const pulse = Math.sin(Date.now() * 0.005 + child.userData.pulsePhase) * 0.5 + 0.5;
          child.material.opacity = pulseIntensity * pulse;
          child.scale.setScalar(1 + pulse * 0.5);
        }
      });
    }
    
    // Update vortex flow visualization based on collapse phase
    if (vortexGroupRef.current && showVortices) {
      try {
        // Calculate vortex intensity based on phase
        // EXPANSION: slow outward flow, COLLAPSE: fast inward, MINIMUM: intense swirl
        let vortexIntensity = 0.3;
        let flowDirection = 1; // 1 = inward (toward lattice), -1 = outward
        let rotationSpeed = 1.0;
        
        switch (phase) {
          case 'EXPANSION':
            vortexIntensity = 0.3;
            flowDirection = -0.3; // Slow outward
            rotationSpeed = 0.5;
            break;
          case 'COLLAPSE':
            vortexIntensity = 1.0;
            flowDirection = 2.0; // Fast inward
            rotationSpeed = 2.0;
            break;
          case 'MINIMUM':
            vortexIntensity = 1.5;
            flowDirection = 0.5; // Swirling at impact
            rotationSpeed = 3.0;
            break;
          case 'REBOUND':
            vortexIntensity = 0.8;
            flowDirection = -1.5; // Outward scatter
            rotationSpeed = 1.5;
            break;
          case 'RECOVERY':
            vortexIntensity = 0.4;
            flowDirection = 0.2;
            rotationSpeed = 0.7;
            break;
        }
        
        // Update plasma vortex effect
        if (plasmaVortexRef.current && typeof plasmaVortexRef.current.update === 'function') {
          try {
            plasmaVortexRef.current.vortexStrength = 0.8 * vortexIntensity;
            plasmaVortexRef.current.update(deltaTime * rotationSpeed);
          } catch (err) {
            // Silently fail if plasma vortex update fails
          }
        }
        
        // Update energy flow particles
        if (energyFlowRef.current && typeof energyFlowRef.current.update === 'function') {
          try {
            // Adjust particle speed based on phase
            energyFlowRef.current.speed = 0.015 * Math.abs(flowDirection);
            energyFlowRef.current.update(deltaTime * vortexIntensity);
          } catch (err) {
            // Silently fail if energy flow update fails
          }
        }
        
        // Animate swirl lines opacity and rotation
        if (vortexGroupRef.current && vortexGroupRef.current.children) {
          vortexGroupRef.current.children.forEach((child) => {
            if (child && child.name && child.name.startsWith('SwirlLine') && child.material) {
              try {
                // Pulse opacity based on phase intensity
                const baseOpacity = 0.2 + vortexIntensity * 0.3;
                const pulse = Math.sin(Date.now() * 0.003 + (child.userData?.phase || 0) * Math.PI * 2) * 0.15;
                child.material.opacity = Math.min(0.8, baseOpacity + pulse);
                
                // Color shift during intense phases
                if (phase === 'MINIMUM' || phase === 'COLLAPSE') {
                  child.material.color.setHex(0xff8844); // Orange during collapse
                } else {
                  child.material.color.setHex(0x44ffaa); // Green-cyan normally
                }
              } catch (err) {
                // Skip this child if update fails
              }
            }
          });
          
          // Rotate the entire vortex group slowly
          vortexGroupRef.current.rotation.y += deltaTime * rotationSpeed * 0.2;
        }
      } catch (error) {
        // Silently handle vortex update errors to prevent animation loop crashes
        console.warn('Vortex animation update error (non-critical):', error);
      }
    }
  }, [
    isPlaying, frequency, initialBubbleRadius, currentPhase,
    calculateBubbleRadius, updateProtonStates, onPhaseChange, onCollapseEvent,
    showBubble, showProtons, showFieldLines, showVortices
  ]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    sceneRef.current = scene;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);
    
    const pointLight = new THREE.PointLight(0x00ffff, 0.5, 20);
    pointLight.position.set(0, 2, 0);
    scene.add(pointLight);
    
    // Camera
    const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    camera.position.set(12, 5, 12);
    camera.lookAt(0, -2, 0);
    cameraRef.current = camera;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    
    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, -2, 0);
    controlsRef.current = controls;
    
    // Create scene elements
    createLattice(scene);
    createBubble(scene);
    createProtons(scene);
    createFieldVisualization(scene);
    createEffects(scene);
    createVortexFlow(scene);
    
    // Animation loop
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      
      const deltaTime = clockRef.current.getDelta();
      updateAnimation(deltaTime);
      
      controls.update();
      renderer.render(scene, camera);
    };
    
    animate();
    
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
      cancelAnimationFrame(frameIdRef.current);
      
      // Dispose geometries and materials
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(m => m.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      
      renderer.dispose();
    };
  }, [createLattice, createBubble, createProtons, createFieldVisualization, createEffects, createVortexFlow, updateAnimation]);

  // Update visibility based on toggles
  useEffect(() => {
    if (latticeGroupRef.current) latticeGroupRef.current.visible = showLattice;
    if (bubbleGroupRef.current) bubbleGroupRef.current.visible = showBubble;
    if (protonGroupRef.current) protonGroupRef.current.visible = showProtons;
    if (fieldGroupRef.current) fieldGroupRef.current.visible = showFieldLines;
    if (vortexGroupRef.current) vortexGroupRef.current.visible = showVortices;
  }, [showLattice, showBubble, showProtons, showFieldLines, showVortices]);

  // Camera controls
  const handleZoomIn = () => {
    if (cameraRef.current) {
      cameraRef.current.position.multiplyScalar(0.8);
    }
  };
  
  const handleZoomOut = () => {
    if (cameraRef.current) {
      cameraRef.current.position.multiplyScalar(1.25);
    }
  };
  
  const handleResetView = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(12, 5, 12);
      controlsRef.current.target.set(0, -2, 0);
    }
  };

  // Phase indicator color
  const getPhaseColor = (phase) => {
    switch (phase) {
      case 'EXPANSION': return 'info';
      case 'COLLAPSE': return 'warning';
      case 'MINIMUM': return 'error';
      case 'REBOUND': return 'secondary';
      case 'RECOVERY': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ width, height: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Main visualization container */}
      <Box
        ref={containerRef}
        sx={{
          width: '100%',
          height: height,
          position: 'relative',
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: '#0a0a1a'
        }}
      >
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
        
        {/* Overlay controls - top left */}
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            top: 10,
            left: 10,
            bgcolor: 'rgba(20, 20, 40, 0.9)',
            borderRadius: 1,
            p: 0.5,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Tooltip title="Zoom In" placement="right">
            <IconButton size="small" onClick={handleZoomIn} sx={{ color: 'white' }}>
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom Out" placement="right">
            <IconButton size="small" onClick={handleZoomOut} sx={{ color: 'white' }}>
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset View" placement="right">
            <IconButton size="small" onClick={handleResetView} sx={{ color: 'white' }}>
              <HomeIcon />
            </IconButton>
          </Tooltip>
        </Paper>
        
        {/* Layer toggles - top right */}
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            bgcolor: 'rgba(20, 20, 40, 0.9)',
            borderRadius: 1,
            p: 1
          }}
        >
          <FormGroup>
            <FormControlLabel
              control={<Switch checked={showLattice} onChange={(e) => setShowLattice(e.target.checked)} size="small" />}
              label={<Typography variant="caption" color="white">Lattice</Typography>}
            />
            <FormControlLabel
              control={<Switch checked={showBubble} onChange={(e) => setShowBubble(e.target.checked)} size="small" color="info" />}
              label={<Typography variant="caption" color="white">Bubble</Typography>}
            />
            <FormControlLabel
              control={<Switch checked={showProtons} onChange={(e) => setShowProtons(e.target.checked)} size="small" color="warning" />}
              label={<Typography variant="caption" color="white">Protons</Typography>}
            />
            <FormControlLabel
              control={<Switch checked={showFieldLines} onChange={(e) => setShowFieldLines(e.target.checked)} size="small" color="secondary" />}
              label={<Typography variant="caption" color="white">Fields</Typography>}
            />
            <FormControlLabel
              control={<Switch checked={showVortices} onChange={(e) => setShowVortices(e.target.checked)} size="small" color="success" />}
              label={<Typography variant="caption" color="white">Vortices</Typography>}
            />
          </FormGroup>
        </Paper>
        
        {/* Phase indicator - bottom */}
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            bottom: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            bgcolor: 'rgba(20, 20, 40, 0.9)',
            borderRadius: 1,
            p: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}
        >
          <Chip 
            label={currentPhase} 
            color={getPhaseColor(currentPhase)} 
            size="small" 
          />
          <Typography variant="caption" color="white">
            Cycle: {collapseCount} | Progress: {(cycleProgress * 100).toFixed(0)}%
          </Typography>
        </Paper>
      </Box>
      
      {/* Playback controls */}
      <Paper sx={{ mt: 1, p: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
          <IconButton onClick={() => { normalizedTimeRef.current = 0; setCollapseCount(0); }}>
            <RestartAltIcon />
          </IconButton>
          
          <Box sx={{ flex: 1, mx: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Animation Speed ({(animationSpeedRef.current * 100).toFixed(0)}%)
            </Typography>
            <Slider
              value={animationSpeedRef.current}
              onChange={(_, val) => { animationSpeedRef.current = val; }}
              min={0.01}
              max={1.0}
              step={0.01}
              marks={[
                { value: 0.1, label: '0.1x' },
                { value: 0.5, label: '0.5x' },
                { value: 1.0, label: '1x' }
              ]}
              size="small"
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v}x`}
            />
          </Box>
          
          {/* Proton state legend */}
          <Stack direction="row" spacing={1}>
            {Object.entries(PROTON_STATES).map(([key, state]) => (
              <Chip
                key={key}
                label={state.name}
                size="small"
                sx={{
                  bgcolor: `#${state.color.toString(16).padStart(6, '0')}`,
                  color: key === 'FREE' || key === 'SCREENED' ? 'black' : 'white',
                  fontSize: '0.65rem'
                }}
              />
            ))}
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
};

UnifiedBubbleLatticeVisualization.propTypes = {
  parameters: PropTypes.shape({
    hostMaterial: PropTypes.string,
    loadingRatio: PropTypes.number,
    temperature: PropTypes.number,
    initialBubbleRadius: PropTypes.number,
    drivingPressure: PropTypes.number,
    frequency: PropTypes.number,
    latticeSize: PropTypes.number
  }),
  simulationData: PropTypes.object,
  onPhaseChange: PropTypes.func,
  onCollapseEvent: PropTypes.func,
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default UnifiedBubbleLatticeVisualization;
