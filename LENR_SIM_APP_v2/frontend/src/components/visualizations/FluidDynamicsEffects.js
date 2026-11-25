/**
 * FluidDynamicsEffects.js
 * 
 * Implements fluid dynamics-inspired visualization effects for particle simulations.
 * Based on concepts from vortex particle flow maps and incompressible flow simulation.
 *
 * HONESTY: These helpers are presentation / schematic motion cues. They are NOT a
 * Navier–Stokes, SPH, or continuum CFD solver and must not be cited as fluid proof.
 * 
 * Key features:
 * - Vortex field generation for swirling particle motion
 * - Streamline/flow line visualization
 * - Particle trail effects
 * - Soft Points + ribbon wave look (PlasmaVortexEffect)
 * - Energy flow mapping
 */

import * as THREE from 'three';
import {
  createSoftDiscTexture,
  createSoftPointsMaterial,
  WaveRibbonTrailSystem,
  WAVE_PARTICLE_FIDELITY,
  WAVE_PARTICLE_SOURCE,
} from '../../utils/waveParticleViz';

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
 * Creates a swirling plasma / wave-particle effect using soft Points + ribbon trails.
 * Optional staggered dual-core wake (Kármán-street–inspired look only).
 * Schematic presentation only — not continuum CFD / PBF / WebGPU fluids.
 */
export class PlasmaVortexEffect {
  constructor(options = {}) {
    this.particleCount = options.particleCount || 500;
    this.vortexStrength = options.vortexStrength || 1.0;
    this.radialSpeed = options.radialSpeed || 0.5;
    this.verticalSpeed = options.verticalSpeed || 0.3;
    this.radius = options.radius || 3;
    this.height = options.height || 2;
    this.pointSize = options.pointSize || 0.28;
    this.bloomSize = options.bloomSize || 0.55;
    this.trailLength = options.trailLength || 14;
    this.glow = options.glow ?? 0.45;
    // Schematic vortex-street dual cores (presentation; not Re-accurate shedding)
    this.streetEnabled = options.streetEnabled !== false;
    this.streetSeparation = options.streetSeparation ?? 0.85;
    this.streetStreamSpeed = options.streetStreamSpeed ?? 0.55;
    this.streetShedRate = options.streetShedRate ?? 1.1;
    this.group = new THREE.Group();
    this.group.name = 'plasmaVortex';
    this.group.userData = {
      fidelity: WAVE_PARTICLE_FIDELITY,
      source: WAVE_PARTICLE_SOURCE,
      streetInspired: true,
    };
    /** @type {{ position: THREE.Vector3, userData: object, material: { color: THREE.Color } }[]} */
    this.particles = [];
    this.time = 0;
    this._softMap = null;
    this._points = null;
    this._bloom = null;
    this._positions = null;
    this._colors = null;
    this._bloomPositions = null;
    this._bloomColors = null;
    this._trails = null;
    this._scratchSamples = [];
  }

  initialize() {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      child.geometry?.dispose?.();
      child.material?.dispose?.();
      this.group.remove(child);
    }
    this.particles = [];
    this._trails?.dispose?.();
    this._softMap?.dispose?.();

    const n = this.particleCount;
    this._positions = new Float32Array(n * 3);
    this._colors = new Float32Array(n * 3);
    this._bloomPositions = new Float32Array(n * 3);
    this._bloomColors = new Float32Array(n * 3);
    this._softMap = createSoftDiscTexture(96);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this._positions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(this._colors, 3).setUsage(THREE.DynamicDrawUsage),
    );

    const material = createSoftPointsMaterial({
      color: 0xffffff,
      size: this.pointSize,
      opacity: 0.38,
      map: this._softMap,
    });

    this._points = new THREE.Points(geometry, material);
    this._points.name = 'PlasmaSoftCloud';
    this.group.add(this._points);

    const bloomGeom = new THREE.BufferGeometry();
    bloomGeom.setAttribute(
      'position',
      new THREE.BufferAttribute(this._bloomPositions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    bloomGeom.setAttribute(
      'color',
      new THREE.BufferAttribute(this._bloomColors, 3).setUsage(THREE.DynamicDrawUsage),
    );
    const bloomMat = createSoftPointsMaterial({
      color: 0xffffff,
      size: this.bloomSize,
      opacity: 0.14,
      map: this._softMap,
    });
    this._bloom = new THREE.Points(bloomGeom, bloomMat);
    this._bloom.name = 'PlasmaSoftBloom';
    this.group.add(this._bloom);

    // Trail a subset for density without line explosion
    const trailCount = Math.min(n, Math.max(32, Math.floor(n * 0.28)));
    this._trailStride = Math.max(1, Math.floor(n / trailCount));
    this._trails = new WaveRibbonTrailSystem({
      particleCount: trailCount,
      trailLength: this.trailLength,
      colorHex: 0xff6a2a,
      opacity: 0.28,
    });
    this.group.add(this._trails.getGroup());

    for (let i = 0; i < n; i += 1) {
      const lane = i % 2 === 0 ? 1 : -1; // staggered street lanes
      const theta = Math.random() * Math.PI * 2;
      const r = 0.15 + Math.random() * this.radius * 0.55;
      const stream = Math.random() * this.height;
      const color = new THREE.Color().setHSL(0.55 + Math.random() * 0.12, 1, 0.55);

      const particle = {
        position: new THREE.Vector3(),
        material: { color },
        userData: {
          theta,
          r,
          y: stream,
          baseY: stream,
          lane,
          stream,
          angularVelocity:
            lane * this.vortexStrength * (0.7 + (this.radius - r) / Math.max(this.radius, 1e-6)),
          radialPhase: Math.random() * Math.PI * 2,
          shedPhase: (i / n) * Math.PI * 2,
        },
      };

      this.updateParticlePosition(particle);
      this.particles.push(particle);
    }

    this._writeBuffers();
  }

  updateParticlePosition(particle) {
    const { theta, r, y, lane = 1 } = particle.userData;
    if (this.streetEnabled) {
      const cx = lane * this.streetSeparation * 0.5;
      particle.position.set(
        cx + r * Math.cos(theta),
        y,
        r * Math.sin(theta) * 0.65,
      );
      return;
    }
    particle.position.set(
      r * Math.cos(theta),
      y,
      r * Math.sin(theta),
    );
  }

  _writeBuffers() {
    this._scratchSamples.length = 0;
    for (let i = 0; i < this.particles.length; i += 1) {
      const particle = this.particles[i];
      const { x, y, z } = particle.position;
      this._positions[i * 3] = x;
      this._positions[i * 3 + 1] = y;
      this._positions[i * 3 + 2] = z;
      this._bloomPositions[i * 3] = x;
      this._bloomPositions[i * 3 + 1] = y;
      this._bloomPositions[i * 3 + 2] = z;
      this._colors[i * 3] = particle.material.color.r;
      this._colors[i * 3 + 1] = particle.material.color.g;
      this._colors[i * 3 + 2] = particle.material.color.b;
      this._bloomColors[i * 3] = particle.material.color.r * 0.4 + 0.15;
      this._bloomColors[i * 3 + 1] = particle.material.color.g * 0.5 + 0.25;
      this._bloomColors[i * 3 + 2] = Math.min(1, particle.material.color.b * 0.35 + 0.6);
      if (i % this._trailStride === 0) {
        this._scratchSamples.push(particle.position);
      }
    }
    if (this._points) {
      this._points.geometry.attributes.position.needsUpdate = true;
      this._points.geometry.attributes.color.needsUpdate = true;
      this._points.material.size = this.pointSize * (0.85 + this.glow * 0.25);
      // Soft translucent — readable MHD streamers without opaque lattice cover.
      this._points.material.opacity = Math.min(0.52, 0.26 + this.glow * 0.22);
    }
    if (this._bloom) {
      this._bloom.geometry.attributes.position.needsUpdate = true;
      this._bloom.geometry.attributes.color.needsUpdate = true;
      this._bloom.material.size = this.bloomSize * (0.8 + this.glow * 0.3);
      this._bloom.material.opacity = Math.min(0.26, 0.1 + this.glow * 0.14);
    }
    this._trails?.updateFromSamples(this._scratchSamples, this.glow * 0.7);
  }

  update(deltaTime = 0.016) {
    this.time += deltaTime;

    for (const particle of this.particles) {
      const data = particle.userData;

      data.theta += data.angularVelocity * deltaTime;

      const radialPulse = Math.sin(this.time * this.radialSpeed + data.radialPhase) * 0.18;
      const currentR = data.r * (1 + radialPulse);
      data._currentR = currentR;

      if (this.streetEnabled) {
        // Streamwise advection + staggered shed offset (looks like a vortex street wake)
        const shed = Math.sin(this.time * this.streetShedRate + data.shedPhase) * 0.35;
        data.stream = (data.stream + deltaTime * this.streetStreamSpeed * (0.7 + this.glow))
          % Math.max(this.height * 1.4, 1);
        data.y = data.stream + shed * data.lane;
        const cx = data.lane * this.streetSeparation * 0.5;
        particle.position.set(
          cx + currentR * Math.cos(data.theta),
          data.y - this.height * 0.35,
          currentR * Math.sin(data.theta) * 0.7 + shed * 0.15,
        );
      } else {
        const verticalOscillation = Math.sin(this.time * this.verticalSpeed + data.radialPhase) * 0.3;
        data.y = data.baseY + verticalOscillation;
        particle.position.set(
          currentR * Math.cos(data.theta),
          data.y,
          currentR * Math.sin(data.theta),
        );
      }

      // Plasma-globe / streamer feel — cooler, less white-hot so lattice stays readable.
      // heatNorm (from temperature_k) shifts cool ion lanes toward warm optical peer.
      const heightFactor = 1 - Math.abs(data.y) / Math.max(this.height, 1e-6);
      const radialFactor = 1 - currentR / Math.max(this.radius, 1e-6);
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 3.2 + data.shedPhase);
      const heat = Number.isFinite(this.heatNorm) ? this.heatNorm : 0;
      // Warm streamer lane vs cool ion lane; heat pulls both toward warm/white peer tint
      const laneHue = data.lane > 0 ? 0.05 : 0.55;
      const hue = (laneHue * (1 - heat * 0.55) + 0.06 * heat)
        + (1 - radialFactor) * 0.08 - heightFactor * 0.03;
      const lightness = 0.32 + heightFactor * 0.18 + pulse * 0.12 * this.glow + heat * 0.12;
      particle.material.color.setHSL(
        Math.max(0, Math.min(0.7, hue)),
        0.78 + pulse * 0.08 - heat * 0.2,
        Math.min(0.68, lightness),
      );
    }

    this._writeBuffers();
  }

  /** Optional: drive soft glow from existing enhancement samples (viz only). */
  setEnhancementGlow(glow) {
    if (Number.isFinite(glow)) this.glow = glow;
  }

  /**
   * Optional heatNorm 0..1 from temperature_k / bubble tint (Flannigan–Suslick peer).
   * Does not invent fusion; presentation mapping only.
   */
  setSoftPlasmaHeat(heatNorm) {
    if (!Number.isFinite(heatNorm)) return;
    this.heatNorm = Math.min(1, Math.max(0, heatNorm));
  }

  getGroup() {
    return this.group;
  }

  dispose() {
    this._trails?.dispose?.();
    this._trails = null;
    if (this._points) {
      this._points.geometry.dispose();
      this._points.material.dispose();
    }
    if (this._bloom) {
      this._bloom.geometry.dispose();
      this._bloom.material.dispose();
    }
    this._softMap?.dispose?.();
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
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
