/**
 * phononElectronViz.js
 *
 * Schematic phonon lattice motion + electron migration soft-flow for UBLV.
 * Amplitude / mix bind to existing samples:
 *   enhancement_breakdown.phonon, temperature_k, radius/compression, electric_field_v_m,
 *   loading_ratio, literature T_m (cite-only — never invents f_L)
 *
 * Standing-wave cue (acoustic + optical) spans the material-size lattice —
 * NOT exported eigenvectors, MD, or continuum transport.
 * Honesty: schematic_visualization / contested — chip as such in HUD.
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
export const PHONON_CLAIM_TAG = 'schematic / contested';

/** HUD chip copy — keep in sync with UnifiedBubbleLatticeVisualization. */
export const PHONON_STANDING_CHIP = 'Phonon · acoustic+optical standing (contested)';
export const PHONON_WAVEGUIDE_CHIP = 'Waveguide · catalyst schematic';
export const PHONON_MELT_CHIP = 'Near T_m · schematic (not f_L)';

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function finiteOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Map phonon enhancement + T + compression → jitter amplitude (vis units).
 * Raised so standing-wave lattice modes read clearly on HSE canvas.
 */
export function phononJitterAmplitude({
  phononFactor = 1,
  temperatureK = 300,
  compressionRatio = 1,
  maxAmp = 0.32,
} = {}) {
  const phonon = Math.max(1, finiteOr(phononFactor, 1));
  const temp = finiteOr(temperatureK, 300);
  const comp = Math.max(1, finiteOr(compressionRatio, 1));
  const phononTerm = Math.log10(phonon) / 2; // ~0 at 1, ~1 at 100
  const tempTerm = clamp01((temp - 300) / 5000);
  const compTerm = clamp01(Math.log10(comp + 1) / 2);
  // Large enough that material-size standing waves read on HSE canvas stills.
  const raw = 0.06 + 0.1 * phononTerm + 0.06 * tempTerm + 0.07 * compTerm;
  return Math.min(maxAmp, Math.max(0.05, raw));
}

/**
 * Acoustic vs optical mix from engine phonon factor (presentation weights).
 * Higher phonon enhancement → more optical (short-λ out-of-phase) share.
 */
export function phononModeMix({ phononFactor = 1 } = {}) {
  const phonon = Math.max(1, finiteOr(phononFactor, 1));
  const opticalShare = clamp01(0.28 + Math.log10(phonon) / 3.2);
  return {
    acousticWeight: 1 - opticalShare,
    opticalWeight: opticalShare,
  };
}

/**
 * Presentation frequencies (rad-ish units in viz time) from phonon factor.
 * Acoustic stays lower (long-λ); optical rises faster with enhancement.
 */
export function phononModeFrequencies({ phononFactor = 1 } = {}) {
  const logP = Math.log10(Math.max(finiteOr(phononFactor, 1), 1));
  return {
    acousticFreq: 2.4 + Math.min(1.2, logP * 0.35),
    opticalFreq: 6.5 + Math.min(2.5, logP * 0.55),
  };
}

/**
 * Literature T_m proximity (0..1) — softening cue only.
 * Does NOT invent phase_fraction_liquid / melt morph.
 */
export function meltProximityNorm({
  temperatureK = 300,
  meltingPointK = null,
} = {}) {
  const tm = finiteOr(meltingPointK, NaN);
  if (!Number.isFinite(tm) || tm <= 0) return 0;
  const t = finiteOr(temperatureK, 300);
  // Soften in the last ~25% below T_m; still solid lattice unless f_L supplied.
  const start = tm * 0.75;
  return clamp01((t - start) / Math.max(tm - start, 1));
}

/**
 * Catalyst-as-waveguide envelope from loading + phonon samples (schematic).
 * Preferential axis amplitude — not a verified LENR waveguide claim.
 */
export function waveguideEnvelopeNorm({
  loadingRatio = 0.5,
  phononFactor = 1,
} = {}) {
  const load = clamp01(finiteOr(loadingRatio, 0.5));
  const phonon = Math.max(1, finiteOr(phononFactor, 1));
  const phononTerm = clamp01(Math.log10(phonon) / 2.5);
  return clamp01(0.2 + load * 0.45 + phononTerm * 0.4);
}

/**
 * Single engine-sample → standing-wave viz param resolver.
 * Keeps UBLV tick path from inventing ad-hoc mixes; never invents f_L.
 */
export function resolvePhononStandingWaveParams({
  phononFactor = 1,
  temperatureK = 300,
  compressionRatio = 1,
  loadingRatio = 0.5,
  meltingPointK = null,
  phononScale = 1,
  amplitudeFloor = 0.14,
} = {}) {
  const phonon = Math.max(1, finiteOr(phononFactor, 1));
  const mix = phononModeMix({ phononFactor: phonon });
  const freqs = phononModeFrequencies({ phononFactor: phonon });
  const meltSoftening = meltProximityNorm({ temperatureK, meltingPointK });
  const waveguideNorm = waveguideEnvelopeNorm({ loadingRatio, phononFactor: phonon });
  const rawAmp = phononJitterAmplitude({
    phononFactor: phonon,
    temperatureK,
    compressionRatio,
  }) * Math.max(0, finiteOr(phononScale, 1));
  // Presentation floor so material-size modes stay readable at low samples.
  const amplitude = Math.max(amplitudeFloor, rawAmp);

  return {
    phononFactor: phonon,
    amplitude,
    acousticWeight: mix.acousticWeight,
    opticalWeight: mix.opticalWeight,
    acousticFreq: freqs.acousticFreq,
    opticalFreq: freqs.opticalFreq,
    waveguideNorm,
    meltSoftening,
    inventsLiquidFraction: false,
    fidelity: PHONON_ELECTRON_FIDELITY,
    source: PHONON_ELECTRON_SOURCE,
    claimTag: PHONON_CLAIM_TAG,
  };
}

/**
 * Infer lattice index extents from rest sites (material-size standing wave).
 */
export function latticeIndexExtents(sites) {
  if (!sites?.length) {
    return { maxIx: 1, maxIy: 1, maxIz: 1 };
  }
  let maxIx = 0;
  let maxIy = 0;
  let maxIz = 0;
  for (const site of sites) {
    maxIx = Math.max(maxIx, site.ix || 0);
    maxIy = Math.max(maxIy, site.iy || 0);
    maxIz = Math.max(maxIz, site.iz || 0);
  }
  return {
    maxIx: Math.max(1, maxIx),
    maxIy: Math.max(1, maxIy),
    maxIz: Math.max(1, maxIz),
  };
}

/**
 * Neighbor phase product for one axis-adjacent pair (test / HUD helper).
 * Acoustic-dominated → typically ≥ 0 (in-phase); optical → typically < 0.
 */
export function neighborDisplacementPhaseProduct(dispA, dispB, axis = 'x') {
  const a = finiteOr(dispA?.[axis], 0);
  const b = finiteOr(dispB?.[axis], 0);
  return a * b;
}

/**
 * Material-size standing-wave displacements (acoustic + optical).
 *
 * Acoustic: long-λ — neighbors largely in phase across the lattice span
 *   u_a ∝ sin(π ix/N_x) sin(π iy/N_y) sin(ω_a t)
 * Optical: short-λ — nearest neighbors out of phase
 *   u_o ∝ (-1)^(ix+iy+iz) sin(ω_o t)
 *
 * Returns displacements + modeEnergy plus per-mode energies for dual tint.
 * Schematic / contested — not MD eigenvectors.
 */
export function buildPhononStandingWaveDisplacements(sites, {
  time = 0,
  amplitude = 0.08,
  acousticWeight = 0.55,
  opticalWeight = 0.45,
  acousticFreq = 2.6,
  opticalFreq = 7.2,
  waveguideNorm = 0.4,
  meltSoftening = 0,
} = {}) {
  if (!sites?.length) {
    return {
      displacements: [],
      modeEnergy: [],
      acousticEnergy: [],
      opticalEnergy: [],
    };
  }

  const amp = Math.max(0, finiteOr(amplitude, 0.08)) * (1 + meltSoftening * 0.55);
  const aw = Math.max(0, finiteOr(acousticWeight, 0.55));
  const ow = Math.max(0, finiteOr(opticalWeight, 0.45));
  const t = finiteOr(time, 0);
  const wg = clamp01(finiteOr(waveguideNorm, 0.4));
  const { maxIx, maxIy, maxIz } = latticeIndexExtents(sites);

  // Fundamental standing wave across material span (k = π / N) — long-λ acoustic.
  const kx = Math.PI / maxIx;
  const ky = Math.PI / maxIy;
  const kz = Math.PI / Math.max(maxIz, 1);

  const displacements = [];
  const modeEnergy = [];
  const acousticEnergy = [];
  const opticalEnergy = [];

  const acousticOsc = Math.sin(t * acousticFreq);
  const acousticOscY = Math.cos(t * acousticFreq * 0.92);

  for (let i = 0; i < sites.length; i += 1) {
    const site = sites[i];
    const ix = site.ix || 0;
    const iy = site.iy || 0;
    const iz = site.iz || 0;

    // Acoustic envelope — smooth long-λ; neighbors share sign over most of span.
    const acousticEnv = Math.sin(kx * ix)
      * Math.sin(ky * iy + 0.15)
      * (maxIz > 0 ? Math.sin(kz * iz + 0.08) : 1);
    const acoustic = acousticEnv * acousticOsc;

    // Optical — staggered nearest-neighbor antiphase (zone-boundary cue).
    const stagger = ((ix + iy + iz) % 2 === 0) ? 1 : -1;
    const opticalOsc = Math.sin(t * opticalFreq + ix * 0.2);
    const optical = stagger * opticalOsc
      * (0.55 + 0.45 * Math.abs(Math.sin(kx * ix * 2)));

    const mix = aw * acoustic + ow * optical;
    // Waveguide preference along x (catalyst host axis schematic)
    const xAmp = amp * (1 + wg * 0.55);
    const yAmp = amp * (0.85 + meltSoftening * 0.25);
    const zAmp = amp * (0.75 + wg * 0.2);

    const dx = xAmp * mix;
    const dy = yAmp * (aw * acousticEnv * acousticOscY + ow * optical * 0.7);
    const dz = zAmp * (aw * Math.sin(kz * iz) * acousticOsc * 0.65 + ow * optical * 0.55);

    displacements.push({ x: dx, y: dy, z: dz });

    const aE = clamp01(Math.abs(acoustic) * aw);
    const oE = clamp01(Math.abs(optical) * ow);
    acousticEnergy.push(aE);
    opticalEnergy.push(oE);
    // Combined tint energy — optical share biases warm channel in phononModeTintRgb.
    modeEnergy.push(clamp01(aE * 0.55 + oE * 0.85 + Math.abs(mix) * 0.35));
  }

  return { displacements, modeEnergy, acousticEnergy, opticalEnergy };
}

/**
 * Legacy jitter API — now delegates to standing-wave builder for a visible
 * material-size mode cue (still schematic / contested).
 */
export function buildPhononJitterDisplacements(sites, {
  time = 0,
  amplitude = 0.08,
  frequency = 4.5,
  phononFactor = 1,
  waveguideNorm = 0.4,
  meltSoftening = 0,
} = {}) {
  const mix = phononModeMix({ phononFactor });
  const { displacements } = buildPhononStandingWaveDisplacements(sites, {
    time,
    amplitude,
    acousticWeight: mix.acousticWeight,
    opticalWeight: mix.opticalWeight,
    acousticFreq: Math.max(1.8, finiteOr(frequency, 4.5) * 0.55),
    opticalFreq: Math.max(4.5, finiteOr(frequency, 4.5) * 1.45),
    waveguideNorm,
    meltSoftening,
  });
  return displacements;
}

/**
 * Blend occupancy RGB with phonon mode energy.
 * Acoustic-leaning → cooler cyan lift; optical-leaning → warmer amber pulse.
 */
export function phononModeTintRgb(baseRgb, modeEnergy = 0, opticalWeight = 0.4) {
  const e = clamp01(modeEnergy);
  const ow = clamp01(opticalWeight);
  const acousticLift = 1 - ow;
  return {
    r: Math.min(1, baseRgb.r * (1 - e * 0.25) + e * (0.35 * acousticLift + 0.85 * ow)),
    g: Math.min(1, baseRgb.g * (1 - e * 0.15) + e * (0.55 * acousticLift + 0.4 * ow)),
    b: Math.min(1, baseRgb.b * (1 - e * 0.2) + e * (0.9 * acousticLift + 0.35 * ow)),
  };
}

/**
 * Dual-channel tint from separate acoustic / optical mode energies.
 * Readable mode separation without claiming MD eigenvectors.
 */
export function phononDualModeTintRgb(
  baseRgb,
  acousticEnergy = 0,
  opticalEnergy = 0,
) {
  const aE = clamp01(acousticEnergy);
  const oE = clamp01(opticalEnergy);
  const total = Math.max(aE + oE, 1e-6);
  const ow = oE / total;
  return phononModeTintRgb(baseRgb, clamp01(aE * 0.55 + oE * 0.9), ow);
}

/**
 * Soft axial waveguide ribbon along host lattice (catalyst-as-waveguide cue).
 * Schematic only — not a verified LENR waveguide.
 */
export function createPhononWaveguideRibbon({
  span = 4,
  y = 0,
  colorHex = 0xffcc66,
} = {}) {
  const half = Math.max(1, span) * 0.55;
  const positions = new Float32Array([
    -half, y, 0,
    half, y, 0,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const line = new THREE.Line(geometry, material);
  line.name = 'PhononWaveguideRibbon';
  line.userData = {
    fidelity: PHONON_ELECTRON_FIDELITY,
    source: PHONON_ELECTRON_SOURCE,
    claim: 'catalyst_waveguide_schematic',
  };
  return line;
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
