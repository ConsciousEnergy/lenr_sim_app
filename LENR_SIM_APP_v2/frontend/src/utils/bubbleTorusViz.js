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
 * Clifford / CMC aspect peer: major / tube ≈ √2 (schematic cyclide-ish ring).
 * Not a solved mean-curvature evolution — presentation only.
 */
export const CLIFFORD_TORUS_ASPECT = Math.SQRT2;
export const FOLD_IN_TORUS_MAJOR = 0.95;
export const FOLD_IN_TORUS_TUBE = FOLD_IN_TORUS_MAJOR / CLIFFORD_TORUS_ASPECT;

export const BUBBLE_FOLD_IN_CHIP = 'fold-in torus · puncture · schematic';
export const BUBBLE_FOLD_IN_CHIP_TOOLTIP =
  'Genus-0 bubble → genus-1 torus needs puncture/coalesce (χ drops by 2) — not a '
  + 'smooth homeomorphism. Schematic rear→front dimple / jet pin-through '
  + '(PoF spherical-cap→toroidal peer; CMC/Clifford R/a≈√2). Young–Laplace / '
  + 'buoyancy-jetting motif only — not continuum CFD; plasma ≠ fusion.';

/** Dimple pin as collapse focus — H + e⁻/ions schematic condensation. */
export const COLLAPSE_FOCUS_CHIP = 'pin focus · H+e/ions · schematic';
export const COLLAPSE_FOCUS_CHIP_TOOLTIP =
  'Dimple pin is the collapse focus: schematic condensation of H and electrons/ions '
  + 'toward an extreme local field cue along the pin-through axis. Presentation '
  + 'morphology only — not PIC/MD, not continuum CFD; plasma ≠ fusion. Does not '
  + 'close EQ-OPEN or flip lenr_proved.';

/**
 * Optional Schwinger-limit visual hint only — exploratory / not proved.
 * Engine E_cr peer is ~1.32e18 V/m; attainable collapse fields stay far below.
 */
export const SCHWINGER_HINT_CHIP = 'Schwinger hint · exploratory · not proved';
export const SCHWINGER_HINT_CHIP_TOOLTIP =
  'Optional Schwinger-limit (E_cr ≈ m_e²c³/eℏ) *hint* at the pin focus — exploratory '
  + 'motif only, not a solved QED pair-production claim. Weak-field HE vacuum '
  + 'polarisation is negligible at attainable collapse fields; does NOT close any '
  + 'EQ-OPEN-* or flip lenr_proved. Plasma ≠ fusion.';

/**
 * Bubble fold-in → puncture → through-hole torus across the scrub window.
 * Topology honesty: genus change via puncture/coalesce, not flatten+spawn.
 * Dimple pin = collapse focus (H + e/ions condensation) → jet birth.
 *
 * Stages (collapseProgress 0..1):
 *   dimple/focus → walls meet → puncture → Clifford-ish torus → jet (caller)
 *
 * @param {number} collapseProgress 0..1 across torus scrub window
 */
export function computeBubbleTorusMorph(collapseProgress = 0) {
  const p = Math.min(1, Math.max(0, Number(collapseProgress) || 0));
  const smooth = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / Math.max(1e-6, b - a)));
    return t * t * (3 - 2 * t);
  };
  // Rear→front dimple depth (jet pin-through cue)
  const dimple = smooth(0.0, 0.5, p);
  const wallsMeet = smooth(0.4, 0.55, p);
  const punctured = p >= 0.5;
  // Torus only after puncture/coalesce — cyclide-ish birth
  const torusBirth = smooth(0.48, 0.7, p);
  const torusVisible = torusBirth > 0.05;
  // Bubble remains while folding in; fades hard at puncture
  const bubbleOpacityMul = (1 - smooth(0.45, 0.72, p)) * (1 - wallsMeet * 0.35);
  const bubbleVisible = bubbleOpacityMul > 0.03 && torusBirth < 0.97;
  // Mild equatorial swell as dimple caves the rear pole
  const bubbleScaleXY = 1 + dimple * 0.12 - torusBirth * 0.08;
  const bubbleScaleY = 1 - dimple * 0.15;
  // Clifford aspect at birth (fat ring / small hole), then thin slightly
  const torusMajorMul = 0.55 + torusBirth * 0.45;
  const torusTubeMul = 1.35 - torusBirth * 0.35;
  const torusOpacityMul = torusBirth;
  const cloudStrength = Math.max(dimple * 0.25, torusBirth * (0.4 + p * 0.6));
  // Collapse focus: pin intensifies with dimple, peaks at puncture, feeds jet
  const focusStrength = Math.min(
    1,
    dimple * 0.85 + wallsMeet * 0.35 + smooth(0.48, 0.78, p) * 0.55,
  );
  const condensation = Math.min(1, dimple * 0.55 + wallsMeet * 0.7 + (punctured ? 0.35 : 0));
  // Pin core rides rear→front (+Y → −Y) with the dimple
  const pinAxisY = 0.72 - dimple * 1.15 - wallsMeet * 0.25 - torusBirth * 0.35;
  // Optional Schwinger-limit hint: late, high-focus flash only (exploratory)
  const schwingerHint = smooth(0.52, 0.78, p) * focusStrength;
  const jetBirthBoost = smooth(0.55, 0.85, p) * (0.4 + focusStrength * 0.6);
  return {
    bubbleVisible,
    bubbleOpacityMul,
    bubbleScaleXY,
    bubbleScaleY,
    dimple,
    wallsMeet,
    punctured,
    torusVisible,
    torusBirth,
    torusMajorMul,
    torusTubeMul,
    torusOpacityMul,
    cloudStrength,
    cliffordAspect: CLIFFORD_TORUS_ASPECT,
    focusStrength,
    condensation,
    pinAxisY,
    schwingerHint,
    jetBirthBoost,
  };
}

/**
 * Capture rest positions once for fold-in deformation.
 * @param {THREE.BufferGeometry} geometry
 */
export function ensureSphereRestPositions(geometry) {
  if (!geometry?.attributes?.position) return null;
  if (geometry.userData.foldInRest) return geometry.userData.foldInRest;
  const src = geometry.attributes.position.array;
  const rest = new Float32Array(src.length);
  rest.set(src);
  geometry.userData.foldInRest = rest;
  return rest;
}

/**
 * Rear (+Y) → front (−Y) dimple / jet pin-through on a unit sphere.
 * When dimple→1, the rear caves through toward the lattice-facing pole.
 * Presentation only — not a CMC solver.
 *
 * @param {THREE.BufferGeometry} geometry
 * @param {number} dimpleAmount 0..1
 * @param {number} [wallsMeet=0] 0..1 coalesce cue (pinches waist)
 */
export function applySphereFoldInDimple(geometry, dimpleAmount = 0, wallsMeet = 0) {
  const rest = ensureSphereRestPositions(geometry);
  const pos = geometry?.attributes?.position;
  if (!rest || !pos) return;
  const d = Math.min(1, Math.max(0, Number(dimpleAmount) || 0));
  const w = Math.min(1, Math.max(0, Number(wallsMeet) || 0));
  const arr = pos.array;
  for (let i = 0; i < arr.length; i += 3) {
    const x0 = rest[i];
    const y0 = rest[i + 1];
    const z0 = rest[i + 2];
    // Rear hemisphere (+Y) caves toward −Y (lattice / jet pin-through)
    const rear = Math.max(0, y0); // 0..1 on unit sphere
    const falloff = rear * rear;
    const cave = d * 1.85 * falloff;
    let y = y0 - cave;
    // Walls-meet: pull radial waist inward near the dimple axis (puncture prep)
    const radial = Math.sqrt(x0 * x0 + z0 * z0) || 1e-6;
    const waist = Math.exp(-((y0 - (1 - d)) ** 2) / 0.18);
    const pinch = 1 - w * 0.55 * waist * (0.35 + 0.65 * d);
    const x = x0 * pinch;
    const z = z0 * pinch;
    // Keep roughly on a deformed shell (soft normalize blend)
    const len = Math.sqrt(x * x + y * y + z * z) || 1;
    const targetR = 1 - d * 0.08 * falloff;
    const blend = 0.35 + 0.45 * d;
    arr[i] = x * (1 - blend) + (x / len) * targetR * blend;
    arr[i + 1] = y * (1 - blend) + (y / len) * targetR * blend;
    arr[i + 2] = z * (1 - blend) + (z / len) * targetR * blend;
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

/**
 * Soft pin-focus condensation along the dimple axis (H + e⁻/ions schematic).
 * Core rides pinAxisY; particles fall inward; schwingerHint = exploratory flash only.
 *
 * @returns {{ group: THREE.Group, update: Function, dispose: Function }}
 */
export function createCollapseFocusPinGroup({
  count = 96,
  hydrogenColor = 0xff6b8a,
  chargeColor = 0x7ec8ff,
} = {}) {
  const n = Math.max(24, count | 0);
  const group = new THREE.Group();
  group.name = 'CollapseFocusPin';
  group.visible = false;

  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const seeds = new Float32Array(n * 4); // radial0, az, yBias, species (0=H,1=charge)
  const hCol = new THREE.Color(hydrogenColor);
  const cCol = new THREE.Color(chargeColor);

  for (let i = 0; i < n; i += 1) {
    const species = i % 3 === 0 ? 0 : 1;
    seeds[i * 4] = 0.25 + Math.random() * 0.85;
    seeds[i * 4 + 1] = Math.random() * Math.PI * 2;
    seeds[i * 4 + 2] = (Math.random() - 0.5) * 0.9;
    seeds[i * 4 + 3] = species;
    const col = species < 0.5 ? hCol : cCol;
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const softMap = createSoftDiscTexture(64);
  const pointsMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.11,
    map: softMap,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    vertexColors: true,
  });
  const points = new THREE.Points(geo, pointsMat);
  points.name = 'CollapseFocusCondensate';
  points.renderOrder = 5;
  group.add(points);

  const coreGeo = new THREE.SphereGeometry(0.08, 16, 12);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xfff4d0,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.name = 'CollapseFocusCore';
  core.renderOrder = 6;
  group.add(core);

  const pinLight = new THREE.PointLight(0xffe8b0, 0, 4.5, 2);
  pinLight.name = 'CollapseFocusLight';
  group.add(pinLight);

  group.userData = {
    fidelity: BUBBLE_TORUS_FIDELITY,
    source: BUBBLE_TORUS_SOURCE,
    seeds,
    softMap,
    time: 0,
  };

  const update = (morph = {}, deltaTime = 0.016, jetGate = 0) => {
    const focus = Math.min(1, Math.max(0, Number(morph.focusStrength) || 0));
    const cond = Math.min(1, Math.max(0, Number(morph.condensation) || 0));
    const hint = Math.min(1, Math.max(0, Number(morph.schwingerHint) || 0));
    const pinY = Number.isFinite(morph.pinAxisY) ? morph.pinAxisY : 0.4;
    const jetBoost = Math.min(1, Math.max(0, Number(morph.jetBirthBoost) || 0));
    const jg = Math.min(1, Math.max(0, Number(jetGate) || 0));
    const strength = Math.max(focus, jg * 0.55 + jetBoost * 0.45);
    group.visible = strength > 0.04;
    if (!group.visible) {
      pinLight.intensity = 0;
      return;
    }
    group.userData.time += deltaTime * (1.4 + strength * 2.8);
    const t = group.userData.time;
    const pos = geo.attributes.position.array;
    const col = geo.attributes.color.array;
    // Core rides pin; after puncture drifts toward lattice (−Y) into jet birth
    const coreY = pinY - jg * 0.55 - jetBoost * 0.35;
    core.position.set(0, coreY, 0);
    pinLight.position.set(0, coreY, 0);
    const coreScale = 0.55 + strength * 1.4 + hint * 0.85;
    core.scale.setScalar(coreScale);
    coreMat.opacity = 0.35 + strength * 0.5 + hint * 0.25;
    // Exploratory Schwinger hint: brief whitening + light kick only
    if (hint > 0.15) {
      coreMat.color.setRGB(1, 0.96 + hint * 0.04, 0.85 + hint * 0.15);
      pinLight.color.setRGB(1, 0.92, 0.78 + hint * 0.2);
    } else {
      coreMat.color.setHex(0xfff4d0);
      pinLight.color.setHex(0xffe8b0);
    }
    pinLight.intensity = 0.35 + strength * 1.8 + hint * 1.4 + jg * 0.6;
    pinLight.distance = 3.2 + strength * 2.5;

    for (let i = 0; i < n; i += 1) {
      const r0 = seeds[i * 4];
      const az = seeds[i * 4 + 1] + t * (0.6 + (i % 5) * 0.08);
      const yBias = seeds[i * 4 + 2];
      const species = seeds[i * 4 + 3];
      const inward = 1 - cond * 0.78 - strength * 0.15;
      const r = r0 * Math.max(0.04, inward) * (0.55 + 0.45 * (1 - jg));
      const y = coreY + yBias * (0.55 - cond * 0.35) * (1 - strength * 0.25)
        + Math.sin(t * 3.2 + i) * 0.03 * (1 - cond);
      pos[i * 3] = r * Math.cos(az);
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = r * Math.sin(az);
      const base = species < 0.5 ? hCol : cCol;
      const hot = 0.55 + strength * 0.45 + hint * 0.35;
      col[i * 3] = Math.min(1, base.r * hot + hint * 0.25);
      col[i * 3 + 1] = Math.min(1, base.g * (0.7 + hot * 0.3) + hint * 0.2);
      col[i * 3 + 2] = Math.min(1, base.b * (0.65 + hot * 0.35) + hint * 0.15);
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    pointsMat.opacity = 0.18 + strength * 0.55 + cond * 0.15;
    pointsMat.size = 0.07 + strength * 0.12 + cond * 0.04;
  };

  const dispose = () => {
    geo.dispose();
    pointsMat.dispose();
    if (softMap?.dispose) softMap.dispose();
    coreGeo.dispose();
    coreMat.dispose();
  };

  return { group, update, dispose };
}

/**
 * Build high-segment bubble + torus geometries for a smoother silhouette.
 * Torus uses Clifford-ish aspect R/a≈√2 for fold-in birth read.
 */
export function createBubbleTorusGeometries() {
  return {
    gas: new THREE.SphereGeometry(1, 64, 48),
    doubleLayer: new THREE.SphereGeometry(1.12, 64, 48),
    doubleLayerWire: new THREE.SphereGeometry(1.135, 32, 20),
    innerLayer: new THREE.SphereGeometry(0.92, 48, 36),
    // Clifford / CMC aspect peer (schematic cyclide-ish through-hole)
    torus: new THREE.TorusGeometry(
      FOLD_IN_TORUS_MAJOR,
      FOLD_IN_TORUS_TUBE,
      48,
      128,
    ),
    torusFilament: new THREE.TorusGeometry(
      FOLD_IN_TORUS_MAJOR * 1.04,
      FOLD_IN_TORUS_TUBE * 0.42,
      24,
      112,
    ),
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
 * Main (horizontal / XZ) torus spins inward toward the hole.
 * Shed debris counter-rotate relative to this sign.
 */
export const MAIN_TORUS_INWARD_SPIN = -1;

/**
 * Rest orientation for an ejected shed torus ~90° to the main (XZ) ring.
 * Vertical "wheel" whose axis points along travel azimuth (radial outward).
 *
 * @param {number} azimuth rad in XZ
 * @returns {{ x: number, y: number, z: number }}
 */
export function shedTorusRestRotation(azimuth = 0) {
  const az = Number(azimuth) || 0;
  // Default TorusGeometry lies in XY; leave x≈0 (vertical) vs main's x=π/2.
  // Face the wheel along the radial travel direction.
  return { x: 0, y: az + Math.PI / 2, z: 0 };
}

/**
 * Secondary turbulent tori + micro-bubbles that shed after the maser-like jet.
 * Rising cohort: world +Y away from lattice (latched; never reverse).
 * Lattice cohort: more bubbles/tori travel radially along the lattice plane.
 * Ejected tori sit ~90° to the large (XZ) torus; main spins inward.
 *
 * Honesty: schematic hydro / optical morphology — not CFD, not fusion.
 *
 * @returns {{ group: THREE.Group, update: Function, dispose: Function }}
 */
export function createShedPlasmaDebrisGroup({
  torusCount = 5,
  bubbleCount = 8,
  latticeTorusCount = 4,
  latticeBubbleCount = 6,
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
  const latticeTorusGeo = new THREE.TorusGeometry(0.32, 0.09, 10, 40);
  const bubbleGeo = new THREE.SphereGeometry(0.18, 16, 12);
  const smallBubbleGeo = new THREE.SphereGeometry(0.12, 12, 10);
  const disposables = [torusGeo, latticeTorusGeo, bubbleGeo, smallBubbleGeo];

  const addRisingTorus = (i, nT) => {
    const mat = createTorusPlasmaMaterial({
      color: i % 2 === 0 ? primaryColor : secondaryColor,
      opacity: 0.42,
      fluidLook: false,
    });
    applyPlasmaFluidLook(mat, { kind: 'shed' });
    disposables.push(mat);
    const mesh = new THREE.Mesh(torusGeo, mat);
    mesh.name = `ShedTorus${i}`;
    const azimuth = (i / nT) * Math.PI * 2 + 0.4;
    const rest = shedTorusRestRotation(azimuth);
    mesh.rotation.set(rest.x, rest.y, rest.z);
    mesh.visible = false;
    mesh.userData = {
      kind: 'torus',
      path: 'rise',
      spinSign: -1,
      spinRate: 2.2 + i * 0.45,
      azimuth,
      radialStart: 0.35 + (i % 4) * 0.1,
      radialEnd: 0.95 + (i % 4) * 0.22,
      spawnLocalY: 0.7 + (i % 3) * 0.1,
      riseDistance: 1.85 + (i % 4) * 0.28,
      delay: i * 0.07,
      scale0: 0.5 + (i % 3) * 0.1,
      peakOpacity: 0.42,
      worldYLatched: null,
      spawnWorldY: null,
    };
    group.add(mesh);
  };

  const addRisingBubble = (i, nB) => {
    const mat = createBubbleGasMaterial({
      color: i % 2 === 0 ? secondaryColor : primaryColor,
      opacity: 0.36,
    });
    mat.blending = THREE.AdditiveBlending;
    mat.emissive = new THREE.Color(i % 2 === 0 ? secondaryColor : primaryColor);
    mat.emissiveIntensity = 0.65;
    applyPlasmaFluidLook(mat, { kind: 'shed' });
    disposables.push(mat);
    const mesh = new THREE.Mesh(bubbleGeo, mat);
    mesh.name = `ShedBubble${i}`;
    mesh.visible = false;
    const azimuth = (i / nB) * Math.PI * 2 + 1.1;
    mesh.userData = {
      kind: 'bubble',
      path: 'rise',
      spinSign: -1,
      spinRate: 1.4 + i * 0.28,
      azimuth,
      radialStart: 0.25 + (i % 4) * 0.07,
      radialEnd: 0.75 + (i % 4) * 0.18,
      spawnLocalY: 0.72 + (i % 3) * 0.08,
      riseDistance: 1.65 + (i % 3) * 0.28,
      delay: 0.04 + i * 0.055,
      scale0: 0.32 + (i % 3) * 0.1,
      peakOpacity: 0.36,
      worldYLatched: null,
      spawnWorldY: null,
    };
    group.add(mesh);
  };

  const addLatticeTraveler = ({
    i, n, kind, geo, namePrefix, delayBase, scale0,
  }) => {
    const isTorus = kind === 'latticeTorus';
    const color = i % 2 === 0 ? primaryColor : secondaryColor;
    let mat;
    if (isTorus) {
      mat = createTorusPlasmaMaterial({ color, opacity: 0.38, fluidLook: false });
    } else {
      mat = createBubbleGasMaterial({ color, opacity: 0.34 });
      mat.blending = THREE.AdditiveBlending;
      mat.emissive = new THREE.Color(color);
      mat.emissiveIntensity = 0.55;
    }
    applyPlasmaFluidLook(mat, { kind: 'shed' });
    disposables.push(mat);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = `${namePrefix}${i}`;
    mesh.visible = false;
    const azimuth = (i / Math.max(1, n)) * Math.PI * 2 + (isTorus ? 0.2 : 0.9);
    if (isTorus) {
      const rest = shedTorusRestRotation(azimuth);
      mesh.rotation.set(rest.x, rest.y, rest.z);
    }
    mesh.userData = {
      kind,
      path: 'lattice',
      spinSign: -1,
      spinRate: (isTorus ? 1.8 : 1.1) + i * 0.22,
      azimuth,
      // Travel along lattice plane (XZ); local Y stays near nest underside
      radialStart: 0.55 + (i % 3) * 0.12,
      radialEnd: 1.55 + (i % 4) * 0.35,
      spawnLocalY: -0.15 + (i % 3) * 0.04, // near lattice plane under nest
      riseDistance: 0.08 + (i % 3) * 0.04, // tiny float only — planar travel
      delay: delayBase + i * 0.05,
      scale0,
      peakOpacity: isTorus ? 0.38 : 0.34,
      worldYLatched: null,
      spawnWorldY: null,
    };
    group.add(mesh);
  };

  const nT = Math.max(1, torusCount | 0);
  for (let i = 0; i < nT; i += 1) addRisingTorus(i, nT);
  const nB = Math.max(1, bubbleCount | 0);
  for (let i = 0; i < nB; i += 1) addRisingBubble(i, nB);
  const nLT = Math.max(0, latticeTorusCount | 0);
  for (let i = 0; i < nLT; i += 1) {
    addLatticeTraveler({
      i, n: nLT, kind: 'latticeTorus', geo: latticeTorusGeo,
      namePrefix: 'LatticeShedTorus', delayBase: 0.02, scale0: 0.4 + (i % 3) * 0.08,
    });
  }
  const nLB = Math.max(0, latticeBubbleCount | 0);
  for (let i = 0; i < nLB; i += 1) {
    addLatticeTraveler({
      i, n: nLB, kind: 'latticeBubble', geo: smallBubbleGeo,
      namePrefix: 'LatticeShedBubble', delayBase: 0.03, scale0: 0.28 + (i % 3) * 0.07,
    });
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
    // Default inward main spin; shed counter-rotates via spinSign
    const primarySpin = Number.isFinite(opts.primarySpin)
      ? Math.sign(opts.primarySpin) || MAIN_TORUS_INWARD_SPIN
      : MAIN_TORUS_INWARD_SPIN;
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
      // Lattice path: keep Y near lattice plane; rise path uses latched world +Y
      child.position.set(r * Math.cos(az), sample.localY, r * Math.sin(az));
      child.userData.lastWorldY = sample.worldY;
      child.userData.lastRiseT = sample.riseT;
      child.userData.lastAzimuth = az;
      const sc = d.scale0;
      if (d.kind === 'torus' || d.kind === 'latticeTorus') {
        child.scale.set(sc, sc * 0.85, sc);
        // Keep ~90° wheel facing travel azimuth as it slides
        const rest = shedTorusRestRotation(az);
        child.rotation.x = rest.x;
        child.rotation.y = rest.y;
      } else {
        child.scale.setScalar(sc);
      }
      const spinDir = -primarySpin * (d.spinSign || -1);
      child.rotation.z += deltaTime * d.spinRate * spinDir * (0.7 + s);
      if (child.material) {
        child.material.opacity = sample.opacity;
        if (child.material.emissiveIntensity !== undefined) {
          const isT = d.kind === 'torus' || d.kind === 'latticeTorus';
          child.material.emissiveIntensity = (isT ? 1.0 : 0.7)
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
