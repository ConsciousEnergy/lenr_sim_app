import {
  CANONICAL_PHASES,
  MINIMUM_CENTER,
  VISUAL_CYCLE_SCALE,
  anchorCycleFraction,
  formatCycleTimeChip,
  formatDualClockAtFraction,
  minimumFractionFromTimeline,
  normalizePhaseName,
  phaseFromCycleFraction,
  phaseProgressFromTimeline,
  phaseProgressInCycle,
  physicalPeriodMicroseconds,
  unanchorCycleFraction,
  visualCycleSeconds,
  visualTimeToTimelineTime,
  timelineOnVisualClock,
} from './bubblePhaseSchedule';

describe('bubblePhaseSchedule', () => {
  test('walks Expansion → Collapse → Minimum → Rebound then repeats', () => {
    const sequence = [];
    // Dense walk — MINIMUM is only ~2% of the flash schedule
    for (let i = 0; i < 200; i += 1) {
      const phase = phaseFromCycleFraction(i / 200);
      if (!sequence.length || sequence[sequence.length - 1] !== phase) {
        sequence.push(phase);
      }
    }
    expect(sequence).toEqual(['EXPANSION', 'COLLAPSE', 'MINIMUM', 'REBOUND']);
  });

  test('maps legacy RECOVERY to EXPANSION', () => {
    expect(normalizePhaseName('RECOVERY')).toBe('EXPANSION');
  });

  test('phase progress is within the active segment', () => {
    expect(phaseProgressInCycle(0.0)).toBeCloseTo(0, 5);
    expect(phaseProgressInCycle(0.45)).toBeCloseTo(0.5, 5); // mid expansion (0–0.90)
    expect(phaseFromCycleFraction(0.965)).toBe('MINIMUM');
  });

  test('collapse+minimum are a flash fraction of the visual cycle', () => {
    expect(phaseFromCycleFraction(0.89)).toBe('EXPANSION');
    expect(phaseFromCycleFraction(0.92)).toBe('COLLAPSE');
    expect(phaseFromCycleFraction(0.965)).toBe('MINIMUM');
    expect(phaseFromCycleFraction(0.99)).toBe('REBOUND');
    // COLLAPSE+MINIMUM ≈ 7.5% of cycle — ns–µs peer pacing, not long scrub burn
    expect(MINIMUM_CENTER).toBeCloseTo(0.965, 5);
  });

  test('timeline progress uses the contiguous API phase segment', () => {
    const timeline = [
      { normalized_time: 0.0, phase: 'EXPANSION' },
      { normalized_time: 0.2, phase: 'EXPANSION' },
      { normalized_time: 0.90, phase: 'COLLAPSE' },
      { normalized_time: 0.93, phase: 'COLLAPSE' },
      { normalized_time: 0.96, phase: 'MINIMUM' },
    ];
    expect(phaseProgressFromTimeline(timeline, 0.1, 'EXPANSION')).toBeCloseTo(0.5, 5);
    expect(phaseProgressFromTimeline(timeline, 0.915, 'COLLAPSE')).toBeCloseTo(0.5, 5);
    expect(CANONICAL_PHASES).toContain('REBOUND');
  });

  test('anchor/unanchor round-trip and place the physical min at MINIMUM_CENTER', () => {
    const minimumFraction = 0.22;
    expect(anchorCycleFraction(minimumFraction, minimumFraction)).toBeCloseTo(MINIMUM_CENTER, 5);
    expect(phaseFromCycleFraction(anchorCycleFraction(0.22, 0.22))).toBe('MINIMUM');

    [0, 0.1, 0.22, 0.5, 0.9].forEach((acoustic) => {
      const visual = anchorCycleFraction(acoustic, minimumFraction);
      expect(unanchorCycleFraction(visual, minimumFraction)).toBeCloseTo(acoustic, 5);
    });
  });

  test('walking the visual clock yields Expansion → Collapse → Minimum → Rebound with min radius at MINIMUM', () => {
    const timeline = [
      { normalized_time: 0.0, phase: 'EXPANSION', radius_factor: 1.25 },
      { normalized_time: 0.10, phase: 'EXPANSION', radius_factor: 0.9 },
      { normalized_time: 0.22, phase: 'MINIMUM', radius_factor: 0.12 },
      { normalized_time: 0.40, phase: 'REBOUND', radius_factor: 0.4 },
      { normalized_time: 0.75, phase: 'EXPANSION', radius_factor: 1.1 },
      { normalized_time: 0.99, phase: 'EXPANSION', radius_factor: 1.2 },
    ];
    const remapped = timelineOnVisualClock(timeline);
    const radiusAt = (visualTime) => {
      let lower = remapped[0];
      let upper = remapped[remapped.length - 1];
      for (let i = 0; i < remapped.length - 1; i += 1) {
        if (
          remapped[i].normalized_time <= visualTime
          && remapped[i + 1].normalized_time >= visualTime
        ) {
          lower = remapped[i];
          upper = remapped[i + 1];
          break;
        }
      }
      const range = upper.normalized_time - lower.normalized_time;
      const t = range > 0 ? (visualTime - lower.normalized_time) / range : 0;
      return lower.radius_factor + (upper.radius_factor - lower.radius_factor) * t;
    };

    expect(phaseFromCycleFraction(0.20)).toBe('EXPANSION');
    expect(phaseFromCycleFraction(0.92)).toBe('COLLAPSE');
    expect(phaseFromCycleFraction(0.965)).toBe('MINIMUM');
    expect(phaseFromCycleFraction(0.99)).toBe('REBOUND');
    expect(radiusAt(MINIMUM_CENTER)).toBeLessThan(radiusAt(0.20));
    expect(radiusAt(MINIMUM_CENTER)).toBeLessThan(radiusAt(0.99));
  });

  test('visual viz clock looks up the acoustic min-radius sample at MINIMUM', () => {
    const timeline = [
      { normalized_time: 0.0, phase: 'EXPANSION', radius_factor: 1.2 },
      { normalized_time: 0.22, phase: 'MINIMUM', radius_factor: 0.12 },
      { normalized_time: 0.4, phase: 'REBOUND', radius_factor: 0.4 },
      { normalized_time: 0.75, phase: 'EXPANSION', radius_factor: 1.1 },
    ];
    expect(minimumFractionFromTimeline(timeline)).toBeCloseTo(0.22, 5);
    expect(visualTimeToTimelineTime(MINIMUM_CENTER, timeline)).toBeCloseTo(0.22, 5);
    const remapped = timelineOnVisualClock(timeline);
    const minSample = remapped.reduce((best, entry) => (
      entry.radius_factor < best.radius_factor ? entry : best
    ));
    expect(minSample.normalized_time).toBeCloseTo(MINIMUM_CENTER, 5);
    expect(phaseFromCycleFraction(minSample.normalized_time)).toBe('MINIMUM');
  });

  test('cycle-time chip reports physical μs and visual seconds', () => {
    expect(VISUAL_CYCLE_SCALE).toBe(0.02);
    expect(physicalPeriodMicroseconds(20)).toBeCloseTo(50, 5);
    expect(visualCycleSeconds(20)).toBeCloseTo(2.5, 5);
    expect(formatCycleTimeChip(20)).toBe('50 μs · ~2.5s vis');
  });

  test('dual-clock scrub readout scales physical μs and visual s with fraction', () => {
    const mid = formatDualClockAtFraction(20, 0.5);
    expect(mid.physicalUs).toBeCloseTo(25, 5);
    expect(mid.visualS).toBeCloseTo(1.25, 5);
    expect(mid.label).toContain('μs');
    expect(mid.label).toContain('vis');
  });
});
