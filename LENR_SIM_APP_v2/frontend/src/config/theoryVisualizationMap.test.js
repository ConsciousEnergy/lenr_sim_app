/**
 * VIZ-04 — every theory / heuristic map entry carries an explicit fidelity.
 */
import {
  THEORY_VISUALIZATION_MAP,
  HEURISTIC_OVERLAYS,
  resolveVizMapFidelity,
  getFidelityLegendEntries,
  groupFidelityLegendEntries,
  VIZ_FIDELITY_LABELS,
} from './theoryVisualizationMap';

const VALID = new Set(['quantitative', 'schematic', 'indirect']);

describe('theoryVisualizationMap fidelity (VIZ-04)', () => {
  test('every theory map entry has a valid fidelity field', () => {
    for (const [id, entry] of Object.entries(THEORY_VISUALIZATION_MAP)) {
      expect(VALID.has(entry.fidelity)).toBe(true);
      expect(resolveVizMapFidelity(entry)).toBe(entry.fidelity);
      // Legacy indirect flag must agree with fidelity when set
      if (entry.indirect) {
        expect(entry.fidelity).toBe('indirect');
      }
      expect(id).toBeTruthy();
    }
  });

  test('every heuristic overlay has schematic fidelity', () => {
    for (const [, entry] of Object.entries(HEURISTIC_OVERLAYS)) {
      expect(entry.fidelity).toBe('schematic');
    }
  });

  test('fidelity legend groups include Quantitative and Schematic labels', () => {
    expect(VIZ_FIDELITY_LABELS.quantitative).toMatch(/Quantitative/);
    expect(VIZ_FIDELITY_LABELS.schematic).toMatch(/Schematic/);
    const groups = groupFidelityLegendEntries();
    // MHD / Casimir overlays are schematic (illustrative UBLV paths, not solver fields).
    expect(groups.schematic.length).toBeGreaterThan(0);
    expect(groups.schematic.some((r) => r.id === 'bubble_mhd_confinement')).toBe(true);
    expect(groups.schematic.some((r) => r.id === 'casimir_confinement')).toBe(true);
    expect(groups.schematic.some((r) => r.id === 'rydberg_orbitals')).toBe(true);
    expect(groups.schematic.some((r) => r.id === 'liquid_phase_host_film')).toBe(true);
    expect(groups.schematic.some((r) => r.id === 'dynamic_lattice_host')).toBe(true);
    expect(groups.indirect.some((r) => r.id === 'electron_screening')).toBe(true);
  });

  test('VIZ-06 dynamic lattice heuristic stays schematic (exclusive hosts)', () => {
    expect(HEURISTIC_OVERLAYS.dynamic_lattice_host.fidelity).toBe('schematic');
    expect(HEURISTIC_OVERLAYS.dynamic_lattice_host.vizLayer).toBe('LatticeGroup');
    expect(HEURISTIC_OVERLAYS.dynamic_lattice_host.has3DOverlay).toBe(true);
    const groups = groupFidelityLegendEntries();
    expect(groups.schematic.some((r) => r.id === 'dynamic_lattice_host')).toBe(true);
  });

  test('VIZ-07/12 liquid-phase heuristics stay schematic (no TheoryModule invent)', () => {
    expect(HEURISTIC_OVERLAYS.heating_mode_glyphs.fidelity).toBe('schematic');
    expect(HEURISTIC_OVERLAYS.liquid_phase_host_film.vizLayer).toBe('LiquidPhaseGroup');
    expect(HEURISTIC_OVERLAYS.liquid_phase_host_film.has3DOverlay).toBe(true);
    expect(THEORY_VISUALIZATION_MAP.liquid_phase_pd).toBeUndefined();
    expect(THEORY_VISUALIZATION_MAP.liquid_phase_ni).toBeUndefined();
  });

  test('fidelity legend entries never invent quantitative for heuristics', () => {
    const rows = getFidelityLegendEntries();
    for (const row of rows.filter((r) => r.source === 'heuristic')) {
      expect(row.fidelity).not.toBe('quantitative');
    }
  });
});
