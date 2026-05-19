/**
 * Single source of truth: backend theory_id -> Unified Theory 3D legend / overlay mapping.
 * Keep in sync with `app.physics_engine.theory_pipeline.get_default_pipeline` registrations.
 */

/** @typedef {'theory' | 'heuristic_visual'} Provenance */

/**
 * @typedef {Object} TheoryVizEntry
 * @property {string} legendGroup
 * @property {string | null} vizLayer - Three.js group name or logical layer id
 * @property {boolean} has3dOverlay
 * @property {string} displayName
 * @property {Provenance} provenance
 * @property {string} [notes]
 */

/** @type {Record<string, TheoryVizEntry>} */
export const THEORY_VISUALIZATION_MAP = {
  electron_screening: {
    legendGroup: 'Screening',
    vizLayer: 'ProtonPhaseGroup',
    has3dOverlay: false,
    displayName: 'Electron screening',
    provenance: 'theory',
    notes: 'Proton phase coloring reflects screening-dominated states.',
  },
  coherent_qed: {
    legendGroup: 'QED',
    vizLayer: null,
    has3dOverlay: false,
    displayName: 'Coherent QED / double-layer',
    provenance: 'theory',
  },
  hydroton: {
    legendGroup: 'Hydroton (legacy)',
    vizLayer: null,
    has3dOverlay: false,
    displayName: 'Hydroton',
    provenance: 'theory',
    notes: 'Optional; registered only when ENABLE_LEGACY_HYDROTON is true.',
  },
  nae_model: {
    legendGroup: 'NAE',
    vizLayer: null,
    has3dOverlay: false,
    displayName: 'Nuclear active environment',
    provenance: 'theory',
  },
  bubble_mhd_confinement: {
    legendGroup: 'MHD Flow',
    vizLayer: 'MHDFlowGroup',
    has3dOverlay: true,
    displayName: 'Bubble MHD confinement',
    provenance: 'theory',
  },
  casimir_confinement: {
    legendGroup: 'Casimir Geometry',
    vizLayer: 'CasimirFieldGroup',
    has3dOverlay: true,
    displayName: 'Casimir confinement',
    provenance: 'theory',
  },
  quantum_tunneling: {
    legendGroup: 'Tunneling',
    vizLayer: null,
    has3dOverlay: false,
    displayName: 'Quantum tunneling',
    provenance: 'theory',
  },
  takahashi_tsc: {
    legendGroup: 'TSC',
    vizLayer: null,
    has3dOverlay: false,
    displayName: 'Takahashi TSC',
    provenance: 'theory',
  },
  hagelstein_phonon: {
    legendGroup: 'Phonon transfer',
    vizLayer: null,
    has3dOverlay: false,
    displayName: 'Hagelstein phonon coupling',
    provenance: 'theory',
  },
  vysotskii_ccs: {
    legendGroup: 'Coherence',
    vizLayer: null,
    has3dOverlay: false,
    displayName: 'Vysotskii CCS',
    provenance: 'theory',
  },
  swartz_nanor: {
    legendGroup: 'Surface activation',
    vizLayer: null,
    has3dOverlay: false,
    displayName: 'Swartz NANOR',
    provenance: 'theory',
  },
  miles_heat_helium: {
    legendGroup: 'Heat / helium',
    vizLayer: null,
    has3dOverlay: false,
    displayName: 'Miles heat-helium correlation',
    provenance: 'theory',
  },
  widom_larsen: {
    legendGroup: 'Weak interaction',
    vizLayer: null,
    has3dOverlay: false,
    displayName: 'Widom–Larsen',
    provenance: 'theory',
  },
  kim_bec: {
    legendGroup: 'Coherence',
    vizLayer: null,
    has3dOverlay: false,
    displayName: 'Kim BEC',
    provenance: 'theory',
  },
  matsumoto_enc: {
    legendGroup: 'ENC',
    vizLayer: null,
    has3dOverlay: false,
    displayName: 'Matsumoto ENC',
    provenance: 'theory',
  },
  chubb_ion_band: {
    legendGroup: 'Ion band',
    vizLayer: null,
    has3dOverlay: false,
    displayName: 'Chubb ion band states',
    provenance: 'theory',
  },
  piantelli_ni_h: {
    legendGroup: 'Ni–H surface',
    vizLayer: null,
    has3dOverlay: false,
    displayName: 'Piantelli Ni–H',
    provenance: 'theory',
  },
  iwamura_transmutation: {
    legendGroup: 'Transmutation',
    vizLayer: null,
    has3dOverlay: false,
    displayName: 'Iwamura transmutation',
    provenance: 'theory',
  },
  letts_laser: {
    legendGroup: 'Laser coupling',
    vizLayer: null,
    has3dOverlay: false,
    displayName: 'Letts laser coupling',
    provenance: 'theory',
  },
  phonon_coupling_legacy: {
    legendGroup: 'Phonon transfer',
    vizLayer: null,
    has3dOverlay: false,
    displayName: 'Phonon coupling (legacy)',
    provenance: 'theory',
  },
  non_equilibrium_thermo: {
    legendGroup: 'Non-equilibrium thermo',
    vizLayer: null,
    has3dOverlay: false,
    displayName: 'Non-equilibrium thermodynamics',
    provenance: 'theory',
  },
  /** Heuristic scene layers (no dedicated pipeline theory_id) */
  rydberg_visual: {
    legendGroup: 'Rydberg (visual)',
    vizLayer: 'RydbergOrbitalsGroup',
    has3dOverlay: true,
    displayName: 'Rydberg orbitals (visualization model)',
    provenance: 'heuristic_visual',
    notes: 'Decorative; not a registered theory module.',
  },
  halo_electrons_visual: {
    legendGroup: 'Halo electrons (visual)',
    vizLayer: 'HaloElectronsGroup',
    has3dOverlay: true,
    displayName: 'Halo electrons (visualization model)',
    provenance: 'heuristic_visual',
  },
};

/** Quantum flux legend keys used by VisualizationLegend (must match QUANTUM_FLUX_MODES). */
export const QUANTUM_FLUX_MODE_BY_OVERLAY = {
  default: 'electron_screening',
  casimir: 'coulomb_exchange',
  rydberg: 'gamow_window',
  screening: 'electron_screening',
};

/**
 * @param {{ showCasimir?: boolean, showRydberg?: boolean }} toggles
 * @returns {keyof typeof QUANTUM_FLUX_MODE_BY_OVERLAY extends string ? string : string}
 */
export function resolveQuantumFluxModeForOverlays({ showCasimir, showRydberg }) {
  if (showCasimir) return QUANTUM_FLUX_MODE_BY_OVERLAY.casimir;
  if (showRydberg) return QUANTUM_FLUX_MODE_BY_OVERLAY.rydberg;
  return QUANTUM_FLUX_MODE_BY_OVERLAY.default;
}

/**
 * @param {string} theoryId
 * @returns {TheoryVizEntry | undefined}
 */
export function getTheoryVizEntry(theoryId) {
  return THEORY_VISUALIZATION_MAP[theoryId];
}

export const REGISTERED_PIPELINE_THEORY_IDS = Object.keys(THEORY_VISUALIZATION_MAP).filter(
  (id) => !['rydberg_visual', 'halo_electrons_visual'].includes(id),
);
