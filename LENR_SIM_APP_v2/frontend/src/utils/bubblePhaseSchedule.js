/**
 * Canonical bubble-cycle phase schedule (mirrors backend bubble_phase_schedule).
 *
 * EXPANSION → COLLAPSE → MINIMUM → REBOUND → (repeat)
 * Legacy RECOVERY is treated as EXPANSION.
 *
 * Backend timelines store ``normalized_time`` on the acoustic / RP clock, but
 * label MINIMUM via ``anchor_cycle_fraction`` so the true min-radius sample
 * sits in the MINIMUM segment. The 3D viz remaps that timeline onto the
 * visual schedule (MINIMUM at 70–80%) with ``timelineOnVisualClock``.
 */

export const PHASE_SCHEDULE = [
  { name: 'EXPANSION', start: 0.0, end: 0.45 },
  { name: 'COLLAPSE', start: 0.45, end: 0.7 },
  { name: 'MINIMUM', start: 0.7, end: 0.8 },
  { name: 'REBOUND', start: 0.8, end: 1.0 },
];

export const CANONICAL_PHASES = PHASE_SCHEDULE.map((entry) => entry.name);

const _MINIMUM_SEGMENT = PHASE_SCHEDULE.find((entry) => entry.name === 'MINIMUM');
export const MINIMUM_CENTER = (_MINIMUM_SEGMENT.start + _MINIMUM_SEGMENT.end) / 2;

/**
 * Maps driving frequency in kHz onto visual seconds per cycle.
 * At 20 kHz the physical period is 50 μs; this scale makes one on-screen
 * cycle ~2.5 s (50,000×), not 50×.
 */
export const VISUAL_CYCLE_SCALE = 0.02;

export function wrapCycleFraction(cycleFraction) {
  let frac = Number(cycleFraction) % 1;
  if (Number.isNaN(frac)) return 0;
  if (frac < 0) frac += 1;
  return frac;
}

export function normalizePhaseName(phase) {
  const name = String(phase || 'EXPANSION').trim().toUpperCase();
  if (name === 'RECOVERY') return 'EXPANSION';
  if (CANONICAL_PHASES.includes(name)) return name;
  return 'EXPANSION';
}

export function phaseSegment(name) {
  const target = normalizePhaseName(name);
  return PHASE_SCHEDULE.find((entry) => entry.name === target) || PHASE_SCHEDULE[0];
}

export function phaseFromCycleFraction(cycleFraction) {
  const frac = wrapCycleFraction(cycleFraction);
  for (const entry of PHASE_SCHEDULE) {
    if (frac >= entry.start && frac < entry.end) return entry.name;
  }
  return 'REBOUND';
}

export function phaseProgressInCycle(cycleFraction) {
  const frac = wrapCycleFraction(cycleFraction);
  for (const entry of PHASE_SCHEDULE) {
    if (frac >= entry.start && frac < entry.end) {
      const width = Math.max(entry.end - entry.start, 1e-12);
      return (frac - entry.start) / width;
    }
  }
  return 1;
}

export function clampMinimumFraction(minimumFraction) {
  const wrapped = wrapCycleFraction(minimumFraction);
  return Math.min(Math.max(wrapped, 1e-3), 1.0 - 1e-3);
}

/**
 * Acoustic → visual (mirrors backend ``anchor_cycle_fraction``).
 * Maps the physical min-radius instant onto ``MINIMUM_CENTER``.
 */
export function anchorCycleFraction(cycleFraction, minimumFraction) {
  const frac = wrapCycleFraction(cycleFraction);
  const m = clampMinimumFraction(minimumFraction);
  if (frac <= m) {
    return frac * (MINIMUM_CENTER / m);
  }
  return MINIMUM_CENTER + (frac - m) * ((1.0 - MINIMUM_CENTER) / (1.0 - m));
}

/**
 * Visual → acoustic. Inverse of ``anchorCycleFraction``.
 */
export function unanchorCycleFraction(visualFraction, minimumFraction) {
  const vis = wrapCycleFraction(visualFraction);
  const m = clampMinimumFraction(minimumFraction);
  if (vis <= MINIMUM_CENTER) {
    return vis * (m / MINIMUM_CENTER);
  }
  return m + (vis - MINIMUM_CENTER) * ((1.0 - m) / (1.0 - MINIMUM_CENTER));
}

/**
 * Acoustic cycle fraction of the smallest radius sample on an API timeline.
 */
export function minimumFractionFromTimeline(timeline) {
  if (!Array.isArray(timeline) || timeline.length === 0) {
    return MINIMUM_CENTER;
  }

  let best = timeline[0];
  let bestRadius = Number.POSITIVE_INFINITY;
  timeline.forEach((entry) => {
    const radius = Number(
      entry?.radius_factor ?? entry?.radius_um ?? Number.POSITIVE_INFINITY,
    );
    if (Number.isFinite(radius) && radius < bestRadius) {
      bestRadius = radius;
      best = entry;
    }
  });

  const tMin = Number(best?.normalized_time);
  if (!Number.isFinite(tMin)) return MINIMUM_CENTER;
  return clampMinimumFraction(tMin);
}

/**
 * Convert the 3D viz clock (visual schedule 0–1) into the acoustic
 * ``normalized_time`` stored on ``enhancement_timeline``.
 */
export function visualTimeToTimelineTime(visualTime, timeline) {
  return unanchorCycleFraction(visualTime, minimumFractionFromTimeline(timeline));
}

/**
 * Copy of an acoustic ``enhancement_timeline`` with ``normalized_time`` on the
 * visual schedule, so a 0–1 animation clock hits MINIMUM at 70–80%.
 */
export function timelineOnVisualClock(timeline) {
  if (!Array.isArray(timeline) || timeline.length === 0) return [];
  const minimumFraction = minimumFractionFromTimeline(timeline);
  return timeline
    .map((entry) => ({
      ...entry,
      normalized_time: anchorCycleFraction(entry.normalized_time, minimumFraction),
    }))
    .sort((a, b) => Number(a.normalized_time) - Number(b.normalized_time));
}

export function physicalPeriodMicroseconds(frequencyKhz) {
  const f = Number(frequencyKhz);
  if (!Number.isFinite(f) || f <= 0) return 0;
  return 1e3 / f;
}

export function visualCycleSeconds(frequencyKhz, scale = VISUAL_CYCLE_SCALE) {
  const f = Number(frequencyKhz);
  if (!Number.isFinite(f) || f <= 0 || !(scale > 0)) return 0;
  return (1 / f) / scale;
}

export function formatCycleTimeChip(frequencyKhz) {
  const physUs = physicalPeriodMicroseconds(frequencyKhz);
  const visS = visualCycleSeconds(frequencyKhz);
  const physLabel = physUs >= 100 ? `${Math.round(physUs)} μs` : `${physUs.toFixed(0)} μs`;
  const visLabel = visS >= 10 ? `${Math.round(visS)}s vis` : `~${visS.toFixed(1)}s vis`;
  return `${physLabel} · ${visLabel}`;
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
