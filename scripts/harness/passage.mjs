/**
 * PASSAGE recorder (#82). Plays the galaxy <-> solar passage the way a visitor does - one wheel
 * notch, real wall clock - and records, per animation frame, the camera and the store, plus a
 * screencast for luminance. Pair with passage.py.
 *
 *   BASE=<alias> TAG=base-down node scripts/harness/passage.mjs
 *   BASE=<alias> TAG=base-up DIR=up node scripts/harness/passage.mjs
 *   W=390 H=844 ...                                   (phone: touch + mobile emulation)
 *
 * crossing.mjs drives a frame-indexed scroll ramp; since #64 the passage is a timed two-leg
 * move played by Hero itself, so the clock that matters is the wall clock, and this rig only
 * sends the gesture.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:3000';
const TAG = process.env.TAG || 'run';
const DIR = (process.env.DIR || 'down').toLowerCase();
const W = +(process.env.W || 1280), H = +(process.env.H || 720), MOB = W < 700;
const SETTLE = +(process.env.SETTLE || 12000);
const POST_MS = +(process.env.POST_MS || 3500);
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'passage', TAG);
const BYPASS = (() => {
  try { return fs.readFileSync(path.join(os.homedir(), '.claude', 'secrets', 'vercel-bypass.txt'), 'utf8').trim() || null; } catch { return null; }
})();
const framesDir = path.join(OUT, 'frames');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 240000,
  userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'passage-')),
  args: ['--no-sandbox', '--hide-scrollbars', '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage'],
});
console.log('PID', browser.process().pid);
try {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: MOB ? 2 : 1, isMobile: MOB, hasTouch: MOB });
  if (BYPASS && /vercel\.app/.test(BASE)) await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': BYPASS });
  await page.evaluateOnNewDocument(() => {
    window.__rec = [];
    const tick = () => {
      const T = window.__three, S = window.__scene;
      if (T && S) {
        const cm = T.camera, s = S.getState();
        const o = new T.THREE.Vector3(0, 0, 0).project(cm);
        window.__rec.push([
          +(performance.timeOrigin + performance.now()).toFixed(1), s.act, +s.coverage.toFixed(4), +s.scrollProgress.toFixed(4),
          [cm.position.x, cm.position.y, cm.position.z], [cm.quaternion.x, cm.quaternion.y, cm.quaternion.z, cm.quaternion.w],
          +cm.fov.toFixed(2), [+o.x.toFixed(4), +o.y.toFixed(4), +o.z.toFixed(4)],
        ]);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto(`${BASE}/?hud=1&tier=high`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(SETTLE);
  const probe = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return { gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'none', act: window.__scene?.getState?.().act ?? null };
  });
  if (/swiftshader|llvmpipe|^none$/i.test(probe.gpu)) throw new Error(`software GPU: ${probe.gpu}`);
  if (probe.act !== 'galaxy') console.log(probe.gpu, await page.evaluate(() => JSON.stringify({ t: document.title, c: document.querySelectorAll('canvas').length, three: !!window.__three, hud: !!window.__hud, clock: !!window.__clock, body: document.body.innerText.slice(0, 200) })));
  if (probe.act !== 'galaxy') throw new Error(`act is ${probe.act}, not galaxy`);
  // Canvas only: the numbers describe the scene, not the welcome text and the navbar.
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    for (let el = canvas; el; el = el.parentElement) el.setAttribute('data-harness-keep', '');
    const st = document.createElement('style');
    st.textContent = 'body *:not([data-harness-keep]) { visibility: hidden !important; } body [data-harness-keep] { visibility: visible !important; }';
    document.head.appendChild(st);
  });
  await page.mouse.move(W / 2, H / 2);
  const gesture = async (dy) => {
    await page.mouse.wheel({ deltaY: dy });
    const until = Date.now() + 15000;
    while (Date.now() < until) {
      const p = await page.evaluate(() => window.__passage || null);
      if (p && p.t1) return p;
      await sleep(100);
    }
    throw new Error('the passage did not land');
  };
  if (DIR === 'up') {
    await gesture(120);
    await sleep(4000);
    await page.evaluate(() => { window.__passage = null; });
    if ((await page.evaluate(() => window.__scene.getState().act)) !== 'solar') throw new Error('did not arrive');
  }
  const cdp = await page.createCDPSession();
  const stamps = [];
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    fs.writeFileSync(path.join(framesDir, `f${String(stamps.length).padStart(5, '0')}.jpg`), Buffer.from(data, 'base64'));
    stamps.push(metadata.timestamp * 1000);
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, maxWidth: 640, maxHeight: 640, everyNthFrame: 1 });
  await sleep(800);
  await page.evaluate(() => { window.__rec.length = 0; });
  const tg = await page.evaluate(() => performance.timeOrigin + performance.now());
  const pass = await gesture(DIR === 'up' ? -120 : 120);
  await sleep(POST_MS);
  await cdp.send('Page.stopScreencast');
  const { rec, origin, endAct } = await page.evaluate(() => ({ rec: window.__rec, origin: performance.timeOrigin, endAct: window.__scene.getState().act }));
  const meta = { W, H, MOB, DIR, gpu: probe.gpu, gesture: tg, t0: origin + pass.t0, t1: origin + pass.t1, endAct };
  fs.writeFileSync(path.join(OUT, 'rec.json'), JSON.stringify({ meta, rec, stamps }));
  console.log(JSON.stringify({ ...meta, frames: stamps.length, samples: rec.length }));
} finally {
  await browser.close();
}
