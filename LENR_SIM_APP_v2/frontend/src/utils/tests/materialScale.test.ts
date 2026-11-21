import {
  buildLatticeScaleDescriptor,
  getMaterialScale,
  getNearestNeighborDistanceM,
  metersToVisUnits,
  visUnitsToMeters,
} from '../materialScale';

describe('materialScale utilities', () => {
  it('derives FCC nearest-neighbor distance as a/sqrt(2)', () => {
    const nickel = getMaterialScale('nickel');
    const expected = nickel.latticeConstantM / Math.sqrt(2);
    expect(nickel.nearestNeighborM).toBeCloseTo(expected, 16);
  });

  it('derives nearest-neighbor distance for known FCC materials', () => {
    const palladium = getMaterialScale('palladium');
    const copper = getMaterialScale('copper');

    expect(palladium.nearestNeighborM).toBeCloseTo(
      getNearestNeighborDistanceM(palladium.latticeConstantM, 'fcc'),
      16,
    );
    expect(copper.nearestNeighborM).toBeCloseTo(
      getNearestNeighborDistanceM(copper.latticeConstantM, 'fcc'),
      16,
    );
  });

  it('converts meters and visualization units bidirectionally', () => {
    const metersPerVisUnit = 3.24e-10;
    const distanceMeters = 9.72e-9;
    const visUnits = metersToVisUnits(distanceMeters, metersPerVisUnit);

    expect(visUnits).toBeCloseTo(30, 8);
    expect(visUnitsToMeters(visUnits, metersPerVisUnit)).toBeCloseTo(distanceMeters, 16);
  });

  it('builds material-specific lattice descriptors for legend/UI', () => {
    const nickelDescriptor = buildLatticeScaleDescriptor({
      material: 'nickel',
      latticeSpacingVisUnits: 1.2,
    });
    const palladiumDescriptor = buildLatticeScaleDescriptor({
      material: 'palladium',
      latticeSpacingVisUnits: 1.2,
    });

    expect(nickelDescriptor.label).toContain('Nickel');
    expect(palladiumDescriptor.label).toContain('Palladium');
    expect(nickelDescriptor.note).toContain('a=3.52');
    expect(palladiumDescriptor.note).toContain('a=3.89');
    expect(nickelDescriptor.metersPerUnit).not.toBe(palladiumDescriptor.metersPerUnit);
  });

  it('resolves Celani constantan host aliases (ENG-HS-06)', () => {
    const constantan = getMaterialScale('constantan');
    const alias = getMaterialScale('constantan_Cu55Ni44Mn1');
    const nickel = getMaterialScale('nickel');

    expect(constantan.key).toBe('constantan');
    expect(constantan.latticeConstantM).toBeCloseTo(3.58e-10, 16);
    expect(alias.latticeConstantM).toBe(constantan.latticeConstantM);
    expect(constantan.latticeConstantM).not.toBe(nickel.latticeConstantM);
  });
});
