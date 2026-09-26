/**
 * NEW-1 sweep - pick Saturn's ORBIT aperture by measurement.
 *
 *   BASE=http://localhost:3113 node scripts/harness/orbit-exposure-sweep.mjs
 *
 * Loads /projects once per aperture through `?orbitexp=`, and /about once as the yardstick,
 * and reports the same disc statistics for each. The number to move is `detail` - mean
 * |L - blur(L)| over the lit disc - because the defect is compressed banding, not clipping.
 * `meanLit` is reported alongside so a value that buys detail by making the planet dark
 * cannot pass unnoticed.
 */
import puppeteer from 'puppeteer-core';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { discStats } from './lib/disc-stats.mjs';

const BASE = process.env.BASE || 'http://localhost:3113';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'orbit-sweep');
const SETTLE = Number(process.env.SETTLE || 14000);
const VALUES = (process.env.VALUES || '1.0,0.85,0.75,0.68,0.62,0.55,0.48').split(',').map(Number);
fs.mkdirSync(OUT, { recursive: true });

function pixels(file) {
  const raw = path.join(OUT, path.basename(file, '.png') + '.raw');
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgb24', raw]);
  const buf = fs.readFileSync(raw);
  fs.unlinkSync(raw);
  return buf;
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 240000,
  userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-sweep-')),
  args: [
    '--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars',
    '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage',
  ],
});

const VP = { width: 1440, height: 900 };
async function measure(url, name) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ deviceScaleFactor: 1, ...VP });
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, SETTLE));
  const disc = await page.evaluate(() => document.documentElement.dataset.planetDisc || null);
  const shot = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: shot });
  await page.close();
  await ctx.close();
  if (!disc) return { error: 'no disc' };
  const [cx, cy, R] = disc.split(',').map(Number);
  return { R: +R.toFixed(1), ...discStats(pixels(shot), VP.width, VP.height, cx, cy, R, 0.95) };
}

const BANDS = (process.env.BANDS || '0').split(',').map(Number);
const report = {};
report.about = await measure('/about?discprobe=1', 'about');
for (const b of BANDS) {
  for (const v of VALUES) {
    report[`saturn exp${v} bands${b}`] = await measure(
      `/projects?discprobe=1&orbitexp=${v}&bands=${b}`,
      `saturn-e${v}-b${b}`
    );
  }
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

console.log('case                       meanLit    p99  >=250% ch255% chroma  det5  det25');
for (const [k, v] of Object.entries(report)) {
  if (v.error) { console.log(`${k.padEnd(24)} ERROR ${v.error}`); continue; }
  console.log(
    `${k.padEnd(24)} ${String(v.meanLit).padStart(7)} ${String(v.p99Lit).padStart(6)} ` +
    `${String(v.pctAbove250).padStart(6)} ${String(v.pctChannel255).padStart(6)} ${String(v.chroma).padStart(6)} ` +
    `${String(v.detail5).padStart(5)} ${String(v.detail25).padStart(6)}`
  );
}
console.log(`\nyardstick: /about det5 ${report.about.detail5} det25 ${report.about.detail25} chroma ${report.about.chroma} lit mean ${report.about.meanLit}`);
