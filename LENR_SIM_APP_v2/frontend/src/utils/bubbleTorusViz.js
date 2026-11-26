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
} = {}) {
  return new THREE.MeshPhysicalMaterial({
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
} = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.02,
    roughness: 0.82,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    emissive: new THREE.Color(0xff5500),
    emissiveIntensity: 0.85,
    blending: THREE.AdditiveBlending,
  });
}

/** Thin secondary filament for turbulent plasma read (offset tube). */
export function createTorusFilamentMaterial({
  color = 0xffcc88,
  opacity = 0.32,
} = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.0,
    roughness: 0.9,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    emissive: new THREE.Color(0xffaa44),
    emissiveIntensity: 1.05,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * Focused jet remnant — transparent light cone (species-tintable).
 * Additive so lattice reads through; not an opaque glass spike.
 */
export function createJetMaterial({
  color = 0xffee88,
  opacity = 0.32,
} = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.0,
    roughness: 0.65,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    emissive: new THREE.Color(0xffcc44),
    emissiveIntensity: 1.35,
    blending: THREE.AdditiveBlending,
  });
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
      const turb = 1 + 0.18 * Math.sin(t * 3.1 + i) * s;
      const r = tubeRadius * jitter * turb * (0.75 + 0.35 * s);
      const R = majorRadius * (0.92 + 0.08 * s);
      pos[i * 3] = (R + r * Math.cos(phi)) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * (0.85 + 0.25 * Math.sin(t * 2.2 + i * 0.07));
      pos[i * 3 + 2] = (R + r * Math.cos(phi)) * Math.sin(theta);
      const pulse = 0.55 + 0.45 * Math.sin(t * 4.0 + i * 0.13);
      col[i * 3] = Math.min(1, base.r * (0.7 + pulse * 0.5));
      col[i * 3 + 1] = Math.min(1, base.g * (0.55 + pulse * 0.4));
      col[i * 3 + 2] = Math.min(1, base.b * (0.45 + pulse * 0.55) + 0.1);
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    material.opacity = 0.18 + s * 0.42;
    material.size = 0.1 + s * 0.14;
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
    torus: new THREE.TorusGeometry(1.15, 0.38, 32, 96),
    torusFilament: new THREE.TorusGeometry(1.18, 0.16, 16, 96),
    // Open cone reads as transparent light punch into the lattice
    jet: new THREE.ConeGeometry(0.32, 3.8, 40, 1, true),
  };
}
