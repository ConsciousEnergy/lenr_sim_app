/**
 * VIZ-06 — DynamicDraw lattice helpers (schematic loading / exclusive hosts).
 */
import {
  DYNAMIC_LATTICE_BUFFER_USAGE,
  DYNAMIC_LATTICE_FIDELITY,
  EXCLUSIVE_HOST_COLORS,
  applyDynamicLatticeInstances,
  buildLatticeRestSites,
  buildOccupancyMask,
  indexToIjk,
  ijkToIndex,
  occupancyTintRgb,
  resolveExclusiveHostColor,
  resolveLatticePick,
} from './dynamicLattice';

describe('dynamicLattice (VIZ-06)', () => {
  test('Pd and Ni colors stay exclusive and never blend', () => {
    expect(resolveExclusiveHostColor('palladium').hex).toBe(EXCLUSIVE_HOST_COLORS.palladium);
    expect(resolveExclusiveHostColor('nickel').hex).toBe(EXCLUSIVE_HOST_COLORS.nickel);
    expect(resolveExclusiveHostColor('palladium').hex).not.toBe(
      resolveExclusiveHostColor('nickel').hex,
    );
    expect(resolveExclusiveHostColor('Pd-Ni').exclusive).toBe(false);
    expect(resolveExclusiveHostColor('pd_ni_blend').label).toMatch(/refused/i);
  });

  test('index ↔ ijk round-trips for cubic lattice', () => {
    const dim = 3;
    for (let i = 0; i < dim * dim * dim; i += 1) {
      const { ix, iy, iz } = indexToIjk(i, dim);
      expect(ijkToIndex(ix, iy, iz, dim)).toBe(i);
    }
  });

  test('occupancy mask is deterministic and ratio-bounded', () => {
    const a = buildOccupancyMask({ count: 64, loadingRatio: 0.5, seed: 7 });
    const b = buildOccupancyMask({ count: 64, loadingRatio: 0.5, seed: 7 });
    expect(a).toEqual(b);
    const filled = a.filter(Boolean).length;
    expect(filled).toBeGreaterThan(10);
    expect(filled).toBeLessThan(54);
    expect(buildOccupancyMask({ count: 8, loadingRatio: 0 }).every((v) => !v)).toBe(true);
    expect(buildOccupancyMask({ count: 8, loadingRatio: 1 }).every(Boolean)).toBe(true);
  });

  test('rest sites carry schematic occupancy + rest coordinates', () => {
    const sites = buildLatticeRestSites({
      dimension: 2,
      spacing: 1,
      yOffset: -0.5,
      loadingRatio: 0.5,
      seed: 1,
    });
    expect(sites).toHaveLength(8);
    expect(sites[0]).toMatchObject({ index: 0, ix: 0, iy: 0, iz: 0 });
    expect(typeof sites[0].occupied).toBe('boolean');
    expect(Number.isFinite(sites[0].y)).toBe(true);
  });

  test('DynamicDraw apply writes matrices/colors and stamps buffer usage', () => {
    const sites = buildLatticeRestSites({
      dimension: 2,
      spacing: 1,
      loadingRatio: 0.75,
      seed: 2,
    });
    const matrices = [];
    const colors = [];
    let matrixDynamic = false;
    let colorDynamic = false;
    const result = applyDynamicLatticeInstances({
      sites,
      hostHex: EXCLUSIVE_HOST_COLORS.nickel,
      markMatrixDynamic: () => {
        matrixDynamic = true;
      },
      markColorDynamic: () => {
        colorDynamic = true;
      },
      setMatrixAt: (index, elements) => {
        matrices[index] = Array.from(elements);
      },
      setColorAt: (index, rgb) => {
        colors[index] = rgb;
      },
    });
    expect(result.bufferUsage).toBe(DYNAMIC_LATTICE_BUFFER_USAGE);
    expect(result.count).toBe(8);
    expect(matrixDynamic).toBe(true);
    expect(colorDynamic).toBe(true);
    expect(matrices).toHaveLength(8);
    expect(matrices[0][12]).toBe(sites[0].x);
    expect(matrices[0][13]).toBe(sites[0].y);
    expect(matrices[0][14]).toBe(sites[0].z);
    expect(colors).toHaveLength(8);
    expect(colors[0].r).toBeGreaterThan(0);
  });

  test('optional displacement offsets rest matrices (VIZ-09 hook)', () => {
    const sites = buildLatticeRestSites({
      dimension: 1,
      spacing: 2,
      loadingRatio: 1,
    });
    const matrices = [];
    applyDynamicLatticeInstances({
      sites,
      hostHex: 0xffffff,
      displacements: [{ x: 0.1, y: -0.2, z: 0.3 }],
      setMatrixAt: (index, elements) => {
        matrices[index] = Array.from(elements);
      },
    });
    expect(matrices[0][12]).toBeCloseTo(sites[0].x + 0.1);
    expect(matrices[0][13]).toBeCloseTo(sites[0].y - 0.2);
    expect(matrices[0][14]).toBeCloseTo(sites[0].z + 0.3);
  });

  test('pick resolves instance metadata with schematic fidelity', () => {
    const sites = buildLatticeRestSites({
      dimension: 2,
      spacing: 1,
      loadingRatio: 1,
      seed: 0,
    });
    expect(resolveLatticePick({ instanceId: null, sites, hostKey: 'palladium' })).toBeNull();
    expect(resolveLatticePick({ instanceId: 99, sites, hostKey: 'palladium' })).toBeNull();
    const pick = resolveLatticePick({ instanceId: 3, sites, hostKey: 'palladium' });
    expect(pick.fidelity).toBe(DYNAMIC_LATTICE_FIDELITY);
    expect(pick.ix).toBe(sites[3].ix);
    expect(pick.label).toMatch(/Host/);
  });

  test('occupancy tint darkens empty sites relative to loaded', () => {
    const loaded = occupancyTintRgb(0x4682b4, true);
    const empty = occupancyTintRgb(0x4682b4, false);
    expect(empty.r + empty.g + empty.b).toBeLessThan(loaded.r + loaded.g + loaded.b);
  });
});
