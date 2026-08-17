import {
  CANONICAL_PHASES,
  MINIMUM_CENTER,
  VISUAL_CYCLE_SCALE,
  anchorCycleFraction,
  formatCycleTimeChip,
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
    for (let i = 0; i < 40; i += 1) {
      const phase = phaseFromCycleFraction(i / 40);
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
    expect(phaseProgressInCycle(0.225)).toBeCloseTo(0.5, 5); // mid expansion
    expect(phaseFromCycleFraction(0.75)).toBe('MINIMUM');
  });

  test('timeline progress uses the contiguous API phase segment', () => {
    const timeline = [
      { normalized_time: 0.0, phase: 'EXPANSION' },
      { normalized_time: 0.2, phase: 'EXPANSION' },
      { normalized_time: 0.45, phase: 'COLLAPSE' },
      { normalized_time: 0.6, phase: 'COLLAPSE' },
      { normalized_time: 0.7, phase: 'MINIMUM' },
    ];
    expect(phaseProgressFromTimeline(timeline, 0.1, 'EXPANSION')).toBeCloseTo(0.5, 5);
    expect(phaseProgressFromTimeline(timeline, 0.525, 'COLLAPSE')).toBeCloseTo(0.5, 5);
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

  test('visual viz clock looks up the acoustic min-radius sample at MINIMUM', () => {
    const timeline = [
      { normalized_time: 0.0, phase: 'EXPANSION', radius_factor: 1.2 },
      { normalized_time: 0.22, phase: 'MINIMUM', radius_factor: 0.12 },
      { normalized_time: 0.4, phase: 'REBOUND', radius_factor: 0.4 },
      { normalized_time: 0.75, phase: 'EXPANSION', radius_factor: 1.1 },
    ];
    expect(minimumFractionFromTimeline(timeline)).toBeCloseTo(0.22, 5);
    expect(visualTimeToTimelineTime(MINIMUM_CENTER, timeline)).toBeCloseTo(0.22, 5);
    expect(visualTimeToTimelineTime(0.75, timeline)).toBeCloseTo(0.22, 5);
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
});
