import {
  CAVITATION_FORCE_FIDELITY,
  CAVITATION_FORCE_SOURCE,
  kineticForceNorm,
  vorticityNorm,
  fluxNorm,
  phononResponseScale,
  softPlasmaFlashNorm,
  resolveCavitationForceViz,
} from './cavitationForceViz';

describe('cavitationForceViz (schematic, existing samples only)', () => {
  test('honesty tags stay schematic', () => {
    expect(CAVITATION_FORCE_FIDELITY).toBe('schematic');
    expect(CAVITATION_FORCE_SOURCE).toBe('schematic_visualization');
  });

  test('kinetic peaks at MINIMUM with high compression', () => {
    const soft = kineticForceNorm({
      compressionRatio: 1.2,
      radiusFactor: 0.9,
      phase: 'EXPANSION',
    });
    const hard = kineticForceNorm({
      compressionRatio: 40,
      radiusFactor: 0.08,
      phase: 'MINIMUM',
    });
    expect(hard).toBeGreaterThan(soft);
    expect(hard).toBeLessThanOrEqual(1);
  });

  test('vorticity and flux respond to E / loading / kinetic', () => {
    const low = vorticityNorm({ kinetic: 0.1, electricFieldVPerM: 1e6, enhancement: 1 });
    const high = vorticityNorm({ kinetic: 0.9, electricFieldVPerM: 1e11, enhancement: 1e4 });
    expect(high).toBeGreaterThan(low);
    const fluxLow = fluxNorm({ loadingRatio: 0.2, electricFieldVPerM: 1e5, kinetic: 0.1 });
    const fluxHigh = fluxNorm({ loadingRatio: 0.95, electricFieldVPerM: 1e10, kinetic: 0.8 });
    expect(fluxHigh).toBeGreaterThan(fluxLow);
  });

  test('phononResponseScale grows with phonon factor and kinetic', () => {
    const cold = phononResponseScale({ phononFactor: 1, temperatureK: 300, kinetic: 0.1 });
    const hot = phononResponseScale({ phononFactor: 80, temperatureK: 3500, kinetic: 0.9 });
    expect(hot).toBeGreaterThan(cold);
  });

  test('softPlasmaFlashNorm peaks at MINIMUM near crush', () => {
    const expand = softPlasmaFlashNorm({
      phase: 'EXPANSION',
      kinetic: 0.2,
      radiusFactor: 1.0,
    });
    const flash = softPlasmaFlashNorm({
      phase: 'MINIMUM',
      kinetic: 0.9,
      radiusFactor: 0.08,
    });
    expect(flash).toBeGreaterThan(expand);
  });

  test('resolveCavitationForceViz bundles fields', () => {
    const bundle = resolveCavitationForceViz({
      compressionRatio: 20,
      radiusFactor: 0.15,
      phase: 'COLLAPSE',
      electricFieldVPerM: 1e9,
      enhancement: 100,
      phononFactor: 10,
      temperatureK: 2000,
      loadingRatio: 0.9,
    });
    expect(bundle.kinetic).toBeGreaterThan(0.2);
    expect(bundle.vorticity).toBeGreaterThan(0.2);
    expect(bundle.flux).toBeGreaterThan(0.2);
    expect(bundle.phononScale).toBeGreaterThan(0.7);
    expect(bundle.softPlasmaFlash).toBeGreaterThan(0.3);
    expect(bundle.fidelity).toBe('schematic');
  });
});
