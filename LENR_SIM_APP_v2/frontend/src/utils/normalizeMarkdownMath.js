/**
 * Map Pandoc-style \(…\) / \[…\] delimiters to remark-math $ / $$ forms.
 * Source docs stay on the repo LaTeX dialect; remark-math only parses dollars.
 * Does not invent physics — delimiter rewrite only.
 *
 * Skips fenced code blocks and inline code spans so documentation examples that
 * literally show `\(x\)` / `\[…\]` stay unchanged. Preserves blockquote / list
 * prefixes around display-math conversions.
 *
 * @param {string} markdown
 * @returns {string}
 */
export function normalizeMarkdownMath(markdown) {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  // Protect fenced ```…``` and inline `…` before rewriting prose math.
  const segments = [];
  const codeOrFence = /(```[\s\S]*?```|`[^`\n]+`)/g;
  let lastIndex = 0;
  let match = codeOrFence.exec(markdown);
  while (match) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', value: markdown.slice(lastIndex, match.index) });
    }
    segments.push({ kind: 'code', value: match[0] });
    lastIndex = match.index + match[0].length;
    match = codeOrFence.exec(markdown);
  }
  if (lastIndex < markdown.length) {
    segments.push({ kind: 'text', value: markdown.slice(lastIndex) });
  }

  return segments
    .map((segment) =>
      segment.kind === 'code' ? segment.value : rewriteProseMath(segment.value),
    )
    .join('');
}

/**
 * Strip leaked blockquote / list markers from captured display-math body lines.
 * @param {string} body
 * @returns {string}
 */
function stripContainerMarkersFromBody(body) {
  return String(body)
    .split('\n')
    .map((line) =>
      line
        .replace(/^[ \t]*(?:>[ \t]*)+/, '')
        .replace(/^[ \t]*(?:[-*+]|\d+\.)[ \t]+/, ''),
    )
    .join('\n')
    .trim();
}

/**
 * @param {string} text
 * @returns {string}
 */
function rewriteProseMath(text) {
  // Match \[…\] with same-line lead-in so container prefixes are consumed.
  // Allows display math after prose (emits a separate $$ block).
  let next = text.replace(
    /(^|\n)([^\n]*?)\\\[([\s\S]+?)\\\]/g,
    (full, lead, before, expr) => {
      const body = stripContainerMarkersFromBody(expr);
      const quoteOnly = before.match(/^([ \t]*(?:>[ \t]*)+)$/);
      const listOnly = before.match(/^([ \t]*)([-*+]|\d+\.)([ \t]+)$/);

      if (quoteOnly) {
        const prefix = quoteOnly[1];
        const lines = ['$$', ...body.split('\n'), '$$'].map(
          (line) => `${prefix}${line}`,
        );
        return `${lead}${lines.join('\n')}`;
      }

      if (listOnly) {
        const openPrefix = listOnly[0];
        const bodyIndent = ' '.repeat(openPrefix.length);
        const bodyLines = body.split('\n');
        const lines = [
          `${openPrefix}$$`,
          ...bodyLines.map((line) => `${bodyIndent}${line}`),
          `${bodyIndent}$$`,
        ];
        return `${lead}${lines.join('\n')}`;
      }

      // Prose (or empty) before \[…\] — keep prose, emit a separate display block.
      const prose = before.replace(/[ \t]+$/, '');
      const prosePart = prose.length > 0 ? `${prose}\n` : '';
      return `${lead}${prosePart}$$\n${body}\n$$`;
    },
  );

  // Inline math may span soft line breaks, but not blank lines / code (already protected).
  next = next.replace(
    /\\\(((?:[^\n\\]|\\.|(\n(?!\n)))+?)\\\)/g,
    (_, expr) => `$${String(expr).trim()}$`,
  );
  return next;
}
