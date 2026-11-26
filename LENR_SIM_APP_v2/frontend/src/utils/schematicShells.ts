/**
 * Tier-2 schematic electron-density shells for UBLV (paper-safe).
 *
 * Soft additive halos only — NOT QM orbitals / DFT / ab initio Ψ².
 * Opacity tracks loading_ratio / occupancy; radius is presentation scale.
 */

export const SCHEMATIC_SHELL_FIDELITY = 'schematic' as const;
export const SCHEMATIC_SHELL_CLAIM = 'speculative_exploratory' as const;
export const SCHEMATIC_SHELL_LABEL = 'Schematic electron-density shell — not QM orbitals';

export type SchematicShellSpec = {
  /** Multiplier on host atom radius for the soft shell. */
  radiusScale: number;
  /** Base opacity before occupancy lift (0..1). */
  opacity: number;
  /** Additive glow RGB. */
  colorHex: number;
  fidelity: typeof SCHEMATIC_SHELL_FIDELITY;
  claimTier: typeof SCHEMATIC_SHELL_CLAIM;
  label: string;
};

/**
 * Presentation shell params from loading ratio (schematic only).
 */
export function resolveSchematicShellSpec({
  loadingRatio = 0.9,
  hostMaterial = 'palladium',
}: {
  loadingRatio?: number;
  hostMaterial?: string | null;
} = {}): SchematicShellSpec {
  const theta = Number.isFinite(loadingRatio)
    ? Math.min(1, Math.max(0, loadingRatio))
    : 0.9;
  const isPd = (hostMaterial || '').toLowerCase().startsWith('pd')
    || (hostMaterial || '').toLowerCase() === 'palladium';
  return {
    radiusScale: 1.85 + theta * 0.35,
    // Soft additive — very translucent halos (Diadon: softer than 7d65f6b).
    opacity: 0.022 + theta * 0.04,
    colorHex: isPd ? 0x5ee0ff : 0x88ffaa,
    fidelity: SCHEMATIC_SHELL_FIDELITY,
    claimTier: SCHEMATIC_SHELL_CLAIM,
    label: SCHEMATIC_SHELL_LABEL,
  };
}

/**
 * Per-site opacity lift when schematically occupied.
 */
export function schematicShellSiteOpacity(
  baseOpacity: number,
  occupied: boolean,
): number {
  const base = Math.min(1, Math.max(0, baseOpacity));
  return occupied ? Math.min(0.18, base * 1.15) : base * 0.12;
}
