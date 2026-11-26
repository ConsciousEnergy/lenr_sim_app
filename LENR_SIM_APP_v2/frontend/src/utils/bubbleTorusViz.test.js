import * as THREE from 'three';
import {
  BUBBLE_TORUS_FIDELITY,
  DOUBLE_LAYER_WIRE_OPACITY_COLLAPSE,
  DOUBLE_LAYER_WIRE_OPACITY_EXPANSION,
  temperatureToBubbleTint,
  createBubbleGasMaterial,
  createDoubleLayerMaterial,
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
});
