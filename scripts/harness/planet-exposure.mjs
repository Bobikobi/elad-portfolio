/**
 * NEW-1 - is the /projects planet blown out, and does it carry the surface detail /about's
 * Earth carries?
 *
 *   BASE=http://localhost:3113 node scripts/harness/planet-exposure.mjs
 *
 * The disc comes from the CAMERA (`?discprobe=1`), never from a brightness threshold: a
 * threshold selects the lit half and then reports how bright it is, which is how "too
 * bright" and "clipped" get confused. Every statistic below is taken over the same
 * normalised disc on both worlds, so /about is a real yardstick rather than an impression.
 *
 * Three numbers matter, and they are different questions:
 *
 *   clipping  - % of disc pixels at or above 250, and % with any channel at 255. This is
 *               what "blown out" literally means. It can be zero on a planet that still
 *               reads as a flat cream ball.
 *   level     - mean and p99 luminance of the LIT part of the disc. The calibration note
 *               above ORBIT_EXPOSURE names a 90-135 target band, measured per world.
 *   detail    - mean |L - blur(L)| inside the lit part, at TWO scales. det5 sees fine
 *               structure (coastlines, cloud edges) - Earth is full of it and a gas giant
 *               physically has none, so scoring Saturn against Earth on det5 asks Saturn to
 *               grow continents. det25 sees BANDING, which is what Saturn has and what "no
 *               banding, no surface texture" is actually pointing at.
 *
 * Pixels are read through ffmpeg (PNG -> rgb24), so there is no image dependency to install.
 */
import puppeteer from 'puppeteer-core';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { discStats } from './lib/disc-stats.mjs';

const BASE = process.env.BASE || 'http://localhost:3113';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'planet-exposure');
const SETTLE = Number(process.env.SETTLE || 14000);
fs.mkdirSync(OUT, { recursive: true });

const CASES = [];
for (const [lname, pre] of [['en', '']]) {
  for (const [vname, vp] of [
    ['desktop', { width: 1440, height: 900 }],
    ['mobile', { width: 390, height: 844, isMobile: true, hasTouch: true }],
  ]) {
    for (const world of ['/about', '/projects']) {
      CASES.push({ name: `${lname}-${vname}-${world.slice(1)}`, url: `${pre}${world}`, vp });
    }
  }
}

/** Decode a PNG to a flat rgb24 buffer. */
function pixels(file, w, h) {
  const raw = path.join(OUT, path.basename(file, '.png') + '.raw');
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgb24', raw]);
  const buf = fs.readFileSync(raw);
  fs.unlinkSync(raw);
  if (buf.length !== w * h * 3) throw new Error(`raw size ${buf.length} != ${w * h * 3} for ${file}`);
  return buf;
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 240000,
  userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'planet-exp-')),
  args: [
    '--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars',
    '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage',
  ],
});

const report = {};
for (const c of CASES) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ deviceScaleFactor: 1, ...c.vp });
  await page.goto(`${BASE}${c.url}?discprobe=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, SETTLE));
  const disc = await page.evaluate(() => document.documentElement.dataset.planetDisc || null);
  const shot = path.join(OUT, `${c.name}.png`);
  await page.screenshot({ path: shot });
  await page.close();
  await ctx.close();

  if (!disc) { report[c.name] = { error: 'camera published no disc' }; continue; }
  const [cx, cy, R] = disc.split(',').map(Number);
  const buf = pixels(shot, c.vp.width, c.vp.height);
  report[c.name] = {
    disc: { cx, cy, R: +R.toFixed(1) },
    at95: discStats(buf, c.vp.width, c.vp.height, cx, cy, R, 0.95),
    at80: discStats(buf, c.vp.width, c.vp.height, cx, cy, R, 0.8),
    at50: discStats(buf, c.vp.width, c.vp.height, cx, cy, R, 0.5),
  };
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

console.log('world               R    lit%  meanLit   p99  >=250% ch255% chroma  det5  det25');
for (const [k, v] of Object.entries(report)) {
  if (v.error) { console.log(`${k.padEnd(18)} ERROR ${v.error}`); continue; }
  const s = v.at95;
  console.log(
    `${k.padEnd(19)} ${String(v.disc.R).padStart(5)} ${String(s.litFrac).padStart(5)} ` +
    `${String(s.meanLit).padStart(7)} ${String(s.p99Lit).padStart(5)} ${String(s.pctAbove250).padStart(6)} ` +
    `${String(s.pctChannel255).padStart(6)} ${String(s.chroma).padStart(6)} ${String(s.detail5).padStart(5)} ${String(s.detail25).padStart(6)}`
  );
}
