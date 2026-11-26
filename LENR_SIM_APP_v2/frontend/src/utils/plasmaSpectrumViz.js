/**
 * plasmaSpectrumViz.js
 *
 * Schematic excited-plasma tint for UBLV late-compression torus + collapse jet.
 * Binds host / solute / electrolyte labels already on Unified Theory parameters
 * (and optional engine electrolyte_diagnostics) into a presentation palette.
 *
 * Honesty: Flannigan–Suslick optical / EMP chem peer only.
 * Plasma ≠ fusion · never closes EQ-OPEN · never flips lenr_proved.
 */

import * as THREE from 'three';
import {
  LENR_HOST_PALETTE,
  LENR_LITHIUM_CATALYST,
  LENR_SOLUTE_PALETTE,
  resolveSolutePaletteEntry,
} from './lenrParticlePalette';

/** Diadon HSE scrub window — turbulent torus dwell (not a brief flash). */
export const TORUS_SCRUB_START = 0.907;
export const TORUS_SCRUB_END = 0.957;

export const PLASMA_SPECTRUM_FIDELITY = 'schematic';
export const PLASMA_SPECTRUM_SOURCE = 'schematic_visualization';
export const PLASMA_EXCITED_CHIP = 'Schematic excited plasma · not fusion';
export const PLASMA_EXCITED_CHIP_TOOLTIP =
  'Turbulent rotating gaseous plasma look in the late-compression torus window '
  + '(scrub ~90.7–95.7%). Peer: Flannigan–Suslick SBSL optical / n_e + EMP chem '
  + 'species tint. Plasma ≠ fusion; does not flip lenr_proved or close EQ-OPEN.';

/**
 * Characteristic emission-line peers for chem/medium species (presentation hex).
 * Not a spectrometer claim — schematic tint only.
 */
export const SPECIES_EMISSION_HEX = Object.freeze({
  hydrogen: 0xff4d6d, // Balmer-ish crimson/pink peer
  deuterium: 0x5ce1ff, // D continuum peer (aligns with solute teal family)
  lithium: LENR_LITHIUM_CATALYST.hex, // Li crimson/teal catalyst peer
  potassium: 0xc77dff, // K violet peer
  sodium: 0xffd166, // Na D-line amber peer
  palladium: LENR_HOST_PALETTE.palladium.hex,
  nickel: LENR_HOST_PALETTE.nickel.hex,
  titanium: LENR_HOST_PALETTE.titanium.hex,
  copper: LENR_HOST_PALETTE.copper.hex,
  constantan: LENR_HOST_PALETTE.constantan.hex,
});

const FAMILY_ALIASES = Object.freeze({
  h: 'hydrogen',
  hydrogen: 'hydrogen',
  d: 'deuterium',
  deuterium: 'deuterium',
  li: 'lithium',
  lithium: 'lithium',
  lioh: 'lithium',
  lil: 'lithium',
  k: 'potassium',
  potassium: 'potassium',
  koh: 'potassium',
  na: 'sodium',
  sodium: 'sodium',
  naoh: 'sodium',
  pd: 'palladium',
  palladium: 'palladium',
  ni: 'nickel',
  nickel: 'nickel',
  ti: 'titanium',
  titanium: 'titanium',
  cu: 'copper',
  copper: 'copper',
  constantan: 'constantan',
});

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function wrapCycle(cycleFraction) {
  let frac = Number(cycleFraction) % 1;
  if (Number.isNaN(frac)) return 0;
  if (frac < 0) frac += 1;
  return frac;
}

function hexColor(hex) {
  return new THREE.Color(Number.isFinite(hex) ? hex : 0x88aacc);
}

/**
 * Normalize host / electrolyte / solute tokens onto SPECIES_EMISSION_HEX keys.
 * @param {string|null|undefined} token
 * @returns {string|null}
 */
export function normalizePlasmaSpeciesKey(token) {
  if (token == null) return null;
  const raw = String(token).trim().toLowerCase();
  if (!raw) return null;
  if (FAMILY_ALIASES[raw]) return FAMILY_ALIASES[raw];
  // Species like "LiOH", "KOH", "NaOH", "Pd-D"
  const compact = raw.replace(/[^a-z0-9]/g, '');
  if (FAMILY_ALIASES[compact]) return FAMILY_ALIASES[compact];
  if (compact.startsWith('li')) return 'lithium';
  if (compact.startsWith('k')) return 'potassium';
  if (compact.startsWith('na')) return 'sodium';
  if (compact.startsWith('pd') || compact.includes('palladium')) return 'palladium';
  if (compact.startsWith('ni') || compact.includes('nickel')) return 'nickel';
  if (compact.startsWith('deut') || compact === 'd2' || compact === 'd2o') return 'deuterium';
  if (compact.startsWith('h') || compact === 'h2' || compact === 'h2o') return 'hydrogen';
  return null;
}

/**
 * Resolve solute key from host + optional explicit solute / loading cue.
 * Pd host defaults to D (UBLV Tier-0); others → H.
 */
export function resolvePlasmaSoluteKey({
  hostMaterial,
  solute = null,
  loadingRatio = null,
} = {}) {
  const explicit = normalizePlasmaSpeciesKey(solute);
  if (explicit === 'hydrogen' || explicit === 'deuterium') return explicit;
  const fromHost = resolveSolutePaletteEntry(hostMaterial);
  // High loading keeps the host-bound solute; low loading still uses palette SOT.
  void loadingRatio;
  return fromHost.key === 'deuterium' ? 'deuterium' : 'hydrogen';
}

/**
 * Build a presentation spectrum from Unified Theory / engine fields.
 *
 * @param {object} args
 * @param {string} [args.hostMaterial]
 * @param {string} [args.electrolyteFamily]
 * @param {string} [args.electrolyteSpecies]
 * @param {string} [args.solute]
 * @param {number} [args.loadingRatio]
 * @returns {{
 *   primaryHex: number,
 *   secondaryHex: number,
 *   emissiveHex: number,
 *   jetHex: number,
 *   hostKey: string|null,
 *   soluteKey: string,
 *   electrolyteKey: string|null,
 *   label: string,
 *   fidelity: string,
 *   source: string,
 * }}
 */
export function resolveExcitedPlasmaSpectrum({
  hostMaterial = 'palladium',
  electrolyteFamily = null,
  electrolyteSpecies = null,
  solute = null,
  loadingRatio = 0.9,
} = {}) {
  const hostKey = normalizePlasmaSpeciesKey(hostMaterial) || 'palladium';
  const soluteKey = resolvePlasmaSoluteKey({ hostMaterial, solute, loadingRatio });
  const electrolyteKey = normalizePlasmaSpeciesKey(electrolyteSpecies)
    || normalizePlasmaSpeciesKey(electrolyteFamily);

  const hostHex = SPECIES_EMISSION_HEX[hostKey] ?? SPECIES_EMISSION_HEX.palladium;
  const soluteHex = SPECIES_EMISSION_HEX[soluteKey] ?? LENR_SOLUTE_PALETTE.hydrogen.hex;
  const electroHex = electrolyteKey
    ? (SPECIES_EMISSION_HEX[electrolyteKey] ?? soluteHex)
    : soluteHex;

  const host = hexColor(hostHex);
  const soluteColor = hexColor(soluteHex);
  const electro = hexColor(electroHex);

  // Blend: solute dominates gaseous core; electrolyte sheath; host anchors lattice jet tip.
  const primary = soluteColor.clone().lerp(electro, 0.35).lerp(host, 0.18);
  const secondary = electro.clone().lerp(soluteColor, 0.4).lerp(host, 0.12);
  const emissive = primary.clone().lerp(hexColor(0xffffff), 0.22);
  const jet = electro.clone().lerp(soluteColor, 0.55).lerp(hexColor(0xffffff), 0.28);

  const load = clamp01(loadingRatio);
  // Slightly brighter core when loading is high (schematic occupancy cue only).
  emissive.lerp(hexColor(0xffffff), load * 0.12);

  const parts = [
    soluteKey === 'deuterium' ? 'D' : 'H',
    hostKey ? hostKey.slice(0, 2).toUpperCase() : null,
    electrolyteKey ? electrolyteKey.slice(0, 2).toUpperCase() : null,
  ].filter(Boolean);

  return {
    primaryHex: primary.getHex(),
    secondaryHex: secondary.getHex(),
    emissiveHex: emissive.getHex(),
    jetHex: jet.getHex(),
    hostKey,
    soluteKey,
    electrolyteKey,
    label: `Plasma tint · ${parts.join('/')} (schematic)`,
    fidelity: PLASMA_SPECTRUM_FIDELITY,
    source: PLASMA_SPECTRUM_SOURCE,
  };
}

/**
 * Progress 0..1 inside the Diadon torus scrub window (90.7–95.7%).
 * Outside → 0.
 */
export function torusWindowProgress(cycleFraction) {
  const frac = wrapCycle(cycleFraction);
  const width = Math.max(TORUS_SCRUB_END - TORUS_SCRUB_START, 1e-12);
  if (frac < TORUS_SCRUB_START || frac >= TORUS_SCRUB_END) return 0;
  return (frac - TORUS_SCRUB_START) / width;
}

export function isInTorusWindow(cycleFraction) {
  const frac = wrapCycle(cycleFraction);
  return frac >= TORUS_SCRUB_START && frac < TORUS_SCRUB_END;
}

/**
 * Jet / cone light envelope after torus window (MINIMUM → early REBOUND peer).
 * Returns 0..1 strength for transparent light cone ("maser-like" optical peer).
 */
export function jetLightEnvelope({
  cycleFraction,
  phase = null,
  phaseProgress = 0,
} = {}) {
  const frac = wrapCycle(cycleFraction);
  if (frac >= TORUS_SCRUB_START && frac < TORUS_SCRUB_END) {
    // Late torus → beginning of jet punch-through
    const tw = torusWindowProgress(frac);
    return clamp01((tw - 0.65) / 0.35);
  }
  const name = String(phase || '').toUpperCase();
  if (name === 'MINIMUM') {
    return clamp01(0.45 + clamp01(phaseProgress) * 0.55);
  }
  if (name === 'REBOUND') {
    return clamp01(0.85 * (1 - clamp01(phaseProgress)));
  }
  return 0;
}

/**
 * Late COLLAPSE → MINIMUM: primary plasma ring collapses onto the jetting
 * "maser" moment (schematic optical peer — not a claimed maser LENR step).
 * Returns 0..1 tighten factor (0 = open torus, 1 = ring on jet axis).
 */
export function maserCollapseProgress({
  cycleFraction,
  phase = null,
  phaseProgress = 0,
} = {}) {
  const frac = wrapCycle(cycleFraction);
  if (frac >= TORUS_SCRUB_START && frac < TORUS_SCRUB_END) {
    const tw = torusWindowProgress(frac);
    return clamp01((tw - 0.55) / 0.45);
  }
  const name = String(phase || '').toUpperCase();
  if (name === 'MINIMUM') {
    return clamp01(0.85 + clamp01(phaseProgress) * 0.15);
  }
  if (name === 'REBOUND') {
    return clamp01(1 - clamp01(phaseProgress) * 0.35);
  }
  return 0;
}

/**
 * After maser jet: shed secondary turbulent tori + micro-bubbles.
 * Starts only after primary ring has mostly collapsed onto the jet so the
 * maser-collapse shrink cannot be misread as shed falling.
 * Progress is monotonic 0→1 (MINIMUM → REBOUND stays at 1). Never reverses.
 */
export function shedDebrisProgress({
  cycleFraction,
  phase = null,
  phaseProgress = 0,
} = {}) {
  const frac = wrapCycle(cycleFraction);
  if (frac >= TORUS_SCRUB_START && frac < TORUS_SCRUB_END) {
    const tw = torusWindowProgress(frac);
    // Shed only in the final ~12% of the torus window (after maser tighten)
    return clamp01((tw - 0.88) / 0.12) * 0.22;
  }
  const name = String(phase || '').toUpperCase();
  if (name === 'MINIMUM') {
    const p = clamp01(phaseProgress);
    // Monotonic rise through MINIMUM
    return clamp01(0.22 + p * 0.78);
  }
  if (name === 'REBOUND') {
    // Hold at fully shed — opacity already faded; Y stays latched high
    return 1;
  }
  return 0;
}

export const MASER_JET_CHIP = 'Schematic maser-like jet · not fusion';
export const MASER_JET_CHIP_TOOLTIP =
  'Late-compression plasma ring collapses onto a transparent light jet '
  + '(optical / Flannigan–Suslick peer). "Maser-like" is presentation language '
  + 'only — not a verified LENR maser step; plasma ≠ fusion; EQ-OPEN untouched.';

export const SHED_DEBRIS_CHIP = 'uncolored shed · schematic';
export const SHED_DEBRIS_CHIP_TOOLTIP =
  'After the maser-like jet punch, secondary tori + micro-bubbles shed with '
  + 'opposite spin, rise / travel the lattice plane, and fade. Debris stay '
  + 'uncolored (no species spectrum tint) — main plasma keeps spectrum honesty. '
  + 'Hydro / optical morphology peer only — not continuum CFD / not fusion.';

/**
 * Apply spectrum tint to TorusFormation / FocusedJet / TorusPlasmaCloud.
 * Shed debris intentionally skipped (uncolored / neutral).
 * Safe no-op when meshes missing.
 */
export function applyPlasmaSpectrumTint(group, spectrum) {
  if (!group || !spectrum) return null;
  const primary = hexColor(spectrum.primaryHex);
  const secondary = hexColor(spectrum.secondaryHex);
  const emissive = hexColor(spectrum.emissiveHex);
  const jet = hexColor(spectrum.jetHex);

  const torus = group.getObjectByName('TorusFormation');
  if (torus?.material) {
    if (torus.material.color) torus.material.color.copy(primary);
    if (torus.material.emissive) {
      torus.material.emissive.copy(emissive);
      // Keep below blow-out under AdditiveBlending + ACES
      torus.material.emissiveIntensity = Math.min(
        1.1,
        Math.max(torus.material.emissiveIntensity ?? 0.7, 0.85),
      );
    }
  }

  const filament = group.getObjectByName('TorusPlasmaFilament');
  if (filament?.material) {
    if (filament.material.color) filament.material.color.copy(secondary);
    if (filament.material.emissive) {
      filament.material.emissive.copy(emissive);
      filament.material.emissiveIntensity = 1.05;
    }
  }

  const cloud = group.getObjectByName('TorusPlasmaCloud');
  if (cloud?.material?.color) {
    cloud.material.color.copy(primary);
  }

  const focusedJet = group.getObjectByName('FocusedJet');
  if (focusedJet?.material) {
    if (focusedJet.material.color) focusedJet.material.color.copy(jet);
    if (focusedJet.material.emissive) {
      focusedJet.material.emissive.copy(jet.clone().lerp(hexColor(0xffffff), 0.2));
      focusedJet.material.emissiveIntensity = Math.min(
        1.6,
        Math.max(focusedJet.material.emissiveIntensity ?? 1.0, 1.2),
      );
    }
  }

  // ShedPlasmaDebris: intentionally NOT spectrum-tinted (uncolored debris).

  return spectrum;
}
