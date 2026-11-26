/**
 * bubbleTorusViz.js
 *
 * Presentation materials / tints for UBLV bubble + torus-to-jet morph.
 * Bind glow to existing temperature_k / collapse_results when available;
 * callers must chip local_fallback when samples are schematic RAF.
 *
 * Honesty: schematic_visualization — not continuum CFD or fusion proof.
 */

import * as THREE from 'three';
import { createSoftDiscTexture } from './waveParticleViz';
import {
  applyPlasmaFluidLook,
  disposePlasmaFluidLook,
} from './plasmaFluidLook';

export const BUBBLE_TORUS_FIDELITY = 'schematic';
export const BUBBLE_TORUS_SOURCE = 'schematic_visualization';

/** Soft ceiling for viz tint (K) — does not invent physics ceilings. */
export const BUBBLE_VIZ_TEMP_FLOOR_K = 300;
export const BUBBLE_VIZ_TEMP_HOT_K = 8000;

/**
 * Seat bubble center so the underside nests on the lattice / working-material
 * boundary (heterogeneous nucleation), instead of floating free above it.
 *
 * @param {object} args
 * @param {number} args.latticeSurfaceY - top of host lattice in vis units
 * @param {number} args.displayScale - MainBubble visual radius (geom r=1 × scale)
 * @param {string} [args.phase]
 * @param {number} [args.phaseProgress] - 0..1 within phase
 * @param {number} [args.nestPenetration] - fraction of radius sunk into surface
 * @returns {number} world Y for BubbleGroup
 */
export function getLatticeBoundBubbleY({
  latticeSurfaceY,
  displayScale,
  phase = 'EXPANSION',
  phaseProgress = 0,
  nestPenetration = 0.12,
} = {}) {
  const surface = Number.isFinite(latticeSurfaceY) ? latticeSurfaceY : 0;
  const radius = Math.max(Number(displayScale) || 0.15, 0.05);
  const progress = Math.min(1, Math.max(0, Number(phaseProgress) || 0));

  // Deeper nest during collapse / minimum (driven into surface cavities).
  let nest = nestPenetration;
  if (phase === 'COLLAPSE') nest = nestPenetration + 0.1 * progress;
  if (phase === 'MINIMUM') nest = Math.max(nestPenetration, 0.22);
  if (phase === 'REBOUND') nest = nestPenetration + 0.05 * (1 - progress);
  nest = Math.min(0.35, Math.max(0.05, nest));

  // Center above surface by (1 - nest) * radius → underside contacts lattice.
  let y = surface + radius * (1 - nest);

  // Tiny buoyancy lift only late in expansion — still contact-dominated, not free float.
  if (phase === 'EXPANSION' && progress > 0.55) {
    const lift = ((progress - 0.55) / 0.45) * radius * 0.08;
    y += lift;
  }

  return y;
}

/**
 * Map temperature_k → shell tint / emissive for bubble & torus (viz only).
 * Returns { color, emissive, emissiveIntensity, roughness, opacityBoost }.
 */
export function temperatureToBubbleTint(temperatureK, {
  floorK = BUBBLE_VIZ_TEMP_FLOOR_K,
  hotK = BUBBLE_VIZ_TEMP_HOT_K,
} = {}) {
  const value = Number(temperatureK);
  const safe = Number.isFinite(value) ? value : floorK;
  const t = Math.min(1, Math.max(0, (safe - floorK) / Math.max(hotK - floorK, 1)));
  // Cool aqueous cyan → warm plasma white-orange (presentation gradient)
  const color = new THREE.Color().setHSL(0.55 - t * 0.48, 0.75 - t * 0.35, 0.48 + t * 0.35);
  const emissive = new THREE.Color().setHSL(0.08 + (1 - t) * 0.45, 0.9, 0.25 + t * 0.45);
  return {
    color,
    emissive,
    emissiveIntensity: 0.12 + t * 1.6,
    roughness: 0.18 - t * 0.1,
    opacityBoost: t * 0.2,
    heatNorm: t,
  };
}

/**
 * Soft translucent gas membrane (primary bubble fill).
 * Defaults tuned so MeshPhysical reads as a bubble — not a ghost under wire.
 */
export function createBubbleGasMaterial({
  color = 0xb8e8ff,
  opacity = 0.32,
  fluidLook = false,
} = {}) {
  const mat = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.02,
    roughness: 0.14,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    reflectivity: 0.85,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.FrontSide,
    emissive: new THREE.Color(0x3388aa),
    emissiveIntensity: 0.28,
  });
  if (fluidLook) applyPlasmaFluidLook(mat, { kind: 'bubble' });
  return mat;
}

/**
 * Outer ionic double-layer — primary readable membrane (not wireframe).
 * Wire rim must stay faint; this shell carries the bubble silhouette.
 */
export function createDoubleLayerMaterial({
  color = 0x66f0ff,
  opacity = 0.52,
} = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.04,
    roughness: 0.18,
    clearcoat: 0.9,
    clearcoatRoughness: 0.06,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    emissive: new THREE.Color(0x00ccee),
    emissiveIntensity: 0.48,
  });
}

/** Inner charge sheath — soft warm tint under outer membrane. */
export function createInnerLayerMaterial({
  color = 0xff8844,
  opacity = 0.34,
} = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.06,
    roughness: 0.28,
    clearcoat: 0.45,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.FrontSide,
    emissive: new THREE.Color(0xff6622),
    emissiveIntensity: 0.45,
  });
}

/** Faint silhouette rim only — never the primary bubble read (BDS-504). */
export const DOUBLE_LAYER_WIRE_OPACITY_EXPANSION = 0.08;
export const DOUBLE_LAYER_WIRE_OPACITY_COLLAPSE = 0.12;

/**
 * Collapse torus / ring — turbulent gaseous excited-plasma look (presentation).
 * Low clearcoat / high emissive so it reads as rotating gas, not glass.
 */
export function createTorusPlasmaMaterial({
  color = 0xff9955,
  opacity = 0.42,
  fluidLook = true,
} = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.02,
    roughness: 0.72,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    emissive: new THREE.Color(0xff5500),
    emissiveIntensity: 0.95,
    blending: THREE.AdditiveBlending,
  });
  if (fluidLook) applyPlasmaFluidLook(mat, { kind: 'torus' });
  return mat;
}

/** Thin secondary filament for turbulent plasma read (offset tube). */
export function createTorusFilamentMaterial({
  color = 0xffcc88,
  opacity = 0.32,
  fluidLook = true,
} = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.0,
    roughness: 0.85,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    emissive: new THREE.Color(0xffaa44),
    emissiveIntensity: 1.1,
    blending: THREE.AdditiveBlending,
  });
  if (fluidLook) applyPlasmaFluidLook(mat, { kind: 'torus' });
  return mat;
}

/**
 * Focused jet remnant — transparent light cone (species-tintable).
 * Additive so lattice reads through; advective streak map = schematic flow cue.
 */
export function createJetMaterial({
  color = 0xffee88,
  opacity = 0.32,
  fluidLook = true,
} = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.0,
    roughness: 0.45,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    emissive: new THREE.Color(0xffcc44),
    emissiveIntensity: 1.45,
    blending: THREE.AdditiveBlending,
  });
  if (fluidLook) applyPlasmaFluidLook(mat, { kind: 'jet' });
  return mat;
}

/**
 * Soft Points cloud seated on the torus major circle — gaseous turbulence cue.
 * Returns { points, update, dispose }.
 */
export function createTorusPlasmaCloud({
  count = 220,
  color = 0xff8855,
  majorRadius = 1.15,
  tubeRadius = 0.38,
} = {}) {
  const n = Math.max(32, count | 0);
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const base = new THREE.Color(color);
  const seeds = new Float32Array(n * 4); // theta, tubePhi, radialJitter, speed

  for (let i = 0; i < n; i += 1) {
    const theta = (i / n) * Math.PI * 2 + Math.random() * 0.08;
    const tubePhi = Math.random() * Math.PI * 2;
    const radialJitter = 0.55 + Math.random() * 0.9;
    const speed = 0.7 + Math.random() * 1.6;
    seeds[i * 4] = theta;
    seeds[i * 4 + 1] = tubePhi;
    seeds[i * 4 + 2] = radialJitter;
    seeds[i * 4 + 3] = speed;

    const r = tubeRadius * radialJitter;
    positions[i * 3] = (majorRadius + r * Math.cos(tubePhi)) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(tubePhi);
    positions[i * 3 + 2] = (majorRadius + r * Math.cos(tubePhi)) * Math.sin(theta);

    const warm = 0.65 + Math.random() * 0.35;
    colors[i * 3] = Math.min(1, base.r * warm + 0.1);
    colors[i * 3 + 1] = Math.min(1, base.g * warm * 0.85);
    colors[i * 3 + 2] = Math.min(1, base.b * warm * 0.7 + 0.15);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const softMap = createSoftDiscTexture(96);
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.16,
    map: softMap,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    vertexColors: true,
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'TorusPlasmaCloud';
  points.visible = false;
  points.renderOrder = 4;
  points.userData = {
    fidelity: BUBBLE_TORUS_FIDELITY,
    source: BUBBLE_TORUS_SOURCE,
    seeds,
    majorRadius,
    tubeRadius,
    softMap,
    time: 0,
  };

  const update = (deltaTime = 0.016, strength = 1) => {
    const s = Math.min(1, Math.max(0, strength));
    points.userData.time += deltaTime * (1.2 + s * 2.4);
    const t = points.userData.time;
    const pos = geometry.attributes.position.array;
    const col = geometry.attributes.color.array;
    for (let i = 0; i < n; i += 1) {
      const theta0 = seeds[i * 4];
      const phi0 = seeds[i * 4 + 1];
      const jitter = seeds[i * 4 + 2];
      const speed = seeds[i * 4 + 3];
      const theta = theta0 + t * speed * 0.85;
      const phi = phi0 + t * (1.1 + speed * 0.4);
      const turb = 1 + 0.32 * Math.sin(t * 3.8 + i) * s
        + 0.12 * Math.sin(t * 7.1 + i * 0.37) * s;
      const r = tubeRadius * jitter * turb * (0.7 + 0.45 * s);
      const R = majorRadius * (0.9 + 0.12 * s);
      const swirl = 0.08 * Math.sin(t * 2.6 + theta) * s;
      pos[i * 3] = (R + r * Math.cos(phi) + swirl) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * (0.8 + 0.35 * Math.sin(t * 2.8 + i * 0.07));
      pos[i * 3 + 2] = (R + r * Math.cos(phi) - swirl) * Math.sin(theta);
      const pulse = 0.55 + 0.45 * Math.sin(t * 4.0 + i * 0.13);
      col[i * 3] = Math.min(1, base.r * (0.7 + pulse * 0.5));
      col[i * 3 + 1] = Math.min(1, base.g * (0.55 + pulse * 0.4));
      col[i * 3 + 2] = Math.min(1, base.b * (0.45 + pulse * 0.55) + 0.1);
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    material.opacity = 0.2 + s * 0.5;
    material.size = 0.11 + s * 0.18;
  };

  const dispose = () => {
    geometry.dispose();
    material.dispose();
    softMap.dispose();
  };

  return { points, update, dispose };
}

/**
 * Apply temperature tint to bubble-group meshes (MainBubble, layers, torus, jet).
 * Safe no-op when materials lack emissive fields.
 */
export function applyBubbleTemperatureTint(group, temperatureK) {
  if (!group) return null;
  const tint = temperatureToBubbleTint(temperatureK);
  // Bubble membranes follow heatNorm; torus/jet/filament use plasmaSpectrumViz SOT.
  const names = ['MainBubble', 'DoubleLayer', 'InnerLayer'];
  for (const name of names) {
    const mesh = group.getObjectByName(name);
    const mat = mesh?.material;
    if (!mat) continue;
    if (mat.color && name !== 'InnerLayer') {
      mat.color.copy(tint.color);
    }
    if (mat.emissive) {
      mat.emissive.copy(tint.emissive);
      mat.emissiveIntensity = tint.emissiveIntensity;
    }
    if (typeof mat.roughness === 'number') {
      mat.roughness = tint.roughness;
    }
  }
  return tint;
}

/**
 * Bubble → torus morph across the scrub window (presentation).
 * Torus must *form* as the bubble collapses — not appear as a ready-made ring.
 *
 * @param {number} collapseProgress 0..1 across torus scrub window
 * @returns {{
 *   bubbleVisible: boolean,
 *   bubbleOpacityMul: number,
 *   bubbleScaleXY: number,
 *   bubbleScaleY: number,
 *   torusVisible: boolean,
 *   torusBirth: number,
 *   torusMajorMul: number,
 *   torusTubeMul: number,
 *   torusOpacityMul: number,
 *   cloudStrength: number,
 * }}
 */
export function computeBubbleTorusMorph(collapseProgress = 0) {
  const p = Math.min(1, Math.max(0, Number(collapseProgress) || 0));
  const smooth = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / Math.max(1e-6, b - a)));
    return t * t * (3 - 2 * t);
  };
  // Sphere stays dominant early; flattens into an equatorial belt
  const bubbleOpacityMul = 1 - smooth(0.12, 0.72, p);
  const bubbleVisible = bubbleOpacityMul > 0.04;
  const flatten = smooth(0.05, 0.65, p);
  const bubbleScaleXY = 1 - flatten * 0.22;
  const bubbleScaleY = 1 - flatten * 0.72;
  // Torus births mid-collapse from the flattened equator (fat → ring)
  const torusBirth = smooth(0.22, 0.62, p);
  const torusVisible = torusBirth > 0.04;
  const torusMajorMul = 0.42 + torusBirth * 0.58; // grows out of bubble waist
  const torusTubeMul = 1.55 - torusBirth * 0.7; // thick blob → thinner tube
  const torusOpacityMul = torusBirth;
  const cloudStrength = torusBirth * (0.35 + p * 0.65);
  return {
    bubbleVisible,
    bubbleOpacityMul,
    bubbleScaleXY,
    bubbleScaleY,
    torusVisible,
    torusBirth,
    torusMajorMul,
    torusTubeMul,
    torusOpacityMul,
    cloudStrength,
  };
}

/**
 * Build high-segment bubble + torus geometries for a smoother silhouette.
 * Filament = thinner tube for turbulent plasma read during 90.7–95.7% scrub.
 */
export function createBubbleTorusGeometries() {
  return {
    gas: new THREE.SphereGeometry(1, 64, 48),
    doubleLayer: new THREE.SphereGeometry(1.12, 64, 48),
    doubleLayerWire: new THREE.SphereGeometry(1.135, 32, 20),
    innerLayer: new THREE.SphereGeometry(0.92, 48, 36),
    // Major / tube radii tuned for a readable collapse ring
    torus: new THREE.TorusGeometry(1.15, 0.38, 48, 128),
    torusFilament: new THREE.TorusGeometry(1.18, 0.16, 24, 112),
    // Open cone reads as transparent light punch into the lattice
    jet: new THREE.ConeGeometry(0.32, 3.8, 48, 1, true),
  };
}

/**
 * Pure shed-rise sample (testable). Lattice is below the bubble in world +Y
 * (UBLV: LATTICE_Y_OFFSET=-5, bubble nests above). Away-from-lattice = +world Y.
 *
 * Compensates parentWorldY motion (bubble nest drops toward lattice) so world Y
 * never decreases once spawned. Opacity falls as riseProgress rises.
 *
 * @returns {{
 *   active: boolean,
 *   progress: number,
 *   riseT: number,
 *   worldY: number,
 *   localY: number,
 *   opacity: number,
 *   worldYLatched: number|null,
 *   spawnWorldY: number|null,
 * }}
 */
export function computeShedRiseSample({
  shedProgress = 0,
  progressLatched = 0,
  delay = 0,
  spawnLocalY = 0.6,
  riseDistance = 1.8,
  parentWorldY = 0,
  peakOpacity = 0.42,
  worldYLatched = null,
  spawnWorldY = null,
} = {}) {
  const raw = Math.min(1, Math.max(0, Number(shedProgress) || 0));
  const prevProg = Math.min(1, Math.max(0, Number(progressLatched) || 0));
  // Reset only when progress is cleared for a new cycle
  if (raw < 0.02 && prevProg < 0.02) {
    return {
      active: false,
      progress: 0,
      riseT: 0,
      worldY: parentWorldY + spawnLocalY,
      localY: spawnLocalY,
      opacity: 0,
      worldYLatched: null,
      spawnWorldY: null,
    };
  }
  const progress = Math.max(prevProg, raw);
  const local = Math.min(1, Math.max(0, (progress - delay) / Math.max(1e-6, 1 - delay)));
  if (local <= 0) {
    return {
      active: false,
      progress,
      riseT: 0,
      worldY: parentWorldY + spawnLocalY,
      localY: spawnLocalY,
      opacity: 0,
      worldYLatched,
      spawnWorldY,
    };
  }
  // Ease-out: leave nest quickly (no sin / no negative Y term)
  const riseT = 1 - (1 - local) * (1 - local);
  const spawnW = Number.isFinite(spawnWorldY)
    ? spawnWorldY
    : (Number(parentWorldY) || 0) + spawnLocalY;
  const worldDesired = spawnW + riseDistance * riseT;
  const prevWorld = Number.isFinite(worldYLatched) ? worldYLatched : worldDesired;
  // Hard latch: world +Y never decreases once spawned
  const worldY = Math.max(prevWorld, worldDesired);
  const localY = worldY - (Number(parentWorldY) || 0);
  const opacity = Math.max(0, peakOpacity * (1 - riseT));
  return {
    active: opacity >= 0.02,
    progress,
    riseT,
    worldY,
    localY,
    opacity,
    worldYLatched: worldY,
    spawnWorldY: spawnW,
  };
}

/**
 * Secondary turbulent tori + micro-bubbles that shed after the maser-like jet.
 * Counter-rotate relative to the primary torus; rise monotonically in world +Y
 * away from the lattice; fade opacity while rising. Never fall / bounce / settle.
 *
 * Honesty: schematic hydro / optical morphology — not CFD, not fusion.
 *
 * @returns {{ group: THREE.Group, update: Function, dispose: Function }}
 */
export function createShedPlasmaDebrisGroup({
  torusCount = 3,
  bubbleCount = 5,
  primaryColor = 0x5ce1ff,
  secondaryColor = 0xc77dff,
} = {}) {
  const group = new THREE.Group();
  group.name = 'ShedPlasmaDebris';
  group.visible = false;
  group.renderOrder = 5;
  group.userData = {
    fidelity: BUBBLE_TORUS_FIDELITY,
    source: BUBBLE_TORUS_SOURCE,
    shedProgressMax: 0,
  };

  const torusGeo = new THREE.TorusGeometry(0.42, 0.12, 12, 48);
  const bubbleGeo = new THREE.SphereGeometry(0.18, 16, 12);
  const disposables = [torusGeo, bubbleGeo];

  const nT = Math.max(1, torusCount | 0);
  for (let i = 0; i < nT; i += 1) {
    const mat = createTorusPlasmaMaterial({
      color: i % 2 === 0 ? primaryColor : secondaryColor,
      opacity: 0.42,
      fluidLook: false,
    });
    applyPlasmaFluidLook(mat, { kind: 'shed' });
    disposables.push(mat);
    const mesh = new THREE.Mesh(torusGeo, mat);
    mesh.name = `ShedTorus${i}`;
    mesh.rotation.x = Math.PI / 2 + (i - 1) * 0.18;
    mesh.visible = false;
    const azimuth = (i / nT) * Math.PI * 2 + 0.4;
    mesh.userData = {
      kind: 'torus',
      spinSign: -1,
      spinRate: 2.2 + i * 0.55,
      azimuth,
      radialStart: 0.35 + i * 0.12,
      radialEnd: 0.85 + i * 0.28,
      spawnLocalY: 0.7 + i * 0.12,
      riseDistance: 1.9 + i * 0.35,
      delay: i * 0.1,
      scale0: 0.55 + i * 0.12,
      peakOpacity: 0.42,
      worldYLatched: null,
      spawnWorldY: null,
    };
    group.add(mesh);
  }

  const nB = Math.max(1, bubbleCount | 0);
  for (let i = 0; i < nB; i += 1) {
    const mat = createBubbleGasMaterial({
      color: i % 2 === 0 ? secondaryColor : primaryColor,
      opacity: 0.36,
    });
    mat.blending = THREE.AdditiveBlending;
    mat.emissive = new THREE.Color(i % 2 === 0 ? secondaryColor : primaryColor);
    mat.emissiveIntensity = 0.65;
    // Soft refraction cue on micro-bubbles (schematic; not measured index)
    applyPlasmaFluidLook(mat, { kind: 'shed' });
    disposables.push(mat);
    const mesh = new THREE.Mesh(bubbleGeo, mat);
    mesh.name = `ShedBubble${i}`;
    mesh.visible = false;
    const azimuth = (i / nB) * Math.PI * 2 + 1.1;
    mesh.userData = {
      kind: 'bubble',
      spinSign: -1,
      spinRate: 1.4 + i * 0.35,
      azimuth,
      radialStart: 0.25 + (i % 3) * 0.08,
      radialEnd: 0.7 + (i % 3) * 0.22,
      spawnLocalY: 0.75 + (i % 3) * 0.1,
      riseDistance: 1.7 + (i % 3) * 0.3,
      delay: 0.06 + i * 0.08,
      scale0: 0.35 + (i % 3) * 0.12,
      peakOpacity: 0.36,
      worldYLatched: null,
      spawnWorldY: null,
    };
    group.add(mesh);
  }

  /**
   * @param {number} deltaTime
   * @param {number} shedProgress 0..1 (latched internally — never reverses)
   * @param {{ primarySpin?: number, parentWorldY?: number }} [opts]
   */
  const update = (deltaTime = 0.016, shedProgress = 0, opts = {}) => {
    const raw = Math.min(1, Math.max(0, Number(shedProgress) || 0));
    const parentWorldY = Number.isFinite(opts.parentWorldY) ? opts.parentWorldY : 0;
    if (raw < 0.02) {
      group.userData.shedProgressMax = 0;
      group.children.forEach((child) => {
        if (!child.userData) return;
        child.userData.worldYLatched = null;
        child.userData.spawnWorldY = null;
        child.visible = false;
      });
      group.visible = false;
      return;
    }
    const prevMax = Number(group.userData.shedProgressMax) || 0;
    const s = Math.max(prevMax, raw);
    group.userData.shedProgressMax = s;
    group.visible = true;
    const primarySpin = Number.isFinite(opts.primarySpin) ? Math.sign(opts.primarySpin) || 1 : 1;
    let anyVisible = false;
    group.children.forEach((child) => {
      const d = child.userData;
      if (!d) return;
      const sample = computeShedRiseSample({
        shedProgress: s,
        progressLatched: s,
        delay: d.delay,
        spawnLocalY: d.spawnLocalY,
        riseDistance: d.riseDistance,
        parentWorldY,
        peakOpacity: d.peakOpacity,
        worldYLatched: d.worldYLatched,
        spawnWorldY: d.spawnWorldY,
      });
      d.worldYLatched = sample.worldYLatched;
      d.spawnWorldY = sample.spawnWorldY;
      if (!sample.active) {
        child.visible = false;
        return;
      }
      child.visible = true;
      anyVisible = true;
      const r = d.radialStart + (d.radialEnd - d.radialStart) * sample.riseT;
      const az = d.azimuth + sample.riseT * 0.18 * d.spinSign;
      child.position.set(r * Math.cos(az), sample.localY, r * Math.sin(az));
      child.userData.lastWorldY = sample.worldY;
      child.userData.lastRiseT = sample.riseT;
      const sc = d.scale0;
      if (d.kind === 'torus') child.scale.set(sc, sc * 0.85, sc);
      else child.scale.setScalar(sc);
      const spinDir = -primarySpin * (d.spinSign || -1);
      child.rotation.z += deltaTime * d.spinRate * spinDir * (0.7 + s);
      if (child.material) {
        child.material.opacity = sample.opacity;
        if (child.material.emissiveIntensity !== undefined) {
          child.material.emissiveIntensity = (d.kind === 'torus' ? 1.0 : 0.7)
            * (sample.opacity / Math.max(1e-6, d.peakOpacity));
        }
      }
    });
    group.visible = anyVisible || s > 0.02;
  };

  const dispose = () => {
    while (group.children.length) {
      group.remove(group.children[0]);
    }
    disposables.forEach((item) => {
      disposePlasmaFluidLook(item);
      item.dispose?.();
    });
  };

  return { group, update, dispose };
}
