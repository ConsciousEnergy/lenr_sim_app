import { formatNumber, formatProbability } from './dataFormatter';

describe('formatProbability', () => {
  it('renders ordinary probabilities as percentages', () => {
    expect(formatProbability(0.5)).toBe('50.00%');
    expect(formatProbability(0.123)).toBe('12.30%');
  });

  it('never renders a small non-zero probability as 0.00%', () => {
    // 1e-5 -> 0.001% would previously round to "0.00%".
    const formatted = formatProbability(1e-5);
    expect(formatted).not.toBe('0.00%');
    expect(formatted).toBe('1.00e-3%');
  });

  it('renders exactly zero as 0.00%', () => {
    expect(formatProbability(0)).toBe('0.00%');
  });

  it('clamps out-of-range values into [0, 1]', () => {
    expect(formatProbability(1.7)).toBe('100.00%');
    expect(formatProbability(-0.2)).toBe('0.00%');
  });

  it('returns N/A for missing values', () => {
    expect(formatProbability(undefined)).toBe('N/A');
    expect(formatProbability(null)).toBe('N/A');
    expect(formatProbability(NaN)).toBe('N/A');
  });
});

describe('formatNumber', () => {
  it('switches to scientific notation for tiny magnitudes', () => {
    expect(formatNumber(1e-5)).toBe('1.00e-5');
  });

  it('formats mid-range values with separators', () => {
    expect(formatNumber(12345.678)).toBe('12,345.68');
  });
});
