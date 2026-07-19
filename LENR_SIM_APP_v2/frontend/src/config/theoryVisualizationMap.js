/**
 * theoryVisualizationMap.js
 *
 * Single source of truth mapping each backend `theory_id` to its visualization
 * representation (3D overlay layer + legend group + label copy).
 *
 * Added as part of v0.3.6-beta refactor (plan §2A).
 *
 * Each entry describes:
 *   - vizLayer       : name of the Three.js group in UnifiedBubbleLatticeVisualization
 *                      (or `null` if the theory contributes only a scalar
 *                      enhancement statistic, not a dedicated 3D overlay)
 *   - legendGroup    : category label used to group rows in VisualizationLegend
 *   - has3DOverlay   : boolean convenience flag for UI toggles
 *   - displayName    : human-readable label for the legend / tooltips
 *   - description    : short (<160 chars) physics blurb shown in tooltip
 *   - reference      : canonical citation string
 *
 * Overlay items that have NO dedicated backend theory module
 * ("Rydberg Orbitals", "Halo Electrons") are also listed here under
 * `theory_id: null` so the legend can still render them as heuristic visuals.
 */

export const THEORY_VISUALIZATION_MAP = {
  electron_screening: {
    vizLayer: 'ProtonPhaseGroup',
    legendGroup: 'Screening',
    has3DOverlay: true,
    indirect: true, // influences proton colour via screening enhancement
    displayName: 'Electron Screening',
    description:
      'Debye/Thomas-Fermi screening lowers Coulomb barrier; rendered indirectly via proton phase colours.',
    reference: 'Cvetinovic et al., Phys. Lett. B (2023)',
  },
  coherent_qed: {
    vizLayer: null,
    legendGroup: 'QED',
    has3DOverlay: false,
    displayName: 'Coherent QED (Preparata)',
    description:
      'Del Giudice / Preparata coherent EM domains; contributes scalar enhancement only, no dedicated overlay.',
    reference: 'Preparata (1995); Del Giudice & Vitiello (2006)',
  },
  bubble_mhd_confinement: {
    vizLayer: 'MHDFlowGroup',
    legendGroup: 'MHD Flow',
    has3DOverlay: true,
    displayName: 'Bubble-MHD Confinement',
    description:
      'Rayleigh-Plesset + MHD Z-pinch staging. Renders Hartmann boundary layers + Lorentz force arrows.',
    reference: 'COMSOL Hartmann benchmark; OpenFOAM mhdFoam',
  },
  casimir_confinement: {
    vizLayer: 'CasimirFieldGroup',
    legendGroup: 'Casimir Geometry',
    has3DOverlay: true,
    displayName: 'Casimir Confinement',
    description:
      'Vacuum-fluctuation confinement between lattice voids; Lifshitz correction for real metals.',
    reference: 'Casimir (1948); Lifshitz (1956)',
  },
  quantum_tunneling: {
    vizLayer: null,
    legendGroup: 'Tunneling',
    has3DOverlay: false,
    displayName: 'Quantum Tunneling (Gamow/WKB)',
    description:
      'Base Gamow/WKB tunneling probability; scalar enhancement only. Reported via U/t Fermi-Hubbard ratio.',
    reference: 'Gamow (1928); Bojovic et al., Nature (2026)',
  },
  hagelstein_phonon: {
    vizLayer: null,
    legendGroup: 'Phonon Transfer',
    has3DOverlay: false,
    displayName: 'Hagelstein Phonon-Nuclear',
    description:
      'Phonon-nuclear coupling for energy transfer to lattice. Future overlay: phonon wavefronts.',
    reference: 'Hagelstein & Chaudhary (2015)',
  },
  kim_bec: {
    vizLayer: null,
    legendGroup: 'Coherence',
    has3DOverlay: false,
    displayName: 'Kim Bose-Einstein Condensate',
    description:
      'Deuteron BEC in metal lattice cavities. Future overlay: coherence cloud radius.',
    reference: 'Kim et al. (2009)',
  },
  widom_larsen: {
    vizLayer: null,
    legendGroup: 'Weak Interaction',
    has3DOverlay: false,
    displayName: 'Widom-Larsen Ultra-Low-Momentum Neutrons',
    description:
      'Heavy-electron-mediated weak capture producing ULMN. Scalar-only contribution.',
    reference: 'Widom & Larsen, Eur. Phys. J. C (2006)',
  },
  nae_model: {
    vizLayer: null,
    legendGroup: 'NAE Sites',
    has3DOverlay: false,
    displayName: 'Nuclear Active Environment (Storms)',
    description: 'Statistical NAE site density. Scalar only; NAE sites implicit in lattice lattice.',
    reference: 'Storms (2007, 2014)',
  },
  takahashi_tsc: {
    vizLayer: null,
    legendGroup: 'TSC',
    has3DOverlay: false,
    displayName: 'Takahashi 4D Tetrahedral Symmetric Condensate',
    description:
      '4D-tetrahedron symmetric condensate for multi-body fusion. Scalar enhancement only.',
    reference: 'Takahashi (2009); Takahashi & Yabuuchi (2015)',
  },
  vysotskii_ccs: {
    vizLayer: null,
    legendGroup: 'Coherent Correlated States',
    has3DOverlay: false,
    displayName: 'Vysotskii Coherent Correlated States',
    description:
      'Non-stationary quantum states with enhanced tunneling. Scalar contribution.',
    reference: 'Vysotskii & Vysotskyy (2013)',
  },
  chubb_ion_band: {
    vizLayer: null,
    legendGroup: 'Ion Band States',
    has3DOverlay: false,
    displayName: 'Chubb Ion-Band States',
    description: 'Bloch-wave ion-band states in Pd. Scalar-only contribution.',
    reference: 'Chubb & Chubb (1991)',
  },
  iwamura_transmutation: {
    vizLayer: null,
    legendGroup: 'Transmutation',
    has3DOverlay: false,
    displayName: 'Iwamura Transmutation',
    description: 'Ba->Sm, Cs->Pr multi-nucleon transfer in Pd/CaO/Pd sandwich. Scalar only.',
    reference: 'Iwamura et al., Jpn. J. Appl. Phys. (2002)',
  },
  piantelli_ni_h: {
    vizLayer: null,
    legendGroup: 'Ni-H Reactions',
    has3DOverlay: false,
    displayName: 'Piantelli Ni-H',
    description: 'Ni-H reactions with H1-like intermediate. Scalar contribution; requires alkali.',
    reference: 'Piantelli (2010)',
  },
  matsumoto_enc: {
    vizLayer: null,
    legendGroup: 'Electron Nuclear Capture',
    has3DOverlay: false,
    displayName: 'Matsumoto Electron Nuclear Capture',
    description: 'Electron-nucleus capture analogue. Scalar only.',
    reference: 'Matsumoto (1989)',
  },
  swartz_nanor: {
    vizLayer: null,
    legendGroup: 'Nanor',
    has3DOverlay: false,
    displayName: 'Swartz Nanor',
    description: 'ZrO2-PdD Nanor device phenomenology. Scalar only.',
    reference: 'Swartz (2015)',
  },
  letts_laser: {
    vizLayer: null,
    legendGroup: 'Laser Triggering',
    has3DOverlay: false,
    displayName: 'Letts Laser Triggering',
    description: 'Dual-laser surface plasmon triggering. Scalar only.',
    reference: 'Letts & Hagelstein (2009)',
  },
  miles_heat_helium: {
    vizLayer: null,
    legendGroup: 'Heat/Helium Correlation',
    has3DOverlay: false,
    displayName: 'Miles Heat-Helium Correlation',
    description: 'Excess heat vs 4He production correlation. Scalar only.',
    reference: 'Miles et al. (1993)',
  },
  hydroton: {
    vizLayer: null,
    legendGroup: 'Hydroton',
    has3DOverlay: false,
    displayName: 'Hydroton (Storms)',
    description: 'Linear H/D chain Coulomb-analog cluster. Scalar only.',
    reference: 'Storms (2014)',
  },
  non_equilibrium_thermo: {
    vizLayer: null,
    legendGroup: 'Non-Equilibrium',
    has3DOverlay: false,
    displayName: 'Non-Equilibrium Thermodynamics',
    description: 'Prigogine-style dissipative structures. Scalar only.',
    reference: 'Prigogine (1977)',
  },
  phonon_coupling_legacy: {
    vizLayer: null,
    legendGroup: 'Phonon (Legacy)',
    has3DOverlay: false,
    displayName: 'Phonon Coupling (Legacy)',
    description: 'Legacy phonon-coupling module kept for backwards compatibility.',
    reference: 'Internal (deprecated - see hagelstein_phonon)',
  },
  stellar_scaling_mhd: {
    vizLayer: 'MHDFlowGroup',
    legendGroup: 'MHD Flow',
    has3DOverlay: false,
    indirect: true,
    claimTier: 'cross_regime_extrapolation',
    displayName: 'Stellar-Scaling MHD (context line)',
    description:
      'Astrophysical MHD scaling shown for cross-regime comparison only; strongly down-weighted, not a direct LENR claim.',
    reference: 'Parkin & Pudritz (2004); Shercliff (1953)',
  },
};

/**
 * Heuristic overlay entries WITHOUT a dedicated backend theory. Kept in the
 * legend so UI is self-describing.
 */
export const HEURISTIC_OVERLAYS = {
  rydberg_orbitals: {
    vizLayer: 'RydbergOrbitalGroup',
    legendGroup: 'Orbital Visualization',
    has3DOverlay: true,
    displayName: 'Rydberg Orbitals',
    description:
      'Visualization-only model (no dedicated backend theory). Illustrates high-n orbital sketches at lattice sites.',
    reference: 'Visualization heuristic (v0.3.6-beta)',
  },
  halo_electrons: {
    vizLayer: 'HaloElectronGroup',
    legendGroup: 'Orbital Visualization',
    has3DOverlay: true,
    displayName: 'Halo Electrons',
    description:
      'Visualization-only cloud scaled by screening enhancement. Not a standalone theory.',
    reference: 'Visualization heuristic (v0.3.6-beta)',
  },
  kgrp_harmonic_locking: {
    vizLayer: 'MHDFlowGroup',
    legendGroup: 'Cavitation Diagnostics',
    has3DOverlay: false,
    claimTier: 'speculative_exploratory',
    displayName: 'KG-RP harmonic locking',
    description:
      'Speculative cavitation diagnostic (Mulnix KG-RP): collapse-vs-drive locking ratio and detuning. Diagnostic overlay, not a rate driver.',
    reference: 'Mulnix (2026) doi:10.5281/zenodo.19079074',
  },
};

/** Resolve the viz-map entry for a given theory_id (safely). */
export function getTheoryViz(theoryId) {
  return THEORY_VISUALIZATION_MAP[theoryId] || null;
}

/** Return the list of theories that render an actual 3D overlay. */
export function getTheoriesWith3DOverlay() {
  return Object.entries(THEORY_VISUALIZATION_MAP)
    .filter(([, entry]) => entry.has3DOverlay)
    .map(([id, entry]) => ({ theory_id: id, ...entry }));
}

/** Return the list of overlay layers that are purely heuristic. */
export function getHeuristicOverlays() {
  return Object.entries(HEURISTIC_OVERLAYS).map(([id, entry]) => ({ id, ...entry }));
}

export default THEORY_VISUALIZATION_MAP;
