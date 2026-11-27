/**
 * Capture 12-* long collapse scrub: full COLLAPSE window 90.7% → 95.7%.
 * Non-linear slow seek — dwell on fold-in / walls-meet / puncture→torus / jet onset.
 *
 * Preview mapping (CYCLE=10s): u∈[0.50, 0.78] → elapsed 5.0–7.8s → scrub 90.7–95.7%.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const STORE_MEDIA =
  '/cursor/stores/bc-5b00a6aa-1b96-4ba5-8554-8c49079a113f/media/threejs-viz-preview';
const OUT_DIRS = [
  '/opt/cursor/artifacts',
  STORE_MEDIA,
];
const URL = process.env.PREVIEW_URL
  || 'http://127.0.0.1:8765/turbulent-torus-plasma-preview.html';
const FRAME_DIR = '/tmp/torus12-collapse-frames';

const COLLAPSE_START_S = 5.0;   // scrub 90.7%
const COLLAPSE_END_S = 7.82;    // scrub ≈95.7%
const FRAME_COUNT = 300;        // @12fps = 25s
const FRAME_RATE = 12;

/**
 * Non-linear collapse progress 0..1 — dwell on pin-through / torus birth.
 * Early dimple ~20%, critical morph ~55%, jet onset ~25%.
 */
function collapseProgressForFrame(i, n) {
  const u = i / Math.max(1, n - 1);
  // Piecewise ease: slow middle
  if (u < 0.22) {
    // 0 → 0.32 (dimple forming)
    const t = u / 0.22;
    return 0.32 * (t * t * (3 - 2 * t));
  }
  if (u < 0.78) {
    // 0.32 → 0.78 (walls meet → puncture → torus) — longest dwell
    const t = (u - 0.22) / 0.56;
    const s = t * t * (3 - 2 * t);
    return 0.32 + 0.46 * s;
  }
  // 0.78 → 1.0 (jet onset / end of window)
  const t = (u - 0.78) / 0.22;
  const s = t * t * (3 - 2 * t);
  return 0.78 + 0.22 * s;
}

for (const d of OUT_DIRS) fs.mkdirSync(d, { recursive: true });
fs.rmSync(FRAME_DIR, { recursive: true, force: true });
fs.mkdirSync(FRAME_DIR, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  channel: 'chrome',
});
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

await page.addInitScript(() => {
  let virtMs = 0;
  let wall0 = Date.now();
  performance.now = () => virtMs + (Date.now() - wall0) * 0.012;
  window.__setElapsedSec = (sec) => {
    virtMs = sec * 1000;
    wall0 = Date.now();
  };
});

await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(800);

await page.evaluate(() => {
  const chips = document.getElementById('chips');
  if (chips) chips.style.opacity = '0.65';
  const badge = document.getElementById('badge');
  if (badge) badge.style.opacity = '0.5';
});

await page.evaluate((sec) => window.__setElapsedSec(sec), COLLAPSE_START_S);
await page.waitForTimeout(500);

// Side angle so rear dimple / pin depth reads
const box = page.viewportSize();
const cx = box.width * 0.52;
const cy = box.height * 0.48;
await page.mouse.move(cx, cy);
await page.mouse.down();
await page.mouse.move(cx - 200, cy + 55, { steps: 20 });
await page.mouse.up();
await page.waitForTimeout(200);
await page.mouse.wheel(0, -480);
await page.waitForTimeout(280);

async function seek(elapsedSec) {
  await page.evaluate((sec) => window.__setElapsedSec(sec), elapsedSec);
  await page.waitForTimeout(110);
}

async function shot(name) {
  const buf = await page.screenshot({ type: 'png' });
  for (const d of OUT_DIRS) {
    const p = path.join(d, name);
    fs.writeFileSync(p, buf);
    console.log('wrote', p, fs.statSync(p).size);
  }
}

const stills = [
  ['ublv-turbulent-torus-12-dimple.png', 5.0 + 0.22 * 2.8],
  ['ublv-turbulent-torus-12-walls-meet.png', 5.0 + 0.48 * 2.8],
  ['ublv-turbulent-torus-12-puncture-torus.png', 5.0 + 0.62 * 2.8],
  ['ublv-turbulent-torus-12-jet-onset.png', 5.0 + 0.88 * 2.8],
];

for (const [name, t] of stills) {
  await seek(t);
  await page.waitForTimeout(380);
  await shot(name);
}

for (let i = 0; i < FRAME_COUNT; i += 1) {
  const p = collapseProgressForFrame(i, FRAME_COUNT);
  const t = COLLAPSE_START_S + (COLLAPSE_END_S - COLLAPSE_START_S) * p;
  await seek(t);
  const buf = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(FRAME_DIR, `f${String(i).padStart(4, '0')}.png`), buf);
  if (i % 50 === 0) console.log(`frame ${i}/${FRAME_COUNT} p=${p.toFixed(3)} t=${t.toFixed(3)}s`);
}

await browser.close();

const tmpMp4 = '/tmp/ublv-turbulent-torus-12-collapse-long.mp4';
const ff = spawnSync('ffmpeg', [
  '-y', '-framerate', String(FRAME_RATE),
  '-i', path.join(FRAME_DIR, 'f%04d.png'),
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
  '-crf', '17', '-preset', 'medium', '-an',
  tmpMp4,
], { encoding: 'utf8' });

if (ff.status !== 0 || !fs.existsSync(tmpMp4)) {
  console.error('ffmpeg failed', ff.stderr?.slice?.(0, 1200));
  process.exit(1);
}

const destName = 'ublv-turbulent-torus-12-collapse-long.mp4';
for (const d of OUT_DIRS) {
  const dest = path.join(d, destName);
  fs.copyFileSync(tmpMp4, dest);
  console.log('wrote', dest, fs.statSync(dest).size);
}

const required = path.join(STORE_MEDIA, destName);
console.log('required ok', required, fs.statSync(required).size);
console.log('done');
