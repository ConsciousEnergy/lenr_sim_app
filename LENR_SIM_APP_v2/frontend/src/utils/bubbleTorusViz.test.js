import * as THREE from 'three';
import {
  BUBBLE_TORUS_FIDELITY,
  DOUBLE_LAYER_WIRE_OPACITY_COLLAPSE,
  DOUBLE_LAYER_WIRE_OPACITY_EXPANSION,
  temperatureToBubbleTint,
  createBubbleGasMaterial,
  createDoubleLayerMaterial,
  createShedPlasmaDebrisGroup,
  BUBBLE_FOLD_IN_CHIP,
  CLIFFORD_TORUS_ASPECT,
  COLLAPSE_FOCUS_CHIP,
  FOLD_IN_TORUS_MAJOR,
  FOLD_IN_TORUS_TUBE,
  LAB_ASPHERIC_CHIP,
  LAB_SL_FLASH_CHIP,
  MAIN_TORUS_INWARD_SPIN,
  SCHWINGER_HINT_CHIP,
  SHED_NEUTRAL_COLOR,
  applySphereFoldInDimple,
  computeBubbleTorusMorph,
  computeLabHonestCollapseCue,
  computeShedRiseSample,
  createCollapseFocusPinGroup,
  createTorusPlasmaMaterial,
  ensureSphereRestPositions,
  applyBubbleTemperatureTint,
  createBubbleTorusGeometries,
  shedTorusRestRotation,
} from './bubbleTorusViz';

describe('bubbleTorusViz (presentation materials)', () => {
  test('fidelity stays schematic', () => {
    expect(BUBBLE_TORUS_FIDELITY).toBe('schematic');
  });

  test('temperatureToBubbleTint heats from cyan toward warm/white', () => {
    const cool = temperatureToBubbleTint(300);
    const hot = temperatureToBubbleTint(8000);
    expect(cool.heatNorm).toBeCloseTo(0);
    expect(hot.heatNorm).toBeCloseTo(1);
    expect(hot.emissiveIntensity).toBeGreaterThan(cool.emissiveIntensity);
  });

  test('membrane materials stay MeshPhysical; torus/jet are gaseous additive (not glass)', () => {
    const gas = createBubbleGasMaterial();
    const shell = createDoubleLayerMaterial();
    const torus = createTorusPlasmaMaterial();
    expect(gas.type).toBe('MeshPhysicalMaterial');
    expect(gas.transparent).toBe(true);
    expect(gas.opacity).toBeGreaterThanOrEqual(0.28);
    expect(shell.opacity).toBeGreaterThanOrEqual(0.45);
    expect(torus.type).toBe('MeshStandardMaterial');
    expect(torus.blending).toBe(THREE.AdditiveBlending);
    expect(torus.emissiveIntensity).toBeGreaterThan(0.5);
    expect(torus.roughness).toBeGreaterThan(0.5);
    expect(DOUBLE_LAYER_WIRE_OPACITY_EXPANSION).toBeLessThan(0.15);
    expect(DOUBLE_LAYER_WIRE_OPACITY_COLLAPSE).toBeLessThan(0.2);
    gas.dispose();
    shell.dispose();
    torus.dispose();
  });

  test('applyBubbleTemperatureTint updates named meshes', () => {
    const group = new THREE.Group();
    const bubble = new THREE.Mesh(
      new THREE.SphereGeometry(1, 8, 8),
      createBubbleGasMaterial(),
    );
    bubble.name = 'MainBubble';
    group.add(bubble);
    const tint = applyBubbleTemperatureTint(group, 4000);
    expect(tint.heatNorm).toBeGreaterThan(0.3);
    expect(bubble.material.emissiveIntensity).toBeGreaterThan(0.12);
  });

  test('computeBubbleTorusMorph: fold-in dimple then puncture before torus', () => {
    const early = computeBubbleTorusMorph(0.08);
    expect(early.bubbleVisible).toBe(true);
    expect(early.torusVisible).toBe(false);
    expect(early.dimple).toBeGreaterThan(0);
    expect(early.punctured).toBe(false);
    const prePuncture = computeBubbleTorusMorph(0.45);
    expect(prePuncture.dimple).toBeGreaterThan(0.7);
    expect(prePuncture.wallsMeet).toBeGreaterThan(0.2);
    expect(prePuncture.torusBirth).toBeLessThan(0.2);
    const postPuncture = computeBubbleTorusMorph(0.62);
    expect(postPuncture.punctured).toBe(true);
    expect(postPuncture.torusVisible).toBe(true);
    expect(postPuncture.torusBirth).toBeGreaterThan(0.4);
    const late = computeBubbleTorusMorph(0.9);
    expect(late.torusBirth).toBeGreaterThan(0.95);
    expect(late.cliffordAspect).toBeCloseTo(Math.SQRT2, 5);
    expect(late.focusStrength).toBeGreaterThan(0.7);
    expect(late.condensation).toBeGreaterThan(0.5);
    expect(late.pinAxisY).toBeLessThan(prePuncture.pinAxisY);
    expect(late.schwingerHint).toBeGreaterThan(0.3);
    expect(late.jetBirthBoost).toBeGreaterThan(0.4);
    expect(BUBBLE_FOLD_IN_CHIP.toLowerCase()).toContain('puncture');
    expect(COLLAPSE_FOCUS_CHIP.toLowerCase()).toContain('pin focus');
    expect(SCHWINGER_HINT_CHIP.toLowerCase()).toContain('not proved');
    expect(FOLD_IN_TORUS_MAJOR / FOLD_IN_TORUS_TUBE).toBeCloseTo(CLIFFORD_TORUS_ASPECT, 5);
  });

  test('createCollapseFocusPinGroup condenses toward pin and stays schematic', () => {
    const pin = createCollapseFocusPinGroup({ count: 48 });
    expect(pin.group.name).toBe('CollapseFocusPin');
    expect(pin.group.userData.fidelity).toBe('schematic');
    const morph = computeBubbleTorusMorph(0.6);
    pin.update(morph, 0.016, 0.2);
    expect(pin.group.visible).toBe(true);
    const core = pin.group.getObjectByName('CollapseFocusCore');
    expect(core.position.y).toBeLessThan(0.4);
    pin.update({}, 0.016, 0);
    expect(pin.group.visible).toBe(false);
    pin.dispose();
  });

  test('applySphereFoldInDimple caves rear +Y toward lattice (−Y)', () => {
    const geo = new THREE.SphereGeometry(1, 16, 12);
    ensureSphereRestPositions(geo);
    const arr = geo.attributes.position.array;
    let northBefore = -Infinity;
    for (let i = 1; i < arr.length; i += 3) northBefore = Math.max(northBefore, arr[i]);
    applySphereFoldInDimple(geo, 0.9, 0.6);
    let northAfter = -Infinity;
    for (let i = 1; i < arr.length; i += 3) northAfter = Math.max(northAfter, arr[i]);
    expect(northAfter).toBeLessThan(northBefore - 0.15);
    geo.dispose();
  });

  test('geometries expose high-segment bubble, torus, filament, and jet', () => {
    const geos = createBubbleTorusGeometries();
    expect(geos.gas.parameters.widthSegments).toBeGreaterThanOrEqual(48);
    expect(geos.torus.type).toBe('TorusGeometry');
    expect(geos.torusFilament.type).toBe('TorusGeometry');
    expect(geos.jet.type).toBe('ConeGeometry');
    Object.values(geos).forEach((g) => g.dispose());
  });

  test('computeShedRiseSample: world Y monotonic, opacity falls with riseT', () => {
    let latch = null;
    let spawn = null;
    let progLatch = 0;
    const worldYs = [];
    const opacities = [];
    // Parent nest drops toward lattice (simulates UBLV getBubbleYFromPhase)
    const parentYs = [-3.2, -3.35, -3.5, -3.55, -3.6, -3.5, -3.4];
    const progresses = [0.15, 0.3, 0.5, 0.7, 0.9, 0.4, 1.0]; // includes reverse
    progresses.forEach((p, i) => {
      const sample = computeShedRiseSample({
        shedProgress: p,
        progressLatched: progLatch,
        delay: 0,
        spawnLocalY: 0.7,
        riseDistance: 2.0,
        parentWorldY: parentYs[i],
        peakOpacity: 0.42,
        worldYLatched: latch,
        spawnWorldY: spawn,
      });
      progLatch = sample.progress;
      latch = sample.worldYLatched;
      spawn = sample.spawnWorldY;
      if (sample.active || sample.riseT > 0) {
        worldYs.push(sample.worldY);
        opacities.push(sample.opacity);
      }
    });
    for (let i = 1; i < worldYs.length; i += 1) {
      expect(worldYs[i]).toBeGreaterThanOrEqual(worldYs[i - 1] - 1e-9);
    }
    expect(opacities[opacities.length - 1]).toBeLessThan(opacities[0]);
    // Opacity decreases as rise progresses (compare early vs mid active samples)
    expect(opacities[2]).toBeLessThan(opacities[0]);
  });

  test('computeShedRiseSample: opacity is peak*(1-riseT)', () => {
    const s = computeShedRiseSample({
      shedProgress: 0.5,
      delay: 0,
      peakOpacity: 0.5,
      riseDistance: 1,
      spawnLocalY: 0.5,
      parentWorldY: -3,
    });
    expect(s.opacity).toBeCloseTo(0.5 * (1 - s.riseT), 5);
    expect(s.riseT).toBeGreaterThan(0);
    expect(s.riseT).toBeLessThan(1);
    expect(s.worldY).toBeGreaterThan(-3 + 0.5); // above spawn
  });

  test('shedTorusRestRotation is ~90° to horizontal main torus', () => {
    expect(MAIN_TORUS_INWARD_SPIN).toBe(-1);
    const rest = shedTorusRestRotation(0.4);
    // Main torus uses rotation.x = π/2 (XZ plane); shed leaves x≈0 (vertical)
    expect(Math.abs(rest.x)).toBeLessThan(0.05);
    expect(Math.abs(rest.x - Math.PI / 2)).toBeGreaterThan(1.4);
    expect(rest.y).toBeCloseTo(0.4 + Math.PI / 2, 5);
  });

  test('lab-honest collapse cue: aspheric then brief SL flash', () => {
    const early = computeLabHonestCollapseCue(0.2);
    expect(early.aspheric).toBeGreaterThan(0.1);
    expect(early.slFlash).toBeLessThan(0.05);
    const flash = computeLabHonestCollapseCue(0.68);
    expect(flash.slFlash).toBeGreaterThan(0.4);
    expect(LAB_ASPHERIC_CHIP.toLowerCase()).toContain('aspherical');
    expect(LAB_SL_FLASH_CHIP.toLowerCase()).toContain('sl flash');
  });

  test('shed debris group: world Y rises even when parent nest drops; fades; never reverses', () => {
    const debris = createShedPlasmaDebrisGroup({
      torusCount: 2,
      bubbleCount: 3,
      latticeTorusCount: 2,
      latticeBubbleCount: 2,
    });
    expect(debris.group.name).toBe('ShedPlasmaDebris');
    expect(debris.group.userData.uncolored).toBe(true);
    expect(debris.group.userData.cascade).toBe(true);
    const risingTori = debris.group.children.filter((c) => c.userData?.kind === 'torus');
    expect(risingTori.length).toBe(2);
    risingTori.forEach((t) => {
      expect(Math.abs(t.rotation.x)).toBeLessThan(0.05);
      expect(t.material.color.getHex()).toBe(SHED_NEUTRAL_COLOR);
      expect(t.material.userData.plasmaFluidLook.mode).toBe('laminar');
      expect(t.material.userData.plasmaFluidLook.phase).toBe('gas');
      expect(t.userData.deformOwnGeo).toBe(true);
    });
    const latticeKids = debris.group.children.filter((c) => c.userData?.path === 'lattice');
    expect(latticeKids.length).toBe(4);
    debris.update(0.016, 0, { parentWorldY: -3.0 });
    expect(debris.group.visible).toBe(false);

    const frames = [];
    const parentPath = [-3.0, -3.2, -3.4, -3.55, -3.6, -3.45, -3.3];
    const progPath = [0.2, 0.4, 0.55, 0.75, 0.95, 0.3, 1.0];
    progPath.forEach((p, i) => {
      debris.update(0.016, p, {
        primarySpin: MAIN_TORUS_INWARD_SPIN,
        parentWorldY: parentPath[i],
      });
      const kids = debris.group.children.filter((c) => c.visible);
      if (!kids.length) {
        frames.push(null);
        return;
      }
      const rising = kids.filter((c) => c.userData.path === 'rise');
      const parents = rising.filter((c) => c.userData.kind === 'torus');
      const lattice = kids.filter((c) => c.userData.path === 'lattice');
      const risingYs = rising.map((c) => c.userData.lastWorldY);
      const parentOpacities = parents.map((c) => c.material.opacity);
      frames.push({
        risingMaxY: risingYs.length ? Math.max(...risingYs) : null,
        risingMinY: risingYs.length ? Math.min(...risingYs) : null,
        parentMaxOpacity: parentOpacities.length ? Math.max(...parentOpacities) : null,
        risingCount: rising.length,
        latticeCount: lattice.length,
        latticeRadial: lattice.map((c) => Math.hypot(c.position.x, c.position.z)),
      });
    });
    const live = frames.filter(Boolean);
    expect(live.length).toBeGreaterThan(3);
    // Rising cohort: world Y monotonic
    const risingFrames = live.filter((f) => f.risingCount > 0 && f.risingMaxY != null);
    for (let i = 1; i < risingFrames.length; i += 1) {
      expect(risingFrames[i].risingMaxY).toBeGreaterThanOrEqual(
        risingFrames[i - 1].risingMaxY - 1e-9,
      );
    }
    expect(live.some((f) => f.latticeCount > 0)).toBe(true);
    // Lattice travelers move outward in XZ
    const withLattice = live.filter((f) => f.latticeRadial.length);
    if (withLattice.length >= 2) {
      const firstR = Math.max(...withLattice[0].latticeRadial);
      const lastR = Math.max(...withLattice[withLattice.length - 1].latticeRadial);
      expect(lastR).toBeGreaterThanOrEqual(firstR - 1e-6);
    }
    // Parent tori fade with riseT (daughter cascade may still be bright)
    const parentLive = live.filter((f) => f.parentMaxOpacity != null);
    expect(parentLive[0].parentMaxOpacity).toBeGreaterThan(0.15);
    expect(parentLive[parentLive.length - 1].parentMaxOpacity)
      .toBeLessThan(parentLive[0].parentMaxOpacity);
    // Rising debris stay above deeply nested lattice surface
    expect(risingFrames[0].risingMinY).toBeGreaterThan(-3.0 + 0.4);
    debris.dispose();
  });
});
