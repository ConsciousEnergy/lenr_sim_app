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

/** Glass / ionic-shell look for the main gas volume (no env map required). */
export function createBubbleGasMaterial({
  color = 0xb8e8ff,
  opacity = 0.22,
} = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.02,
    roughness: 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    reflectivity: 0.9,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.FrontSide,
    emissive: new THREE.Color(0x226688),
    emissiveIntensity: 0.15,
  });
}

/** Outer ionic double-layer — thin refractive shell. */
export function createDoubleLayerMaterial({
  color = 0x66f0ff,
  opacity = 0.38,
} = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.05,
    roughness: 0.2,
    clearcoat: 0.85,
    clearcoatRoughness: 0.08,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    emissive: new THREE.Color(0x00ccff),
    emissiveIntensity: 0.35,
  });
}

/** Inner charge sheath. */
export function createInnerLayerMaterial({
  color = 0xff8844,
  opacity = 0.28,
} = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.08,
    roughness: 0.25,
    clearcoat: 0.5,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.FrontSide,
    emissive: new THREE.Color(0xff6622),
    emissiveIntensity: 0.4,
  });
}

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
