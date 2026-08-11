/**
 * Theory-pipeline condition builder.
 *
 * The Theory Testbed runs against a flat `conditions` dict that the backend
 * pipeline reads (see backend theory_pipeline.TheoryPipeline.run). This mapping
 * used to live inline in UnifiedTheoryPage, so a second host (the dashboard
 * card) could not run the pipeline without duplicating it and drifting.
 */

/** Default species per alkali family, mirrored from UnifiedTheoryPage. */
export const DEFAULT_ELECTROLYTE_SPECIES_BY_FAMILY = {
  li: 'lioh',
  na: 'naoh',
  k: 'koh',
  rb: 'other',
  cs: 'other',
  mixed: 'mixed',
  other: 'other',
};

/** Resolve an explicit species, falling back to the family default. */
export const resolveElectrolyteSpecies = (family, species) => {
  const normalizedFamily = (family || 'other').toLowerCase();
  if (species) return String(species).toLowerCase();
  return DEFAULT_ELECTROLYTE_SPECIES_BY_FAMILY[normalizedFamily] || 'other';
};

/**
 * Conditions used when no simulation parameters are available (dashboard entry
 * point). Values match the Pd-D reference case in UnifiedTheoryPage presets.
 */
export const DEFAULT_THEORY_PARAMETERS = {
  temperature: 300,
  drivingPressure: 1.5,
  loadingRatio: 0.9,
  surfaceRoughness: 5e-9,
  defectDensity: 1e14,
  grainSize: 50e-9,
  electrolyteFamily: 'li',
  electrolyteSpecies: null,
  electrolyteMolarityMolL: 0.3,
};

/** Fixed conditions that are not user-tunable on either host today. */
const ELECTRON_DENSITY_M3 = 6.8e28; // Pd conduction electrons
const BASELINE_ELECTRIC_FIELD_V_M = 1e6; // pre-collapse double-layer baseline

/**
 * Build the flat conditions dict for POST /api/physics/theories/run.
 *
 * @param {object} args
 * @param {object} [args.parameters] UnifiedTheoryPage-style camelCase parameters.
 * @returns {Record<string, number|string>} conditions accepted by the pipeline.
 */
export const buildTheoryConditions = ({ parameters } = {}) => {
  const params = { ...DEFAULT_THEORY_PARAMETERS, ...(parameters || {}) };

  // Surface roughness doubles as the gap/crack scale for confinement theories.
  // Backend expects nanometres and rejects sub-angstrom gaps, hence the floor.
  const roughnessNm = Math.max(0.5, (params.surfaceRoughness || 5e-9) * 1e9);
  const family = params.electrolyteFamily || 'li';

  return {
    temperature: params.temperature || 300,
    pressure: (params.drivingPressure || 1.5) * 101325,
    electron_density: ELECTRON_DENSITY_M3,
    electric_field: BASELINE_ELECTRIC_FIELD_V_M,
    loading_ratio: params.loadingRatio || 0.9,
    surface_roughness: params.surfaceRoughness || 5e-9,
    defect_density: params.defectDensity || 1e14,
    grain_size: params.grainSize || 50e-9,
    gap_width_nm: roughnessNm,
    crack_width_nm: roughnessNm,
    electrolyte_family: family,
    electrolyte_species: resolveElectrolyteSpecies(family, params.electrolyteSpecies),
    electrolyte_molarity_mol_l: params.electrolyteMolarityMolL || 0.3,
  };
};
