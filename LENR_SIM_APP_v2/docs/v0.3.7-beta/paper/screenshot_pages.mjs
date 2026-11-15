#!/usr/bin/env node
/**
 * Rasterize paper PDF pages needed for visual review:
 * - every branded-PDF page that contains appendix content or display math
 * - every submission-PDF page that contains display math
 * Also writes a simple contact-sheet grid PNG via pdftoppm + montage if available,
 * otherwise a vertical sheet via a tiny canvas-less HTML print.
 *
 * Usage: node screenshot_pages.mjs <serve-dir> <shots-dir> <branded.pdf> <submission.pdf>
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const [, , serveDir, shotsDir, brandedPdf, submissionPdf] = process.argv;
if (!serveDir || !shotsDir || !brandedPdf || !submissionPdf) {
  console.error('usage: node screenshot_pages.mjs <serve-dir> <shots-dir> <branded.pdf> <submission.pdf>');
  process.exit(2);
}

fs.mkdirSync(shotsDir, { recursive: true });

function pdftotext(pdf) {
  return execFileSync('pdftotext', ['-layout', pdf, '-'], { encoding: 'utf8' });
}

function pdfPageCount(pdf) {
  const out = execFileSync('pdfinfo', [pdf], { encoding: 'utf8' });
  const m = out.match(/Pages:\s+(\d+)/);
  return m ? Number(m[1]) : 0;
}

/** Pages whose text looks like display-math-heavy or appendix content. */
function selectPages(pdf, { appendix = false } = {}) {
  const pages = pdfPageCount(pdf);
  const selected = new Set();
  for (let i = 1; i <= pages; i++) {
    const text = execFileSync('pdftotext', ['-f', String(i), '-l', String(i), '-layout', pdf, '-'], {
      encoding: 'utf8',
    });
    const hasDisplayHints =
      /∫|∑|∇|≈|≥|≤|×|·|ψ|φ|λ|ħ|ε|ρ|σ|ω/.test(text) ||
      /\\frac|S\s*≥|S\s>=|10\^|MeV|Casimir|Poisson|Schrödinger|Schrodinger/.test(text) ||
      /\bE_|\bQ_|\bP_|\bn\s*[-−]\s*λ/.test(text);
    const hasAppendix =
      /Appendix \(archival\)|Archival abstract|Historical Background and Scientific Challenges|Statistical Criteria for Validation|Poisson Significance|Mathematical Symbols and Definitions/.test(
        text,
      );
    if (hasDisplayHints || (appendix && hasAppendix) || hasAppendix) {
      selected.add(i);
    }
  }
  // Always keep first page (title) for visual brand check
  selected.add(1);
  return [...selected].sort((a, b) => a - b);
}

function rasterize(pdf, prefix, pageList) {
  const outPrefix = path.join(shotsDir, prefix);
  // Rasterize selected pages individually for clarity
  for (const p of pageList) {
    execFileSync(
      'pdftoppm',
      ['-png', '-r', '120', '-f', String(p), '-l', String(p), pdf, `${outPrefix}-p${String(p).padStart(3, '0')}`],
      { stdio: 'inherit' },
    );
  }
}

console.log('selecting branded pages…');
const brandedPages = selectPages(brandedPdf, { appendix: true });
console.log('branded pages', brandedPages.join(','));
rasterize(brandedPdf, 'branded', brandedPages);

console.log('selecting submission pages…');
const subPages = selectPages(submissionPdf, { appendix: false });
console.log('submission pages', subPages.join(','));
rasterize(submissionPdf, 'submission', subPages);

// HTML viewport shots of appendix heading + a display-math section via Chrome
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1600, deviceScaleFactor: 1 });
  // local static server is already expected by caller; we start a tiny one here
  const http = await import('node:http');
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    let filePath = path.join(serveDir, urlPath === '/' ? 'index.html' : urlPath);
    if (!filePath.startsWith(serveDir)) {
      res.writeHead(403); res.end('forbidden'); return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForFunction(() => document.querySelectorAll('.katex').length > 20, { timeout: 60000 });

  // Shot near appendix
  const appendix = await page.$('#appendix-archival, h2#appendix-archival, h2');
  // Find heading text
  const appendixHandle = await page.evaluateHandle(() => {
    const hs = [...document.querySelectorAll('h1,h2,h3')];
    return hs.find((h) => /Appendix \(archival\)/i.test(h.textContent || '')) || null;
  });
  if (appendixHandle) {
    await page.evaluate((el) => el && el.scrollIntoView({ block: 'start' }), appendixHandle);
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: path.join(shotsDir, 'html-appendix-viewport.png'), fullPage: false });
  }

  // Shot a display-math block
  await page.evaluate(() => {
    const d = document.querySelector('.math-display');
    if (d) d.scrollIntoView({ block: 'center' });
  });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: path.join(shotsDir, 'html-display-math-viewport.png'), fullPage: false });

  server.close();
} finally {
  await browser.close();
}

// Contact sheet: simple HTML grid printed to PNG via Chrome
const pngs = fs.readdirSync(shotsDir).filter((f) => f.endsWith('.png') && !f.startsWith('contact')).sort();
const sheetHtml = `<!doctype html><meta charset=utf-8>
<title>Paper contact sheet</title>
<style>
  body{font-family:DejaVu Sans,sans-serif;background:#111;color:#eee;margin:16px}
  h1{font-size:18px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
  figure{margin:0;background:#1a1a1a;padding:8px;border-radius:6px}
  img{width:100%;height:auto;display:block;background:#fff}
  figcaption{font-size:11px;margin-top:6px;word-break:break-all}
</style>
<h1>Unified Theory Paper — page contact sheet (${pngs.length} frames)</h1>
<div class="grid">
${pngs.map((f) => `<figure><img src="${f}"/><figcaption>${f}</figcaption></figure>`).join('\n')}
</div>`;
fs.writeFileSync(path.join(shotsDir, 'contact-sheet.html'), sheetHtml);

const browser2 = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});
try {
  const page = await browser2.newPage();
  const http = await import('node:http');
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    let filePath = path.join(shotsDir, urlPath === '/' ? 'contact-sheet.html' : urlPath);
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end('not found'); return; }
      const ext = path.extname(filePath);
      const type = ext === '.png' ? 'image/png' : 'text/html; charset=utf-8';
      res.writeHead(200, { 'Content-Type': type });
      res.end(data);
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle0', timeout: 120000 });
  // full-page contact sheet may be tall
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewport({ width: 1400, height: Math.min(height + 40, 16000), deviceScaleFactor: 1 });
  await page.screenshot({
    path: path.join(shotsDir, 'contact-sheet.png'),
    fullPage: true,
  });
  server.close();
  console.log('wrote contact-sheet.png');
} finally {
  await browser2.close();
}

console.log(JSON.stringify({ brandedPages, subPages, frames: pngs.length + 1 }, null, 2));
