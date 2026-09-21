/**
 * GALAXY-REST capture: the home route at the top, before any scroll, frozen on the fixed-step
 * clock. Same freeze as p4-galaxy.mjs (wait and freeze in ONE browser call), plus the h1's
 * screen rect, which the measurement needs to ask "how dark is it behind the name".
 *
 *   BASE=<preview url> TAG=master node scripts/harness/galaxy-rest.mjs
 *   BASE=<preview url> TAG=v12 FRAMES=1600,2600,3600,4600,5600,6600 node ...
 *
 * SEVERAL FRAMES IN ONE RUN. The welcome shot is not a still: the camera orbits the galaxy on
 * three periods of 70 to 101 seconds, so one frozen frame is one pose out of a cycle, and a
 * criterion measured there says nothing about the other poses. Measured at 1600 / 2400 / 3200,
 * an unchanged build swung its m4 from 0.033 to 0.190 and its left edge from 2.3 to 5.4. The
 * frames are captured in one browser, freezing and unfreezing between them, so all of them
 * come from a single load of a single build.
 *
 * Writes <TAG>.png/.json per frame (<TAG>-f<frame> when there is more than one) to
 * .harness-out/galaxy-rest. Refuses to write anything unless ANGLE/Vulkan reports a real GPU
 * and the act is the galaxy.
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
const FRAMES = (process.env.FRAMES || process.env.FRAME || '1600')
  .split(',').map((s) => Number(s.trim())).filter((n) => Number.isSafeInteger(n) && n >= 0)
  .sort((a, b) => a - b);
const SETTLE = Number(process.env.SETTLE || 14000);
const EXTRA_QS = process.env.EXTRA_QS || '';
if (!TAG) { console.error('TAG is required'); process.exit(2); }
if (!FRAMES.length) { console.error('FRAMES is empty'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

const BYPASS = (() => {
  try {
    return fs.readFileSync(path.join(os.homedir(), '.claude', 'secrets', 'vercel-bypass.txt'), 'utf8').trim() || null;
  } catch { return null; }
})();

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || '/usr/bin/google-chrome',
  headless: 'new',
  protocolTimeout: 600000,
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

  const freezeAt = async (frame) => {
    const at = await page.evaluate(async (f) => {
      const c = window.__clock;
      if (!c) return null;
      if (c.state().frozen) await c.unfreeze();
      await c.waitForFrame(f);
      return await c.freeze();
    }, frame);
    if (!at?.fixedStep || !at.frozen) await fail(`fixedStep clock did not freeze at frame ${frame}`);
    return at;
  };

  await freezeAt(FRAMES[0]);
  const act = await page.evaluate(() => window.__scene?.getState?.().act ?? null);
  if (act !== 'galaxy') await fail(`act is "${act}", not galaxy`);

  // The h1 rect is read while the DOM is still visible; the pixels behind it are measured
  // after it is hidden, so the criterion is about the scene, not about the text. It is read
  // ONCE: the page is at the top and unscrolled, so the text does not move between frames -
  // only the scene behind it does.
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

  for (const [i, frame] of FRAMES.entries()) {
    const at = i === 0 ? await page.evaluate(() => window.__clock.state()) : await freezeAt(frame);
    const here = await page.evaluate(() => window.__scene?.getState?.().act ?? null);
    if (here !== 'galaxy') await fail(`act is "${here}" at frame ${frame}, not galaxy`);
    // The camera's own matrices at THIS frame. The measurement deprojects the disc plane
    // (world y = 0) with them instead of fitting an ellipse to the picture.
    const camera = await page.evaluate(() => (window.__camera ? window.__camera() : null));
    if (!camera) await fail(`no __camera handle at frame ${frame} - the build predates it`);
    await new Promise((r) => setTimeout(r, 400));
    const tag = FRAMES.length > 1 ? `${TAG}-f${frame}` : TAG;
    fs.writeFileSync(path.join(OUT, `${tag}.png`), await page.screenshot({ type: 'png' }));
    const meta = { tag, base: BASE, gpu, act: here, frame, elapsedTime: at.elapsedTime, vw: VW, vh: VH, name, camera };
    fs.writeFileSync(path.join(OUT, `${tag}.json`), JSON.stringify(meta, null, 1));
    console.log(JSON.stringify({ tag, frame, elapsedTime: at.elapsedTime, camPos: camera.position }));
  }
} finally {
  await browser.close();
}
