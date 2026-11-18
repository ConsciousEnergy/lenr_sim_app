import { normalizeMarkdownMath } from './normalizeMarkdownMath';

describe('normalizeMarkdownMath', () => {
  test('rewrites Pandoc display and inline delimiters for remark-math', () => {
    const src =
      'Ratio:\n\n\\[\n\\frac{a}{b} = 2.63 \\times 10^{11}\n\\]\n\n' +
      'Inline \\( E = mc^2 \\) stays inline.';
    const out = normalizeMarkdownMath(src);
    expect(out).toContain('$$\n\\frac{a}{b} = 2.63 \\times 10^{11}\n$$');
    expect(out).toContain('$E = mc^2$');
    expect(out).not.toMatch(/\\\[/);
    expect(out).not.toMatch(/\\\(/);
  });

  test('returns empty string for non-string input', () => {
    expect(normalizeMarkdownMath(null)).toBe('');
    expect(normalizeMarkdownMath(undefined)).toBe('');
  });
});
