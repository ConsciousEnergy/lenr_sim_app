/**
 * waveParticleViz.js
 *
 * Presentation-only helpers for soft / wave-like particle rendering in UBLV.
 * Motions and glow may follow existing engine enhancement / phase samples, but
 * this module does NOT implement Navier–Stokes, SPH, PBF, or any CFD solver.
 *
 * Visual inspiration (look only — not coupled solvers):
 * - Soft overlapping Points / ribbons (three.js particle-fluid showcases)
 * - Staggered dual-core wake reminiscent of Kármán vortex streets (schematic)
 *
 * Honesty: schematic_visualization — never proof of LENR / fluid dynamics fidelity.
 */

import * as THREE from 'three';

export const WAVE_PARTICLE_FIDELITY = 'schematic';
export const WAVE_PARTICLE_SOURCE = 'schematic_visualization';

/** Soft disc sprite (radial alpha falloff) for Points / sprites. */
export function createSoftDiscTexture(size = 64) {
  if (typeof document === 'undefined') {
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  // Softer core so additive stacks do not paint opaque white over the lattice.
  gradient.addColorStop(0, 'rgba(255,255,255,0.72)');
  gradient.addColorStop(0.28, 'rgba(255,255,255,0.32)');
  gradient.addColorStop(0.58, 'rgba(255,255,255,0.1)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Map existing enhancement factor → soft glow / trail intensity (viz only).
 * Uses log10 so large enhancement timelines stay visually usable without claiming CFD.
 */
export function enhancementGlowFactor(enhancement, {
  floor = 0.25,
  ceiling = 1.0,
  logDivisor = 6,
} = {}) {
  const value = Number(enhancement);
  if (!Number.isFinite(value) || value <= 1) return floor;
  const t = Math.log10(value) / logDivisor;
  return Math.min(ceiling, Math.max(floor, floor + (ceiling - floor) * t));
}

export function createSoftPointsMaterial({
  color = 0x00e5ff,
  size = 0.28,
  opacity = 0.45,
  map = null,
  depthWrite = false,
} = {}) {
  const params = {
    color,
    size,
    transparent: true,
    opacity,
    depthWrite,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    vertexColors: true,
  };
  if (map) params.map = map;
  return new THREE.PointsMaterial(params);
}

/**
 * Build a soft Points cloud from N seed positions.
 * Returns { points, positions, colors, sizes, dispose }.
 */
export function createSoftParticleCloud({
  count,
  colorHex = 0x00e5ff,
  size = 0.28,
  opacity = 0.8,
  texture = null,
} = {}) {
  const n = Math.max(0, count | 0);
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const base = new THREE.Color(colorHex);

  for (let i = 0; i < n; i += 1) {
    colors[i * 3] = base.r;
    colors[i * 3 + 1] = base.g;
    colors[i * 3 + 2] = base.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const map = texture || createSoftDiscTexture();
  const material = createSoftPointsMaterial({
    color: 0xffffff,
    size,
    opacity,
    map,
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'SoftParticleCloud';
  points.userData = {
    fidelity: WAVE_PARTICLE_FIDELITY,
    source: WAVE_PARTICLE_SOURCE,
  };

  return {
    points,
    positions,
    colors,
    geometry,
    material,
    map,
    dispose() {
      geometry.dispose();
      material.dispose();
      map?.dispose?.();
    },
  };
}

/**
 * GPU-friendly ribbon / trail buffer for N particles × trailLength samples.
 * Renders as LineSegments with head→tail fade (presentation only).
 */
export class WaveRibbonTrailSystem {
  constructor({
    particleCount = 60,
    trailLength = 12,
    colorHex = 0x00e5ff,
    opacity = 0.55,
  } = {}) {
    this.particleCount = particleCount;
    this.trailLength = Math.max(2, trailLength);
    this.histories = Array.from({ length: particleCount }, () => []);
    this.color = new THREE.Color(colorHex);
    this.opacity = opacity;

    const maxVerts = particleCount * (this.trailLength - 1) * 2;
    this.positions = new Float32Array(maxVerts * 3);
    this.colors = new Float32Array(maxVerts * 3);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    this.geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage),
    );
    this.geometry.setDrawRange(0, 0);

    this.material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.lines = new THREE.LineSegments(this.geometry, this.material);
    this.lines.name = 'WaveRibbonTrails';
    this.lines.userData = {
      fidelity: WAVE_PARTICLE_FIDELITY,
      source: WAVE_PARTICLE_SOURCE,
    };
  }

  getGroup() {
    return this.lines;
  }

  /**
   * Push one sample per particle. `samples` is [{x,y,z}|Vector3, ...] length ≤ particleCount.
   * `glow` scales trail brightness (from enhancementGlowFactor).
   */
  updateFromSamples(samples, glow = 0.6) {
    const g = Number.isFinite(glow) ? glow : 0.6;
    this.material.opacity = Math.min(0.5, this.opacity * (0.45 + g * 0.45));

    let write = 0;
    const n = Math.min(this.particleCount, samples?.length || 0);

    for (let i = 0; i < n; i += 1) {
      const sample = samples[i];
      if (!sample) continue;
      const x = sample.x ?? sample[0];
      const y = sample.y ?? sample[1];
      const z = sample.z ?? sample[2];
      if (![x, y, z].every(Number.isFinite)) continue;

      const history = this.histories[i];
      history.push({ x, y, z });
      while (history.length > this.trailLength) history.shift();

      for (let s = 1; s < history.length; s += 1) {
        const a = history[s - 1];
        const b = history[s];
        const t0 = (s - 1) / (this.trailLength - 1);
        const t1 = s / (this.trailLength - 1);
        const fade0 = t0 * g;
        const fade1 = t1 * g;

        this.positions[write * 3] = a.x;
        this.positions[write * 3 + 1] = a.y;
        this.positions[write * 3 + 2] = a.z;
        this.colors[write * 3] = this.color.r * fade0;
        this.colors[write * 3 + 1] = this.color.g * fade0;
        this.colors[write * 3 + 2] = this.color.b * fade0;
        write += 1;

        this.positions[write * 3] = b.x;
        this.positions[write * 3 + 1] = b.y;
        this.positions[write * 3 + 2] = b.z;
        this.colors[write * 3] = this.color.r * fade1;
        this.colors[write * 3 + 1] = this.color.g * fade1;
        this.colors[write * 3 + 2] = this.color.b * fade1;
        write += 1;
      }
    }

    this.geometry.setDrawRange(0, write);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  clear() {
    this.histories.forEach((h) => {
      h.length = 0;
    });
    this.geometry.setDrawRange(0, 0);
  }

  dispose() {
    this.clear();
    this.geometry.dispose();
    this.material.dispose();
  }
}

/**
 * Companion soft cloud + ribbons that mirror Object3D / Mesh particle positions.
 * Keeps existing Mesh state machines intact while presenting a wave-like look.
 */
export class ProtonWaveCompanion {
  constructor({
    particleCount = 60,
    trailLength = 18,
    coreSize = 0.34,
    bloomSize = 0.72,
    trailColor = 0xff8a3d,
  } = {}) {
    this.group = new THREE.Group();
    this.group.name = 'ProtonWaveCompanion';
    this.group.userData = {
      fidelity: WAVE_PARTICLE_FIDELITY,
      source: WAVE_PARTICLE_SOURCE,
    };

    // Soft core + bloom — translucent so lattice host atoms remain readable
    this.cloud = createSoftParticleCloud({
      count: particleCount,
      colorHex: 0xff8a3d,
      size: coreSize,
      opacity: 0.42,
    });
    this.cloud.points.name = 'ProtonSoftCloud';
    this.group.add(this.cloud.points);

    this.bloom = createSoftParticleCloud({
      count: particleCount,
      colorHex: 0x66e0ff,
      size: bloomSize,
      opacity: 0.18,
    });
    this.bloom.points.name = 'ProtonSoftBloom';
    this.group.add(this.bloom.points);

    this.trails = new WaveRibbonTrailSystem({
      particleCount,
      trailLength,
      colorHex: trailColor,
      opacity: 0.32,
    });
    this.group.add(this.trails.getGroup());

    this._scratch = [];
  }

  getGroup() {
    return this.group;
  }

  /**
   * Sync from Mesh children (ProtonPhaseGroup). Softens visual cores and draws ribbons.
   */
  syncFromMeshes(meshes, { glow = 0.5, hideMeshCores = true } = {}) {
    if (!meshes?.length) return;
    const n = Math.min(meshes.length, this.cloud.positions.length / 3);
    this._scratch.length = 0;

    for (let i = 0; i < n; i += 1) {
      const mesh = meshes[i];
      const { x, y, z } = mesh.position;
      this.cloud.positions[i * 3] = x;
      this.cloud.positions[i * 3 + 1] = y;
      this.cloud.positions[i * 3 + 2] = z;
      this.bloom.positions[i * 3] = x;
      this.bloom.positions[i * 3 + 1] = y;
      this.bloom.positions[i * 3 + 2] = z;

      if (mesh.material?.color) {
        this.cloud.colors[i * 3] = mesh.material.color.r;
        this.cloud.colors[i * 3 + 1] = mesh.material.color.g;
        this.cloud.colors[i * 3 + 2] = mesh.material.color.b;
        // Cooler bloom fringe for fluid-sheet read
        this.bloom.colors[i * 3] = mesh.material.color.r * 0.45 + 0.2;
        this.bloom.colors[i * 3 + 1] = mesh.material.color.g * 0.55 + 0.35;
        this.bloom.colors[i * 3 + 2] = Math.min(1, mesh.material.color.b * 0.4 + 0.65);
      }

      if (hideMeshCores && mesh.material) {
        mesh.material.transparent = true;
        mesh.material.opacity = 0.08;
        mesh.material.depthWrite = false;
      }

      this._scratch.push(mesh.position);
    }

    this.cloud.geometry.attributes.position.needsUpdate = true;
    this.cloud.geometry.attributes.color.needsUpdate = true;
    this.bloom.geometry.attributes.position.needsUpdate = true;
    this.bloom.geometry.attributes.color.needsUpdate = true;
    // Cap opacity so additive Points never paint opaque orange over lattice / MHD.
    this.cloud.material.opacity = Math.min(0.38, 0.18 + glow * 0.16);
    this.cloud.material.size = 0.18 + glow * 0.12;
    this.bloom.material.opacity = Math.min(0.2, 0.08 + glow * 0.1);
    this.bloom.material.size = 0.36 + glow * 0.22;
    this.trails.updateFromSamples(this._scratch, glow * 0.55);
  }

  dispose() {
    this.cloud.dispose();
    this.bloom.dispose();
    this.trails.dispose();
  }
}
