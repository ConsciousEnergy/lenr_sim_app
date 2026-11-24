/**
 * Build POST /api/unified/export body from Unified Theory UI parameters.
 * Matches SimulationRequest nesting (material / environmental / lattice / …).
 */

import { resolveElectrolyteSpecies } from './theoryConditions';

/**
 * @param {object} parameters UI parameter bag from UnifiedTheoryPage presets.
 * @param {object} [options]
 * @param {string} [options.rateMode]
 * @param {boolean} [options.includeUncertainty]
 * @param {number} [options.uncertaintySamples]
 * @param {string|number|null} [options.randomSeed]
 * @returns {object} Nested request body for POST /api/unified/export|simulate.
 */
export function buildUnifiedExportPayload(parameters, options = {}) {
  const electrolyteFamily = parameters.electrolyteFamily || 'li';
  const electrolyteSpecies = resolveElectrolyteSpecies(
    electrolyteFamily,
    parameters.electrolyteSpecies,
  );
  const electrolyteMolarity = parameters.electrolyteMolarityMolL || 0.3;
  const electrolyteSolventType = parameters.electrolyteSolventType || 'd2o';
  const electrolytePhProxy =
    typeof parameters.electrolytePhProxy === 'number'
      ? Math.max(0, Math.min(14, parameters.electrolytePhProxy))
      : null;
  const electrolyteIonicStrengthProxy =
    typeof parameters.electrolyteIonicStrengthProxy === 'number'
      ? Math.max(0, parameters.electrolyteIonicStrengthProxy)
      : null;

  const seedRaw = options.randomSeed;
  const randomSeed =
    seedRaw === '' || seedRaw === null || seedRaw === undefined
      ? null
      : Number(seedRaw);

  const lattice = {
    loading_ratio: parameters.loadingRatio,
    defect_density: parameters.defectDensity || 1e16,
    surface_roughness: parameters.surfaceRoughness || 5e-9,
    grain_size: parameters.grainSize || 50e-9,
    electrolyte_family: electrolyteFamily,
    electrolyte_species: electrolyteSpecies,
    electrolyte_molarity_mol_l: electrolyteMolarity,
    solvent_type: electrolyteSolventType,
    ph_proxy: electrolytePhProxy,
    ionic_strength_proxy: electrolyteIonicStrengthProxy,
  };

  if (parameters.beamEnergyKev != null) {
    lattice.beam_energy_kev = parameters.beamEnergyKev;
  }
  if (parameters.molecularBeamSpecies) {
    lattice.molecular_beam_species = parameters.molecularBeamSpecies;
  }
  if (parameters.h2AbsorbPressurePa != null) {
    lattice.h2_absorb_pressure_pa = parameters.h2AbsorbPressurePa;
  }
  if (parameters.radiantCalorimetry) {
    lattice.radiant_calorimetry = true;
  }

  return {
    material: {
      host_material: parameters.hostMaterial,
      reactant: parameters.reactant,
    },
    environmental: {
      temperature: parameters.temperature,
      // UI driving pressure is bar; SimulationRequest expects Pa ambient.
      pressure: 101325.0,
      electric_field: 1e6,
    },
    lattice,
    electrolyte: {
      family: electrolyteFamily,
      species: electrolyteSpecies,
      molarity_mol_l: electrolyteMolarity,
      solvent_type: electrolyteSolventType,
      ph_proxy: electrolytePhProxy,
      ionic_strength_proxy: electrolyteIonicStrengthProxy,
    },
    time_steps: 10,
    total_time: 1.0,
    rate_mode: options.rateMode || 'two_body',
    include_uncertainty: Boolean(options.includeUncertainty),
    uncertainty_samples: options.uncertaintySamples || 256,
    random_seed: Number.isFinite(randomSeed) ? randomSeed : null,
  };
}

export const UNIFIED_EXPORT_ENDPOINT = '/api/unified/export';
export const BENCHMARK_PACK_ID = 'umlenr-p1-p6-v1';
export const BENCHMARK_PACK_DOWNLOAD_PATH = `/api/benchmark-packs/${BENCHMARK_PACK_ID}/download`;
