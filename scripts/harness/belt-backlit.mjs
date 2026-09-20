/**
 * ASTEROID-BACKLIT capture. Freezes the fixed-step clock on the home overview, asks the
 * belt which rocks are seen against the sun (`__beltBacklit`), then takes ONE screenshot per
 * layer configuration of the SAME frozen frame. Measurement is in belt-backlit.py.
 *
 *   BASE=<preview url> TAG=base node scripts/harness/belt-backlit.mjs
 *
 * Configurations differ by exactly one layer: base, nodust, noband, bare (both off).
 * Nothing is written unless ANGLE/Vulkan reports a real GPU.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:3100';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const TAG = process.env.TAG || 'run';
const VW = Number(process.env.VW || 1440);
const VH = Number(process.env.VH || 900);
const SETTLE = Number(process.env.SETTLE || 14000);
const FRAME = Number(process.env.FRAME || 1200);
const EXTRA_QS = process.env.EXTRA_QS || '';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', `belt-backlit-${TAG}`);
fs.mkdirSync(OUT, { recursive: true });

const BYPASS = (() => {
  try {
    return fs.readFileSync(path.join(os.homedir(), '.claude', 'secrets', 'vercel-bypass.txt'), 'utf8').trim() || null;
  } catch { return null; }
})();

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 240000,
  userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'belt-backlit-')),
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars', '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage'],
});
const fail = async (msg) => { console.error(msg); await browser.close(); process.exit(2); };
try {
  const page = await browser.newPage();
  if (BYPASS && /vercel\.app/.test(BASE)) await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': BYPASS });
  await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
  const gpu = await page.evaluate(() => {
    const g = document.createElement('canvas').getContext('webgl2');
    const d = g?.getExtension('WEBGL_debug_renderer_info');
    return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'none';
  });
  if (!/angle|vulkan/i.test(gpu) || /swiftshader|llvmpipe/i.test(gpu)) await fail(`NO REAL GPU (${gpu}) - refusing to measure`);

  await page.goto(`${BASE}/?hud=1&tier=high&fixedStep${EXTRA_QS ? `&${EXTRA_QS}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await new Promise((r) => setTimeout(r, SETTLE));
  const frozen = await page.evaluate(async (frame) => {
    const c = window.__clock;
    if (!c) return null;
    await c.waitForFrame(frame);
    return await c.freeze();
  }, FRAME);
  if (!frozen?.frozen) await fail('clock did not freeze');

  // Overlays out of the frame: only the canvas stays visible.
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    for (let el = canvas; el; el = el.parentElement) el.setAttribute('data-keep', '');
    const st = document.createElement('style');
    st.textContent = 'body *:not([data-keep]) { visibility: hidden !important; }';
    document.head.appendChild(st);
  });

  const probe = await page.evaluate(() => window.__beltBacklit?.(3) ?? null);
  if (!probe) await fail('__beltBacklit missing (HUD build with the seam required)');
  fs.writeFileSync(path.join(OUT, 'probe.json'), JSON.stringify({ gpu, base: BASE, frozen, ...probe }, null, 1));

  const configs = {
    base: { dust: true, band: true },
    nodust: { dust: false, band: true },
    noband: { dust: true, band: false },
    bare: { dust: false, band: false },
  };
  for (const [name, cfg] of Object.entries(configs)) {
    await page.evaluate(async (c) => {
      window.__beltDebug = c;
      const k = window.__clock;
      await k.waitForFrame(k.frame + 4);
    }, cfg);
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  }
  await page.evaluate(() => { delete window.__beltDebug; });
  console.log(JSON.stringify({ out: OUT, gpu, rocks: probe.rocks.length, backlit: probe.rocks.filter((r) => r.cosPhase < -0.5).length, sun: probe.sun }));
} finally {
  await browser.close();
}
