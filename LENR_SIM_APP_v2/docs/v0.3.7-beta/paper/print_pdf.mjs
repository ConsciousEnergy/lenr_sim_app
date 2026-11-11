import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const ROOT = process.argv[2];
const OUT = process.argv[3];
if (!ROOT || !OUT) {
  console.error('usage: node print_pdf.mjs <serve-dir> <out.pdf>');
  process.exit(2);
}
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('forbidden'); return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const url = `http://127.0.0.1:${port}/`;
console.log('serving', url);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

try {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForFunction(() => document.querySelectorAll('.katex').length > 50, { timeout: 60000 });
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  });
  await new Promise((r) => setTimeout(r, 800));
  const katexCount = await page.evaluate(() => document.querySelectorAll('.katex').length);
  const errCount = await page.evaluate(() => document.querySelectorAll('.katex-error').length);
  console.log('katex nodes', katexCount, 'errors', errCount);

  await page.pdf({
    path: OUT,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="width:100%;font-size:8px;color:#005490;padding:0 16mm;font-family:DejaVu Sans,sans-serif;display:flex;justify-content:space-between;">
        <span>Conscious Energies · www.conscious.energy</span>
        <span>Unified Theoretical Framework for LENR</span>
      </div>`,
    footerTemplate: `
      <div style="width:100%;font-size:8px;color:#3d5266;padding:0 16mm;font-family:DejaVu Sans,sans-serif;display:flex;justify-content:space-between;">
        <span>preprint companion · lenr_proved=false · EQ-OPEN-* OPEN</span>
        <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
      </div>`,
    margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' },
  });
  console.log('wrote', OUT, fs.statSync(OUT).size);
} finally {
  await browser.close();
  server.close();
}
