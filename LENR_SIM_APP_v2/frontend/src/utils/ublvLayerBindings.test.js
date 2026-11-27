import { UBLV_LAYER_BINDINGS, layerOwnsObjectName } from './ublvLayerBindings';

describe('ublvLayerBindings', () => {
  test('exposes distinct layer ids for Diadon Layers panel', () => {
    const ids = UBLV_LAYER_BINDINGS.map((b) => b.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'lattice',
        'phonon',
        'bubble',
        'electrolyteHalo',
        'protons',
        'fields',
        'emig',
        'mhd',
      ]),
    );
  });

  test('layerOwnsObjectName matches torus/jet to bubble and e⁻ mig group', () => {
    expect(layerOwnsObjectName('bubble', 'TorusFormation')).toBe(true);
    expect(layerOwnsObjectName('bubble', 'FocusedJet')).toBe(true);
    expect(layerOwnsObjectName('electrolyteHalo', 'ElectrolyteIonizedHalo')).toBe(true);
    expect(layerOwnsObjectName('emig', 'ElectronMigrationGroup')).toBe(true);
    expect(layerOwnsObjectName('fields', 'ElectronMigrationGroup')).toBe(false);
    expect(layerOwnsObjectName('mhd', 'PlasmaSoftCloud')).toBe(true);
    expect(layerOwnsObjectName('phonon', 'PhononWaveguideRibbon')).toBe(true);
  });
});
