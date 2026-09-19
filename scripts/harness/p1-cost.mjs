/**
 * P1-2, measured retroactively - "nothing got more expensive".
 *
 *   TAG=pre  node scripts/harness/p1-cost.mjs
 *
 * P1's own criterion asks for renderer.info.render.calls / .triangles over 120 frames at
 * both tiers, with median frame time within 1ms. p7-sun.mjs already does that, but it
 * anchors on the fixed-step clock - which was BUILT INSIDE P1 - so it cannot run against
 * the pre-P1 tree. This reads the same two counters off `window.__hud`, which predates P1,
 * and anchors on frame COUNT rather than on the scene clock.
 *
 * Mode, not mean: calls and triangles move by a few as bodies enter and leave the frustum,
 * so the mode is the composition's cost and the range says how much the frustum moved.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:3112';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'p1-cost');
const TAG = process.env.TAG || 'now';
const SETTLE = Number(process.env.SETTLE || 14000);
const SAMPLES = Number(process.env.SAMPLES || 120);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

const mode = (a) => {
  const c = new Map();
  for (const v of a) c.set(v, (c.get(v) || 0) + 1);
  return [...c.entries()].sort((x, y) => y[1] - x[1])[0][0];
};
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new', protocolTimeout: 240000,
  userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'p1cost-')),
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars',
         '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage'],
});
const report = { base: BASE, tag: TAG, when: new Date().toISOString(), tiers: {} };

for (const tier of ['high', 'low']) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/?hud=1&tier=${tier}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await wait(SETTLE);
  // The overview is below the fold on the home route; the solar act is what P1 touched.
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await wait(4000);

  const gpu = await page.evaluate(() => {
    const g = document.createElement('canvas').getContext('webgl2');
    const d = g?.getExtension('WEBGL_debug_renderer_info');
    return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'none';
  });
  if (!/angle|vulkan/i.test(gpu) || /swiftshader/i.test(gpu)) {
    console.error(`NO REAL GPU (${gpu}) - refusing to measure`);
    await browser.close(); process.exit(2);
  }

  const sample = await page.evaluate(async (n) => {
    const calls = [], tris = [], dt = [];
    let last = performance.now();
    for (let i = 0; i < n; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      const now = performance.now();
      dt.push(now - last); last = now;
      calls.push(window.__hud?.calls ?? null);
      tris.push(window.__hud?.tris ?? null);
    }
    return { calls: calls.slice(1), tris: tris.slice(1), dt: dt.slice(1),
             tier: window.__scene?.getState?.().quality ?? null };
  }, SAMPLES);

  const calls = sample.calls.filter(Number.isFinite);
  const tris = sample.tris.filter(Number.isFinite);
  if (!calls.length || !tris.length) {
    console.error(`tier ${tier}: window.__hud gave no renderer telemetry`);
    await browser.close(); process.exit(2);
  }
  report.tiers[tier] = {
    gpu, requested: tier, reported: sample.tier,
    calls: mode(calls), callsRange: [Math.min(...calls), Math.max(...calls)],
    triangles: mode(tris), trianglesRange: [Math.min(...tris), Math.max(...tris)],
    medianFrameMs: Number(median(sample.dt).toFixed(3)), frames: calls.length,
  };
  const r = report.tiers[tier];
  console.log(`${tier}: calls ${r.calls} ${JSON.stringify(r.callsRange)}  triangles ${r.triangles} ${JSON.stringify(r.trianglesRange)}  median ${r.medianFrameMs}ms  (reported tier ${r.reported})`);
  await page.close();
}

fs.writeFileSync(path.join(OUT, `${TAG}.json`), JSON.stringify(report, null, 2));
console.log(`\n-> ${OUT}/${TAG}.json`);
await browser.close();
