/**
 * Compact spacetime sample buffer for the UnifiedBubbleLatticeVisualization
 * engine-sample player (HIP-06 / VIZ-02).
 *
 * Prefer backend `spacetime_sample_buffer` when present; otherwise fold from
 * `enhancement_timeline` or stream frames. Playback is scrubbable by
 * normalized_time / cycle_fraction — not wall-clock RAF alone.
 */

export const SPACETIME_SAMPLE_SCHEMA = 'lenr-spacetime-sample-v1';

/** Channel order locked for compact row arrays. */
export const SPACETIME_CHANNELS = Object.freeze([
  'normalized_time',
  'radius_um',
  'temperature_k',
  'electric_field_v_m',
  'enhancement',
  'occupancy_nuclear',
  'phase',
]);

function nuclearOccupancy(entry) {
  const dist = entry?.proton_distribution || entry?.proton_phases || null;
  if (!dist || typeof dist !== 'object') return null;
  const value = dist.NUCLEAR;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function rowFromEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const t = Number(entry.normalized_time);
  if (!Number.isFinite(t)) return null;
  const radius =
    typeof entry.radius_um === 'number'
      ? entry.radius_um
      : (typeof entry.radius_factor === 'number' ? entry.radius_factor : null);
  const temperature =
    typeof entry.temperature_k === 'number'
      ? entry.temperature_k
      : (typeof entry.temperature === 'number' ? entry.temperature : null);
  const field =
    typeof entry.electric_field_v_m === 'number'
      ? entry.electric_field_v_m
      : (typeof entry.electric_field === 'number' ? entry.electric_field : null);
  const enhancement =
    typeof entry.enhancement === 'number' ? entry.enhancement : null;
  return {
    normalized_time: Math.min(1, Math.max(0, t)),
    radius_um: radius,
    temperature_k: temperature,
    electric_field_v_m: field,
    enhancement,
    occupancy_nuclear: nuclearOccupancy(entry),
    phase: entry.phase || null,
  };
}

/**
 * Build a compact buffer object from an acoustic enhancement_timeline.
 *
 * @param {object[]} timeline
 * @param {object} [meta]
 * @returns {object|null}
 */
export function buildSpacetimeSampleBuffer(timeline, meta = {}) {
  if (!Array.isArray(timeline) || timeline.length === 0) return null;
  const samples = [];
  for (const entry of timeline) {
    const row = rowFromEntry(entry);
    if (row) samples.push(row);
  }
  if (samples.length === 0) return null;
  samples.sort((a, b) => a.normalized_time - b.normalized_time);
  return {
    schema: SPACETIME_SAMPLE_SCHEMA,
    source: meta.source || 'enhancement_timeline',
    sample_count: samples.length,
    channels: [...SPACETIME_CHANNELS],
    clock: 'acoustic_normalized_time',
    samples,
    // Compact parallel arrays for transport / contract tests.
    rows: samples.map((s) => [
      s.normalized_time,
      s.radius_um,
      s.temperature_k,
      s.electric_field_v_m,
      s.enhancement,
      s.occupancy_nuclear,
      s.phase,
    ]),
  };
}

/**
 * Prefer explicit payload buffer; else fold from timeline / stream frames.
 *
 * @param {object|null|undefined} simulationData
 * @param {object[]} [streamFrames]
 * @returns {object|null}
 */
export function resolveSpacetimeSampleBuffer(simulationData, streamFrames) {
  const explicit = simulationData?.spacetime_sample_buffer;
  if (
    explicit &&
    explicit.schema === SPACETIME_SAMPLE_SCHEMA &&
    Array.isArray(explicit.samples) &&
    explicit.samples.length > 0
  ) {
    return explicit;
  }

  if (Array.isArray(streamFrames) && streamFrames.length > 0) {
    return buildSpacetimeSampleBuffer(streamFrames, {
      source: 'bubble_lattice_stream',
    });
  }

  const timeline = simulationData?.enhancement_timeline;
  if (Array.isArray(timeline) && timeline.length > 0) {
    return buildSpacetimeSampleBuffer(timeline, {
      source: 'enhancement_timeline',
    });
  }

  return null;
}

/**
 * Nearest / linearly interpolated sample at acoustic normalized_time.
 * Phase and occupancy use nearest-neighbor (not lerped labels).
 *
 * @param {object|null} buffer
 * @param {number} normalizedTime acoustic 0–1
 * @returns {object|null}
 */
export function sampleSpacetimeBuffer(buffer, normalizedTime) {
  if (!buffer || !Array.isArray(buffer.samples) || buffer.samples.length === 0) {
    return null;
  }
  const t = Number(normalizedTime);
  if (!Number.isFinite(t)) return null;
  const samples = buffer.samples;
  if (t <= samples[0].normalized_time) return { ...samples[0], source: 'solver' };
  if (t >= samples[samples.length - 1].normalized_time) {
    return { ...samples[samples.length - 1], source: 'solver' };
  }

  let lowerIdx = 0;
  for (let i = 0; i < samples.length - 1; i += 1) {
    if (
      samples[i].normalized_time <= t &&
      samples[i + 1].normalized_time >= t
    ) {
      lowerIdx = i;
      break;
    }
  }
  const lower = samples[lowerIdx];
  const upper = samples[lowerIdx + 1];
  const range = upper.normalized_time - lower.normalized_time;
  const alpha = range > 0 ? (t - lower.normalized_time) / range : 0;

  const lerp = (a, b) => {
    if (typeof a !== 'number' || typeof b !== 'number') return a ?? b ?? null;
    return a + (b - a) * alpha;
  };

  return {
    normalized_time: t,
    radius_um: lerp(lower.radius_um, upper.radius_um),
    temperature_k: lerp(lower.temperature_k, upper.temperature_k),
    electric_field_v_m: lerp(lower.electric_field_v_m, upper.electric_field_v_m),
    enhancement: lerp(lower.enhancement, upper.enhancement),
    occupancy_nuclear:
      alpha < 0.5 ? lower.occupancy_nuclear : upper.occupancy_nuclear,
    phase: alpha < 0.5 ? lower.phase : upper.phase,
    source: 'interpolated',
  };
}

/**
 * Index of the nearest sample at or before `normalizedTime`.
 */
export function nearestSampleIndex(buffer, normalizedTime) {
  if (!buffer?.samples?.length) return -1;
  const t = Number(normalizedTime);
  if (!Number.isFinite(t)) return -1;
  let best = 0;
  for (let i = 0; i < buffer.samples.length; i += 1) {
    if (buffer.samples[i].normalized_time <= t) best = i;
    else break;
  }
  return best;
}
