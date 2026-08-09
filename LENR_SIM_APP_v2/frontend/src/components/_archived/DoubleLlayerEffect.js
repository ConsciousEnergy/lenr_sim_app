/**
 * DoubleLlayerEffect.js
 * 
 * Three.js visualization for ionic double-layer electric fields in LENR systems.
 * Models the charge separation at electrolyte/lattice interfaces that creates
 * high electric fields (up to 10^8 V/m) critical for LENR enhancement.
 * 
 * Based on Section 2.3 of the unified LENR theory paper:
 * E = ΔV/d where d ~ 1nm creates fields of ~10^8 V/m
 */

import * as THREE from 'three';

/**
 * Configuration for double-layer visualization
 */
export const DOUBLE_LAYER_CONFIG = {
  // Physical parameters from theory
  typicalPotentialDrop: 0.1, // V
  layerThickness: 1e-9, // m (1 nm)
  criticalField: 1e8, // V/m threshold for significant enhancement
  
  // Visual parameters
  innerLayerColor: 0xff6600, // Positive charge layer (orange)
  outerLayerColor: 0x00ffff, // Negative charge layer (cyan)
  fieldLineColor: 0x00ffff,
  maxFieldLines: 24,
  particleCount: 100
};

/**
 * DoubleLlayerEffect - Visualizes ionic double-layer and associated electric fields
 */
export class DoubleLlayerEffect {
  constructor(options = {}) {
    this.innerRadius = options.innerRadius || 1.0;
    this.outerRadius = options.outerRadius || 1.15;
    this.fieldLineCount = options.fieldLineCount || 16;
    this.particleCount = options.particleCount || 60;
    this.fieldIntensity = options.fieldIntensity || 1.0;
    
    this.group = new THREE.Group();
    this.group.name = 'DoubleLlayerEffect';
    
    this.fieldLines = [];
    this.fieldParticles = [];
    this.time = 0;
    
    this.initialized = false;
  }

  /**
   * Initialize the double-layer visualization
   */
  initialize() {
    if (this.initialized) return;
    
    this.createInnerLayer();
    this.createOuterLayer();
    this.createFieldLines();
    this.createFieldParticles();
    this.createBoundaryGlow();
    
    this.initialized = true;
    return this.group;
  }

  /**
   * Create inner charge layer (positive ions)
   */
  createInnerLayer() {
    const geometry = new THREE.SphereGeometry(this.innerRadius, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: DOUBLE_LAYER_CONFIG.innerLayerColor,
      transparent: true,
      opacity: 0.15,
      side: THREE.FrontSide,
      depthWrite: false
    });
    
    this.innerLayer = new THREE.Mesh(geometry, material);
    this.innerLayer.name = 'InnerChargeLayer';
    this.group.add(this.innerLayer);
  }

  /**
   * Create outer charge layer (electrons/negative ions)
   */
  createOuterLayer() {
    const geometry = new THREE.SphereGeometry(this.outerRadius, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: DOUBLE_LAYER_CONFIG.outerLayerColor,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide,
      depthWrite: false
    });
    
    this.outerLayer = new THREE.Mesh(geometry, material);
    this.outerLayer.name = 'OuterChargeLayer';
    this.group.add(this.outerLayer);
  }

  /**
   * Create electric field lines between layers
   */
  createFieldLines() {
    const material = new THREE.LineBasicMaterial({
      color: DOUBLE_LAYER_CONFIG.fieldLineColor,
      transparent: true,
      opacity: 0.4
    });

    for (let i = 0; i < this.fieldLineCount; i++) {
      // Distribute field lines evenly on sphere surface
      const phi = Math.acos(1 - 2 * (i + 0.5) / this.fieldLineCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      
      const points = this.generateFieldLinePoints(theta, phi);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, material.clone());
      
      line.userData = {
        theta,
        phi,
        baseOpacity: 0.4,
        phase: Math.random() * Math.PI * 2
      };
      
      this.fieldLines.push(line);
      this.group.add(line);
    }
  }

  /**
   * Generate points for a single field line
   */
  generateFieldLinePoints(theta, phi, segments = 10) {
    const points = [];
    const startRadius = this.innerRadius;
    const endRadius = this.outerRadius * 2; // Extend beyond outer layer
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const r = startRadius + (endRadius - startRadius) * t;
      
      // Add slight curve to field lines
      const curveFactor = Math.sin(t * Math.PI) * 0.1;
      const curvedTheta = theta + curveFactor;
      
      points.push(new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(curvedTheta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(curvedTheta)
      ));
    }
    
    return points;
  }

  /**
   * Create particles that flow along field lines
   */
  createFieldParticles() {
    const geometry = new THREE.SphereGeometry(0.03, 6, 6);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.8
    });

    for (let i = 0; i < this.particleCount; i++) {
      const particle = new THREE.Mesh(geometry, material.clone());
      
      // Assign to a field line
      const lineIndex = Math.floor(Math.random() * this.fieldLineCount);
      const fieldLine = this.fieldLines[lineIndex];
      
      particle.userData = {
        lineIndex,
        t: Math.random(), // Position along field line (0-1)
        speed: 0.01 + Math.random() * 0.02,
        theta: fieldLine?.userData?.theta || 0,
        phi: fieldLine?.userData?.phi || 0
      };
      
      this.updateParticlePosition(particle);
      this.fieldParticles.push(particle);
      this.group.add(particle);
    }
  }

  /**
   * Create glowing boundary at the interface
   */
  createBoundaryGlow() {
    // Create a ring at the equator to show the boundary
    const geometry = new THREE.TorusGeometry(
      (this.innerRadius + this.outerRadius) / 2,
      0.02,
      8,
      64
    );
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.3
    });
    
    this.boundaryRing = new THREE.Mesh(geometry, material);
    this.boundaryRing.rotation.x = Math.PI / 2;
    this.boundaryRing.name = 'BoundaryRing';
    this.group.add(this.boundaryRing);
  }

  /**
   * Update particle position along its field line
   */
  updateParticlePosition(particle) {
    const { t, theta, phi } = particle.userData;
    const startRadius = this.innerRadius;
    const endRadius = this.outerRadius * 2;
    const r = startRadius + (endRadius - startRadius) * t;
    
    const curveFactor = Math.sin(t * Math.PI) * 0.1;
    const curvedTheta = theta + curveFactor;
    
    particle.position.set(
      r * Math.sin(phi) * Math.cos(curvedTheta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(curvedTheta)
    );
  }

  /**
   * Update the effect (call in animation loop)
   */
  update(deltaTime, conditions = {}) {
    this.time += deltaTime;
    
    const {
      intensity = 1.0,
      collapsePhase = 'EXPANSION',
      scale = 1.0
    } = conditions;

    // Update scale based on bubble radius
    this.group.scale.setScalar(scale);
    
    // Calculate field intensity based on collapse phase
    let fieldStrength = intensity;
    if (collapsePhase === 'COLLAPSE' || collapsePhase === 'MINIMUM') {
      fieldStrength = intensity * 3; // Enhanced during collapse
    }
    
    // Update layer opacities
    if (this.innerLayer) {
      this.innerLayer.material.opacity = 0.15 * fieldStrength;
    }
    if (this.outerLayer) {
      this.outerLayer.material.opacity = 0.1 * fieldStrength;
    }
    
    // Update field lines
    this.fieldLines.forEach((line) => {
      const pulse = Math.sin(this.time * 3 + line.userData.phase) * 0.2 + 0.8;
      line.material.opacity = line.userData.baseOpacity * fieldStrength * pulse;
    });
    
    // Animate field particles
    const particleSpeed = collapsePhase === 'COLLAPSE' ? 3 : 1;
    this.fieldParticles.forEach((particle) => {
      particle.userData.t += particle.userData.speed * particleSpeed;
      
      // Reset particle when it reaches the end
      if (particle.userData.t > 1) {
        particle.userData.t = 0;
        // Optionally reassign to different field line
        const newLineIndex = Math.floor(Math.random() * this.fieldLineCount);
        const fieldLine = this.fieldLines[newLineIndex];
        if (fieldLine) {
          particle.userData.lineIndex = newLineIndex;
          particle.userData.theta = fieldLine.userData.theta;
          particle.userData.phi = fieldLine.userData.phi;
        }
      }
      
      this.updateParticlePosition(particle);
      particle.material.opacity = fieldStrength * 0.8;
    });
    
    // Pulse boundary ring
    if (this.boundaryRing) {
      const boundaryPulse = Math.sin(this.time * 5) * 0.1 + 0.9;
      this.boundaryRing.material.opacity = 0.3 * fieldStrength * boundaryPulse;
      this.boundaryRing.scale.setScalar(boundaryPulse);
    }
  }

  /**
   * Set the radius of the effect (for bubble collapse animation)
   */
  setRadius(innerRadius, outerRadius = null) {
    this.innerRadius = innerRadius;
    this.outerRadius = outerRadius || innerRadius * 1.15;
    
    if (this.innerLayer) {
      this.innerLayer.scale.setScalar(innerRadius);
    }
    if (this.outerLayer) {
      this.outerLayer.scale.setScalar(this.outerRadius);
    }
    
    // Update field line endpoints
    this.fieldLines.forEach((line, i) => {
      const { theta, phi } = line.userData;
      const points = this.generateFieldLinePoints(theta, phi);
      line.geometry.setFromPoints(points);
    });
  }

  /**
   * Set field intensity (0-1 normalized, can exceed 1 for enhanced states)
   */
  setIntensity(intensity) {
    this.fieldIntensity = intensity;
  }

  /**
   * Get the Three.js group
   */
  getGroup() {
    return this.group;
  }

  /**
   * Dispose of all resources
   */
  dispose() {
    this.fieldLines.forEach((line) => {
      line.geometry.dispose();
      line.material.dispose();
      this.group.remove(line);
    });
    
    this.fieldParticles.forEach((particle) => {
      particle.geometry.dispose();
      particle.material.dispose();
      this.group.remove(particle);
    });
    
    if (this.innerLayer) {
      this.innerLayer.geometry.dispose();
      this.innerLayer.material.dispose();
    }
    if (this.outerLayer) {
      this.outerLayer.geometry.dispose();
      this.outerLayer.material.dispose();
    }
    if (this.boundaryRing) {
      this.boundaryRing.geometry.dispose();
      this.boundaryRing.material.dispose();
    }
    
    this.fieldLines = [];
    this.fieldParticles = [];
    this.initialized = false;
  }
}

/**
 * Calculate electric field strength in double layer
 * From paper: E = ΔV/d
 */
export function calculateDoubleLayerField(potentialDrop, thickness) {
  return potentialDrop / thickness;
}

/**
 * Check if field exceeds critical threshold for LENR enhancement
 */
export function isFieldCritical(fieldStrength) {
  return fieldStrength >= DOUBLE_LAYER_CONFIG.criticalField;
}

/**
 * Calculate QED enhancement factor from field strength
 * Enhancement scales with (E/E_critical)^2
 */
export function calculateQEDEnhancement(fieldStrength) {
  const ratio = fieldStrength / DOUBLE_LAYER_CONFIG.criticalField;
  return 1 + ratio * ratio;
}

export default DoubleLlayerEffect;
