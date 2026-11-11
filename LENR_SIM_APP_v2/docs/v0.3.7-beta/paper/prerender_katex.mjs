#!/usr/bin/env node
/**
 * Pre-render all data-tex math nodes with katex.renderToString.
 * Usage: node prerender_katex.mjs <html-path>
 */
import fs from 'node:fs';
import katex from 'katex';

const path = process.argv[2];
if (!path) {
  console.error('usage: node prerender_katex.mjs <html>');
  process.exit(2);
}

let html = fs.readFileSync(path, 'utf8');
let ok = 0;
let fail = 0;
const failures = [];

const re = /<(div|span)(\s[^>]*?\bdata-tex="([^"]*)"[^>]*)>([\s\S]*?)<\/\1>/g;
html = html.replace(re, (full, tag, attrs, texEsc) => {
  if (!/math-(?:display|inline)/.test(attrs)) return full;
  const tex = texEsc
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
  const display = /\bdata-display="1"/.test(attrs) || /\bmath-display\b/.test(attrs);
  try {
    const rendered = katex.renderToString(tex, {
      throwOnError: true,
      displayMode: display,
      strict: 'ignore',
      output: 'html',
    });
    ok += 1;
    return `<${tag}${attrs}>${rendered}</${tag}>`;
  } catch (e) {
    fail += 1;
    failures.push({ tex: tex.slice(0, 140), err: String(e.message || e) });
    let newAttrs = attrs;
    if (/\bclass="/.test(newAttrs)) {
      newAttrs = newAttrs.replace(/\bclass="([^"]*)"/, (_m, c) =>
        c.includes('math-fallback') ? `class="${c}"` : `class="${c} math-fallback"`,
      );
    } else {
      newAttrs += ' class="math-fallback"';
    }
    const safe = tex
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<${tag}${newAttrs}>${safe}</${tag}>`;
  }
});

fs.writeFileSync(path, html);
console.log(JSON.stringify({ ok, fail, failures: failures.slice(0, 25) }, null, 2));
if (fail > 0) process.exitCode = 1;
