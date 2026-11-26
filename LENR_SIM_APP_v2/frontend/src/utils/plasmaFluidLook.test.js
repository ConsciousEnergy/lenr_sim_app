import * as THREE from 'three';
import {
  PLASMA_FLUID_LOOK_CHIP,
  PLASMA_FLUID_LOOK_FIDELITY,
  advancePlasmaFluidLook,
  applyPlasmaFluidLook,
  createAdvectiveStreakTexture,
  createLaminarNoiseTexture,
  createSoftRefractionNormalMap,
  createTurbulentNoiseTexture,
  fbmNoise2D,
  valueNoise2D,
} from './plasmaFluidLook';
import { createJetMaterial, createTorusPlasmaMaterial } from './bubbleTorusViz';

describe('plasmaFluidLook (schematic fluid texturing)', () => {
  test('fidelity and chip stay schematic / not CFD', () => {
    expect(PLASMA_FLUID_LOOK_FIDELITY).toBe('schematic');
    expect(PLASMA_FLUID_LOOK_CHIP.toLowerCase()).toContain('not cfd');
    expect(PLASMA_FLUID_LOOK_CHIP.toLowerCase()).toContain('laminar');
  });

  test('valueNoise / fbm stay in 0..1', () => {
    for (let i = 0; i < 20; i += 1) {
      const v = valueNoise2D(i * 0.17, i * 0.31, 2);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      const f = fbmNoise2D(i * 0.1, i * 0.2, { seed: 4 });
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
    }
  });

  test('procedural textures exist with repeat wrap (Canvas or Data)', () => {
    const noise = createTurbulentNoiseTexture({ size: 32, seed: 1 });
    const laminar = createLaminarNoiseTexture({ size: 32, seed: 5 });
    const normal = createSoftRefractionNormalMap({ size: 32, seed: 2 });
    const streak = createAdvectiveStreakTexture({ size: 32, seed: 3 });
    expect(noise).toBeTruthy();
    expect(laminar).toBeTruthy();
    expect(normal).toBeTruthy();
    expect(streak).toBeTruthy();
    expect(noise.isTexture).toBe(true);
    expect(noise.wrapS).toBe(THREE.RepeatWrapping);
    expect(streak.wrapT).toBe(THREE.RepeatWrapping);
    expect(noise.userData.kind).toBe('turbulentNoise');
    expect(laminar.userData.kind).toBe('laminarNoise');
    expect(streak.userData.kind).toBe('advectiveStreak');
    noise.dispose();
    laminar.dispose();
    normal.dispose();
    streak.dispose();
  });

  test('applyPlasmaFluidLook attaches maps; advance scrolls UV offsets', () => {
    const mat = createTorusPlasmaMaterial({ fluidLook: false });
    applyPlasmaFluidLook(mat, { kind: 'torus', mode: 'turbulent' });
    expect(mat.map).toBeTruthy();
    expect(mat.emissiveMap).toBeTruthy();
    expect(mat.userData.plasmaFluidLook.kind).toBe('torus');
    expect(mat.userData.plasmaFluidLook.mode).toBe('turbulent');
    const u0 = mat.map.offset.x;
    const v0 = mat.map.offset.y;
    advancePlasmaFluidLook(mat, 0.5);
    expect(mat.map.offset.x).not.toBe(u0);
    expect(mat.map.offset.y).not.toBe(v0);
    mat.map?.dispose?.();
    mat.emissiveMap?.dispose?.();
    mat.normalMap?.dispose?.();
    mat.roughnessMap?.dispose?.();
    mat.dispose();
  });

  test('turbulent vs laminar modes differ in scroll and map kind', () => {
    const turb = createTorusPlasmaMaterial({ fluidLook: false });
    const lam = createTorusPlasmaMaterial({ fluidLook: false });
    applyPlasmaFluidLook(turb, { kind: 'torus', mode: 'turbulent' });
    applyPlasmaFluidLook(lam, { kind: 'shed', mode: 'laminar' });
    expect(turb.userData.plasmaFluidLook.mode).toBe('turbulent');
    expect(lam.userData.plasmaFluidLook.mode).toBe('laminar');
    expect(turb.map.userData.kind).toBe('turbulentNoise');
    expect(lam.map.userData.kind).toBe('laminarNoise');
    expect(turb.userData.plasmaFluidLook.scrollU)
      .toBeGreaterThan(lam.userData.plasmaFluidLook.scrollU);
    turb.map?.dispose?.();
    lam.map?.dispose?.();
    turb.dispose();
    lam.dispose();
  });

  test('jet material gets advective streak look by default', () => {
    const jet = createJetMaterial();
    expect(jet.userData.plasmaFluidLook.kind).toBe('jet');
    expect(jet.userData.plasmaFluidLook.mode).toBe('laminar');
    expect(jet.map).toBeTruthy();
    expect(jet.userData.plasmaFluidLook.scrollV).toBeGreaterThan(
      jet.userData.plasmaFluidLook.scrollU,
    );
    jet.map?.dispose?.();
    jet.emissiveMap?.dispose?.();
    jet.dispose();
  });
});
