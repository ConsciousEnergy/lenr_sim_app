/**
 * Electrolyte / ionized-env halo — EMP chem-env presentation only.
 */
import {
  ELECTROLYTE_HALO_FIDELITY,
  ELECTROLYTE_HALO_SOURCE,
  ELECTROLYTE_HALO_CLAIM_TAG,
  ELECTROLYTE_HALO_CHIP,
  electrolyteFamilyTintHex,
  electrolyteHaloIntensityNorm,
  resolveElectrolyteIonizedHaloParams,
  createElectrolyteIonizedHalo,
  updateElectrolyteIonizedHalo,
} from './electrolyteIonizedHalo';

describe('electrolyteIonizedHalo', () => {
  test('honesty tags stay EMP chem-env; plasma is not fusion', () => {
    expect(ELECTROLYTE_HALO_FIDELITY).toBe('schematic');
    expect(ELECTROLYTE_HALO_SOURCE).toBe('electrolyte_chem_env');
    expect(ELECTROLYTE_HALO_CLAIM_TAG).toMatch(/plasma ≠ fusion/i);
    expect(ELECTROLYTE_HALO_CHIP).toMatch(/EMP chem/i);
  });

  test('family tints differ across alkali labels', () => {
    expect(electrolyteFamilyTintHex('li')).not.toBe(electrolyteFamilyTintHex('k'));
    expect(electrolyteFamilyTintHex('na')).not.toBe(electrolyteFamilyTintHex('other'));
    expect(electrolyteFamilyTintHex('unknown-family')).toBe(electrolyteFamilyTintHex('other'));
  });

  test('intensity grows with molarity and activity multiplier', () => {
    const low = electrolyteHaloIntensityNorm({
      molarityMolL: 0.1,
      electrolyteMultiplier: 1,
    });
    const high = electrolyteHaloIntensityNorm({
      molarityMolL: 0.9,
      electrolyteMultiplier: 4,
    });
    expect(high).toBeGreaterThan(low);
    expect(high).toBeLessThanOrEqual(1);
  });

  test('resolver binds family/species/multiplier without claiming fusion', () => {
    const p = resolveElectrolyteIonizedHaloParams({
      electrolyteFamily: 'li',
      electrolyteSpecies: 'lioh',
      electrolyteMolarityMolL: 0.35,
      electrolyteMultiplier: 1.4,
    });
    expect(p.family).toBe('li');
    expect(p.species).toBe('lioh');
    expect(p.tintHex).toBe(electrolyteFamilyTintHex('li'));
    expect(p.opacity).toBeGreaterThan(0.1);
    expect(p.scale).toBeGreaterThan(1);
    expect(p.plasmaIsFusion).toBe(false);
    expect(p.claimTag).toMatch(/EMP chem-env/i);
  });

  test('create + update mesh tags EMP chem-env claim', () => {
    const mesh = createElectrolyteIonizedHalo({ tintHex: 0x66e8ff });
    expect(mesh.name).toBe('ElectrolyteIonizedHalo');
    expect(mesh.userData.claim).toBe('emp_chem_env_halo');
    expect(mesh.userData.plasmaIsFusion).toBe(false);
    updateElectrolyteIonizedHalo(mesh, resolveElectrolyteIonizedHaloParams({
      electrolyteFamily: 'k',
      electrolyteMultiplier: 2,
    }));
    expect(mesh.userData.family).toBe('k');
    expect(mesh.material.opacity).toBeGreaterThan(0.1);
    mesh.geometry.dispose();
    mesh.material.dispose();
  });
});
