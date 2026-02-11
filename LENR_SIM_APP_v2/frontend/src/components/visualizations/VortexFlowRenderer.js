/**
 * VortexFlowRenderer.js
 * 
 * Visualization component for vortex particle flow during bubble cavitation.
 * Inspired by arXiv:2505.21946 - "Vortex Particle Flow Maps" (SIGGRAPH 2025)
 * 
 * Features:
 * - Particle trails showing vorticity magnitude (color-coded)
 * - Spiral convergence toward cavitation point
 * - Turbulence visualization during collapse
 * - Field line integration with vortex flow
 */

import * as THREE from 'three';

// Vortex visualization constants
const VORTEX_COLORS = {
  low: new THREE.Color(0x0044ff),      // Blue - low vorticity
  medium: new THREE.Color(0x00ff88),   // Cyan/Green - medium
  high: new THREE.Color(0xff8800),     // Orange - high
  extreme: new THREE.Color(0xff0044),  // Red - extreme
};

const TRAIL_LENGTH = 50;
const MAX_TRAIL_OPACITY = 0.8;
const MIN_TRAIL_OPACITY = 0.1;

/**
 * Get color based on vorticity magnitude
 */
function getVorticityColor(vorticity, maxVorticity) {
  const normalized = Math.min(vorticity / maxVorticity, 1);
  
  if (normalized < 0.25) {
    return VORTEX_COLORS.low.clone().lerp(VORTEX_COLORS.medium, normalized * 4);
  } else if (normalized < 0.5) {
    return VORTEX_COLORS.medium.clone().lerp(VORTEX_COLORS.high, (normalized - 0.25) * 4);
  } else {
    return VORTEX_COLORS.high.clone().lerp(VORTEX_COLORS.extreme, (normalized - 0.5) * 2);
  }
}

/**
 * VortexParticle class - represents a single vortex-carrying particle
 */
class VortexParticle {
  constructor(position, vorticity = new THREE.Vector3()) {
    this.position = position.clone();
    this.velocity = new THREE.Vector3();
    this.vorticity = vorticity.clone();
    this.trail = [position.clone()];
    this.state = 'dispersed';
    this.circulation = 0;
  }
  
  updateTrail() {
    this.trail.push(this.position.clone());
    if (this.trail.length > TRAIL_LENGTH) {
      this.trail.shift();
    }
  }
  
  getVorticityMagnitude() {
    return this.vorticity.length();
  }
}

/**
 * VortexFlowRenderer - Main renderer class for vortex visualization
 */
class VortexFlowRenderer {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = {
      particleCount: options.particleCount || 50,
      trailEnabled: options.trailEnabled !== false,
      fieldLinesEnabled: options.fieldLinesEnabled !== false,
      maxVorticity: options.maxVorticity || 10.0,
      particleSize: options.particleSize || 0.08,
      ...options
    };
    
    this.particles = [];
    this.particleMeshes = [];
    this.trailLines = [];
    this.fieldLines = [];
    this.vortexGroup = new THREE.Group();
    this.vortexGroup.name = 'VortexFlowGroup';
    
    this.cavitationPoint = new THREE.Vector3(0, -3, 0);
    this.time = 0;
    
    this._initParticles();
    this._initTrails();
    if (this.options.fieldLinesEnabled) {
      this._initFieldLines();
    }
    
    scene.add(this.vortexGroup);
  }
  
  _initParticles() {
    const geometry = new THREE.SphereGeometry(this.options.particleSize, 8, 8);
    
    for (let i = 0; i < this.options.particleCount; i++) {
      // Initial position: shell around bubble center
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.5 + Math.random() * 1.0;
      
      const position = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        2 + r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
      
      // Initial vorticity: tangential
      const toCenter = new THREE.Vector3(0, 2, 0).sub(position).normalize();
      const tangent = new THREE.Vector3(0, 1, 0).cross(toCenter).normalize();
      const vorticity = tangent.multiplyScalar(Math.random() * 2);
      
      const particle = new VortexParticle(position, vorticity);
      particle.velocity.set(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02
      );
      particle.circulation = Math.random() * 0.5;
      
      this.particles.push(particle);
      
      // Create mesh
      const material = new THREE.MeshPhongMaterial({
        color: VORTEX_COLORS.low,
        emissive: VORTEX_COLORS.low,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.9,
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      mesh.userData = { particleIndex: i };
      
      this.particleMeshes.push(mesh);
      this.vortexGroup.add(mesh);
    }
  }
  
  _initTrails() {
    if (!this.options.trailEnabled) return;
    
    for (let i = 0; i < this.options.particleCount; i++) {
      const trailGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(TRAIL_LENGTH * 3);
      const colors = new Float32Array(TRAIL_LENGTH * 3);
      
      trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      trailGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      
      const trailMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        linewidth: 1,
      });
      
      const trailLine = new THREE.Line(trailGeometry, trailMaterial);
      this.trailLines.push(trailLine);
      this.vortexGroup.add(trailLine);
    }
  }
  
  _initFieldLines() {
    // Create field lines showing vortex tubes
    const numFieldLines = 12;
    
    for (let i = 0; i < numFieldLines; i++) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 3, 0),
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, -3, 0),
      ]);
      
      const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.02, 8, false);
      const tubeMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.3,
        wireframe: true,
      });
      
      const fieldLine = new THREE.Mesh(tubeGeometry, tubeMaterial);
      
      // Rotate around Y axis
      const angle = (i / numFieldLines) * Math.PI * 2;
      fieldLine.rotation.y = angle;
      fieldLine.position.x = Math.cos(angle) * 0.5;
      fieldLine.position.z = Math.sin(angle) * 0.5;
      
      this.fieldLines.push(fieldLine);
      this.vortexGroup.add(fieldLine);
    }
  }
  
  setCavitationPoint(point) {
    this.cavitationPoint.copy(point);
  }
  
  /**
   * Update particle positions and vorticity
   * @param {number} dt - Time step
   * @param {string} phase - Current collapse phase
   * @param {number} compressionRatio - Current compression ratio
   * @param {number} fieldStrength - Electric field strength
   */
  update(dt, phase = 'EXPANSION', compressionRatio = 1.0, fieldStrength = 1e8) {
    this.time += dt;
    
    const isCollapsing = phase === 'COLLAPSE' || phase === 'MINIMUM';
    const isRebounding = phase === 'REBOUND';
    
    // Compute maximum vorticity for color scaling
    let maxVorticity = 0;
    this.particles.forEach(p => {
      maxVorticity = Math.max(maxVorticity, p.getVorticityMagnitude());
    });
    maxVorticity = Math.max(maxVorticity, 0.1);
    
    this.particles.forEach((particle, index) => {
      // Direction to cavitation point
      const toCavitation = this.cavitationPoint.clone().sub(particle.position);
      const distance = toCavitation.length();
      const direction = toCavitation.normalize();
      
      // Update state based on phase and distance
      if (isCollapsing) {
        if (distance < 0.5) {
          particle.state = 'confined';
        } else if (distance < 2) {
          particle.state = 'spiral';
        } else {
          particle.state = 'converging';
        }
      } else if (isRebounding) {
        particle.state = 'reexpanding';
      } else {
        particle.state = 'dispersed';
      }
      
      // Compute forces based on state
      let radialForce = new THREE.Vector3();
      let tangentialForce = new THREE.Vector3();
      
      if (isCollapsing) {
        // Radial confinement force (toward cavitation)
        const confinementStrength = 0.05 * compressionRatio;
        radialForce = direction.clone().multiplyScalar(confinementStrength / (distance + 0.1));
        
        // Tangential force (spiral motion)
        const tangent = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
        const spiralStrength = 0.02 * compressionRatio / (distance + 0.1);
        tangentialForce = tangent.multiplyScalar(spiralStrength);
        
        // Vorticity stretching (intensification)
        const stretchFactor = 1 + 0.1 * compressionRatio * dt;
        particle.vorticity.multiplyScalar(stretchFactor);
      } else if (isRebounding) {
        // Outward push during rebound
        radialForce = direction.clone().multiplyScalar(-0.02);
        particle.vorticity.multiplyScalar(0.95); // Decay
      } else {
        // Random walk during expansion/recovery
        radialForce.set(
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01
        );
        particle.vorticity.multiplyScalar(0.99); // Slow decay
      }
      
      // Apply forces to velocity
      particle.velocity.add(radialForce);
      particle.velocity.add(tangentialForce);
      
      // Damping
      const damping = isCollapsing ? 0.98 : 0.95;
      particle.velocity.multiplyScalar(damping);
      
      // Update position
      particle.position.add(particle.velocity.clone().multiplyScalar(dt * 60));
      
      // Update trail
      particle.updateTrail();
      
      // Update mesh position and color
      const mesh = this.particleMeshes[index];
      mesh.position.copy(particle.position);
      
      // Color based on vorticity magnitude
      const color = getVorticityColor(particle.getVorticityMagnitude(), maxVorticity);
      mesh.material.color.copy(color);
      mesh.material.emissive.copy(color);
      
      // Size pulse for high vorticity
      const pulseScale = 1 + 0.3 * Math.sin(this.time * 10) * (particle.getVorticityMagnitude() / maxVorticity);
      mesh.scale.setScalar(pulseScale);
      
      // Update emissive intensity based on state
      if (particle.state === 'confined') {
        mesh.material.emissiveIntensity = 0.8;
      } else if (particle.state === 'spiral') {
        mesh.material.emissiveIntensity = 0.5;
      } else {
        mesh.material.emissiveIntensity = 0.2;
      }
      
      // Update trail line
      if (this.options.trailEnabled && this.trailLines[index]) {
        this._updateTrailLine(index, particle, maxVorticity);
      }
    });
    
    // Update field lines
    if (this.options.fieldLinesEnabled) {
      this._updateFieldLines(compressionRatio, phase);
    }
  }
  
  _updateTrailLine(index, particle, maxVorticity) {
    const trailLine = this.trailLines[index];
    const positions = trailLine.geometry.attributes.position.array;
    const colors = trailLine.geometry.attributes.color.array;
    
    const trail = particle.trail;
    const color = getVorticityColor(particle.getVorticityMagnitude(), maxVorticity);
    
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      if (i < trail.length) {
        const point = trail[trail.length - 1 - i];
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;
        
        // Fade color along trail
        const fade = 1 - (i / TRAIL_LENGTH);
        colors[i * 3] = color.r * fade;
        colors[i * 3 + 1] = color.g * fade;
        colors[i * 3 + 2] = color.b * fade;
      } else {
        // Hide unused trail points
        positions[i * 3] = particle.position.x;
        positions[i * 3 + 1] = particle.position.y;
        positions[i * 3 + 2] = particle.position.z;
        colors[i * 3] = 0;
        colors[i * 3 + 1] = 0;
        colors[i * 3 + 2] = 0;
      }
    }
    
    trailLine.geometry.attributes.position.needsUpdate = true;
    trailLine.geometry.attributes.color.needsUpdate = true;
  }
  
  _updateFieldLines(compressionRatio, phase) {
    const isCollapsing = phase === 'COLLAPSE' || phase === 'MINIMUM';
    
    this.fieldLines.forEach((fieldLine, i) => {
      // Compress field lines toward center during collapse
      const scale = isCollapsing ? 1 / compressionRatio : 1;
      fieldLine.scale.set(scale, 1, scale);
      
      // Rotate slowly
      fieldLine.rotation.y += 0.01;
      
      // Pulse opacity
      const opacity = 0.2 + 0.2 * Math.sin(this.time * 5 + i * 0.5);
      fieldLine.material.opacity = isCollapsing ? opacity * compressionRatio : opacity;
    });
  }
  
  /**
   * Get particle data for external use (e.g., API sync)
   */
  getParticleData() {
    return this.particles.map(p => ({
      position: [p.position.x, p.position.y, p.position.z],
      velocity: [p.velocity.x, p.velocity.y, p.velocity.z],
      vorticity: [p.vorticity.x, p.vorticity.y, p.vorticity.z],
      state: p.state,
      circulation: p.circulation,
    }));
  }
  
  /**
   * Set particle data from external source (e.g., API)
   */
  setParticleData(data) {
    if (!data || data.length !== this.particles.length) return;
    
    data.forEach((d, i) => {
      if (d.position) {
        this.particles[i].position.set(d.position[0], d.position[1], d.position[2]);
      }
      if (d.velocity) {
        this.particles[i].velocity.set(d.velocity[0], d.velocity[1], d.velocity[2]);
      }
      if (d.vorticity) {
        this.particles[i].vorticity.set(d.vorticity[0], d.vorticity[1], d.vorticity[2]);
      }
      if (d.state) {
        this.particles[i].state = d.state;
      }
    });
  }
  
  /**
   * Set visibility of vortex visualization
   */
  setVisible(visible) {
    this.vortexGroup.visible = visible;
  }
  
  /**
   * Cleanup resources
   */
  dispose() {
    this.particleMeshes.forEach(mesh => {
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    
    this.trailLines.forEach(line => {
      line.geometry.dispose();
      line.material.dispose();
    });
    
    this.fieldLines.forEach(line => {
      line.geometry.dispose();
      line.material.dispose();
    });
    
    this.scene.remove(this.vortexGroup);
  }
}

/**
 * Create convergence zone visualization
 * Shows the funnel-shaped region where protons converge
 */
function createConvergenceZone(cavitationPoint, compressionRatio = 1.0) {
  const group = new THREE.Group();
  group.name = 'ConvergenceZone';
  
  // Cone geometry for convergence zone
  const radius = 2 / compressionRatio;
  const height = 4 / Math.sqrt(compressionRatio);
  
  const coneGeometry = new THREE.ConeGeometry(radius, height, 32, 1, true);
  const coneMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
    wireframe: true,
  });
  
  const cone = new THREE.Mesh(coneGeometry, coneMaterial);
  cone.position.copy(cavitationPoint);
  cone.position.y += height / 2;
  cone.rotation.x = Math.PI; // Point downward
  
  group.add(cone);
  
  // Add spiral guides
  const spiralCurve = [];
  for (let t = 0; t < Math.PI * 4; t += 0.1) {
    const r = radius * (1 - t / (Math.PI * 4));
    const y = height * (t / (Math.PI * 4));
    spiralCurve.push(new THREE.Vector3(
      r * Math.cos(t),
      cavitationPoint.y + y,
      r * Math.sin(t)
    ));
  }
  
  const spiralGeometry = new THREE.BufferGeometry().setFromPoints(spiralCurve);
  const spiralMaterial = new THREE.LineBasicMaterial({
    color: 0xff8800,
    transparent: true,
    opacity: 0.5,
  });
  
  const spiral = new THREE.Line(spiralGeometry, spiralMaterial);
  group.add(spiral);
  
  return group;
}

/**
 * Create cavitation site marker
 */
function createCavitationSiteMarker(position) {
  const group = new THREE.Group();
  group.name = 'CavitationSiteMarker';
  
  // Glowing sphere at cavitation point
  const sphereGeometry = new THREE.SphereGeometry(0.15, 16, 16);
  const sphereMaterial = new THREE.MeshBasicMaterial({
    color: 0xff4400,
    transparent: true,
    opacity: 0.8,
  });
  
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.copy(position);
  group.add(sphere);
  
  // Outer glow
  const glowGeometry = new THREE.SphereGeometry(0.3, 16, 16);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xff8800,
    transparent: true,
    opacity: 0.3,
  });
  
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.copy(position);
  group.add(glow);
  
  // Crosshair lines
  const lineLength = 0.5;
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
  
  const directions = [
    [new THREE.Vector3(-lineLength, 0, 0), new THREE.Vector3(lineLength, 0, 0)],
    [new THREE.Vector3(0, -lineLength, 0), new THREE.Vector3(0, lineLength, 0)],
    [new THREE.Vector3(0, 0, -lineLength), new THREE.Vector3(0, 0, lineLength)],
  ];
  
  directions.forEach(([start, end]) => {
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      start.clone().add(position),
      end.clone().add(position),
    ]);
    const line = new THREE.Line(lineGeometry, lineMaterial);
    group.add(line);
  });
  
  return group;
}

export {
  VortexFlowRenderer,
  VortexParticle,
  createConvergenceZone,
  createCavitationSiteMarker,
  getVorticityColor,
  VORTEX_COLORS,
};

export default VortexFlowRenderer;
