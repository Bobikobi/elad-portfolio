/**
 * Is Saturn's disc actually clipping in production?
 *
 * CameraRig's ORBIT_EXPOSURE comment records a B3 calibration measured on the alias:
 *   "at exposure 1.0 the measured discs came out at mean luminance jupiter 140 / clip 0%,
 *    saturn 93 / 0%, mars 95 / 0.9%, earth 211 / 19.5%"
 * and saturn is the one planet left at 1.0 — the same value as the global default, so the
 * per-planet aperture does nothing for it. The production screenshot shows a featureless
 * cream disc. Either the calibration has aged out or it measured something else.
 *
 * This re-runs the SAME measurement against production, on the disc the CAMERA reports
 * (via ?ringprobe=1, which publishes cx/cy/R for the focused planet's silhouette) rather
 * than a brightness threshold — a threshold swallows the rings and the bloom skirt and
 * puts the radius badly out.
 *
 *   BASE=https://www.eladsaadon.dev node scripts/harness/disc-exposure.mjs
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { decodePng } from './png-stats.mjs';

const BASE = process.env.BASE || 'https://www.eladsaadon.dev';
const CHROME = process.env.CHROME || '/opt/google/chrome/chrome';
const OUT = path.join(process.cwd(), '.harness-out', 'disc-exposure');
const SETTLE = Number(process.env.SETTLE || 11000);
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const px = (img, x, y) => {
  const i = y * img.width * img.channels + x * img.channels;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
};
const lumOf = ([r, g, b]) => r * 0.299 + g * 0.587 + b * 0.114;

/** The B3 numbers, over the disc the camera reports. */
function discStats(img, disc, frac = 0.95) {
  const R = disc.R * frac;
  const x0 = Math.max(0, Math.floor(disc.cx - R));
  const x1 = Math.min(img.width - 1, Math.ceil(disc.cx + R));
  const y0 = Math.max(0, Math.floor(disc.cy - R));
  const y1 = Math.min(img.height - 1, Math.ceil(disc.cy + R));

  const L = [];
  const chans = [[], [], []];
  let over250 = 0, anyMax = 0, n = 0;

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - disc.cx, dy = y - disc.cy;
      if (dx * dx + dy * dy > R * R) continue;
      const p = px(img, x, y);
      const l = lumOf(p);
      L.push(l);
      chans[0].push(p[0]); chans[1].push(p[1]); chans[2].push(p[2]);
      if (l > 250) over250++;
      if (p[0] >= 255 || p[1] >= 255 || p[2] >= 255) anyMax++;
      n++;
    }
  }
  if (!n) return null;

  const pct = (arr, q) => {
    const s = [...arr].sort((a, b) => a - b);
    return +s[Math.min(s.length - 1, Math.floor(q * s.length))].toFixed(1);
  };
  const mean = (arr) => +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);

  return {
    pixels: n,
    meanLum: mean(L),
    medianLum: pct(L, 0.5),
    p99Lum: pct(L, 0.99),
    clipPctOver250: +((over250 / n) * 100).toFixed(2),
    anyChannel255Pct: +((anyMax / n) * 100).toFixed(2),
    p99R: pct(chans[0], 0.99),
    p99G: pct(chans[1], 0.99),
    p99B: pct(chans[2], 0.99),
    meanR: mean(chans[0]),
    meanG: mean(chans[1]),
    meanB: mean(chans[2]),
  };
}

const PROFILE = path.join(process.env.HOME, '.cache', `disc-expo-${process.pid}-${Date.now()}`);
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  userDataDir: PROFILE,
  args: ['--use-gl=angle', '--use-angle=vulkan', '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
});

const ctx = await browser.createBrowserContext();
const page = await ctx.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

const url = `${BASE}/projects?ringprobe=1&hud=1`;
await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
await sleep(SETTLE);

// Confirm the tone mapper is actually on before reading anything into the numbers: the
// symptom of it NOT running is exactly a white featureless disc, and dialling exposure
// down to "fix" that would break the case where it does run.
const gl = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  const s = window.__scene?.getState?.() ?? null;
  const svg = document.querySelector('svg.ring-layer');
  return {
    ring: svg?.dataset?.ring ? JSON.parse(svg.dataset.ring) : null,
    focusedPlanet: s?.focusedPlanet ?? null,
    tier: s?.tier ?? s?.quality ?? null,
    act: s?.act ?? null,
    hud: window.__hud ?? null,
    canvasSize: c ? `${c.width}x${c.height}` : null,
  };
});

console.log('focusedPlanet :', gl.focusedPlanet);
console.log('act / tier    :', gl.act, '/', gl.tier);
console.log('canvas        :', gl.canvasSize);
console.log('hud           :', JSON.stringify(gl.hud));
if (!gl.ring) {
  console.log('\nNO ringprobe payload — cannot locate the disc from the camera. Refusing to guess.');
  await browser.close();
  fs.rmSync(PROFILE, { recursive: true, force: true });
  process.exitCode = 2;
} else {
  const disc = { cx: gl.ring.cx, cy: gl.ring.cy, R: gl.ring.R };
  console.log('disc (camera) :', JSON.stringify(disc));

  const shot = path.join(OUT, 'projects-desktop.png');
  const buf = await page.screenshot();
  fs.writeFileSync(shot, buf);
  const img = decodePng(buf);

  for (const frac of [0.95, 0.8, 0.5]) {
    const s = discStats(img, disc, frac);
    console.log(`\n--- disc at ${frac * 100}% of R (${s.pixels} px) ---`);
    console.log(`mean luminance   ${s.meanLum}      (B3 recorded saturn 93)`);
    console.log(`median / p99     ${s.medianLum} / ${s.p99Lum}`);
    console.log(`clipped >250     ${s.clipPctOver250}%   (B3 recorded 0%)`);
    console.log(`any channel 255  ${s.anyChannel255Pct}%`);
    console.log(`p99 R/G/B        ${s.p99R} / ${s.p99G} / ${s.p99B}`);
    console.log(`mean R/G/B       ${s.meanR} / ${s.meanG} / ${s.meanB}`);
  }

  fs.writeFileSync(
    path.join(OUT, 'report.json'),
    JSON.stringify({ url, disc, state: gl, stats: [0.95, 0.8, 0.5].map((f) => ({ frac: f, ...discStats(img, disc, f) })) }, null, 2)
  );
  console.log('\nreport → ' + path.join(OUT, 'report.json'));
  await browser.close();
  fs.rmSync(PROFILE, { recursive: true, force: true });
}
