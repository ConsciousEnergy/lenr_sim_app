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
  IconButton, Tooltip, Chip, Stack, Collapse, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import HomeIcon from '@mui/icons-material/Home';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LayersIcon from '@mui/icons-material/Layers';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
// CycloneIcon reserved for future vortex toggle UI
import {
  clampBubbleRadiusFactor,
  getBubbleDisplayScale,
  getBubbleScaleFromPhase,
} from '../../utils/bubbleVisualScale';
import { useStableThreeTimer } from '../../visualization/utils/threeTimer';
import {
  normalizePhaseName,
  phaseFromCycleFraction,
  phaseProgressInCycle,
  phaseSegment,
  timelineOnVisualClock,
  visualTimeToTimelineTime,
  VISUAL_CYCLE_SCALE,
} from '../../utils/bubblePhaseSchedule';
import {
  resolveSpacetimeSampleBuffer,
  sampleSpacetimeBuffer,
} from '../../utils/spacetimeSampleBuffer';
import { applyGroupVisibility } from '../../utils/applyGroupVisibility';

// Import fluid dynamics effects for vortex visualization
import { VortexField, PlasmaVortexEffect } from './FluidDynamicsEffects';
// Import ScaleBar for physical dimension reference
import { ScaleBar } from './QuantumFluxVisualization';
// Import VisualizationLegend for comprehensive display
import VisualizationLegend from './VisualizationLegend';
import BubbleLatticeTimelineControls from './BubbleLatticeTimelineControls';
import VizHudReadouts from './VizHudReadouts';
import EnhancementBreakdownDrawer from './EnhancementBreakdownDrawer';
import { buildCollapseHudChannels } from '../../utils/vizChannelBindings';
import {
  extractLiquidPhaseChannels,
  resolveHostMeltMeta,
  resolveLiquidPhaseOverlayState,
} from '../../utils/liquidPhaseViz';
import {
  DYNAMIC_LATTICE_BUFFER_USAGE,
  DYNAMIC_LATTICE_FIDELITY,
  applyDynamicLatticeInstances,
  buildLatticeRestSites,
  interstitialOffsetFromSite,
  resolveExclusiveHostColor,
  resolveLatticePick,
} from '../../utils/dynamicLattice';
import {
  LATTICE_COLOR_MODE_META,
  LATTICE_COLOR_MODES,
  normalizeLatticeColorMode,
  resolveLatticeHostInstanceRgb,
} from '../../utils/latticeColorModes';
import { resolveSolutePaletteEntry } from '../../utils/lenrParticlePalette';
import {
  buildCollapseRibbonPositions,
  collapseRibbonPlayheadIndex,
} from '../../utils/collapseTrajectoryRibbon';
import {
  occupancyGlowRgb,
  occupancyGlowSiteStrength,
  resolveOccupancyGlowPlan,
} from '../../utils/occupancyGlow';
import {
  SCHEMATIC_SHELL_LABEL,
  resolveSchematicShellSpec,
  schematicShellSiteOpacity,
} from '../../utils/schematicShells';
import {
  ProtonWaveCompanion,
  enhancementGlowFactor,
  createSoftDiscTexture,
  createSoftPointsMaterial,
} from '../../utils/waveParticleViz';
import {
  DOUBLE_LAYER_WIRE_OPACITY_COLLAPSE,
  DOUBLE_LAYER_WIRE_OPACITY_EXPANSION,
  applyBubbleTemperatureTint,
  createBubbleGasMaterial,
  createBubbleTorusGeometries,
  createDoubleLayerMaterial,
  createInnerLayerMaterial,
  createJetMaterial,
  createShedPlasmaDebrisGroup,
  createTorusFilamentMaterial,
  createTorusPlasmaCloud,
  createTorusPlasmaMaterial,
  getLatticeBoundBubbleY,
  temperatureToBubbleTint,
} from '../../utils/bubbleTorusViz';
import {
  MASER_JET_CHIP,
  MASER_JET_CHIP_TOOLTIP,
  PLASMA_EXCITED_CHIP,
  PLASMA_EXCITED_CHIP_TOOLTIP,
  SHED_DEBRIS_CHIP,
  SHED_DEBRIS_CHIP_TOOLTIP,
  TORUS_SCRUB_END,
  TORUS_SCRUB_START,
  applyPlasmaSpectrumTint,
  jetLightEnvelope,
  maserCollapseProgress,
  resolveExcitedPlasmaSpectrum,
  shedDebrisProgress,
  torusWindowProgress,
} from '../../utils/plasmaSpectrumViz';
import {
  PLASMA_FLUID_LOOK_CHIP,
  advancePlasmaFluidLook,
} from '../../utils/plasmaFluidLook';
import {
  SHEATH_SURFACE_FLOW_CHIP,
  createSheathSurfaceFlowGroup,
  updateSheathSurfaceFlow,
} from '../../utils/bubbleSheathSurfaceFlow';
import {
  ELECTROLYTE_HALO_CHIP,
  createElectrolyteIonizedHalo,
  resolveElectrolyteIonizedHaloParams,
  updateElectrolyteIonizedHalo,
} from '../../utils/electrolyteIonizedHalo';
import {
  ElectronMigrationCloud,
  PHONON_MELT_CHIP,
  PHONON_STANDING_CHIP,
  PHONON_WAVEGUIDE_CHIP,
  buildPhononStandingWaveDisplacements,
  createPhononWaveguideRibbon,
  phononModeMix,
  resolvePhononStandingWaveParams,
} from '../../utils/phononElectronViz';
import {
  fieldLineOpacityFromE,
  machCompressibilityCue,
  resolveCavitationForceViz,
} from '../../utils/cavitationForceViz';
// Import TouchControls for mobile optimization (v0.2.2-beta)
import TouchControls, { isMobileDevice, getRecommendedQualitySettings } from '../controls/TouchControls';
import { track } from '../../analytics/events';
import {
  getMaterialScale,
  getLatticeMetersPerVisUnit,
  getAtomRadiusVisUnits,
  buildLatticeScaleDescriptor,
} from '../../utils/materialScale';
import { UBLV_OVERLAY_CHROME_DEFAULTS } from './ublvOverlayChromeDefaults';

// Proton state definitions with visual properties
const PROTON_STATES = {
  FREE: { color: 0x3498db, emissive: 0x1a4c6e, emissiveIntensity: 0.2, size: 0.15, name: 'Free (EM)' },
  SCREENED: { color: 0x00ffff, emissive: 0x006666, emissiveIntensity: 0.4, size: 0.13, name: 'Screened' },
  CAPTURE_READY: { color: 0xf1c40f, emissive: 0x7d6208, emissiveIntensity: 0.7, size: 0.11, name: 'Capture Ready' },
  NUCLEAR: { color: 0xff4500, emissive: 0xff2200, emissiveIntensity: 1.0, size: 0.09, name: 'Nuclear Active' }
};

// Bubble collapse phases (used for animation timing reference)
// Canonical order: Expansion → Collapse → Minimum → Rebound → repeat
// eslint-disable-next-line no-unused-vars
// Durations mirror PHASE_SCHEDULE (torus dwell 90.7–95.7% scrub).
const _COLLAPSE_PHASES = {
  EXPANSION: { name: 'Expansion', duration: 0.907 },
  COLLAPSE: { name: 'Collapse', duration: 0.05 },
  MINIMUM: { name: 'Minimum', duration: 0.02 },
  REBOUND: { name: 'Rebound', duration: 0.023 },
};

// UX Time Scale: Slow down the physics animation for user comprehension
// Physical frequency is in kHz (e.g. 20 kHz = 50 μs cycles) — too fast to observe.
// VISUAL_CYCLE_SCALE maps that onto ~2.5 s per on-screen cycle at 20 kHz (50,000×).
const UX_TIME_SCALE = VISUAL_CYCLE_SCALE;

const CAMERA_PRESET = {
  desktop: { position: [12, 5, 12], fov: 60, target: [0, -2, 0] },
  mobile: { position: [11, 4.5, 13], fov: 52, target: [0, -2, 0] },
};

/** @deprecated Prefer resolveExclusiveHostColor (VIZ-06) — kept for non-lattice overlays. */
const HOST_MATERIAL_COLORS = {
  constantan: 0xb87333,
  palladium: 0x8b8b8b,
  nickel: 0x4682b4,
  titanium: 0x7f8c8d,
  copper: 0xb87333,
  lithium: 0xc0c0c0,
};

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
  LATTICE_SPACING: 1.2,
  VORTEX_ACCEPT_RADIUS: 0.22,
  
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
const _physicsToVis = (meters) => meters / PHYSICS_CONFIG.METERS_PER_VIS_UNIT;

/**
 * Bubble Y: nest underside on lattice surface (scale-aware).
 * Prefer getLatticeBoundBubbleY; keep legacy PHASE_DISTANCES only as fallback docs.
 */
const getBubbleYFromPhase = (phase, progress = 0, displayScale = PHYSICS_CONFIG.BUBBLE_SCALE.NUCLEATION) => {
  const latticeSurfaceY = PHYSICS_CONFIG.LATTICE_Y_OFFSET + PHYSICS_CONFIG.LATTICE_SURFACE_OFFSET;
  return getLatticeBoundBubbleY({
    latticeSurfaceY,
    displayScale,
    phase,
    phaseProgress: progress,
    nestPenetration: 0.14,
  });
};

// Bubble scale helpers live in utils/bubbleVisualScale.js so oversized
// Rayleigh–Plesset radius_factor values cannot blow past the scene frustum.

const buildVortexSites = (centerX, centerY, centerZ, spacing) => {
  const ringRadius = spacing * 0.75;
  return [
    new THREE.Vector3(centerX, centerY, centerZ),
    new THREE.Vector3(centerX + ringRadius, centerY, centerZ),
    new THREE.Vector3(centerX - ringRadius, centerY, centerZ),
    new THREE.Vector3(centerX, centerY, centerZ + ringRadius),
    new THREE.Vector3(centerX, centerY, centerZ - ringRadius),
    new THREE.Vector3(centerX + ringRadius * 0.7, centerY, centerZ + ringRadius * 0.7),
    new THREE.Vector3(centerX - ringRadius * 0.7, centerY, centerZ - ringRadius * 0.7)
  ];
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
  
  // Canonical field accessors (backend contract aliases).
  const resolveTemperatureK = (point) => point?.temperature_k ?? point?.temperature ?? 300;
  const resolveElectricFieldVm = (point) => point?.electric_field_v_m ?? point?.electric_field ?? 1e8;
  const resolveRadiusFactor = (point) => point?.radius_factor ?? 1;

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
      radius_factor: lerp(resolveRadiusFactor(lower), resolveRadiusFactor(upper), t),
      temperature: lerp(resolveTemperatureK(lower), resolveTemperatureK(upper), t),
      temperature_k: lerp(resolveTemperatureK(lower), resolveTemperatureK(upper), t),
      electric_field: lerp(resolveElectricFieldVm(lower), resolveElectricFieldVm(upper), t),
      electric_field_v_m: lerp(resolveElectricFieldVm(lower), resolveElectricFieldVm(upper), t),
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
    radius_factor: lerp(resolveRadiusFactor(lower), resolveRadiusFactor(upper), t),
    temperature: lerp(resolveTemperatureK(lower), resolveTemperatureK(upper), t),
    temperature_k: lerp(resolveTemperatureK(lower), resolveTemperatureK(upper), t),
    electric_field: lerp(resolveElectricFieldVm(lower), resolveElectricFieldVm(upper), t),
    electric_field_v_m: lerp(resolveElectricFieldVm(lower), resolveElectricFieldVm(upper), t),
  };
};

/**
 * Main unified bubble-lattice visualization component
 */
const UnifiedBubbleLatticeVisualization = ({
  parameters = {},
  simulationData = null,
  streamLatest = null,
  streamStatus = 'idle',
  streamFrames = null,
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
  const timerRef = useStableThreeTimer();

  // Fire a single product-analytics view event when this visualization mounts.
  useEffect(() => {
    track.visualizationViewed({
      viz_type: 'unified_bubble_lattice',
      host_material: parameters?.hostMaterial,
      reactant: parameters?.reactant,
      has_simulation_data: !!simulationData,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Group refs for scene hierarchy
  const latticeGroupRef = useRef(null);
  const bubbleGroupRef = useRef(null);
  const protonGroupRef = useRef(null);
  const fieldGroupRef = useRef(null);
  const effectsGroupRef = useRef(null);
  const boundaryVisualGroupRef = useRef(null);
  const liquidPhaseGroupRef = useRef(null);
  
  // Vortex/fluid dynamics refs
  const vortexGroupRef = useRef(null);
  const vortexFieldRef = useRef(null);
  const energyFlowRef = useRef(null);
  const plasmaVortexRef = useRef(null);
  // Soft cloud + ribbon companion for ProtonPhaseGroup (schematic wave look; not CFD)
  const protonWaveCompanionRef = useRef(null);
  // Schematic phonon jitter + e⁻ soft-flow (no MD / continuum solvers)
  const electronMigrationRef = useRef(null);
  const phononTimeRef = useRef(0);
  const cavitationForcesRef = useRef({
    kinetic: 0.2,
    vorticity: 0.3,
    flux: 0.25,
    phononScale: 1,
    softPlasmaFlash: 0.15,
  });
  
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
  
  // VIZ-06 — pickable host instance readout (schematic; not nuclear proof)
  const [pickedLatticeSite, setPickedLatticeSite] = useState(null);

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
    pressure: 101325,
    radiusUm: null,
    sampleSource: 'local_fallback',
  });
  
  // Visualization toggles
  const [showLattice, setShowLattice] = useState(true);
  const [showBubble, setShowBubble] = useState(true);
  /** Optional sheath tangential Points/ribbons — OFF default; not measured bubble spin. */
  const [showSheathSurfaceFlow, setShowSheathSurfaceFlow] = useState(false);
  /** Soft electrolyte / ionized-env halo — ON with bubble; EMP chem-env (plasma ≠ fusion). */
  const [showElectrolyteHalo, setShowElectrolyteHalo] = useState(true);
  const [showProtons, setShowProtons] = useState(true);
  const [showFieldLines, setShowFieldLines] = useState(true);
  // Schematic phonon jitter + e⁻ soft-flow — dedicated layer toggles
  const [showPhonon, setShowPhonon] = useState(true);
  const [showElectronMig, setShowElectronMig] = useState(true);
  /** Live acoustic/optical mix from engine-bound resolver (HUD readout only). */
  const [phononMixReadout, setPhononMixReadout] = useState({
    acousticPct: 72,
    opticalPct: 28,
    amp: 0.14,
  });
  const phononMixReadoutRef = useRef(phononMixReadout);
  // Mobile optimization state (v0.2.2-beta / #409 M2–M3)
  const [isMobile] = useState(() => isMobileDevice());
  const [qualitySettings] = useState(() => getRecommendedQualitySettings());
  // MHD / vortex ON by default (desktop) — primary cavitation narrative
  const [showVortices, setShowVortices] = useState(
    () => getRecommendedQualitySettings().vortexVisualizationEnabled
  );
  const [showBoundaryPlane, setShowBoundaryPlane] = useState(false);
  const [showCasimir, setShowCasimir] = useState(false);
  const [showRydberg, setShowRydberg] = useState(false);
  const [showHalo, setShowHalo] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  /** Tier-1 mutually exclusive host instanceColor mode (Species default). */
  const [latticeColorMode, setLatticeColorMode] = useState('species');
  const latticeColorModeRef = useRef('species');
  useEffect(() => {
    latticeColorModeRef.current = normalizeLatticeColorMode(latticeColorMode);
  }, [latticeColorMode]);
  /** Collapse R(t) ribbon — OFF by default (Diadon: ribbon work not needed). */
  const [showCollapseRibbon, setShowCollapseRibbon] = useState(false);
  const [showOccupancyGlow, setShowOccupancyGlow] = useState(true);
  const [occupancyGlowMeta, setOccupancyGlowMeta] = useState(null);
  /** Bumps when scene/lattice is (re)created so overlay effects rebuild. */
  const [latticeSceneEpoch, setLatticeSceneEpoch] = useState(0);
  const [collapseRibbonMeta, setCollapseRibbonMeta] = useState(null);
  const collapseRibbonMetaRef = useRef(null);
  /** Tier-2 soft additive shells — OFF by default; schematic · not QM orbitals. */
  const [showSchematicShells, setShowSchematicShells] = useState(false);
  const [schematicShellMeta, setSchematicShellMeta] = useState(null);
  // First-visit defaults: legend / layers / Local Calc / Enhancement all minimized.
  const [legendCollapsed, setLegendCollapsed] = useState(
    UBLV_OVERLAY_CHROME_DEFAULTS.legendCollapsed
  );
  // Overlay chrome: layers drawer collapses right; Local Calc HUD collapses down.
  const [layersCollapsed, setLayersCollapsed] = useState(
    UBLV_OVERLAY_CHROME_DEFAULTS.layersCollapsed
  );
  const [metricsCollapsed, setMetricsCollapsed] = useState(
    UBLV_OVERLAY_CHROME_DEFAULTS.metricsCollapsed
  );
  const [enhancementCollapsed, setEnhancementCollapsed] = useState(
    UBLV_OVERLAY_CHROME_DEFAULTS.enhancementCollapsed
  );
  
  // Animation parameters - use refs for values that change frequently to avoid re-renders
  // Default ~0.45x so a visual cycle is clearly moving (0.1x felt like a stuck video).
  const [animationSpeed, setAnimationSpeed] = useState(0.45);
  const animationSpeedRef = useRef(0.45);
  useEffect(() => {
    animationSpeedRef.current = animationSpeed;
  }, [animationSpeed]);
  const streamLatestRef = useRef(streamLatest);
  const streamStatusRef = useRef(streamStatus);
  useEffect(() => {
    streamLatestRef.current = streamLatest;
  }, [streamLatest]);
  useEffect(() => {
    streamStatusRef.current = streamStatus;
  }, [streamStatus]);
  const bubbleRadiusRef = useRef(10.0);
  const normalizedTimeRef = useRef(0);
  const currentPhaseRef = useRef('EXPANSION'); // Ref to avoid stale closure in animation loop
  const updateAnimationRef = useRef(null); // Ref to hold animation function without triggering re-init
  const flowReversalRef = useRef({ timer: 0, isReversed: false });
  // Scrub while paused: force one render pass without advancing the clock.
  const forceRenderRef = useRef(false);
  const isPlayingRef = useRef(true);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const spacetimeBuffer = useMemo(
    () => resolveSpacetimeSampleBuffer(simulationData, streamFrames),
    [simulationData, streamFrames],
  );
  // VIZ-05 — Mach / solver (+ ceiling meta) from collapse_results; R/T stay scrub-live below.
  // Prefer validation.route_mode so local_fallback timelines with buffers are not labeled solver.
  const collapseHud = useMemo(
    () => buildCollapseHudChannels(simulationData?.collapse_results, {
      sampleSource: simulationData?.validation?.route_mode === 'local_fallback'
        ? 'local_fallback'
        : (usingAPIData ? 'solver' : 'local_fallback'),
    }),
    [simulationData?.collapse_results, simulationData?.validation?.route_mode, usingAPIData],
  );
  const collapseHudRef = useRef(collapseHud);
  useEffect(() => {
    collapseHudRef.current = collapseHud;
  }, [collapseHud]);
  // Rolling R(t) samples for the faint radius-history trail (engine or scrub-live).
  const radiusHistoryRef = useRef([]);

  const spacetimeBufferRef = useRef(spacetimeBuffer);
  useEffect(() => {
    spacetimeBufferRef.current = spacetimeBuffer;
  }, [spacetimeBuffer]);
  
  // Extract parameters with defaults
  const {
    hostMaterial = 'palladium',
    loadingRatio = 0.9,
    temperature: _paramTemperature = 300, // eslint-disable-line no-unused-vars
    initialBubbleRadius = 10.0,
    drivingPressure = 1.5,
    frequency = 20,
    latticeSize = 4,
    electrolyteFamily = null,
    electrolyteSpecies = null,
  } = parameters;

  const plasmaSpectrum = useMemo(
    () => resolveExcitedPlasmaSpectrum({
      hostMaterial,
      electrolyteFamily:
        electrolyteFamily
        || simulationData?.electrolyte_diagnostics?.electrolyte_family
        || null,
      electrolyteSpecies:
        electrolyteSpecies
        || simulationData?.electrolyte_diagnostics?.electrolyte_species
        || null,
      loadingRatio,
    }),
    [
      hostMaterial,
      electrolyteFamily,
      electrolyteSpecies,
      loadingRatio,
      simulationData?.electrolyte_diagnostics?.electrolyte_family,
      simulationData?.electrolyte_diagnostics?.electrolyte_species,
    ],
  );
  const plasmaSpectrumRef = useRef(plasmaSpectrum);
  useEffect(() => {
    plasmaSpectrumRef.current = plasmaSpectrum;
  }, [plasmaSpectrum]);

  const materialScale = useMemo(() => getMaterialScale(hostMaterial), [hostMaterial]);
  const palladiumScale = useMemo(() => getMaterialScale('palladium'), []);

  // Keep scene readability stable while preserving material-specific spacing ratios.
  const latticeSpacingVisUnits = useMemo(() => {
    const baseSpacing = PHYSICS_CONFIG.LATTICE_SPACING;
    const ratio = materialScale.latticeConstantM / palladiumScale.latticeConstantM;
    return baseSpacing * ratio;
  }, [materialScale.latticeConstantM, palladiumScale.latticeConstantM]);

  const latticeMetersPerVisUnit = useMemo(
    () => getLatticeMetersPerVisUnit({
      material: hostMaterial,
      latticeSpacingVisUnits,
    }),
    [hostMaterial, latticeSpacingVisUnits],
  );

  const hostAtomRadiusVisUnits = useMemo(
    () => getAtomRadiusVisUnits({
      material: hostMaterial,
      metersPerVisUnit: latticeMetersPerVisUnit,
      minimumVisRadius: 0.12,
    }),
    [hostMaterial, latticeMetersPerVisUnit],
  );

  const latticeScaleDescriptor = useMemo(
    () => buildLatticeScaleDescriptor({ material: hostMaterial, latticeSpacingVisUnits }),
    [hostMaterial, latticeSpacingVisUnits],
  );

  // VIZ-07 / VIZ-12 — never invent f_L / P_* from ambient T or excess heat.
  const liquidPhaseChannels = useMemo(
    () => extractLiquidPhaseChannels(simulationData),
    [simulationData],
  );
  const hostMeltMeta = useMemo(
    () => resolveHostMeltMeta(hostMaterial),
    [hostMaterial],
  );
  const liquidPhaseOverlayState = useMemo(
    () => resolveLiquidPhaseOverlayState({
      hostMaterial,
      phaseFractionLiquid: liquidPhaseChannels.phaseFractionLiquid,
    }),
    [hostMaterial, liquidPhaseChannels.phaseFractionLiquid],
  );

  const latticeBaselineLengthVisUnits = useMemo(
    () => Math.max(4, Math.round(5e-9 / Math.max(latticeMetersPerVisUnit, 1e-15))),
    [latticeMetersPerVisUnit],
  );

  // Create lattice structure
  const createLattice = useCallback((scene) => {
    const latticeGroup = new THREE.Group();
    latticeGroup.name = 'LatticeGroup';
    
    const dimension = latticeSize;
    const spacing = latticeSpacingVisUnits;

    // VIZ-06 — exclusive host color + DynamicDraw rest sites (schematic loading tint).
    const hostColorMeta = resolveExclusiveHostColor(hostMaterial);
    const hostColor = hostColorMeta.hex;
    const restSites = buildLatticeRestSites({
      dimension,
      spacing,
      yOffset: PHYSICS_CONFIG.LATTICE_Y_OFFSET,
      loadingRatio,
      seed: dimension * 17 + Math.round(loadingRatio * 1000),
    });
    
    const hostGeometry = new THREE.SphereGeometry(hostAtomRadiusVisUnits, 20, 20);
    // Phong (not high-metalness Standard): Standard@metalness≈0.85 with no envMap
    // paints near-black on the dark HSE canvas even when instanceColor matches
    // exclusive Pd/Ni legend hexes. Per-instance colors via InstancedMesh.instanceColor.
    // Modest emissive + white diffuse. Do NOT set vertexColors:true without a
    // geometry color attribute — that enables USE_COLOR with missing attrs and
    // zeroes diffuse, leaving only shared emissive (Tier-1 modes looked identical).
    // InstancedMesh.instanceColor alone enables USE_INSTANCING_COLOR.
    const hostEmissive = new THREE.Color(hostColor).multiplyScalar(0.1);
    const hostMaterial3D = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      shininess: 72,
      specular: 0x445566,
      emissive: hostEmissive,
      vertexColors: false,
    });

    // Solute beads: shared palette SOT (Pd run → D teal; else H green).
    // Schematic species label only — not isotopic proof / not QM orbitals.
    const solutePalette = resolveSolutePaletteEntry(hostMaterial);
    const soluteHex = solutePalette.hex;
    const soluteIsDeuterium = solutePalette.key === 'deuterium';
    const hydrogenRadius = Math.max(0.06, hostAtomRadiusVisUnits * 0.5);
    const hydrogenGeometry = new THREE.SphereGeometry(hydrogenRadius, 14, 14);
    const hydrogenMaterial = new THREE.MeshPhongMaterial({
      color: soluteHex,
      emissive: new THREE.Color(soluteHex).multiplyScalar(0.22),
      shininess: 80,
    });
    
    // Bond material
    const bondMaterial = new THREE.LineBasicMaterial({ 
      color: 0x667788, 
      transparent: true, 
      opacity: 0.35 
    });
    
    const points = restSites.map((site) => new THREE.Vector3(site.x, site.y, site.z));
    const connections = [];
    const hydrogenPositions = [];
    const instanceTransform = new THREE.Object3D();
    const scratchColor = new THREE.Color();

    // VIZ-06: InstancedMesh + DynamicDrawUsage so per-instance matrix/color
    // can update for loading tint and future schematic displacement (VIZ-09).
    const hostCount = restSites.length;
    const hostAtoms = new THREE.InstancedMesh(hostGeometry, hostMaterial3D, hostCount);
    hostAtoms.name = 'LatticeHostAtoms';
    hostAtoms.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Allocate instanceColor buffer (required before setColorAt).
    if (!hostAtoms.instanceColor) {
      hostAtoms.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(hostCount * 3),
        3,
      );
    }
    hostAtoms.instanceColor.setUsage(THREE.DynamicDrawUsage);

    applyDynamicLatticeInstances({
      sites: restSites,
      hostHex: hostColor,
      colorMode: latticeColorModeRef.current,
      markMatrixDynamic: () => {
        hostAtoms.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      },
      markColorDynamic: () => {
        hostAtoms.instanceColor?.setUsage(THREE.DynamicDrawUsage);
      },
      setMatrixAt: (index, elements) => {
        const m = new THREE.Matrix4();
        m.fromArray(elements);
        hostAtoms.setMatrixAt(index, m);
      },
      setColorAt: (index, rgb) => {
        scratchColor.setRGB(rgb.r, rgb.g, rgb.b);
        hostAtoms.setColorAt(index, scratchColor);
      },
    });

    restSites.forEach((site) => {
      if (site.occupied) {
        hydrogenPositions.push(interstitialOffsetFromSite(site, spacing));
      }
      // Bonds to -x / -y / -z neighbors (same topology as prior static lattice).
      if (site.ix > 0) connections.push([site.index, site.index - dimension * dimension]);
      if (site.iy > 0) connections.push([site.index, site.index - dimension]);
      if (site.iz > 0) connections.push([site.index, site.index - 1]);
    });

    hostAtoms.instanceMatrix.needsUpdate = true;
    if (hostAtoms.instanceColor) hostAtoms.instanceColor.needsUpdate = true;
    hostAtoms.computeBoundingSphere();
    hostAtoms.userData = {
      viz: 'VIZ-06',
      bufferUsage: DYNAMIC_LATTICE_BUFFER_USAGE,
      fidelity: DYNAMIC_LATTICE_FIDELITY,
      hostKey: hostColorMeta.hostKey,
      hostHex: hostColor,
      exclusiveHost: hostColorMeta.exclusive,
      restSites,
      pickable: true,
    };
    latticeGroup.add(hostAtoms);

    // Catalyst-as-waveguide ribbon (schematic) — opacity driven when Phonon ON
    const waveguide = createPhononWaveguideRibbon({
      span: dimension * spacing,
      y: PHYSICS_CONFIG.LATTICE_Y_OFFSET,
    });
    waveguide.visible = true;
    latticeGroup.add(waveguide);

    if (hydrogenPositions.length > 0) {
      const hydrogenAtoms = new THREE.InstancedMesh(
        hydrogenGeometry,
        hydrogenMaterial,
        hydrogenPositions.length,
      );
      hydrogenAtoms.name = 'LatticeHydrogenAtoms';
      // H cloud stays StaticDraw — trajectories would be VIZ-10 Points path.
      hydrogenAtoms.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      hydrogenPositions.forEach(([hx, hy, hz], index) => {
        instanceTransform.position.set(hx, hy, hz);
        instanceTransform.updateMatrix();
        hydrogenAtoms.setMatrixAt(index, instanceTransform.matrix);
      });
      hydrogenAtoms.instanceMatrix.needsUpdate = true;
      hydrogenAtoms.computeBoundingSphere();
      hydrogenAtoms.userData = {
        type: soluteIsDeuterium ? 'deuterium' : 'hydrogen',
        legendHex: soluteHex,
        state: 'FREE',
        fidelity: DYNAMIC_LATTICE_FIDELITY,
        note: 'Schematic interstitial from loading mask (not flux trajectories; not QM orbitals)',
      };
      latticeGroup.add(hydrogenAtoms);
    }

    // Bonds share one geometry: merging the segments into a single LineSegments
    // replaces up to 3 * dimension^3 Line objects with one draw call.
    if (connections.length > 0) {
      const bondVertices = new Float32Array(connections.length * 6);
      connections.forEach(([i, j], index) => {
        const start = points[i];
        const finish = points[j];
        const base = index * 6;
        bondVertices[base] = start.x;
        bondVertices[base + 1] = start.y;
        bondVertices[base + 2] = start.z;
        bondVertices[base + 3] = finish.x;
        bondVertices[base + 4] = finish.y;
        bondVertices[base + 5] = finish.z;
      });
      const bondGeometry = new THREE.BufferGeometry();
      bondGeometry.setAttribute('position', new THREE.BufferAttribute(bondVertices, 3));
      const bonds = new THREE.LineSegments(bondGeometry, bondMaterial);
      bonds.name = 'LatticeBonds';
      bonds.userData = { bondPairs: connections.slice() };
      latticeGroup.add(bonds);
    }
    
    const latticeSurfaceY = PHYSICS_CONFIG.LATTICE_Y_OFFSET + PHYSICS_CONFIG.LATTICE_SURFACE_OFFSET;
    const planeSize = dimension * spacing * 1.3;

    // Topological surface layer used as a solid boundary for proton confinement.
    // Physics boundary math uses latticeSurfaceY; render plane is a separate debug visual group.
    const boundaryVisualGroup = new THREE.Group();
    boundaryVisualGroup.name = 'BoundaryVisualGroup';
    const surfaceGeometry = new THREE.PlaneGeometry(planeSize, planeSize);
    const surfaceMaterial = new THREE.MeshPhongMaterial({
      color: 0x66d9ff,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const latticeSurface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
    latticeSurface.rotation.x = -Math.PI / 2;
    latticeSurface.position.set(0, latticeSurfaceY, 0);
    latticeSurface.name = 'LatticeSurfaceBoundary';
    boundaryVisualGroup.add(latticeSurface);

    // Subtle grid lines on the boundary plane to suggest lattice structure
    const gridDivisions = Math.min(8, Math.max(4, Math.floor(dimension)));
    const gridHelper = new THREE.GridHelper(planeSize, gridDivisions, 0x48c7ff, 0x3399cc);
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.25;
    gridHelper.material.depthWrite = false;
    gridHelper.rotation.x = -Math.PI / 2;
    gridHelper.position.set(0, latticeSurfaceY + 0.01, 0);
    gridHelper.name = 'LatticeSurfaceGrid';
    boundaryVisualGroup.add(gridHelper);

    // Vortex intake points (interstitial proxies) where protons can be accepted.
    const vortexSites = buildVortexSites(0, latticeSurfaceY, 0, spacing);
    const siteGeometry = new THREE.SphereGeometry(0.08, 10, 10);
    vortexSites.forEach((site, index) => {
      const siteMaterial = new THREE.MeshPhongMaterial({
        color: 0x48c7ff,
        emissive: 0x0a7ea8,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.7
      });
      const marker = new THREE.Mesh(siteGeometry, siteMaterial);
      marker.position.copy(site);
      marker.name = `VortexSiteMarker${index}`;
      boundaryVisualGroup.add(marker);
    });
    
    scene.add(latticeGroup);
    scene.add(boundaryVisualGroup);
    latticeGroupRef.current = latticeGroup;
    boundaryVisualGroupRef.current = boundaryVisualGroup;
    
    return latticeGroup;
  }, [hostMaterial, hostAtomRadiusVisUnits, latticeSize, latticeSpacingVisUnits, loadingRatio]);

  /**
   * VIZ-12 scaffold — local liquid film group (Pd XOR Ni).
   * Hidden (gap) until engine supplies finite f_L; never invents melt from T.
   */
  const createLiquidPhaseOverlay = useCallback((scene) => {
    const group = new THREE.Group();
    group.name = 'LiquidPhaseGroup';
    group.visible = false;
    group.userData = {
      mode: 'gap',
      claim_tier: 'speculative_exploratory',
      fidelity: 'schematic',
    };

    const hostColor = HOST_MATERIAL_COLORS[hostMaterial] || 0x888888;
    const filmGeometry = new THREE.SphereGeometry(1, 24, 16);
    const filmMaterial = new THREE.MeshPhongMaterial({
      color: hostColor,
      emissive: hostColor,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      shininess: 120,
      specular: 0xffffff,
    });
    const film = new THREE.Mesh(filmGeometry, filmMaterial);
    film.name = 'LiquidPhaseFilm';
    film.scale.set(1.2, 0.22, 1.2);
    const latticeSurfaceY =
      PHYSICS_CONFIG.LATTICE_Y_OFFSET + PHYSICS_CONFIG.LATTICE_SURFACE_OFFSET;
    film.position.set(0, latticeSurfaceY + 0.15, 0);
    group.add(film);

    scene.add(group);
    liquidPhaseGroupRef.current = group;
    return group;
  }, [hostMaterial]);

  // Create bubble with double-layer shell + collapse torus
  // Materials: MeshPhysical clearcoat / emissive (presentation realism).
  // Tint binds to temperature_k / collapse_results when samples available.
  const createBubble = useCallback((scene) => {
    const bubbleGroup = new THREE.Group();
    bubbleGroup.name = 'BubbleGroup';
    bubbleGroup.userData = {
      fidelity: 'schematic',
      source: 'schematic_visualization',
    };
    // Start at nucleation site - very close to lattice surface
    // This reflects physics: heterogeneous nucleation occurs AT surface cavities
    const latticeSurfaceY = PHYSICS_CONFIG.LATTICE_Y_OFFSET + PHYSICS_CONFIG.LATTICE_SURFACE_OFFSET;
    // Start with small scale (nucleation size) — seated on lattice boundary
    const initialScale = PHYSICS_CONFIG.BUBBLE_SCALE.NUCLEATION;
    const initialY = getLatticeBoundBubbleY({
      latticeSurfaceY,
      displayScale: initialScale,
      phase: 'MINIMUM',
      nestPenetration: 0.16,
    });
    bubbleGroup.position.set(0, initialY, 0);
    const geos = createBubbleTorusGeometries();
    
    // Soft translucent gas membrane — primary bubble fill (BDS-504: not wireframe)
    const bubbleMaterial = createBubbleGasMaterial({ opacity: 0.32 });
    const bubble = new THREE.Mesh(geos.gas, bubbleMaterial);
    bubble.name = 'MainBubble';
    bubble.renderOrder = 1;
    bubble.userData = { 
      geometryType: 'sphere', // 'sphere', 'torus', 'jet'
      baseGeometry: geos.gas,
      baseOpacity: 0.32,
    };
    bubble.scale.setScalar(initialScale);
    bubbleGroup.add(bubble);
    
    // Torus for late-compression (90.7–95.7% scrub) — turbulent gaseous plasma ring
    const spectrum = plasmaSpectrumRef.current;
    const torusMaterial = createTorusPlasmaMaterial({
      color: spectrum?.primaryHex ?? 0xff9955,
      opacity: 0.55,
    });
    const torus = new THREE.Mesh(geos.torus, torusMaterial);
    torus.name = 'TorusFormation';
    torus.visible = false;
    torus.rotation.x = Math.PI / 2;
    torus.renderOrder = 3;
    torus.userData = { baseRadius: 1.15, baseTubeRadius: 0.38 };
    bubbleGroup.add(torus);

    // Secondary filament — offset tube for turbulent multi-stream read
    const filament = new THREE.Mesh(
      geos.torusFilament,
      createTorusFilamentMaterial({
        color: spectrum?.secondaryHex ?? 0xffcc88,
        opacity: 0.42,
      }),
    );
    filament.name = 'TorusPlasmaFilament';
    filament.visible = false;
    filament.rotation.x = Math.PI / 2;
    filament.renderOrder = 3;
    filament.userData = { baseRadius: 1.18, baseTubeRadius: 0.16 };
    bubbleGroup.add(filament);

    // Soft Points cloud — rotating gaseous excited plasma (not glass)
    const plasmaCloud = createTorusPlasmaCloud({
      count: 360,
      color: spectrum?.primaryHex ?? 0xff8855,
      majorRadius: 1.15,
      tubeRadius: 0.48,
    });
    bubbleGroup.add(plasmaCloud.points);
    bubbleGroup.userData.torusPlasmaCloud = plasmaCloud;

    // Focused jet — transparent light cone into lattice (species-tintable)
    const jetMaterial = createJetMaterial({
      color: spectrum?.jetHex ?? 0xffee88,
      opacity: 0.42,
    });
    const jet = new THREE.Mesh(geos.jet, jetMaterial);
    jet.name = 'FocusedJet';
    jet.visible = false;
    jet.rotation.x = Math.PI;
    jet.renderOrder = 3;
    jet.userData = { baseRadius: 0.32, baseHeight: 3.8 };
    bubbleGroup.add(jet);

    // Counter-rotating shed tori + micro-bubbles rise/fade away from lattice
    const shedDebris = createShedPlasmaDebrisGroup({
      torusCount: 3,
      bubbleCount: 5,
      primaryColor: spectrum?.primaryHex ?? 0x5ce1ff,
      secondaryColor: spectrum?.secondaryHex ?? 0xc77dff,
    });
    bubbleGroup.add(shedDebris.group);
    bubbleGroup.userData.shedPlasmaDebris = shedDebris;

    if (spectrum) applyPlasmaSpectrumTint(bubbleGroup, spectrum);
    
    // Ionic double-layer membrane (outer) — primary readable bubble silhouette
    const doubleLayer = new THREE.Mesh(geos.doubleLayer, createDoubleLayerMaterial({ opacity: 0.52 }));
    doubleLayer.name = 'DoubleLayer';
    doubleLayer.renderOrder = 2;
    doubleLayer.scale.setScalar(initialScale);
    doubleLayer.userData = { baseOpacity: 0.52 };
    bubbleGroup.add(doubleLayer);

    // Faint wire rim only — never primary (was boosted to 0.75 → cage look)
    const doubleLayerWire = new THREE.Mesh(
      geos.doubleLayerWire,
      new THREE.MeshBasicMaterial({
        color: 0xaaffff,
        transparent: true,
        opacity: DOUBLE_LAYER_WIRE_OPACITY_EXPANSION,
        wireframe: true,
        depthWrite: false,
      }),
    );
    doubleLayerWire.name = 'DoubleLayerWire';
    doubleLayerWire.renderOrder = 2;
    doubleLayerWire.scale.setScalar(initialScale);
    bubbleGroup.add(doubleLayerWire);
    
    // Inner charge layer
    const innerLayer = new THREE.Mesh(geos.innerLayer, createInnerLayerMaterial({ opacity: 0.34 }));
    innerLayer.name = 'InnerLayer';
    innerLayer.renderOrder = 2;
    innerLayer.scale.setScalar(initialScale);
    innerLayer.userData = { baseOpacity: 0.34 };
    bubbleGroup.add(innerLayer);

    // Optional sheath surface-flow Points/ribbons — OFF until Layers toggle
    const sheathFlow = createSheathSurfaceFlowGroup();
    sheathFlow.visible = false;
    bubbleGroup.add(sheathFlow);

    // Electrolyte / ionized-env soft halo — EMP chem-env tint (plasma ≠ fusion)
    const electrolyteHalo = createElectrolyteIonizedHalo({
      tintHex: 0x66e8ff,
      opacity: 0.22,
      radius: 1.22,
    });
    electrolyteHalo.visible = true;
    bubbleGroup.add(electrolyteHalo);

    // Soft local light so clearcoat shells catch highlights (presentation)
    const bubbleLight = new THREE.PointLight(0xb8e8ff, 0.85, 10, 2);
    bubbleLight.name = 'BubbleKeyLight';
    bubbleLight.position.set(0.6, 0.8, 1.2);
    bubbleGroup.add(bubbleLight);
    const warmFill = new THREE.PointLight(0xff9966, 0.35, 8, 2);
    warmFill.name = 'BubbleWarmFill';
    warmFill.position.set(-0.8, 0.4, -0.6);
    bubbleGroup.add(warmFill);
    
    // Pressure wave rings — opacity later boosted by engine peak_mach (EMP)
    for (let i = 0; i < 3; i++) {
      const ringGeometry = new THREE.RingGeometry(1.2 + i * 0.5, 1.32 + i * 0.5, 64);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x66aaff,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.name = `PressureRing${i}`;
      ring.userData = { baseRadius: 1.2 + i * 0.5, phase: i * 0.3 };
      bubbleGroup.add(ring);
    }

    // Faint R(t) history trail from spacetime / scrub radius (EMP when engine-bound)
    const histCount = 48;
    const histPositions = new Float32Array(histCount * 3);
    const histGeom = new THREE.BufferGeometry();
    histGeom.setAttribute(
      'position',
      new THREE.BufferAttribute(histPositions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    const histLine = new THREE.Line(
      histGeom,
      new THREE.LineBasicMaterial({
        color: 0x7ec8ff,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      }),
    );
    histLine.name = 'RadiusHistoryTrail';
    histLine.frustumCulled = false;
    bubbleGroup.add(histLine);

    scene.add(bubbleGroup);
    bubbleGroupRef.current = bubbleGroup;
    
    return bubbleGroup;
  }, []);

  // Create H2/D2 particles that follow MHD fluid dynamics
  // Physics: Ionized hydrogen/deuterium in electrolytic bubble boundary layer
  // These particles swirl around the bubble following MHD flow patterns.
  // Visual look: soft Points cloud + ribbon trails (schematic; not CFD).
  const createProtons = useCallback((scene) => {
    const protonGroup = new THREE.Group();
    protonGroup.name = 'ProtonPhaseGroup';
    
    // More, smaller particles for MHD fluid visualization
    const protonCount = 60; // More particles for fluid-like appearance
    const protonGeometry = new THREE.SphereGeometry(0.035, 6, 6); // Tiny state cores; soft cloud carries the look
    
    for (let i = 0; i < protonCount; i++) {
      // Start with FREE state (ionized H2/D2 in solution)
      const state = PROTON_STATES.FREE;
      const protonMaterial = new THREE.MeshPhongMaterial({
        color: state.color,
        emissive: state.emissive,
        emissiveIntensity: state.emissiveIntensity,
        shininess: 60,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
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
        moleculeType: Math.random() < 0.5 ? 'H2' : 'D2', // H2 or D2
        absorbed: false,
        absorbTimer: 0,
        acceptedSite: -1
      };
      
      protonGroup.add(proton);
    }
    
    scene.add(protonGroup);
    protonGroupRef.current = protonGroup;

    // Soft wave companion (additive Points + ribbons) — presentation only
    protonWaveCompanionRef.current?.dispose?.();
    const waveCompanion = new ProtonWaveCompanion({
      particleCount: protonCount,
      trailLength: 14,
      coreSize: 0.22,
      bloomSize: 0.48,
      trailColor: 0xff8a3d,
    });
    scene.add(waveCompanion.getGroup());
    protonWaveCompanionRef.current = waveCompanion;
    
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
    
    // Energy flow particles — soft Points (wave look); kinematics still per-proxy Object3D
    const energyCount = 20;
    const softMap = createSoftDiscTexture();
    const energyPositions = new Float32Array(energyCount * 3);
    const energyColors = new Float32Array(energyCount * 3);
    const energyColor = new THREE.Color(0xffee66);
    for (let i = 0; i < energyCount; i += 1) {
      energyColors[i * 3] = energyColor.r;
      energyColors[i * 3 + 1] = energyColor.g;
      energyColors[i * 3 + 2] = energyColor.b;
    }
    const energyGeometry = new THREE.BufferGeometry();
    energyGeometry.setAttribute('position', new THREE.BufferAttribute(energyPositions, 3));
    energyGeometry.setAttribute('color', new THREE.BufferAttribute(energyColors, 3));
    const energyMaterial = createSoftPointsMaterial({
      color: 0xffffff,
      size: 0.2,
      opacity: 0.42,
      map: softMap,
    });
    const energyPoints = new THREE.Points(energyGeometry, energyMaterial);
    energyPoints.name = 'EnergySoftCloud';
    energyPoints.userData = { proxies: [] };
    fieldGroup.add(energyPoints);

    for (let i = 0; i < energyCount; i++) {
      const proxy = new THREE.Object3D();
      proxy.userData = {
        t: Math.random(),
        speed: 0.02 + Math.random() * 0.02,
        lineIndex: Math.floor(Math.random() * lineCount),
        softIndex: i,
      };
      proxy.name = `EnergyParticle${i}`;
      fieldGroup.add(proxy);
      energyPoints.userData.proxies.push(proxy);
    }

    scene.add(fieldGroup);
    fieldGroupRef.current = fieldGroup;

    // Soft e⁻ migration as its own scene group so Fields toggle does not hide it
    electronMigrationRef.current?.dispose?.();
    const electronCloud = new ElectronMigrationCloud({
      count: isMobile ? 16 : 28,
      lineCount,
      size: 0.14,
      colorHex: 0x7aeeff,
    });
    const latticeSurfaceY = PHYSICS_CONFIG.LATTICE_Y_OFFSET + PHYSICS_CONFIG.LATTICE_SURFACE_OFFSET;
    electronCloud.update({ latticeY: latticeSurfaceY });
    electronCloud.getGroup().visible = true;
    scene.add(electronCloud.getGroup());
    electronMigrationRef.current = electronCloud;
    
    return fieldGroup;
  }, [isMobile]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create MHD flow visualization - simplified particle-based fluid dynamics
  // Physics: Ionized H2/D2 particles following MHD fluid flow, color changes with phase/energy
  const createVortexFlow = useCallback((scene) => {
    const vortexGroup = new THREE.Group();
    vortexGroup.name = 'MHDFlowGroup';
    
    const latticeY = PHYSICS_CONFIG.LATTICE_Y_OFFSET + PHYSICS_CONFIG.LATTICE_SURFACE_OFFSET;
    vortexGroup.position.set(0, latticeY + 0.3, 0); // Nucleation site so rotation spins in place

    if (!qualitySettings.vortexVisualizationEnabled) {
      vortexGroup.visible = false;
      scene.add(vortexGroup);
      vortexGroupRef.current = vortexGroup;
      return vortexGroup;
    }
    
    try {
    // Soft Points + bloom + staggered dual-core wake (vortex-street–inspired look).
    // Presentation only — not CFD / PBF / WebGPU fluid solvers.
    // Soft translucent plasma — lattice must remain readable through the column.
    const plasmaVortex = new PlasmaVortexEffect({
      particleCount: qualitySettings.vortexParticleCount ?? 180,
      vortexStrength: 1.05,
      radialSpeed: 0.28,
      verticalSpeed: 0.4,
      radius: 2.0,
      height: 3.4,
      pointSize: 0.26,
      bloomSize: 0.52,
      trailLength: 12,
      streetEnabled: true,
      streetSeparation: 0.95,
      streetStreamSpeed: 0.58,
      streetShedRate: 1.15,
      glow: 0.4,
    });
    plasmaVortex.initialize();
    plasmaVortex.getGroup().position.set(0, 0, 0); // Parent group handles world position
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

    const flowReversalPulseGeometry = new THREE.SphereGeometry(0.18, 16, 16);
    const flowReversalPulseMaterial = new THREE.MeshBasicMaterial({
      color: 0x7ef1ff,
      transparent: true,
      opacity: 0
    });
    const flowReversalPulse = new THREE.Mesh(flowReversalPulseGeometry, flowReversalPulseMaterial);
    flowReversalPulse.position.set(0, 0, 0);
    flowReversalPulse.name = 'FlowReversalPulse';
    vortexGroup.add(flowReversalPulse);
    
    scene.add(vortexGroup);
    vortexGroupRef.current = vortexGroup;
    
    return vortexGroup;
  }, [qualitySettings]);

  // Create Casimir effect field visualization
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
      const latticeY = PHYSICS_CONFIG.LATTICE_Y_OFFSET;
      const latticePoint = new THREE.Vector3(
        bubblePoint.x * 0.3, // Project toward center
        latticeY,
        bubblePoint.z * 0.3
      );
      
      // Calculate distance
      const distance = bubblePoint.distanceTo(latticePoint);
      
      // Casimir effect magnitude: F ∝ 1/d⁴
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

  // Delocalized interface-electron cloud visualization (formerly "halo electrons")
  // Paper §2.2: P_overlap ≈ (r₀/a)³ exp(-2r₀/a) ≈ 8.5×10⁻¹⁶ (not ~10⁻³)
  // Soft Points probability cloud — artistic particle count; not quantitative overlap proof.
  const createHaloElectrons = useCallback((scene) => {
    const haloGroup = new THREE.Group();
    haloGroup.name = 'HaloElectronsGroup';
    
    // Extended probability clouds near lattice protons (visualization only)
    // Quantitative overlap is ~10⁻¹⁶ per the paper; particle count here is artistic
    const protonCount = 20; // Number of protons to show halo electrons for
    const cloudParticleCount = 150; // Particles per cloud
    const softMap = createSoftDiscTexture();
    
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
      const positions = [];
      const colors = [];
      const cloudColor = new THREE.Color(0x00ffff);

      for (let j = 0; j < cloudParticleCount; j++) {
        // Spherical distribution with exponential falloff (halo probability distribution)
        const r = cloudRadius * Math.sqrt(Math.random()); // Uniform in volume
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        // Exponential probability: P(r) ∝ exp(-2r/a)
        const a = 0.2; // Halo parameter
        const probability = Math.exp(-2 * r / a);
        if (Math.random() > probability) continue; // Skip low-probability regions
        
        positions.push(
          basePos.x + r * Math.sin(phi) * Math.cos(theta),
          basePos.y + r * Math.sin(phi) * Math.sin(theta),
          basePos.z + r * Math.cos(phi),
        );
        const fade = 0.35 + probability * 0.65;
        colors.push(cloudColor.r * fade, cloudColor.g * fade, cloudColor.b * fade);
      }

      if (positions.length >= 3) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        const material = createSoftPointsMaterial({
          color: 0xffffff,
          size: 0.14,
          opacity: 0.35,
          map: softMap,
        });
        const softCloud = new THREE.Points(geometry, material);
        softCloud.name = `HaloSoftCloud${i}`;
        softCloud.userData = { basePosition: basePos.clone(), source: 'schematic_visualization' };
        cloudGroup.add(softCloud);
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
   * Create 3D scale bar for physical dimension reference.
   *
   * The unified scene is a mixed-scale schematic: bubble features are
   * rendered at ~1 vis unit = 1 μm (physically reasonable for the
   * acoustic cavitation bubble), while lattice atoms are drawn ~1.2 vis
   * units apart even though the real Pd lattice constant is 0.389 nm
   * (~3000× smaller). A single fixed scale-bar calibration is therefore
   * misleading when the user zooms in on the lattice. The bar is created
   * here with a sensible default and then updated adaptively in the
   * animation loop via `setAdaptiveScale(cameraDistance)`.
   */
  const createScaleBar = useCallback((scene) => {
    if (scaleBarRef.current) {
      scene.remove(scaleBarRef.current.getGroup());
    }

    const scaleBar = new ScaleBar({
      length: latticeBaselineLengthVisUnits,
      realWorldScale: latticeMetersPerVisUnit,
      position: new THREE.Vector3(-6, -6, 4),
      color: 0x00ffcc,
      regimeLabel: latticeScaleDescriptor.label,
    });
    scaleBar.initialize();
    scene.add(scaleBar.getGroup());
    scaleBarRef.current = scaleBar;

    return scaleBar;
  }, [latticeBaselineLengthVisUnits, latticeMetersPerVisUnit, latticeScaleDescriptor.label]);

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
    
    // Phase determination: Expansion → Collapse → Minimum → Rebound → repeat
    phase = phaseFromCycleFraction(normalizedTime);
    const t_phase = phaseProgressInCycle(normalizedTime);
    if (phase === 'EXPANSION') {
      // Expansion: driven by acoustic pressure
      const P_acoustic = parameters.drivingPressure * 1e5 * Math.sin(omega * t * 0.4); // Convert bar to Pa
      const expansionFactor = 1 + (P_acoustic / (101325 + 2 * SIGMA / R0_m)) * 0.3;
      radius = baseRadius * Math.max(1.0, Math.min(1.3, expansionFactor));
      compressionRatio = baseRadius / Math.max(radius, baseRadius * 0.1);
    } else if (phase === 'COLLAPSE') {
      // Collapse: rapid compression following Rayleigh-Plesset dynamics
      const R_max = baseRadius * (1 + parameters.drivingPressure * 0.3);
      const R_min = baseRadius * 0.1; // Minimum radius (compression ratio ~10)
      radius = R_max - (R_max - R_min) * Math.pow(t_phase, 2);
      compressionRatio = baseRadius / Math.max(radius, baseRadius * 0.1);
    } else if (phase === 'MINIMUM') {
      radius = baseRadius * 0.1; // Maximum compression
      compressionRatio = 10.0;
    } else {
      // REBOUND: rapid expansion after collapse, then the cycle restarts
      const R_min = baseRadius * 0.1;
      const R_rebound = baseRadius * 0.6;
      radius = R_min + (R_rebound - R_min) * t_phase;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivingPressure, parameters.temperature, parameters.frequency]);

  // SCHEMATIC PREVIEW ONLY: used when no backend data is streaming, so the
  // idle animation still has colours. The screening term mirrors the backend
  // screening_kernel (Assenbaum-Rolfs with the cited Pd potential) and the
  // total is capped at the governance MAX_ENHANCEMENT_FACTOR (1e5), so this
  // preview cannot contradict streamed results. It is never shown as a
  // simulation output. (A previous version used the retired Debye form and
  // an unrelated 1e8 cap.)
  const calculateEnhancementFactors = useCallback((compressionRatio, fieldStrength, temperature, _pressure) => {
    // Physical constants
    const KB = 1.380649e-23; // J/K
    const E_CHARGE = 1.602176634e-19; // C
    const ALPHA = 7.2973525693e-3; // Fine structure constant
    const MAX_ENHANCEMENT = 1e5; // governance ceiling (MAX_ENHANCEMENT_FACTOR)
    const U_SCREEN_EV = 800; // Pd cited typical potential (screening_data.py)
    const MU_C2_EV = 0.5 * 2.014 * 931.494e6; // D+D reduced-mass rest energy, eV
    
    // 1. Electron Screening Enhancement (Assenbaum-Rolfs, as in the backend
    // kernel): f = exp(pi * eta * Ue / E) with the exponent capped at
    // ln(ceiling) so the ceiling is the only limit.
    const eThermalEv = Math.max(1.5 * KB * temperature / E_CHARGE, 1e-6);
    const eta = ALPHA * Math.sqrt(MU_C2_EV / (2 * eThermalEv));
    const exponent = Math.min(
      Math.PI * eta * U_SCREEN_EV / eThermalEv,
      Math.log(MAX_ENHANCEMENT),
    );
    const screening_factor = Math.exp(exponent);
    
    // 2. QED Double-Layer Enhancement
    // Enhancement from high electric field: f_QED = 1 + (E/E_crit)²
    const E_critical = 1e8; // V/m
    const qed_factor = 1 + Math.pow(fieldStrength / E_critical, 2);
    
    // 3. Casimir Enhancement
    // Casimir effect scales with 1/d⁴, enhancement from proximity
    // Simplified: f_casimir ≈ (R0/R)² = compressionRatio²
    const casimir_factor = Math.pow(compressionRatio, 2);
    
    // 4. Rydberg Matter Enhancement
    // Extended orbitals enable energy localization
    // Enhancement scales with compression and field
    const rydberg_factor = 1 + 0.5 * compressionRatio * (fieldStrength / 1e8);
    
    // 5. Compression Enhancement
    // Increased density from compression
    const compression_factor = Math.pow(compressionRatio, 1.5);
    
    // Combined enhancement (multiplicative, capped at the governance ceiling)
    const total = screening_factor * qed_factor * casimir_factor * rydberg_factor * compression_factor;
    
    return {
      total: Math.min(total, MAX_ENHANCEMENT),
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
      
      if (phase === 'EXPANSION') {
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

  /**
   * Phonon standing waves keep ticking even while the bubble clock is paused,
   * so material-size acoustic/optical modes stay unmistakable on the HSE canvas.
   * Params resolve from enhancement_breakdown.phonon / T / compression / loading —
   * schematic modes only (not MD eigenvectors); never invents f_L.
   */
  const tickPhononStandingWaves = useCallback((deltaTime, {
    temperatureK = 300,
    compressionRatio = 1,
    phononFactor = 1,
  } = {}) => {
    if (!showLattice || !showPhonon || !latticeGroupRef.current) {
      const ribbon = latticeGroupRef.current?.getObjectByName('PhononWaveguideRibbon');
      if (ribbon) ribbon.visible = false;
      return;
    }
    const hostAtoms = latticeGroupRef.current.getObjectByName('LatticeHostAtoms');
    const restSites = hostAtoms?.userData?.restSites;
    if (!hostAtoms || !restSites?.length) return;

    phononTimeRef.current += Math.max(deltaTime, 1 / 60);
    const forces = cavitationForcesRef.current;
    const params = resolvePhononStandingWaveParams({
      phononFactor,
      temperatureK,
      compressionRatio,
      loadingRatio,
      meltingPointK: hostMeltMeta?.meltingPointK,
      phononScale: forces?.phononScale ?? 1,
    });
    const {
      amplitude: amp,
      acousticWeight,
      opticalWeight,
      acousticFreq,
      opticalFreq,
      waveguideNorm: wgNorm,
      meltSoftening: meltSoft,
    } = params;
    const { displacements, modeEnergy, acousticEnergy, opticalEnergy } =
      buildPhononStandingWaveDisplacements(restSites, {
        time: phononTimeRef.current,
        amplitude: amp,
        acousticWeight,
        opticalWeight,
        acousticFreq,
        opticalFreq,
        waveguideNorm: wgNorm,
        meltSoftening: meltSoft,
      });
    const hostHex = hostAtoms.userData?.hostHex ?? 0x8b8b8b;
    const scratchColor = new THREE.Color();
    applyDynamicLatticeInstances({
      sites: restSites,
      displacements,
      hostHex,
      colorMode: latticeColorModeRef.current,
      temperatureK,
      modeEnergies: modeEnergy,
      opticalWeight,
      setMatrixAt: (index, elements) => {
        const m = new THREE.Matrix4();
        m.fromArray(elements);
        hostAtoms.setMatrixAt(index, m);
      },
      setColorAt: hostAtoms.instanceColor
        ? (index, rgb) => {
          scratchColor.setRGB(rgb.r, rgb.g, rgb.b);
          hostAtoms.setColorAt(index, scratchColor);
        }
        : undefined,
    });
    hostAtoms.instanceMatrix.needsUpdate = true;
    if (hostAtoms.instanceColor) hostAtoms.instanceColor.needsUpdate = true;

    const bonds = latticeGroupRef.current.getObjectByName('LatticeBonds');
    const pairs = bonds?.userData?.bondPairs;
    const bondPos = bonds?.geometry?.attributes?.position;
    if (pairs?.length && bondPos?.array) {
      const arr = bondPos.array;
      for (let b = 0; b < pairs.length; b += 1) {
        const [ia, ib] = pairs[b];
        const sa = restSites[ia];
        const sb = restSites[ib];
        const da = displacements[ia] || { x: 0, y: 0, z: 0 };
        const db = displacements[ib] || { x: 0, y: 0, z: 0 };
        const base = b * 6;
        arr[base] = sa.x + da.x;
        arr[base + 1] = sa.y + da.y;
        arr[base + 2] = sa.z + da.z;
        arr[base + 3] = sb.x + db.x;
        arr[base + 4] = sb.y + db.y;
        arr[base + 5] = sb.z + db.z;
      }
      bondPos.needsUpdate = true;
    }

    const waveguideRibbon = latticeGroupRef.current.getObjectByName('PhononWaveguideRibbon');
    if (waveguideRibbon?.material) {
      waveguideRibbon.visible = true;
      const pulse = 0.5 + 0.5 * Math.sin(phononTimeRef.current * 3.1);
      waveguideRibbon.material.opacity = 0.35 + wgNorm * 0.55 * pulse + meltSoft * 0.2;
    }

    const acousticPct = Math.round(acousticWeight * 100);
    const opticalPct = Math.round(opticalWeight * 100);
    const ampRounded = Math.round(amp * 1000) / 1000;
    const prevMix = phononMixReadoutRef.current;
    if (
      prevMix.acousticPct !== acousticPct
      || prevMix.opticalPct !== opticalPct
      || prevMix.amp !== ampRounded
    ) {
      const next = { acousticPct, opticalPct, amp: ampRounded };
      phononMixReadoutRef.current = next;
      setPhononMixReadout(next);
    }

    if (canvasRef.current?.dataset) {
      canvasRef.current.dataset.phononAmp = amp.toFixed(3);
      const meanE = modeEnergy.reduce((s, e) => s + e, 0) / Math.max(modeEnergy.length, 1);
      const meanA = acousticEnergy.reduce((s, e) => s + e, 0) / Math.max(acousticEnergy.length, 1);
      const meanO = opticalEnergy.reduce((s, e) => s + e, 0) / Math.max(opticalEnergy.length, 1);
      canvasRef.current.dataset.phononEnergy = meanE.toFixed(3);
      canvasRef.current.dataset.phononAcoustic = meanA.toFixed(3);
      canvasRef.current.dataset.phononOptical = meanO.toFixed(3);
      canvasRef.current.dataset.phononAcousticPct = String(acousticPct);
      canvasRef.current.dataset.phononOpticalPct = String(opticalPct);
      canvasRef.current.dataset.phononMeltSoft = meltSoft.toFixed(3);
      canvasRef.current.dataset.phononWaveguide = wgNorm.toFixed(3);
      canvasRef.current.dataset.latticeColorMode = latticeColorModeRef.current;
    }
  }, [showLattice, showPhonon, hostMeltMeta, loadingRatio]);

  // Immediate host recolor when Tier-1 color mode changes (colors only — keep phonon pose).
  useEffect(() => {
    if (!showLattice || !latticeGroupRef.current) return;
    const hostAtoms = latticeGroupRef.current.getObjectByName('LatticeHostAtoms');
    const restSites = hostAtoms?.userData?.restSites;
    if (!hostAtoms?.instanceColor || !restSites?.length) return;
    const scratchColor = new THREE.Color();
    const hostHex = hostAtoms.userData?.hostHex ?? 0x8b8b8b;
    const temperatureK = physicsData?.temperature ?? 300;
    const mode = normalizeLatticeColorMode(latticeColorMode);
    for (let i = 0; i < restSites.length; i += 1) {
      const rgb = resolveLatticeHostInstanceRgb({
        mode,
        hostHex,
        occupied: restSites[i]?.occupied,
        temperatureK,
        modeEnergy: 0,
        opticalWeight: 0.4,
      });
      scratchColor.setRGB(rgb.r, rgb.g, rgb.b);
      hostAtoms.setColorAt(i, scratchColor);
    }
    hostAtoms.instanceColor.needsUpdate = true;
    if (canvasRef.current?.dataset) {
      canvasRef.current.dataset.latticeColorMode = mode;
    }
  }, [latticeColorMode, showLattice, physicsData?.temperature]);

  // Rebuild collapse ODE ribbon on scene root (not bubble-scaled) when trajectory present.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    let group = scene.getObjectByName('CollapseRibbonGroup');
    if (group) {
      scene.remove(group);
      group.traverse((obj) => {
        obj.geometry?.dispose?.();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
          else obj.material.dispose?.();
        }
      });
      group = null;
    }
    const built = buildCollapseRibbonPositions({
      trajectory: simulationData?.collapse_trajectory,
      initialRadiusUm: initialBubbleRadius,
      nestY: PHYSICS_CONFIG.LATTICE_Y_OFFSET + 0.35,
    });
    if (!built || !showCollapseRibbon || !showBubble) {
      setCollapseRibbonMeta(null);
      collapseRibbonMetaRef.current = null;
      return undefined;
    }
    group = new THREE.Group();
    group.name = 'CollapseRibbonGroup';
    // Fat tube so the ODE path reads at HSE zoom (LineBasic is too thin).
    const curvePts = [];
    for (let i = 0; i < built.sampleCount; i += 1) {
      curvePts.push(new THREE.Vector3(
        built.positions[i * 3],
        built.positions[i * 3 + 1],
        built.positions[i * 3 + 2],
      ));
    }
    const curve = new THREE.CatmullRomCurve3(curvePts);
    const tubeGeom = new THREE.TubeGeometry(
      curve,
      Math.min(160, Math.max(32, built.sampleCount * 2)),
      0.055,
      8,
      false,
    );
    const ribbonTube = new THREE.Mesh(
      tubeGeom,
      new THREE.MeshBasicMaterial({
        color: 0xffb84d,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    );
    ribbonTube.name = 'CollapseTrajectoryRibbon';
    ribbonTube.frustumCulled = false;
    ribbonTube.userData = {
      sampleCount: built.sampleCount,
      minIndex: built.minIndex,
      source: built.source,
      fidelity: built.fidelity,
      positions: built.positions,
    };
    group.add(ribbonTube);

    const playhead = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 14, 14),
      new THREE.MeshBasicMaterial({
        color: 0xfff3a0,
        transparent: true,
        opacity: 1,
        depthWrite: false,
      }),
    );
    playhead.name = 'CollapseRibbonPlayhead';
    playhead.position.set(built.positions[0], built.positions[1], built.positions[2]);
    group.add(playhead);

    const minMark = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 14, 14),
      new THREE.MeshBasicMaterial({
        color: 0xff5533,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      }),
    );
    minMark.name = 'CollapseRibbonMinMark';
    const mi = built.minIndex;
    minMark.position.set(
      built.positions[mi * 3],
      built.positions[mi * 3 + 1],
      built.positions[mi * 3 + 2],
    );
    group.add(minMark);
    scene.add(group);

    const meta = {
      sampleCount: built.sampleCount,
      source: built.source,
      fidelity: built.fidelity,
    };
    setCollapseRibbonMeta(meta);
    collapseRibbonMetaRef.current = meta;
    if (canvasRef.current?.dataset) {
      canvasRef.current.dataset.collapseRibbon = built.source;
    }
    return () => {
      scene.remove(group);
      group.traverse((obj) => {
        obj.geometry?.dispose?.();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
          else obj.material.dispose?.();
        }
      });
    };
  }, [
    simulationData?.collapse_trajectory,
    initialBubbleRadius,
    showCollapseRibbon,
    showBubble,
  ]);

  // VIZ-08 occupancy glow — engine site loading when exported; else schematic + chip.
  // Soft glow on ALL hosts; occupancy modulates intensity (no "dead" empty sites).
  useEffect(() => {
    const lattice = latticeGroupRef.current;
    if (!lattice) return;
    const prev = lattice.getObjectByName('OccupancyGlowHosts');
    if (prev) {
      lattice.remove(prev);
      prev.geometry?.dispose?.();
      prev.material?.dispose?.();
    }
    if (!showLattice || !showOccupancyGlow) {
      setOccupancyGlowMeta(null);
      return;
    }
    const hostAtoms = lattice.getObjectByName('LatticeHostAtoms');
    const restSites = hostAtoms?.userData?.restSites;
    if (!restSites?.length) {
      setOccupancyGlowMeta(null);
      return;
    }
    const plan = resolveOccupancyGlowPlan({
      siteCount: restSites.length,
      loadingRatio,
      seed: latticeSize * 17 + Math.round(loadingRatio * 1000),
      simulationData,
    });
    setOccupancyGlowMeta(plan);
    const glow = occupancyGlowRgb(plan.engineBound);
    const geom = new THREE.SphereGeometry(
      Math.max(0.12, hostAtomRadiusVisUnits * 1.55),
      14,
      14,
    );
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      // Diadon: more transparent — soft halo, not a bright wash.
      opacity: 0.035 + glow.intensity * 0.07,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.InstancedMesh(geom, mat, restSites.length);
    mesh.name = 'OccupancyGlowHosts';
    mesh.frustumCulled = false;
    const scratch = new THREE.Object3D();
    const scratchColor = new THREE.Color();
    const base = new THREE.Color(glow.r, glow.g, glow.b);
    if (!mesh.instanceColor) {
      mesh.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(restSites.length * 3),
        3,
      );
    }
    restSites.forEach((site, index) => {
      const strength = occupancyGlowSiteStrength(Boolean(plan.occupied[index]));
      scratch.position.set(site.x, site.y, site.z);
      scratch.scale.setScalar(0.82 + strength * 0.38);
      scratch.updateMatrix();
      mesh.setMatrixAt(index, scratch.matrix);
      scratchColor.copy(base).multiplyScalar(0.35 + strength * 0.65);
      mesh.setColorAt(index, scratchColor);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.userData = {
      fidelity: plan.fidelity,
      engineBound: plan.engineBound,
      occupiedCount: plan.occupiedCount,
      label: plan.label,
      allHostsGlow: true,
    };
    lattice.add(mesh);
    if (canvasRef.current?.dataset) {
      canvasRef.current.dataset.occupancyGlow = plan.fidelity;
    }
  }, [
    showLattice,
    showOccupancyGlow,
    simulationData,
    loadingRatio,
    latticeSize,
    hostAtomRadiusVisUnits,
    latticeSceneEpoch,
  ]);

  // Tier-2 schematic electron-density shells (soft additive) + mild bond lift.
  // Layers OFF by default — paper-safe overlay only; never QM/DFT orbitals.
  useEffect(() => {
    const lattice = latticeGroupRef.current;
    if (!lattice) return undefined;

    const disposeShells = () => {
      const prev = lattice.getObjectByName('SchematicShellHosts');
      if (prev) {
        lattice.remove(prev);
        prev.geometry?.dispose?.();
        prev.material?.dispose?.();
      }
    };

    const bonds = lattice.getObjectByName('LatticeBonds');
    const restoreBonds = () => {
      if (!bonds?.material) return;
      const base = bonds.userData?.schematicBondBase;
      if (!base) return;
      bonds.material.opacity = base.opacity;
      bonds.material.color?.setHex?.(base.colorHex);
    };

    disposeShells();

    if (!showLattice || !showSchematicShells) {
      restoreBonds();
      setSchematicShellMeta(null);
      if (canvasRef.current?.dataset) {
        delete canvasRef.current.dataset.schematicShells;
      }
      return disposeShells;
    }

    const hostAtoms = lattice.getObjectByName('LatticeHostAtoms');
    const restSites = hostAtoms?.userData?.restSites;
    if (!restSites?.length) {
      setSchematicShellMeta(null);
      return disposeShells;
    }

    const spec = resolveSchematicShellSpec({
      loadingRatio,
      hostMaterial,
    });
    setSchematicShellMeta(spec);

    const shellRadius = Math.max(
      0.14,
      hostAtomRadiusVisUnits * spec.radiusScale,
    );
    const geom = new THREE.SphereGeometry(shellRadius, 16, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: spec.opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.InstancedMesh(geom, mat, restSites.length);
    mesh.name = 'SchematicShellHosts';
    mesh.frustumCulled = false;
    const scratch = new THREE.Object3D();
    const scratchColor = new THREE.Color();
    if (!mesh.instanceColor) {
      mesh.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(restSites.length * 3),
        3,
      );
    }
    // Per-site brightness via instanceColor (MeshBasic + Additive; shared mat.opacity).
    // Keep additive strength modest so shells stay translucent over hosts.
    const base = new THREE.Color(spec.colorHex);
    restSites.forEach((site, index) => {
      scratch.position.set(site.x, site.y, site.z);
      const lift = schematicShellSiteOpacity(1, Boolean(site.occupied));
      scratch.scale.setScalar(0.78 + lift * 0.22);
      scratch.updateMatrix();
      mesh.setMatrixAt(index, scratch.matrix);
      scratchColor.copy(base).multiplyScalar(0.14 + lift * 0.22);
      mesh.setColorAt(index, scratchColor);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.userData = {
      fidelity: spec.fidelity,
      claimTier: spec.claimTier,
      label: spec.label,
      loadingRatio,
    };
    lattice.add(mesh);

    // Option C light: thicken bond readability while shells are visible.
    if (bonds?.material) {
      if (!bonds.userData.schematicBondBase) {
        bonds.userData.schematicBondBase = {
          opacity: bonds.material.opacity,
          colorHex: bonds.material.color?.getHex?.() ?? 0x667788,
        };
      }
      bonds.material.opacity = Math.min(
        0.75,
        (bonds.userData.schematicBondBase.opacity || 0.35) + 0.22,
      );
      bonds.material.color?.setHex?.(0x88aacc);
    }

    if (canvasRef.current?.dataset) {
      canvasRef.current.dataset.schematicShells = spec.fidelity;
    }

    return () => {
      disposeShells();
      restoreBonds();
    };
  }, [
    showLattice,
    showSchematicShells,
    loadingRatio,
    hostMaterial,
    hostAtomRadiusVisUnits,
    latticeSize,
    latticeSpacingVisUnits,
  ]);

  // Animation update function
  const updateAnimation = useCallback((deltaTime) => {
      try {
    const live = streamLatestRef.current;
    const liveActive = streamStatusRef.current === 'streaming' && live;
    const forceRender = forceRenderRef.current;
    if (forceRender) forceRenderRef.current = false;

    // While paused (and not scrubbing / not live), still tick phonon modes so
    // standing waves remain visible; skip the rest of the physics clock.
    if (!isPlayingRef.current && !forceRender && !liveActive) {
      tickPhononStandingWaves(deltaTime, {
        temperatureK: physicsData.temperature,
        compressionRatio: physicsData.compressionRatio,
        phononFactor: enhancementBreakdown?.phonon ?? 1,
      });
      return;
    }

    const speed = animationSpeedRef.current;
    // Apply UX_TIME_SCALE to slow down the physics for visual observation
    // cycleDuration is now in seconds, adjusted for human perception
    const cycleDuration = (1 / frequency) / UX_TIME_SCALE; // seconds per visual cycle

    // Advance the visual clock only when playing and not live-stream locked.
    if (isPlayingRef.current && !liveActive) {
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
    }

    const normalizedTime = normalizedTimeRef.current;
    setCycleProgress(normalizedTime);

    const baseRadius = initialBubbleRadius;

    // Prefer compact spacetime sample buffer (engine-authored 4D samples).
    // Visual clock → acoustic normalized_time for buffer lookup.
    const buffer = spacetimeBufferRef.current;
    const acousticTime = buffer
      ? visualTimeToTimelineTime(
        normalizedTime,
        simulationData?.enhancement_timeline || buffer.samples,
      )
      : normalizedTime;
    const bufferSample = buffer
      ? sampleSpacetimeBuffer(buffer, acousticTime)
      : null;

    // Fallback: remap acoustic enhancement_timeline onto the visual schedule.
    const visualTimeline = timelineOnVisualClock(simulationData?.enhancement_timeline);
    const apiData = !bufferSample && visualTimeline.length
      ? interpolateFromAPITimeline(visualTimeline, normalizedTime)
      : null;

    // Track whether we're using API / engine samples (only update state if changed)
    const nowUsingAPI = !!(bufferSample || apiData);
    if (nowUsingAPI !== usingAPIDataRef.current) {
      setUsingAPIData(nowUsingAPI);
      usingAPIDataRef.current = nowUsingAPI;
    }

    let radius, phase, compressionRatio, fieldStrength, temperature, pressure, enhancements;
    let sampleSource = 'local_fallback';

    if (bufferSample) {
      sampleSource = bufferSample.source || 'solver';
      radius = typeof bufferSample.radius_um === 'number'
        ? bufferSample.radius_um
        : baseRadius;
      phase = phaseFromCycleFraction(normalizedTime);
      fieldStrength = bufferSample.electric_field_v_m ?? 0;
      temperature = bufferSample.temperature_k ?? 300;
      compressionRatio = baseRadius / Math.max(radius, baseRadius * 0.1);
      pressure = 101325 * Math.pow(compressionRatio, 4.2);
      enhancements = {
        total: bufferSample.enhancement || 1.0,
        screening: 1.0,
        qed: 1.0,
        casimir: 1.0,
        rydberg: 1.0,
        compression: 1.0,
        phonon: 1.0,
        loading: 1.0,
      };
    } else if (apiData) {
      sampleSource = 'interpolated';
      // Use API physics data for R(t) / T / E; phase names follow the visual
      // clock so Expansion → Collapse → Minimum → Rebound match HUD progress.
      radius = baseRadius * apiData.radius_factor;
      phase = phaseFromCycleFraction(normalizedTime);
      fieldStrength = apiData.electric_field_v_m ?? apiData.electric_field;
      temperature = apiData.temperature_k ?? apiData.temperature;
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
      sampleSource = 'local_fallback';
      const localPhysics = calculateBubbleRadius(normalizedTime, baseRadius);
      radius = localPhysics.radius;
      phase = normalizePhaseName(localPhysics.phase);
      compressionRatio = localPhysics.compressionRatio;
      fieldStrength = localPhysics.fieldStrength;
      temperature = localPhysics.temperature;
      pressure = localPhysics.pressure;

      enhancements = calculateEnhancementFactors(compressionRatio, fieldStrength, temperature, pressure);
    }

    // Live WebSocket frames drive R(t)/phase while streaming (otherwise the
    // 3D scene keeps its own RAF clock and Live Stream looks like a no-op).
    if (liveActive) {
      sampleSource = 'solver';
      if (typeof live.normalized_time === 'number' && Number.isFinite(live.normalized_time)) {
        normalizedTimeRef.current = Math.min(1, Math.max(0, live.normalized_time));
      }
      if (typeof live.radius_um === 'number' && Number.isFinite(live.radius_um)) {
        radius = live.radius_um;
      }
      if (live.phase) {
        phase = normalizePhaseName(String(live.phase).toUpperCase());
      }
      if (typeof live.enhancement === 'number' && Number.isFinite(live.enhancement)) {
        enhancements = {
          ...enhancements,
          total: live.enhancement,
        };
      }
      if (typeof live.temperature_k === 'number' && Number.isFinite(live.temperature_k)) {
        temperature = live.temperature_k;
      }
      if (typeof live.electric_field_v_m === 'number' && Number.isFinite(live.electric_field_v_m)) {
        fieldStrength = live.electric_field_v_m;
      }
      if (typeof live.pressure_bar === 'number' && Number.isFinite(live.pressure_bar)) {
        pressure = live.pressure_bar;
      }
      compressionRatio = baseRadius / Math.max(radius, baseRadius * 0.05);
    }

    bubbleRadiusRef.current = radius;

    // Update physics data state (includes sample provenance for claim-tier HUD)
    setPhysicsData({
      compressionRatio,
      fieldStrength,
      temperature,
      pressure,
      radiusUm: radius,
      sampleSource,
    });
    
    // Set enhancement data
    setCurrentEnhancement(enhancements.total);
    setEnhancementBreakdown(enhancements);

    // Cavitation-localized schematic intensities from existing samples (nm presentation)
    const radiusFactor = radius / Math.max(baseRadius, 1e-12);
    const cavitationForces = resolveCavitationForceViz({
      compressionRatio,
      radiusFactor,
      phase,
      electricFieldVPerM: fieldStrength,
      enhancement: enhancements?.total ?? 1,
      phononFactor: enhancements?.phonon ?? 1,
      temperatureK: temperature,
      loadingRatio,
    });
    // Stash on ref so nested blocks can read without reordering large animation body
    cavitationForcesRef.current = cavitationForces;
    
    // Use ref to track phase changes to avoid stale closure
    if (phase !== currentPhaseRef.current) {
      if (phase === 'REBOUND' && currentPhaseRef.current !== 'REBOUND') {
        flowReversalRef.current = { timer: 0.45, isReversed: true };
      }
      currentPhaseRef.current = phase;
      setCurrentPhase(phase);
      onPhaseChange(phase);
    }
    if (flowReversalRef.current.timer > 0) {
      flowReversalRef.current.timer = Math.max(0, flowReversalRef.current.timer - deltaTime);
      if (flowReversalRef.current.timer === 0) {
        flowReversalRef.current.isReversed = false;
      }
    }
    
    // Update bubble and torus-to-jet visualization
    // Note: We check showBubble for the main bubble, but torus/jet visibility is controlled by phase
    if (bubbleGroupRef.current) {
      const bubble = bubbleGroupRef.current.getObjectByName('MainBubble');
      const doubleLayer = bubbleGroupRef.current.getObjectByName('DoubleLayer');
      const doubleLayerWire = bubbleGroupRef.current.getObjectByName('DoubleLayerWire');
      const innerLayer = bubbleGroupRef.current.getObjectByName('InnerLayer');
      
      // Torus-to-jet: Diadon window TORUS_SCRUB_START→END (90.7–95.7%) + jet light after
      const torus = bubbleGroupRef.current.getObjectByName('TorusFormation');
      const filament = bubbleGroupRef.current.getObjectByName('TorusPlasmaFilament');
      const jet = bubbleGroupRef.current.getObjectByName('FocusedJet');
      const plasmaCloudApi = bubbleGroupRef.current.userData?.torusPlasmaCloud;
      const plasmaCloud = plasmaCloudApi?.points
        || bubbleGroupRef.current.getObjectByName('TorusPlasmaCloud');
      const shedDebrisApi = bubbleGroupRef.current.userData?.shedPlasmaDebris;
      const shedDebrisGroup = shedDebrisApi?.group
        || bubbleGroupRef.current.getObjectByName('ShedPlasmaDebris');

      // Phase progress for nucleation storytelling + scene-safe display scale.
      // Prefer timeline segment progress when API data is driving the mesh.
      const clockForPhase = liveActive ? normalizedTimeRef.current : normalizedTime;
      const phaseProgress = phaseProgressInCycle(clockForPhase);
      // Explicit scrub-window progress (matches PHASE_SCHEDULE COLLAPSE after 90.7/95.7 align)
      const scrubTorus = torusWindowProgress(clockForPhase);
      const inTorusWindow = scrubTorus > 0;
      const maserTighten = maserCollapseProgress({
        cycleFraction: clockForPhase,
        phase,
        phaseProgress,
      });
      const shedProg = shedDebrisProgress({
        cycleFraction: clockForPhase,
        phase,
        phaseProgress,
      });
      // While live-streaming, map R/R0 directly so the mesh visibly tracks the
      // WS frames (phase-envelope blending can hide collapse against a stale RAF clock).
      const displayScale = liveActive
        ? clampBubbleRadiusFactor(radiusFactor)
        : getBubbleDisplayScale({
          radiusFactor,
          phase,
          phaseProgress,
        });

      // Nest bubble on lattice BEFORE shed update so parentWorldY is current.
      // Lattice is below (LATTICE_Y_OFFSET=-5); away-from-lattice = +world Y.
      const nestWorldY = getBubbleYFromPhase(phase, phaseProgress, displayScale);
      bubbleGroupRef.current.position.y = nestWorldY;
      const shedUpdateOpts = { primarySpin: 1, parentWorldY: nestWorldY };
      // Schematic fluid look: advective UV scroll on torus / jet / shed maps
      if (showBubble && (inTorusWindow || phase === 'MINIMUM' || phase === 'REBOUND'
        || phase === 'COLLAPSE')) {
        advancePlasmaFluidLook(bubbleGroupRef.current, deltaTime);
      }

      // Determine which geometry to show based on phase
      // Main bubble visibility is controlled by showBubble toggle
      if (phase === 'EXPANSION') {
        // Show sphere
        if (bubble && showBubble) {
          bubble.visible = true;
          bubble.scale.setScalar(displayScale);
          // Ghost interior only — never opaque enough to hide the double-layer.
          const baseOpacity = bubble.userData.baseOpacity ?? 0.1;
          bubble.material.opacity = baseOpacity;
        } else if (bubble) {
          bubble.visible = false;
        }
        if (torus) torus.visible = false;
        if (filament) filament.visible = false;
        if (plasmaCloud) plasmaCloud.visible = false;
        if (jet) jet.visible = false;
        if (shedDebrisApi) shedDebrisApi.update(deltaTime, 0, shedUpdateOpts);
        else if (shedDebrisGroup) shedDebrisGroup.visible = false;
      } else if (phase === 'COLLAPSE' || inTorusWindow) {
        // Turbulent rotating gaseous plasma torus — full 90.7–95.7% scrub dwell
        const collapseProgress = inTorusWindow ? scrubTorus : phaseProgress;
        // Soft morph envelope across the whole window (not a brief flash)
        const torusProgress = Math.min(1, 0.12 + collapseProgress * 0.88);
        // Late window: ring tightens onto maser-like jet axis
        const tighten = maserTighten;
        
        if (bubble && showBubble) {
          bubble.visible = torusProgress < 0.55;
          bubble.scale.setScalar(displayScale * (1 - torusProgress * 0.72));
          const baseOpacity = bubble.userData.baseOpacity ?? 0.1;
          bubble.material.opacity = baseOpacity * (1 - torusProgress);
        } else if (bubble) {
          bubble.visible = false;
        }
        
        if (torus) {
          // Bound to Double-layer bubble layer toggle (dies when Layers → Bubble off)
          torus.visible = showBubble && torusProgress > 0.02 && tighten < 0.98;
          // Collapse onto jet: major radius shrinks hard as maser tighten rises
          const torusRadius = torus.userData.baseRadius
            * (1 - collapseProgress * 0.35)
            * (1 - tighten * 0.78);
          const tubeRadius = torus.userData.baseTubeRadius
            * (0.85 - collapseProgress * 0.25)
            * (1 - tighten * 0.45);
          const scaleFactor = Math.max(0.08, torusRadius / torus.userData.baseRadius);
          torus.scale.setScalar(scaleFactor);
          torus.scale.y = Math.max(0.12, tubeRadius / torus.userData.baseTubeRadius);
          // Turbulent spin about torus axis (gaseous plasma, not glass)
          torus.rotation.z += deltaTime * (2.8 + collapseProgress * 4.2 + tighten * 3.5);
          torus.userData.spinSign = 1;
          // Mesh is a faint guide; soft Points cloud carries the gaseous plasma read
          torus.material.opacity = (0.12 + collapseProgress * 0.16) * (1 - tighten * 0.55);
          if (torus.material.emissiveIntensity !== undefined) {
            torus.material.emissiveIntensity = 0.45 + collapseProgress * 0.35 + tighten * 0.4;
          }
        }
        if (filament) {
          filament.visible = showBubble && torusProgress > 0.05 && tighten < 0.95;
          const fScale = (torus?.scale.x ?? 1) * (1.02 + 0.04 * Math.sin(clockForPhase * Math.PI * 40));
          filament.scale.setScalar(fScale);
          filament.scale.y = (torus?.scale.y ?? 1) * 0.55;
          filament.rotation.z -= deltaTime * (3.6 + collapseProgress * 5.0 + tighten * 4.0);
          filament.material.opacity = (0.22 + collapseProgress * 0.28) * (1 - tighten * 0.6);
        }
        if (plasmaCloudApi) {
          plasmaCloud.visible = showBubble && tighten < 0.97;
          const cloudStr = (0.45 + collapseProgress * 0.55) * (1 - tighten * 0.7);
          plasmaCloudApi.update(deltaTime, cloudStr);
          if (plasmaCloud.scale && torus) {
            plasmaCloud.scale.copy(torus.scale);
          }
          plasmaCloud.rotation.x = Math.PI / 2;
          plasmaCloud.rotation.z += deltaTime * (1.6 + collapseProgress * 2.4);
        } else if (plasmaCloud) {
          plasmaCloud.visible = showBubble;
        }
        // Late window: transparent light jet ("maser-like" optical peer)
        const jetGate = jetLightEnvelope({
          cycleFraction: clockForPhase,
          phase,
          phaseProgress,
        });
        if (jet) {
          jet.visible = showBubble && jetGate > 0.05;
          if (jet.visible) {
            const jetRadius = jet.userData.baseRadius * (1.1 - jetGate * 0.35);
            const jetHeight = jet.userData.baseHeight * (0.6 + jetGate * 2.4);
            jet.scale.set(
              jetRadius / jet.userData.baseRadius,
              jetHeight / jet.userData.baseHeight,
              jetRadius / jet.userData.baseRadius,
            );
            jet.material.opacity = 0.14 + jetGate * 0.36;
            if (jet.material.emissiveIntensity !== undefined) {
              jet.material.emissiveIntensity = 1.0 + jetGate * 0.95;
            }
            jet.position.set(0, -jetHeight * 0.15, 0);
          }
        }
        if (shedDebrisApi) {
          shedDebrisApi.update(deltaTime, showBubble ? shedProg : 0, shedUpdateOpts);
        }
      } else if (phase === 'MINIMUM' || phase === 'REBOUND') {
        // Maser-like jet into lattice; primary ring collapses then sheds counter-rotating debris
        const jetProgress = jetLightEnvelope({
          cycleFraction: clockForPhase,
          phase,
          phaseProgress,
        });
        
        if (bubble) bubble.visible = false;
        // Primary maser-collapse is separate from shed: hide primary as soon as
        // debris starts so the ring shrink is never read as shed falling.
        const primaryStillCollapsing = phase === 'MINIMUM'
          && maserTighten > 0.2
          && shedProg < 0.08;
        if (torus) {
          torus.visible = showBubble && primaryStillCollapsing;
          if (torus.visible) {
            const scaleFactor = Math.max(0.06, 0.35 * (1 - maserTighten * 0.85));
            torus.scale.setScalar(scaleFactor);
            torus.scale.y = Math.max(0.1, scaleFactor * 0.55);
            torus.material.opacity = 0.28 * (1 - jetProgress);
            torus.rotation.z += deltaTime * (1.2 + maserTighten * 2.5);
            torus.userData.spinSign = 1;
          }
        }
        if (filament) {
          filament.visible = showBubble && primaryStillCollapsing && jetProgress < 0.35;
          if (filament.visible) {
            filament.material.opacity = 0.22 * (1 - jetProgress);
            filament.rotation.z -= deltaTime * 1.5;
          }
        }
        if (plasmaCloudApi) {
          const cloudStr = primaryStillCollapsing
            ? Math.max(0, 0.45 * (1 - jetProgress))
            : 0;
          plasmaCloud.visible = showBubble && cloudStr > 0.05;
          if (plasmaCloud.visible) {
            plasmaCloudApi.update(deltaTime, cloudStr);
            if (torus?.visible && plasmaCloud.scale) plasmaCloud.scale.copy(torus.scale);
          }
        } else if (plasmaCloud) {
          plasmaCloud.visible = false;
        }
        
        if (jet) {
          jet.visible = showBubble && jetProgress > 0.05;
          const jetRadius = jet.userData.baseRadius * (1 - jetProgress * 0.35);
          const jetHeight = jet.userData.baseHeight * (0.8 + jetProgress * 2.2);
          jet.scale.set(
            jetRadius / jet.userData.baseRadius,
            jetHeight / jet.userData.baseHeight,
            jetRadius / jet.userData.baseRadius,
          );
          // Transparent light — lattice stays readable through the cone
          jet.material.opacity = 0.14 + jetProgress * 0.3;
          if (jet.material.emissiveIntensity !== undefined) {
            jet.material.emissiveIntensity = 1.05 + jetProgress * 0.7;
          }
          jet.position.set(0, -jetHeight * 0.18, 0);
        }
        // Counter-rotating shed: world +Y rise + opacity fade (parentWorldY compensated)
        if (shedDebrisApi) {
          shedDebrisApi.update(deltaTime, showBubble ? shedProg : 0, shedUpdateOpts);
        } else if (shedDebrisGroup) {
          shedDebrisGroup.visible = showBubble && shedProg > 0.02;
        }
      } else {
        if (torus) torus.visible = false;
        if (filament) filament.visible = false;
        if (plasmaCloud) plasmaCloud.visible = false;
        if (jet) jet.visible = false;
        if (shedDebrisApi) shedDebrisApi.update(deltaTime, 0, shedUpdateOpts);
        else if (shedDebrisGroup) shedDebrisGroup.visible = false;
      }
      
      // Ionic double-layer: buildup during expansion → intensified at collapse/cavitation.
      // Paper-safe hydro pinch cue (aspherical collapse peer) — NOT Benjamin–Feir claim,
      // NOT H-absorption/nuclear, NOT EQ-OPEN closure. Dies with Double-layer off.
      const pinchAmt = (() => {
        if (phase === 'COLLAPSE') return 0.1 + phaseProgress * 0.55;
        if (phase === 'MINIMUM') return 0.72;
        if (phase === 'REBOUND') return Math.max(0, 0.45 * (1 - phaseProgress));
        return 0;
      })();
      // Mild azimuthal surface modulation (schematic morphology only).
      const surfMod = pinchAmt > 0
        ? 1 + 0.04 * Math.sin(normalizedTime * Math.PI * 8) * pinchAmt
        : 1;
      if (doubleLayer) {
        const s = displayScale * 1.12;
        // Radial pinch + slight axial stretch — ionic sheath morphology, hydro schematic
        doubleLayer.scale.set(
          s * (1 - pinchAmt * 0.28) * surfMod,
          s * (1 + pinchAmt * 0.18),
          s * (1 - pinchAmt * 0.28) / surfMod,
        );
        const base = doubleLayer.userData.baseOpacity ?? 0.32;
        let intensity = base + 0.08; // ion/electron sheath readable in expansion
        if (phase === 'COLLAPSE') intensity = base + 0.28;
        if (phase === 'MINIMUM') intensity = base + 0.35;
        if (phase === 'REBOUND') intensity = base + 0.12;
        doubleLayer.material.opacity = intensity;
        if (doubleLayer.material.emissiveIntensity !== undefined) {
          doubleLayer.material.emissiveIntensity = 0.35 + pinchAmt * 0.55;
        }
        doubleLayer.visible = showBubble;
      }
      if (doubleLayerWire) {
        const sw = displayScale * 1.13;
        doubleLayerWire.scale.set(
          sw * (1 - pinchAmt * 0.28) * surfMod,
          sw * (1 + pinchAmt * 0.18),
          sw * (1 - pinchAmt * 0.28) / surfMod,
        );
        // Keep wire faint — membrane carries the bubble (BDS-504)
        doubleLayerWire.material.opacity =
          phase === 'COLLAPSE' || phase === 'MINIMUM'
            ? DOUBLE_LAYER_WIRE_OPACITY_COLLAPSE
            : DOUBLE_LAYER_WIRE_OPACITY_EXPANSION;
        doubleLayerWire.visible = showBubble && phase !== 'MINIMUM';
      }
      if (innerLayer) {
        const si = displayScale * 0.92;
        innerLayer.scale.set(
          si * (1 - pinchAmt * 0.22),
          si * (1 + pinchAmt * 0.12),
          si * (1 - pinchAmt * 0.22),
        );
        const base = innerLayer.userData.baseOpacity ?? 0.34;
        innerLayer.material.opacity = phase === 'COLLAPSE' || phase === 'MINIMUM' ? base + 0.12 : base;
        innerLayer.visible = showBubble;
      }

      // Schematic sheath surface flow (ionic DL / MHD peer motif) — not measured bubble spin
      const sheathFlow = bubbleGroupRef.current.getObjectByName('SheathSurfaceFlow');
      if (sheathFlow) {
        updateSheathSurfaceFlow(sheathFlow, {
          displayScale,
          delta: deltaTime,
          visible: showBubble && showSheathSurfaceFlow,
          pinchAmt,
        });
      }

      // Electrolyte / ionized-env halo — EMP chem-env tint from family + multiplier
      const electrolyteHalo = bubbleGroupRef.current.getObjectByName('ElectrolyteIonizedHalo');
      if (electrolyteHalo) {
        const diag = simulationData?.electrolyte_diagnostics || {};
        const peak = simulationData?.peak_conditions || {};
        const frameBreakdown = streamLatest?.enhancement_breakdown
          || simulationData?.enhancement_breakdown
          || {};
        const mult = Number(
          diag.activity_multiplier
          ?? peak.electrolyte_multiplier
          ?? frameBreakdown.electrolyte
          ?? 1,
        );
        const haloParams = resolveElectrolyteIonizedHaloParams({
          electrolyteFamily: parameters?.electrolyteFamily
            || diag.electrolyte_family
            || 'li',
          electrolyteSpecies: parameters?.electrolyteSpecies
            || diag.electrolyte_species
            || null,
          electrolyteMolarityMolL: parameters?.electrolyteMolarityMolL
            ?? diag.electrolyte_molarity_mol_l
            ?? 0.3,
          electrolyteMultiplier: Number.isFinite(mult) ? mult : 1,
        });
        updateElectrolyteIonizedHalo(electrolyteHalo, haloParams);
        // Keep sheath slightly outside the current membrane display scale
        const hs = displayScale * haloParams.scale;
        electrolyteHalo.scale.set(hs, hs, hs);
        electrolyteHalo.visible = showBubble && showElectrolyteHalo;
        if (canvasRef.current?.dataset) {
          canvasRef.current.dataset.electrolyteFamily = haloParams.family;
          canvasRef.current.dataset.electrolyteHaloIntensity = haloParams.intensity.toFixed(3);
        }
      }
      
      // Update pressure rings — Mach cue from collapse_results.peak_mach when present
      const machCh = collapseHudRef.current?.channels?.find(
        (ch) => ch.channel_id === 'collapse.peak_mach',
      );
      const machCue = machCompressibilityCue({
        peakMach: typeof machCh?.value === 'number' ? machCh.value : null,
        compressibilityRegime: collapseHudRef.current?.meta?.compressibility_regime,
      });
      for (let i = 0; i < 3; i++) {
        const ring = bubbleGroupRef.current.getObjectByName(`PressureRing${i}`);
        if (ring) {
          const ringPhase = (normalizedTime + ring.userData.phase) % 1;
          ring.scale.setScalar(displayScale * (1 + ringPhase * 0.6) * (1 + machCue.ringBoost * 0.15));
          ring.material.opacity = Math.max(
            0,
            (0.2 - ringPhase * 0.2) * (1 + machCue.ringBoost * 1.4),
          );
          if (machCue.ringBoost > 0.05) {
            ring.material.color.setHSL(0.55 - machCue.ringBoost * 0.25, 0.75, 0.55);
          }
          if (!showBubble) ring.visible = false;
        }
      }

      // R(t) trail — rolling displayScale samples (prefer engine radius when bound)
      const hist = radiusHistoryRef.current;
      hist.push(displayScale);
      if (hist.length > 48) hist.shift();
      const trail = bubbleGroupRef.current.getObjectByName('RadiusHistoryTrail');
      if (trail?.geometry?.attributes?.position) {
        const arr = trail.geometry.attributes.position.array;
        const n = hist.length;
        for (let i = 0; i < 48; i++) {
          const r = hist[Math.min(i, n - 1)] || displayScale;
          const a = (i / 48) * Math.PI * 2;
          arr[i * 3] = Math.cos(a) * r * 1.05;
          arr[i * 3 + 1] = 0;
          arr[i * 3 + 2] = Math.sin(a) * r * 1.05;
        }
        trail.geometry.attributes.position.needsUpdate = true;
        trail.geometry.setDrawRange(0, Math.max(2, n));
        trail.visible = showBubble;
        trail.material.opacity = sampleSource === 'solver'
          || sampleSource === 'interpolated'
          ? 0.38
          : 0.18;
      }

      // Collapse ODE ribbon playhead follows scrub / cycle fraction (scene-rooted)
      const ribbonGroup = sceneRef.current?.getObjectByName('CollapseRibbonGroup');
      const ribbon = ribbonGroup?.getObjectByName('CollapseTrajectoryRibbon');
      const playhead = ribbonGroup?.getObjectByName('CollapseRibbonPlayhead');
      if (ribbon && playhead) {
        const count = ribbon.userData?.sampleCount || 0;
        const arr = ribbon.userData?.positions;
        const idx = collapseRibbonPlayheadIndex(count, normalizedTime);
        if (arr && count > 0 && arr.length >= (idx + 1) * 3) {
          playhead.position.set(arr[idx * 3], arr[idx * 3 + 1], arr[idx * 3 + 2]);
          playhead.visible = showCollapseRibbon && showBubble;
        }
        ribbonGroup.visible = showCollapseRibbon && showBubble;
      }
      
      // Nest Y already applied before shed update (world +Y away from lattice).

      // Temperature tint from engine/API samples (temperature_k / collapse path).
      // local_fallback chip already covers schematic RAF when samples absent.
      // Membranes only — torus/jet spectrum applied next (species SOT).
      const tint = applyBubbleTemperatureTint(
        bubbleGroupRef.current,
        physicsData.temperature ?? temperature,
      );
      const spectrum = plasmaSpectrumRef.current;
      if (spectrum) applyPlasmaSpectrumTint(bubbleGroupRef.current, spectrum);
      const bubbleKey = bubbleGroupRef.current.getObjectByName('BubbleKeyLight');
      if (bubbleKey && tint) {
        bubbleKey.intensity = 0.55 + tint.heatNorm * 1.4;
        // Prefer spectrum primary during torus/jet window so key light matches plasma tint
        if (spectrum && (phase === 'COLLAPSE' || phase === 'MINIMUM' || phase === 'REBOUND')) {
          bubbleKey.color.setHex(spectrum.primaryHex);
          bubbleKey.intensity = 0.7 + tint.heatNorm * 1.2;
        } else {
          bubbleKey.color.copy(tint.color);
        }
      }
      const warmFill = bubbleGroupRef.current.getObjectByName('BubbleWarmFill');
      if (warmFill && tint) {
        warmFill.intensity = 0.25 + tint.heatNorm * 1.1;
        if (spectrum && (phase === 'COLLAPSE' || phase === 'MINIMUM')) {
          warmFill.color.setHex(spectrum.emissiveHex);
        } else {
          warmFill.color.copy(tint.emissive);
        }
      }
    }

    // Phonon standing waves (also ticks while paused — see tickPhononStandingWaves)
    if (showLattice && showPhonon) {
      tickPhononStandingWaves(deltaTime, {
        temperatureK: temperature,
        compressionRatio,
        phononFactor: enhancements?.phonon ?? 1,
      });
    } else if (showLattice && !showPhonon && latticeGroupRef.current) {
      // Rest lattices when Phonon layer off (no residual standing-wave pose)
      const waveguideRibbon = latticeGroupRef.current.getObjectByName('PhononWaveguideRibbon');
      if (waveguideRibbon) waveguideRibbon.visible = false;
      const hostAtoms = latticeGroupRef.current.getObjectByName('LatticeHostAtoms');
      const restSites = hostAtoms?.userData?.restSites;
      if (hostAtoms && restSites?.length) {
        const scratchColor = new THREE.Color();
        applyDynamicLatticeInstances({
          sites: restSites,
          displacements: null,
          hostHex: hostAtoms.userData?.hostHex ?? 0x8b8b8b,
          colorMode: latticeColorModeRef.current,
          temperatureK: temperature,
          modeEnergies: null,
          opticalWeight: phononModeMix({ phononFactor: enhancements?.phonon ?? 1 }).opticalWeight,
          setMatrixAt: (index, elements) => {
            const m = new THREE.Matrix4();
            m.fromArray(elements);
            hostAtoms.setMatrixAt(index, m);
          },
          setColorAt: hostAtoms.instanceColor
            ? (index, rgb) => {
              scratchColor.setRGB(rgb.r, rgb.g, rgb.b);
              hostAtoms.setColorAt(index, scratchColor);
            }
            : undefined,
        });
        hostAtoms.instanceMatrix.needsUpdate = true;
        if (hostAtoms.instanceColor) hostAtoms.instanceColor.needsUpdate = true;
        const bonds = latticeGroupRef.current.getObjectByName('LatticeBonds');
        const pairs = bonds?.userData?.bondPairs;
        const bondPos = bonds?.geometry?.attributes?.position;
        if (pairs?.length && bondPos?.array) {
          const arr = bondPos.array;
          for (let b = 0; b < pairs.length; b += 1) {
            const [ia, ib] = pairs[b];
            const sa = restSites[ia];
            const sb = restSites[ib];
            const base = b * 6;
            arr[base] = sa.x;
            arr[base + 1] = sa.y;
            arr[base + 2] = sa.z;
            arr[base + 3] = sb.x;
            arr[base + 4] = sb.y;
            arr[base + 5] = sb.z;
          }
          bondPos.needsUpdate = true;
        }
      }
    }
    
    // Update H2/D2 particles with MHD fluid dynamics (v0.2.3)
    // Physics: Ionized hydrogen/deuterium swirling around bubble following MHD flow
    if (showProtons) {
      updateProtonStates(phase, normalizedTime, enhancements.total, physicsData.fieldStrength, physicsData.temperature);
      
      // Cavitation point: nucleation site on the lattice surface
      const latticeY = PHYSICS_CONFIG.LATTICE_Y_OFFSET + PHYSICS_CONFIG.LATTICE_SURFACE_OFFSET;
      const bubbleY = bubbleGroupRef.current?.position.y ?? latticeY;
      const bubbleScale = getBubbleScaleFromPhase(phase, phaseProgressInCycle(normalizedTime));
      
      const cavitationPoint = {
        x: 0,
        y: latticeY,
        z: 0
      };
      const latticeSurfaceY = latticeY;
      const vortexSites = buildVortexSites(
        cavitationPoint.x,
        latticeSurfaceY,
        cavitationPoint.z,
        latticeSpacingVisUnits
      );
      const reboundBlend = flowReversalRef.current.isReversed
        ? Math.min(1, flowReversalRef.current.timer / 0.45)
        : 0;
      
      protonGroupRef.current?.children.forEach((proton, _index) => {
        // MHD properties
        const _mhdAngle = proton.userData.mhdAngle || 0;
        const mhdRadius = proton.userData.mhdRadius || 1.0;
        const mhdAngularVelocity = proton.userData.mhdAngularVelocity || 0.5;
        const mhdPhase = proton.userData.mhdPhase || 0;
        
        // Direction and distance to cavitation point
        const dx = cavitationPoint.x - proton.position.x;
        const dy = cavitationPoint.y - proton.position.y;
        const dz = cavitationPoint.z - proton.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.001;
        const horizontalDist = Math.sqrt(dx * dx + dz * dz) + 0.001;

        if (proton.userData.absorbed) {
          proton.userData.absorbTimer = (proton.userData.absorbTimer || 0) + deltaTime;
          proton.position.y = Math.max(latticeSurfaceY - 0.08, proton.position.y - 0.02);
          proton.scale.setScalar(Math.max(0.2, 1 - proton.userData.absorbTimer * 2.8));
          if (proton.material) {
            proton.material.color.setHex(0xffcc66);
            proton.material.emissive.setHex(0x664400);
            proton.material.emissiveIntensity = 0.7;
          }

          if (proton.userData.absorbTimer > 0.9) {
            proton.userData.absorbed = false;
            proton.userData.absorbTimer = 0;
            proton.userData.acceptedSite = -1;
            proton.userData.mhdRadius = 0.9 + Math.random() * 0.8;
            proton.position.set(
              cavitationPoint.x + (Math.random() - 0.5) * 0.8,
              latticeSurfaceY + 0.45 + Math.random() * 0.35,
              cavitationPoint.z + (Math.random() - 0.5) * 0.8
            );
            proton.scale.setScalar(1);
          }
          return;
        }
        
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
          
          // Apply circular motion CENTERED ON CAVITATION POINT
          const theta = proton.userData.mhdAngle;
          const currentRadius = horizontalDist * 0.95; // Slowly contract radius
          proton.position.x = cavitationPoint.x + currentRadius * Math.cos(theta);
          proton.position.z = cavitationPoint.z + currentRadius * Math.sin(theta);
          
          // Store vorticity for visualization
          proton.userData.vorticity = rotationSpeed * 5;

          // Proton acceptance at vortex intake points near the lattice surface.
          const nearestSite = vortexSites.reduce((best, site, siteIndex) => {
            const siteDistance = proton.position.distanceTo(site);
            if (siteDistance < best.distance) {
              return { distance: siteDistance, index: siteIndex };
            }
            return best;
          }, { distance: Number.POSITIVE_INFINITY, index: -1 });

          if (nearestSite.distance < PHYSICS_CONFIG.VORTEX_ACCEPT_RADIUS) {
            proton.userData.absorbed = true;
            proton.userData.absorbTimer = 0;
            proton.userData.acceptedSite = nearestSite.index;
          }
          
        } else if (phase === 'REBOUND') {
          // REBOUND: Particles perturbed outward but confined by lattice potential.
          // Physics: Reaction energy transfers to lattice phonons; boundary layer H/D stay confined.
          const maxScatterDist = latticeSpacingVisUnits * 1.2;
          if (distance < maxScatterDist) {
            const scatterForce = 0.008 + reboundBlend * 0.018;
            proton.position.x -= (dx / distance) * scatterForce;
            proton.position.y -= (dy / distance) * scatterForce * 0.3;
            proton.position.z -= (dz / distance) * scatterForce;
          } else {
            const restoreForce = 0.02;
            proton.position.x += (dx / distance) * restoreForce;
            proton.position.y += (dy / distance) * restoreForce * 0.5;
            proton.position.z += (dz / distance) * restoreForce;
          }
          // Reversed azimuthal flow after cavitation/electro-nuclear rebound.
          const reverseDirection = -1;
          proton.userData.mhdAngle = (proton.userData.mhdAngle || 0) + reverseDirection * mhdAngularVelocity * (0.02 + reboundBlend * 0.06);
          const reboundTheta = proton.userData.mhdAngle;
          const reboundRadius = Math.min(
            latticeSpacingVisUnits * 1.6,
            horizontalDist + 0.02 + reboundBlend * 0.04
          );
          proton.position.x = cavitationPoint.x + reboundRadius * Math.cos(reboundTheta);
          proton.position.z = cavitationPoint.z + reboundRadius * Math.sin(reboundTheta);
          proton.userData.vorticity = (proton.userData.vorticity || 0) * (0.75 + reboundBlend * 0.2);
          
        } else {
          // ========================================================================
          // EXPANSION/RECOVERY: Swirling MHD flow around bubble
          // ========================================================================
          // Update MHD angle for continuous rotation
          proton.userData.mhdAngle = (proton.userData.mhdAngle || 0) + mhdAngularVelocity * 0.03;
          const theta = proton.userData.mhdAngle;
          
          // Particles orbit around the bubble at the nucleation site
          const orbitRadius = mhdRadius * (0.7 + bubbleScale * 0.4);
          const targetX = cavitationPoint.x + orbitRadius * Math.cos(theta);
          const targetZ = cavitationPoint.z + orbitRadius * Math.sin(theta);
          
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
        
        // Hard clamp: protons stay within 2 lattice spacings of nucleation site
        const maxDist = latticeSpacingVisUnits * 2;
        const clampDx = proton.position.x - cavitationPoint.x;
        const clampDz = proton.position.z - cavitationPoint.z;
        const clampDist = Math.sqrt(clampDx * clampDx + clampDz * clampDz);
        if (clampDist > maxDist) {
          const scale = maxDist / clampDist;
          proton.position.x = cavitationPoint.x + clampDx * scale;
          proton.position.z = cavitationPoint.z + clampDz * scale;
        }
        if (proton.position.y < latticeSurfaceY) {
          proton.position.y = latticeSurfaceY;
        }
        
        // ========================================================================
        // COLOR CHANGES BASED ON PHASE AND ENERGY
        // ========================================================================
        // Particles change color to represent ionization state and energy level
        if (proton.material) {
          const compressionRatio = physicsData.compressionRatio || 1;
          const energyLevel = Math.min(1, compressionRatio / 50); // Normalize energy 0-1
          
          if (proton.userData.absorbed) {
            proton.material.color.setHex(0xffcc66);
            proton.material.emissive.setHex(0x664400);
            proton.material.emissiveIntensity = 0.75;
          } else if (phase === 'COLLAPSE' || phase === 'MINIMUM') {
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

      // Soft wave companion — dimmed vs MHD so vortex/cavitation stays the hero
      const waveGlow = enhancementGlowFactor(enhancements?.total ?? 1) * (
        (phase === 'COLLAPSE' || phase === 'MINIMUM') ? 0.55 : 0.75
      );
      protonWaveCompanionRef.current?.syncFromMeshes?.(
        protonGroupRef.current.children,
        { glow: waveGlow, hideMeshCores: true },
      );
      if (protonWaveCompanionRef.current?.getGroup) {
        protonWaveCompanionRef.current.getGroup().visible = showProtons;
      }
    } else if (protonWaveCompanionRef.current?.getGroup) {
      protonWaveCompanionRef.current.getGroup().visible = false;
    }
    
    // Update field lines — engine E gates opacity when solver/interpolated samples exist
    if (fieldGroupRef.current && showFieldLines) {
      const fieldIntensity = phase === 'COLLAPSE' || phase === 'MINIMUM' ? 1 : 0.3;
      const eGate = fieldLineOpacityFromE({
        electricFieldVPerM: fieldStrength,
        sampleSource,
      });
      const energySoft = fieldGroupRef.current.getObjectByName('EnergySoftCloud');
      const softPos = energySoft?.geometry?.attributes?.position;
      
      fieldGroupRef.current.children.forEach((child) => {
        if (child.name.startsWith('FieldLine')) {
          child.material.opacity = 0.3 * fieldIntensity * eGate;
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
          }

          const softIndex = child.userData.softIndex;
          if (softPos && Number.isInteger(softIndex)) {
            softPos.array[softIndex * 3] = child.position.x;
            softPos.array[softIndex * 3 + 1] = child.position.y;
            softPos.array[softIndex * 3 + 2] = child.position.z;
          }
        }
      });

      if (softPos) softPos.needsUpdate = true;
      if (energySoft?.material) {
        // Soft field cloud rides expansion lightly; peak with soft-plasma flash near min-R
        const flash = cavitationForcesRef.current?.softPlasmaFlash ?? 0.2;
        energySoft.material.opacity = 0.12 + flash * 0.38;
      }
    }

    // Electron migration — independent of Fields layer (own toggle)
    {
      const latticeYForE = PHYSICS_CONFIG.LATTICE_Y_OFFSET + PHYSICS_CONFIG.LATTICE_SURFACE_OFFSET;
      if (showElectronMig) {
        const fluxBoost = cavitationForcesRef.current?.flux ?? 0.3;
        electronMigrationRef.current?.update?.({
          electricFieldVPerM: fieldStrength * (0.6 + fluxBoost),
          enhancement: (enhancements?.total ?? 1) * (0.7 + fluxBoost),
          reversed: phase === 'REBOUND',
          latticeY: latticeYForE,
        });
      }
      const eMigGroup = electronMigrationRef.current?.getGroup?.();
      if (eMigGroup) eMigGroup.visible = showElectronMig;
    }
    
    // Update effects
    if (effectsGroupRef.current) {
      const nuclearEmissions = effectsGroupRef.current.getObjectByName('NuclearEmissions');
      const reboundNuclear = effectsGroupRef.current.getObjectByName('ReboundNuclearEvent');
      const shockwave = effectsGroupRef.current.getObjectByName('Shockwave');
      
      // Soft plasma = Flannigan–Suslick optical/plasma peer only. Keep legacy
      // "nuclear emissions" / fusion–fission mesh groups OFF — never imply
      // lenr_proved or close EQ-OPEN from this viz.
      if (nuclearEmissions) nuclearEmissions.visible = false;
      if (reboundNuclear) reboundNuclear.visible = false;

      // Hydro shockwave flash on rebound (aspherical collapse peer — not nuclear)
      if (phase === 'REBOUND' && shockwave) {
        const reboundStart = phaseSegment('REBOUND').start;
        const reboundWidth = Math.max(phaseSegment('REBOUND').end - reboundStart, 1e-12);
        const shockProgress = Math.min(1, Math.max(0, (normalizedTime - reboundStart) / reboundWidth));
        shockwave.position.y = PHYSICS_CONFIG.LATTICE_Y_OFFSET;
        shockwave.material.opacity = 0.8 * (1 - shockProgress);
        shockwave.scale.setScalar(1 + shockProgress * 8);
      } else if (shockwave) {
        shockwave.material.opacity = 0;
        if (phase === 'EXPANSION') {
          shockwave.position.set(0, -3, 0);
          shockwave.scale.setScalar(1);
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
    // VPFM-inspired phase mapping:
    // expansion -> outward advection, collapse -> inward acceleration, minimum -> compact core,
    // rebound -> flow reversal burst, recovery -> damped return.
    if (vortexGroupRef.current && showVortices) {
      try {
      const latticeY = PHYSICS_CONFIG.LATTICE_Y_OFFSET + PHYSICS_CONFIG.LATTICE_SURFACE_OFFSET;
      let vortexIntensity = 0.3;
      let flowDirection = 1;
      let rotationSpeed = 1.0;
      let radialOscillationSpeed = 0.8;
      let verticalOscillationSpeed = 0.5;
      let coreHeightOffset = 0.3;
      
      // Narrative: double-layer ion/e⁻ buildup → MHD vortex → cavitation (collapse/min)
      // Scale by schematic vorticity from compression × E × enhancement samples.
      const vort = cavitationForcesRef.current?.vorticity ?? 0.4;
      const kin = cavitationForcesRef.current?.kinetic ?? 0.3;
      switch (phase) {
        case 'EXPANSION':
          vortexIntensity = 0.45 + vort * 0.35;
          flowDirection = -0.45;
          rotationSpeed = 0.95 + vort * 0.35;
          radialOscillationSpeed = 0.65 + vort * 0.25;
          verticalOscillationSpeed = 0.45 + kin * 0.2;
          coreHeightOffset = 0.45;
          break;
        case 'COLLAPSE':
          vortexIntensity = 1.15 + vort * 0.7 + kin * 0.35;
          flowDirection = 2.3 + kin * 0.6;
          rotationSpeed = 2.4 + vort * 0.9;
          radialOscillationSpeed = 1.4 + kin * 0.5;
          verticalOscillationSpeed = 1.0 + kin * 0.35;
          coreHeightOffset = 0.22;
          break;
        case 'MINIMUM':
          vortexIntensity = 1.5 + vort * 0.7 + kin * 0.45;
          flowDirection = 0.65 + kin * 0.2;
          rotationSpeed = 3.1 + vort * 0.8;
          radialOscillationSpeed = 1.9 + kin * 0.5;
          verticalOscillationSpeed = 1.4 + kin * 0.4;
          coreHeightOffset = 0.18;
          break;
        case 'REBOUND':
            vortexIntensity = 1.2 + vort * 0.55;
            flowDirection = -2.2 - kin * 0.5;
            rotationSpeed = 3.0 + vort * 0.6;
            radialOscillationSpeed = 2.1 + kin * 0.4;
            verticalOscillationSpeed = 1.15 + kin * 0.3;
            coreHeightOffset = 0.35;
          break;
        default:
          // Default case for any unexpected phase values
          break;
      }
      
      // Update plasma vortex effect
        if (plasmaVortexRef.current && typeof plasmaVortexRef.current.update === 'function') {
          try {
        plasmaVortexRef.current.vortexStrength = 0.9 * vortexIntensity;
        plasmaVortexRef.current.radialSpeed = radialOscillationSpeed;
        plasmaVortexRef.current.verticalSpeed = verticalOscillationSpeed;
        // Update particle angular velocities to encode phase-specific advection direction.
        for (const particle of plasmaVortexRef.current.particles || []) {
          if (!particle?.userData) continue;
          const baseAngular = 0.45 + vortexIntensity * (1 + ((plasmaVortexRef.current.radius - particle.userData.r) / Math.max(plasmaVortexRef.current.radius, 0.1)));
          particle.userData.angularVelocity = baseAngular * flowDirection;
        }
        // Soft plasma Points: peak near min-R flash. Flannigan–Suslick optical/plasma
        // peer only — not fusion, not EQ-OPEN discharge, not lenr_proved.
        // Tint heatNorm from temperature_k when samples exist.
        if (typeof plasmaVortexRef.current.setEnhancementGlow === 'function') {
          const baseGlow = enhancementGlowFactor(enhancements?.total ?? 1) * 0.35;
          const flash = cavitationForcesRef.current?.softPlasmaFlash ?? 0.15;
          const forceGlow = flash * (0.55 + (cavitationForcesRef.current?.vorticity ?? 0.3) * 0.35
            + (cavitationForcesRef.current?.kinetic ?? 0.2) * 0.25);
          plasmaVortexRef.current.setEnhancementGlow(
            Math.min(1, Math.max(0.08, baseGlow + forceGlow)),
          );
        }
        if (typeof plasmaVortexRef.current.setSoftPlasmaHeat === 'function') {
          const heatTint = temperatureToBubbleTint(temperature);
          plasmaVortexRef.current.setSoftPlasmaHeat(
            (heatTint?.heatNorm ?? 0) * (0.35 + (cavitationForcesRef.current?.softPlasmaFlash ?? 0.15)),
          );
        }
        plasmaVortexRef.current.update(deltaTime * rotationSpeed);
          } catch (err) {
            // Silently fail if plasma vortex update fails
          }
      }
      
      // MHD particle flow is handled by plasmaVortex - no additional elements to animate
      // Rotate the entire MHD flow group based on phase
      if (vortexGroupRef.current) {
        vortexGroupRef.current.position.y = latticeY + coreHeightOffset;
        vortexGroupRef.current.rotation.y += deltaTime * rotationSpeed * 0.1;
        const flowReversalPulse = vortexGroupRef.current.getObjectByName('FlowReversalPulse');
        if (flowReversalPulse?.material) {
          const pulseStrength = flowReversalRef.current.isReversed
            ? Math.min(1, flowReversalRef.current.timer / 0.45)
            : 0;
          flowReversalPulse.material.opacity = pulseStrength * 0.75;
          flowReversalPulse.scale.setScalar(1 + pulseStrength * 4);
        }
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
        // Casimir effect intensifies as bubble compresses (1/d⁴ relationship)
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
            // Overlap regions glow during high enhancement.
            //
            // Enhancement spans many orders of magnitude and the reported value
            // is clamped at 1e5, so a linear ratio against that ceiling pins the
            // glow to its maximum for the whole collapse — exactly where the
            // visual should be conveying change. Drive it from log10 instead.
            const enhancementValue = enhancements.total || 1.0;
            const logFraction = Math.min(1, Math.max(0, Math.log10(Math.max(enhancementValue, 1)) / 5));
            const pulse = Math.sin(Date.now() * 0.005 + child.userData.pulsePhase * Math.PI * 2) * 0.3 + 0.7;
            child.material.opacity = 0.4 + logFraction * 0.4;
            // Only set emissiveIntensity if material supports it (MeshStandardMaterial does)
            if (child.material && typeof child.material.emissiveIntensity !== 'undefined') {
              child.material.emissiveIntensity = 0.3 + logFraction * 0.5;
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
        // Visualization scaling only — paper P_overlap ≈ 8.5×10⁻¹⁶ (not 10⁻³)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    frequency, initialBubbleRadius, simulationData, setUsingAPIData,
    calculateBubbleRadius, calculateEnhancementFactors, updateProtonStates, onPhaseChange, onCollapseEvent,
    showBubble, showSheathSurfaceFlow, showElectrolyteHalo, showProtons, showFieldLines, showVortices, showLattice, showPhonon, showElectronMig,
    showCollapseRibbon,
    showCasimir, showRydberg, showHalo,
    latticeSpacingVisUnits, hostMeltMeta, loadingRatio, tickPhononStandingWaves,
    physicsData.temperature, physicsData.compressionRatio, enhancementBreakdown,
  ]); // Note: currentPhase / isPlaying removed - using refs to avoid scene re-initialization

  // Store updateAnimation in ref to avoid triggering scene re-initialization
  useEffect(() => {
    updateAnimationRef.current = updateAnimation;
  }, [updateAnimation]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Ensure WebGL unpack flags are valid for texImage3D during renderer init.
    const webgl2Proto = typeof window !== 'undefined' ? window.WebGL2RenderingContext?.prototype : null;
    const originalTexImage3D = webgl2Proto?.texImage3D;
    if (webgl2Proto && typeof originalTexImage3D === 'function') {
      webgl2Proto.texImage3D = function patchedTexImage3D(...args) {
        this.pixelStorei(this.UNPACK_FLIP_Y_WEBGL, false);
        this.pixelStorei(this.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        return originalTexImage3D.apply(this, args);
      };
    }
    
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    sceneRef.current = scene;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xdde8ff, 0.35);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x88aacc, 0x2a1810, 0.4);
    hemiLight.name = 'VizHemisphereLight';
    scene.add(hemiLight);
    
    const directionalLight = new THREE.DirectionalLight(0xfff5e8, 0.95);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);
    
    const pointLight = new THREE.PointLight(0x00ffff, 0.5, 20);
    pointLight.position.set(0, 2, 0);
    scene.add(pointLight);
    
    // Camera — mobile preset for narrow aspect (#409 M2)
    const camPreset = isMobile ? CAMERA_PRESET.mobile : CAMERA_PRESET.desktop;
    const containerWidth = Math.max(containerRef.current.clientWidth, 1);
    const containerHeight = Math.max(containerRef.current.clientHeight, 1);
    const aspect = containerWidth / containerHeight;
    const camera = new THREE.PerspectiveCamera(camPreset.fov, aspect, 0.1, 1000);
    camera.position.set(...camPreset.position);
    camera.lookAt(...camPreset.target);
    cameraRef.current = camera;
    
    // Renderer (v0.2.2-beta: mobile-optimized settings)
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: qualitySettings.antialias,
      powerPreference: isMobile ? 'low-power' : 'high-performance'
    });
    if (webgl2Proto && originalTexImage3D) {
      webgl2Proto.texImage3D = originalTexImage3D;
    }
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(qualitySettings.pixelRatio);
    
    // Disable shadows on mobile for better performance
    renderer.shadowMap.enabled = qualitySettings.shadowsEnabled;
    rendererRef.current = renderer;

    // Controls — touch gestures owned by TouchControls on mobile (#409 M2)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(...camPreset.target);
    if (isMobile) {
      controls.enableRotate = false;
      controls.enableZoom = false;
      controls.enablePan = false;
    }
    controlsRef.current = controls;
    
    // Create scene elements
    createLattice(scene);
    setLatticeSceneEpoch((n) => n + 1);
    createLiquidPhaseOverlay(scene);
    createBubble(scene);
    createProtons(scene);
    createFieldVisualization(scene);
    createEffects(scene);
    createVortexFlow(scene);
    createCasimirField(scene);
    if (!qualitySettings.skipOptionalQuantumLayers) {
      createRydbergOrbitals(scene);
      createHaloElectrons(scene);
    }
    createScaleBar(scene);

    // Host-material switches remount this effect without changing layer toggle
    // state, so the visibility useEffect does not re-run. Three defaults groups
    // to visible=true — reseed from current toggles (#408 purple Rydberg ghost).
    applyGroupVisibility(latticeGroupRef.current, showLattice);
    applyGroupVisibility(bubbleGroupRef.current, showBubble);
    applyGroupVisibility(protonGroupRef.current, showProtons);
    applyGroupVisibility(fieldGroupRef.current, showFieldLines);
    applyGroupVisibility(vortexGroupRef.current, showVortices);
    applyGroupVisibility(
      electronMigrationRef.current?.getGroup?.(),
      showElectronMig,
    );
    applyGroupVisibility(
      protonWaveCompanionRef.current?.getGroup?.(),
      showProtons,
    );
    applyGroupVisibility(
      boundaryVisualGroupRef.current,
      showLattice && showBoundaryPlane
    );
    applyGroupVisibility(casimirFieldRef.current, showCasimir);
    applyGroupVisibility(rydbergOrbitalsRef.current, showRydberg);
    applyGroupVisibility(haloElectronsRef.current, showHalo);

    // Animation loop - uses ref to avoid re-initialization when animation function changes.
    // Prime the timer so the first frame delta is one frame, matching Clock's
    // first getDelta() which returned 0.
    timerRef.current.update();
    const minFrameMs = 1000 / (qualitySettings.maxFPS || 60);
    let lastRenderMs = 0;
    const animate = (timestamp) => {
      frameIdRef.current = requestAnimationFrame(animate);

      if (timestamp - lastRenderMs < minFrameMs) {
        return;
      }
      lastRenderMs = timestamp;

      timerRef.current.update(timestamp);
      const deltaTime = timerRef.current.getDelta();
      if (updateAnimationRef.current) {
        updateAnimationRef.current(deltaTime);
      }

      // Zoom-adaptive scale bar: use camera distance to orbit target rather than
      // absolute origin distance so the transition remains stable after panning.
      if (scaleBarRef.current) {
        const camDistance = camera.position.distanceTo(controls.target);
        scaleBarRef.current.setAdaptiveScale(camDistance, {
          latticeRegimeScale: latticeMetersPerVisUnit,
          transitionDistance: 20,
          fovDeg: 75,
          latticeTargetLengthM: 5e-9,
          forceLatticeOnly: true,
        });
      }

      controls.update();
      renderer.render(scene, camera);
    };
    
    animate();
    
    // Handle resize — guard zero-size containers (#409 M1)
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = Math.max(containerRef.current.clientWidth, 1);
      const height = Math.max(containerRef.current.clientHeight, 1);
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    handleResize();
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(handleResize)
      : null;
    resizeObserver?.observe(containerRef.current);
    window.addEventListener('resize', handleResize);

    // VIZ-06 — pick host InstancedMesh on click (ignore orbit drags).
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let pointerDown = null;
    const onPointerDown = (event) => {
      pointerDown = { x: event.clientX, y: event.clientY };
    };
    const onPointerUp = (event) => {
      if (!pointerDown) return;
      const dx = event.clientX - pointerDown.x;
      const dy = event.clientY - pointerDown.y;
      pointerDown = null;
      if ((dx * dx + dy * dy) > 16) return; // drag — leave OrbitControls alone
      const canvas = renderer.domElement;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const hostAtoms = latticeGroupRef.current?.getObjectByName('LatticeHostAtoms');
      if (!hostAtoms || !hostAtoms.visible) {
        setPickedLatticeSite(null);
        return;
      }
      const hits = raycaster.intersectObject(hostAtoms, false);
      if (!hits.length) {
        setPickedLatticeSite(null);
        return;
      }
      const pick = resolveLatticePick({
        instanceId: hits[0].instanceId,
        sites: hostAtoms.userData?.restSites || [],
        hostKey: hostAtoms.userData?.hostKey || 'unknown',
      });
      setPickedLatticeSite(pick);
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    
    // Cleanup
    return () => {
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameIdRef.current);

      protonWaveCompanionRef.current?.dispose?.();
      protonWaveCompanionRef.current = null;
      plasmaVortexRef.current?.dispose?.();
      plasmaVortexRef.current = null;
      electronMigrationRef.current?.dispose?.();
      electronMigrationRef.current = null;
      
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
  }, [createLattice, createLiquidPhaseOverlay, createBubble, createProtons, createFieldVisualization, createEffects, createVortexFlow, createCasimirField, createRydbergOrbitals, createHaloElectrons, createScaleBar, latticeMetersPerVisUnit, isMobile, qualitySettings]);
  // Note: updateAnimation removed from deps - using updateAnimationRef to prevent camera reset on cycle change

  // VIZ-12 — apply overlay state without inventing melt when f_L is absent.
  useEffect(() => {
    const group = liquidPhaseGroupRef.current;
    if (!group) return;
    const film = group.getObjectByName('LiquidPhaseFilm');
    const state = liquidPhaseOverlayState;
    group.userData = {
      mode: state.mode,
      claim_tier: state.claimTier,
      fidelity: state.fidelity,
      hostKey: state.hostKey,
      phaseFractionLiquid: state.phaseFractionLiquid,
      message: state.message,
    };
    if (state.mode !== 'schematic_film' || !film) {
      group.visible = false;
      return;
    }
    const scale = 0.8 + 1.4 * state.filmScale;
    film.scale.set(scale, 0.18 + 0.2 * state.filmScale, scale);
    if (film.material) {
      film.material.opacity = 0.2 + 0.45 * state.filmScale;
      film.material.emissiveIntensity = 0.25 + 0.5 * state.filmScale;
    }
    group.visible = showLattice;
  }, [liquidPhaseOverlayState, showLattice]);

  // Update visibility based on toggles - immediate update with force refresh
  useEffect(() => {
    // Force update visibility immediately when toggles change
    const updateVisibility = () => {
      if (latticeGroupRef.current) {
        latticeGroupRef.current.visible = showLattice;
        latticeGroupRef.current.traverse((child) => {
          // isInstancedMesh also satisfies isMesh, and LineSegments satisfies
          // isLine, so both instanced atoms and merged bonds are covered here.
          if (child.isMesh || child.isLine || child.isPoints || child.isGroup) {
            child.visible = showLattice;
          }
        });
      }
      if (boundaryVisualGroupRef.current) {
        const isBoundaryVisible = showLattice && showBoundaryPlane;
        boundaryVisualGroupRef.current.visible = isBoundaryVisible;
        boundaryVisualGroupRef.current.traverse((child) => {
          if (child.isMesh || child.isLine || child.isPoints || child.isGroup) {
            child.visible = isBoundaryVisible;
          }
        });
      }
      if (bubbleGroupRef.current) {
        bubbleGroupRef.current.visible = showBubble;
        bubbleGroupRef.current.traverse((child) => {
          // Torus/jet: force hide when Bubble off; when on, animation owns phase visibility
          if (child.name === 'TorusFormation' || child.name === 'FocusedJet') {
            if (!showBubble) child.visible = false;
            return;
          }
          // Sheath surface flow: OFF-default Layers toggle; not measured bubble spin
          if (
            child.name === 'SheathSurfaceFlow'
            || child.name === 'SheathSurfaceFlowPoints'
            || (typeof child.name === 'string' && child.name.startsWith('SheathSurfaceFlowRibbon'))
          ) {
            child.visible = showBubble && showSheathSurfaceFlow;
            return;
          }
          // Electrolyte ionized-env halo — EMP chem-env; follows Bubble + layer toggle
          if (child.name === 'ElectrolyteIonizedHalo') {
            child.visible = showBubble && showElectrolyteHalo;
            return;
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
      // Proton soft wave companion lives outside ProtonPhaseGroup
      if (protonWaveCompanionRef.current?.getGroup) {
        const waveGroup = protonWaveCompanionRef.current.getGroup();
        waveGroup.visible = showProtons;
        waveGroup.traverse((child) => {
          if (child.isMesh || child.isLine || child.isPoints || child.isGroup) {
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
      // e⁻ migration is a sibling scene group (not under Fields)
      if (electronMigrationRef.current?.getGroup) {
        const eGroup = electronMigrationRef.current.getGroup();
        eGroup.visible = showElectronMig;
        eGroup.traverse((child) => {
          if (child.isMesh || child.isLine || child.isPoints || child.isGroup) {
            child.visible = showElectronMig;
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
  }, [showLattice, showBubble, showSheathSurfaceFlow, showElectrolyteHalo, showProtons, showFieldLines, showElectronMig, showVortices, showBoundaryPlane, showCasimir, showRydberg, showHalo]);

  // Camera controls
  const resetCameraToPreset = useCallback(() => {
    const camPreset = isMobile ? CAMERA_PRESET.mobile : CAMERA_PRESET.desktop;
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(...camPreset.position);
      controlsRef.current.target.set(...camPreset.target);
      controlsRef.current.update();
    }
  }, [isMobile]);

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
    resetCameraToPreset();
  };

  // Phase indicator color
  const getPhaseColor = (phase) => {
    switch (normalizePhaseName(phase)) {
      case 'EXPANSION': return 'info';
      case 'COLLAPSE': return 'warning';
      case 'MINIMUM': return 'error';
      case 'REBOUND': return 'secondary';
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
          minHeight: isMobile ? 280 : height,
          position: 'relative',
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: '#0a0a1a',
          touchAction: isMobile ? 'none' : 'auto',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            touchAction: isMobile ? 'none' : 'auto',
          }}
        />
        
        {/* Mobile touch controls (v0.2.2-beta / #409 M2) */}
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
          onReset={resetCameraToPreset}
          showHints={isMobile}
          showControls={isMobile}
          enabled={isMobile}
          singleFingerRotatesOnly
        />
        
        {isMobile && (
          <Chip
            size="small"
            label="Mobile simplified scene"
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              zIndex: 6,
              bgcolor: 'rgba(30, 30, 50, 0.92)',
              color: 'white',
              fontSize: '0.65rem',
            }}
            data-testid="ublv-mobile-tier-chip"
          />
        )}

        {/* Right-side control stack: layer toggles (collapse right) + desktop zoom */}
        <Box
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            display: { xs: 'none', sm: 'flex' },
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 1,
            zIndex: 5,
          }}
        >
          {/* Layers / Boundary Plane debug drawer — collapses to the right */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'stretch',
            }}
            data-testid="ublv-layers-drawer"
          >
            <Collapse in={!layersCollapsed} orientation="horizontal" timeout={280}>
              <Paper
                elevation={3}
                id="ublv-layers-panel"
                sx={{
                  bgcolor: 'rgba(20, 20, 40, 0.9)',
                  borderRadius: '8px 0 0 8px',
                  p: 1,
                  mr: 0,
                }}
                data-testid="ublv-layers-panel"
              >
                <FormGroup>
                  <FormControlLabel
                    control={<Switch checked={showLattice} onChange={(e) => setShowLattice(e.target.checked)} size="small" data-testid="ublv-layer-lattice" />}
                    label={<Typography variant="caption" color="white">Lattice</Typography>}
                  />
                  <FormControlLabel
                    control={<Switch checked={showPhonon} onChange={(e) => setShowPhonon(e.target.checked)} size="small" data-testid="ublv-layer-phonon" />}
                    label={
                      <Tooltip title="Schematic lattice modes / contested phonon–heat hypothesis (dual-laser failed independent replication). Not MD; never 'highly reproducible'.">
                        <Typography variant="caption" color="white">Phonon acoustic+optical (schematic / contested)</Typography>
                      </Tooltip>
                    }
                  />
                  <FormControlLabel
                    control={<Switch checked={showBoundaryPlane} onChange={(e) => setShowBoundaryPlane(e.target.checked)} size="small" color="primary" />}
                    label={<Typography variant="caption" color="white">Boundary Plane (Debug)</Typography>}
                  />
                  <FormControlLabel
                    control={<Switch checked={showBubble} onChange={(e) => setShowBubble(e.target.checked)} size="small" color="info" data-testid="ublv-layer-bubble" />}
                    label={
                      <Tooltip title="Soft translucent ionic double-layer membrane + brief torus/jet flash + mild pinch/surface-mod at collapse (hydro schematic). Torus/jet/pinch die when this layer is off. Not Benjamin–Feir proof; not nuclear burn; not measured bubble spin.">
                        <Typography variant="caption" color="white">Double-layer / torus (ionic)</Typography>
                      </Tooltip>
                    }
                  />
                  <FormControlLabel
                    control={(
                      <Switch
                        checked={showSheathSurfaceFlow}
                        onChange={(e) => setShowSheathSurfaceFlow(e.target.checked)}
                        size="small"
                        color="info"
                        data-testid="ublv-layer-sheath-surface-flow"
                      />
                    )}
                    label={
                      <Tooltip title={`${SHEATH_SURFACE_FLOW_CHIP}. Tangential Points/ribbons on the ionic sheath — DL / MHD peer motif only. Not macroscopic bubble spin; EQ-OPEN untouched.`}>
                        <Typography variant="caption" color="white">Sheath surface flow (schematic)</Typography>
                      </Tooltip>
                    }
                  />
                  <FormControlLabel
                    control={(
                      <Switch
                        checked={showElectrolyteHalo}
                        onChange={(e) => setShowElectrolyteHalo(e.target.checked)}
                        size="small"
                        color="info"
                        data-testid="ublv-layer-electrolyte-halo"
                      />
                    )}
                    label={
                      <Tooltip title={`${ELECTROLYTE_HALO_CHIP}. Soft sheath tint from electrolyte family / species / molarity + engine electrolyte_multiplier. EMP chem-env label — plasma ≠ fusion; EQ-OPEN untouched.`}>
                        <Typography variant="caption" color="white">Ionized env · electrolyte halo (EMP chem)</Typography>
                      </Tooltip>
                    }
                  />
                  <FormControlLabel
                    control={<Switch checked={showProtons} onChange={(e) => setShowProtons(e.target.checked)} size="small" color="warning" data-testid="ublv-layer-protons" />}
                    label={<Typography variant="caption" color="white">Protons</Typography>}
                  />
                  <FormControlLabel
                    control={<Switch checked={showFieldLines} onChange={(e) => setShowFieldLines(e.target.checked)} size="small" color="secondary" data-testid="ublv-layer-fields" />}
                    label={<Typography variant="caption" color="white">Field lines</Typography>}
                  />
                  <FormControlLabel
                    control={<Switch checked={showElectronMig} onChange={(e) => setShowElectronMig(e.target.checked)} size="small" data-testid="ublv-layer-emig" />}
                    label={
                      <Tooltip title="Schematic / contested charge-flow motif along E. Not continuum transport; does not close EQ-OPEN-EC-01; never 'highly reproducible'.">
                        <Typography variant="caption" color="white">e⁻ migration (schematic / contested)</Typography>
                      </Tooltip>
                    }
                  />
                  <FormControlLabel
                    control={<Switch checked={showVortices} onChange={(e) => setShowVortices(e.target.checked)} size="small" color="success" data-testid="ublv-layer-mhd" />}
                    label={
                      <Tooltip title="Hydro-honest swirl → cavity storytelling (vortex/torus peers). Soft plasma = Flannigan–Suslick optical/plasma peer — not CFD, not fusion, not TheoryModule.">
                        <Typography variant="caption" color="white">MHD / vortex → cavitation (hydro)</Typography>
                      </Tooltip>
                    }
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
                    control={(
                      <Switch
                        checked={showSchematicShells}
                        onChange={(e) => setShowSchematicShells(e.target.checked)}
                        size="small"
                        sx={{ color: '#5ee0ff' }}
                        inputProps={{ 'data-testid': 'ublv-schematic-shells-switch' }}
                      />
                    )}
                    label={(
                      <Tooltip title="Soft additive electron-density shells — schematic presentation only. Not QM orbitals / DFT / ab initio Ψ². Opacity tracks loading_ratio; Layers OFF by default.">
                        <Typography variant="caption" color="white">
                          Schematic shells
                        </Typography>
                      </Tooltip>
                    )}
                  />
                  <FormControlLabel
                    control={<Switch checked={showLegend} onChange={(e) => setShowLegend(e.target.checked)} size="small" sx={{ color: '#88ff88' }} />}
                    label={<Typography variant="caption" color="white">Legend</Typography>}
                  />
                  <FormControlLabel
                    control={(
                      <Switch
                        checked={showCollapseRibbon}
                        onChange={(e) => setShowCollapseRibbon(e.target.checked)}
                        size="small"
                        data-testid="ublv-layer-collapse-ribbon"
                      />
                    )}
                    label={
                      <Tooltip title="Engine collapse_trajectory R(t) ribbon (Rayleigh–Plesset ODE path). EMP hydro — not CFD / not nuclear.">
                        <Typography variant="caption" color="white">Collapse R(t) ribbon (ODE)</Typography>
                      </Tooltip>
                    }
                  />
                  <FormControlLabel
                    control={(
                      <Switch
                        checked={showOccupancyGlow}
                        onChange={(e) => setShowOccupancyGlow(e.target.checked)}
                        size="small"
                        data-testid="ublv-layer-occupancy-glow"
                      />
                    )}
                    label={
                      <Tooltip title="Host occupancy glow. Engine site loading when exported; otherwise schematic mask + honesty chip (VIZ-08).">
                        <Typography variant="caption" color="white">Occupancy glow</Typography>
                      </Tooltip>
                    }
                  />
                  <Box sx={{ mt: 1, px: 0.5 }} data-testid="ublv-lattice-color-mode">
                    <Tooltip title="Host instanceColor mode — mutually exclusive. Species = exclusive Pd/Ni palette; Loading = schematic occupancy; T = temperature_k warm lift; Phonon = contested mode-energy tint. Schematic presentation — not QM orbitals.">
                      <Typography variant="caption" color="rgba(255,255,255,0.75)" sx={{ display: 'block', mb: 0.5 }}>
                        Lattice color
                      </Typography>
                    </Tooltip>
                    <ToggleButtonGroup
                      exclusive
                      size="small"
                      value={latticeColorMode}
                      onChange={(_e, next) => {
                        if (next) setLatticeColorMode(normalizeLatticeColorMode(next));
                      }}
                      aria-label="Lattice host color mode"
                      sx={{
                        flexWrap: 'wrap',
                        gap: 0.25,
                        '& .MuiToggleButton-root': {
                          color: 'rgba(255,255,255,0.85)',
                          borderColor: 'rgba(255,255,255,0.25)',
                          px: 0.75,
                          py: 0.15,
                          fontSize: '0.65rem',
                          textTransform: 'none',
                          '&.Mui-selected': {
                            bgcolor: 'rgba(25, 118, 210, 0.55)',
                            color: 'white',
                          },
                        },
                      }}
                    >
                      {LATTICE_COLOR_MODES.map((mode) => (
                        <ToggleButton
                          key={mode}
                          value={mode}
                          data-testid={`ublv-color-mode-${mode}`}
                          aria-label={LATTICE_COLOR_MODE_META[mode].honesty}
                        >
                          {LATTICE_COLOR_MODE_META[mode].short}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                    <Typography variant="caption" color="rgba(255,255,255,0.55)" sx={{ display: 'block', mt: 0.5, lineHeight: 1.2 }}>
                      {LATTICE_COLOR_MODE_META[normalizeLatticeColorMode(latticeColorMode)].honesty}
                    </Typography>
                  </Box>
                </FormGroup>
              </Paper>
            </Collapse>
            <Tooltip title={layersCollapsed ? 'Expand layers' : 'Collapse layers'} placement="left">
              <Paper
                elevation={3}
                component="button"
                type="button"
                onClick={() => setLayersCollapsed((prev) => !prev)}
                aria-expanded={!layersCollapsed}
                aria-controls="ublv-layers-panel"
                aria-label={layersCollapsed ? 'Expand layers panel' : 'Collapse layers panel'}
                data-testid="ublv-layers-toggle"
                sx={{
                  bgcolor: 'rgba(25, 118, 210, 0.95)',
                  color: 'white',
                  cursor: 'pointer',
                  border: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 1.5,
                  px: 0.5,
                  borderRadius: layersCollapsed ? 1 : '0 8px 8px 0',
                  minHeight: layersCollapsed ? 96 : 'auto',
                  width: 32,
                  '&:hover': { bgcolor: 'rgba(25, 118, 210, 1)' },
                  transition: 'background-color 0.2s ease',
                }}
              >
                <LayersIcon sx={{ fontSize: 18, mb: 0.5 }} />
                <Typography
                  variant="caption"
                  sx={{
                    writingMode: 'vertical-rl',
                    textOrientation: 'mixed',
                    transform: 'rotate(180deg)',
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    letterSpacing: 1,
                    lineHeight: 1.2,
                  }}
                >
                  LAYERS
                </Typography>
                <Box sx={{ mt: 0.5, display: 'flex' }}>
                  {layersCollapsed
                    ? <ChevronLeftIcon sx={{ fontSize: 16 }} />
                    : <ChevronRightIcon sx={{ fontSize: 16 }} />}
                </Box>
              </Paper>
            </Tooltip>
          </Box>

          {/* Desktop zoom controls are intentionally grouped below legend toggles */}
          {!isMobile && (
            <Paper
              elevation={3}
              sx={{
                bgcolor: 'rgba(20, 20, 40, 0.9)',
                borderRadius: 1,
                p: 0.5,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Tooltip title="Zoom In" placement="left">
                <IconButton size="small" onClick={handleZoomIn} sx={{ color: 'white' }}>
                  <ZoomInIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Zoom Out" placement="left">
                <IconButton size="small" onClick={handleZoomOut} sx={{ color: 'white' }}>
                  <ZoomOutIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reset View" placement="left">
                <IconButton size="small" onClick={handleResetView} sx={{ color: 'white' }}>
                  <HomeIcon />
                </IconButton>
              </Tooltip>
            </Paper>
          )}
        </Box>
        
        {/* Comprehensive Visualization Legend - collapsible side drawer */}
        {showLegend && (
          <VisualizationLegend
            particleCounts={{
              palladium: hostMaterial === 'palladium' ? 27 : 0,
              nickel: hostMaterial === 'nickel' ? 27 : 0,
              titanium: hostMaterial === 'titanium' ? 27 : 0,
              copper: hostMaterial === 'copper' ? 27 : 0,
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
              // Lattice-only display contract: keep nm-scale reference as the
              // single source of truth for the visual marker and legend.
              gridSize: 5,
              scaleUnit: 'nm',
              realWorldSize: 5e-9,
              mixedScales: false,
              latticeRegime: {
                label: latticeScaleDescriptor.label,
                metersPerUnit: latticeScaleDescriptor.metersPerUnit,
                note: latticeScaleDescriptor.note,
              },
            }}
            quantumFluxMode="electron_screening"
            position="top-left"
            collapsed={legendCollapsed}
            onToggleCollapse={setLegendCollapsed}
            variant="side-drawer"
            simulationType="lenr"
            hostMaterial={hostMaterial}
            liquidPhaseHeat={liquidPhaseChannels.heat}
            liquidPhaseFraction={liquidPhaseChannels.phaseFractionLiquid}
          />
        )}
        
        {/* Phase + claim-tier HUD — collapses downward; no bare quantitative numbers (VIZ-03) */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: '95%',
            zIndex: 5,
            // Narrow viewports: keep metrics under Enhancement stack (no overlap).
            '@media (max-width: 480px)': {
              left: 10,
              right: 10,
              transform: 'none',
              maxWidth: 'none',
              bottom: 10,
            },
          }}
          data-testid="ublv-metrics-drawer"
        >
          <Collapse in={!metricsCollapsed} timeout={280}>
            <Paper
              elevation={3}
              id="ublv-metrics-panel"
              data-testid="ublv-metrics-panel"
              sx={{
                bgcolor: 'rgba(20, 20, 40, 0.9)',
                borderRadius: '8px 8px 0 0',
                p: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                flexWrap: 'wrap',
                maxWidth: '100%',
              }}
            >
              <Tooltip title={usingAPIData ? 'Playing engine samples / API timeline' : 'Local RAF fallback (schematic; limited accuracy)'}>
                <Chip
                  label={usingAPIData ? 'Engine samples' : 'Local Calc'}
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
                data-testid="ublv-phase-chip"
              />
              <Tooltip title="Soft Points peak near min-R. Peer: Flannigan–Suslick SBSL plasma (optical / n_e). Plasma ≠ fusion; does not flip lenr_proved or close EQ-OPEN.">
                <Chip
                  label="Soft plasma · Flannigan–Suslick peer"
                  size="small"
                  data-testid="ublv-wave-viz-chip"
                  sx={{
                    bgcolor: 'rgba(0, 150, 180, 0.85)',
                    color: 'white',
                    fontSize: '0.6rem',
                  }}
                />
              </Tooltip>
              <Tooltip title={PLASMA_EXCITED_CHIP_TOOLTIP}>
                <Chip
                  label={PLASMA_EXCITED_CHIP}
                  size="small"
                  data-testid="ublv-excited-plasma-chip"
                  sx={{
                    bgcolor: 'rgba(120, 60, 140, 0.88)',
                    color: 'white',
                    fontSize: '0.6rem',
                  }}
                />
              </Tooltip>
              {plasmaSpectrum?.label && (
                <Tooltip title={`Presentation tint from host/solute/electrolyte fields (${TORUS_SCRUB_START * 100}–${TORUS_SCRUB_END * 100}% scrub). Schematic EMP chem / optical peer — not a spectrometer claim.`}>
                  <Chip
                    label={plasmaSpectrum.label}
                    size="small"
                    data-testid="ublv-plasma-spectrum-chip"
                    sx={{
                      bgcolor: 'rgba(80, 90, 130, 0.9)',
                      color: 'white',
                      fontSize: '0.58rem',
                    }}
                  />
                </Tooltip>
              )}
              <Tooltip title={MASER_JET_CHIP_TOOLTIP}>
                <Chip
                  label={MASER_JET_CHIP}
                  size="small"
                  data-testid="ublv-maser-jet-chip"
                  sx={{
                    bgcolor: 'rgba(90, 70, 150, 0.9)',
                    color: 'white',
                    fontSize: '0.58rem',
                  }}
                />
              </Tooltip>
              <Tooltip title={SHED_DEBRIS_CHIP_TOOLTIP}>
                <Chip
                  label={SHED_DEBRIS_CHIP}
                  size="small"
                  data-testid="ublv-shed-debris-chip"
                  sx={{
                    bgcolor: 'rgba(60, 100, 120, 0.9)',
                    color: 'white',
                    fontSize: '0.58rem',
                  }}
                />
              </Tooltip>
              <Tooltip title="Procedural noise + soft refraction cue + advective UV scroll on torus / shed / jet. Presentation fluid look only — not continuum CFD / PIC; plasma ≠ fusion.">
                <Chip
                  label={PLASMA_FLUID_LOOK_CHIP}
                  size="small"
                  data-testid="ublv-plasma-fluid-look-chip"
                  sx={{
                    bgcolor: 'rgba(70, 90, 110, 0.92)',
                    color: 'white',
                    fontSize: '0.58rem',
                  }}
                />
              </Tooltip>
              <Tooltip title="Acoustic (long-λ in-phase) + optical (short-λ antiphase) standing waves across material-size lattice from enhancement_breakdown.phonon / temperature_k / compression / loading_ratio. Schematic modes — not MD eigenvectors. Dual-laser phonon→heat stays contested; never 'highly reproducible'.">
                <Chip
                  label={PHONON_STANDING_CHIP}
                  size="small"
                  data-testid="ublv-phonon-viz-chip"
                  sx={{
                    bgcolor: 'rgba(156, 120, 60, 0.9)',
                    color: 'white',
                    fontSize: '0.6rem',
                  }}
                />
              </Tooltip>
              {showPhonon && showLattice && (
                <Tooltip title="Presentation mix from resolvePhononStandingWaveParams — acousticWeight / opticalWeight driven by enhancement_breakdown.phonon. Not MD mode occupancy; contested schematic only.">
                  <Chip
                    label={`A ${phononMixReadout.acousticPct}% · O ${phononMixReadout.opticalPct}%`}
                    size="small"
                    data-testid="ublv-phonon-mix-chip"
                    data-phonon-amp={phononMixReadout.amp}
                    sx={{
                      bgcolor: 'rgba(100, 90, 50, 0.9)',
                      color: 'white',
                      fontSize: '0.6rem',
                    }}
                  />
                </Tooltip>
              )}
              <Tooltip title="Catalyst-as-waveguide ribbon along host axis — schematic from loading_ratio × phonon samples. Not a verified LENR waveguide; ionized chem env remains electrolyte-label honest.">
                <Chip
                  label={PHONON_WAVEGUIDE_CHIP}
                  size="small"
                  data-testid="ublv-waveguide-chip"
                  sx={{
                    bgcolor: 'rgba(180, 140, 50, 0.9)',
                    color: 'white',
                    fontSize: '0.6rem',
                  }}
                />
              </Tooltip>
              <Tooltip title="Near literature T_m softening cue only (cite-backed Pd/Ni). Does NOT invent f_L or melt morph; contribute-vs-diffuse reaction framing stays exploratory until TheoryModules export liquid fraction. EQ-OPEN / lenr_proved untouched.">
                <Chip
                  label={PHONON_MELT_CHIP}
                  size="small"
                  data-testid="ublv-melt-proximity-chip"
                  sx={{
                    bgcolor: 'rgba(120, 90, 60, 0.9)',
                    color: 'white',
                    fontSize: '0.6rem',
                  }}
                />
              </Tooltip>
              <Tooltip title="Schematic / contested charge-flow. Not continuum transport; EQ-OPEN-EC-01 stays OPEN; never 'highly reproducible'.">
                <Chip
                  label="e⁻ mig · schematic / contested"
                  size="small"
                  data-testid="ublv-electron-mig-chip"
                  sx={{
                    bgcolor: 'rgba(60, 140, 180, 0.9)',
                    color: 'white',
                    fontSize: '0.6rem',
                  }}
                />
              </Tooltip>
              <Tooltip title="Hydro-honest flux / vorticity / MHD→cavitation cues from existing samples. Schematic viz — not CFD/MD proof or TheoryModule discharge.">
                <Chip
                  label="MHD→cavitation · hydro schematic"
                  size="small"
                  data-testid="ublv-cavitation-force-chip"
                  sx={{
                    bgcolor: 'rgba(120, 70, 90, 0.9)',
                    color: 'white',
                    fontSize: '0.6rem',
                  }}
                />
              </Tooltip>
              <Tooltip title="Ionic double-layer pinch / mild surface modulation at collapse — hydro morphology peer under Double-layer toggle. Not Benjamin–Feir confirmation; not H-absorption nuclear step; EQ-OPEN untouched.">
                <Chip
                  label="Ionic DL pinch · hydro schematic"
                  size="small"
                  data-testid="ublv-ionic-dl-pinch-chip"
                  sx={{
                    bgcolor: 'rgba(40, 120, 140, 0.9)',
                    color: 'white',
                    fontSize: '0.6rem',
                  }}
                />
              </Tooltip>
              {showBubble && showSheathSurfaceFlow && (
                <Tooltip title="Tangential additive Points/ribbons on the ionic sheath — DL / MHD peer motif. Not measured macroscopic bubble spin; not bulk kinetic spin; EQ-OPEN untouched.">
                  <Chip
                    label={SHEATH_SURFACE_FLOW_CHIP}
                    size="small"
                    data-testid="ublv-sheath-surface-flow-chip"
                    sx={{
                      bgcolor: 'rgba(50, 100, 130, 0.92)',
                      color: 'white',
                      fontSize: '0.6rem',
                    }}
                  />
                </Tooltip>
              )}
              {showBubble && showElectrolyteHalo && (
                <Tooltip title="Soft ionized-env sheath tint from electrolyte family / species / molarity and engine electrolyte_multiplier. EMP chem-env label — plasma ≠ fusion; does not flip lenr_proved or close EQ-OPEN.">
                  <Chip
                    label={ELECTROLYTE_HALO_CHIP}
                    size="small"
                    data-testid="ublv-electrolyte-halo-chip"
                    sx={{
                      bgcolor: 'rgba(40, 130, 150, 0.92)',
                      color: 'white',
                      fontSize: '0.6rem',
                    }}
                  />
                </Tooltip>
              )}
              {collapseRibbonMeta && showCollapseRibbon && (
                <Tooltip title={`Engine collapse_trajectory (${collapseRibbonMeta.source}). EMP Rayleigh–Plesset R(t) — not CFD / not nuclear.`}>
                  <Chip
                    label={`Collapse R(t) · ${collapseRibbonMeta.sampleCount} samples`}
                    size="small"
                    data-testid="ublv-collapse-ribbon-chip"
                    sx={{
                      bgcolor: 'rgba(180, 110, 40, 0.9)',
                      color: 'white',
                      fontSize: '0.6rem',
                    }}
                  />
                </Tooltip>
              )}
              {occupancyGlowMeta && showOccupancyGlow && (
                <Tooltip title={occupancyGlowMeta.label}>
                  <Chip
                    label={
                      occupancyGlowMeta.engineBound
                        ? `Occupancy glow · engine (${occupancyGlowMeta.occupiedCount})`
                        : 'Occupancy glow · schematic'
                    }
                    size="small"
                    data-testid="ublv-occupancy-glow-chip"
                    sx={{
                      bgcolor: occupancyGlowMeta.engineBound
                        ? 'rgba(40, 140, 120, 0.9)'
                        : 'rgba(70, 90, 140, 0.9)',
                      color: 'white',
                      fontSize: '0.6rem',
                    }}
                  />
                </Tooltip>
              )}
              <Tooltip title={hostMeltMeta.citeNote}>
                <Chip
                  label={
                    hostMeltMeta.meltingPointK != null
                      ? `${hostMeltMeta.displayName} T_m ${hostMeltMeta.meltingPointK} K`
                      : 'Melt viz: Pd/Ni only'
                  }
                  size="small"
                  data-testid="ublv-host-tm-chip"
                  data-host-key={hostMeltMeta.hostKey}
                  sx={{
                    bgcolor: 'rgba(33, 150, 243, 0.75)',
                    color: 'white',
                    fontSize: '0.6rem',
                  }}
                />
              </Tooltip>
              {schematicShellMeta && showSchematicShells && (
                <Tooltip title={SCHEMATIC_SHELL_LABEL}>
                  <Chip
                    label="Schematic · not QM orbitals"
                    size="small"
                    data-testid="ublv-schematic-shells-chip"
                    data-fidelity={schematicShellMeta.fidelity}
                    sx={{
                      bgcolor: 'rgba(40, 120, 150, 0.9)',
                      color: 'white',
                      fontSize: '0.6rem',
                    }}
                  />
                </Tooltip>
              )}
              {pickedLatticeSite && (
                <Tooltip title="VIZ-06 schematic pick — lattice index only; not nuclear proof">
                  <Chip
                    label={pickedLatticeSite.label}
                    size="small"
                    data-testid="ublv-lattice-pick-chip"
                    data-instance-id={pickedLatticeSite.instanceId}
                    data-fidelity={pickedLatticeSite.fidelity}
                    onDelete={() => setPickedLatticeSite(null)}
                    sx={{
                      bgcolor: 'rgba(120, 144, 156, 0.9)',
                      color: 'white',
                      fontSize: '0.6rem',
                    }}
                  />
                </Tooltip>
              )}
              <Typography variant="caption" color="white">
                Cycle {collapseCount} · {(cycleProgress * 100).toFixed(0)}%
              </Typography>
              <VizHudReadouts
                // Prefer engine/API-bound fields. Omit null melt/P_* (no Speculative gap spam).
                // showHeldGaps off — gaps only when TheoryModules export values.
                showHeldGaps={false}
                collapseMeta={collapseHud.meta}
                channels={[
                  // Enhancement is exploratory — only when engine/API samples exist (not Local Calc invent).
                  ...((physicsData.sampleSource === 'solver'
                    || physicsData.sampleSource === 'interpolated')
                    && Number.isFinite(currentEnhancement)
                    ? [{
                      channel_id: 'enhancement.claim_tier_display',
                      value: currentEnhancement,
                      source: physicsData.sampleSource,
                    }]
                    : []),
                  {
                    channel_id: 'collapse.compression_ratio',
                    value: physicsData.compressionRatio,
                    source: physicsData.sampleSource,
                  },
                  {
                    // Live scrub R (VIZ-01/02); prefer spacetime / timeline samples over Local Calc
                    channel_id: 'bubble.radius_um',
                    value: physicsData.radiusUm,
                    source: physicsData.sampleSource,
                  },
                  {
                    channel_id: 'collapse.temperature_k',
                    value: physicsData.temperature,
                    source: physicsData.sampleSource,
                  },
                  // E is still exploratory (double-layer model) — show only when engine-bound
                  ...((physicsData.sampleSource === 'solver'
                    || physicsData.sampleSource === 'interpolated')
                    && Number.isFinite(physicsData.fieldStrength)
                    ? [{
                      channel_id: 'collapse.electric_field_v_m',
                      value: physicsData.fieldStrength,
                      source: physicsData.sampleSource,
                    }]
                    : []),
                  // VIZ-05 — Mach + solver mode from collapse_results (engine only)
                  ...collapseHud.channels.filter((ch) => (
                    ch.channel_id === 'collapse.peak_mach'
                    || ch.channel_id === 'collapse.solver'
                  )),
                  // VIZ-07 / VIZ-12 — only when engine supplies finite values (no invent / no gap spam)
                  ...(Number.isFinite(liquidPhaseChannels.phaseFractionLiquid) ? [{
                    channel_id: 'host.phase_fraction_liquid',
                    value: liquidPhaseChannels.phaseFractionLiquid,
                    source: 'solver',
                  }] : []),
                  ...(Number.isFinite(liquidPhaseChannels.heat.P_joule) ? [{
                    channel_id: 'heat.P_joule',
                    value: liquidPhaseChannels.heat.P_joule,
                    source: 'solver',
                  }] : []),
                  ...(Number.isFinite(liquidPhaseChannels.heat.P_resistive) ? [{
                    channel_id: 'heat.P_resistive',
                    value: liquidPhaseChannels.heat.P_resistive,
                    source: 'solver',
                  }] : []),
                  ...(Number.isFinite(liquidPhaseChannels.heat.P_photonic) ? [{
                    channel_id: 'heat.P_photonic',
                    value: liquidPhaseChannels.heat.P_photonic,
                    source: 'solver',
                  }] : []),
                ]}
              />
            </Paper>
          </Collapse>
          <Tooltip title={metricsCollapsed ? 'Expand metrics' : 'Collapse metrics'} placement="top">
            <Paper
              elevation={3}
              component="button"
              type="button"
              onClick={() => setMetricsCollapsed((prev) => !prev)}
              aria-expanded={!metricsCollapsed}
              aria-controls="ublv-metrics-panel"
              aria-label={metricsCollapsed ? 'Expand Local Calc metrics panel' : 'Collapse Local Calc metrics panel'}
              data-testid="ublv-metrics-toggle"
              sx={{
                bgcolor: 'rgba(20, 20, 40, 0.95)',
                color: 'white',
                cursor: 'pointer',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                px: 1.5,
                py: 0.5,
                borderRadius: metricsCollapsed ? 1 : '0 0 8px 8px',
                minWidth: 160,
                '&:hover': { bgcolor: 'rgba(30, 30, 55, 1)' },
                transition: 'background-color 0.2s ease',
              }}
            >
              {metricsCollapsed ? (
                <>
                  <ExpandLessIcon sx={{ fontSize: 16 }} />
                  <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}>
                    {usingAPIData ? 'Engine samples' : 'Local Calc'} · {currentPhase}
                  </Typography>
                  <ExpandLessIcon sx={{ fontSize: 16 }} />
                </>
              ) : (
                <ExpandMoreIcon sx={{ fontSize: 18 }} />
              )}
            </Paper>
          </Tooltip>
        </Box>
        
        {/* Enhancement breakdown — claim-tier channel stack; engine-bound when samples exist */}
        <EnhancementBreakdownDrawer
          breakdown={enhancementBreakdown}
          sampleSource={physicsData.sampleSource || 'local_fallback'}
          collapsed={enhancementCollapsed}
          onToggle={() => setEnhancementCollapsed((prev) => !prev)}
        />
      </Box>
      
      {/* Scrubbable dual-clock timeline (VIZ-01) + engine-sample player (VIZ-02) */}
      <BubbleLatticeTimelineControls
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying((prev) => !prev)}
        onRestart={() => {
          normalizedTimeRef.current = 0;
          setCycleProgress(0);
          setCollapseCount(0);
          forceRenderRef.current = true;
          setIsPlaying(false);
        }}
        onStepBackward={() => {
          const next = Math.max(0, normalizedTimeRef.current - 0.02);
          normalizedTimeRef.current = next;
          setCycleProgress(next);
          forceRenderRef.current = true;
          setIsPlaying(false);
        }}
        onStepForward={() => {
          const next = Math.min(1, normalizedTimeRef.current + 0.02);
          normalizedTimeRef.current = next;
          setCycleProgress(next);
          forceRenderRef.current = true;
          setIsPlaying(false);
        }}
        cycleFraction={cycleProgress}
        onScrub={(val) => {
          const next = Math.min(1, Math.max(0, Number(val) || 0));
          normalizedTimeRef.current = next;
          setCycleProgress(next);
          forceRenderRef.current = true;
          setIsPlaying(false);
        }}
        animationSpeed={animationSpeed}
        onSpeedChange={setAnimationSpeed}
        frequencyKhz={frequency}
        streamLocked={streamStatus === 'streaming'}
        bufferSampleCount={spacetimeBuffer?.sample_count || 0}
      >
        {/* Proton state legend */}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
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
      </BubbleLatticeTimelineControls>
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
    latticeSize: PropTypes.number,
    electrolyteFamily: PropTypes.string,
    electrolyteSpecies: PropTypes.string,
  }),
  simulationData: PropTypes.object,
  streamLatest: PropTypes.object,
  streamStatus: PropTypes.string,
  streamFrames: PropTypes.array,
  onPhaseChange: PropTypes.func,
  onCollapseEvent: PropTypes.func,
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default UnifiedBubbleLatticeVisualization;
