/**
 * Canonical Layers panel → scene feature bindings for UBLV.
 * Keep labels honest: each toggle must map to a real visual group/behaviour.
 */

export const UBLV_LAYER_BINDINGS = Object.freeze([
  {
    id: 'lattice',
    label: 'Lattice',
    targets: ['LatticeGroup', 'LatticeHostAtoms', 'LatticeHydrogenAtoms'],
  },
  {
    id: 'phonon',
    label: 'Phonon (schematic / contested)',
    targets: ['LatticeHostAtoms.displacements'],
    requires: ['lattice'],
  },
  {
    id: 'bubble',
    label: 'Double-layer / torus',
    targets: ['BubbleGroup', 'MainBubble', 'DoubleLayer', 'TorusFormation', 'FocusedJet'],
  },
  {
    id: 'protons',
    label: 'Protons',
    targets: ['ProtonPhaseGroup', 'ProtonWaveCompanion'],
  },
  {
    id: 'fields',
    label: 'Field lines',
    targets: ['FieldVisualization', 'FieldLine*', 'EnergySoftCloud'],
  },
  {
    id: 'emig',
    label: 'e⁻ migration (schematic / contested)',
    targets: ['ElectronMigrationGroup'],
  },
  {
    id: 'mhd',
    label: 'MHD / vortex → cavitation (hydro)',
    targets: ['MHDFlowGroup', 'plasmaVortex', 'PlasmaSoftCloud'],
  },
]);

/** Resolve whether a named Three object should follow a layer flag. */
export function layerOwnsObjectName(layerId, objectName) {
  const layer = UBLV_LAYER_BINDINGS.find((b) => b.id === layerId);
  if (!layer || !objectName) return false;
  return layer.targets.some((t) => {
    if (t.endsWith('*')) return objectName.startsWith(t.slice(0, -1));
    if (t.includes('.')) return objectName === t.split('.')[0];
    return objectName === t;
  });
}
