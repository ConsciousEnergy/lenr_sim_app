/**
 * phononElectronViz.js
 *
 * Schematic phonon lattice jitter + electron migration soft-flow for UBLV.
 * Amplitude / speed bind to existing samples:
 *   enhancement_breakdown.phonon, temperature_k, radius/compression, electric_field_v_m
 *
 * Does NOT solve phonon modes, MD, or continuum electron transport.
 * Honesty: schematic_visualization — chip as such in HUD.
 */

import * as THREE from 'three';
import {
  createSoftDiscTexture,
  createSoftPointsMaterial,
  WAVE_PARTICLE_FIDELITY,
  WAVE_PARTICLE_SOURCE,
} from './waveParticleViz';

export const PHONON_ELECTRON_FIDELITY = 'schematic';
export const PHONON_ELECTRON_SOURCE = 'schematic_visualization';

/**
 * Map phonon enhancement + T + compression → jitter amplitude (vis units).
 * Caps keep motion subtle (presentation, not MD).
 */
export function phononJitterAmplitude({
  phononFactor = 1,
  temperatureK = 300,
  compressionRatio = 1,
  maxAmp = 0.045,
} = {}) {
  const phonon = Number.isFinite(phononFactor) ? Math.max(1, phononFactor) : 1;
  const temp = Number.isFinite(temperatureK) ? temperatureK : 300;
  const comp = Number.isFinite(compressionRatio) ? Math.max(1, compressionRatio) : 1;
  const phononTerm = Math.log10(phonon) / 2; // ~0 at 1, ~1 at 100
  const tempTerm = Math.min(1, Math.max(0, (temp - 300) / 5000));
  const compTerm = Math.min(1, Math.log10(comp + 1) / 2);
  const raw = 0.008 + 0.02 * phononTerm + 0.012 * tempTerm + 0.015 * compTerm;
  return Math.min(maxAmp, Math.max(0.004, raw));
}

/**
 * Build per-site displacement array for InstancedMesh (schematic phonon).
 * Phase varies by site index for a wave-like look — not exported eigenvectors.
 */
export function buildPhononJitterDisplacements(sites, {
  time = 0,
  amplitude = 0.02,
  frequency = 4.5,
} = {}) {
  if (!sites?.length) return [];
  const amp = Number.isFinite(amplitude) ? amplitude : 0.02;
  const freq = Number.isFinite(frequency) ? frequency : 4.5;
  const t = Number.isFinite(time) ? time : 0;
  return sites.map((site, i) => {
    const phase = i * 0.73 + (site.ix || 0) * 0.4 + (site.iy || 0) * 0.55;
    const wobble = Math.sin(t * freq + phase);
    const wobble2 = Math.cos(t * freq * 1.17 + phase * 1.3);
    return {
      x: amp * wobble,
      y: amp * 0.65 * wobble2,
      z: amp * 0.85 * Math.sin(t * freq * 0.91 + phase * 0.8),
    };
  });
}

/**
 * Soft charge-flow cloud along schematic field lines (electron migration look).
 * Speed scales with |E| when provided; otherwise idle drift.
 */
export class ElectronMigrationCloud {
  constructor({
    count = 36,
    lineCount = 12,
    size = 0.2,
    colorHex = 0x88eeff,
  } = {}) {
    this.count = count;
    this.lineCount = lineCount;
    this.group = new THREE.Group();
    this.group.name = 'ElectronMigrationGroup';
    this.group.userData = {
      fidelity: PHONON_ELECTRON_FIDELITY,
      source: PHONON_ELECTRON_SOURCE,
    };
    this._map = createSoftDiscTexture(64);
    this._positions = new Float32Array(count * 3);
    this._colors = new Float32Array(count * 3);
    const base = new THREE.Color(colorHex);
    for (let i = 0; i < count; i += 1) {
      this._colors[i * 3] = base.r;
      this._colors[i * 3 + 1] = base.g;
      this._colors[i * 3 + 2] = base.b;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this._positions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    geometry.setAttribute('color', new THREE.BufferAttribute(this._colors, 3));
    this._material = createSoftPointsMaterial({
      color: 0xffffff,
      size,
      opacity: 0.4,
      map: this._map,
    });
    this._points = new THREE.Points(geometry, this._material);
    this._points.name = 'ElectronMigrationSoftCloud';
    this.group.add(this._points);

    this._proxies = [];
    for (let i = 0; i < count; i += 1) {
      this._proxies.push({
        t: Math.random(),
        speed: 0.015 + Math.random() * 0.025,
        lineIndex: i % lineCount,
      });
    }
  }

  getGroup() {
    return this.group;
  }

  /**
   * @param {object} opts
   * @param {number} [opts.electricFieldVPerM]
   * @param {number} [opts.enhancement]
   * @param {boolean} [opts.reversed] - rebound / reverse flow
   * @param {number} [opts.latticeY]
   */
  update({
    electricFieldVPerM = 0,
    enhancement = 1,
    reversed = false,
    latticeY = -3.5,
  } = {}) {
    const eMag = Math.abs(Number(electricFieldVPerM) || 0);
    const eNorm = Math.min(1, Math.log10(eMag + 1) / 12); // ~1 at 1e12 V/m
    const enh = Number.isFinite(enhancement) ? enhancement : 1;
    const enhNorm = Math.min(1, Math.log10(Math.max(enh, 1)) / 6);
    const speedScale = 0.6 + eNorm * 1.8 + enhNorm * 0.8;
    this._material.opacity = Math.min(0.48, 0.22 + eNorm * 0.18 + enhNorm * 0.12);
    this._material.size = 0.12 + eNorm * 0.1;

    for (let i = 0; i < this.count; i += 1) {
      const p = this._proxies[i];
      p.t += p.speed * speedScale * (reversed ? -1 : 1);
      if (p.t > 1) p.t -= 1;
      if (p.t < 0) p.t += 1;
      const t = p.t;
      const angle = (p.lineIndex / this.lineCount) * Math.PI * 2;
      const lineRadius = 1.35 * (1 - t * 0.28);
      // Bubble (~y high) → lattice surface (y → latticeY)
      const y = reversed
        ? latticeY + t * 5.5
        : 2.2 - t * (2.2 - latticeY);
      this._positions[i * 3] = lineRadius * Math.cos(angle);
      this._positions[i * 3 + 1] = y;
      this._positions[i * 3 + 2] = lineRadius * Math.sin(angle);
    }
    this._points.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this._points.geometry.dispose();
    this._material.dispose();
    this._map?.dispose?.();
  }
}

export { WAVE_PARTICLE_FIDELITY, WAVE_PARTICLE_SOURCE };
