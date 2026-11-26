import * as THREE from 'three';
import {
  BUBBLE_TORUS_FIDELITY,
  DOUBLE_LAYER_WIRE_OPACITY_COLLAPSE,
  DOUBLE_LAYER_WIRE_OPACITY_EXPANSION,
  temperatureToBubbleTint,
  createBubbleGasMaterial,
  createDoubleLayerMaterial,
  createShedPlasmaDebrisGroup,
  createTorusPlasmaMaterial,
  applyBubbleTemperatureTint,
  createBubbleTorusGeometries,
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

  test('geometries expose high-segment bubble, torus, filament, and jet', () => {
    const geos = createBubbleTorusGeometries();
    expect(geos.gas.parameters.widthSegments).toBeGreaterThanOrEqual(48);
    expect(geos.torus.type).toBe('TorusGeometry');
    expect(geos.torusFilament.type).toBe('TorusGeometry');
    expect(geos.jet.type).toBe('ConeGeometry');
    Object.values(geos).forEach((g) => g.dispose());
  });

  test('shed debris counter-rotates, rises away from lattice, and fades', () => {
    const debris = createShedPlasmaDebrisGroup({ torusCount: 2, bubbleCount: 3 });
    expect(debris.group.name).toBe('ShedPlasmaDebris');
    expect(debris.group.children.length).toBe(5);
    debris.update(0.016, 0);
    expect(debris.group.visible).toBe(false);
    debris.update(0.016, 0.55, { primarySpin: 1 });
    expect(debris.group.visible).toBe(true);
    const mid = debris.group.children.filter((c) => c.visible);
    expect(mid.length).toBeGreaterThan(0);
    // Rise away from lattice (+Y), not settle onto surface
    expect(mid.some((c) => c.position.y > 0.3)).toBe(true);
    const midY = Math.max(...mid.map((c) => c.position.y));
    const midOpacity = Math.max(...mid.map((c) => c.material.opacity));
    debris.update(0.016, 1.0, { primarySpin: 1 });
    const late = debris.group.children.filter((c) => c.visible);
    const lateY = Math.max(
      ...debris.group.children.map((c) => c.position.y),
      midY,
    );
    expect(lateY).toBeGreaterThanOrEqual(midY);
    const lateOpacity = late.length
      ? Math.max(...late.map((c) => c.material.opacity))
      : 0;
    expect(lateOpacity).toBeLessThan(midOpacity);
    // Decreasing progress must not pull debris back down (latch)
    debris.update(0.016, 0.2, { primarySpin: 1 });
    const afterReverse = Math.max(...debris.group.children.map((c) => c.position.y));
    expect(afterReverse).toBeGreaterThanOrEqual(lateY - 1e-6);
    debris.dispose();
  });
});
