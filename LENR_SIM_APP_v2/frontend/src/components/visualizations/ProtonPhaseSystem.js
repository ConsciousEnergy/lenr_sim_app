/**
 * ProtonPhaseSystem.js
 * 
 * Reusable Three.js particle system for visualizing proton phase transitions
 * through multiple force regimes in LENR reactions.
 * 
 * Phase progression: FREE (EM) -> SCREENED -> CAPTURE_READY (Weak) -> NUCLEAR (Strong)
 */

import * as THREE from 'three';

/**
 * Proton state definitions with visual properties
 */
export const PROTON_STATES = {
  FREE: {
    name: 'Free (EM)',
    description: 'Electromagnetic force dominated, normal hydrogen behavior',
    color: 0x3498db,
    emissive: 0x1a4c6e,
    emissiveIntensity: 0.2,
    size: 0.15,
    forceRegime: 'electromagnetic'
  },
  SCREENED: {
    name: 'Screened',
    description: 'Electron screening active, Coulomb barrier lowered',
    color: 0x00ffff,
    emissive: 0x006666,
    emissiveIntensity: 0.4,
    size: 0.13,
    forceRegime: 'electromagnetic_screened'
  },
  CAPTURE_READY: {
    name: 'Capture Ready',
    description: 'Halo electron overlap, weak force coupling possible',
    color: 0xf1c40f,
    emissive: 0x7d6208,
    emissiveIntensity: 0.7,
    size: 0.11,
    forceRegime: 'weak'
  },
  NUCLEAR: {
    name: 'Nuclear Active',
    description: 'Strong force engagement, fusion/transmutation possible',
    color: 0xff4500,
    emissive: 0xff2200,
    emissiveIntensity: 1.0,
    size: 0.09,
    forceRegime: 'strong'
  }
};

/**
 * Threshold conditions for phase transitions (from unified theory paper)
 */
export const PHASE_THRESHOLDS = {
  FREE_TO_SCREENED: {
    screeningEnergy: 10, // eV
    temperature: 300, // K minimum
    loadingRatio: 0.7
  },
  SCREENED_TO_CAPTURE: {
    overlapProbability: 1e-3,
    electricField: 1e8, // V/m
    loadingRatio: 0.85
  },
  CAPTURE_TO_NUCLEAR: {
    tunnelingEnhancement: 1e5,
    loadingRatio: 0.9,
    defectDensity: 1e16 // m^-3
  }
};

/**
 * ProtonPhaseSystem - Manages a collection of protons with phase-based rendering
 */
export class ProtonPhaseSystem {
  constructor(options = {}) {
    this.particleCount = options.particleCount || 50;
    this.baseSize = options.baseSize || 0.12;
    this.group = new THREE.Group();
    this.group.name = 'ProtonPhaseSystem';
    this.protons = [];
    this.time = 0;
    
    // Shared geometry for performance
    this.geometry = new THREE.SphereGeometry(this.baseSize, 8, 8);
    
    // Pre-create materials for each state
    this.materials = {};
    Object.entries(PROTON_STATES).forEach(([key, state]) => {
      this.materials[key] = new THREE.MeshPhongMaterial({
        color: state.color,
        emissive: state.emissive,
        emissiveIntensity: state.emissiveIntensity,
        shininess: 60,
        transparent: true,
        opacity: 0.9
      });
    });
  }

  /**
   * Initialize protons with random positions in a defined region
   */
  initialize(bounds = { min: -3, max: 3 }, centerY = 2) {
    this.clear();
    
    const range = bounds.max - bounds.min;
    
    for (let i = 0; i < this.particleCount; i++) {
      const proton = this.createProton();
      
      // Random position within bounds
      proton.position.set(
        bounds.min + Math.random() * range,
        centerY + (Math.random() - 0.5) * range,
        bounds.min + Math.random() * range
      );
      
      // Store initial data
      proton.userData = {
        id: i,
        state: 'FREE',
        basePosition: proton.position.clone(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.05,
          (Math.random() - 0.5) * 0.05,
          (Math.random() - 0.5) * 0.05
        ),
        phaseThreshold: 0.2 + Math.random() * 0.5, // Individual sensitivity
        oscillationPhase: Math.random() * Math.PI * 2,
        transitionProgress: 0
      };
      
      this.protons.push(proton);
      this.group.add(proton);
    }
    
    return this.group;
  }

  /**
   * Create a single proton mesh
   */
  createProton() {
    // Clone material so each proton can have independent state
    const material = this.materials.FREE.clone();
    const mesh = new THREE.Mesh(this.geometry, material);
    mesh.name = 'Proton';
    return mesh;
  }

  /**
   * Update proton states based on simulation conditions
   */
  updateStates(conditions = {}) {
    const {
      collapsePhase = 'EXPANSION',
      normalizedTime = 0,
      temperature = 300,
      electricField = 1e6,
      loadingRatio = 0.9,
      tunnelingEnhancement = 1
    } = conditions;

    this.protons.forEach((proton) => {
      const threshold = proton.userData.phaseThreshold;
      let targetState = 'FREE';
      
      // Determine target state based on conditions and collapse phase
      if (collapsePhase === 'EXPANSION' || collapsePhase === 'RECOVERY') {
        // During expansion/recovery, protons relax to free state
        if (loadingRatio > PHASE_THRESHOLDS.FREE_TO_SCREENED.loadingRatio) {
          targetState = 'SCREENED';
        } else {
          targetState = 'FREE';
        }
      } else if (collapsePhase === 'COLLAPSE') {
        // During collapse, progressive state transitions
        const collapseProgress = Math.max(0, (normalizedTime - 0.4) / 0.15);
        
        if (collapseProgress > threshold + 0.4) {
          targetState = 'CAPTURE_READY';
        } else if (collapseProgress > threshold + 0.2) {
          targetState = 'SCREENED';
        } else if (collapseProgress > threshold) {
          // Check actual physics conditions
          if (electricField > PHASE_THRESHOLDS.SCREENED_TO_CAPTURE.electricField * threshold) {
            targetState = 'SCREENED';
          }
        }
      } else if (collapsePhase === 'MINIMUM') {
        // At minimum radius, highest probability of nuclear events
        if (tunnelingEnhancement > PHASE_THRESHOLDS.CAPTURE_TO_NUCLEAR.tunnelingEnhancement * threshold) {
          targetState = Math.random() < 0.3 ? 'NUCLEAR' : 'CAPTURE_READY';
        } else {
          targetState = 'CAPTURE_READY';
        }
      } else if (collapsePhase === 'REBOUND') {
        // During rebound, states begin relaxing
        targetState = Math.random() < 0.5 ? 'SCREENED' : 'FREE';
      }
      
      // Apply state transition with smooth interpolation
      this.transitionProtonState(proton, targetState);
    });
  }

  /**
   * Smoothly transition a proton to a new state
   */
  transitionProtonState(proton, targetState) {
    if (proton.userData.state === targetState) {
      proton.userData.transitionProgress = 1;
      return;
    }
    
    // Start transition
    proton.userData.state = targetState;
    proton.userData.transitionProgress = 0;
    
    // Update material properties
    const stateProps = PROTON_STATES[targetState];
    proton.material.color.setHex(stateProps.color);
    proton.material.emissive.setHex(stateProps.emissive);
    proton.material.emissiveIntensity = stateProps.emissiveIntensity;
    
    // Update size
    const sizeRatio = stateProps.size / this.baseSize;
    proton.scale.setScalar(sizeRatio);
  }

  /**
   * Update proton positions and animations
   */
  update(deltaTime, conditions = {}) {
    this.time += deltaTime;
    
    const {
      collapsePhase = 'EXPANSION',
      bubblePosition = new THREE.Vector3(0, 2, 0),
      latticeCenter = new THREE.Vector3(0, -5, 0),
      attractionStrength = 0.1
    } = conditions;

    this.protons.forEach((proton) => {
      const data = proton.userData;
      
      // Update transition progress
      if (data.transitionProgress < 1) {
        data.transitionProgress = Math.min(1, data.transitionProgress + deltaTime * 3);
      }
      
      // Position behavior based on phase
      if (collapsePhase === 'COLLAPSE' || collapsePhase === 'MINIMUM') {
        // Attract protons toward lattice during collapse
        const towardLattice = latticeCenter.clone().sub(proton.position).normalize();
        proton.position.add(towardLattice.multiplyScalar(attractionStrength * deltaTime * 60));
        
        // Add turbulence during collapse
        proton.position.x += Math.sin(this.time * 10 + data.oscillationPhase) * 0.01;
        proton.position.z += Math.cos(this.time * 10 + data.oscillationPhase) * 0.01;
      } else {
        // Return toward base position during expansion/recovery
        proton.position.lerp(data.basePosition, 0.02);
        
        // Gentle oscillation
        proton.position.x += Math.sin(this.time * 2 + data.oscillationPhase) * 0.002;
        proton.position.y += Math.cos(this.time * 2 + data.oscillationPhase) * 0.002;
      }
      
      // Apply velocity with damping
      proton.position.add(data.velocity);
      data.velocity.multiplyScalar(0.99);
      
      // Pulse effect for NUCLEAR state
      if (data.state === 'NUCLEAR') {
        const pulse = Math.sin(this.time * 20) * 0.3 + 1;
        proton.material.emissiveIntensity = PROTON_STATES.NUCLEAR.emissiveIntensity * pulse;
      }
    });
  }

  /**
   * Get statistics about current proton states
   */
  getStateDistribution() {
    const distribution = {
      FREE: 0,
      SCREENED: 0,
      CAPTURE_READY: 0,
      NUCLEAR: 0
    };
    
    this.protons.forEach((proton) => {
      distribution[proton.userData.state]++;
    });
    
    return distribution;
  }

  /**
   * Get protons in a specific state
   */
  getProtonsInState(state) {
    return this.protons.filter(p => p.userData.state === state);
  }

  /**
   * Apply an impulse to all protons (e.g., during collapse flash)
   */
  applyImpulse(direction, strength = 0.1) {
    this.protons.forEach((proton) => {
      proton.userData.velocity.add(direction.clone().multiplyScalar(strength * Math.random()));
    });
  }

  /**
   * Get the Three.js group containing all protons
   */
  getGroup() {
    return this.group;
  }

  /**
   * Clear all protons
   */
  clear() {
    this.protons.forEach((proton) => {
      proton.material.dispose();
      this.group.remove(proton);
    });
    this.protons = [];
  }

  /**
   * Dispose of all resources
   */
  dispose() {
    this.clear();
    this.geometry.dispose();
    Object.values(this.materials).forEach(mat => mat.dispose());
  }
}

/**
 * Helper function to create a proton state legend for UI
 */
export function createProtonStateLegend() {
  return Object.entries(PROTON_STATES).map(([key, state]) => ({
    key,
    name: state.name,
    description: state.description,
    color: `#${state.color.toString(16).padStart(6, '0')}`,
    forceRegime: state.forceRegime
  }));
}

/**
 * Determine proton state from physics parameters
 */
export function calculateProtonState(params) {
  const {
    screeningEnergy = 0,
    overlapProbability = 0,
    tunnelingEnhancement = 1,
    loadingRatio = 0.5
  } = params;

  if (tunnelingEnhancement > PHASE_THRESHOLDS.CAPTURE_TO_NUCLEAR.tunnelingEnhancement &&
      loadingRatio > PHASE_THRESHOLDS.CAPTURE_TO_NUCLEAR.loadingRatio) {
    return 'NUCLEAR';
  }
  
  if (overlapProbability > PHASE_THRESHOLDS.SCREENED_TO_CAPTURE.overlapProbability &&
      loadingRatio > PHASE_THRESHOLDS.SCREENED_TO_CAPTURE.loadingRatio) {
    return 'CAPTURE_READY';
  }
  
  if (screeningEnergy > PHASE_THRESHOLDS.FREE_TO_SCREENED.screeningEnergy &&
      loadingRatio > PHASE_THRESHOLDS.FREE_TO_SCREENED.loadingRatio) {
    return 'SCREENED';
  }
  
  return 'FREE';
}

export default ProtonPhaseSystem;
