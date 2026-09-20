/**
 * GALAXY-REST capture: the home route at the top, before any scroll, frozen on the fixed-step
 * clock. Same freeze as p4-galaxy.mjs (wait and freeze in ONE browser call), plus the h1's
 * screen rect, which the measurement needs to ask "how dark is it behind the name".
 *
 *   BASE=<preview url> TAG=master node scripts/harness/galaxy-rest.mjs
 *
 * Writes <TAG>.png and <TAG>.json (the rect, the act, the elapsed time) to .harness-out/galaxy-rest.
 * Refuses to write anything unless ANGLE/Vulkan reports a real GPU and the act is the galaxy.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:3100';
const TAG = process.env.TAG;
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'galaxy-rest');
const VW = Number(process.env.VW || 1440);
const VH = Number(process.env.VH || 900);
const FRAME = Number(process.env.FRAME || 1600);
const SETTLE = Number(process.env.SETTLE || 14000);
const EXTRA_QS = process.env.EXTRA_QS || '';
if (!TAG) { console.error('TAG is required'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

const BYPASS = (() => {
  try {
    return fs.readFileSync(path.join(os.homedir(), '.claude', 'secrets', 'vercel-bypass.txt'), 'utf8').trim() || null;
  } catch { return null; }
})();

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || '/usr/bin/google-chrome',
  headless: 'new',
  protocolTimeout: 240000,
  userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'galaxy-rest-')),
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars', '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage'],
});
const fail = async (m) => { console.error(m); await browser.close(); process.exit(2); };
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
  const at = await page.evaluate(async (frame) => {
    const c = window.__clock;
    if (!c) return null;
    await c.waitForFrame(frame);
    return await c.freeze();
  }, FRAME);
  if (!at?.fixedStep || !at.frozen) await fail('fixedStep clock did not freeze');
  const act = await page.evaluate(() => window.__scene?.getState?.().act ?? null);
  if (act !== 'galaxy') await fail(`act is "${act}", not galaxy`);

  // The h1 rect is read while the DOM is still visible; the pixels behind it are measured
  // after it is hidden, so the criterion is about the scene, not about the text.
  const name = await page.evaluate(() => {
    // The page carries a screen-reader-only h1 at (-1, -1) as well; the criterion is about
    // the pixels behind the name a visitor sees, so take the widest visible one.
    const h1 = [...document.querySelectorAll('h1')]
      .filter((e) => e.getBoundingClientRect().width > 100)
      .sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
    if (!h1) return null;
    const r = h1.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, text: (h1.textContent || '').slice(0, 40) };
  });
  if (!name) await fail('no h1 on the page');

  await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    for (let el = canvas; el; el = el.parentElement) el.setAttribute('data-harness-keep', '');
    const st = document.createElement('style');
    st.textContent = 'body *:not([data-harness-keep]) { visibility: hidden !important; transition: none !important; animation: none !important; }'
      + 'body [data-harness-keep] { visibility: visible !important; }';
    document.head.appendChild(st);
  });
  await new Promise((r) => setTimeout(r, 400));
  fs.writeFileSync(path.join(OUT, `${TAG}.png`), await page.screenshot({ type: 'png' }));
  const meta = { tag: TAG, base: BASE, gpu, act, elapsedTime: at.elapsedTime, vw: VW, vh: VH, name };
  fs.writeFileSync(path.join(OUT, `${TAG}.json`), JSON.stringify(meta, null, 1));
  console.log(JSON.stringify(meta));
} finally {
  await browser.close();
}
