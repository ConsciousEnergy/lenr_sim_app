/**
 * Compact, lossless-enough number formatting for API-supplied ledger values
 * (open-questions lab). Keeps up to four significant figures, drops trailing
 * zeros, and switches to exponent form only for very large / very small
 * magnitudes so 23.8 stays "23.8", 1e-20 stays "1e-20" and 2.62e17 does not
 * expand to eighteen digits.
 */
export function formatCompact(value: unknown): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  const magnitude = Math.abs(numeric);
  if (numeric !== 0 && (magnitude >= 1e9 || magnitude < 1e-4)) {
    return numeric
      .toExponential(3)
      .replace(/\.?0+e/, 'e')
      .replace('e+', 'e');
  }
  return Number(numeric.toPrecision(4)).toString();
}

export default formatCompact;
