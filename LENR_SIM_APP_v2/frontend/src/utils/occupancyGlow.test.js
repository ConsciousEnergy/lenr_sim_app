import {
  OCCUPANCY_GLOW_ENGINE_FIDELITY,
  OCCUPANCY_GLOW_SCHEMATIC_FIDELITY,
  extractEngineSiteOccupancy,
  occupancyGlowRgb,
  occupancyGlowSiteStrength,
  resolveOccupancyGlowPlan,
} from './occupancyGlow';

describe('occupancyGlow', () => {
  test('uses engine site occupancy when exported', () => {
    const engine = [true, false, true, false];
    const plan = resolveOccupancyGlowPlan({
      siteCount: 4,
      engineOccupancy: engine,
      loadingRatio: 0.1,
    });
    expect(plan.fidelity).toBe(OCCUPANCY_GLOW_ENGINE_FIDELITY);
    expect(plan.engineBound).toBe(true);
    expect(plan.occupied).toEqual(engine);
    expect(plan.occupiedCount).toBe(2);
    expect(plan.label).toMatch(/Engine site loading/i);
  });

  test('falls back to schematic mask with honest chip label', () => {
    const plan = resolveOccupancyGlowPlan({
      siteCount: 8,
      loadingRatio: 0.5,
      seed: 3,
      simulationData: {},
    });
    expect(plan.fidelity).toBe(OCCUPANCY_GLOW_SCHEMATIC_FIDELITY);
    expect(plan.engineBound).toBe(false);
    expect(plan.label).toMatch(/Schematic occupancy/i);
    expect(plan.occupied).toHaveLength(8);
  });

  test('extractEngineSiteOccupancy reads known payload keys', () => {
    const mask = [1, 0, 1];
    expect(
      extractEngineSiteOccupancy({ lattice_site_occupancy: mask }, 3),
    ).toEqual([true, false, true]);
    expect(extractEngineSiteOccupancy({ site_occupancy: [true, true] }, 2)).toEqual([
      true,
      true,
    ]);
    expect(extractEngineSiteOccupancy({}, 4)).toBeNull();
  });

  test('rejects null / blank occupancy entries (schematic fallback)', () => {
    expect(extractEngineSiteOccupancy({ site_occupancy: [null, null] }, 2)).toBeNull();
    expect(extractEngineSiteOccupancy({ site_occupancy: ['', 1] }, 2)).toBeNull();
    const plan = resolveOccupancyGlowPlan({
      siteCount: 2,
      loadingRatio: 0.9,
      seed: 1,
      simulationData: { site_occupancy: [null, null] },
    });
    expect(plan.engineBound).toBe(false);
    expect(plan.fidelity).toBe(OCCUPANCY_GLOW_SCHEMATIC_FIDELITY);
  });

  test('glow RGB is brighter when engine-bound', () => {
    const eng = occupancyGlowRgb(true);
    const sch = occupancyGlowRgb(false);
    expect(eng.intensity).toBeGreaterThan(sch.intensity);
  });

  test('empty sites keep faint strength; occupied sites brighter', () => {
    expect(occupancyGlowSiteStrength(true)).toBeGreaterThan(
      occupancyGlowSiteStrength(false),
    );
    expect(occupancyGlowSiteStrength(false)).toBeGreaterThan(0);
  });
});
