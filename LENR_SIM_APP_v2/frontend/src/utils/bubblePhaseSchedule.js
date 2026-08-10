/**
 * Canonical bubble-cycle phase schedule (mirrors backend bubble_phase_schedule).
 *
 * EXPANSION → COLLAPSE → MINIMUM → REBOUND → (repeat)
 * Legacy RECOVERY is treated as EXPANSION.
 */

export const PHASE_SCHEDULE = [
  { name: 'EXPANSION', start: 0.0, end: 0.45 },
  { name: 'COLLAPSE', start: 0.45, end: 0.7 },
  { name: 'MINIMUM', start: 0.7, end: 0.8 },
  { name: 'REBOUND', start: 0.8, end: 1.0 },
];

export const CANONICAL_PHASES = PHASE_SCHEDULE.map((entry) => entry.name);

export function normalizePhaseName(phase) {
  const name = String(phase || 'EXPANSION').trim().toUpperCase();
  if (name === 'RECOVERY') return 'EXPANSION';
  if (CANONICAL_PHASES.includes(name)) return name;
  return 'EXPANSION';
}

export function phaseFromCycleFraction(cycleFraction) {
  let frac = Number(cycleFraction) % 1;
  if (Number.isNaN(frac)) return 'EXPANSION';
  if (frac < 0) frac += 1;
  for (const entry of PHASE_SCHEDULE) {
    if (frac >= entry.start && frac < entry.end) return entry.name;
  }
  return 'REBOUND';
}

export function phaseProgressInCycle(cycleFraction) {
  let frac = Number(cycleFraction) % 1;
  if (Number.isNaN(frac)) return 0;
  if (frac < 0) frac += 1;
  for (const entry of PHASE_SCHEDULE) {
    if (frac >= entry.start && frac < entry.end) {
      const width = Math.max(entry.end - entry.start, 1e-12);
      return (frac - entry.start) / width;
    }
  }
  return 1;
}

/**
 * Progress within the current phase using an API timeline.
 * Falls back to the canonical cycle schedule when needed.
 */
export function phaseProgressFromTimeline(timeline, normalizedTime, phase) {
  const target = normalizePhaseName(phase);
  const tQuery = Number(normalizedTime);
  if (!Array.isArray(timeline) || timeline.length === 0 || Number.isNaN(tQuery)) {
    return phaseProgressInCycle(tQuery || 0);
  }

  let nearest = 0;
  for (let i = 0; i < timeline.length; i += 1) {
    if (Number(timeline[i].normalized_time) <= tQuery) nearest = i;
    else break;
  }

  if (normalizePhaseName(timeline[nearest].phase) !== target) {
    return phaseProgressInCycle(tQuery);
  }

  let start = nearest;
  while (start > 0 && normalizePhaseName(timeline[start - 1].phase) === target) {
    start -= 1;
  }
  let end = nearest;
  while (
    end < timeline.length - 1
    && normalizePhaseName(timeline[end + 1].phase) === target
  ) {
    end += 1;
  }

  const t0 = Number(timeline[start].normalized_time);
  const t1 = Number(timeline[end].normalized_time);
  if (!(t1 > t0)) return 0;
  return Math.min(1, Math.max(0, (tQuery - t0) / (t1 - t0)));
}
