/**
 * shedTorusCascadeViz.js
 *
 * Schematic ejected-torus cascade: twist/fold (not rigid flippers),
 * parent → daughter → tertiary rings, eddy / stretch-tensor cues.
 *
 * Research peers (presentation only — NOT solving NS/VOF):
 *  - Vortex-ring collision cascade: tent → thin sheet → secondary/tertiary
 *    filaments (Lim & Nickels–class experiments; arXiv:1802.09973).
 *  - Two-phase vortex bubble-ring reconnection / daughter pinch (JFM).
 *  - Sub-bubble eddy fragmentation in turbulence (Nat Commun 2022).
 *
 * Honesty: schematic_visualization; plasma ≠ fusion; EQ-OPEN untouched.
 */

import * as THREE from 'three';
import { createSoftDiscTexture } from './waveParticleViz';

export const SHED_CASCADE_FIDELITY = 'schematic';
export const SHED_CASCADE_SOURCE = 'schematic_visualization';

export const SHED_CASCADE_CHIP = 'cascade · twist/fold · schematic';
export const SHED_CASCADE_CHIP_TOOLTIP =
  'Ejected rings twist/fold (tent→sheet peer) and cascade into daughter/tertiary '
  + 'tori with eddy cues — schematic of vortex-ring cascade / two-phase reconnection '
  + 'literature, NOT a Navier–Stokes or VOF solve. Uncolored shed; plasma ≠ fusion; '
  + 'EQ-OPEN untouched.';

export const SHED_EDDY_CHIP = 'eddies · stretch tensor · schematic';
export const SHED_EDDY_CHIP_TOOLTIP =
  'Soft eddy Points + anisotropic stretch (presentation strain cue). Not a '
  + 'resolved Reynolds-stress / LES tensor field.';

/**
 * Cascade stage across local shed riseT 0..1.
 * @returns {{
 *   twist: number,
 *   fold: number,
 *   tent: number,
 *   sheet: number,
 *   daughterGate: number,
 *   tertiaryGate: number,
 *   eddy: number,
 *   stretch: { sx: number, sy: number, sz: number },
 * }}
 */
export function computeShedCascadeStage(riseT = 0, generation = 0) {
  const t = Math.min(1, Math.max(0, Number(riseT) || 0));
  const gen = Math.max(0, generation | 0);
  const smooth = (a, b, x) => {
    const u = Math.min(1, Math.max(0, (x - a) / Math.max(1e-6, b - a)));
    return u * u * (3 - 2 * u);
  };
  // Tent-like approach → flatten/sheet → twist unravel (peer of ring collision)
  const tent = smooth(0.05, 0.35, t) * (1 - smooth(0.4, 0.7, t));
  const sheet = smooth(0.25, 0.5, t) * (1 - smooth(0.55, 0.8, t));
  const fold = Math.min(1, tent * 0.55 + sheet * 0.85);
  const twist = smooth(0.15, 0.85, t) * (1.15 - gen * 0.2);
  const daughterGate = gen === 0 ? smooth(0.35, 0.55, t) : 0;
  const tertiaryGate = gen === 1 ? smooth(0.3, 0.55, t) : (gen === 0 ? smooth(0.55, 0.75, t) * 0.35 : 0);
  const eddy = Math.min(1, fold * 0.4 + twist * 0.5 + smooth(0.4, 0.9, t) * 0.45);
  // Stretch-tensor cue: sheet flattens one axis, twist shears another
  const sx = 1 + sheet * 0.55 + tent * 0.15;
  const sy = 1 - sheet * 0.45 - tent * 0.2;
  const sz = 1 + twist * 0.25 - sheet * 0.1;
  return {
    twist,
    fold,
    tent,
    sheet,
    daughterGate,
    tertiaryGate,
    eddy,
    stretch: { sx, sy: Math.max(0.25, sy), sz },
  };
}

/**
 * Capture rest positions for twist/fold deformation.
 * @param {THREE.BufferGeometry} geometry
 */
export function ensureTorusRestPositions(geometry) {
  if (!geometry?.attributes?.position) return null;
  if (geometry.userData.cascadeRest) return geometry.userData.cascadeRest;
  const src = geometry.attributes.position.array;
  const rest = new Float32Array(src.length);
  rest.set(src);
  geometry.userData.cascadeRest = rest;
  return rest;
}

/**
 * Twist + fold + tent deformation on a torus mesh (presentation).
 * Not a continuum elasticity / vortex-sheet solver.
 *
 * @param {THREE.BufferGeometry} geometry
 * @param {{ twist?: number, fold?: number, tent?: number, time?: number }} cues
 */
export function applyShedTorusTwistFold(geometry, cues = {}) {
  const rest = ensureTorusRestPositions(geometry);
  const pos = geometry?.attributes?.position;
  if (!rest || !pos) return;
  const twist = Math.min(1.4, Math.max(0, Number(cues.twist) || 0));
  const fold = Math.min(1, Math.max(0, Number(cues.fold) || 0));
  const tent = Math.min(1, Math.max(0, Number(cues.tent) || 0));
  const time = Number(cues.time) || 0;
  const arr = pos.array;
  for (let i = 0; i < arr.length; i += 3) {
    const x0 = rest[i];
    const y0 = rest[i + 1];
    const z0 = rest[i + 2];
    // Toroidal angle proxy from XZ (major circle)
    const az = Math.atan2(z0, x0);
    const rMajor = Math.sqrt(x0 * x0 + z0 * z0) || 1e-6;
    // Tube-centric vertical
    const tubeY = y0;
    // Twist: rotate tube cross-section around major tangent
    const tw = twist * (1.2 + 0.35 * Math.sin(az * 2 + time * 1.7));
    const cy = Math.cos(tw);
    const sy = Math.sin(tw);
    let y = tubeY * cy - (rMajor - 1) * sy * 0.35;
    let radial = rMajor + tubeY * sy * 0.35;
    // Fold / tent: flatten mid-span into sheet, pin edges (daughter-filament cue)
    const mid = Math.exp(-(tubeY * tubeY) / 0.08);
    const flatten = fold * 0.72 * mid;
    y *= (1 - flatten);
    radial += tent * 0.22 * Math.sin(az * 2) * (1 - mid);
    // Mild azimuthal wrinkle (eddy roughness)
    const wrinkle = fold * 0.06 * Math.sin(az * 5 + time * 3.1 + tubeY * 8);
    arr[i] = radial * Math.cos(az) + wrinkle * Math.cos(az + Math.PI / 2);
    arr[i + 1] = y;
    arr[i + 2] = radial * Math.sin(az) + wrinkle * Math.sin(az + Math.PI / 2);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

/**
 * Soft eddy Points cloud near shed cascade (presentation).
 * @returns {{ points: THREE.Points, update: Function, dispose: Function }}
 */
export function createShedEddyCloud({
  count = 56,
  color = 0xb8c0c8,
} = {}) {
  // Fewer, larger soft discs — hard tiny points read as random pixelation
  const n = Math.max(16, count | 0);
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const seeds = new Float32Array(n * 4);
  const base = new THREE.Color(color);
  for (let i = 0; i < n; i += 1) {
    seeds[i * 4] = Math.random() * Math.PI * 2;
    seeds[i * 4 + 1] = 0.25 + Math.random() * 0.95;
    seeds[i * 4 + 2] = (Math.random() - 0.5) * 1.0;
    seeds[i * 4 + 3] = 0.45 + Math.random() * 0.9;
    colors[i * 3] = base.r;
    colors[i * 3 + 1] = base.g;
    colors[i * 3 + 2] = base.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const softMap = createSoftDiscTexture(96);
  const matOpts = {
    color: 0xffffff,
    size: 0.16,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    vertexColors: true,
  };
  if (softMap) {
    softMap.minFilter = THREE.LinearFilter;
    softMap.magFilter = THREE.LinearFilter;
    matOpts.map = softMap;
  }
  const mat = new THREE.PointsMaterial(matOpts);
  const points = new THREE.Points(geo, mat);
  points.name = 'ShedEddyCloud';
  points.visible = false;
  points.renderOrder = 6;
  points.userData = { fidelity: SHED_CASCADE_FIDELITY, seeds, time: 0, softMap };

  const update = (centers = [], eddyStrength = 0, deltaTime = 0.016) => {
    const e = Math.min(1, Math.max(0, Number(eddyStrength) || 0));
    points.visible = e > 0.08 && centers.length > 0;
    if (!points.visible) {
      mat.opacity = 0;
      return;
    }
    points.userData.time += deltaTime * (0.7 + e * 1.2);
    const t = points.userData.time;
    const pos = geo.attributes.position.array;
    const col = geo.attributes.color.array;
    for (let i = 0; i < n; i += 1) {
      const c = centers[i % centers.length];
      const az = seeds[i * 4] + t * seeds[i * 4 + 3] * 0.55;
      const rad = seeds[i * 4 + 1] * (0.4 + e * 0.55);
      const yOff = seeds[i * 4 + 2] * (0.2 + e * 0.28);
      const swirl = 0.05 * Math.sin(t * 2.4 + i) * e;
      pos[i * 3] = c.x + rad * Math.cos(az) + swirl;
      pos[i * 3 + 1] = c.y + yOff;
      pos[i * 3 + 2] = c.z + rad * Math.sin(az) - swirl;
      // Gentle pulse — avoid hard flicker
      const pulse = 0.78 + 0.22 * Math.sin(t * 1.8 + i * 0.15);
      col[i * 3] = Math.min(1, base.r * pulse);
      col[i * 3 + 1] = Math.min(1, base.g * pulse);
      col[i * 3 + 2] = Math.min(1, base.b * (0.9 + pulse * 0.1));
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    mat.opacity = 0.06 + e * 0.16;
    mat.size = 0.12 + e * 0.1;
  };

  const dispose = () => {
    geo.dispose();
    mat.dispose();
    softMap?.dispose?.();
  };

  return { points, update, dispose };
}
