/**
 * Map Pandoc-style \(…\) / \[…\] delimiters to remark-math $ / $$ forms.
 * Source docs stay on the repo LaTeX dialect; remark-math only parses dollars.
 * Does not invent physics — delimiter rewrite only.
 *
 * @param {string} markdown
 * @returns {string}
 */
export function normalizeMarkdownMath(markdown) {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  // Display math first so nested inline patterns do not collide.
  let next = markdown.replace(/\\\[([\s\S]+?)\\\]/g, (_, expr) => {
    const body = String(expr).trim();
    return `\n$$\n${body}\n$$\n`;
  });

  next = next.replace(/\\\((.+?)\\\)/g, (_, expr) => `$${String(expr).trim()}$`);
  return next;
}
