import * as THREE from 'three';
import {
  SHED_CASCADE_CHIP,
  SHED_CASCADE_FIDELITY,
  SHED_EDDY_CHIP,
  applyShedTorusTwistFold,
  computeShedCascadeStage,
  createShedEddyCloud,
  ensureTorusRestPositions,
} from './shedTorusCascadeViz';
import {
  MAIN_TORUS_INWARD_SPIN,
  createShedPlasmaDebrisGroup,
  SHED_NEUTRAL_COLOR,
} from './bubbleTorusViz';

describe('shedTorusCascadeViz (twist/fold · daughter cascade)', () => {
  test('chips stay schematic / not NS', () => {
    expect(SHED_CASCADE_FIDELITY).toBe('schematic');
    expect(SHED_CASCADE_CHIP.toLowerCase()).toContain('cascade');
    expect(SHED_CASCADE_CHIP.toLowerCase()).toContain('twist');
    expect(SHED_EDDY_CHIP.toLowerCase()).toMatch(/edd(?:y|ies)/);
  });

  test('cascade stage: tent→sheet→daughter→tertiary gates', () => {
    const early = computeShedCascadeStage(0.1, 0);
    expect(early.tent).toBeGreaterThan(0);
    expect(early.daughterGate).toBeLessThan(0.1);
    const mid = computeShedCascadeStage(0.5, 0);
    expect(mid.fold).toBeGreaterThan(0.3);
    expect(mid.daughterGate).toBeGreaterThan(0.4);
    expect(mid.stretch.sx).toBeGreaterThan(1);
    expect(mid.stretch.sy).toBeLessThan(1);
    const late = computeShedCascadeStage(0.7, 0);
    expect(late.twist).toBeGreaterThan(0.4);
    expect(late.eddy).toBeGreaterThan(0.3);
  });

  test('twist/fold deforms vertices away from rest (not rigid)', () => {
    const geo = new THREE.TorusGeometry(0.4, 0.1, 8, 24);
    const rest = ensureTorusRestPositions(geo);
    applyShedTorusTwistFold(geo, { twist: 0.9, fold: 0.8, tent: 0.5, time: 1.2 });
    const arr = geo.attributes.position.array;
    let moved = 0;
    for (let i = 0; i < arr.length; i += 3) {
      const dx = arr[i] - rest[i];
      const dy = arr[i + 1] - rest[i + 1];
      const dz = arr[i + 2] - rest[i + 2];
      if (dx * dx + dy * dy + dz * dz > 1e-8) moved += 1;
    }
    expect(moved).toBeGreaterThan(arr.length / 9);
    geo.dispose();
  });

  test('eddy cloud updates when centers + strength present', () => {
    const cloud = createShedEddyCloud({ count: 40 });
    expect(cloud.points.name).toBe('ShedEddyCloud');
    cloud.update([], 0);
    expect(cloud.points.visible).toBe(false);
    cloud.update([{ x: 0.5, y: 1, z: -0.2 }], 0.8, 0.016);
    expect(cloud.points.visible).toBe(true);
    cloud.dispose();
  });

  test('shed debris: cascade daughters + own geo + not rigid flipper', () => {
    const debris = createShedPlasmaDebrisGroup({
      torusCount: 2,
      bubbleCount: 1,
      latticeTorusCount: 1,
      latticeBubbleCount: 1,
      daughterPerParent: 2,
      tertiaryPerDaughter: 1,
    });
    expect(debris.group.userData.cascade).toBe(true);
    expect(debris.group.userData.uncolored).toBe(true);
    const parents = debris.group.children.filter((c) => c.userData?.kind === 'torus');
    const daughters = debris.group.children.filter((c) => c.userData?.kind === 'daughterTorus');
    const tertiary = debris.group.children.filter((c) => c.userData?.kind === 'tertiaryTorus');
    expect(parents.length).toBe(2);
    expect(daughters.length).toBe(4); // 2 parents × 2
    expect(tertiary.length).toBe(4); // 2 × 2 × 1
    // Each parent has its own geometry (not shared flipper buffer)
    expect(parents[0].geometry).not.toBe(parents[1].geometry);
    parents.forEach((t) => {
      expect(t.material.color.getHex()).toBe(SHED_NEUTRAL_COLOR);
      expect(t.material.userData.plasmaFluidLook.phase).toBe('gas');
      expect(t.userData.deformOwnGeo).toBe(true);
    });

    // Drive into mid cascade window — deform + daughters; don't run to full fade
    for (let i = 0; i < 18; i += 1) {
      debris.update(0.05, 0.2 + i * 0.025, {
        primarySpin: MAIN_TORUS_INWARD_SPIN,
        parentWorldY: -3,
      });
    }
    const liveParents = parents.filter((p) => p.visible);
    expect(liveParents.length).toBeGreaterThan(0);
    const p0 = liveParents[0];
    const rest = p0.geometry.userData.cascadeRest;
    const arr = p0.geometry.attributes.position.array;
    let moved = 0;
    for (let i = 0; i < arr.length; i += 3) {
      const d2 = (arr[i] - rest[i]) ** 2
        + (arr[i + 1] - rest[i + 1]) ** 2
        + (arr[i + 2] - rest[i + 2]) ** 2;
      if (d2 > 1e-8) moved += 1;
    }
    expect(moved).toBeGreaterThan(10);
    const liveDaughters = daughters.filter((d) => d.visible);
    expect(liveDaughters.length + tertiary.filter((t) => t.visible).length)
      .toBeGreaterThan(0);
    debris.dispose();
  });
});
