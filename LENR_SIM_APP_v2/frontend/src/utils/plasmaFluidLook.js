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
  'fluid look · turb↔laminar · not CFD';
export const PLASMA_FLUID_LOOK_CHIP_TOOLTIP =
  'Main plasma uses a turbulent mottled look; shed / quieter surfaces use a '
  + 'smoother laminar advection cue. Presentation only — not continuum CFD / PIC; '
  + 'plasma ≠ fusion; EQ-OPEN untouched.';

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
  tex.needsUpdate = true;
  tex.userData = { kind, fidelity: PLASMA_FLUID_LOOK_FIDELITY };
  return tex;
}

function fillTurbulentRgba(data, size, seed, warm) {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const v = y / size;
      const n = fbmNoise2D(u * 7.5, v * 7.5, { seed, octaves: 6 });
      const filament = fbmNoise2D(u * 18 + 2.1, v * 3.4, { seed: seed + 9, octaves: 4 });
      const swirl = fbmNoise2D(u * 22 + v * 9, v * 11, { seed: seed + 21, octaves: 3 });
      const t = Math.min(1, Math.max(0, n * 0.55 + filament * 0.28 + swirl * 0.17));
      const i = (y * size + x) * 4;
      if (warm) {
        data[i] = Math.floor(130 + t * 125);
        data[i + 1] = Math.floor(55 + t * 100);
        data[i + 2] = Math.floor(30 + t * 55);
      } else {
        data[i] = Math.floor(50 + t * 100);
        data[i + 1] = Math.floor(130 + t * 110);
        data[i + 2] = Math.floor(170 + t * 85);
      }
      data[i + 3] = Math.floor(85 + t * 170);
    }
  }
}

/** Smooth anisotropic bands — laminar advection cue (not NS laminar flow). */
function fillLaminarRgba(data, size, seed, warm) {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const v = y / size;
      const band = 0.5 + 0.5 * Math.sin((v * 9 + u * 0.6) * Math.PI * 2 + seed * 0.1);
      const soft = fbmNoise2D(u * 2.2, v * 3.5, { seed, octaves: 2, gain: 0.45 });
      const t = Math.min(1, Math.max(0, band * 0.72 + soft * 0.28));
      const i = (y * size + x) * 4;
      if (warm) {
        data[i] = Math.floor(160 + t * 70);
        data[i + 1] = Math.floor(120 + t * 60);
        data[i + 2] = Math.floor(90 + t * 40);
      } else {
        data[i] = Math.floor(150 + t * 70);
        data[i + 1] = Math.floor(160 + t * 60);
        data[i + 2] = Math.floor(175 + t * 55);
      }
      data[i + 3] = Math.floor(70 + t * 110);
    }
  }
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
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const v = y / size;
      const h = fbmNoise2D(u * 5, v * 5, { seed, octaves: 4 });
      const hx = fbmNoise2D((u + eps) * 5, v * 5, { seed, octaves: 4 });
      const hy = fbmNoise2D(u * 5, (v + eps) * 5, { seed, octaves: 4 });
      const dx = (hx - h) * 8;
      const dy = (hy - h) * 8;
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
      const n = fbmNoise2D(u * 10, v * 2.2, { seed, octaves: 4 });
      const streak = Math.pow(n, 1.35);
      const glow = 0.35 + 0.65 * streak;
      const i = (y * size + x) * 4;
      data[i] = Math.floor(200 + glow * 55);
      data[i + 1] = Math.floor(220 + glow * 35);
      data[i + 2] = 255;
      data[i + 3] = Math.floor(40 + glow * 200);
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
 * Mutates material; stores disposables on material.userData.plasmaFluidLook.
 */
export function applyPlasmaFluidLook(material, {
  kind = 'torus',
  mode = null,
  shared = null,
} = {}) {
  if (!material) return null;
  const resolvedMode = mode
    || (kind === 'shed' ? 'laminar' : kind === 'jet' ? 'laminar' : 'turbulent');
  const isLaminar = resolvedMode === 'laminar';
  const pack = shared || {
    noise: isLaminar
      ? createLaminarNoiseTexture({
        size: 128,
        seed: kind === 'shed' ? 7 : 5,
        warm: kind === 'torus',
      })
      : createTurbulentNoiseTexture({
        size: 128,
        seed: kind === 'bubble' ? 4 : 3,
        warm: kind === 'torus',
      }),
    normal: createSoftRefractionNormalMap({
      size: 96,
      seed: isLaminar ? 19 : kind === 'jet' ? 15 : 11,
    }),
    streak: kind === 'jet' ? createAdvectiveStreakTexture({ size: 128 }) : null,
  };
  if (!pack.noise && !pack.streak) return null;
  const map = kind === 'jet' && pack.streak ? pack.streak : pack.noise;
  if (map) {
    material.map = map;
    material.emissiveMap = map;
    if (kind === 'torus') map.repeat.set(isLaminar ? 2.4 : 5.2, isLaminar ? 1.4 : 2.6);
    if (kind === 'shed') map.repeat.set(isLaminar ? 2.0 : 3.2, isLaminar ? 3.6 : 3.2);
    if (kind === 'bubble') map.repeat.set(isLaminar ? 1.8 : 3.4, isLaminar ? 1.8 : 3.4);
  }
  if (material.roughnessMap !== undefined && pack.noise) {
    material.roughnessMap = pack.noise;
  }
  if (material.normalMap !== undefined && kind !== 'jet' && pack.normal) {
    material.normalMap = pack.normal;
    const n = isLaminar
      ? (kind === 'bubble' ? 0.22 : 0.18)
      : (kind === 'bubble' ? 0.62 : 0.55);
    material.normalScale = new THREE.Vector2(n, n);
  }
  material.needsUpdate = true;
  material.userData = material.userData || {};
  material.userData.plasmaFluidLook = {
    fidelity: PLASMA_FLUID_LOOK_FIDELITY,
    source: PLASMA_FLUID_LOOK_SOURCE,
    kind,
    mode: resolvedMode,
    pack,
    // Turbulent: chaotic UV drift; laminar: slower, anisotropic stream
    scrollU: isLaminar
      ? (kind === 'jet' ? 0.04 : 0.05)
      : (kind === 'jet' ? 0.09 : kind === 'bubble' ? 0.18 : 0.22),
    scrollV: isLaminar
      ? (kind === 'jet' ? 0.42 : 0.16)
      : (kind === 'jet' ? 0.28 : kind === 'bubble' ? 0.15 : 0.19),
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
