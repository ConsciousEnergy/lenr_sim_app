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

  test('leaves fenced and inline code examples unchanged', () => {
    const src =
      'Prose \\(a\\).\n\n' +
      'Inline code `\\(x\\)` stays literal.\n\n' +
      '```md\n\\[\ny = 1\n\\]\n```\n';
    const out = normalizeMarkdownMath(src);
    expect(out).toContain('$a$');
    expect(out).toContain('`\\(x\\)`');
    expect(out).toContain('```md\n\\[\ny = 1\n\\]\n```');
  });

  test('preserves blockquote prefixes on every display-math line', () => {
    const quoted = '> \\[x=1\\]';
    expect(normalizeMarkdownMath(quoted)).toBe('> $$\n> x=1\n> $$');
  });

  test('list markers only on opening $$; body/close indented to content column', () => {
    const listed = '- \\[y=2\\]';
    expect(normalizeMarkdownMath(listed)).toBe('- $$\n  y=2\n  $$');
  });

  test('strips nested quote markers from multiline blockquote math bodies', () => {
    const src = '> \\[\n> E = mc^2\n> \\]';
    expect(normalizeMarkdownMath(src)).toBe('> $$\n> E = mc^2\n> $$');
  });

  test('emits display math after mid-line prose', () => {
    const src = 'See ratio: \\[a/b\\] next.';
    const out = normalizeMarkdownMath(src);
    expect(out).toBe('See ratio:\n$$\na/b\n$$ next.');
    expect(out).not.toMatch(/\\\[/);
  });

  test('allows soft line breaks inside inline math', () => {
    const src = 'Value \\(a +\nb\\) here.';
    expect(normalizeMarkdownMath(src)).toContain('$a +\nb$');
  });

  test('returns empty string for non-string input', () => {
    expect(normalizeMarkdownMath(null)).toBe('');
    expect(normalizeMarkdownMath(undefined)).toBe('');
  });
});
