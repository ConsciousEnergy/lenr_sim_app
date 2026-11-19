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
 * @param {string} text
 * @returns {string}
 */
function rewriteProseMath(text) {
  // Display math first. Capture an optional quote/list prefix on the opening line
  // so converted $$ blocks stay inside the same Markdown container.
  let next = text.replace(
    /(^|\n)([ \t]*(?:>[ \t]*|[-*+][ \t]+|\d+\.[ \t]+)?)\\\[([\s\S]+?)\\\]/g,
    (full, lead, prefix, expr) => {
      const body = String(expr).trim();
      const containerPrefix = prefix || '';
      if (containerPrefix) {
        const lines = ['$$', body, '$$'].map((line) => `${containerPrefix}${line}`);
        return `${lead}${lines.join('\n')}`;
      }
      return `${lead}\n$$\n${body}\n$$\n`;
    },
  );

  // Inline math may span soft line breaks, but not blank lines / code (already protected).
  next = next.replace(
    /\\\(((?:[^\n\\]|\\.|(\n(?!\n)))+?)\\\)/g,
    (_, expr) => `$${String(expr).trim()}$`,
  );
  return next;
}
