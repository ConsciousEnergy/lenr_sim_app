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

import React, { useRef, useEffect, useState, useCallback } from 'react';
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
// CycloneIcon reserved for future vortex toggle UI

// Import fluid dynamics effects for vortex visualization
import { VortexField, EnergyFlowVisualizer, PlasmaVortexEffect } from './FluidDynamicsEffects';
// Import ScaleBar for physical dimension reference
import { ScaleBar } from './QuantumFluxVisualization';
// Import VisualizationLegend for comprehensive display
import VisualizationLegend from './VisualizationLegend';
// Import TouchControls for mobile optimization (v0.2.2-beta)
import TouchControls, { isMobileDevice, getRecommendedQualitySettings } from '../controls/TouchControls';

// Proton state definitions with visual properties
const PROTON_STATES = {
  FREE: { color: 0x3498db, emissive: 0x1a4c6e, emissiveIntensity: 0.2, size: 0.15, name: 'Free (EM)' },
  SCREENED: { color: 0x00ffff, emissive: 0x006666, emissiveIntensity: 0.4, size: 0.13, name: 'Screened' },
  CAPTURE_READY: { color: 0xf1c40f, emissive: 0x7d6208, emissiveIntensity: 0.7, size: 0.11, name: 'Capture Ready' },
  NUCLEAR: { color: 0xff4500, emissive: 0xff2200, emissiveIntensity: 1.0, size: 0.09, name: 'Nuclear Active' }
};

// Bubble collapse phases (used for animation timing reference)
// eslint-disable-next-line no-unused-vars
const _COLLAPSE_PHASES = {
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

// ============================================================================
// PHYSICS-BASED VISUALIZATION CONFIGURATION (Phase 6 Enhancement)
// ============================================================================
// These constants map physical distances to visualization units.
// 
// HETEROGENEOUS NUCLEATION PHYSICS:
// - Bubble nucleates at surface cavities on the lattice boundary layer
// - Initially very small (critical nucleus ~1nm), penetrating ~half atomic layer into lattice
// - Grows while attached to surface due to surface tension
// - Buoyancy eventually pulls on the growing bubble
// - Before detachment, acoustic/EM forcing causes collapse toward lattice
// - This collapse creates extreme conditions for LENR reactions

const PHYSICS_CONFIG = {
  // Scale: how many meters per visualization unit
  // 1 vis unit = 1 micrometer (μm) for comprehensible display
  METERS_PER_VIS_UNIT: 1e-6,
  
  // Typical physical values
  BUBBLE_RADIUS_NUCLEATION_M: 100e-9,  // 100 nm critical nucleus
  BUBBLE_RADIUS_GROWN_M: 10e-6,        // 10 μm grown bubble (before collapse)
  BUBBLE_RADIUS_MIN_M: 0.5e-6,         // 0.5 μm minimum during collapse
  SURFACE_DISTANCE_NUCLEATION_M: 10e-9, // 10 nm when nucleating (AT surface)
  SURFACE_DISTANCE_ATTACHED_M: 50e-9,   // 50 nm when attached and growing
  CAVITY_RADIUS_M: 100e-9,              // 100 nm typical nucleation cavity
  BOUNDARY_LAYER_THICKNESS_M: 1e-6,    // 1 μm thermal boundary layer
  LATTICE_PENETRATION_M: 0.2e-9,       // ~0.2 nm = half atomic layer into lattice
  
  // Visualization positions (in vis units)
  // Lattice surface is defined by top of the lattice atoms
  LATTICE_Y_OFFSET: -5,  // Lattice rendered at y = -5 for visual clarity
  LATTICE_SURFACE_OFFSET: 1.5,  // Offset to reach top surface of lattice
  
  // Bubble behavior visualization (in vis units)
  // Bubble starts AT the surface and grows while staying attached
  NUCLEATION_HEIGHT: 0.3,    // Height above lattice surface when nucleating (small bubble touching surface)
  ATTACHED_HEIGHT: 0.5,      // Height when attached and growing (center of growing bubble)
  BUOYANCY_HEIGHT: 1.5,      // Height when buoyancy starts pulling (larger bubble)
  MAX_HEIGHT: 2.5,           // Maximum height before collapse begins
  COLLAPSE_HEIGHT: 0.3,      // Height at collapse (back to surface)
  
  // Bubble size during phases (scale factor)
  BUBBLE_SCALE: {
    NUCLEATION: 0.15,    // Very small at nucleation (critical nucleus)
    GROWTH_START: 0.3,   // Starting to grow
    GROWTH_MID: 0.6,     // Mid-growth
    FULL_SIZE: 1.0,      // Full size before collapse
    COLLAPSE_MIN: 0.1    // Minimum size during collapse
  },
  
  // Phase-dependent surface distances (in vis units)
  PHASE_DISTANCES: {
    EXPANSION: 0.8,     // Growing while mostly attached (small lift from buoyancy)
    COLLAPSE: 0.4,      // Collapsing back toward surface
    MINIMUM: 0.2,       // Minimum - AT the surface (nucleation site)
    REBOUND: 0.5,       // Slight bounce back after collapse
    RECOVERY: 0.6       // Returning to growth phase
  }
};

// Helper function to convert physics meters to visualization units
const physicsToVis = (meters) => meters / PHYSICS_CONFIG.METERS_PER_VIS_UNIT;

// Helper to get bubble Y position based on physics phase
// NEW: Bubble stays closer to surface, grows in place, then collapses
const getBubbleYFromPhase = (phase, progress = 0) => {
  const latticeY = PHYSICS_CONFIG.LATTICE_Y_OFFSET + PHYSICS_CONFIG.LATTICE_SURFACE_OFFSET;
  const distances = PHYSICS_CONFIG.PHASE_DISTANCES;
  
  switch (phase) {
    case 'EXPANSION':
      // Bubble grows while staying relatively close to surface
      // Small vertical lift as buoyancy starts to act on growing bubble
      return latticeY + distances.MINIMUM + (distances.EXPANSION - distances.MINIMUM) * progress;
    case 'COLLAPSE':
      // Acoustic/EM forcing drives bubble back toward surface
      return latticeY + distances.EXPANSION - (distances.EXPANSION - distances.MINIMUM) * progress;
    case 'MINIMUM':
      // Bubble collapsed at/near surface - maximum compression
      // This is where LENR reactions occur
      return latticeY + distances.MINIMUM;
    case 'REBOUND':
      // Energy release causes slight expansion
      return latticeY + distances.MINIMUM + (distances.REBOUND - distances.MINIMUM) * progress;
    case 'RECOVERY':
      // Returning to growth phase, nucleation begins again
      return latticeY + distances.REBOUND - (distances.REBOUND - distances.MINIMUM) * (1 - progress);
    default:
      return latticeY + distances.MINIMUM;
  }
};

// Helper to get bubble scale (size) based on physics phase
// NEW: Bubble starts small and grows, then collapses to minimum
const getBubbleScaleFromPhase = (phase, progress = 0) => {
  const scales = PHYSICS_CONFIG.BUBBLE_SCALE;
  
  switch (phase) {
    case 'EXPANSION':
      // Bubble grows from nucleation size to full size
      return scales.NUCLEATION + (scales.FULL_SIZE - scales.NUCLEATION) * progress;
    case 'COLLAPSE':
      // Bubble rapidly shrinks during collapse
      return scales.FULL_SIZE - (scales.FULL_SIZE - scales.COLLAPSE_MIN) * progress;
    case 'MINIMUM':
      // At minimum size - maximum compression
      return scales.COLLAPSE_MIN;
    case 'REBOUND':
      // Expanding from minimum
      return scales.COLLAPSE_MIN + (scales.GROWTH_START - scales.COLLAPSE_MIN) * progress;
    case 'RECOVERY':
      // Returning toward nucleation state for next cycle
      return scales.GROWTH_START + (scales.NUCLEATION - scales.GROWTH_START) * progress;
    default:
      return scales.NUCLEATION;
  }
};

/**
 * Helper function to interpolate values from API simulation timeline
 * @param {Array} timeline - API enhancement_timeline array
 * @param {number} normalizedTime - Current animation time (0-1)
 * @returns {Object} Interpolated physics values from API data
 */
const interpolateFromAPITimeline = (timeline, normalizedTime) => {
  if (!timeline || !Array.isArray(timeline) || timeline.length === 0) {
    return null;
  }
  
  // Handle out-of-range times: clamp to nearest segment
  if (timeline.length < 2) {
    return timeline[0];
  }
  
  // If before first point, return first point
  if (normalizedTime <= timeline[0].normalized_time) {
    return timeline[0];
  }
  
  // If after last point, use last two points for interpolation
  if (normalizedTime >= timeline[timeline.length - 1].normalized_time) {
    const lowerIdx = timeline.length - 2;
    const upperIdx = timeline.length - 1;
    const lower = timeline[lowerIdx];
    const upper = timeline[upperIdx];
    const range = upper.normalized_time - lower.normalized_time;
    const t = range > 0 ? (normalizedTime - lower.normalized_time) / range : 1.0;
    
    const lerp = (a, b, t) => a + (b - a) * t;
    return {
      phase: upper.phase,
      enhancement: lerp(lower.enhancement, upper.enhancement, t),
      enhancement_breakdown: {
        total: lerp(lower.enhancement_breakdown?.total || lower.enhancement || 1, upper.enhancement_breakdown?.total || upper.enhancement || 1, t),
        screening: lerp(lower.enhancement_breakdown?.screening || 1, upper.enhancement_breakdown?.screening || 1, t),
        phonon: lerp(lower.enhancement_breakdown?.phonon || 1, upper.enhancement_breakdown?.phonon || 1, t),
        qed: lerp(lower.enhancement_breakdown?.qed || 1, upper.enhancement_breakdown?.qed || 1, t),
        casimir: lerp(lower.enhancement_breakdown?.casimir || 1, upper.enhancement_breakdown?.casimir || 1, t),
        rydberg: lerp(lower.enhancement_breakdown?.rydberg || 1, upper.enhancement_breakdown?.rydberg || 1, t),
        compression: lerp(lower.enhancement_breakdown?.compression || 1, upper.enhancement_breakdown?.compression || 1, t),
        loading: lerp(lower.enhancement_breakdown?.loading || 1, upper.enhancement_breakdown?.loading || 1, t),
      },
      proton_distribution: {
        FREE: lerp(lower.proton_distribution?.FREE || 0.1, upper.proton_distribution?.FREE || 0.1, t),
        SCREENED: lerp(lower.proton_distribution?.SCREENED || 0.2, upper.proton_distribution?.SCREENED || 0.2, t),
        CAPTURE_READY: lerp(lower.proton_distribution?.CAPTURE_READY || 0.4, upper.proton_distribution?.CAPTURE_READY || 0.4, t),
        NUCLEAR: lerp(lower.proton_distribution?.NUCLEAR || 0.3, upper.proton_distribution?.NUCLEAR || 0.3, t),
      },
      radius_factor: lerp(lower.radius_factor || 1, upper.radius_factor || 1, t),
      temperature: lerp(lower.temperature || 300, upper.temperature || 300, t),
      electric_field: lerp(lower.electric_field || 1e8, upper.electric_field || 1e8, t),
    };
  }
  
  // Find the two nearest timeline points for interpolation
  let lowerIdx = 0;
  let upperIdx = timeline.length - 1;
  
  for (let i = 0; i < timeline.length - 1; i++) {
    if (timeline[i].normalized_time <= normalizedTime && timeline[i + 1].normalized_time >= normalizedTime) {
      lowerIdx = i;
      upperIdx = i + 1;
      break;
    }
  }
  
  const lower = timeline[lowerIdx];
  const upper = timeline[upperIdx];
  
  // Calculate interpolation factor
  const range = upper.normalized_time - lower.normalized_time;
  const t = range > 0 ? (normalizedTime - lower.normalized_time) / range : 0;
  
  // Linear interpolation for numeric values
  const lerp = (a, b, t) => a + (b - a) * t;
  
  return {
    phase: t < 0.5 ? lower.phase : upper.phase,
    enhancement: lerp(lower.enhancement, upper.enhancement, t),
    enhancement_breakdown: {
      total: lerp(lower.enhancement_breakdown?.total || 1, upper.enhancement_breakdown?.total || 1, t),
      screening: lerp(lower.enhancement_breakdown?.screening || 1, upper.enhancement_breakdown?.screening || 1, t),
      phonon: lerp(lower.enhancement_breakdown?.phonon || 1, upper.enhancement_breakdown?.phonon || 1, t),
      qed: lerp(lower.enhancement_breakdown?.qed || 1, upper.enhancement_breakdown?.qed || 1, t),
      casimir: lerp(lower.enhancement_breakdown?.casimir || 1, upper.enhancement_breakdown?.casimir || 1, t),
      rydberg: lerp(lower.enhancement_breakdown?.rydberg || 1, upper.enhancement_breakdown?.rydberg || 1, t),
      compression: lerp(lower.enhancement_breakdown?.compression || 1, upper.enhancement_breakdown?.compression || 1, t),
      loading: lerp(lower.enhancement_breakdown?.loading || 1, upper.enhancement_breakdown?.loading || 1, t),
    },
    proton_distribution: {
      FREE: lerp(lower.proton_distribution?.FREE || 0.1, upper.proton_distribution?.FREE || 0.1, t),
      SCREENED: lerp(lower.proton_distribution?.SCREENED || 0.2, upper.proton_distribution?.SCREENED || 0.2, t),
      CAPTURE_READY: lerp(lower.proton_distribution?.CAPTURE_READY || 0.4, upper.proton_distribution?.CAPTURE_READY || 0.4, t),
      NUCLEAR: lerp(lower.proton_distribution?.NUCLEAR || 0.3, upper.proton_distribution?.NUCLEAR || 0.3, t),
    },
    radius_factor: lerp(lower.radius_factor || 1, upper.radius_factor || 1, t),
    temperature: lerp(lower.temperature || 300, upper.temperature || 300, t),
    electric_field: lerp(lower.electric_field || 1e8, upper.electric_field || 1e8, t),
  };
};

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
  
  // Theoretical mechanism visualization refs
  const casimirFieldRef = useRef(null);
  const rydbergOrbitalsRef = useRef(null);
  const haloElectronsRef = useRef(null);
  
  // Scale bar ref
  const scaleBarRef = useRef(null);
  
  // Animation state
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentPhase, setCurrentPhase] = useState('EXPANSION');
  const [cycleProgress, setCycleProgress] = useState(0);
  const [collapseCount, setCollapseCount] = useState(0);
  const [usingAPIData, setUsingAPIData] = useState(false); // Tracks if visualization uses API physics data
  const usingAPIDataRef = useRef(false); // Ref to track previous value and avoid unnecessary state updates
  
  // Physics state for real-time display
  const [currentEnhancement, setCurrentEnhancement] = useState(1.0);
  const [enhancementBreakdown, setEnhancementBreakdown] = useState({
    screening: 1.0,
    qed: 1.0,
    casimir: 1.0,
    rydberg: 1.0,
    compression: 1.0
  });
  const [physicsData, setPhysicsData] = useState({
    compressionRatio: 1.0,
    fieldStrength: 0,
    temperature: 300,
    pressure: 101325
  });
  
  // Visualization toggles
  const [showLattice, setShowLattice] = useState(true);
  const [showBubble, setShowBubble] = useState(true);
  const [showProtons, setShowProtons] = useState(true);
  const [showFieldLines, setShowFieldLines] = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [showDoubleLayer, _setShowDoubleLayer] = useState(true);
  const [showVortices, setShowVortices] = useState(true);
  const [showCasimir, setShowCasimir] = useState(false);
  const [showRydberg, setShowRydberg] = useState(false);
  const [showHalo, setShowHalo] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  
  // Mobile optimization state (v0.2.2-beta)
  const [isMobile] = useState(() => isMobileDevice());
  const [qualitySettings] = useState(() => getRecommendedQualitySettings());
  
  // Animation parameters - use refs for values that change frequently to avoid re-renders
  const animationSpeedRef = useRef(0.1); // Default to slower speed for better observation
  const bubbleRadiusRef = useRef(3.0);
  const normalizedTimeRef = useRef(0);
  const currentPhaseRef = useRef('EXPANSION'); // Ref to avoid stale closure in animation loop
  const updateAnimationRef = useRef(null); // Ref to hold animation function without triggering re-init
  
  // Extract parameters with defaults
  const {
    hostMaterial = 'palladium',
    loadingRatio = 0.9,
    temperature: _paramTemperature = 300, // eslint-disable-line no-unused-vars
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
          // Use physics-based lattice Y offset
          const posY = y * spacing - offset + PHYSICS_CONFIG.LATTICE_Y_OFFSET;
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
    
    // ========================================================================
    // NUCLEATION CAVITY VISUALIZATION (Phase 6 Enhancement)
    // Note: Nucleation cavity and boundary layer visualizations removed for cleaner display
    // The physics calculations still account for these effects
    
    scene.add(latticeGroup);
    latticeGroupRef.current = latticeGroup;
    
    return latticeGroup;
  }, [hostMaterial, loadingRatio, latticeSize]);

  // Create bubble with double-layer shell
  // Physics: bubble nucleates at surface cavities within boundary layer
  // Bubble starts very small at the lattice surface and grows while attached
  const createBubble = useCallback((scene) => {
    const bubbleGroup = new THREE.Group();
    bubbleGroup.name = 'BubbleGroup';
    // Start at nucleation site - very close to lattice surface
    // This reflects physics: heterogeneous nucleation occurs AT surface cavities
    const latticeY = PHYSICS_CONFIG.LATTICE_Y_OFFSET + PHYSICS_CONFIG.LATTICE_SURFACE_OFFSET;
    const initialY = latticeY + PHYSICS_CONFIG.PHASE_DISTANCES.MINIMUM;
    bubbleGroup.position.set(0, initialY, 0);
    
    // Start with small scale (nucleation size)
    const initialScale = PHYSICS_CONFIG.BUBBLE_SCALE.NUCLEATION;
    
    // Main bubble - starts as sphere, morphs to torus during collapse, then to jet
    // Physics: starts very small at nucleation (critical nucleus ~100nm)
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
    bubble.userData = { 
      geometryType: 'sphere', // 'sphere', 'torus', 'jet'
      baseGeometry: bubbleGeometry
    };
    // Start with nucleation scale (small bubble at surface)
    bubble.scale.setScalar(initialScale);
    bubbleGroup.add(bubble);
    
    // Torus geometry for collapse phase (torus-to-jet formation)
    // Torus represents the bubble collapsing into a ring/donut shape before jet formation
    // Make torus larger and more visible - scale relative to bubble size
    const torusGeometry = new THREE.TorusGeometry(1.5, 0.8, 16, 32);
    const torusMaterial = new THREE.MeshPhongMaterial({
      color: 0xff8844,
      transparent: true,
      opacity: 0.8,
      emissive: 0xff4400,
      emissiveIntensity: 1.0,
      side: THREE.DoubleSide
    });
    const torus = new THREE.Mesh(torusGeometry, torusMaterial);
    torus.name = 'TorusFormation';
    torus.visible = false; // Hidden initially, shown during collapse
    torus.rotation.x = Math.PI / 2; // Rotate to horizontal (XZ plane) - ring around Y axis
    torus.userData = { baseRadius: 1.5, baseTubeRadius: 0.8 };
    bubbleGroup.add(torus);
    
    // Jet geometry for focused jet formation (during minimum/rebound)
    // Visible energy jet during bubble collapse toward lattice
    const jetGeometry = new THREE.ConeGeometry(0.3, 4, 16, 1, true);
    const jetMaterial = new THREE.MeshPhongMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.9,
      emissive: 0xffff00,
      emissiveIntensity: 2.0,
      side: THREE.DoubleSide
    });
    const jet = new THREE.Mesh(jetGeometry, jetMaterial);
    jet.name = 'FocusedJet';
    jet.visible = false; // Hidden initially, shown during minimum/rebound
    jet.rotation.x = Math.PI; // Point downward
    jet.userData = { baseRadius: 0.3, baseHeight: 4 };
    bubbleGroup.add(jet);
    
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
    doubleLayer.scale.setScalar(initialScale); // Start small at nucleation
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
    innerLayer.scale.setScalar(initialScale); // Start small at nucleation
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

  // Create H2/D2 particles that follow MHD fluid dynamics
  // Physics: Ionized hydrogen/deuterium in electrolytic bubble boundary layer
  // These particles swirl around the bubble following MHD flow patterns
  const createProtons = useCallback((scene) => {
    const protonGroup = new THREE.Group();
    protonGroup.name = 'ProtonPhaseGroup';
    
    // More, smaller particles for MHD fluid visualization
    const protonCount = 60; // More particles for fluid-like appearance
    const protonGeometry = new THREE.SphereGeometry(0.05, 6, 6); // Smaller H2/D2 particles
    
    for (let i = 0; i < protonCount; i++) {
      // Start with FREE state (ionized H2/D2 in solution)
      const state = PROTON_STATES.FREE;
      const protonMaterial = new THREE.MeshPhongMaterial({
        color: state.color,
        emissive: state.emissive,
        emissiveIntensity: state.emissiveIntensity,
        shininess: 60
      });
      
      const proton = new THREE.Mesh(protonGeometry, protonMaterial);
      
      // Position particles around the bubble boundary layer
      // MHD flow: particles concentrated at bubble-liquid interface
      const theta = Math.random() * Math.PI * 2; // Azimuthal angle
      const phi = Math.random() * Math.PI;       // Polar angle
      
      // Distribute particles in a shell around the bubble
      // Some near surface, some in boundary layer
      const shellRadius = 0.8 + Math.random() * 0.6; // Concentrated near bubble surface
      const latticeY = PHYSICS_CONFIG.LATTICE_Y_OFFSET + PHYSICS_CONFIG.LATTICE_SURFACE_OFFSET;
      
      proton.position.set(
        shellRadius * Math.sin(phi) * Math.cos(theta),
        latticeY + 0.5 + shellRadius * (0.3 + Math.cos(phi) * 0.7), // Around bubble at lattice
        shellRadius * Math.sin(phi) * Math.sin(theta)
      );
      
      // MHD flow properties
      const angularVelocity = 0.5 + Math.random() * 1.0; // Rotation speed
      const radialOscillation = Math.random() * 0.1;     // Breathing motion
      
      proton.userData = {
        state: 'FREE',
        basePosition: proton.position.clone(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.05,
          (Math.random() - 0.5) * 0.05,
          (Math.random() - 0.5) * 0.05
        ),
        phaseThreshold: 0.3 + Math.random() * 0.4,
        // MHD-specific properties
        mhdAngle: theta,                    // Current angle in MHD flow
        mhdRadius: shellRadius,             // Distance from bubble center
        mhdAngularVelocity: angularVelocity,// Rotation speed
        mhdPhase: Math.random() * Math.PI * 2, // Phase offset for variety
        radialOscillation: radialOscillation,
        isIonized: Math.random() < 0.7,     // 70% ionized
        moleculeType: Math.random() < 0.5 ? 'H2' : 'D2' // H2 or D2
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

  // Create fractal child product emissions from nuclear events (recursive helper function)
  // This creates branching fractal structures representing particle emissions
  const createFractalEmissions = (parentGroup, position, depth, maxDepth, direction, scale) => {
    if (depth > maxDepth) return;
    
    // Create emission branch
    const branchLength = scale * (0.3 + Math.random() * 0.4);
    const branchGeometry = new THREE.CylinderGeometry(0.02 * scale, 0.05 * scale, branchLength, 8);
    
    // Different colors for different product types (alpha, neutron, gamma, etc.)
    const productTypes = [
      { color: 0xff4400, emissive: 0xff2200 }, // Alpha particles (orange-red)
      { color: 0x00ffff, emissive: 0x0088ff }, // Neutrons (cyan)
      { color: 0xffff00, emissive: 0xffaa00 }, // Gamma rays (yellow)
      { color: 0xff00ff, emissive: 0xaa00ff }  // Other products (magenta)
    ];
    const productType = productTypes[Math.floor(Math.random() * productTypes.length)];
    
    const branchMaterial = new THREE.MeshPhongMaterial({
      color: productType.color,
      emissive: productType.emissive,
      emissiveIntensity: 1.0 - depth * 0.2,
      transparent: true,
      opacity: 0.8 - depth * 0.15
    });
    
    const branch = new THREE.Mesh(branchGeometry, branchMaterial);
    
    // Position and orient branch
    branch.position.copy(position);
    branch.lookAt(position.clone().add(direction));
    branch.rotateX(Math.PI / 2);
    
    // Add slight randomness to direction
    const randomOffset = new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.3
    );
    const newDirection = direction.clone().add(randomOffset).normalize();
    const endPosition = position.clone().add(newDirection.multiplyScalar(branchLength));
    
    branch.userData = {
      depth,
      endPosition,
      direction: newDirection,
      scale: scale * 0.7,
      pulsePhase: Math.random() * Math.PI * 2
    };
    
    parentGroup.add(branch);
    
    // Recursively create child branches (fractal structure)
    const numChildren = depth < 2 ? 2 + Math.floor(Math.random() * 3) : (depth < 3 ? 1 + Math.floor(Math.random() * 2) : 0);
    for (let i = 0; i < numChildren; i++) {
      const childDirection = newDirection.clone();
      // Add angular spread for branching
      const angle = (Math.PI / 4) * (i / numChildren);
      const axis = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();
      childDirection.applyAxisAngle(axis, angle);
      
      createFractalEmissions(parentGroup, endPosition, depth + 1, maxDepth, childDirection, scale * 0.7);
    }
    
    // Add particle at branch end
    if (depth < maxDepth) {
      const particleGeometry = new THREE.SphereGeometry(0.03 * scale, 8, 8);
      const particleMaterial = new THREE.MeshPhongMaterial({
        color: productType.color,
        emissive: productType.emissive,
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.9
      });
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.copy(endPosition);
      particle.userData = { pulsePhase: Math.random() * Math.PI * 2 };
      parentGroup.add(particle);
    }
  };

  // Create effects (hotspots, fractal nuclear emissions)
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
    
    // Fractal nuclear emissions group (replaces solid flash)
    const nuclearEmissionsGroup = new THREE.Group();
    nuclearEmissionsGroup.name = 'NuclearEmissions';
    nuclearEmissionsGroup.visible = false;
    
    // Create multiple emission points (localized nuclear events)
    const numEvents = 3;
    for (let i = 0; i < numEvents; i++) {
      const eventPosition = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        -3 + (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      );
      
      // Create tiny core (the nuclear event point)
      const coreGeometry = new THREE.SphereGeometry(0.05, 8, 8);
      const coreMaterial = new THREE.MeshPhongMaterial({
        color: 0xff2200,
        emissive: 0xff0000,
        emissiveIntensity: 2.0,
      transparent: true,
        opacity: 1.0
    });
      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      core.position.copy(eventPosition);
      core.name = `NuclearCore${i}`;
      core.userData = { pulsePhase: Math.random() * Math.PI * 2 };
      nuclearEmissionsGroup.add(core);
      
      // Create fractal emissions from this point
      const numEmissions = 6 + Math.floor(Math.random() * 4);
      for (let j = 0; j < numEmissions; j++) {
        const angle = (j / numEmissions) * Math.PI * 2;
        const elevation = (Math.random() - 0.5) * Math.PI / 3;
        const direction = new THREE.Vector3(
          Math.sin(elevation) * Math.cos(angle),
          Math.cos(elevation),
          Math.sin(elevation) * Math.sin(angle)
        );
        
        createFractalEmissions(nuclearEmissionsGroup, eventPosition, 0, 4, direction, 1.0);
      }
    }
    
    effectsGroup.add(nuclearEmissionsGroup);
    
    // Rebound nuclear event group (fusion > fission cascade with child products)
    // This shows emissions from lattice when torus hits during rebound
    const reboundNuclearGroup = new THREE.Group();
    reboundNuclearGroup.name = 'ReboundNuclearEvent';
    reboundNuclearGroup.visible = false;
    
    // Create reaction product types based on fusion processor channels
    // D+D → He3+n (75% energy to He3, 25% to n) or T+p (75% to T, 25% to p)
    // D+Ni → various products
    // Products then can undergo fission-like decay
    const productTypes = {
      'He3': { color: 0x00ff88, emissive: 0x00aa66, size: 0.08, probability: 0.5 },
      'He4': { color: 0x00ffff, emissive: 0x0088ff, size: 0.1, probability: 0.3 },
      'n': { color: 0xffff00, emissive: 0xffaa00, size: 0.05, probability: 0.4 }, // Neutron
      'p': { color: 0xff8844, emissive: 0xff4400, size: 0.06, probability: 0.3 }, // Proton
      'T': { color: 0xff00ff, emissive: 0xaa00ff, size: 0.07, probability: 0.2 }, // Tritium
      'gamma': { color: 0xffffff, emissive: 0xffffff, size: 0.02, probability: 0.1 } // Gamma ray
    };
    
    // Create primary fusion products (from initial fusion event)
    const numPrimaryProducts = 8;
    for (let i = 0; i < numPrimaryProducts; i++) {
      // Select product type based on probability
      const rand = Math.random();
      let cumulative = 0;
      let selectedType = 'He3';
      for (const [type, props] of Object.entries(productTypes)) {
        cumulative += props.probability;
        if (rand <= cumulative) {
          selectedType = type;
          break;
        }
      }
      
      const productProps = productTypes[selectedType];
      const productGeometry = new THREE.SphereGeometry(productProps.size, 8, 8);
      const productMaterial = new THREE.MeshPhongMaterial({
        color: productProps.color,
        emissive: productProps.emissive,
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.9
      });
      const product = new THREE.Mesh(productGeometry, productMaterial);
      
      // Position at lattice surface (where torus hits)
      const angle = (i / numPrimaryProducts) * Math.PI * 2;
      const radius = 0.3 + Math.random() * 0.2;
      product.position.set(
        radius * Math.cos(angle),
        -5, // Lattice Y position
        radius * Math.sin(angle)
      );
      
      // Initial velocity (outward from lattice, reversed energy flow)
      const elevation = (Math.random() - 0.5) * Math.PI / 4; // Slight upward bias
      const direction = new THREE.Vector3(
        Math.sin(elevation) * Math.cos(angle),
        Math.cos(elevation), // Upward (reversed from collapse)
        Math.sin(elevation) * Math.sin(angle)
      ).normalize();
      
      product.name = `PrimaryProduct_${selectedType}_${i}`;
      product.userData = {
        type: selectedType,
        direction: direction,
        velocity: direction.clone().multiplyScalar(0.1 + Math.random() * 0.1),
        lifetime: 0,
        maxLifetime: 2.0, // Short-lived event
        energy: productProps.probability * 10, // Energy based on reaction probability
        fissionReady: Math.random() < 0.3 // 30% chance to undergo fission
      };
      
      reboundNuclearGroup.add(product);
    }
    
    // Create secondary fission products (from primary products that decay)
    const numSecondaryProducts = 12;
    for (let i = 0; i < numSecondaryProducts; i++) {
      const rand = Math.random();
      let cumulative = 0;
      let selectedType = 'n';
      // Fission products tend to be lighter (neutrons, protons, gamma)
      const fissionProducts = { 'n': 0.4, 'p': 0.3, 'gamma': 0.2, 'He3': 0.1 };
      for (const [type, prob] of Object.entries(fissionProducts)) {
        cumulative += prob;
        if (rand <= cumulative) {
          selectedType = type;
          break;
        }
      }
      
      const productProps = productTypes[selectedType];
      const productGeometry = new THREE.SphereGeometry(productProps.size * 0.7, 6, 6);
      const productMaterial = new THREE.MeshPhongMaterial({
        color: productProps.color,
        emissive: productProps.emissive,
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.8
      });
      const product = new THREE.Mesh(productGeometry, productMaterial);
      
      // Position will be set dynamically when parent product fissions
      product.position.set(0, -5, 0);
      product.visible = false; // Hidden until parent fissions
      
      product.name = `SecondaryProduct_${selectedType}_${i}`;
      product.userData = {
        type: selectedType,
        parentIndex: Math.floor(Math.random() * numPrimaryProducts),
        direction: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        lifetime: 0,
        maxLifetime: 1.5,
        energy: productProps.probability * 5
      };
      
      reboundNuclearGroup.add(product);
    }
    
    effectsGroup.add(reboundNuclearGroup);
    
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

  // Create MHD flow visualization - simplified particle-based fluid dynamics
  // Physics: Ionized H2/D2 particles following MHD fluid flow, color changes with phase/energy
  const createVortexFlow = useCallback((scene) => {
    const vortexGroup = new THREE.Group();
    vortexGroup.name = 'MHDFlowGroup';
    
    const latticeY = PHYSICS_CONFIG.LATTICE_Y_OFFSET + PHYSICS_CONFIG.LATTICE_SURFACE_OFFSET;
    
    try {
    // Create plasma vortex effect - particle-based MHD flow
    const plasmaVortex = new PlasmaVortexEffect({
      particleCount: 200,
      vortexStrength: 1.0,
      radialSpeed: 0.25,
      verticalSpeed: 0.4,
      radius: 2.0,
      height: 3.5
    });
    plasmaVortex.initialize();
    plasmaVortex.getGroup().position.set(0, latticeY + 0.6, 0);
    vortexGroup.add(plasmaVortex.getGroup());
    plasmaVortexRef.current = plasmaVortex;
    } catch (error) {
      console.warn('Failed to create plasma vortex effect:', error);
    }
    
    try {
    // MHD vortex field for fluid dynamics calculations
    const vortexField = new VortexField({
      strength: 1.2,
      decayRate: 0.3,
      rotationAxis: new THREE.Vector3(0, 1, 0)
    });
    vortexField.addVortex(new THREE.Vector3(0, latticeY + 0.5, 0), 2.0, 2.5);
    vortexFieldRef.current = vortexField;
    } catch (error) {
      console.warn('Failed to create vortex field:', error);
    }
    
    // Note: Removed rings, arrows, and flow lines for cleaner particle-only visualization
    // MHD flow is represented purely by particle motion following fluid dynamics
    
    scene.add(vortexGroup);
    vortexGroupRef.current = vortexGroup;
    
    return vortexGroup;
  }, []);

  // Create Casimir force field visualization
  // F_Casimir = -π²ℏc/(240) * A/d⁴
  const createCasimirField = useCallback((scene) => {
    const casimirGroup = new THREE.Group();
    casimirGroup.name = 'CasimirFieldGroup';
    
    // Physical constants
    const HBAR = 1.055e-34; // J·s
    const C = 3e8; // m/s
    const PI_SQ = Math.PI * Math.PI;
    const _CASIMIR_COEFF = -PI_SQ * HBAR * C / 240; // N·m² (for reference)
    
    // Create force field lines from bubble surface to lattice atoms
    const lineCount = 16;
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.6,
      linewidth: 2
    });
    
    // Sample points on bubble surface and lattice
    for (let i = 0; i < lineCount; i++) {
      const angle = (i / lineCount) * Math.PI * 2;
      const phi = (i % 8) / 8 * Math.PI; // Vary elevation
      
      // Bubble surface point (at radius ~1.0 in visualization units)
      const bubbleRadius = 1.0;
      const bubblePoint = new THREE.Vector3(
        bubbleRadius * Math.sin(phi) * Math.cos(angle),
        2, // Bubble Y position
        bubbleRadius * Math.sin(phi) * Math.sin(angle)
      );
      
      // Nearest lattice point (simplified - find closest lattice atom)
      const latticeY = -5;
      const latticePoint = new THREE.Vector3(
        bubblePoint.x * 0.3, // Project toward center
        latticeY,
        bubblePoint.z * 0.3
      );
      
      // Calculate distance
      const distance = bubblePoint.distanceTo(latticePoint);
      
      // Casimir force magnitude: F ∝ 1/d⁴
      // Normalize for visualization (force lines get more intense as distance decreases)
      const forceMagnitude = 1 / Math.pow(Math.max(distance, 0.1), 4);
      const normalizedForce = Math.min(forceMagnitude * 100, 1.0);
      
      // Create curved force line (attractive, so toward each other)
      const points = [];
      const segments = 20;
      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        // Curve the line to show attractive force
        const curveFactor = Math.sin(t * Math.PI) * 0.3;
        const point = new THREE.Vector3().lerpVectors(bubblePoint, latticePoint, t);
        // Add curvature perpendicular to line
        const perp = new THREE.Vector3(-point.z, 0, point.x).normalize();
        point.add(perp.multiplyScalar(curveFactor * normalizedForce));
        points.push(point);
      }
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, lineMaterial.clone());
      line.material.opacity = normalizedForce * 0.6;
      line.material.color.setHSL(0.1, 1, 0.5 + normalizedForce * 0.3); // Orange to red based on intensity
      line.name = `CasimirLine${i}`;
      line.userData = { distance, forceMagnitude, baseAngle: angle };
      casimirGroup.add(line);
    }
    
    // Add force intensity indicators (small spheres showing force strength)
    // Keep these small and subtle - they should not dominate the visualization
    const indicatorGeometry = new THREE.SphereGeometry(0.03, 6, 6); // Smaller base size
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const indicatorMaterial = new THREE.MeshBasicMaterial({
        color: 0xff4400,
        transparent: true,
        opacity: 0.4 // Lower base opacity
      });
      const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
      indicator.position.set(
        Math.cos(angle) * 0.5,
        -4,
        Math.sin(angle) * 0.5
      );
      indicator.name = `CasimirIndicator${i}`;
      indicator.userData = { 
        pulsePhase: i / 8,
        baseScale: 1.0 // Track base scale to prevent excessive scaling
      };
      casimirGroup.add(indicator);
    }
    
    scene.add(casimirGroup);
    casimirFieldRef.current = casimirGroup;
    
    return casimirGroup;
  }, []);

  // Create Rydberg Matter orbital visualization
  // Extended electron orbitals around lattice atoms (Rydberg states)
  const createRydbergOrbitals = useCallback((scene) => {
    const rydbergGroup = new THREE.Group();
    rydbergGroup.name = 'RydbergOrbitalsGroup';
    
    // Create extended orbitals around lattice atoms
    // Rydberg orbitals: physically scale as n²*a₀ (Bohr radius)
    // For n=3: R = 9*0.053nm ≈ 0.48nm, but in visualization we scale for visibility
    // Observationally, Rydberg orbitals are ~10-100x larger than ground state (0.3 → 0.4-0.6 is reasonable)
    const orbitalCount = 12; // Number of lattice atoms to show orbitals for
    const orbitalGeometry = new THREE.SphereGeometry(0.5, 16, 16); // Reduced from 0.8 to 0.5 (more accurate scale)
    const orbitalMaterial = new THREE.MeshBasicMaterial({
      color: 0x8844ff,
      transparent: true,
      opacity: 0.06, // Much more transparent (reduced from 0.15 to 0.06)
      wireframe: true,
      side: THREE.DoubleSide
    });
    
    // Sample some lattice positions (simplified - in real implementation, get from lattice)
    for (let i = 0; i < orbitalCount; i++) {
      const angle = (i / orbitalCount) * Math.PI * 2;
      const radius = 1.5 + (i % 3) * 0.5;
      // Position halo electrons around lattice surface
      const y = PHYSICS_CONFIG.LATTICE_Y_OFFSET + (i % 4) * 0.8;
      
      const orbital = new THREE.Mesh(orbitalGeometry, orbitalMaterial.clone());
      orbital.position.set(
        radius * Math.cos(angle),
        y,
        radius * Math.sin(angle)
      );
      orbital.name = `RydbergOrbital${i}`;
      orbital.userData = { 
        baseRadius: 0.5, // Updated to match new geometry size
        phase: i / orbitalCount,
        energyLevel: 1 + (i % 3) // n=1,2,3 Rydberg states
      };
      rydbergGroup.add(orbital);
    }
    
    // Add overlap regions (where orbitals intersect - reaction sites)
    const overlapGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const overlapMaterial = new THREE.MeshStandardMaterial({
      color: 0xff00ff,
      transparent: true,
      opacity: 0.6,
      emissive: 0xff00ff,
      emissiveIntensity: 0.5
    });
    
    // Add overlap indicators at intersections
    for (let i = 0; i < 4; i++) {
      const overlap = new THREE.Mesh(overlapGeometry, overlapMaterial.clone());
      overlap.position.set(
        (Math.random() - 0.5) * 2,
        -4.5 + Math.random() * 2,
        (Math.random() - 0.5) * 2
      );
      overlap.name = `OrbitalOverlap${i}`;
      overlap.userData = { pulsePhase: Math.random() * Math.PI * 2 };
      rydbergGroup.add(overlap);
    }
    
    scene.add(rydbergGroup);
    rydbergOrbitalsRef.current = rydbergGroup;
    
    return rydbergGroup;
  }, []);

  // Create Halo electron cloud visualization
  // P_overlap = (1/πa³)exp(-2r₀/a) ≈ 10⁻³
  const createHaloElectrons = useCallback((scene) => {
    const haloGroup = new THREE.Group();
    haloGroup.name = 'HaloElectronsGroup';
    
    // Halo electrons are extended probability clouds around protons
    // Overlap probability with nucleus is ~10⁻³
    const protonCount = 20; // Number of protons to show halo electrons for
    const cloudParticleCount = 150; // Particles per cloud
    
    const particleGeometry = new THREE.SphereGeometry(0.03, 6, 6);
    
    for (let i = 0; i < protonCount; i++) {
      const cloudGroup = new THREE.Group();
      cloudGroup.name = `HaloCloud${i}`;
      
      // Random position near lattice (where protons would be)
      const basePos = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        -5 + Math.random() * 2,
        (Math.random() - 0.5) * 4
      );
      
      // Create probability cloud (larger than normal electron cloud)
      const cloudRadius = 0.4; // Extended halo radius
      const particleMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.4,
        emissive: 0x00ffff,
        emissiveIntensity: 0.3
      });
      
      for (let j = 0; j < cloudParticleCount; j++) {
        // Spherical distribution with exponential falloff (halo probability distribution)
        const r = cloudRadius * Math.sqrt(Math.random()); // Uniform in volume
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        // Exponential probability: P(r) ∝ exp(-2r/a)
        const a = 0.2; // Halo parameter
        const probability = Math.exp(-2 * r / a);
        if (Math.random() > probability) continue; // Skip low-probability regions
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone());
        particle.position.set(
          basePos.x + r * Math.sin(phi) * Math.cos(theta),
          basePos.y + r * Math.sin(phi) * Math.sin(theta),
          basePos.z + r * Math.cos(phi)
        );
        particle.userData = { 
          basePosition: particle.position.clone(),
          probability,
          r
        };
        cloudGroup.add(particle);
      }
      
      // Add nucleus indicator (small bright sphere)
      const nucleusGeometry = new THREE.SphereGeometry(0.05, 8, 8);
      const nucleusMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 1.0
      });
      const nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial);
      nucleus.position.copy(basePos);
      nucleus.name = `Nucleus${i}`;
      cloudGroup.add(nucleus);
      
      haloGroup.add(cloudGroup);
    }
    
    scene.add(haloGroup);
    haloElectronsRef.current = haloGroup;
    
    return haloGroup;
  }, []);

  /**
   * Create 3D scale bar for physical dimension reference
   * Shows real-world scale (micrometers) for bubble/lattice visualization
   */
  const createScaleBar = useCallback((scene) => {
    // Clean up existing scale bar
    if (scaleBarRef.current) {
      scene.remove(scaleBarRef.current.getGroup());
    }
    
    // Create scale bar - bubble radius is typically 1-50 micrometers
    // Position in bottom-left of the scene
    const scaleBar = new ScaleBar({
      length: 4,
      realWorldScale: 1e-6, // 1 unit = 1 micrometer for bubble visualization
      position: new THREE.Vector3(-6, -6, 4),
      color: 0x00ffcc,
    });
    scaleBar.initialize();
    scene.add(scaleBar.getGroup());
    scaleBarRef.current = scaleBar;
    
    return scaleBar;
  }, []);

  // Physics-based bubble radius calculation using Rayleigh-Plesset equation
  // R*R'' + 3/2*R'² = (1/ρ)[P_b - P_∞ - 2σ/R - 4μR'/R + ε₀E²/2]
  const calculateBubbleRadius = useCallback((normalizedTime, baseRadius) => {
    let radius;
    let phase;
    let compressionRatio = 1.0;
    let fieldStrength = 0;
    let temperature = parameters.temperature;
    
    // Physical constants (SI units)
    const _EPS0 = 8.854e-12; // F/m (for reference)
    const SIGMA = 0.0728; // N/m (surface tension, water)
    const _RHO = 998; // kg/m³ (density, water - for reference)
    const _MU = 1.002e-3; // Pa·s (viscosity, water - for reference)
    const GAMMA = 1.4; // Polytropic index
    
    // Convert baseRadius from visualization units to meters (approximate)
    const R0_m = baseRadius * 1e-6; // Assume visualization units are in μm scale
    
    // Time in cycle (0 to period)
    const period = 1.0 / (parameters.frequency * 1000); // Convert kHz to Hz
    const t = normalizedTime * period;
    const omega = 2 * Math.PI * parameters.frequency * 1000;
    
    // Phase determination based on normalized time
    if (normalizedTime < 0.4) {
      phase = 'EXPANSION';
      const _t_phase = normalizedTime / 0.4; // Phase progress (for reference)
      // Expansion: driven by acoustic pressure
      const P_acoustic = parameters.drivingPressure * 1e5 * Math.sin(omega * t * 0.4); // Convert bar to Pa
      const expansionFactor = 1 + (P_acoustic / (101325 + 2 * SIGMA / R0_m)) * 0.3;
      radius = baseRadius * Math.max(1.0, Math.min(1.3, expansionFactor));
    } else if (normalizedTime < 0.55) {
      phase = 'COLLAPSE';
      const t_phase = (normalizedTime - 0.4) / 0.15;
      // Collapse: rapid compression following Rayleigh-Plesset dynamics
      // Simplified: R(t) ≈ R_max * (1 - t²) for rapid collapse
      const R_max = baseRadius * (1 + parameters.drivingPressure * 0.3);
      const R_min = baseRadius * 0.1; // Minimum radius (compression ratio ~10)
      radius = R_max - (R_max - R_min) * Math.pow(t_phase, 2);
      compressionRatio = baseRadius / Math.max(radius, baseRadius * 0.1);
    } else if (normalizedTime < 0.6) {
      phase = 'MINIMUM';
      radius = baseRadius * 0.1; // Maximum compression
      compressionRatio = 10.0;
    } else if (normalizedTime < 0.7) {
      phase = 'REBOUND';
      const t_phase = (normalizedTime - 0.6) / 0.1;
      // Rebound: rapid expansion after collapse
      const R_min = baseRadius * 0.1;
      const R_rebound = baseRadius * 0.6;
      radius = R_min + (R_rebound - R_min) * t_phase;
      compressionRatio = baseRadius / radius;
    } else {
      phase = 'RECOVERY';
      const t_phase = (normalizedTime - 0.7) / 0.3;
      // Recovery: gradual return to equilibrium
      const R_recovery = baseRadius * 0.6;
      radius = R_recovery + (baseRadius - R_recovery) * t_phase;
      compressionRatio = baseRadius / radius;
    }
    
    // Calculate electric field strength from double-layer (intensifies with compression)
    // E = E0 * (R0/R)² (field scales with inverse square of radius)
    const E0 = 1e8; // V/m (baseline double-layer field)
    fieldStrength = E0 * Math.pow(baseRadius / Math.max(radius, baseRadius * 0.1), 2);
    
    // Calculate temperature from adiabatic compression
    // T = T0 * (R0/R)^(3(γ-1))
    temperature = parameters.temperature * Math.pow(compressionRatio, 3 * (GAMMA - 1));
    
    // Calculate pressure from polytropic gas law
    // P = P0 * (R0/R)^(3γ)
    const P0 = 101325; // Pa (ambient pressure)
    const pressure = P0 * Math.pow(compressionRatio, 3 * GAMMA);
    
    return { 
      radius: Math.max(baseRadius * 0.05, radius), 
      phase,
      compressionRatio,
      fieldStrength,
      temperature,
      pressure
    };
  }, [drivingPressure, parameters.temperature, parameters.frequency]);

  // Calculate enhancement factors based on physics conditions
  const calculateEnhancementFactors = useCallback((compressionRatio, fieldStrength, temperature, _pressure) => {
    // Physical constants
    const KB = 1.381e-23; // J/K
    const E_CHARGE = 1.602e-19; // C
    const EPS0 = 8.854e-12; // F/m
    const _ALPHA = 1/137; // Fine structure constant (for reference)
    
    // Electron density (from material properties)
    const n_e = 6.8e28; // m⁻³ (palladium)
    
    // 1. Electron Screening Enhancement
    // Debye screening length: λ_D = √(ε₀kT / (n_e e²))
    const lambda_d = Math.sqrt(EPS0 * KB * temperature / (n_e * E_CHARGE * E_CHARGE));
    const U_screen = E_CHARGE * E_CHARGE / (4 * Math.PI * EPS0 * lambda_d);
    const E_thermal = 1.5 * KB * temperature / E_CHARGE; // eV
    const screening_factor = Math.min(1e4, Math.exp(U_screen / Math.max(E_thermal, 0.01)));
    
    // 2. QED Double-Layer Enhancement
    // Enhancement from high electric field: f_QED = 1 + (E/E_crit)²
    const E_critical = 1e8; // V/m
    const qed_factor = 1 + Math.pow(fieldStrength / E_critical, 2);
    
    // 3. Casimir Enhancement
    // Casimir force scales with 1/d⁴, enhancement from proximity
    // Simplified: f_casimir ≈ (R0/R)² = compressionRatio²
    const casimir_factor = Math.pow(compressionRatio, 2);
    
    // 4. Rydberg Matter Enhancement
    // Extended orbitals enable energy localization
    // Enhancement scales with compression and field
    const rydberg_factor = 1 + 0.5 * compressionRatio * (fieldStrength / 1e8);
    
    // 5. Compression Enhancement
    // Increased density from compression
    const compression_factor = Math.pow(compressionRatio, 1.5);
    
    // Combined enhancement (multiplicative, capped at 10⁸)
    const total = screening_factor * qed_factor * casimir_factor * rydberg_factor * compression_factor;
    
    return {
      total: Math.min(total, 1e8),
      screening: screening_factor,
      qed: qed_factor,
      casimir: casimir_factor,
      rydberg: rydberg_factor,
      compression: compression_factor
    };
  }, []);
  
  // Update proton states based on physics-based transition probabilities
  const updateProtonStates = useCallback((phase, normalizedTime, enhancement, fieldStrength, temperature) => {
    if (!protonGroupRef.current) return;
    
    // Physics-based transition thresholds
    const SCREENING_THRESHOLD = 10; // eV (10 eV barrier reduction)
    const CAPTURE_THRESHOLD = 1e3; // Enhancement factor
    const NUCLEAR_THRESHOLD = 1e5; // Enhancement factor
    
    const E_thermal_ev = 1.5 * 1.381e-23 * temperature / 1.602e-19; // Convert to eV
    
    protonGroupRef.current.children.forEach((proton) => {
      let newState;
      
      if (phase === 'EXPANSION' || phase === 'RECOVERY') {
        newState = 'FREE';
      } else if (phase === 'COLLAPSE') {
        // Physics-based transitions during collapse
        if (enhancement > NUCLEAR_THRESHOLD) {
          newState = Math.random() < 0.2 ? 'NUCLEAR' : 'CAPTURE_READY';
        } else if (enhancement > CAPTURE_THRESHOLD) {
          newState = 'CAPTURE_READY';
        } else if (fieldStrength > 1e7 || E_thermal_ev > SCREENING_THRESHOLD) {
          newState = 'SCREENED';
        } else {
          newState = 'FREE';
        }
      } else if (phase === 'MINIMUM') {
        // At minimum radius, highest enhancement
        if (enhancement > NUCLEAR_THRESHOLD) {
        newState = Math.random() < 0.3 ? 'NUCLEAR' : 'CAPTURE_READY';
        } else {
          newState = 'CAPTURE_READY';
        }
      } else if (phase === 'REBOUND') {
        // Gradual transition back
        if (enhancement > CAPTURE_THRESHOLD) {
          newState = Math.random() < 0.3 ? 'CAPTURE_READY' : 'SCREENED';
        } else {
          newState = 'SCREENED';
        }
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
      try {
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
      
      // Reset rebound nuclear products for new cycle
      if (effectsGroupRef.current) {
        const reboundNuclear = effectsGroupRef.current.getObjectByName('ReboundNuclearEvent');
        if (reboundNuclear) {
          let primaryIndex = 0;
          reboundNuclear.children.forEach((child) => {
            if (child.name && child.name.startsWith('PrimaryProduct')) {
              // Reset primary products to lattice surface
              const angle = (primaryIndex / 8) * Math.PI * 2;
              const radius = 0.3 + Math.random() * 0.2;
              child.position.set(
                radius * Math.cos(angle),
                -5,
                radius * Math.sin(angle)
              );
              child.userData.lifetime = 0;
              child.visible = false;
              child.userData.fissionReady = Math.random() < 0.3; // Reset fission probability
              
              // Reset velocity direction
              const elevation = (Math.random() - 0.5) * Math.PI / 4;
              child.userData.direction = new THREE.Vector3(
                Math.sin(elevation) * Math.cos(angle),
                Math.cos(elevation),
                Math.sin(elevation) * Math.sin(angle)
              ).normalize();
              child.userData.velocity = child.userData.direction.clone().multiplyScalar(0.1 + Math.random() * 0.1);
              
              primaryIndex++;
            } else if (child.name && child.name.startsWith('SecondaryProduct')) {
              child.visible = false;
              child.userData.lifetime = 0;
              child.position.set(0, -5, 0);
            }
          });
        }
      }
    }
    
    const normalizedTime = normalizedTimeRef.current;
    setCycleProgress(normalizedTime);
    
    const baseRadius = initialBubbleRadius;
    
    // Try to use API simulation data if available, otherwise use local calculations
    const apiData = simulationData?.enhancement_timeline 
      ? interpolateFromAPITimeline(simulationData.enhancement_timeline, normalizedTime)
      : null;
    
    // Track whether we're using API data (only update state if changed)
    const nowUsingAPI = !!apiData;
    if (nowUsingAPI !== usingAPIDataRef.current) {
      setUsingAPIData(nowUsingAPI);
      usingAPIDataRef.current = nowUsingAPI;
    }
    
    let radius, phase, compressionRatio, fieldStrength, temperature, pressure, enhancements;
    
    if (apiData) {
      // Use API physics data
      radius = baseRadius * apiData.radius_factor;
      phase = apiData.phase;
      fieldStrength = apiData.electric_field;
      temperature = apiData.temperature;
      compressionRatio = baseRadius / Math.max(radius, baseRadius * 0.1);
      pressure = 101325 * Math.pow(compressionRatio, 4.2); // Approximate
      
      // Safely access enhancement_breakdown with fallback defaults
      const breakdown = apiData.enhancement_breakdown || {};
      enhancements = {
        total: breakdown.total || apiData.enhancement || 1.0,
        screening: breakdown.screening || 1.0,
        qed: breakdown.qed || 1.0,
        casimir: breakdown.casimir || 1.0,
        rydberg: breakdown.rydberg || 1.0,
        compression: breakdown.compression || 1.0,
        phonon: breakdown.phonon || 1.0,
        loading: breakdown.loading || 1.0
      };
    } else {
      // Fall back to local physics calculations
      const localPhysics = calculateBubbleRadius(normalizedTime, baseRadius);
      radius = localPhysics.radius;
      phase = localPhysics.phase;
      compressionRatio = localPhysics.compressionRatio;
      fieldStrength = localPhysics.fieldStrength;
      temperature = localPhysics.temperature;
      pressure = localPhysics.pressure;
      
      enhancements = calculateEnhancementFactors(compressionRatio, fieldStrength, temperature, pressure);
    }
    
    bubbleRadiusRef.current = radius;
    
    // Update physics data state
    setPhysicsData({ compressionRatio, fieldStrength, temperature, pressure });
    
    // Set enhancement data
    setCurrentEnhancement(enhancements.total);
    setEnhancementBreakdown(enhancements);
    
    // Use ref to track phase changes to avoid stale closure
    if (phase !== currentPhaseRef.current) {
      currentPhaseRef.current = phase;
      setCurrentPhase(phase);
      onPhaseChange(phase);
    }
    
    // Update bubble and torus-to-jet visualization
    // Note: We check showBubble for the main bubble, but torus/jet visibility is controlled by phase
    if (bubbleGroupRef.current) {
      const bubble = bubbleGroupRef.current.getObjectByName('MainBubble');
      const doubleLayer = bubbleGroupRef.current.getObjectByName('DoubleLayer');
      const innerLayer = bubbleGroupRef.current.getObjectByName('InnerLayer');
      
      // Torus-to-jet formation visualization (always update, visibility controlled by phase)
      const torus = bubbleGroupRef.current.getObjectByName('TorusFormation');
      const jet = bubbleGroupRef.current.getObjectByName('FocusedJet');
      
      // Determine which geometry to show based on phase
      // Main bubble visibility is controlled by showBubble toggle
      if (phase === 'EXPANSION' || phase === 'RECOVERY') {
        // Show sphere
        if (bubble && showBubble) {
          bubble.visible = true;
        bubble.scale.setScalar(radius / baseRadius);
        bubble.material.opacity = 0.3 + (1 - radius / baseRadius) * 0.4;
        } else if (bubble) {
          bubble.visible = false;
        }
        if (torus) torus.visible = false;
        if (jet) jet.visible = false;
      } else if (phase === 'COLLAPSE') {
        // Show torus formation (bubble collapsing into torus shape)
        const collapseProgress = Math.min(1, (normalizedTime - 0.4) / 0.15);
        const torusProgress = Math.min(1, collapseProgress * 2); // Torus appears halfway through collapse
        
        if (bubble && showBubble) {
          // Fade out sphere as torus appears
          bubble.visible = torusProgress < 0.7;
          bubble.scale.setScalar((radius / baseRadius) * (1 - torusProgress * 0.5));
          bubble.material.opacity = 0.3 * (1 - torusProgress);
        } else if (bubble) {
          bubble.visible = false;
        }
        
        if (torus) {
          // Make torus visible earlier and more prominently
          torus.visible = torusProgress > 0.1; // Show earlier (10% instead of 30%)
          // Torus contracts and intensifies during collapse
          // Start larger and contract more dramatically
          const torusRadius = torus.userData.baseRadius * (1 - collapseProgress * 0.5); // Less contraction to keep visible
          const tubeRadius = torus.userData.baseTubeRadius * (1 - collapseProgress * 0.6);
          // Scale uniformly but adjust for radius changes
          const scaleFactor = torusRadius / torus.userData.baseRadius;
          torus.scale.setScalar(scaleFactor);
          // Adjust tube radius by scaling Y (thickness of torus ring)
          torus.scale.y = tubeRadius / torus.userData.baseTubeRadius;
          // Increase opacity and emissive for better visibility
          torus.material.opacity = 0.6 + collapseProgress * 0.3;
          if (torus.material.emissiveIntensity !== undefined) {
            torus.material.emissiveIntensity = 0.8 + collapseProgress * 1.2;
          }
        }
        if (jet) jet.visible = false;
      } else if (phase === 'MINIMUM' || phase === 'REBOUND') {
        // Show focused jet (torus collapses into focused jet)
        const jetProgress = phase === 'MINIMUM' ? 1.0 : Math.max(0, 1 - (normalizedTime - 0.6) / 0.1);
        
        if (bubble) bubble.visible = false; // Always hide bubble during minimum/rebound
        if (torus) {
          // Fade out torus as jet forms
          torus.visible = jetProgress < 0.8;
          torus.material.opacity = 0.8 * (1 - jetProgress);
        }
        
        if (jet) {
          // Visible jet during bubble collapse toward lattice
          jet.visible = jetProgress > 0.1; // Show early in the phase
          // Jet intensifies and extends during minimum (focused jet formation)
          const jetRadius = jet.userData.baseRadius * (1 - jetProgress * 0.4);
          const jetHeight = jet.userData.baseHeight * (1 + jetProgress * 2.0);
          jet.scale.set(jetRadius / jet.userData.baseRadius, jetHeight / jet.userData.baseHeight, jetRadius / jet.userData.baseRadius);
          // Bright opacity during collapse
          jet.material.opacity = 0.8 + jetProgress * 0.2;
          if (jet.material.emissiveIntensity !== undefined) {
            jet.material.emissiveIntensity = 1.5 + jetProgress * 2.5;
          }
          // Position jet at bubble center, extending downward
          jet.position.set(0, 0, 0); // Relative to bubbleGroup
        }
      }
      
      // Update double layer and inner layer
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
      
      // ========================================================================
      // HETEROGENEOUS NUCLEATION BUBBLE DYNAMICS
      // ========================================================================
      // Physics: Bubble nucleates at surface cavity, grows while attached,
      // buoyancy pulls slightly, then acoustic/EM forcing collapses it to surface
      const latticeY = PHYSICS_CONFIG.LATTICE_Y_OFFSET + PHYSICS_CONFIG.LATTICE_SURFACE_OFFSET;
      const distances = PHYSICS_CONFIG.PHASE_DISTANCES;
      
      // Calculate phase progress for smooth animations
      let phaseProgress = 0;
      if (phase === 'EXPANSION') {
        phaseProgress = Math.min(1, normalizedTime / 0.4);
      } else if (phase === 'COLLAPSE') {
        phaseProgress = Math.min(1, (normalizedTime - 0.4) / 0.15);
      } else if (phase === 'REBOUND') {
        phaseProgress = Math.min(1, (normalizedTime - 0.55) / 0.1);
      } else if (phase === 'RECOVERY') {
        phaseProgress = Math.min(1, (normalizedTime - 0.65) / 0.35);
      }
      
      // Get bubble Y position from helper (stays close to surface)
      bubbleGroupRef.current.position.y = getBubbleYFromPhase(phase, phaseProgress);
      
      // Apply physics-based bubble scale
      // Bubble starts small at nucleation, grows during expansion, shrinks during collapse
      const physicsScale = getBubbleScaleFromPhase(phase, phaseProgress);
      
      // Combine with radius-based scaling from physics calculations
      const combinedScale = physicsScale * (radius / baseRadius);
      
      // Apply scale to main bubble and layers
      if (bubble && showBubble) {
        // During EXPANSION: bubble grows from tiny nucleus to full size
        // During COLLAPSE: bubble rapidly shrinks
        const displayScale = phase === 'EXPANSION' || phase === 'RECOVERY' 
          ? combinedScale 
          : radius / baseRadius; // Use original logic during collapse for visual effect
      }
      
      // Update bubble size based on phase (growth at surface, then collapse)
      if (doubleLayer) {
        doubleLayer.scale.setScalar(combinedScale * 1.1);
      }
      if (innerLayer) {
        innerLayer.scale.setScalar(combinedScale * 0.95);
      }
    }
    
    // Update H2/D2 particles with MHD fluid dynamics (v0.2.3)
    // Physics: Ionized hydrogen/deuterium swirling around bubble following MHD flow
    if (showProtons) {
      updateProtonStates(phase, normalizedTime, enhancements.total, physicsData.fieldStrength, physicsData.temperature);
      
      // Cavitation point: nucleation site on the lattice surface
      const latticeY = PHYSICS_CONFIG.LATTICE_Y_OFFSET + PHYSICS_CONFIG.LATTICE_SURFACE_OFFSET;
      const bubbleY = bubbleGroupRef.current?.position.y ?? latticeY;
      const bubbleScale = getBubbleScaleFromPhase(phase, normalizedTime);
      
      const cavitationPoint = {
        x: 0,
        y: latticeY,
        z: 0
      };
      
      protonGroupRef.current?.children.forEach((proton, index) => {
        // MHD properties
        const mhdAngle = proton.userData.mhdAngle || 0;
        const mhdRadius = proton.userData.mhdRadius || 1.0;
        const mhdAngularVelocity = proton.userData.mhdAngularVelocity || 0.5;
        const mhdPhase = proton.userData.mhdPhase || 0;
        
        // Direction and distance to cavitation point
        const dx = cavitationPoint.x - proton.position.x;
        const dy = cavitationPoint.y - proton.position.y;
        const dz = cavitationPoint.z - proton.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.001;
        const horizontalDist = Math.sqrt(dx * dx + dz * dz) + 0.001;
        
        if (phase === 'COLLAPSE' || phase === 'MINIMUM') {
          // ========================================================================
          // MHD COMPRESSION: Particles spiral inward and converge to surface
          // ========================================================================
          const compressionRatio = physicsData.compressionRatio || 1;
          const confinementStrength = 0.025 * compressionRatio;
          
          // Radial force toward cavitation (increases with compression)
          const radialForce = confinementStrength / (distance + 0.1);
          proton.position.x += (dx / distance) * radialForce;
          proton.position.y += (dy / distance) * radialForce * 1.5; // Stronger downward
          proton.position.z += (dz / distance) * radialForce;
          
          // MHD azimuthal rotation (circular flow around bubble)
          // Speed increases as particles compress inward
          const rotationSpeed = mhdAngularVelocity * (1 + compressionRatio * 0.5);
          proton.userData.mhdAngle = (proton.userData.mhdAngle || 0) + rotationSpeed * 0.05;
          
          // Apply circular motion
          const theta = proton.userData.mhdAngle;
          const currentRadius = horizontalDist * 0.95; // Slowly contract radius
          proton.position.x = currentRadius * Math.cos(theta);
          proton.position.z = currentRadius * Math.sin(theta);
          
          // Store vorticity for visualization
          proton.userData.vorticity = rotationSpeed * 5;
          
        } else if (phase === 'REBOUND') {
          // Particles scatter outward during rebound
          const scatterForce = 0.015;
          proton.position.x -= (dx / distance) * scatterForce;
          proton.position.y -= (dy / distance) * scatterForce * 0.5;
          proton.position.z -= (dz / distance) * scatterForce;
          
          // Continue some rotation but slower
          proton.userData.mhdAngle = (proton.userData.mhdAngle || 0) + mhdAngularVelocity * 0.02;
          proton.userData.vorticity = (proton.userData.vorticity || 0) * 0.8;
          
        } else {
          // ========================================================================
          // EXPANSION/RECOVERY: Swirling MHD flow around bubble
          // ========================================================================
          // Update MHD angle for continuous rotation
          proton.userData.mhdAngle = (proton.userData.mhdAngle || 0) + mhdAngularVelocity * 0.03;
          const theta = proton.userData.mhdAngle;
          
          // Particles orbit around the bubble at their shell radius
          // Scale with bubble size
          const orbitRadius = mhdRadius * (0.7 + bubbleScale * 0.4);
          const targetX = orbitRadius * Math.cos(theta);
          const targetZ = orbitRadius * Math.sin(theta);
          
          // Target Y position - follow bubble boundary layer
          const verticalOffset = 0.3 + Math.sin(mhdPhase + normalizedTime * 2) * 0.15;
          const targetY = bubbleY + verticalOffset;
          
          // Smooth interpolation to orbital position
          proton.position.x = proton.position.x * 0.9 + targetX * 0.1;
          proton.position.z = proton.position.z * 0.9 + targetZ * 0.1;
          proton.position.y = proton.position.y * 0.95 + targetY * 0.05;
          
          // Store vorticity
          proton.userData.vorticity = mhdAngularVelocity * 2;
        }
        
        // Add small thermal fluctuations
        const thermalScale = 0.002;
        proton.position.x += (Math.random() - 0.5) * thermalScale;
        proton.position.z += (Math.random() - 0.5) * thermalScale;
        
        // ========================================================================
        // COLOR CHANGES BASED ON PHASE AND ENERGY
        // ========================================================================
        // Particles change color to represent ionization state and energy level
        if (proton.material) {
          const compressionRatio = physicsData.compressionRatio || 1;
          const energyLevel = Math.min(1, compressionRatio / 50); // Normalize energy 0-1
          
          if (phase === 'COLLAPSE' || phase === 'MINIMUM') {
            // High energy - shift from yellow/orange to red/white
            // Ionized state - high energy particles
            const hue = 0.1 - energyLevel * 0.1; // Orange to red
            const saturation = 1 - energyLevel * 0.3; // Less saturated at high energy
            const lightness = 0.5 + energyLevel * 0.3; // Brighter at high energy
            proton.material.color.setHSL(hue, saturation, lightness);
            proton.material.emissive.setHSL(hue, saturation, lightness * 0.5);
            proton.material.emissiveIntensity = 0.8 + energyLevel * 1.5;
          } else if (phase === 'REBOUND') {
            // Energy release - bright green/cyan flash
            const hue = 0.35 + energyLevel * 0.1; // Green to cyan
            proton.material.color.setHSL(hue, 0.9, 0.6);
            proton.material.emissive.setHSL(hue, 0.9, 0.4);
            proton.material.emissiveIntensity = 1.2;
          } else {
            // Expansion/Recovery - neutral ionized state (blue/cyan for electrons, orange for protons)
            const isIonized = proton.userData.isIonized;
            if (isIonized) {
              // Ionized - cyan/blue glow
              proton.material.color.setHSL(0.55, 0.8, 0.5);
              proton.material.emissive.setHSL(0.55, 0.8, 0.3);
            } else {
              // Neutral H2/D2 - warm orange
              proton.material.color.setHSL(0.08, 0.9, 0.55);
              proton.material.emissive.setHSL(0.08, 0.9, 0.3);
            }
            proton.material.emissiveIntensity = 0.4;
          }
        }
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
          // Reverse energy flow direction during rebound
          if (phase === 'REBOUND') {
            // Particles flow outward from lattice (reversed)
            child.position.set(
              lineRadius * Math.cos(angle),
              -5 + t * 7, // From lattice upward (reversed)
              lineRadius * Math.sin(angle)
            );
            child.material.opacity = 0.9; // Bright during rebound
          } else {
          child.material.opacity = (phase === 'COLLAPSE' || phase === 'MINIMUM') ? 0.8 : 0.3;
          }
        }
      });
    }
    
    // Update effects
    if (effectsGroupRef.current) {
      const nuclearEmissions = effectsGroupRef.current.getObjectByName('NuclearEmissions');
      const reboundNuclear = effectsGroupRef.current.getObjectByName('ReboundNuclearEvent');
      const shockwave = effectsGroupRef.current.getObjectByName('Shockwave');
      
      // Fractal nuclear emissions during minimum phase (from bubble collapse)
      if (phase === 'MINIMUM') {
        if (nuclearEmissions) {
          nuclearEmissions.visible = true;
          
          // Animate fractal emissions - pulse and expand
          const emissionIntensity = phase === 'MINIMUM' ? 1.0 : Math.max(0, 1 - (normalizedTime - 0.6) / 0.1);
          const time = Date.now() * 0.001; // Slower animation
          
          // Recursively animate all children in the fractal structure
          nuclearEmissions.traverse((child) => {
            if (child.isMesh) {
              if (child.name && child.name.startsWith('NuclearCore')) {
                // Pulse the core (tiny nuclear event point)
                if (!child.userData.pulsePhase) child.userData.pulsePhase = Math.random() * Math.PI * 2;
                const pulse = Math.sin(time * 10 + child.userData.pulsePhase) * 0.2 + 1.0;
                child.scale.setScalar(pulse);
                child.material.emissiveIntensity = 2.0 * emissionIntensity;
                child.material.opacity = emissionIntensity;
              } else {
                // Animate branches and particles
                const depth = child.userData.depth !== undefined ? child.userData.depth : 0;
                const pulsePhase = child.userData.pulsePhase !== undefined ? child.userData.pulsePhase : Math.random() * Math.PI * 2;
                
                // Pulse animation (slower for deeper branches)
                const pulseSpeed = 5 - depth * 1.5;
                const pulse = Math.sin(time * pulseSpeed + pulsePhase) * 0.15 + 1.0;
                
                // Scale based on type (cylinder branches vs sphere particles)
                if (child.geometry.type === 'CylinderGeometry') {
                  child.scale.y = pulse;
                  child.scale.x = pulse * 0.8;
                  child.scale.z = pulse * 0.8;
                } else if (child.geometry.type === 'SphereGeometry') {
                  child.scale.setScalar(pulse);
                }
                
                // Fade based on depth and intensity
                const baseOpacity = child.geometry.type === 'CylinderGeometry' ? 0.8 : 0.9;
                child.material.opacity = (baseOpacity - depth * 0.15) * emissionIntensity;
                
                if (child.material.emissiveIntensity !== undefined) {
                  child.material.emissiveIntensity = (1.0 - depth * 0.2) * emissionIntensity;
                }
              }
            }
          });
        }
      } else {
        if (nuclearEmissions) nuclearEmissions.visible = false;
      }
      
      // Rebound nuclear event: fusion > fission cascade with reversed energy flow
      // This occurs when torus hits lattice and rebounds
      if (phase === 'REBOUND') {
        if (reboundNuclear) {
          reboundNuclear.visible = true;
          
          // Calculate rebound progress (0 to 1 during rebound phase)
          const reboundStart = 0.6; // Rebound starts at 60% of cycle
          const reboundProgress = Math.min(1, Math.max(0, (normalizedTime - reboundStart) / 0.1));
          
          // Primary fusion products emit from lattice (reversed energy flow)
          reboundNuclear.children.forEach((child, _index) => {
            if (child.name && child.name.startsWith('PrimaryProduct')) {
              // Update primary products
              child.userData.lifetime += deltaTime;
              
              // Emit outward from lattice (reversed direction)
              if (reboundProgress > 0.1 && child.userData.lifetime < child.userData.maxLifetime) {
                child.visible = true;
                
                // Move outward from lattice (reversed energy flow)
                const speed = 2.0 * reboundProgress; // Faster as rebound progresses
                child.position.add(child.userData.velocity.clone().multiplyScalar(speed * deltaTime));
                
                // Fade out over lifetime
                const lifetimeRatio = child.userData.lifetime / child.userData.maxLifetime;
                child.material.opacity = 0.9 * (1 - lifetimeRatio);
                
                // Pulse based on energy
                const pulse = Math.sin(Date.now() * 0.01 * child.userData.energy) * 0.2 + 1.0;
                child.scale.setScalar(pulse);
                
                // Check if this product should undergo fission
                if (child.userData.fissionReady && reboundProgress > 0.5 && lifetimeRatio > 0.3) {
                  // Trigger fission: create secondary products
                  const secondaryProducts = reboundNuclear.children.filter(c => 
                    c.name && c.name.startsWith('SecondaryProduct') && !c.visible
                  );
                  
                  // Emit 2-3 secondary products from this location
                  const numFission = Math.min(2 + Math.floor(Math.random() * 2), secondaryProducts.length);
                  for (let i = 0; i < numFission; i++) {
                    const secondary = secondaryProducts[i];
                    if (secondary) {
                      secondary.visible = true;
                      secondary.position.copy(child.position);
                      
                      // Random direction (fission fragments)
                      const fissionAngle = Math.random() * Math.PI * 2;
                      const fissionElevation = (Math.random() - 0.5) * Math.PI / 3;
                      secondary.userData.direction = new THREE.Vector3(
                        Math.sin(fissionElevation) * Math.cos(fissionAngle),
                        Math.cos(fissionElevation),
                        Math.sin(fissionElevation) * Math.sin(fissionAngle)
                      ).normalize();
                      
                      secondary.userData.velocity = secondary.userData.direction.clone().multiplyScalar(
                        0.15 + Math.random() * 0.1
                      );
                      secondary.userData.lifetime = 0;
                    }
                  }
                  
                  // Hide primary product after fission
                  child.visible = false;
                  child.userData.fissionReady = false;
                }
              } else if (child.userData.lifetime >= child.userData.maxLifetime) {
                child.visible = false;
              }
            } else if (child.name && child.name.startsWith('SecondaryProduct') && child.visible) {
              // Update secondary fission products
              child.userData.lifetime += deltaTime;
              
              if (child.userData.lifetime < child.userData.maxLifetime) {
                // Move outward (fission fragments)
                const speed = 1.5;
                child.position.add(child.userData.velocity.clone().multiplyScalar(speed * deltaTime));
                
                // Fade out
                const lifetimeRatio = child.userData.lifetime / child.userData.maxLifetime;
                child.material.opacity = 0.8 * (1 - lifetimeRatio);
                
                // Smaller pulse
                const pulse = Math.sin(Date.now() * 0.015 * child.userData.energy) * 0.15 + 1.0;
                child.scale.setScalar(pulse);
              } else {
                child.visible = false;
              }
            }
          });
        }
        
        // Shockwave during rebound (expanding from lattice)
        if (shockwave) {
          const reboundStart = 0.6;
          const shockProgress = Math.min(1, Math.max(0, (normalizedTime - reboundStart) / 0.1));
          // Shockwave emanates from lattice surface (nucleation site)
          shockwave.position.y = PHYSICS_CONFIG.LATTICE_Y_OFFSET;
          shockwave.material.opacity = 0.8 * (1 - shockProgress);
          shockwave.scale.setScalar(1 + shockProgress * 8); // Expand outward
        }
      } else {
        // Hide rebound nuclear event in other phases
        if (reboundNuclear) reboundNuclear.visible = false;
        if (shockwave) {
          shockwave.material.opacity = 0;
          // Reset shockwave position for next cycle
          if (phase === 'EXPANSION') {
            shockwave.position.set(0, -3, 0);
            shockwave.scale.setScalar(1);
          }
        }
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
            vortexIntensity = 1.2; // Increased intensity for rebound
            flowDirection = -2.0; // Strong outward (reversed energy flow from lattice)
            rotationSpeed = 3.0; // Faster rotation during rebound
          break;
        case 'RECOVERY':
          vortexIntensity = 0.4;
          flowDirection = 0.2;
          rotationSpeed = 0.7;
          break;
        default:
          // Default case for any unexpected phase values
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
      
      // MHD particle flow is handled by plasmaVortex - no additional elements to animate
      // Rotate the entire MHD flow group based on phase
      if (vortexGroupRef.current) {
        vortexGroupRef.current.rotation.y += deltaTime * rotationSpeed * 0.1;
      }
      } catch (error) {
        // Silently handle vortex update errors to prevent animation loop crashes
        console.warn('MHD flow animation update error (non-critical):', error);
      }
    }
    
    // Update Casimir field visualization based on compression
    if (casimirFieldRef.current && showCasimir) {
      try {
        // Get current physics data
        const currentCompression = physicsData.compressionRatio || 1.0;
        // Casimir force intensifies as bubble compresses (1/d⁴ relationship)
        const casimirIntensity = Math.pow(currentCompression, 4);
        
        casimirFieldRef.current.children.forEach((child) => {
          if (child.name && child.name.startsWith('CasimirLine')) {
            // Update line opacity based on compression
            const baseOpacity = 0.3 + Math.min(casimirIntensity / 100, 0.4);
            child.material.opacity = baseOpacity;
            
            // Color shift: orange (low) → red (high compression)
            const hue = 0.1 - Math.min(casimirIntensity / 200, 0.05); // Shift toward red
            child.material.color.setHSL(hue, 1, 0.5);
          } else if (child.name && child.name.startsWith('CasimirIndicator')) {
            // Pulse indicators during high compression (capped to prevent huge orbs)
            const pulse = Math.sin(Date.now() * 0.003 + child.userData.pulsePhase * Math.PI * 2) * 0.3 + 0.7;
            // Cap opacity and scale to prevent indicators from becoming huge orange orbs
            const normalizedIntensity = Math.min(casimirIntensity / 100, 1.0); // Cap at 1.0
            child.material.opacity = 0.5 + normalizedIntensity * 0.3;
            // Cap scale to max 2x to prevent covering the simulation
            const maxScale = 1 + pulse * Math.min(normalizedIntensity * 0.5, 1.0);
            child.scale.setScalar(maxScale);
          }
        });
      } catch (error) {
        // Silently handle Casimir update errors
      }
    }
    
    // Update Rydberg orbitals based on temperature and field
    if (rydbergOrbitalsRef.current && showRydberg) {
      try {
        // Get current physics data
        const currentTemp = physicsData.temperature || 300;
        const currentField = physicsData.fieldStrength || 0;
        // Rydberg orbitals expand with temperature and contract with field
        const temperatureFactor = currentTemp / 300; // Normalize to room temp
        const fieldFactor = currentField / 1e8; // Normalize to critical field
        
        rydbergOrbitalsRef.current.children.forEach((child) => {
          if (child.name && child.name.startsWith('RydbergOrbital')) {
            const energyLevel = child.userData.energyLevel || 1;
            // Higher n states are larger: R_n = n² * a₀
            const baseSize = child.userData.baseRadius * energyLevel * energyLevel;
            const expandedSize = baseSize * (1 + temperatureFactor * 0.5 - fieldFactor * 0.3);
            child.scale.setScalar(expandedSize / child.userData.baseRadius);
            
            // Opacity based on energy level and conditions (keep very transparent)
            child.material.opacity = Math.min(0.08, 0.04 + (temperatureFactor + fieldFactor) * 0.02);
          } else if (child.name && child.name.startsWith('OrbitalOverlap')) {
            // Overlap regions glow during high enhancement
            const enhancementValue = enhancements.total || 1.0;
            const pulse = Math.sin(Date.now() * 0.005 + child.userData.pulsePhase * Math.PI * 2) * 0.3 + 0.7;
            child.material.opacity = 0.4 + (enhancementValue / 1e5) * 0.4;
            // Only set emissiveIntensity if material supports it (MeshStandardMaterial does)
            if (child.material && typeof child.material.emissiveIntensity !== 'undefined') {
              child.material.emissiveIntensity = 0.3 + (enhancementValue / 1e6) * 0.5;
            }
            child.scale.setScalar(1 + pulse * 0.2);
          }
        });
      } catch (error) {
        // Silently handle Rydberg update errors
      }
    }
    
    // Update Halo electron clouds based on screening and field
    if (haloElectronsRef.current && showHalo) {
      try {
        // Get current enhancement breakdown
        const currentScreening = enhancements.screening || 1.0;
        const currentField = physicsData.fieldStrength || 0;
        // Halo electron overlap probability: P_overlap ≈ 10⁻³
        // Cloud size and density affected by screening and field
        const screeningFactor = currentScreening / 100; // Normalize
        const fieldFactor = currentField / 1e8;
        
        haloElectronsRef.current.children.forEach((cloudGroup) => {
          if (cloudGroup.name && cloudGroup.name.startsWith('HaloCloud')) {
            cloudGroup.children.forEach((particle) => {
              if (particle.name && particle.name.startsWith('Nucleus')) {
                // Nucleus glows based on overlap probability
                const overlapProb = 1e-3 * (1 + screeningFactor + fieldFactor);
                // Only set emissiveIntensity if material supports it (MeshStandardMaterial does)
                if (particle.material && typeof particle.material.emissiveIntensity !== 'undefined') {
                  particle.material.emissiveIntensity = Math.min(1.0, overlapProb * 1000);
                }
              } else {
                // Particles fade based on distance and conditions
                const _r = particle.userData.r || 0.2; // Distance from nucleus (for reference)
                const prob = particle.userData.probability || 0.5;
                particle.material.opacity = prob * (0.3 + screeningFactor * 0.2);
              }
            });
          }
        });
      } catch (error) {
        // Silently handle Halo update errors
      }
    }
      } catch (error) {
        console.error('Animation update error:', error);
    }
  }, [
    isPlaying, frequency, initialBubbleRadius, simulationData, setUsingAPIData,
    calculateBubbleRadius, calculateEnhancementFactors, updateProtonStates, onPhaseChange, onCollapseEvent,
    showBubble, showProtons, showFieldLines, showVortices, showCasimir, showRydberg, showHalo
  ]); // Note: currentPhase removed - using currentPhaseRef to avoid scene re-initialization

  // Store updateAnimation in ref to avoid triggering scene re-initialization
  useEffect(() => {
    updateAnimationRef.current = updateAnimation;
  }, [updateAnimation]);

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
    
    // Renderer (v0.2.2-beta: mobile-optimized settings)
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: qualitySettings.antialias,
      powerPreference: isMobile ? 'low-power' : 'high-performance'
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(qualitySettings.pixelRatio);
    
    // Disable shadows on mobile for better performance
    renderer.shadowMap.enabled = qualitySettings.shadowsEnabled;
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
    createCasimirField(scene);
    createRydbergOrbitals(scene);
    createHaloElectrons(scene);
    createScaleBar(scene);
    
    // Animation loop - uses ref to avoid re-initialization when animation function changes
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      
      const deltaTime = clockRef.current.getDelta();
      // Use ref to call latest animation function without causing re-init
      if (updateAnimationRef.current) {
        updateAnimationRef.current(deltaTime);
      }
      
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createLattice, createBubble, createProtons, createFieldVisualization, createEffects, createVortexFlow, createCasimirField, createRydbergOrbitals, createHaloElectrons, createScaleBar]);
  // Note: updateAnimation removed from deps - using updateAnimationRef to prevent camera reset on cycle change

  // Update visibility based on toggles - immediate update with force refresh
  useEffect(() => {
    // Force update visibility immediately when toggles change
    const updateVisibility = () => {
      if (latticeGroupRef.current) {
        latticeGroupRef.current.visible = showLattice;
        latticeGroupRef.current.traverse((child) => {
          if (child.isMesh || child.isLine || child.isPoints || child.isGroup) {
            child.visible = showLattice;
          }
        });
      }
      if (bubbleGroupRef.current) {
        bubbleGroupRef.current.visible = showBubble;
        bubbleGroupRef.current.traverse((child) => {
          // Don't override visibility for torus and jet - they're controlled by phase-based animation
          if (child.name === 'TorusFormation' || child.name === 'FocusedJet') {
            return; // Skip torus and jet - let animation loop control their visibility
          }
          if (child.isMesh || child.isLine || child.isPoints || child.isGroup) {
            child.visible = showBubble;
          }
        });
      }
      if (protonGroupRef.current) {
        protonGroupRef.current.visible = showProtons;
        protonGroupRef.current.traverse((child) => {
          if (child.isMesh || child.isLine || child.isPoints) {
            child.visible = showProtons;
          }
        });
      }
      if (fieldGroupRef.current) {
        fieldGroupRef.current.visible = showFieldLines;
        fieldGroupRef.current.traverse((child) => {
          if (child.isMesh || child.isLine || child.isPoints) {
            child.visible = showFieldLines;
          }
        });
      }
      if (vortexGroupRef.current) {
        vortexGroupRef.current.visible = showVortices;
        vortexGroupRef.current.traverse((child) => {
          if (child.isMesh || child.isLine || child.isPoints || child.isGroup) {
            child.visible = showVortices;
          }
        });
        // Also hide nested groups (plasma vortex, energy flow)
        if (plasmaVortexRef.current && typeof plasmaVortexRef.current.getGroup === 'function') {
          try {
            const plasmaGroup = plasmaVortexRef.current.getGroup();
            if (plasmaGroup) {
              plasmaGroup.visible = showVortices;
              plasmaGroup.traverse((child) => {
                if (child.isMesh || child.isLine || child.isPoints) {
                  child.visible = showVortices;
                }
              });
            }
          } catch (e) {
            // Silently handle if getGroup fails
          }
        }
        if (energyFlowRef.current && typeof energyFlowRef.current.getGroup === 'function') {
          try {
            const energyGroup = energyFlowRef.current.getGroup();
            if (energyGroup) {
              energyGroup.visible = showVortices;
              energyGroup.traverse((child) => {
                if (child.isMesh || child.isLine || child.isPoints) {
                  child.visible = showVortices;
                }
              });
            }
          } catch (e) {
            // Silently handle if getGroup fails
          }
        }
      }
      if (casimirFieldRef.current) {
        casimirFieldRef.current.visible = showCasimir;
        casimirFieldRef.current.traverse((child) => {
          if (child.isMesh || child.isLine || child.isPoints) {
            child.visible = showCasimir;
          }
        });
      }
      if (rydbergOrbitalsRef.current) {
        rydbergOrbitalsRef.current.visible = showRydberg;
        rydbergOrbitalsRef.current.traverse((child) => {
          if (child.isMesh || child.isLine || child.isPoints) {
            child.visible = showRydberg;
          }
        });
      }
      if (haloElectronsRef.current) {
        haloElectronsRef.current.visible = showHalo;
        haloElectronsRef.current.traverse((child) => {
          if (child.isMesh || child.isLine || child.isPoints || child.isGroup) {
            child.visible = showHalo;
          }
        });
      }
    };
    
    // Update immediately
    updateVisibility();
    
    // Also update after a short delay to catch any late-created objects
    const timeoutId = setTimeout(updateVisibility, 100);
    
    return () => clearTimeout(timeoutId);
  }, [showLattice, showBubble, showProtons, showFieldLines, showVortices, showCasimir, showRydberg, showHalo]);

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
        
        {/* Mobile touch controls (v0.2.2-beta) */}
        <TouchControls
          containerRef={containerRef}
          onZoom={(delta) => {
            if (cameraRef.current) {
              const camera = cameraRef.current;
              const direction = new THREE.Vector3();
              camera.getWorldDirection(direction);
              camera.position.addScaledVector(direction, delta * 5);
            }
          }}
          onRotate={(deltaX, deltaY) => {
            if (controlsRef.current) {
              controlsRef.current.rotateLeft(deltaX);
              controlsRef.current.rotateUp(deltaY);
            }
          }}
          onReset={() => {
            if (cameraRef.current && controlsRef.current) {
              cameraRef.current.position.set(12, 5, 12);
              controlsRef.current.target.set(0, -2, 0);
              controlsRef.current.update();
            }
          }}
          showHints={isMobile}
          showControls={true}
          enabled={true}
        />
        
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
              label={<Typography variant="caption" color="white">MHD Flow</Typography>}
            />
            <FormControlLabel
              control={<Switch checked={showCasimir} onChange={(e) => setShowCasimir(e.target.checked)} size="small" sx={{ color: '#ff8800' }} />}
              label={<Typography variant="caption" color="white">Casimir Geometry</Typography>}
            />
            <FormControlLabel
              control={<Switch checked={showRydberg} onChange={(e) => setShowRydberg(e.target.checked)} size="small" sx={{ color: '#8844ff' }} />}
              label={<Typography variant="caption" color="white">Rydberg Orbitals</Typography>}
            />
            <FormControlLabel
              control={<Switch checked={showHalo} onChange={(e) => setShowHalo(e.target.checked)} size="small" sx={{ color: '#00ffff' }} />}
              label={<Typography variant="caption" color="white">Halo Electrons</Typography>}
            />
            <FormControlLabel
              control={<Switch checked={showLegend} onChange={(e) => setShowLegend(e.target.checked)} size="small" sx={{ color: '#88ff88' }} />}
              label={<Typography variant="caption" color="white">Legend</Typography>}
            />
          </FormGroup>
        </Paper>
        
        {/* Comprehensive Visualization Legend - collapsible side drawer */}
        {showLegend && (
          <VisualizationLegend
            particleCounts={{
              palladium: hostMaterial === 'palladium' ? 27 : 0,
              nickel: hostMaterial === 'nickel' ? 27 : 0,
              titanium: hostMaterial === 'titanium' ? 27 : 0,
              deuterium: Math.round(27 * loadingRatio),
              hydrogen: hostMaterial !== 'palladium' ? Math.round(27 * loadingRatio * 0.5) : 0,
              lithium: 0, // No lithium by default
            }}
            stats={{
              totalParticles: 27 + Math.round(27 * loadingRatio),
              hotspotCount: currentPhase === 'MINIMUM' || currentPhase === 'REBOUND' ? 3 : 0,
              loadingRatio: loadingRatio,
              enhancementFactor: currentEnhancement,
              temperature: physicsData.temperature,
              screeningEnhancement: enhancementBreakdown.screening,
              phononCoupling: enhancementBreakdown.phonon || 1.0,
            }}
            showEnergy={true}
            showParticles={showLattice || showProtons}
            showHotspots={true}
            showStats={true}
            showScale={true}
            showQuantumFlux={showCasimir || showRydberg}
            scaleInfo={{
              gridSize: 5,
              scaleUnit: 'μm',
              realWorldSize: parameters.initialBubbleRadius * 1e-6
            }}
            quantumFluxMode="electron_screening"
            position="top-left"
            collapsed={legendCollapsed}
            onToggleCollapse={setLegendCollapsed}
            variant="side-drawer"
            simulationType="lenr"
          />
        )}
        
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
            gap: 2,
            flexWrap: 'wrap'
          }}
        >
          {/* Data source indicator */}
          <Tooltip title={usingAPIData ? 'Using real physics calculations from backend API' : 'Using local fallback calculations (limited accuracy)'}>
            <Chip 
              label={usingAPIData ? 'API Physics' : 'Local Calc'} 
              size="small"
              sx={{ 
                bgcolor: usingAPIData ? 'rgba(46, 125, 50, 0.9)' : 'rgba(237, 108, 2, 0.9)',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.65rem'
              }}
            />
          </Tooltip>
          <Chip 
            label={currentPhase} 
            color={getPhaseColor(currentPhase)} 
            size="small" 
          />
          <Typography variant="caption" color="white">
            Cycle: {collapseCount} | Progress: {(cycleProgress * 100).toFixed(0)}%
          </Typography>
          <Chip 
            label={`Enhancement: ${currentEnhancement.toExponential(2)}`}
            size="small"
            color="primary"
            sx={{ bgcolor: 'rgba(25, 118, 210, 0.8)' }}
          />
          <Chip 
            label={`Compression: ${physicsData.compressionRatio.toFixed(1)}x`}
            size="small"
            color="secondary"
            sx={{ bgcolor: 'rgba(156, 39, 176, 0.8)' }}
          />
          <Chip 
            label={`T: ${physicsData.temperature.toFixed(0)} K`}
            size="small"
            sx={{ 
              bgcolor: physicsData.temperature > 1000 ? 'rgba(244, 67, 54, 0.8)' : 'rgba(76, 175, 80, 0.8)',
              color: 'white'
            }}
          />
          <Chip 
            label={`E: ${(physicsData.fieldStrength / 1e8).toFixed(1)}×10⁸ V/m`}
            size="small"
            sx={{ bgcolor: 'rgba(255, 152, 0, 0.8)', color: 'white' }}
          />
        </Paper>
        
        {/* Enhancement breakdown - bottom right */}
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            bottom: 10,
            right: 10,
            bgcolor: 'rgba(20, 20, 40, 0.9)',
            borderRadius: 1,
            p: 1,
            minWidth: 200
          }}
        >
          <Typography variant="caption" color="white" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
            Enhancement Breakdown
          </Typography>
          <Stack spacing={0.3}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="white" sx={{ fontSize: '0.65rem' }}>Screening:</Typography>
              <Typography variant="caption" color="#00ffff" sx={{ fontSize: '0.65rem' }}>
                {enhancementBreakdown.screening.toExponential(1)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="white" sx={{ fontSize: '0.65rem' }}>QED:</Typography>
              <Typography variant="caption" color="#ffff00" sx={{ fontSize: '0.65rem' }}>
                {enhancementBreakdown.qed.toExponential(1)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="white" sx={{ fontSize: '0.65rem' }}>Casimir:</Typography>
              <Typography variant="caption" color="#ff8800" sx={{ fontSize: '0.65rem' }}>
                {enhancementBreakdown.casimir.toExponential(1)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="white" sx={{ fontSize: '0.65rem' }}>Rydberg:</Typography>
              <Typography variant="caption" color="#ff00ff" sx={{ fontSize: '0.65rem' }}>
                {enhancementBreakdown.rydberg.toExponential(1)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="white" sx={{ fontSize: '0.65rem' }}>Compression:</Typography>
              <Typography variant="caption" color="#00ff88" sx={{ fontSize: '0.65rem' }}>
                {enhancementBreakdown.compression.toExponential(1)}
              </Typography>
            </Box>
          </Stack>
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
