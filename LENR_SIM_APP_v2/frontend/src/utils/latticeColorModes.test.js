/**
 * Tier-1 lattice host color modes + shared palette alignment.
 */
import {
  LATTICE_COLOR_MODES,
  normalizeLatticeColorMode,
  occupancyTintRgb,
  resolveLatticeHostInstanceRgb,
  temperatureHeatNorm,
  temperatureTintRgb,
} from './latticeColorModes';
import {
  EXCLUSIVE_HOST_COLORS,
  LENR_HOST_PALETTE,
  LENR_SOLUTE_PALETTE,
  buildLenrLegendParticleTypes,
  resolveSolutePaletteEntry,
} from './lenrParticlePalette';

describe('latticeColorModes (Tier 1)', () => {
  test('normalizes unknown modes to species', () => {
    expect(normalizeLatticeColorMode('species')).toBe('species');
    expect(normalizeLatticeColorMode('loading')).toBe('loading');
    expect(normalizeLatticeColorMode('temperature')).toBe('temperature');
    expect(normalizeLatticeColorMode('phonon')).toBe('phonon');
    expect(normalizeLatticeColorMode('nope')).toBe('species');
    expect(normalizeLatticeColorMode(null)).toBe('species');
    expect(LATTICE_COLOR_MODES).toHaveLength(4);
  });

  test('species mode returns exclusive host RGB without occupancy darken', () => {
    const rgb = resolveLatticeHostInstanceRgb({
      mode: 'species',
      hostHex: EXCLUSIVE_HOST_COLORS.palladium,
      occupied: false,
    });
    expect(rgb.r).toBeCloseTo(0x8b / 255);
    expect(rgb.g).toBeCloseTo(0x8b / 255);
    expect(rgb.b).toBeCloseTo(0x8b / 255);
  });

  test('loading mode darkens empty vs loaded sites', () => {
    const loaded = resolveLatticeHostInstanceRgb({
      mode: 'loading',
      hostHex: EXCLUSIVE_HOST_COLORS.nickel,
      occupied: true,
    });
    const empty = resolveLatticeHostInstanceRgb({
      mode: 'loading',
      hostHex: EXCLUSIVE_HOST_COLORS.nickel,
      occupied: false,
    });
    expect(empty.r + empty.g + empty.b).toBeLessThan(loaded.r + loaded.g + loaded.b);
    expect(occupancyTintRgb(0x4682b4, false).r).toBeCloseTo(empty.r);
  });

  test('temperature mode warms toward orange as T rises', () => {
    expect(temperatureHeatNorm(300)).toBeCloseTo(0);
    expect(temperatureHeatNorm(8000)).toBeCloseTo(1);
    const cool = temperatureTintRgb(EXCLUSIVE_HOST_COLORS.palladium, 300);
    const hot = temperatureTintRgb(EXCLUSIVE_HOST_COLORS.palladium, 8000);
    expect(hot.r).toBeGreaterThan(cool.r);
    expect(hot.b).toBeLessThan(cool.b);
  });

  test('phonon mode lifts warm channels with mode energy', () => {
    const calm = resolveLatticeHostInstanceRgb({
      mode: 'phonon',
      hostHex: EXCLUSIVE_HOST_COLORS.palladium,
      modeEnergy: 0,
      opticalWeight: 0.7,
    });
    const driven = resolveLatticeHostInstanceRgb({
      mode: 'phonon',
      hostHex: EXCLUSIVE_HOST_COLORS.palladium,
      modeEnergy: 0.9,
      opticalWeight: 0.7,
    });
    expect(driven.r).toBeGreaterThan(calm.r);
  });
});

describe('lenrParticlePalette SOT', () => {
  test('legend CSS matches WebGL exclusive host hexes', () => {
    const legend = buildLenrLegendParticleTypes();
    expect(legend.palladium.color).toBe(LENR_HOST_PALETTE.palladium.css);
    expect(legend.nickel.color).toBe(LENR_HOST_PALETTE.nickel.css);
    expect(legend.deuterium.color).toBe(LENR_SOLUTE_PALETTE.deuterium.css);
    expect(legend.hydrogen.color).toBe(LENR_SOLUTE_PALETTE.hydrogen.css);
    expect(parseInt(legend.palladium.color.slice(1), 16)).toBe(
      EXCLUSIVE_HOST_COLORS.palladium,
    );
    expect(parseInt(legend.nickel.color.slice(1), 16)).toBe(
      EXCLUSIVE_HOST_COLORS.nickel,
    );
  });

  test('Pd host resolves D teal solute; else H green', () => {
    expect(resolveSolutePaletteEntry('palladium').hex).toBe(
      LENR_SOLUTE_PALETTE.deuterium.hex,
    );
    expect(resolveSolutePaletteEntry('nickel').hex).toBe(
      LENR_SOLUTE_PALETTE.hydrogen.hex,
    );
  });
});
