/**
 * RETURN-TRIP probe. Scrolls the home page down through the galaxy->solar passage with a real
 * wheel, lets the solar system settle, then wheels back UP and records whether the page gets
 * back to the galaxy or sticks part-way. Store state only (act, coverage, scrollProgress,
 * scrollY) - no screencast - plus a screenshot of wherever the run ends.
 *
 *   BASE=<alias> TAG=master-1 node scripts/harness/return-trip.mjs
 *
 * The DOM stays live and the clock is NOT fixed: this reproduces what a visitor does with a
 * mouse wheel, which the frame-indexed crossing.mjs deliberately does not. Refuses a software GPU.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:3000';
const TAG = process.env.TAG || 'run';
const STEP = Number(process.env.STEP || 60);          // wheel delta per event
const STEP_MS = Number(process.env.STEP_MS || 40);
const SETTLE = Number(process.env.SETTLE || 14000);
const REST_MS = Number(process.env.REST_MS || 4000);   // pause in the solar system
const UP_MAX_MS = Number(process.env.UP_MAX_MS || 60000);
const EXTRA_QS = process.env.EXTRA_QS || '';
const PARK_SP = Number(process.env.PARK_SP || 0.995);  // stop scrolling down at this scrollProgress
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'return-trip', TAG);
const BYPASS_FILE = process.env.VERCEL_BYPASS_FILE
  || path.join(os.homedir(), '.claude', 'secrets', 'vercel-bypass.txt');
const VERCEL_BYPASS = (() => {
  try { return fs.readFileSync(BYPASS_FILE, 'utf8').trim() || null; } catch { return null; }
})();

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new', protocolTimeout: 240000,
  userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'return-trip-')),
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars',
    '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage'],
});
let exitCode = 0;
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  if (VERCEL_BYPASS && /vercel\.app/.test(BASE)) {
    await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': VERCEL_BYPASS });
  }
  await page.goto(`${BASE}/?hud=1&tier=high${EXTRA_QS ? `&${EXTRA_QS}` : ''}`,
    { waitUntil: 'domcontentloaded', timeout: 90000 });
  await new Promise((r) => setTimeout(r, SETTLE));

  const gpu = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'none';
  });
  if (/swiftshader|llvmpipe|^none$/i.test(gpu)) throw new Error(`not a real measurement: gpu=${gpu}`);
  const start = await page.evaluate(() => window.__scene?.getState?.().act ?? null);
  if (start !== 'galaxy') throw new Error(`act is "${start}", not galaxy`);

  // in-page sampler, one row per animation frame
  await page.evaluate(() => {
    const store = window.__scene;
    window.__trip = { rows: [], t0: performance.now() };
    const tick = () => {
      const s = store.getState();
      window.__trip.rows.push([
        Math.round(performance.now() - window.__trip.t0), s.act,
        +s.coverage.toFixed(3), +s.scrollProgress.toFixed(4), Math.round(window.scrollY),
      ]);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.mouse.move(640, 360);
  const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  const mark = (label) => page.evaluate((l) => window.__trip.rows.push([Math.round(performance.now() - window.__trip.t0), 'MARK:' + l, 0, 0, 0]), label);

  // DOWN
  await mark('down');
  for (let i = 0; i < 400; i++) {
    await page.mouse.wheel({ deltaY: STEP });
    await new Promise((r) => setTimeout(r, STEP_MS));
    const sp = await page.evaluate(() => window.__scene.getState().scrollProgress);
    if (sp >= PARK_SP) break;
  }
  await mark('rest');
  await new Promise((r) => setTimeout(r, REST_MS));
  const atRest = await page.evaluate(() => { const s = window.__scene.getState(); return { act: s.act, sp: s.scrollProgress, y: window.scrollY }; });

  // UP
  await mark('up');
  const upStart = Date.now();
  let lastY = -1, still = 0, reachedTop = false;
  while (Date.now() - upStart < UP_MAX_MS) {
    await page.mouse.wheel({ deltaY: -STEP });
    await new Promise((r) => setTimeout(r, STEP_MS));
    const y = await page.evaluate(() => window.scrollY);
    if (y <= 2) { reachedTop = true; break; }
    still = Math.abs(y - lastY) < 1 ? still + 1 : 0;
    lastY = y;
    if (still > 60) break;   // 60 wheel events (~2.4 s) without the page moving
  }
  await new Promise((r) => setTimeout(r, 2500));
  const end = await page.evaluate(() => { const s = window.__scene.getState(); return { act: s.act, cov: s.coverage, sp: s.scrollProgress, y: window.scrollY }; });
  const rows = await page.evaluate(() => window.__trip.rows);
  fs.writeFileSync(path.join(OUT, 'rows.json'), JSON.stringify(rows));
  await page.screenshot({ path: path.join(OUT, 'end.png') });

  // summary of the UP leg
  const upIdx = rows.findIndex((r) => r[1] === 'MARK:up');
  const up = rows.slice(upIdx + 1).filter((r) => !String(r[1]).startsWith('MARK'));
  const actFlips = [];
  for (let i = 1; i < up.length; i++) if (up[i][1] !== up[i - 1][1]) actFlips.push({ t: up[i][0], from: up[i - 1][1], to: up[i][1], sp: up[i][3], cov: up[i][2] });
  const spMin = Math.min(...up.map((r) => r[3]));
  const covMax = Math.max(...up.map((r) => r[2]));
  const summary = { base: BASE, tag: TAG, parkSp: PARK_SP, step: STEP, stepMs: STEP_MS, gpu, maxScroll, atRest, end, reachedTop, spMinOnUp: spMin, covMaxOnUp: covMax, actFlipsOnUp: actFlips, upSeconds: +((Date.now() - upStart) / 1000).toFixed(1) };
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
} catch (err) {
  console.error(err);
  exitCode = 2;
} finally {
  await browser.close();
}
process.exit(exitCode);
