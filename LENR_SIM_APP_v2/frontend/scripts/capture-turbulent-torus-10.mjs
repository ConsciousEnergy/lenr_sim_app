/**
 * Capture 10-* cascade / phase-map media from turbulent-torus-plasma-preview.html.
 * Seeks via patched performance.now (preview RAF uses it for elapsed).
 * Requires rendered-preview ack before writing captures.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import {
  gotoPreview,
  seekAndWaitForRender,
} from './capture-preview-helpers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIRS = [
  '/opt/cursor/artifacts',
  '/cursor/stores/bc-5b00a6aa-1b96-4ba5-8554-8c49079a113f/media/threejs-viz-preview',
];
const URL = process.env.PREVIEW_URL
  || 'http://127.0.0.1:8765/turbulent-torus-plasma-preview.html';
const FRAME_DIR = '/tmp/torus10-frames';

for (const d of OUT_DIRS) fs.mkdirSync(d, { recursive: true });
fs.rmSync(FRAME_DIR, { recursive: true, force: true });
fs.mkdirSync(FRAME_DIR, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  channel: 'chrome',
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.addInitScript(() => {
  let virtMs = 0;
  let wall0 = Date.now();
  performance.now = () => virtMs + (Date.now() - wall0) * 0.02;
  window.__setElapsedSec = (sec) => {
    virtMs = sec * 1000;
    wall0 = Date.now();
  };
});

await gotoPreview(page, URL);

async function seek(elapsedSec) {
  await seekAndWaitForRender(page, elapsedSec);
}

async function shot(name) {
  const buf = await page.screenshot({ type: 'png' });
  for (const d of OUT_DIRS) {
    const p = path.join(d, name);
    fs.writeFileSync(p, buf);
    console.log('wrote', p, fs.statSync(p).size);
  }
  return buf;
}

await seek(5.85);
await shot('ublv-turbulent-torus-10-phase-map.png');

await seek(8.25);
await shot('ublv-turbulent-torus-10-twist-fold.png');

await seek(8.85);
await shot('ublv-turbulent-torus-10-daughter-eddy.png');

// Frame sequence for cascade mp4
const start = 7.85;
const end = 9.6;
const steps = 48;
for (let i = 0; i < steps; i += 1) {
  const t = start + (end - start) * (i / (steps - 1));
  await seek(t);
  const buf = await page.screenshot({ type: 'png' });
  const frame = path.join(FRAME_DIR, `f${String(i).padStart(3, '0')}.png`);
  fs.writeFileSync(frame, buf);
}

await browser.close();

const tmpMp4 = '/tmp/ublv-turbulent-torus-10-cascade.mp4';
const ff = spawnSync('ffmpeg', [
  '-y', '-framerate', '12',
  '-i', path.join(FRAME_DIR, 'f%03d.png'),
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', tmpMp4,
], { encoding: 'utf8' });
if (ff.status === 0 && fs.existsSync(tmpMp4)) {
  for (const d of OUT_DIRS) {
    const dest = path.join(d, 'ublv-turbulent-torus-10-cascade.mp4');
    fs.copyFileSync(tmpMp4, dest);
    console.log('wrote', dest, fs.statSync(dest).size);
  }
} else {
  console.warn('ffmpeg failed', ff.stderr?.slice?.(0, 800));
  process.exitCode = 1;
}

console.log('done', __dirname);
