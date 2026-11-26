/**
 * electrolyteIonizedHalo.js
 *
 * Soft ionized-environment sheath tint for UBLV — bound to Unified Theory
 * electrolyte family / species / molarity and engine electrolyte_multiplier.
 *
 * Honesty: EMP chem-env label; plasma ≠ fusion; never invents nuclear yield;
 * schematic presentation only (not continuum plasma / PIC).
 */

import * as THREE from 'three';
import { resolveElectrolyteSpecies } from './theoryConditions';

export const ELECTROLYTE_HALO_FIDELITY = 'schematic';
export const ELECTROLYTE_HALO_SOURCE = 'electrolyte_chem_env';
export const ELECTROLYTE_HALO_CLAIM_TAG = 'EMP chem-env · plasma ≠ fusion';
export const ELECTROLYTE_HALO_CHIP = 'Ionized env · electrolyte halo (EMP chem)';

/** Family presentation tints — schematic alkali / solvent cues, not spectra. */
export const ELECTROLYTE_FAMILY_TINTS = Object.freeze({
  li: 0x66e8ff,
  na: 0x88f0a8,
  k: 0xd8a0ff,
  rb: 0xffb070,
  cs: 0xff9090,
  mixed: 0xa0c8ff,
  other: 0xb0b8c8,
});

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function finiteOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Resolve family key from parameters or diagnostics (lowercase).
 */
export function resolveElectrolyteFamilyKey(family) {
  const key = String(family || 'other').toLowerCase();
  return Object.prototype.hasOwnProperty.call(ELECTROLYTE_FAMILY_TINTS, key)
    ? key
    : 'other';
}

/**
 * Soft sheath tint hex for electrolyte family.
 */
export function electrolyteFamilyTintHex(family) {
  const key = resolveElectrolyteFamilyKey(family);
  return ELECTROLYTE_FAMILY_TINTS[key];
}

/**
 * Opacity / radius norms from molarity + activity multiplier (presentation).
 * Multiplier ~1 → modest sheath; higher activity → brighter / slightly larger.
 */
export function electrolyteHaloIntensityNorm({
  molarityMolL = 0.3,
  electrolyteMultiplier = 1,
} = {}) {
  const mol = Math.max(0, finiteOr(molarityMolL, 0.3));
  const mult = Math.max(0.5, finiteOr(electrolyteMultiplier, 1));
  // Validated window ~0.1–1.0 M sits mid-band; multiplier lifts brightness.
  const molTerm = clamp01(mol / 1.0);
  const multTerm = clamp01(Math.log10(mult + 1) / 1.2);
  return clamp01(0.28 + molTerm * 0.35 + multTerm * 0.4);
}

/**
 * Single resolver: params + optional engine diagnostics → viz binding.
 */
export function resolveElectrolyteIonizedHaloParams({
  electrolyteFamily = 'li',
  electrolyteSpecies = null,
  electrolyteMolarityMolL = 0.3,
  electrolyteMultiplier = 1,
} = {}) {
  const family = resolveElectrolyteFamilyKey(electrolyteFamily);
  const species = resolveElectrolyteSpecies(family, electrolyteSpecies);
  const intensity = electrolyteHaloIntensityNorm({
    molarityMolL: electrolyteMolarityMolL,
    electrolyteMultiplier,
  });
  return {
    family,
    species,
    molarityMolL: Math.max(0, finiteOr(electrolyteMolarityMolL, 0.3)),
    electrolyteMultiplier: Math.max(0, finiteOr(electrolyteMultiplier, 1)),
    tintHex: electrolyteFamilyTintHex(family),
    intensity,
    opacity: 0.12 + intensity * 0.28,
    scale: 1.18 + intensity * 0.22,
    fidelity: ELECTROLYTE_HALO_FIDELITY,
    source: ELECTROLYTE_HALO_SOURCE,
    claimTag: ELECTROLYTE_HALO_CLAIM_TAG,
    plasmaIsFusion: false,
  };
}

/**
 * Soft outer sheath sphere — sits outside ionic DL on BubbleGroup.
 */
export function createElectrolyteIonizedHalo({
  tintHex = 0x66e8ff,
  opacity = 0.22,
  radius = 1.22,
} = {}) {
  const geometry = new THREE.SphereGeometry(radius, 32, 24);
  const material = new THREE.MeshBasicMaterial({
    color: tintHex,
    transparent: true,
    opacity: Math.max(0.05, finiteOr(opacity, 0.22)),
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'ElectrolyteIonizedHalo';
  mesh.renderOrder = 0;
  mesh.userData = {
    fidelity: ELECTROLYTE_HALO_FIDELITY,
    source: ELECTROLYTE_HALO_SOURCE,
    claim: 'emp_chem_env_halo',
    plasmaIsFusion: false,
  };
  return mesh;
}

/**
 * Apply live tint / opacity / scale from resolved params.
 */
export function updateElectrolyteIonizedHalo(mesh, params) {
  if (!mesh?.material) return;
  const p = params || resolveElectrolyteIonizedHaloParams();
  mesh.material.color.setHex(p.tintHex);
  mesh.material.opacity = p.opacity;
  mesh.material.needsUpdate = true;
  const s = p.scale;
  mesh.scale.set(s, s, s);
  mesh.userData.family = p.family;
  mesh.userData.species = p.species;
  mesh.userData.intensity = p.intensity;
  mesh.userData.electrolyteMultiplier = p.electrolyteMultiplier;
}
