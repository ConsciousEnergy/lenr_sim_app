import {
  buildTheoryConditions,
  resolveElectrolyteSpecies,
  DEFAULT_THEORY_PARAMETERS,
} from './theoryConditions';

describe('resolveElectrolyteSpecies', () => {
  it('returns the family default when no species is given', () => {
    expect(resolveElectrolyteSpecies('li', null)).toBe('lioh');
    expect(resolveElectrolyteSpecies('na', null)).toBe('naoh');
    expect(resolveElectrolyteSpecies('k', null)).toBe('koh');
  });

  it('lowercases an explicit species', () => {
    expect(resolveElectrolyteSpecies('li', 'Li2CO3')).toBe('li2co3');
  });

  it('falls back to other for unknown families', () => {
    expect(resolveElectrolyteSpecies('unobtainium', null)).toBe('other');
    expect(resolveElectrolyteSpecies(null, null)).toBe('other');
  });
});

describe('buildTheoryConditions', () => {
  it('produces a complete conditions dict with no arguments', () => {
    const conditions = buildTheoryConditions();
    // The dashboard card calls this with no parameters, so every key the
    // pipeline reads must still be present.
    expect(conditions).toEqual(
      expect.objectContaining({
        temperature: 300,
        electron_density: 6.8e28,
        loading_ratio: 0.9,
        electrolyte_family: 'li',
        electrolyte_species: 'lioh',
        electrolyte_molarity_mol_l: 0.3,
      }),
    );
    Object.values(conditions).forEach((value) => {
      expect(value).not.toBeUndefined();
      expect(value).not.toBeNull();
    });
  });

  it('converts driving pressure from bar to pascals', () => {
    const conditions = buildTheoryConditions({ parameters: { drivingPressure: 2 } });
    expect(conditions.pressure).toBeCloseTo(2 * 101325);
  });

  it('derives gap and crack width in nanometres from surface roughness', () => {
    const conditions = buildTheoryConditions({ parameters: { surfaceRoughness: 8e-9 } });
    expect(conditions.gap_width_nm).toBeCloseTo(8);
    expect(conditions.crack_width_nm).toBeCloseTo(8);
  });

  it('floors gap width at 0.5 nm so confinement theories stay in domain', () => {
    const conditions = buildTheoryConditions({ parameters: { surfaceRoughness: 1e-12 } });
    expect(conditions.gap_width_nm).toBe(0.5);
    expect(conditions.crack_width_nm).toBe(0.5);
  });

  it('resolves electrolyte species from the selected family', () => {
    const conditions = buildTheoryConditions({
      parameters: { electrolyteFamily: 'k', electrolyteSpecies: null },
    });
    expect(conditions.electrolyte_family).toBe('k');
    expect(conditions.electrolyte_species).toBe('koh');
  });

  it('keeps caller parameters ahead of defaults', () => {
    const conditions = buildTheoryConditions({ parameters: { temperature: 450 } });
    expect(conditions.temperature).toBe(450);
    // Unspecified values still fall back to the reference case.
    expect(conditions.loading_ratio).toBe(DEFAULT_THEORY_PARAMETERS.loadingRatio);
  });

  it('omits optional beam and host keys unless the caller sets them', () => {
    const baseline = buildTheoryConditions();
    expect(baseline.beam_energy_kev).toBeUndefined();
    expect(baseline.host_material).toBeUndefined();
    const zr = buildTheoryConditions({
      parameters: {
        hostMaterial: 'zirconium',
        beamEnergyKev: 2,
        molecularBeamSpecies: 'D1',
      },
    });
    expect(zr.host_material).toBe('zirconium');
    expect(zr.beam_energy_kev).toBe(2);
    expect(zr.molecular_beam_species).toBe('D1');
  });
});
