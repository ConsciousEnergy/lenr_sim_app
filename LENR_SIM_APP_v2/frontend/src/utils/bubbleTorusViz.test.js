import * as THREE from 'three';
import {
  BUBBLE_TORUS_FIDELITY,
  temperatureToBubbleTint,
  createBubbleGasMaterial,
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

  test('materials are MeshPhysical with transparency', () => {
    const gas = createBubbleGasMaterial();
    const torus = createTorusPlasmaMaterial();
    expect(gas.type).toBe('MeshPhysicalMaterial');
    expect(gas.transparent).toBe(true);
    expect(torus.emissiveIntensity).toBeGreaterThan(0.5);
    gas.dispose();
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

  test('geometries expose high-segment bubble and torus', () => {
    const geos = createBubbleTorusGeometries();
    expect(geos.gas.parameters.widthSegments).toBeGreaterThanOrEqual(48);
    expect(geos.torus.type).toBe('TorusGeometry');
    Object.values(geos).forEach((g) => g.dispose());
  });
});
