/**
 * bubbleSheathSurfaceFlow.js
 *
 * Optional UBLV overlay: faint tangential Points + short ribbons on the
 * ionic double-layer sheath. Presentation only — ionic DL / MHD peer motif.
 *
 * Honesty: NOT measured macroscopic bubble spin; NOT bulk kinetic spin;
 * NOT continuum CFD / plasma PIC. Chip:
 *   "schematic surface flow · not measured bubble spin"
 */

import * as THREE from 'three';
import { createSoftDiscTexture, createSoftPointsMaterial } from './waveParticleViz';

export const SHEATH_SURFACE_FLOW_FIDELITY = 'schematic';
export const SHEATH_SURFACE_FLOW_SOURCE = 'schematic_visualization';
export const SHEATH_SURFACE_FLOW_CHIP =
  'schematic surface flow · not measured bubble spin';

/** Default particle count — keep light; overlay is OFF by default in Layers. */
export const SHEATH_SURFACE_FLOW_DEFAULT_COUNT = 36;
export const SHEATH_SURFACE_FLOW_RIBBON_COUNT = 6;
export const SHEATH_SURFACE_FLOW_RIBBON_LEN = 8;

/**
 * Seed unit-sphere directions with mild polar bias (sheath band, not poles).
 * Deterministic enough for tests when `rng` is injected.
 */
export function seedSheathSurfaceParticles(count, rng = Math.random) {
  const n = Math.max(0, count | 0);
  const seeds = [];
  for (let i = 0; i < n; i += 1) {
    const u = rng();
    const v = rng();
    // Band away from poles so tangential swirl reads on the membrane
    const phi = Math.acos(0.75 * (1 - 2 * u));
    const theta = 2 * Math.PI * v;
    const speed = 0.35 + rng() * 0.85;
    const ionLike = rng() < 0.55;
    seeds.push({
      theta,
      phi,
      speed,
      ionLike,
      phase: rng() * Math.PI * 2,
    });
  }
  return seeds;
}

/**
 * Build a Group: soft Points cloud + short Line ribbons on a unit sheath.
 * Caller scales/positions with the BubbleGroup; start `visible = false`.
 */
export function createSheathSurfaceFlowGroup({
  count = SHEATH_SURFACE_FLOW_DEFAULT_COUNT,
  ribbonCount = SHEATH_SURFACE_FLOW_RIBBON_COUNT,
  ribbonLen = SHEATH_SURFACE_FLOW_RIBBON_LEN,
  rng = Math.random,
} = {}) {
  const group = new THREE.Group();
  group.name = 'SheathSurfaceFlow';
  group.visible = false;
  group.userData = {
    fidelity: SHEATH_SURFACE_FLOW_FIDELITY,
    source: SHEATH_SURFACE_FLOW_SOURCE,
    chip: SHEATH_SURFACE_FLOW_CHIP,
    claim: 'not_measured_bubble_spin',
  };

  const seeds = seedSheathSurfaceParticles(count, rng);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const ion = new THREE.Color(0x66e8ff);
  const elec = new THREE.Color(0xff9966);

  for (let i = 0; i < seeds.length; i += 1) {
    const s = seeds[i];
    const sinP = Math.sin(s.phi);
    positions[i * 3] = sinP * Math.cos(s.theta);
    positions[i * 3 + 1] = Math.cos(s.phi);
    positions[i * 3 + 2] = sinP * Math.sin(s.theta);
    const c = s.ionLike ? ion : elec;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
  );
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const map = createSoftDiscTexture(48);
  const material = createSoftPointsMaterial({
    color: 0xffffff,
    size: 0.14,
    opacity: 0.42,
    map,
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'SheathSurfaceFlowPoints';
  points.renderOrder = 4;
  points.frustumCulled = false;
  group.add(points);

  const ribbons = [];
  for (let r = 0; r < ribbonCount; r += 1) {
    const seedIdx = Math.floor((r / Math.max(ribbonCount, 1)) * Math.max(seeds.length, 1))
      % Math.max(seeds.length, 1);
    const hist = new Float32Array(ribbonLen * 3);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      'position',
      new THREE.BufferAttribute(hist, 3).setUsage(THREE.DynamicDrawUsage),
    );
    const line = new THREE.Line(
      geom,
      new THREE.LineBasicMaterial({
        color: r % 2 === 0 ? 0x66e8ff : 0xff9966,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    line.name = `SheathSurfaceFlowRibbon${r}`;
    line.frustumCulled = false;
    line.userData = { seedIdx, hist: [] };
    group.add(line);
    ribbons.push(line);
  }

  group.userData.seeds = seeds;
  group.userData.ribbons = ribbons;
  group.userData.shellRadius = 1.14; // matches DoubleLayer geom ~1.12 + epsilon

  return group;
}

/**
 * Advance tangential azimuthal motion on the unit sheath, then scale to display.
 * @returns {{ fidelity: string, chip: string } | null}
 */
export function updateSheathSurfaceFlow(group, {
  displayScale = 1,
  delta = 0.016,
  visible = false,
  pinchAmt = 0,
} = {}) {
  if (!group) return null;
  group.visible = Boolean(visible);
  if (!visible) {
    return {
      fidelity: SHEATH_SURFACE_FLOW_FIDELITY,
      chip: SHEATH_SURFACE_FLOW_CHIP,
    };
  }

  const seeds = group.userData.seeds || [];
  const points = group.getObjectByName('SheathSurfaceFlowPoints');
  const posAttr = points?.geometry?.attributes?.position;
  if (!posAttr) {
    return {
      fidelity: SHEATH_SURFACE_FLOW_FIDELITY,
      chip: SHEATH_SURFACE_FLOW_CHIP,
    };
  }

  const shellR = (group.userData.shellRadius || 1.14)
    * Math.max(0.05, Number(displayScale) || 1)
    * (1 - Math.min(0.25, Number(pinchAmt) || 0) * 0.2);
  const arr = posAttr.array;
  const dt = Math.min(0.05, Math.max(0, Number(delta) || 0));

  for (let i = 0; i < seeds.length; i += 1) {
    const s = seeds[i];
    // Tangential (azimuthal) advance — schematic surface current motif, not measured spin
    s.theta += s.speed * dt * (s.ionLike ? 1 : -0.85);
    s.phi += 0.015 * Math.sin(s.phase + s.theta) * dt;
    s.phi = Math.min(Math.PI - 0.12, Math.max(0.12, s.phi));
    const sinP = Math.sin(s.phi);
    arr[i * 3] = shellR * sinP * Math.cos(s.theta);
    arr[i * 3 + 1] = shellR * Math.cos(s.phi);
    arr[i * 3 + 2] = shellR * sinP * Math.sin(s.theta);
  }
  posAttr.needsUpdate = true;

  const ribbons = group.userData.ribbons || [];
  for (const line of ribbons) {
    const seedIdx = line.userData.seedIdx | 0;
    const s = seeds[seedIdx];
    if (!s) continue;
    const hist = line.userData.hist;
    hist.push(arr[seedIdx * 3], arr[seedIdx * 3 + 1], arr[seedIdx * 3 + 2]);
    const maxPts = SHEATH_SURFACE_FLOW_RIBBON_LEN * 3;
    while (hist.length > maxPts) hist.shift();
    const pAttr = line.geometry.attributes.position;
    const out = pAttr.array;
    out.fill(0);
    for (let k = 0; k < hist.length; k += 1) out[k] = hist[k];
    // Pad remaining with last point so Line does not jump to origin
    if (hist.length >= 3) {
      const lx = hist[hist.length - 3];
      const ly = hist[hist.length - 2];
      const lz = hist[hist.length - 1];
      for (let k = hist.length; k < out.length; k += 3) {
        out[k] = lx;
        out[k + 1] = ly;
        out[k + 2] = lz;
      }
    }
    pAttr.needsUpdate = true;
  }

  if (points.material && typeof points.material.opacity === 'number') {
    points.material.opacity = 0.32 + Math.min(0.2, (Number(pinchAmt) || 0) * 0.25);
  }

  return {
    fidelity: SHEATH_SURFACE_FLOW_FIDELITY,
    chip: SHEATH_SURFACE_FLOW_CHIP,
  };
}

export function disposeSheathSurfaceFlow(group) {
  if (!group) return;
  group.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (child.material.map) child.material.map.dispose();
      child.material.dispose();
    }
  });
}
