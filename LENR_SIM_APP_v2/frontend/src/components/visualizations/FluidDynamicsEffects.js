/**
 * FluidDynamicsEffects.js
 * 
 * Implements fluid dynamics-inspired visualization effects for particle simulations.
 * Based on concepts from vortex particle flow maps and incompressible flow simulation.
 * 
 * Key features:
 * - Vortex field generation for swirling particle motion
 * - Streamline/flow line visualization
 * - Particle trail effects
 * - Energy flow mapping
 */

import * as THREE from 'three';

/**
 * Creates a vortex field effect that adds swirling motion to particles
 * Based on Biot-Savart law for vortex filaments
 */
export class VortexField {
  constructor(options = {}) {
    this.strength = options.strength || 1.0;
    this.decayRate = options.decayRate || 0.5;
    this.vortexCenters = options.vortexCenters || [];
    this.rotationAxis = options.rotationAxis || new THREE.Vector3(0, 1, 0);
  }

  /**
   * Add a vortex center to the field
   */
  addVortex(position, strength = 1.0, radius = 1.0) {
    this.vortexCenters.push({
      position: position.clone(),
      strength,
      radius
    });
  }

  /**
   * Calculate the velocity contribution from all vortices at a given position
   */
  getVelocityAt(position) {
    const velocity = new THREE.Vector3(0, 0, 0);
    
    for (const vortex of this.vortexCenters) {
      const r = position.clone().sub(vortex.position);
      const distance = r.length();
      
      if (distance < 0.001) continue; // Avoid singularity
      
      // Rankine vortex model (bounded velocity near core)
      const coreRadius = vortex.radius * 0.2;
      let tangentialSpeed;
      
      if (distance < coreRadius) {
        // Solid body rotation in core
        tangentialSpeed = vortex.strength * distance / (coreRadius * coreRadius);
      } else {
        // Potential flow outside core (1/r decay)
        tangentialSpeed = vortex.strength / distance;
      }
      
      // Apply decay based on distance from vortex
      const decayFactor = Math.exp(-distance * this.decayRate / vortex.radius);
      tangentialSpeed *= decayFactor;
      
      // Calculate tangential direction (perpendicular to r and rotation axis)
      const tangent = new THREE.Vector3()
        .crossVectors(this.rotationAxis, r)
        .normalize();
      
      velocity.add(tangent.multiplyScalar(tangentialSpeed));
    }
    
    return velocity;
  }

  /**
   * Update particle positions based on vortex field
   */
  advectParticles(particles, deltaTime) {
    for (const particle of particles) {
      const velocity = this.getVelocityAt(particle.position);
      particle.position.add(velocity.multiplyScalar(deltaTime));
    }
  }
}

/**
 * Creates flow line geometry to visualize energy/particle flow
 */
export class FlowLineGenerator {
  constructor(options = {}) {
    this.stepSize = options.stepSize || 0.1;
    this.maxSteps = options.maxSteps || 50;
    this.lineWidth = options.lineWidth || 2;
    this.fadeAlpha = options.fadeAlpha || true;
  }

  /**
   * Generate a streamline from a seed point following a velocity field
   */
  generateStreamline(seedPoint, velocityField, _scene) {
    const points = [seedPoint.clone()];
    let currentPoint = seedPoint.clone();
    
    for (let i = 0; i < this.maxSteps; i++) {
      // Get velocity at current point
      const velocity = velocityField.getVelocityAt(currentPoint);
      
      if (velocity.length() < 0.001) break; // Stop if velocity is too small
      
      // Advance along velocity direction
      const step = velocity.normalize().multiplyScalar(this.stepSize);
      currentPoint = currentPoint.add(step);
      
      // Check bounds
      if (currentPoint.length() > 10) break;
      
      points.push(currentPoint.clone());
    }
    
    if (points.length < 2) return null;
    
    // Create line geometry with gradient color
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    // Create gradient colors along the line
    const colors = [];
    for (let i = 0; i < points.length; i++) {
      const t = i / (points.length - 1);
      // Gradient from cyan to orange (energy flow)
      const r = t * 1.0;
      const g = 0.5 + t * 0.3;
      const b = 1.0 - t * 0.8;
      colors.push(r, g, b);
    }
    
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      linewidth: this.lineWidth
    });
    
    return new THREE.Line(geometry, material);
  }

  /**
   * Generate multiple streamlines from a grid of seed points
   */
  generateFlowField(velocityField, seedCount = 20, bounds = { min: -5, max: 5 }) {
    const lines = [];
    const range = bounds.max - bounds.min;
    
    for (let i = 0; i < seedCount; i++) {
      const seedPoint = new THREE.Vector3(
        bounds.min + Math.random() * range,
        bounds.min + Math.random() * range,
        bounds.min + Math.random() * range
      );
      
      const line = this.generateStreamline(seedPoint, velocityField, null);
      if (line) lines.push(line);
    }
    
    return lines;
  }
}

/**
 * Creates particle trail effects showing motion history
 */
export class ParticleTrailSystem {
  constructor(options = {}) {
    this.trailLength = options.trailLength || 10;
    this.fadeRate = options.fadeRate || 0.15;
    this.trailWidth = options.trailWidth || 1;
    this.trails = new Map(); // Map particle ID to trail history
    this.trailMeshes = new Map(); // Map particle ID to trail mesh
  }

  /**
   * Update trail for a particle
   */
  updateTrail(particleId, position) {
    if (!this.trails.has(particleId)) {
      this.trails.set(particleId, []);
    }
    
    const trail = this.trails.get(particleId);
    trail.push(position.clone());
    
    // Limit trail length
    while (trail.length > this.trailLength) {
      trail.shift();
    }
    
    return trail;
  }

  /**
   * Create or update trail mesh for a particle
   */
  createTrailMesh(particleId, color = 0x00ffff) {
    const trail = this.trails.get(particleId);
    if (!trail || trail.length < 2) return null;
    
    // Dispose old mesh if exists
    if (this.trailMeshes.has(particleId)) {
      const oldMesh = this.trailMeshes.get(particleId);
      oldMesh.geometry.dispose();
      oldMesh.material.dispose();
    }
    
    const geometry = new THREE.BufferGeometry().setFromPoints(trail);
    
    // Create gradient opacity along trail
    const alphas = [];
    for (let i = 0; i < trail.length; i++) {
      const alpha = (i / (trail.length - 1)) * (1 - this.fadeRate);
      alphas.push(alpha);
    }
    
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6,
      linewidth: this.trailWidth
    });
    
    const mesh = new THREE.Line(geometry, material);
    this.trailMeshes.set(particleId, mesh);
    
    return mesh;
  }

  /**
   * Clear all trails
   */
  clear() {
    this.trails.clear();
    for (const mesh of this.trailMeshes.values()) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.trailMeshes.clear();
  }
}

/**
 * Energy flow visualization using animated particles along flow paths
 */
export class EnergyFlowVisualizer {
  constructor(options = {}) {
    this.particleCount = options.particleCount || 100;
    this.speed = options.speed || 0.02;
    this.particleSize = options.particleSize || 0.05;
    this.flowPaths = [];
    this.particles = [];
    this.group = new THREE.Group();
    this.group.name = 'energyFlow';
  }

  /**
   * Add a flow path (series of 3D points)
   */
  addFlowPath(points, color = 0x00ffff, intensity = 1.0) {
    this.flowPaths.push({
      points,
      color: new THREE.Color(color),
      intensity
    });
  }

  /**
   * Initialize flow particles along paths
   */
  initializeParticles() {
    // Clear existing particles
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      child.geometry?.dispose();
      child.material?.dispose();
      this.group.remove(child);
    }
    this.particles = [];
    
    if (this.flowPaths.length === 0) return;
    
    const particlesPerPath = Math.ceil(this.particleCount / this.flowPaths.length);
    
    for (const path of this.flowPaths) {
      for (let i = 0; i < particlesPerPath; i++) {
        const t = Math.random(); // Random position along path
        const geometry = new THREE.SphereGeometry(this.particleSize, 6, 6);
        const material = new THREE.MeshBasicMaterial({
          color: path.color,
          transparent: true,
          opacity: 0.8 * path.intensity
        });
        
        const particle = new THREE.Mesh(geometry, material);
        
        // Store particle data
        particle.userData = {
          path,
          t,
          speed: this.speed * (0.8 + Math.random() * 0.4) // Slight speed variation
        };
        
        // Position particle along path
        this.positionParticleAlongPath(particle);
        
        this.particles.push(particle);
        this.group.add(particle);
      }
    }
  }

  /**
   * Position a particle along its assigned path based on t parameter
   */
  positionParticleAlongPath(particle) {
    const { path, t } = particle.userData;
    const points = path.points;
    
    if (points.length < 2) return;
    
    // Interpolate position along path
    const totalLength = points.length - 1;
    const index = t * totalLength;
    const i = Math.floor(index);
    const fraction = index - i;
    
    if (i >= points.length - 1) {
      particle.position.copy(points[points.length - 1]);
    } else {
      particle.position.lerpVectors(points[i], points[i + 1], fraction);
    }
  }

  /**
   * Update particle positions (call in animation loop)
   */
  update(_deltaTime = 0.016) {
    for (const particle of this.particles) {
      // Advance t parameter
      particle.userData.t += particle.userData.speed;
      
      // Loop back to start when reaching end
      if (particle.userData.t >= 1.0) {
        particle.userData.t = 0;
      }
      
      this.positionParticleAlongPath(particle);
    }
  }

  /**
   * Create flow paths from hotspot data (for LENR lattice)
   */
  createFlowPathsFromHotspots(hotspots, latticeCenter = new THREE.Vector3(0, 0, 0)) {
    this.flowPaths = [];
    
    for (const hotspot of hotspots) {
      const hotspotPos = new THREE.Vector3(
        hotspot.position?.[0] || hotspot.x || 0,
        hotspot.position?.[1] || hotspot.y || 0,
        hotspot.position?.[2] || hotspot.z || 0
      );
      
      // Create outward flow from hotspot
      const direction = hotspotPos.clone().sub(latticeCenter).normalize();
      const endPoint = hotspotPos.clone().add(direction.multiplyScalar(2));
      
      // Create curved path
      const midPoint = hotspotPos.clone().lerp(endPoint, 0.5);
      const perpendicular = new THREE.Vector3(-direction.y, direction.x, 0).multiplyScalar(0.3);
      midPoint.add(perpendicular);
      
      const points = [
        hotspotPos.clone(),
        midPoint,
        endPoint
      ];
      
      // Color based on reaction rate/intensity
      const intensity = hotspot.intensity || hotspot.reaction_rate || 0.5;
      const color = new THREE.Color().lerpColors(
        new THREE.Color(0x00ffff), // cyan
        new THREE.Color(0xff4500), // orange-red
        intensity
      );
      
      this.addFlowPath(points, color.getHex(), intensity);
    }
    
    this.initializeParticles();
  }

  getGroup() {
    return this.group;
  }

  dispose() {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      child.geometry?.dispose();
      child.material?.dispose();
      this.group.remove(child);
    }
    this.particles = [];
    this.flowPaths = [];
  }
}

/**
 * Creates a swirling plasma effect using instanced particles
 */
export class PlasmaVortexEffect {
  constructor(options = {}) {
    this.particleCount = options.particleCount || 500;
    this.vortexStrength = options.vortexStrength || 1.0;
    this.radialSpeed = options.radialSpeed || 0.5;
    this.verticalSpeed = options.verticalSpeed || 0.3;
    this.radius = options.radius || 3;
    this.height = options.height || 2;
    this.group = new THREE.Group();
    this.group.name = 'plasmaVortex';
    this.particles = [];
    this.time = 0;
  }

  initialize() {
    // Clear existing
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      child.geometry?.dispose();
      child.material?.dispose();
      this.group.remove(child);
    }
    this.particles = [];

    const geometry = new THREE.SphereGeometry(0.03, 6, 6);
    
    for (let i = 0; i < this.particleCount; i++) {
      // Random initial position in cylindrical coordinates
      const theta = Math.random() * Math.PI * 2;
      const r = Math.random() * this.radius;
      const y = (Math.random() - 0.5) * this.height;
      
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.55 + Math.random() * 0.15, 1, 0.5 + Math.random() * 0.3),
        transparent: true,
        opacity: 0.7
      });
      
      const particle = new THREE.Mesh(geometry, material);
      
      particle.userData = {
        theta,
        r,
        y,
        baseY: y,
        angularVelocity: this.vortexStrength * (1 + (this.radius - r) / this.radius),
        radialPhase: Math.random() * Math.PI * 2
      };
      
      this.updateParticlePosition(particle);
      this.particles.push(particle);
      this.group.add(particle);
    }
  }

  updateParticlePosition(particle) {
    const { theta, r, y } = particle.userData;
    particle.position.set(
      r * Math.cos(theta),
      y,
      r * Math.sin(theta)
    );
  }

  update(deltaTime = 0.016) {
    this.time += deltaTime;
    
    for (const particle of this.particles) {
      const data = particle.userData;
      
      // Rotate around vortex axis
      data.theta += data.angularVelocity * deltaTime;
      
      // Radial pulsation
      const radialPulse = Math.sin(this.time * this.radialSpeed + data.radialPhase) * 0.2;
      const currentR = data.r * (1 + radialPulse);
      
      // Vertical oscillation
      const verticalOscillation = Math.sin(this.time * this.verticalSpeed + data.radialPhase) * 0.3;
      data.y = data.baseY + verticalOscillation;
      
      // Update position
      particle.position.set(
        currentR * Math.cos(data.theta),
        data.y,
        currentR * Math.sin(data.theta)
      );
      
      // Update color based on height (hotter at center)
      const heightFactor = 1 - Math.abs(data.y) / this.height;
      const hue = 0.0 + heightFactor * 0.1; // red to yellow
      particle.material.color.setHSL(hue, 1, 0.5 + heightFactor * 0.3);
    }
  }

  getGroup() {
    return this.group;
  }

  dispose() {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      child.geometry?.dispose();
      child.material?.dispose();
      this.group.remove(child);
    }
    this.particles = [];
  }
}

export default {
  VortexField,
  FlowLineGenerator,
  ParticleTrailSystem,
  EnergyFlowVisualizer,
  PlasmaVortexEffect
};
