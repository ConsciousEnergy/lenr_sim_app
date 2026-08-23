/**
 * Static diagram templates for Oracle B mechanism paths (mirrors backend specs).
 */
export const MECHANISM_PATH_DIAGRAMS = {
  trapped_state: {
    title: 'Trapped-state / TSC path',
    tier: 'speculative_exploratory',
    nodes: [
      { id: 'd', label: 'D', x: 40, y: 80 },
      { id: 'lattice', label: 'Lattice trap', x: 140, y: 80 },
      { id: 'tsc', label: 'TSC cluster', x: 240, y: 80 },
      { id: 'he4', label: 'He-4', x: 340, y: 60 },
      { id: 'phonon', label: 'Phonon bath', x: 340, y: 110 },
    ],
    edges: [
      { from: 'd', to: 'lattice', label: 'loading' },
      { from: 'lattice', to: 'tsc', label: 'confinement' },
      { from: 'tsc', to: 'he4', label: 'fusion?' },
      { from: 'tsc', to: 'phonon', label: 'recoil' },
    ],
    lean_ids: ['EQ-NBODY-FGR-01', 'EQ-TSC-GEOM-01', 'EQ-TRAP-SEP-01'],
  },
  phonon_cascade: {
    title: 'Phonon cascade path',
    tier: 'speculative_exploratory',
    nodes: [
      { id: 'nuc', label: 'Nuclear state', x: 60, y: 80 },
      { id: 'p1', label: 'Phonon n', x: 180, y: 50 },
      { id: 'p2', label: 'Phonon n-1', x: 280, y: 80 },
      { id: 'p3', label: 'Phonon n-2', x: 380, y: 110 },
      { id: 'lattice', label: 'Lattice', x: 480, y: 80 },
    ],
    edges: [
      { from: 'nuc', to: 'p1', label: 'MeV gap' },
      { from: 'p1', to: 'p2', label: 'cascade' },
      { from: 'p2', to: 'p3', label: 'cascade' },
      { from: 'p3', to: 'lattice', label: 'deposit' },
    ],
    lean_ids: ['EQ-PHONON-N-01', 'EQ-BRANCH-LATTICE-01'],
  },
  three_body: {
    title: 'Three-body sequential path',
    tier: 'speculative_exploratory',
    nodes: [
      { id: 'd1', label: 'D', x: 40, y: 70 },
      { id: 'd2', label: 'D', x: 40, y: 110 },
      { id: 'intermediate', label: 'Intermediate', x: 180, y: 90 },
      { id: 'd3', label: 'D', x: 320, y: 90 },
      { id: 'product', label: 'Product', x: 460, y: 90 },
    ],
    edges: [
      { from: 'd1', to: 'intermediate', label: 'pair' },
      { from: 'd2', to: 'intermediate', label: 'pair' },
      { from: 'intermediate', to: 'd3', label: 'sequential' },
      { from: 'd3', to: 'product', label: 'capture?' },
    ],
    lean_ids: ['EQ-3B-SEQ-01', 'EQ-3B-MASS-DOM-01'],
  },
};

export function resolveDiagramSpec(pathId, apiSpec) {
  if (apiSpec?.nodes?.length) return apiSpec;
  return MECHANISM_PATH_DIAGRAMS[pathId] || null;
}
