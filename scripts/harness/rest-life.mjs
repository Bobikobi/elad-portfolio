/**
 * REST-LIFE capture (#82 stage 2, owner 2026-10-04: "not rich and alive enough"). The home route
 * at rest on the fixed-step clock: at each phase, one frame, then the frame 1 step later and the
 * frame GAP steps later, so rest-life.py can ask how much of the disc changes between frames.
 *
 *   BASE=<url> TAG=b0 node scripts/harness/rest-life.mjs
 *   PHASES=1600,3600,5600 GAP=30 ...
 *
 * galaxy-rest.mjs cannot do this: its frame counter keeps running while the clock is frozen, so
 * two FRAMES closer together than a screenshot's time collapse into consecutive frames. Here
 * each step is counted from the frame the clock actually stands on.
 *
 * Writes <TAG>-p<phase>-d<step>.png to .harness-out/rest-life. Refuses a software GPU.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:3114';
const TAG = process.env.TAG;
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'rest-life');
const VW = Number(process.env.VW || 1440);
const VH = Number(process.env.VH || 900);
const PHASES = (process.env.PHASES || '1600,3600,5600').split(',').map(Number);
const GAP = Number(process.env.GAP || 30);
const SETTLE = Number(process.env.SETTLE || 14000);
const EXTRA_QS = process.env.EXTRA_QS || '';
if (!TAG) { console.error('TAG is required'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const BYPASS = (() => {
  try { return fs.readFileSync(path.join(os.homedir(), '.claude', 'secrets', 'vercel-bypass.txt'), 'utf8').trim() || null; } catch { return null; }
})();

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || '/usr/bin/google-chrome',
  headless: 'new',
  protocolTimeout: 600000,
  userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'rest-life-')),
  args: ['--no-sandbox', '--hide-scrollbars', '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage'],
});
console.log('PID', browser.process().pid);
const fail = async (m) => { console.error(m); await browser.close(); process.exit(2); };
try {
  const page = await browser.newPage();
  if (BYPASS && /vercel\.app/.test(BASE)) await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': BYPASS });
  await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/?hud=1&tier=high&fixedStep${EXTRA_QS ? `&${EXTRA_QS}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const gpu = await page.evaluate(() => {
    const g = document.createElement('canvas').getContext('webgl2');
    const d = g?.getExtension('WEBGL_debug_renderer_info');
    return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'none';
  });
  if (/swiftshader|llvmpipe|^none$/i.test(gpu)) await fail(`NO REAL GPU (${gpu})`);
  await new Promise((r) => setTimeout(r, SETTLE));
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    for (let el = canvas; el; el = el.parentElement) el.setAttribute('data-harness-keep', '');
    const st = document.createElement('style');
    st.textContent = 'body *:not([data-harness-keep]) { visibility: hidden !important; transition: none !important; animation: none !important; }'
      + 'body [data-harness-keep] { visibility: visible !important; }';
    document.head.appendChild(st);
  });
  // Steps the fixed clock by n rendered frames from wherever it stands, and freezes there.
  const step = (n) => page.evaluate(async (k) => {
    const c = window.__clock;
    if (c.state().frozen) await c.unfreeze();
    await c.waitForFrame(c.frame + k);
    return c.freeze();
  }, n);
  const shot = async (name, at) => {
    await new Promise((r) => setTimeout(r, 250));
    const act = await page.evaluate(() => window.__scene.getState().act);
    if (act !== 'galaxy') await fail(`act is ${act}`);
    fs.writeFileSync(path.join(OUT, `${name}.png`), await page.screenshot({ type: 'png' }));
    console.log(JSON.stringify({ name, t: +at.elapsedTime.toFixed(4) }));
  };
  for (const ph of PHASES) {
    const at0 = await page.evaluate(async (f) => {
      const c = window.__clock;
      if (c.state().frozen) await c.unfreeze();
      await c.waitForFrame(f);
      return c.freeze();
    }, ph);
    await shot(`${TAG}-p${ph}-d0`, at0);
    await shot(`${TAG}-p${ph}-d1`, await step(1));
    await shot(`${TAG}-p${ph}-d${GAP}`, await step(GAP - 1));
  }
} finally {
  await browser.close();
}
