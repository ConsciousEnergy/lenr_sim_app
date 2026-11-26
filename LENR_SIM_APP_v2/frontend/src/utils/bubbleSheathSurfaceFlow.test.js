import {
  SHEATH_SURFACE_FLOW_CHIP,
  SHEATH_SURFACE_FLOW_FIDELITY,
  createSheathSurfaceFlowGroup,
  seedSheathSurfaceParticles,
  updateSheathSurfaceFlow,
  disposeSheathSurfaceFlow,
} from './bubbleSheathSurfaceFlow';

describe('bubbleSheathSurfaceFlow (schematic sheath overlay)', () => {
  test('honesty constants stay schematic / not measured spin', () => {
    expect(SHEATH_SURFACE_FLOW_FIDELITY).toBe('schematic');
    expect(SHEATH_SURFACE_FLOW_CHIP).toMatch(/not measured bubble spin/i);
  });

  test('seedSheathSurfaceParticles returns banded seeds', () => {
    let i = 0;
    const rng = () => {
      i += 1;
      return (i % 10) / 10;
    };
    const seeds = seedSheathSurfaceParticles(8, rng);
    expect(seeds).toHaveLength(8);
    expect(seeds[0]).toEqual(
      expect.objectContaining({
        theta: expect.any(Number),
        phi: expect.any(Number),
        speed: expect.any(Number),
        ionLike: expect.any(Boolean),
      }),
    );
  });

  test('createSheathSurfaceFlowGroup starts hidden with Points + ribbons', () => {
    const group = createSheathSurfaceFlowGroup({
      count: 12,
      ribbonCount: 3,
      rng: () => 0.4,
    });
    expect(group.visible).toBe(false);
    expect(group.name).toBe('SheathSurfaceFlow');
    expect(group.userData.claim).toBe('not_measured_bubble_spin');
    expect(group.getObjectByName('SheathSurfaceFlowPoints')).toBeTruthy();
    expect(group.userData.ribbons).toHaveLength(3);
    disposeSheathSurfaceFlow(group);
  });

  test('updateSheathSurfaceFlow respects visible flag and advances theta', () => {
    const group = createSheathSurfaceFlowGroup({
      count: 4,
      ribbonCount: 1,
      rng: () => 0.25,
    });
    const before = group.userData.seeds[0].theta;
    const metaOff = updateSheathSurfaceFlow(group, {
      displayScale: 1.2,
      delta: 0.02,
      visible: false,
    });
    expect(group.visible).toBe(false);
    expect(metaOff.chip).toMatch(/not measured bubble spin/i);

    updateSheathSurfaceFlow(group, {
      displayScale: 1.2,
      delta: 0.05,
      visible: true,
      pinchAmt: 0.4,
    });
    expect(group.visible).toBe(true);
    expect(group.userData.seeds[0].theta).not.toBe(before);
    disposeSheathSurfaceFlow(group);
  });
});
