/**
 * Phonon standing-wave + electron migration — schematic presentation only.
 */
import {
  PHONON_ELECTRON_FIDELITY,
  PHONON_ELECTRON_SOURCE,
  PHONON_CLAIM_TAG,
  phononJitterAmplitude,
  phononModeMix,
  meltProximityNorm,
  waveguideEnvelopeNorm,
  buildPhononJitterDisplacements,
  buildPhononStandingWaveDisplacements,
  phononModeTintRgb,
  createPhononWaveguideRibbon,
  ElectronMigrationCloud,
} from './phononElectronViz';
import { getLatticeBoundBubbleY } from './bubbleTorusViz';
import { occupancyTintRgb } from './dynamicLattice';

describe('phononElectronViz (schematic lattice motion + e⁻ flow)', () => {
  test('honesty tags stay schematic / contested', () => {
    expect(PHONON_ELECTRON_FIDELITY).toBe('schematic');
    expect(PHONON_ELECTRON_SOURCE).toBe('schematic_visualization');
    expect(PHONON_CLAIM_TAG).toMatch(/contested/i);
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
    expect(hot).toBeLessThanOrEqual(0.16);
    expect(cold).toBeGreaterThanOrEqual(0.022);
  });

  test('phononModeMix shifts toward optical as phonon factor rises', () => {
    const low = phononModeMix({ phononFactor: 1 });
    const high = phononModeMix({ phononFactor: 100 });
    expect(high.opticalWeight).toBeGreaterThan(low.opticalWeight);
    expect(low.acousticWeight + low.opticalWeight).toBeCloseTo(1, 5);
  });

  test('meltProximityNorm never invents melt without T_m; softens near literature T_m', () => {
    expect(meltProximityNorm({ temperatureK: 1500 })).toBe(0);
    expect(meltProximityNorm({ temperatureK: 300, meltingPointK: 1828 })).toBe(0);
    const near = meltProximityNorm({ temperatureK: 1700, meltingPointK: 1828 });
    expect(near).toBeGreaterThan(0.5);
    expect(near).toBeLessThanOrEqual(1);
  });

  test('waveguideEnvelopeNorm responds to loading + phonon', () => {
    const low = waveguideEnvelopeNorm({ loadingRatio: 0.2, phononFactor: 1 });
    const high = waveguideEnvelopeNorm({ loadingRatio: 0.95, phononFactor: 80 });
    expect(high).toBeGreaterThan(low);
  });

  test('standing-wave displacements are spatially coherent (acoustic in-phase cue)', () => {
    const sites = [];
    for (let ix = 0; ix < 4; ix += 1) {
      for (let iy = 0; iy < 4; iy += 1) {
        sites.push({ x: ix, y: iy, z: 0, ix, iy, iz: 0 });
      }
    }
    const { displacements, modeEnergy } = buildPhononStandingWaveDisplacements(sites, {
      time: 0.4,
      amplitude: 0.1,
      acousticWeight: 1,
      opticalWeight: 0,
    });
    expect(displacements).toHaveLength(16);
    expect(modeEnergy).toHaveLength(16);
    // Corner (0,0) acoustic sin(0)=0 → near-rest; mid-edge has larger |x|
    const corner = Math.abs(displacements[0].x);
    const mid = Math.abs(displacements[sites.findIndex((s) => s.ix === 2 && s.iy === 2)].x);
    expect(mid).toBeGreaterThan(corner);
  });

  test('optical mode antiphases nearest neighbors', () => {
    const sites = [
      { x: 0, y: 0, z: 0, ix: 0, iy: 0, iz: 0 },
      { x: 1, y: 0, z: 0, ix: 1, iy: 0, iz: 0 },
    ];
    const { displacements } = buildPhononStandingWaveDisplacements(sites, {
      time: 0.22,
      amplitude: 0.12,
      acousticWeight: 0,
      opticalWeight: 1,
      opticalFreq: 7.2,
    });
    // Opposite stagger → product of x displacements is negative (antiphase)
    expect(displacements[0].x * displacements[1].x).toBeLessThan(0);
  });

  test('buildPhononJitterDisplacements returns per-site xyz (standing-wave backed)', () => {
    const sites = [
      { x: 0, y: 0, z: 0, ix: 0, iy: 0, iz: 0 },
      { x: 1, y: 0, z: 0, ix: 1, iy: 0, iz: 0 },
    ];
    const d0 = buildPhononJitterDisplacements(sites, {
      time: 0.1,
      amplitude: 0.08,
      phononFactor: 10,
    });
    expect(d0).toHaveLength(2);
    expect(Number.isFinite(d0[0].x)).toBe(true);
    const d1 = buildPhononJitterDisplacements(sites, {
      time: 0.5,
      amplitude: 0.08,
      phononFactor: 10,
    });
    expect(d0[0].x !== d1[0].x || d0[0].y !== d1[0].y).toBe(true);
  });

  test('phononModeTintRgb lifts warm channels with mode energy', () => {
    const base = occupancyTintRgb(0x8b8b8b, true);
    const tinted = phononModeTintRgb(base, 0.9, 0.7);
    expect(tinted.r).toBeGreaterThan(base.r);
  });

  test('createPhononWaveguideRibbon tags schematic waveguide claim', () => {
    const ribbon = createPhononWaveguideRibbon({ span: 4 });
    expect(ribbon.name).toBe('PhononWaveguideRibbon');
    expect(ribbon.userData.claim).toBe('catalyst_waveguide_schematic');
    expect(ribbon.userData.fidelity).toBe('schematic');
    ribbon.geometry.dispose();
    ribbon.material.dispose();
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
