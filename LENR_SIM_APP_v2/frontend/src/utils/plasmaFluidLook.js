/**
 * plasmaFluidLook.js
 *
 * Schematic photoreal / fluid-dynamics *look* for UBLV turbulent torus,
 * shed debris, and maser-like jet: procedural noise, soft refraction cue,
 * advective UV scroll. Presentation only — NOT continuum CFD / PIC / fusion.
 *
 * Honesty: keep spectrum chips + "not fusion"; EQ-OPEN untouched.
 */

import * as THREE from 'three';

export const PLASMA_FLUID_LOOK_FIDELITY = 'schematic';
export const PLASMA_FLUID_LOOK_SOURCE = 'schematic_visualization';
export const PLASMA_FLUID_LOOK_CHIP =
  'fluid look · plasma·liquid·gas · not CFD';
export const PLASMA_FLUID_LOOK_CHIP_TOOLTIP =
  'Phase-aware fluid look: plasma (turbulent mottled glow), liquid (smooth '
  + 'refraction bands), gas (thin translucent advection). Turb↔laminar still '
  + 'contrasts main vs shed. Presentation only — not continuum CFD / PIC / VOF; '
  + 'plasma ≠ fusion; EQ-OPEN untouched.';

/** Schematic multiphase cues — NOT a VOF / EOS / ionization solver. */
export const FLUID_PHASES = Object.freeze(['plasma', 'liquid', 'gas']);

export const FLUID_PHASE_CHIP = 'phase map · plasma·liquid·gas · schematic';
export const FLUID_PHASE_CHIP_TOOLTIP =
  'Presentation phase map (plasma / liquid / gas looks). Not a multiphase CFD '
  + 'or equation-of-state solve; EQ-OPEN / lenr_proved untouched.';

/** Deterministic value-noise (presentation; not a turbulence solver). */
export function valueNoise2D(x, y, seed = 0) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

export function fbmNoise2D(x, y, {
  octaves = 4,
  seed = 1,
  lacunarity = 2.05,
  gain = 0.5,
} = {}) {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o += 1) {
    sum += amp * valueNoise2D(x * freq, y * freq, seed + o * 17);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return norm > 0 ? sum / norm : 0;
}

function wrapFluidTexture(tex, kind) {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  // Soft filtering — high-frequency texel sparkle reads as “random pixelation”
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  tex.userData = { kind, fidelity: PLASMA_FLUID_LOOK_FIDELITY };
  return tex;
}

/** Soft contrast curve — kills mid-band grain without killing structure. */
function softContrast(t, amount = 0.55) {
  const x = Math.min(1, Math.max(0, t));
  const s = x * x * (3 - 2 * x);
  return x * (1 - amount) + s * amount;
}

function fillTurbulentRgba(data, size, seed, warm) {
  // Soft large-scale mottling (was octaves:6 + freq 18–22 → pixel sparkle)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const v = y / size;
      const n = fbmNoise2D(u * 3.2, v * 3.2, { seed, octaves: 3, gain: 0.45 });
      const filament = fbmNoise2D(u * 5.5 + 1.1, v * 2.0, { seed: seed + 9, octaves: 2, gain: 0.4 });
      const t = softContrast(n * 0.72 + filament * 0.28, 0.65);
      const i = (y * size + x) * 4;
      if (warm) {
        data[i] = Math.floor(145 + t * 85);
        data[i + 1] = Math.floor(75 + t * 70);
        data[i + 2] = Math.floor(45 + t * 40);
      } else {
        data[i] = Math.floor(70 + t * 70);
        data[i + 1] = Math.floor(145 + t * 75);
        data[i + 2] = Math.floor(180 + t * 55);
      }
      // Narrower alpha swing → less additive sparkle
      data[i + 3] = Math.floor(110 + t * 90);
    }
  }
}

/** Smooth anisotropic bands — laminar advection cue (not NS laminar flow). */
function fillLaminarRgba(data, size, seed, warm) {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const v = y / size;
      const band = 0.5 + 0.5 * Math.sin((v * 5.5 + u * 0.45) * Math.PI * 2 + seed * 0.1);
      const soft = fbmNoise2D(u * 1.4, v * 2.0, { seed, octaves: 2, gain: 0.4 });
      const t = softContrast(band * 0.78 + soft * 0.22, 0.5);
      const i = (y * size + x) * 4;
      if (warm) {
        data[i] = Math.floor(165 + t * 55);
        data[i + 1] = Math.floor(130 + t * 50);
        data[i + 2] = Math.floor(100 + t * 35);
      } else {
        data[i] = Math.floor(160 + t * 50);
        data[i + 1] = Math.floor(168 + t * 45);
        data[i + 2] = Math.floor(180 + t * 40);
      }
      data[i + 3] = Math.floor(90 + t * 80);
    }
  }
}

/**
 * Liquid-phase cue: soft caustic / meniscus bands (schematic refraction).
 * Cooler, higher specular feel via brighter mid-tones — not a dielectric solver.
 */
function fillLiquidRgba(data, size, seed, warm) {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const v = y / size;
      const meniscus = 0.5 + 0.5 * Math.sin((v * 3.8 + u * 0.9) * Math.PI * 2 + seed * 0.07);
      const caustic = fbmNoise2D(u * 3.2, v * 2.4, { seed: seed + 3, octaves: 2, gain: 0.42 });
      const t = softContrast(meniscus * 0.7 + caustic * 0.3, 0.55);
      const i = (y * size + x) * 4;
      if (warm) {
        data[i] = Math.floor(175 + t * 45);
        data[i + 1] = Math.floor(150 + t * 55);
        data[i + 2] = Math.floor(115 + t * 40);
      } else {
        data[i] = Math.floor(155 + t * 40);
        data[i + 1] = Math.floor(180 + t * 40);
        data[i + 2] = Math.floor(205 + t * 35);
      }
      data[i + 3] = Math.floor(110 + t * 90);
    }
  }
}

/**
 * Gas-phase cue: thin translucent wisps (low alpha, soft filament).
 * Not a kinetic-gas / Boltzmann solver.
 */
function fillGasRgba(data, size, seed, warm) {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const v = y / size;
      const wisp = fbmNoise2D(u * 2.2, v * 4.0, { seed, octaves: 2, gain: 0.42 });
      const veil = fbmNoise2D(u * 1.2 + 1.1, v * 1.6, { seed: seed + 11, octaves: 2, gain: 0.4 });
      const t = softContrast(wisp * 0.55 + veil * 0.45, 0.6);
      const i = (y * size + x) * 4;
      if (warm) {
        data[i] = Math.floor(185 + t * 45);
        data[i + 1] = Math.floor(160 + t * 40);
        data[i + 2] = Math.floor(135 + t * 30);
      } else {
        data[i] = Math.floor(180 + t * 40);
        data[i + 1] = Math.floor(190 + t * 35);
        data[i + 2] = Math.floor(205 + t * 30);
      }
      data[i + 3] = Math.floor(50 + t * 70);
    }
  }
}

/**
 * Resolve schematic fluid phase for a surface kind.
 * @returns {'plasma'|'liquid'|'gas'}
 */
export function resolveFluidPhase(kind = 'torus', phase = null) {
  if (phase && FLUID_PHASES.includes(phase)) return phase;
  // Bubble membrane / nest = liquid electrolyte peer; shed debris = gas wisps
  if (kind === 'bubble') return 'liquid';
  if (kind === 'shed') return 'gas';
  if (kind === 'jet') return 'plasma';
  return 'plasma';
}

/**
 * Phase → preferred turb/laminar mode (presentation heuristic).
 * plasma → turbulent; liquid → laminar; gas → laminar (thin).
 */
export function fluidPhaseDefaultMode(phase = 'plasma') {
  if (phase === 'liquid' || phase === 'gas') return 'laminar';
  return 'turbulent';
}

/**
 * Create a phase-specific noise texture (plasma|liquid|gas).
 * @returns {THREE.Texture}
 */
export function createPhaseNoiseTexture({
  phase = 'plasma',
  size = 128,
  seed = 3,
  warm = false,
} = {}) {
  const fill = phase === 'liquid'
    ? fillLiquidRgba
    : phase === 'gas'
      ? fillGasRgba
      : fillTurbulentRgba;
  const kind = `phase_${phase}`;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx?.createImageData) {
      const img = ctx.createImageData(size, size);
      fill(img.data, size, seed, warm);
      ctx.putImageData(img, 0, 0);
      return wrapFluidTexture(new THREE.CanvasTexture(canvas), kind);
    }
  }
  const data = new Uint8Array(size * size * 4);
  fill(data, size, seed, warm);
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  return wrapFluidTexture(tex, kind);
}

/**
 * Turbulent plasma albedo / emissive noise (soft mottled gas).
 * @returns {THREE.Texture}
 */
export function createTurbulentNoiseTexture({
  size = 128,
  seed = 3,
  warm = false,
} = {}) {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx?.createImageData) {
      const img = ctx.createImageData(size, size);
      fillTurbulentRgba(img.data, size, seed, warm);
      ctx.putImageData(img, 0, 0);
      return wrapFluidTexture(new THREE.CanvasTexture(canvas), 'turbulentNoise');
    }
  }
  const data = new Uint8Array(size * size * 4);
  fillTurbulentRgba(data, size, seed, warm);
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  return wrapFluidTexture(tex, 'turbulentNoise');
}

/**
 * Laminar / smooth-band albedo (schematic advection cue).
 * @returns {THREE.Texture}
 */
export function createLaminarNoiseTexture({
  size = 128,
  seed = 5,
  warm = false,
} = {}) {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx?.createImageData) {
      const img = ctx.createImageData(size, size);
      fillLaminarRgba(img.data, size, seed, warm);
      ctx.putImageData(img, 0, 0);
      return wrapFluidTexture(new THREE.CanvasTexture(canvas), 'laminarNoise');
    }
  }
  const data = new Uint8Array(size * size * 4);
  fillLaminarRgba(data, size, seed, warm);
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  return wrapFluidTexture(tex, 'laminarNoise');
}

function fillNormalRgba(data, size, seed) {
  const eps = 1 / size;
  // Low-frequency soft bump only — strong high-freq normals sparkle as grain
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const v = y / size;
      const h = fbmNoise2D(u * 2.2, v * 2.2, { seed, octaves: 2, gain: 0.4 });
      const hx = fbmNoise2D((u + eps) * 2.2, v * 2.2, { seed, octaves: 2, gain: 0.4 });
      const hy = fbmNoise2D(u * 2.2, (v + eps) * 2.2, { seed, octaves: 2, gain: 0.4 });
      const dx = (hx - h) * 3.2;
      const dy = (hy - h) * 3.2;
      const len = Math.sqrt(dx * dx + dy * dy + 1) || 1;
      const i = (y * size + x) * 4;
      data[i] = Math.floor(128 + (dx / len) * 127);
      data[i + 1] = Math.floor(128 + (dy / len) * 127);
      data[i + 2] = Math.floor(128 + (1 / len) * 127);
      data[i + 3] = 255;
    }
  }
}

/**
 * Soft normal-ish map for a mild refraction / caustic cue (schematic bump).
 * @returns {THREE.Texture}
 */
export function createSoftRefractionNormalMap({ size = 128, seed = 11 } = {}) {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx?.createImageData) {
      const img = ctx.createImageData(size, size);
      fillNormalRgba(img.data, size, seed);
      ctx.putImageData(img, 0, 0);
      return wrapFluidTexture(new THREE.CanvasTexture(canvas), 'softRefraction');
    }
  }
  const data = new Uint8Array(size * size * 4);
  fillNormalRgba(data, size, seed);
  return wrapFluidTexture(new THREE.DataTexture(data, size, size), 'softRefraction');
}

function fillStreakRgba(data, size, seed) {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const v = y / size;
      const n = fbmNoise2D(u * 4.5, v * 1.4, { seed, octaves: 2, gain: 0.42 });
      const streak = softContrast(Math.pow(n, 1.15), 0.5);
      const glow = 0.45 + 0.5 * streak;
      const i = (y * size + x) * 4;
      data[i] = Math.floor(205 + glow * 40);
      data[i + 1] = Math.floor(225 + glow * 25);
      data[i + 2] = 255;
      data[i + 3] = Math.floor(55 + glow * 140);
    }
  }
}

/**
 * Advective streak texture for jet light (flow lines along cone axis).
 * @returns {THREE.Texture}
 */
export function createAdvectiveStreakTexture({ size = 128, seed = 21 } = {}) {
  let tex;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx?.createImageData) {
      const img = ctx.createImageData(size, size);
      fillStreakRgba(img.data, size, seed);
      ctx.putImageData(img, 0, 0);
      tex = wrapFluidTexture(new THREE.CanvasTexture(canvas), 'advectiveStreak');
      tex.repeat.set(2, 3);
      return tex;
    }
  }
  const data = new Uint8Array(size * size * 4);
  fillStreakRgba(data, size, seed);
  tex = wrapFluidTexture(new THREE.DataTexture(data, size, size), 'advectiveStreak');
  tex.repeat.set(2, 3);
  return tex;
}

/**
 * Attach schematic fluid maps to a plasma material (torus / jet / shed).
 * mode: 'turbulent' (main plasma) | 'laminar' (quieter shed / shell cue).
 * phase: 'plasma' | 'liquid' | 'gas' — multiphase presentation cue.
 * Mutates material; stores disposables on material.userData.plasmaFluidLook.
 */
export function applyPlasmaFluidLook(material, {
  kind = 'torus',
  mode = null,
  phase = null,
  shared = null,
} = {}) {
  if (!material) return null;
  const resolvedPhase = resolveFluidPhase(kind, phase);
  const resolvedMode = mode
    || fluidPhaseDefaultMode(resolvedPhase)
    || (kind === 'shed' ? 'laminar' : kind === 'jet' ? 'laminar' : 'turbulent');
  const isLaminar = resolvedMode === 'laminar';
  const warm = kind === 'torus' && resolvedPhase === 'plasma';
  const pack = shared || {
    noise: resolvedPhase === 'liquid' || resolvedPhase === 'gas'
      ? createPhaseNoiseTexture({
        phase: resolvedPhase,
        size: 160,
        seed: kind === 'shed' ? 7 : kind === 'bubble' ? 4 : 3,
        warm: false,
      })
      : (isLaminar
        ? createLaminarNoiseTexture({
          size: 160,
          seed: kind === 'shed' ? 7 : 5,
          warm,
        })
        : createTurbulentNoiseTexture({
          size: 160,
          seed: kind === 'bubble' ? 4 : 3,
          warm,
        })),
    // Soft low-freq normals only; skip on shed/gas to cut grain
    normal: (resolvedPhase === 'gas' || kind === 'shed')
      ? null
      : createSoftRefractionNormalMap({
        size: 128,
        seed: resolvedPhase === 'liquid' ? 23 : isLaminar ? 19 : kind === 'jet' ? 15 : 11,
      }),
    streak: kind === 'jet' ? createAdvectiveStreakTexture({ size: 160 }) : null,
  };
  if (!pack.noise && !pack.streak) return null;
  const map = kind === 'jet' && pack.streak ? pack.streak : pack.noise;
  if (map) {
    material.map = map;
    material.emissiveMap = map;
    // Lower UV tiling — high repeats magnify texel sparkle into “pixelation”
    if (kind === 'torus') map.repeat.set(isLaminar ? 1.4 : 2.2, isLaminar ? 1.0 : 1.3);
    if (kind === 'shed') map.repeat.set(1.2, 1.6);
    if (kind === 'bubble') map.repeat.set(1.1, 1.1);
  }
  // Do not bind noise as roughnessMap — that re-introduces grain under lighting
  if (material.roughnessMap !== undefined) {
    material.roughnessMap = null;
  }
  if (material.normalMap !== undefined && kind !== 'jet' && pack.normal) {
    material.normalMap = pack.normal;
    let n;
    if (resolvedPhase === 'liquid') n = 0.28;
    else if (resolvedPhase === 'gas') n = 0.08;
    else {
      n = isLaminar
        ? (kind === 'bubble' ? 0.12 : 0.1)
        : (kind === 'bubble' ? 0.22 : 0.18);
    }
    material.normalScale = new THREE.Vector2(n, n);
  } else if (material.normalMap !== undefined && !pack.normal) {
    material.normalMap = null;
  }
  // Phase presentation: liquid more specular; gas thinner / less metal
  if (material.metalness !== undefined) {
    if (resolvedPhase === 'liquid') material.metalness = Math.min(0.35, (material.metalness || 0) + 0.12);
    if (resolvedPhase === 'gas') material.metalness = Math.min(0.08, material.metalness || 0);
  }
  if (material.roughness !== undefined) {
    if (resolvedPhase === 'liquid') material.roughness = Math.min(0.28, material.roughness ?? 0.35);
    if (resolvedPhase === 'gas') material.roughness = Math.max(0.55, material.roughness ?? 0.5);
  }
  material.needsUpdate = true;
  material.userData = material.userData || {};
  material.userData.plasmaFluidLook = {
    fidelity: PLASMA_FLUID_LOOK_FIDELITY,
    source: PLASMA_FLUID_LOOK_SOURCE,
    kind,
    mode: resolvedMode,
    phase: resolvedPhase,
    pack,
    // Turbulent: chaotic UV drift; laminar: slower, anisotropic stream
    // Gas: faster thin advection; liquid: slow caustic crawl
    scrollU: resolvedPhase === 'gas'
      ? 0.12
      : resolvedPhase === 'liquid'
        ? 0.03
        : (isLaminar
          ? (kind === 'jet' ? 0.04 : 0.05)
          : (kind === 'jet' ? 0.09 : kind === 'bubble' ? 0.18 : 0.22)),
    scrollV: resolvedPhase === 'gas'
      ? 0.28
      : resolvedPhase === 'liquid'
        ? 0.09
        : (isLaminar
          ? (kind === 'jet' ? 0.42 : 0.16)
          : (kind === 'jet' ? 0.28 : kind === 'bubble' ? 0.15 : 0.19)),
  };
  return pack;
}

/**
 * Advective UV scroll — call each frame while meshes are visible.
 * @param {THREE.Material|THREE.Object3D} target
 */
export function advancePlasmaFluidLook(target, deltaTime = 0.016) {
  const dt = Number(deltaTime) || 0.016;
  const mats = [];
  if (target?.isMaterial) mats.push(target);
  else if (target?.traverse) {
    target.traverse((obj) => {
      if (obj.material) {
        if (Array.isArray(obj.material)) mats.push(...obj.material);
        else mats.push(obj.material);
      }
    });
  }
  mats.forEach((mat) => {
    const look = mat?.userData?.plasmaFluidLook;
    if (!look) return;
    const maps = [mat.map, mat.emissiveMap, mat.roughnessMap, mat.normalMap].filter(Boolean);
    const seen = new Set();
    maps.forEach((tex) => {
      if (seen.has(tex)) return;
      seen.add(tex);
      if (tex.offset) {
        tex.offset.x = (tex.offset.x + look.scrollU * dt) % 1;
        tex.offset.y = (tex.offset.y + look.scrollV * dt) % 1;
        tex.needsUpdate = true;
      }
    });
  });
}

export function disposePlasmaFluidLook(material) {
  const pack = material?.userData?.plasmaFluidLook?.pack;
  if (!pack) return;
  pack.noise?.dispose?.();
  pack.normal?.dispose?.();
  pack.streak?.dispose?.();
  if (material.userData) delete material.userData.plasmaFluidLook;
}
