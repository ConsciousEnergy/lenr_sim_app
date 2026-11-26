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

/** Collapse torus / ring — hot plasma filament look (presentation). */
export function createTorusPlasmaMaterial({
  color = 0xff9955,
  opacity = 0.78,
} = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.15,
    roughness: 0.22,
    clearcoat: 0.7,
    clearcoatRoughness: 0.12,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    emissive: new THREE.Color(0xff5500),
    emissiveIntensity: 1.1,
  });
}

/** Focused jet remnant after torus collapse. */
export function createJetMaterial({
  color = 0xffee88,
  opacity = 0.85,
} = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.1,
    roughness: 0.18,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    emissive: new THREE.Color(0xffcc44),
    emissiveIntensity: 1.6,
  });
}

/**
 * Apply temperature tint to bubble-group meshes (MainBubble, layers, torus, jet).
 * Safe no-op when materials lack emissive fields.
 */
export function applyBubbleTemperatureTint(group, temperatureK) {
  if (!group) return null;
  const tint = temperatureToBubbleTint(temperatureK);
  const names = ['MainBubble', 'DoubleLayer', 'InnerLayer', 'TorusFormation', 'FocusedJet'];
  for (const name of names) {
    const mesh = group.getObjectByName(name);
    const mat = mesh?.material;
    if (!mat) continue;
    if (mat.color && name !== 'InnerLayer') {
      mat.color.copy(tint.color);
    }
    if (mat.emissive) {
      mat.emissive.copy(tint.emissive);
      mat.emissiveIntensity = tint.emissiveIntensity * (name === 'TorusFormation' || name === 'FocusedJet' ? 1.35 : 1);
    }
    if (typeof mat.roughness === 'number') {
      mat.roughness = tint.roughness;
    }
  }
  return tint;
}

/**
 * Build high-segment bubble + torus geometries for a smoother silhouette.
 */
export function createBubbleTorusGeometries() {
  return {
    gas: new THREE.SphereGeometry(1, 64, 48),
    doubleLayer: new THREE.SphereGeometry(1.12, 64, 48),
    doubleLayerWire: new THREE.SphereGeometry(1.135, 32, 20),
    innerLayer: new THREE.SphereGeometry(0.92, 48, 36),
    // Major / tube radii tuned for a readable collapse ring
    torus: new THREE.TorusGeometry(1.15, 0.38, 32, 96),
    jet: new THREE.ConeGeometry(0.28, 3.6, 32, 1, true),
  };
}
