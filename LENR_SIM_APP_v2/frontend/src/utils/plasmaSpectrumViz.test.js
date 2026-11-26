import {
  MASER_JET_CHIP,
  PLASMA_EXCITED_CHIP,
  PLASMA_SPECTRUM_FIDELITY,
  SHED_DEBRIS_CHIP,
  SPECIES_EMISSION_HEX,
  TORUS_SCRUB_END,
  TORUS_SCRUB_START,
  applyPlasmaSpectrumTint,
  isInTorusWindow,
  jetLightEnvelope,
  maserCollapseProgress,
  normalizePlasmaSpeciesKey,
  resolveExcitedPlasmaSpectrum,
  resolvePlasmaSoluteKey,
  shedDebrisProgress,
  torusWindowProgress,
} from './plasmaSpectrumViz';
import * as THREE from 'three';
import { createJetMaterial, createTorusPlasmaMaterial } from './bubbleTorusViz';

describe('plasmaSpectrumViz (schematic excited plasma)', () => {
  test('fidelity stays schematic and honesty chip denies fusion', () => {
    expect(PLASMA_SPECTRUM_FIDELITY).toBe('schematic');
    expect(PLASMA_EXCITED_CHIP.toLowerCase()).toContain('not fusion');
  });

  test('torus scrub window is 90.7% → 95.7%', () => {
    expect(TORUS_SCRUB_START).toBeCloseTo(0.907, 5);
    expect(TORUS_SCRUB_END).toBeCloseTo(0.957, 5);
    expect(isInTorusWindow(0.90)).toBe(false);
    expect(isInTorusWindow(0.907)).toBe(true);
    expect(isInTorusWindow(0.93)).toBe(true);
    expect(isInTorusWindow(0.956)).toBe(true);
    expect(isInTorusWindow(0.957)).toBe(false);
    expect(torusWindowProgress(0.932)).toBeCloseTo(0.5, 2);
    expect(torusWindowProgress(0.5)).toBe(0);
  });

  test('normalizePlasmaSpeciesKey maps electrolyte families and aliases', () => {
    expect(normalizePlasmaSpeciesKey('KOH')).toBe('potassium');
    expect(normalizePlasmaSpeciesKey('LiOH')).toBe('lithium');
    expect(normalizePlasmaSpeciesKey('NaOH')).toBe('sodium');
    expect(normalizePlasmaSpeciesKey('k')).toBe('potassium');
    expect(normalizePlasmaSpeciesKey('palladium')).toBe('palladium');
    expect(normalizePlasmaSpeciesKey('Ni')).toBe('nickel');
    expect(normalizePlasmaSpeciesKey('D2O')).toBe('deuterium');
  });

  test('Pd host defaults to D solute; Ni defaults to H', () => {
    expect(resolvePlasmaSoluteKey({ hostMaterial: 'palladium' })).toBe('deuterium');
    expect(resolvePlasmaSoluteKey({ hostMaterial: 'nickel' })).toBe('hydrogen');
    expect(resolvePlasmaSoluteKey({ hostMaterial: 'nickel', solute: 'deuterium' }))
      .toBe('deuterium');
  });

  test('resolveExcitedPlasmaSpectrum binds host · solute · electrolyte', () => {
    const pdK = resolveExcitedPlasmaSpectrum({
      hostMaterial: 'palladium',
      electrolyteFamily: 'k',
      electrolyteSpecies: 'KOH',
      loadingRatio: 0.95,
    });
    expect(pdK.hostKey).toBe('palladium');
    expect(pdK.soluteKey).toBe('deuterium');
    expect(pdK.electrolyteKey).toBe('potassium');
    expect(pdK.primaryHex).toBeGreaterThan(0);
    expect(pdK.jetHex).toBeGreaterThan(0);
    expect(pdK.fidelity).toBe('schematic');
    expect(pdK.label.toLowerCase()).toContain('schematic');

    const niLi = resolveExcitedPlasmaSpectrum({
      hostMaterial: 'nickel',
      electrolyteFamily: 'li',
      electrolyteSpecies: 'LiOH',
    });
    expect(niLi.soluteKey).toBe('hydrogen');
    expect(niLi.electrolyteKey).toBe('lithium');
    // Distinct palette from Pd/K — species tint must change with experiment
    expect(niLi.primaryHex).not.toBe(pdK.primaryHex);

    expect(SPECIES_EMISSION_HEX.potassium).toBe(0xc77dff);
    expect(SPECIES_EMISSION_HEX.hydrogen).toBe(0xff4d6d);
  });

  test('jetLightEnvelope rises late in torus window and through MINIMUM', () => {
    expect(jetLightEnvelope({ cycleFraction: 0.91 })).toBe(0);
    expect(jetLightEnvelope({ cycleFraction: 0.95 })).toBeGreaterThan(0.2);
    expect(jetLightEnvelope({ phase: 'MINIMUM', phaseProgress: 0.5 }))
      .toBeGreaterThan(0.5);
    expect(jetLightEnvelope({ phase: 'REBOUND', phaseProgress: 0.9 }))
      .toBeLessThan(0.2);
  });

  test('maserCollapseProgress tightens late COLLAPSE → MINIMUM', () => {
    expect(maserCollapseProgress({ cycleFraction: 0.92 })).toBe(0);
    expect(maserCollapseProgress({ cycleFraction: 0.95 })).toBeGreaterThan(0.4);
    expect(maserCollapseProgress({ phase: 'MINIMUM', phaseProgress: 0.2 }))
      .toBeGreaterThan(0.8);
    expect(MASER_JET_CHIP.toLowerCase()).toContain('not fusion');
  });

  test('shedDebrisProgress rises after maser jet and stays monotonic through REBOUND', () => {
    expect(shedDebrisProgress({ cycleFraction: 0.93 })).toBe(0);
    // Shed only after late maser tighten (final ~12% of torus window)
    expect(shedDebrisProgress({ cycleFraction: 0.95 })).toBe(0);
    expect(shedDebrisProgress({ cycleFraction: 0.955 })).toBeGreaterThan(0);
    expect(shedDebrisProgress({ phase: 'MINIMUM', phaseProgress: 0.6 }))
      .toBeGreaterThan(0.6);
    // REBOUND holds at 1 — never lowers progress (no scrub reverse)
    expect(shedDebrisProgress({ phase: 'REBOUND', phaseProgress: 0.05 })).toBe(1);
    expect(shedDebrisProgress({ phase: 'REBOUND', phaseProgress: 0.95 })).toBe(1);
    const samples = [0, 0.2, 0.4, 0.6, 0.8, 1].map((p) =>
      shedDebrisProgress({ phase: 'MINIMUM', phaseProgress: p }),
    );
    for (let i = 1; i < samples.length; i += 1) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
    }
    expect(samples[samples.length - 1]).toBe(1);
    expect(SHED_DEBRIS_CHIP.toLowerCase()).toContain('counter-rotating');
  });

  test('applyPlasmaSpectrumTint updates torus and jet materials', () => {
    const group = new THREE.Group();
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.3, 8, 16),
      createTorusPlasmaMaterial(),
    );
    torus.name = 'TorusFormation';
    group.add(torus);
    const jet = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 2, 8, 1, true),
      createJetMaterial(),
    );
    jet.name = 'FocusedJet';
    group.add(jet);

    const spectrum = resolveExcitedPlasmaSpectrum({
      hostMaterial: 'nickel',
      electrolyteFamily: 'k',
    });
    applyPlasmaSpectrumTint(group, spectrum);
    expect(torus.material.color.getHex()).toBe(spectrum.primaryHex);
    expect(jet.material.color.getHex()).toBe(spectrum.jetHex);
    expect(jet.material.opacity).toBeLessThanOrEqual(0.45);

    torus.geometry.dispose();
    torus.material.dispose();
    jet.geometry.dispose();
    jet.material.dispose();
  });
});
