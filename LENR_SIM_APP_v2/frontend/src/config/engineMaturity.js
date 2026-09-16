/**
 * Engine maturity labels for public-beta honesty.
 * Mirrors LENR_SIM_APP_v2/docs/v0.3.7-beta/physics_maturity_ledger.json
 * (keep claim tiers aligned when editing either side).
 */

/** @typedef {'beta'|'approximate'|'speculative'|'established_reference'|'aspirational'} MaturityLabel */

/**
 * @typedef {Object} EngineMaturityEntry
 * @property {string} id
 * @property {MaturityLabel} label
 * @property {string} shortTitle
 * @property {string} description
 */

/** Surfaces used by page wiring. @type {Record<string, EngineMaturityEntry>} */
export const ENGINE_MATURITY = {
  'EQ-OPEN-MEV-01': {
    id: 'EQ-OPEN-MEV-01',
    label: 'speculative',
    shortTitle: 'OPEN — MeV channel',
    description:
      'Phonon→nuclear energy channel remains OPEN. Lean proves bookkeeping non-closure, not a physical solution.',
  },
  'EQ-OPEN-RAD-01': {
    id: 'EQ-OPEN-RAD-01',
    label: 'speculative',
    shortTitle: 'OPEN — radiation',
    description:
      'Radiation vs phonon branching remains OPEN. Bounds ≠ closure.',
  },
  'EQ-OPEN-RATE-01': {
    id: 'EQ-OPEN-RATE-01',
    label: 'speculative',
    shortTitle: 'OPEN — rate budget',
    description:
      'Lattice rate budget remains OPEN under engine caps (two-body non-closure proved in Lean).',
  },
  'EQ-OPEN-EC-01': {
    id: 'EQ-OPEN-EC-01',
    label: 'speculative',
    shortTitle: 'OPEN — EC energy',
    description:
      'Electron-capture energy path ≥0.782 MeV remains OPEN (deficit identity only in Lean).',
  },
  'EQ-OPEN-YIELD-01': {
    id: 'EQ-OPEN-YIELD-01',
    label: 'beta',
    shortTitle: 'OPEN — yield',
    description:
      'Integrated yield vs empirical bands remains OPEN / EMP — not discharged.',
  },
  'WH-ENP-01': {
    id: 'WH-ENP-01',
    label: 'speculative',
    shortTitle: 'Working hypothesis',
    description:
      'Exploratory bounds that intentionally do not close EQ-OPEN-* obligations.',
  },
  'ENG-BUBBLE-FUSION-01': {
    id: 'ENG-BUBBLE-FUSION-01',
    label: 'approximate',
    shortTitle: 'Bubble Fusion engine',
    description:
      'Approximate collapse model with auto KM when Mach≥0.3. Schematic local fallback must not be cited as engine output.',
  },
  'ENG-RP-KM-01': {
    id: 'ENG-RP-KM-01',
    label: 'approximate',
    shortTitle: 'RP / KM dynamics',
    description:
      'Rayleigh–Plesset for low Mach; Keller–Miksis auto-selected when peak Mach≥0.3 (Unified + Bubble Fusion).',
  },
  'ENG-WKB-01': {
    id: 'ENG-WKB-01',
    label: 'beta',
    shortTitle: 'WKB / Gamow tunneling',
    description:
      'Established WKB/Gamow reference numerics on VPS; screening enhancements remain domain-limited. Research preview.',
  },
  'ENG-THEORY-PIPELINE-01': {
    id: 'ENG-THEORY-PIPELINE-01',
    label: 'speculative',
    shortTitle: 'Theory pipeline',
    description:
      'Most theory modules default to speculative / exploratory claim tiers. Per-theory model_fidelity and empirical_support are independent axes — fidelity ≠ validity; EQ-OPEN-* stay OPEN.',
    model_fidelity: 'per_theory',
    empirical_support: 'per_theory',
  },
  'ENG-SCREEN-CASIMIR-01': {
    id: 'ENG-SCREEN-CASIMIR-01',
    label: 'approximate',
    shortTitle: 'Screening / Casimir',
    description: 'Composition approximations with documented domain limits.',
  },
  'ENG-STUB-EM-MHD-01': {
    id: 'ENG-STUB-EM-MHD-01',
    label: 'beta',
    shortTitle: 'EM / MHD stubs',
    description: 'Incomplete solvers — not primary public-beta numerics.',
  },
  'ENG-ASPIRATIONAL-FEM-01': {
    id: 'ENG-ASPIRATIONAL-FEM-01',
    label: 'aspirational',
    shortTitle: 'FEM / continuum',
    description:
      'COMSOL-class / Poisson–Schrödinger continuum methods are aspirational — not running on the public VPS.',
  },
};

export const MATURITY_CHIP = {
  beta: { label: 'Beta', color: 'info' },
  approximate: { label: 'Approximate', color: 'warning' },
  speculative: { label: 'Speculative', color: 'warning' },
  established_reference: { label: 'Established reference', color: 'success' },
  aspirational: { label: 'Aspirational', color: 'default' },
};
