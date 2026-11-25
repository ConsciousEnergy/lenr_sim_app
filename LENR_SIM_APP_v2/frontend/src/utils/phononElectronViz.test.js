/**
 * Phonon jitter + electron migration — schematic presentation only.
 */
import {
  PHONON_ELECTRON_FIDELITY,
  PHONON_ELECTRON_SOURCE,
  phononJitterAmplitude,
  buildPhononJitterDisplacements,
  ElectronMigrationCloud,
} from './phononElectronViz';
import { getLatticeBoundBubbleY } from './bubbleTorusViz';

describe('phononElectronViz (schematic lattice motion + e⁻ flow)', () => {
  test('honesty tags stay schematic', () => {
    expect(PHONON_ELECTRON_FIDELITY).toBe('schematic');
    expect(PHONON_ELECTRON_SOURCE).toBe('schematic_visualization');
  });

  test('phononJitterAmplitude grows with phonon / T / compression but stays capped', () => {
    const cold = phononJitterAmplitude({
      phononFactor: 1,
      temperatureK: 300,
      compressionRatio: 1,
    });
    const hot = phononJitterAmplitude({
      phononFactor: 100,
      temperatureK: 4000,
      compressionRatio: 20,
    });
    expect(hot).toBeGreaterThan(cold);
    expect(hot).toBeLessThanOrEqual(0.045);
    expect(cold).toBeGreaterThanOrEqual(0.004);
  });

  test('buildPhononJitterDisplacements returns per-site xyz', () => {
    const sites = [
      { x: 0, y: 0, z: 0, ix: 0, iy: 0, iz: 0 },
      { x: 1, y: 0, z: 0, ix: 1, iy: 0, iz: 0 },
    ];
    const d0 = buildPhononJitterDisplacements(sites, { time: 0.1, amplitude: 0.02 });
    expect(d0).toHaveLength(2);
    expect(Number.isFinite(d0[0].x)).toBe(true);
    expect(Number.isFinite(d0[1].y)).toBe(true);
    const d1 = buildPhononJitterDisplacements(sites, { time: 0.5, amplitude: 0.02 });
    // Motion changes with time (not static rest)
    expect(d0[0].x !== d1[0].x || d0[0].y !== d1[0].y).toBe(true);
  });

  test('ElectronMigrationCloud tags fidelity and updates positions', () => {
    const cloud = new ElectronMigrationCloud({ count: 8, lineCount: 4 });
    expect(cloud.getGroup().userData.fidelity).toBe('schematic');
    expect(cloud.getGroup().userData.source).toBe('schematic_visualization');
    cloud.update({
      electricFieldVPerM: 1e10,
      enhancement: 100,
      latticeY: -3.5,
    });
    const pos = cloud._positions;
    expect(pos).toHaveLength(24);
    expect(Number.isFinite(pos[0])).toBe(true);
    cloud.dispose();
  });
});

describe('getLatticeBoundBubbleY (nest on lattice)', () => {
  test('seats underside near surface for small nucleation scale', () => {
    const surface = -3.5;
    const scale = 0.15;
    const y = getLatticeBoundBubbleY({
      latticeSurfaceY: surface,
      displayScale: scale,
      phase: 'MINIMUM',
      nestPenetration: 0.14,
    });
    // Center = surface + radius * (1 - nest) → underside below or at surface contact
    expect(y).toBeGreaterThan(surface);
    expect(y).toBeLessThan(surface + scale);
  });

  test('deeper nest at MINIMUM than late EXPANSION', () => {
    const surface = -3.5;
    const scale = 0.8;
    const minY = getLatticeBoundBubbleY({
      latticeSurfaceY: surface,
      displayScale: scale,
      phase: 'MINIMUM',
    });
    const expY = getLatticeBoundBubbleY({
      latticeSurfaceY: surface,
      displayScale: scale,
      phase: 'EXPANSION',
      phaseProgress: 0.9,
    });
    expect(minY).toBeLessThan(expY);
  });
});
