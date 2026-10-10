/**
 * Build the POST / WebSocket payload for /api/unified/bubble-lattice*.
 *
 * Kept in one place so the HTTP run and the live stream cannot drift apart
 * (the stream previously had no consumer, and ad-hoc payloads would have
 * sent the UI parameter bag instead of the nested bubble/material/lattice
 * contract the server expects).
 */

import { resolveElectrolyteSpecies } from './theoryConditions';

/**
 * @param {object} parameters UI parameter bag from UnifiedTheoryPage presets.
 * @param {object} [options]
 * @param {string} [options.rateMode]
 * @param {boolean} [options.includeUncertainty]
 * @param {number} [options.uncertaintySamples]
 * @param {string|number|null} [options.randomSeed]
 * @returns {object} Nested request body matching BubbleLatticeRequest.
 */
export function buildBubbleLatticePayload(parameters, options = {}) {
  const electrolyteFamily = parameters.electrolyteFamily || 'li';
  const electrolyteSpecies = resolveElectrolyteSpecies(
    electrolyteFamily,
    parameters.electrolyteSpecies,
  );
  const electrolyteMolarity = parameters.electrolyteMolarityMolL || 0.3;
  const electrolyteSolventType = parameters.electrolyteSolventType || 'd2o';
  const electrolytePhProxy = typeof parameters.electrolytePhProxy === 'number'
    ? Math.max(0, Math.min(14, parameters.electrolytePhProxy))
    : null;
  const electrolyteIonicStrengthProxy = typeof parameters.electrolyteIonicStrengthProxy === 'number'
    ? Math.max(0, parameters.electrolyteIonicStrengthProxy)
    : null;

  const payload = {
    bubble: {
      // The slider value is true micrometres and is sent unmodified. (A
      // previous x3.33 rescale silently turned a "3 um" slider into ~10 um
      // on the backend while the UI and CSV export still claimed 3 um.)
      initial_radius_um: parameters.initialBubbleRadius,
      driving_pressure_bar: parameters.drivingPressure,
      frequency_khz: parameters.frequency,
      ambient_temperature_k: parameters.temperature,
    },
    material: {
      host_material: parameters.hostMaterial,
      reactant: parameters.reactant,
    },
    lattice: {
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
    },
    electrolyte: {
      family: electrolyteFamily,
      species: electrolyteSpecies,
      molarity_mol_l: electrolyteMolarity,
      solvent_type: electrolyteSolventType,
      ph_proxy: electrolytePhProxy,
      ionic_strength_proxy: electrolyteIonicStrengthProxy,
    },
    num_cycles: parameters.numCycles || 2,
  };

  if (parameters.beamEnergyKev != null) {
    payload.lattice.beam_energy_kev = parameters.beamEnergyKev;
  }
  if (parameters.molecularBeamSpecies) {
    payload.lattice.molecular_beam_species = parameters.molecularBeamSpecies;
  }
  if (parameters.h2AbsorbPressurePa != null) {
    payload.lattice.h2_absorb_pressure_pa = parameters.h2AbsorbPressurePa;
  }
  if (parameters.radiantCalorimetry) {
    payload.lattice.radiant_calorimetry = true;
  }

  if (options.rateMode !== undefined) {
    payload.rate_mode = options.rateMode;
  }
  if (options.includeUncertainty !== undefined) {
    payload.include_uncertainty = options.includeUncertainty;
  }
  if (options.uncertaintySamples !== undefined) {
    payload.uncertainty_samples = options.uncertaintySamples;
  }
  if (options.randomSeed !== undefined) {
    const seed = options.randomSeed;
    payload.random_seed = seed === '' || seed === null ? null : Number(seed);
  }
  if (options.literatureId) {
    payload.literature_id = options.literatureId;
  }
  if (options.theoryResult && typeof options.theoryResult === 'object') {
    payload.theory_result = options.theoryResult;
  }
  if (options.pipelineScores && typeof options.pipelineScores === 'object') {
    payload.pipeline_scores = options.pipelineScores;
  }

  return payload;
}

/**
 * Fold streamed physics_update frames into a timeline-shaped object the
 * Enhancement Timeline / Proton Phases charts already understand.
 *
 * @param {object[]} frames
 * @returns {object|null}
 */
export function framesToStreamPreview(frames) {
  if (!Array.isArray(frames) || frames.length === 0) return null;
  const latest = frames[frames.length - 1];
  const timeline = frames.map((frame) => ({
    normalized_time: frame.normalized_time,
    phase: frame.phase,
    enhancement: frame.enhancement,
    // Prefer the backend's uncapped log10 magnitude and saturation flag;
    // log10 of the displayed value is only a last-resort fallback because
    // that value may already be capped at the reporting ceiling.
    enhancement_log10_raw:
      typeof frame.enhancement_log10_raw === 'number'
        ? frame.enhancement_log10_raw
        : (typeof frame.enhancement === 'number' && frame.enhancement > 0
          ? Math.log10(frame.enhancement)
          : 0),
    enhancement_is_saturated: Boolean(frame.enhancement_is_saturated),
    enhancement_breakdown: frame.enhancement_breakdown || {},
    proton_distribution: frame.proton_distribution || {},
    radius_um: frame.radius_um,
    radius_factor: frame.conditions?.radius_factor,
    temperature_k: frame.temperature_k,
    pressure_bar: frame.pressure_bar,
    electric_field_v_m: frame.electric_field_v_m,
    electrolyte_multiplier: frame.enhancement_breakdown?.electrolyte || 1,
  }));

  return {
    source: 'bubble_lattice_stream',
    peak_conditions: {
      temperature_k: latest.temperature_k,
      electric_field_v_m: latest.electric_field_v_m,
      enhancement_factor: latest.enhancement,
      enhancement_breakdown: latest.enhancement_breakdown || {},
    },
    proton_phases: latest.proton_distribution || {},
    enhancement_timeline: timeline,
    collapse_results: {
      min_radius_um: Math.min(...frames.map((f) => Number(f.radius_um) || Infinity)),
      max_temperature_k: Math.max(...frames.map((f) => Number(f.temperature_k) || 0)),
      max_pressure_bar: Math.max(...frames.map((f) => Number(f.pressure_bar) || 0)),
    },
    validation: { route_mode: 'bubble_lattice_stream', contradiction: false },
  };
}
