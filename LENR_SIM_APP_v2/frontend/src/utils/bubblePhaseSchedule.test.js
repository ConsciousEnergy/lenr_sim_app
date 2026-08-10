import {
  CANONICAL_PHASES,
  normalizePhaseName,
  phaseFromCycleFraction,
  phaseProgressFromTimeline,
  phaseProgressInCycle,
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
});
